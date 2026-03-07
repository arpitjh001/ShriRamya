const cartRepository = require('../repositories/cart.sql.repository');
const { mysqlPool } = require('../config/db');
const crypto = require('crypto');

class CartService {
    /**
     * Generate a unique session ID for guest carts
     * @returns {string} Session ID
     */
    generateSessionId() {
        return `guest_${crypto.randomBytes(16).toString('hex')}`;
    }

    /**
     * Get or create a cart for user/session
     * @param {string|null} userId - MongoDB user ID
     * @param {string|null} sessionId - Guest session ID
     * @returns {Promise<object>} Cart object
     */
    async getOrCreateCart(userId = null, sessionId = null) {
        let cart = null;

        if (userId) {
            cart = await cartRepository.getCartByUser(userId);
        }

        if (!cart && sessionId) {
            cart = await cartRepository.getCartBySession(sessionId);
        }

        if (!cart) {
            const cartId = await cartRepository.createCart(userId, sessionId);
            cart = await cartRepository.getCartById(cartId);
        }

        return cart;
    }

    /**
     * Validate variant exists and get its details
     * @param {number} variantId - Variant ID
     * @returns {Promise<object>} Variant details
     * @throws {Error} If variant not found
     */
    async validateVariant(variantId) {
        const [rows] = await mysqlPool.query(
            `SELECT 
                pv.*,
                p.id AS product_id,
                p.name AS product_name,
                p.status AS product_status,
                vi.stock_level,
                vi.low_stock_threshold
             FROM product_variants pv
             INNER JOIN products p ON p.id = pv.product_id
             LEFT JOIN variant_inventory vi ON vi.variant_id = pv.id
             WHERE pv.id = ?`,
            [variantId]
        );

        if (rows.length === 0) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        const variant = rows[0];

        if (variant.product_status !== 'published') {
            const error = new Error('Product is not available for purchase');
            error.statusCode = 400;
            throw error;
        }

        return variant;
    }

    /**
     * Validate stock availability
     * @param {number} variantId - Variant ID
     * @param {number} requestedQuantity - Quantity requested
     * @param {number} currentQuantityInCart - Current quantity in cart (if updating)
     * @returns {Promise<void>}
     * @throws {Error} If insufficient stock
     */
    async validateStock(variantId, requestedQuantity, currentQuantityInCart = 0) {
        const [rows] = await mysqlPool.query(
            `SELECT vi.stock_level, vi.low_stock_threshold, pv.price
             FROM product_variants pv
             INNER JOIN variant_inventory vi ON vi.variant_id = pv.id
             WHERE pv.id = ?`,
            [variantId]
        );

        if (rows.length === 0) {
            const error = new Error('Variant inventory not found');
            error.statusCode = 404;
            throw error;
        }

        const inventory = rows[0];
        const availableStock = inventory.stock_level || 0;
        const netQuantityNeeded = requestedQuantity - currentQuantityInCart;

        if (netQuantityNeeded > 0 && availableStock < netQuantityNeeded) {
            const error = new Error(`Insufficient stock. Available: ${availableStock}`);
            error.statusCode = 409;
            error.code = 'INSUFFICIENT_STOCK';
            error.availableStock = availableStock;
            error.requestedQuantity = requestedQuantity;
            throw error;
        }

        return {
            stockLevel: availableStock,
            lowStockThreshold: inventory.low_stock_threshold || 5,
            price: Number(inventory.price),
        };
    }

    /**
     * Add item to cart
     * @param {object} data - Add to cart data
     * @param {string|null} data.userId - User ID
     * @param {string|null} data.sessionId - Session ID
     * @param {number} data.variantId - Variant ID
     * @param {number} data.quantity - Quantity
     * @returns {Promise<object>} Updated cart
     */
    async addToCart({ userId, sessionId, variantId, quantity }) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            // Validate variant exists
            const variant = await this.validateVariant(variantId);
            
