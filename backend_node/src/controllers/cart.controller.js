const cartService = require('../services/cart.service');
const { successResponse } = require('../utils/response');

const getCart = async (req, res, next) => {
    try {
        const cart = await cartService.getCart(req.user.id || req.user._id);
        return successResponse(res, cart);
    } catch (error) {
        next(error);
    }
};

const updateCart = async (req, res, next) => {
    try {
        const items = Array.isArray(req.body) ? req.body : req.body.items || [];
        const cart = await cartService.updateCart(req.user.id || req.user._id, items);
        return successResponse(res, cart, "Cart updated successfully");
    } catch (error) {
        next(error);
    }
};

const clearCart = async (req, res, next) => {
    try {
        const cart = await cartService.updateCart(req.user.id || req.user._id, []);
        return successResponse(res, cart, "Cart cleared successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCart,
    updateCart,
    clearCart,
};

