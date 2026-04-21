const cartRepository = require('../repositories/cart.mongo.repository');
const Product = require('../models/product.model');
const mongoose = require('mongoose');
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
     * @param {string} variantId - Variant ID
     * @returns {Promise<object>} Variant details
     * @throws {Error} If variant not found
     */
    async validateVariant(variantId) {
        const product = await Product.findOne({ 'variants._id': variantId });

        if (!product) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        const variant = product.variants.id(variantId);

        if (product.status !== 'published' && product.status !== 'publish') {
            const error = new Error('Product is not available for purchase');
            error.statusCode = 400;
            throw error;
        }

        return {
            ...variant.toObject(),
            product_id: product._id,
            product_name: product.name,
            product_status: product.status
        };
    }

    /**
     * Validate stock availability
     * @param {string} variantId - Variant ID
     * @param {number} requestedQuantity - Quantity requested
     * @param {number} currentQuantityInCart - Current quantity in cart (if updating)
     * @returns {Promise<void>}
     * @throws {Error} If insufficient stock
     */
    async validateStock(variantId, requestedQuantity, currentQuantityInCart = 0) {
        const product = await Product.findOne({ 'variants._id': variantId });

        if (!product) {
            const error = new Error('Variant inventory not found');
            error.statusCode = 404;
            throw error;
        }

        const variant = product.variants.id(variantId);
        const availableStock = variant.stock || 0;
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
            lowStockThreshold: variant.lowStockThreshold || 5,
            price: Number(variant.price),
        };
    }

    /**
     * Add item to cart
     * @param {object} data - Add to cart data
     * @param {string|null} data.userId - User ID
     * @param {string|null} data.sessionId - Session ID
     * @param {string} data.variantId - Variant ID
     * @param {number} data.quantity - Quantity
     * @returns {Promise<object>} Updated cart
     */
    async addToCart({ userId, sessionId, variantId, quantity }) {
        try {
            // Validate variant exists
            const variant = await this.validateVariant(variantId);
            
            // Get or create cart
            let cart = await this.getOrCreateCart(userId, sessionId);
            
            // Check if item already in cart
            const existingItem = (cart.items || []).find(item => item.variantId.toString() === variantId.toString());
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            
            // Validate stock
            await this.validateStock(variantId, quantity + currentQuantity, currentQuantity);
            
            // Calculate effective price
            const effectivePrice = this._calculateEffectivePrice(variant);
            
            // Add or update item
            await cartRepository.addItem(cart._id, variantId, quantity, effectivePrice);
            
            // Fetch complete cart with items
            const updatedCart = await cartRepository.getCartWithItems(cart._id);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update cart item quantity
     * @param {object} data - Update data
     * @param {string} data.cartId - Cart ID
     * @param {string} data.cartItemId - Cart item ID
     * @param {number} data.quantity - New quantity
     * @param {string|null} data.userId - User ID (for ownership check)
     * @returns {Promise<object>} Updated cart
     */
    async updateCartItem({ cartId, cartItemId, quantity, userId = null }) {
        try {
            // Get cart
            const cart = await cartRepository.getCartById(cartId);
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId && cart.userId && cart.userId.toString() !== userId.toString()) {
                const error = new Error('Unauthorized to modify this cart item');
                error.statusCode = 403;
                throw error;
            }

            const cartItem = cart.items.id(cartItemId);
            if (!cartItem) {
                const error = new Error('Cart item not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Validate stock if increasing quantity
            if (quantity > cartItem.quantity) {
                await this.validateStock(cartItem.variantId, quantity, cartItem.quantity);
            }
            
            // Update or remove item
            await cartRepository.updateItemQuantity(cartId, cartItemId, quantity);
            
            // Fetch complete cart
            const updatedCart = await cartRepository.getCartWithItems(cartId);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Remove item from cart
     * @param {object} data - Remove data
     * @param {string} data.cartId - Cart ID
     * @param {string} data.cartItemId - Cart item ID
     * @param {string|null} data.userId - User ID (for ownership check)
     * @returns {Promise<object>} Updated cart
     */
    async removeCartItem({ cartId, cartItemId, userId = null }) {
        try {
            const cart = await cartRepository.getCartById(cartId);
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId && cart.userId && cart.userId.toString() !== userId.toString()) {
                const error = new Error('Unauthorized to modify this cart item');
                error.statusCode = 403;
                throw error;
            }
            
            // Remove item
            await cartRepository.removeItem(cartId, cartItemId);
            
            // Fetch complete cart
            const updatedCart = await cartRepository.getCartWithItems(cartId);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get cart with items
     * @param {string} cartId - Cart ID
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
     * @param {object} data
     * @param {string} data.cartId - Cart ID
     * @param {string|null} data.userId - User ID (for ownership check)
     * @returns {Promise<object>} Empty cart
     */
    async clearCart({ cartId, userId = null }) {
        try {
            // Get cart
            const cart = await cartRepository.getCartById(cartId);
            
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            
            // Verify ownership if user ID provided
            if (userId && cart.userId && cart.userId.toString() !== userId.toString()) {
                const error = new Error('Unauthorized to clear this cart');
                error.statusCode = 403;
                throw error;
            }
            
            // Clear items
            await cartRepository.clearCart(cartId);
            
            // Return empty cart
            const updatedCart = await cartRepository.getCartWithItems(cartId);
            return this._formatCartResponse(updatedCart);
        } catch (error) {
            throw error;
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
        if (item.priceSnapshot) {
            return Number(item.priceSnapshot);
        }
        return Number(item.variantPrice || 0);
    }

    /**
     * Calculate effective price for variant
     * @param {object} variant - Variant object
     * @returns {number} Effective price
     */
    _calculateEffectivePrice(variant) {
        const price = Number(variant.price || 0);
        const discountPrice = variant.discountPrice != null ? Number(variant.discountPrice) : null;
        
        if (discountPrice == null || discountPrice <= 0 || discountPrice >= price) {
            return price;
        }
        
        const now = Date.now();
        const start = variant.discountStart ? new Date(variant.discountStart).getTime() : null;
        const end = variant.discountEnd ? new Date(variant.discountEnd).getTime() : null;
        
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
            id: cart._id,
            userId: cart.userId,
            sessionId: cart.sessionId,
            status: cart.status,
            createdAt: cart.created_at || cart.createdAt,
            updatedAt: cart.updated_at || cart.updatedAt,
            items: cart.items || [],
            subtotal: totals.subtotal,
            itemCount: totals.itemCount,
            totalItems: totals.totalItems,
        };
    }
}

module.exports = new CartService();
