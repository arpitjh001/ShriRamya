/**
 * Review Validation Schemas
 */

const Joi = require('joi');

/**
 * Create review validation
 */
const createReview = Joi.object({
    productId: Joi.number().integer().min(1).required()
        .messages({
            'number.base': 'productId must be a number',
            'number.integer': 'productId must be an integer',
            'number.min': 'productId must be at least 1',
            'any.required': 'productId is required',
        }),
    
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.base': 'rating must be a number',
            'number.integer': 'rating must be an integer',
            'number.min': 'rating must be between 1 and 5',
            'number.max': 'rating must be between 1 and 5',
            'any.required': 'rating is required',
        }),
    
    title: Joi.string().min(3).max(200).required()
        .messages({
            'string.base': 'title must be a string',
            'string.min': 'title must be at least 3 characters',
            'string.max': 'title must not exceed 200 characters',
            'any.required': 'title is required',
        }),
    
    comment: Joi.string().min(10).max(2000).required()
        .messages({
            'string.base': 'comment must be a string',
            'string.min': 'comment must be at least 10 characters',
            'string.max': 'comment must not exceed 2000 characters',
            'any.required': 'comment is required',
        }),
    
    variantId: Joi.number().integer().min(1).optional()
        .messages({
            'number.base': 'variantId must be a number',
            'number.integer': 'variantId must be an integer',
            'number.min': 'variantId must be at least 1',
        }),
    
    images: Joi.array().items(Joi.string().uri()).max(5).optional()
        .messages({
            'array.base': 'images must be an array',
            'string.uri': 'each image must be a valid URL',
            'array.max': 'maximum 5 images allowed',
        }),
    
    isAnonymous: Joi.boolean().default(false).optional(),
    
    tenantId: Joi.number().integer().min(1).default(1).optional(),
});

/**
 * Update review validation
 */
const updateReview = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional()
        .messages({
            'number.base': 'rating must be a number',
            'number.integer': 'rating must be an integer',
            'number.min': 'rating must be between 1 and 5',
            'number.max': 'rating must be between 1 and 5',
        }),
    
    title: Joi.string().min(3).max(200).optional()
        .messages({
            'string.base': 'title must be a string',
            'string.min': 'title must be at least 3 characters',
            'string.max': 'title must not exceed 200 characters',
        }),
    
    comment: Joi.string().min(10).max(2000).optional()
        .messages({
            'string.base': 'comment must be a string',
            'string.min': 'comment must be at least 10 characters',
            'string.max': 'comment must not exceed 2000 characters',
        }),
    
    images: Joi.array().items(Joi.string().uri()).max(5).optional()
        .messages({
            'array.base': 'images must be an array',
            'string.uri': 'each image must be a valid URL',
            'array.max': 'maximum 5 images allowed',
        }),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

/**
 * Review ID param validation
 */
const reviewIdParam = Joi.object({
    id: Joi.number().integer().min(1).required()
        .messages({
            'number.base': 'review ID must be a number',
            'number.integer': 'review ID must be an integer',
            'number.min': 'review ID must be at least 1',
            'any.required': 'review ID is required',
        }),
});

/**
 * Product ID param validation
 */
const productIdParam = Joi.object({
    id: Joi.number().integer().min(1).required()
        .messages({
            'number.base': 'product ID must be a number',
            'number.integer': 'product ID must be an integer',
            'number.min': 'product ID must be at least 1',
            'any.required': 'product ID is required',
        }),
});

/**
 * Mark review as helpful validation
 */
const markHelpful = Joi.object({
    isHelpful: Joi.boolean().default(true).optional(),
});

/**
 * Get reviews query validation
 */
const getReviewsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    rating: Joi.number().integer().min(1).max(5).optional(),
    sortBy: Joi.string().valid('createdAt', 'rating', 'helpful').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    approved: Joi.boolean().optional(),
});

module.exports = {
    createReview,
    updateReview,
    reviewIdParam,
    productIdParam,
    markHelpful,
    getReviewsQuery,
};