            // Get or create cart
            let cart = await this.getOrCreateCart(userId, sessionId);
            
            // Check if item already in cart
            const existingItem = await this._getCartItemByVariantRaw(cart.id, variantId, connection);
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            
            // Validate stock
            await this.validateStock(variantId, quantity + currentQuantity, currentQuantity);
            
            // Calculate effective price
            const effectivePrice = this._calculateEffectivePrice(variant);
            
            // Add or update item
            await connection.query(
                `INSERT INTO cart_items (cart_id, variant_id, quantity, price_snapshot)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    quantity = quantity + VALUES(quantity),
                    price_snapshot = VALUES(price_snapshot)`,
                [cart.id, variantId, quantity, effectivePrice]
            );
            
            await connection.commit();
            
            // Fetch complete cart with items
            const updatedCart = await cartRepository.getCartWithItems(cart.id);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update cart item quantity
     * @param {object} data - Update data
     * @param {number} data.cartItemId - Cart item ID
     * @param {number} data.quantity - New quantity
     * @param {string|null} data.userId - User ID (for ownership check)
     * @returns {Promise<object>} Updated cart
     */
    async updateCartItem({ cartItemId, quantity, userId = null }) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Get cart item
            const cartItem = await cartRepository.getCartItemById(cartItemId);
            
            if (!cartItem) {
                const error = new Error('Cart item not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId) {
                const cart = await cartRepository.getCartById(cartItem.cart_id);
                if (cart.user_id !== userId) {
                    const error = new Error('Unauthorized to modify this cart item');
                    error.statusCode = 403;
                    throw error;
                }
            }
            
            // Validate stock if increasing quantity
            if (quantity > cartItem.quantity) {
                await this.validateStock(cartItem.variant_id, quantity, cartItem.quantity);
            }
            
            // Update or remove item
            const updated = await cartRepository.updateItemQuantity(cartItemId, quantity);
            
            if (!updated) {
                const error = new Error('Failed to update cart item');
                error.statusCode = 500;
                throw error;
            }
            
            await connection.commit();
            
            // Fetch complete cart
            const updatedCart = await cartRepository.getCartWithItems(cartItem.cart_id);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Remove item from cart
     * @param {object} data - Remove data
     * @param {number} data.cartItemId - Cart item ID
     * @param {string|null} data.userId - User ID (for ownership check)
     * @returns {Promise<object>} Updated cart
     */
    async removeCartItem({ cartItemId, userId = null }) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Get cart item
            const cartItem = await cartRepository.getCartItemById(cartItemId);
            
            if (!cartItem) {
                const error = new Error('Cart item not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId) {
                const cart = await cartRepository.getCartById(cartItem.cart_id);
                if (cart.user_id !== userId) {
                    const error = new Error('Unauthorized to modify this cart item');
                    error.statusCode = 403;
                    throw error;
                }
            }
            
            const cartId = cartItem.cart_id;
            
            // Remove item
            const removed = await cartRepository.removeItem(cartItemId);
            
            if (!removed) {
                const error = new Error('Failed to remove cart item');
                error.statusCode = 500;
                throw error;
            }
            
            await connection.commit();
            
            // Fetch complete cart
            const updatedCart = await cartRepository.getCartWithItems(cartId);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get cart with items
     * @param {number} cartId - Cart ID
     * @returns {Promise<object>} Formatted cart
     */
    async getCart(cartId) {
        const cart = await cartRepository.getCartWithItems(cartId);
        
        if (!cart) {
            const error = new Error('Cart not found');
            error.statusCode = 404;
            throw error;
        }
        
        return this._formatCartResponse(cart);
    }

    /**
     * Clear cart
     * @param {number} cartId - Cart ID
     * @param {string|null} userId - User ID (for ownership check)
     * @returns {Promise<object>} Empty cart
     */
    async clearCart({ cartId, userId = null }) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Get cart
            const cart = await cartRepository.getCartById(cartId);
            
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId && cart.user_id !== userId) {
                const error = new Error('Unauthorized to clear this cart');
                error.statusCode = 403;
                throw error;
            }
            
            // Clear items
            await cartRepository.clearCart(cartId);
            
            await connection.commit();
            
            // Return empty cart
            const updatedCart = await cartRepository.getCartWithItems(cartId);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Calculate cart totals
     * @param {object} cart - Cart with items
     * @returns {object} Totals object
     */
    calculateCartTotals(cart) {
        if (!cart || !cart.items || cart.items.length === 0) {
            return {
                subtotal: 0,
                itemCount: 0,
                totalItems: 0,
            };
        }

        let subtotal = 0;
        let itemCount = cart.items.length;
        let totalItems = 0;

        for (const item of cart.items) {
            const effectivePrice = this._getEffectivePriceFromItem(item);
            subtotal += effectivePrice * item.quantity;
            totalItems += item.quantity;
        }

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            itemCount,
            totalItems,
        };
    }

