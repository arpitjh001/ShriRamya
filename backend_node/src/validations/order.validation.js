/**
 * Order Validation Schemas
 */

const Joi = require('joi');

/**
 * Create order validation
 */
const createOrder = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: Joi.number().required(),
            variantId: Joi.number().optional(),
            quantity: Joi.number().min(1).required(),
            attributes: Joi.object().optional()
        })
    ).min(1).required(),
    
    billing: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        address1: Joi.string().required(),
        address2: Joi.string().optional(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postcode: Joi.string().required(),
        country: Joi.string().length(2).default('IN'),
        phone: Joi.string().optional(),
        email: Joi.string().email().optional()
    }).required(),
    
    shipping: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        address1: Joi.string().required(),
        address2: Joi.string().optional(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postcode: Joi.string().required(),
        country: Joi.string().length(2).default('IN')
    }).required(),
    
    paymentMethod: Joi.string().valid('razorpay', 'stripe', 'cod', 'card', 'upi', 'netbanking').default('cod'),
    customerNotes: Joi.string().max(1000).optional(),
    couponCode: Joi.string().optional()
});

/**
 * Update order status validation
 */
const updateOrderStatus = Joi.object({
    status: Joi.string().valid(
        'pending_payment',
        'payment_failed',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
    ).optional(),
    
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    
    fulfillmentStatus: Joi.string().valid('unfulfilled', 'processing', 'shipped', 'delivered').optional(),
    
    reason: Joi.string().max(500).optional()
}).or('status', 'paymentStatus', 'fulfillmentStatus');

/**
 * Create shipment validation
 */
const createShipment = Joi.object({
    carrier: Joi.string().required(),
    trackingNumber: Joi.string().optional(),
    trackingUrl: Joi.string().uri().optional(),
    shippingMethod: Joi.string().optional(),
    shippingWeight: Joi.number().optional(),
    shippingDimensions: Joi.string().optional(),
    preventMultiple: Joi.boolean().default(true)
});

/**
 * Update tracking validation
 */
const updateTracking = Joi.object({
    carrier: Joi.string().optional(),
    trackingNumber: Joi.string().optional(),
    trackingUrl: Joi.string().uri().optional()
}).min(1);

/**
 * Create refund validation
 */
const createRefund = Joi.object({
    amount: Joi.number().min(0.01).required(),
    reason: Joi.string().max(500).required(),
    items: Joi.array().items(
        Joi.object({
            orderItemId: Joi.number().required(),
            quantity: Joi.number().min(1).required(),
            amount: Joi.number().min(0).optional(),
            reason: Joi.string().max(200).optional()
        })
    ).optional()
});

/**
 * Process refund validation
 */
const processRefund = Joi.object({
    reason: Joi.string().max(500).optional()
});

/**
 * Cancel order validation
 */
const cancelOrder = Joi.object({
    reason: Joi.string().max(500).optional()
});

/**
 * Get orders query validation
 */
const getOrdersQuery = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().valid(
        'pending_payment',
        'payment_failed',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
    ).optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    fulfillmentStatus: Joi.string().valid('unfulfilled', 'processing', 'shipped', 'delivered').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    search: Joi.string().max(100).optional()
});

/**
 * Get shipments query validation
 */
const getShipmentsQuery = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'shipped', 'in_transit', 'delivered', 'returned').optional(),
    carrier: Joi.string().optional()
});

module.exports = {
    createOrder,
    updateOrderStatus,
    createShipment,
    updateTracking,
    createRefund,
    processRefund,
    cancelOrder,
    getOrdersQuery,
    getShipmentsQuery
};
