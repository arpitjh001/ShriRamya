const Joi = require('joi');

const mongoOrNumericId = Joi.alternatives().try(
    Joi.string().trim().min(1),
    Joi.number().integer().min(1)
);

/**
 * Add item to cart validation
 */
const addToCart = {
    body: Joi.object().keys({
        productId: mongoOrNumericId.optional()
            .messages({
                'alternatives.match': 'productId must be a valid product identifier',
            }),
        variantId: mongoOrNumericId.optional()
            .messages({
                'alternatives.match': 'variantId must be a valid variant identifier',
            }),
        quantity: Joi.number().integer().min(1).default(1)
            .messages({
                'number.base': 'quantity must be a number',
                'number.integer': 'quantity must be an integer',
                'number.min': 'quantity must be at least 1',
            }),
        color: Joi.string().allow('', null).optional(),
        size: Joi.string().allow('', null).optional(),
        sessionId: Joi.string().optional()
            .messages({
                'string.base': 'sessionId must be a string',
            }),
    }).or('productId', 'variantId').messages({
        'object.missing': 'productId or variantId is required',
    }),
};

/**
 * Update cart item validation
 */
const updateCartItem = {
    params: Joi.object().keys({
        id: mongoOrNumericId.required()
            .messages({
                'alternatives.match': 'Cart item ID must be a valid identifier',
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
        id: mongoOrNumericId.required()
            .messages({
                'alternatives.match': 'Cart item ID must be a valid identifier',
                'any.required': 'Cart item ID is required',
            }),
    }),
};

/**
 * Get cart by ID validation
 */
const getCartById = {
    params: Joi.object().keys({
        id: mongoOrNumericId.required()
            .messages({
                'alternatives.match': 'Cart ID must be a valid identifier',
                'any.required': 'Cart ID is required',
            }),
    }),
};

/**
 * Clear cart validation
 */
const clearCart = {
    query: Joi.object().keys({
        cart_id: mongoOrNumericId.optional()
            .messages({
                'alternatives.match': 'cart_id must be a valid identifier',
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