    /**
     * Get effective price from cart item
     * @param {object} item - Cart item
     * @returns {number} Effective price
     */
    _getEffectivePriceFromItem(item) {
        // Use price_snapshot if available (price at add-to-cart time)
        if (item.priceSnapshot) {
            return Number(item.priceSnapshot);
        }
        
        // Fallback to variant price
        const price = Number(item.variantPrice || 0);
        const discountPrice = item.discountPrice != null ? Number(item.discountPrice) : null;
        
        if (discountPrice == null || discountPrice <= 0 || discountPrice >= price) {
            return price;
        }
        
        const now = Date.now();
        const start = item.discountStart ? new Date(item.discountStart).getTime() : null;
        const end = item.discountEnd ? new Date(item.discountEnd).getTime() : null;
        
        if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) {
            return price;
        }
        
        const withinStart = start === null || now >= start;
        const withinEnd = end === null || now <= end;
        
        return withinStart && withinEnd ? discountPrice : price;
    }

    /**
     * Calculate effective price for variant
     * @param {object} variant - Variant object
     * @returns {number} Effective price
     */
    _calculateEffectivePrice(variant) {
        const price = Number(variant.price || 0);
        const discountPrice = variant.discount_price != null ? Number(variant.discount_price) : null;
        
        if (discountPrice == null || discountPrice <= 0 || discountPrice >= price) {
            return price;
        }
        
        const now = Date.now();
        const start = variant.discount_start ? new Date(variant.discount_start).getTime() : null;
        const end = variant.discount_end ? new Date(variant.discount_end).getTime() : null;
        
        if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) {
            return price;
        }
        
        const withinStart = start === null || now >= start;
        const withinEnd = end === null || now <= end;
        
        return withinStart && withinEnd ? discountPrice : price;
    }

    /**
     * Format cart response
     * @param {object} cart - Cart object
     * @returns {object} Formatted response
     */
    _formatCartResponse(cart) {
        if (!cart) {
            return null;
        }

        const totals = this.calculateCartTotals(cart);

        return {
            id: cart.id,
            userId: cart.user_id,
            sessionId: cart.session_id,
            status: cart.status,
            createdAt: cart.created_at,
            updatedAt: cart.updated_at,
            items: cart.items || [],
            subtotal: totals.subtotal,
            itemCount: totals.itemCount,
            totalItems: totals.totalItems,
        };
    }

    /**
     * Get cart item by variant (raw query for transaction use)
     * @param {number} cartId - Cart ID
     * @param {number} variantId - Variant ID
     * @param {object} connection - MySQL connection
     * @returns {Promise<object|null>} Cart item
     */
    async _getCartItemByVariantRaw(cartId, variantId, connection) {
        const [rows] = await connection.query(
            `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
            [cartId, variantId]
        );
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = new CartService();
