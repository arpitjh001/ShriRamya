const httpStatus = require('http-status');
const cartService = require('../services/cart.service');
const { successResponse } = require('../utils/response');

/**
 * Get or create cart for user/session
 * GET /api/v1/cart
 */
const getCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.query.session_id || null;

        if (!userId && !sessionId) {
            // Generate a new session for guest
            const newSessionId = cartService.generateSessionId();
            const cart = await cartService.getOrCreateCart(null, newSessionId);
            
            res.setHeader('x-session-id', newSessionId);
            return successResponse(res, {
                ...cart,
                sessionId: newSessionId,
            });
        }

        const cart = await cartService.getOrCreateCart(userId, sessionId);
        return successResponse(res, cart);
    } catch (error) {
        next(error);
    }
};

/**
 * Add item to cart
 * POST /api/v1/cart/add
 */
const addToCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.body.sessionId || null;
        const { variantId, quantity } = req.body;

        if (!variantId) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'variantId is required',
            });
        }

        if (!quantity || quantity < 1) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'quantity must be at least 1',
            });
        }

        const cart = await cartService.addToCart({
            userId,
            sessionId,
            variantId,
            quantity,
        });

        // If guest, return session ID in header
        if (!userId && cart.sessionId) {
            res.setHeader('x-session-id', cart.sessionId);
        }

        return successResponse(
            res,
            cart,
            'Item added to cart successfully',
            httpStatus.CREATED
        );
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(httpStatus.NOT_FOUND).send({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 409) {
            return res.status(httpStatus.CONFLICT).send({
                success: false,
                message: error.message,
                code: error.code,
                availableStock: error.availableStock,
            });
        }
        if (error.statusCode === 400) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

/**
 * Update cart item quantity
 * PUT /api/v1/cart/item/:id
 */
const updateCartItem = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const cartItemId = parseInt(req.params.id, 10);
        const { quantity } = req.body;

        if (Number.isNaN(cartItemId)) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Invalid cart item ID',
            });
        }

        if (quantity === undefined || quantity === null) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'quantity is required',
            });
        }

        const cart = await cartService.updateCartItem({
            cartItemId,
            quantity,
            userId,
        });

        return successResponse(res, cart, 'Cart item updated successfully');
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(httpStatus.NOT_FOUND).send({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 403) {
            return res.status(httpStatus.FORBIDDEN).send({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 409) {
            return res.status(httpStatus.CONFLICT).send({
                success: false,
                message: error.message,
                code: error.code,
                availableStock: error.availableStock,
            });
        }
        next(error);
    }
};

/**
 * Remove item from cart
 * DELETE /api/v1/cart/item/:id
 */
const removeCartItem = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const cartItemId = parseInt(req.params.id, 10);

        if (Number.isNaN(cartItemId)) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Invalid cart item ID',
            });
        }

        const cart = await cartService.removeCartItem({
            cartItemId,
            userId,
        });

        return successResponse(res, cart, 'Item removed from cart successfully');
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(httpStatus.NOT_FOUND).send({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 403) {
            return res.status(httpStatus.FORBIDDEN).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

/**
 * Clear entire cart
 * DELETE /api/v1/cart
 */
const clearCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.query.session_id || null;
        const cartId = req.query.cart_id ? parseInt(req.query.cart_id, 10) : null;

        // Get cart ID from query or fetch from user/session
        let targetCartId = cartId;

        if (!targetCartId) {
            let cart = null;
            if (userId) {
                cart = await cartService.getOrCreateCart(userId, null);
            } else if (sessionId) {
                cart = await cartService.getOrCreateCart(null, sessionId);
            }

            if (!cart) {
                return res.status(httpStatus.NOT_FOUND).send({
                    success: false,
                    message: 'Cart not found',
                });
            }

            targetCartId = cart.id;
        }

        const cart = await cartService.clearCart({
            cartId: targetCartId,
            userId,
        });

        return successResponse(res, cart, 'Cart cleared successfully');
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(httpStatus.NOT_FOUND).send({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 403) {
            return res.status(httpStatus.FORBIDDEN).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get cart by ID (admin/internal use)
 * GET /api/v1/cart/:id
 */
const getCartById = async (req, res, next) => {
    try {
        const cartId = parseInt(req.params.id, 10);

        if (Number.isNaN(cartId)) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Invalid cart ID',
            });
        }

        const cart = await cartService.getCart(cartId);
        return successResponse(res, cart);
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(httpStatus.NOT_FOUND).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    getCartById,
};
