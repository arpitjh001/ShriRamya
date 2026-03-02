const mongoose = require('mongoose');
const wcClient = require('../integrations/woocommerce');

const getCart = async (userId) => {
    const db = mongoose.connection.db;
    const cart = await db.collection('carts').findOne({ user_id: userId });

    if (!cart || !cart.items || cart.items.length === 0) {
        return { items: [] };
    }

    // Hydrate with WooCommerce data
    const hydratedItems = [];
    for (const item of cart.items) {
        try {
            const response = await wcClient.get(`/products/${item.product_id}`);
            hydratedItems.push({
                product: response.data,
                quantity: item.quantity,
                variation_id: item.variation_id || null
            });
        } catch (error) {
            console.error(`Failed to hydrate product ${item.product_id}:`, error.message);
        }
    }

    return { items: hydratedItems };
};

const updateCart = async (userId, items) => {
    const db = mongoose.connection.db;
    const cartData = {
        user_id: userId,
        items: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            variation_id: item.variation_id || null
        })),
        updated_at: new Date()
    };

    await db.collection('carts').updateOne(
        { user_id: userId },
        { $set: cartData },
        { upsert: true }
    );

    return cartData;
};

module.exports = {
    getCart,
    updateCart,
};
