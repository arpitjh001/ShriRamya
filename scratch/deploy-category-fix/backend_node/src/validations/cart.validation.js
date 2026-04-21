const Joi = require('joi');

/**
 * Add item to cart validation
 */
const addToCart = {
    body: Joi.object().keys({
        variantId: Joi.number().integer().min(1).required()
            .messages({
                'number.base': 'variantId must be a number',
                'number.integer': 'variantId must be an integer',
                'number.min': 'variantId must be at least 1',
                'any.required': 'variantId is required',
            }),
        quantity: Joi.number().integer().min(1).default(1)
            .messages({
                'number.base': 'quantity must be a number',
                'number.integer': 'quantity must be an integer',
                'number.min': 'quantity must be at least 1',
            }),
        sessionId: Joi.string().optional()
            .messages({
                'string.base': 'sessionId must be a string',
            }),
    }),
};

/**
 * Update cart item validation
 */
const updateCartItem = {
    params: Joi.object().keys({
        id: Joi.number().integer().min(1).required()
            .messages({
                'number.base': 'Cart item ID must be a number',
                'number.integer': 'Cart item ID must be an integer',
                'number.min': 'Cart item ID must be at least 1',
                'any.required': 'Cart item ID is required',
            }),
    }),
    body: Joi.object().keys({
        quantity: Joi.number().integer().min(0).required()
            .messages({
                'number.base': 'quantity must be a number',
                'number.integer': 'quantity must be an integer',
                'number.min': 'quantity must be at least 0',
                'any.required': 'quantity is required',
            }),
    }),
};

/**
 * Remove cart item validation
 */
const removeCartItem = {
    params: Joi.object().keys({
        id: Joi.number().integer().min(1).required()
            .messages({
                'number.base': 'Cart item ID must be a number',
                'number.integer': 'Cart item ID must be an integer',
                'number.min': 'Cart item ID must be at least 1',
                'any.required': 'Cart item ID is required',
            }),
    }),
};

/**
 * Get cart by ID validation
 */
const getCartById = {
    params: Joi.object().keys({
        id: Joi.number().integer().min(1).required()
            .messages({
                'number.base': 'Cart ID must be a number',
                'number.integer': 'Cart ID must be an integer',
                'number.min': 'Cart ID must be at least 1',
                'any.required': 'Cart ID is required',
            }),
    }),
};

/**
 * Clear cart validation
 */
const clearCart = {
    query: Joi.object().keys({
        cart_id: Joi.number().integer().min(1).optional()
            .messages({
                'number.base': 'cart_id must be a number',
                'number.integer': 'cart_id must be an integer',
                'number.min': 'cart_id must be at least 1',
            }),
        session_id: Joi.string().optional()
            .messages({
                'string.base': 'session_id must be a string',
            }),
    }),
};

module.exports = {
    addToCart,
    updateCartItem,
    removeCartItem,
    getCartById,
    clearCart,
};
