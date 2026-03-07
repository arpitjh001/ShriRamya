const { mysqlPool } = require('../config/db');

class CartSqlRepository {
    /**
     * Create a new cart
     * @param {string|null} userId - MongoDB user ID
     * @param {string|null} sessionId - Guest session ID
     * @returns {Promise<number>} Cart ID
     */
    async createCart(userId = null, sessionId = null) {
        const [result] = await mysqlPool.query(
            `INSERT INTO carts (user_id, session_id, status) VALUES (?, ?, 'active')`,
            [userId, sessionId]
        );
        return result.insertId;
    }

    /**
     * Get cart by user ID
     * @param {string} userId - MongoDB user ID
     * @returns {Promise<object|null>} Cart object
     */
    async getCartByUser(userId) {
        const [rows] = await mysqlPool.query(
            `SELECT * FROM carts WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get cart by session ID
     * @param {string} sessionId - Guest session ID
     * @returns {Promise<object|null>} Cart object
     */
    async getCartBySession(sessionId) {
        const [rows] = await mysqlPool.query(
            `SELECT * FROM carts WHERE session_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
            [sessionId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get cart by ID
     * @param {number} cartId - Cart ID
     * @returns {Promise<object|null>} Cart object
     */
    async getCartById(cartId) {
        const [rows] = await mysqlPool.query(
            `SELECT * FROM carts WHERE id = ?`,
            [cartId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Add item to cart or update quantity if variant exists
     * @param {number} cartId - Cart ID
     * @param {number} variantId - Product variant ID
     * @param {number} quantity - Quantity to add
     * @param {number} priceSnapshot - Price at time of adding
     * @returns {Promise<number>} Cart item ID
     */
    async addItem(cartId, variantId, quantity, priceSnapshot) {
        const [result] = await mysqlPool.query(
            `INSERT INTO cart_items (cart_id, variant_id, quantity, price_snapshot)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                quantity = quantity + VALUES(quantity),
                price_snapshot = VALUES(price_snapshot)`,
            [cartId, variantId, quantity, priceSnapshot]
        );
        
        // Get the cart item ID (either inserted or existing)
        const [rows] = await mysqlPool.query(
            `SELECT id FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
            [cartId, variantId]
        );
        return rows[0]?.id;
    }

    /**
     * Update item quantity
     * @param {number} cartItemId - Cart item ID
     * @param {number} quantity - New quantity
     * @returns {Promise<boolean>} Success status
     */
    async updateItemQuantity(cartItemId, quantity) {
        if (quantity <= 0) {
            // Delete if quantity is 0 or negative
            const [result] = await mysqlPool.query(
                `DELETE FROM cart_items WHERE id = ?`,
                [cartItemId]
            );
            return result.affectedRows > 0;
        }
        
        const [result] = await mysqlPool.query(
            `UPDATE cart_items SET quantity = ? WHERE id = ?`,
            [quantity, cartItemId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Remove item from cart
     * @param {number} cartItemId - Cart item ID
     * @returns {Promise<boolean>} Success status
     */
    async removeItem(cartItemId) {
        const [result] = await mysqlPool.query(
            `DELETE FROM cart_items WHERE id = ?`,
            [cartItemId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Clear all items from cart
     * @param {number} cartId - Cart ID
     * @returns {Promise<boolean>} Success status
     */
    async clearCart(cartId) {
        const [result] = await mysqlPool.query(
            `DELETE FROM cart_items WHERE cart_id = ?`,
            [cartId]
        );
        return result.affectedRows >= 0;
    }

    /**
     * Get cart with all items and product/variant details
     * @param {number} cartId - Cart ID
     * @returns {Promise<object>} Cart with items array
     */
    async getCartWithItems(cartId) {
        const [cartRows] = await mysqlPool.query(
            `SELECT * FROM carts WHERE id = ?`,
            [cartId]
        );
        
        if (cartRows.length === 0) {
            return null;
        }

        const cart = cartRows[0];

        // Get cart items with variant and product details
        const [items] = await mysqlPool.query(
            `SELECT 
                ci.id AS cart_item_id,
                ci.variant_id,
                ci.quantity,
                ci.price_snapshot,
                ci.created_at AS item_created_at,
                ci.updated_at AS item_updated_at,
                pv.sku,
                pv.price AS variant_price,
                pv.discount_price,
                pv.discount_start,
                pv.discount_end,
                pv.image AS variant_image,
                pv.attributes_json,
                p.id AS product_id,
                p.name AS product_name,
                p.sku AS product_sku,
                p.description,
                p.fabric,
                p.occasion,
                p.base_price AS product_base_price,
                p.status AS product_status,
                vi.stock_level,
                vi.low_stock_threshold
             FROM cart_items ci
             INNER JOIN product_variants pv ON pv.id = ci.variant_id
             INNER JOIN products p ON p.id = pv.product_id
             LEFT JOIN variant_inventory vi ON vi.variant_id = pv.id
             WHERE ci.cart_id = ?
             ORDER BY ci.created_at DESC`,
            [cartId]
        );

        cart.items = items.map((item) => ({
            cartItemId: item.cart_item_id,
            variantId: item.variant_id,
            productId: item.product_id,
            productName: item.product_name,
            productSku: item.product_sku,
            description: item.description,
            fabric: item.fabric,
            occasion: item.occasion,
            sku: item.sku,
            quantity: item.quantity,
            priceSnapshot: Number(item.price_snapshot),
            variantPrice: Number(item.variant_price),
            discountPrice: item.discount_price ? Number(item.discount_price) : null,
            discountStart: item.discount_start,
            discountEnd: item.discount_end,
            image: item.variant_image || null,
            attributes: this.parseAttributes(item.attributes_json),
            stockLevel: item.stock_level || 0,
            lowStockThreshold: item.low_stock_threshold || 5,
            itemCreatedAt: item.item_created_at,
            itemUpdatedAt: item.item_updated_at,
        }));

        return cart;
    }

    /**
     * Get specific cart item
     * @param {number} cartItemId - Cart item ID
     * @returns {Promise<object|null>} Cart item with details
     */
    async getCartItemById(cartItemId) {
        const [rows] = await mysqlPool.query(
            `SELECT 
                ci.*,
                pv.product_id,
                p.name AS product_name
             FROM cart_items ci
             INNER JOIN product_variants pv ON pv.id = ci.variant_id
             INNER JOIN products p ON p.id = pv.product_id
             WHERE ci.id = ?`,
            [cartItemId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Check if variant exists in cart
     * @param {number} cartId - Cart ID
     * @param {number} variantId - Variant ID
     * @returns {Promise<object|null>} Existing cart item
     */
    async getCartItemByVariant(cartId, variantId) {
        const [rows] = await mysqlPool.query(
            `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
            [cartId, variantId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Update cart status
     * @param {number} cartId - Cart ID
     * @param {string} status - New status (active, converted, abandoned)
     * @returns {Promise<boolean>} Success status
     */
    async updateCartStatus(cartId, status) {
        const [result] = await mysqlPool.query(
            `UPDATE carts SET status = ? WHERE id = ?`,
            [status, cartId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Parse variant attributes from JSON
     * @param {string|null} attributesJson - JSON string
     * @returns {object} Parsed attributes
     */
    parseAttributes(attributesJson) {
        if (!attributesJson) return {};
        try {
            return JSON.parse(attributesJson);
        } catch {
            return {};
        }
    }

    /**
     * Get effective price for variant (considering discounts)
     * @param {object} variant - Variant object
     * @returns {number} Effective price
     */
    getEffectivePrice(variant) {
        const price = Number(variant.variant_price || variant.price || 0);
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
}

module.exports = new CartSqlRepository();
