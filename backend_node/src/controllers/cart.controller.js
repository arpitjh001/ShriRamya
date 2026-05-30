const httpStatus = require('http-status');
const cartService = require('../services/cart.service');
const couponService = require('../services/coupon.service');
const storefrontCheckoutService = require('../services/storefront-checkout.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');

const getSessionId = (req) => (
    req.headers['x-session-id']
    || req.body?.sessionId
    || req.query.sessionId
    || req.query.session_id
    || storefrontCheckoutService.generateSessionId()
);

const setSessionHeader = (res, sessionId) => {
    if (sessionId) {
        res.setHeader('x-session-id', sessionId);
    }
};

const handleCartError = (error, res, next) => {
    const statusCode = error.statusCode || (error.code === 'INSUFFICIENT_STOCK' ? httpStatus.CONFLICT : null);

    if ([httpStatus.BAD_REQUEST, httpStatus.FORBIDDEN, httpStatus.NOT_FOUND, httpStatus.CONFLICT].includes(statusCode)) {
        return res.status(statusCode).send({
            success: false,
            message: error.message,
            ...(error.code ? { code: error.code } : {}),
            ...(error.availableStock != null ? { availableStock: error.availableStock } : {}),
        });
    }

    return next(error);
};

/**
 * Get or create cart for user/session
 * GET /api/v1/cart
 */
const getCart = async (req, res, next) => {
    try {
        const sessionId = getSessionId(req);
        const cart = await storefrontCheckoutService.getCart(sessionId);
        setSessionHeader(res, sessionId);
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
        const sessionId = getSessionId(req);
        const { productId, variantId, quantity, size, color } = req.body;

        const cart = await storefrontCheckoutService.addToCart({
            sessionId,
            productId,
            variantId,
            quantity,
            size,
            color,
        });

        setSessionHeader(res, cart.sessionId || sessionId);

        return successResponse(
            res,
            cart,
            'Item added to cart successfully',
            httpStatus.CREATED
        );
    } catch (error) {
        return handleCartError(error, res, next);
    }
};

/**
 * Update cart item quantity
 * PUT /api/v1/cart/item/:id
 */
const updateCartItem = async (req, res, next) => {
    try {
        const sessionId = getSessionId(req);
        const cartItemId = req.params.id;
        const { quantity } = req.body;

        if (quantity === undefined || quantity === null) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'quantity is required',
            });
        }

        const cart = await storefrontCheckoutService.updateCartItem({
            sessionId,
            itemId: cartItemId,
            quantity,
        });

        setSessionHeader(res, cart.sessionId || sessionId);
        return successResponse(res, cart, 'Cart item updated successfully');
    } catch (error) {
        return handleCartError(error, res, next);
    }
};

/**
 * Remove item from cart
 * DELETE /api/v1/cart/item/:id
 */
const removeCartItem = async (req, res, next) => {
    try {
        const sessionId = getSessionId(req);
        const cartItemId = req.params.id;

        const cart = await storefrontCheckoutService.removeCartItem({
            sessionId,
            itemId: cartItemId,
        });

        setSessionHeader(res, cart.sessionId || sessionId);
        return successResponse(res, cart, 'Item removed from cart successfully');
    } catch (error) {
        return handleCartError(error, res, next);
    }
};

/**
 * Clear entire cart
 * DELETE /api/v1/cart
 */
const clearCart = async (req, res, next) => {
    try {
        const sessionId = getSessionId(req);
        const cart = await storefrontCheckoutService.clearCart(sessionId);

        setSessionHeader(res, cart.sessionId || sessionId);
        return successResponse(res, cart, 'Cart cleared successfully');
    } catch (error) {
        return handleCartError(error, res, next);
    }
};

/**
 * Get cart by ID (admin/internal use)
 * GET /api/v1/cart/:id
 */
const getCartById = async (req, res, next) => {
    try {
        const cartId = req.params.id;

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

// ==========================================
// Coupon Handlers (Customer-Facing)
// ==========================================

/**
 * Apply coupon to cart
 * POST /api/v1/cart/coupon/apply
 */
const applyCoupon = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.query.session_id || null;
        const { couponCode } = req.body;

        if (!couponCode || couponCode.trim().length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
        }

        // Get or create cart to get cartId
        const cart = await cartService.getOrCreateCart(userId, sessionId);
        
        // Apply coupon using coupon service
        const result = await couponService.applyCouponToCart(cart.id, couponCode.trim(), userId);

        return successResponse(res, {
            ...result,
            cartId: cart.id,
        }, 'Coupon applied successfully');
    } catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

/**
 * Remove coupon from cart
 * DELETE /api/v1/cart/coupon/remove
 */
const removeCoupon = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.query.session_id || null;

        // Get cart to get cartId
        const cart = await cartService.getOrCreateCart(userId, sessionId);

        // Remove coupon using coupon service
        const result = await couponService.removeCouponFromCart(cart.id);

        return successResponse(res, {
            ...result,
            cartId: cart.id,
        }, 'Coupon removed from cart');
    } catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).send({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get applied coupon for cart
 * GET /api/v1/cart/coupon
 */
const getAppliedCoupon = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.query.session_id || null;

        // Get cart to get cartId
        const cart = await cartService.getOrCreateCart(userId, sessionId);

        // Get applied coupon
        const appliedCoupon = await couponService.getAppliedCoupon(cart.id);

        return successResponse(res, appliedCoupon);
    } catch (error) {
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
    applyCoupon,
    removeCoupon,
    getAppliedCoupon,
};
