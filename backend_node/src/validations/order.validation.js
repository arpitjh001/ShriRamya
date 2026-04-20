const Joi = require('joi');

const addressSchema = Joi.object({
  warehouse_name: Joi.string().trim().optional(),
  name: Joi.string().trim().optional(),
  address: Joi.string().trim().optional(),
  address_2: Joi.string().trim().allow('').optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  pincode: Joi.string().trim().optional(),
  phone: Joi.string().trim().optional(),
  gst_number: Joi.string().trim().allow('').optional(),
});

const shippingDimensionsSchema = Joi.alternatives().try(
  Joi.string().trim(),
  Joi.object({
    length: Joi.number().positive().required(),
    breadth: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
  })
);

const createOrder = {
  body: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
        variantId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
        quantity: Joi.number().min(1).required(),
        attributes: Joi.object().optional(),
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
      country: Joi.string().default('IN'),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
    }).required(),
    shipping: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      address1: Joi.string().required(),
      address2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postcode: Joi.string().required(),
      country: Joi.string().default('IN'),
    }).required(),
    paymentMethod: Joi.string().valid('razorpay', 'stripe', 'cod', 'card', 'upi', 'netbanking').default('cod'),
    customerNotes: Joi.string().max(1000).optional(),
    couponCode: Joi.string().optional(),
  }),
};

const updateOrderStatus = {
  body: Joi.object({
    status: Joi.string().valid(
      'pending',
      'confirmed',
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
    reason: Joi.string().max(500).optional(),
    internalNotes: Joi.string().max(2000).allow('').optional(),
  }).or('status', 'paymentStatus', 'fulfillmentStatus', 'internalNotes'),
};

const createShipment = {
  body: Joi.object({
    carrier: Joi.string().trim().required(),
    provider: Joi.string().trim().optional(),
    trackingNumber: Joi.string().trim().optional(),
    trackingUrl: Joi.string().uri().optional(),
    shippingMethod: Joi.string().trim().optional(),
    shippingWeight: Joi.number().positive().optional(),
    shippingDimensions: shippingDimensionsSchema.optional(),
    preventMultiple: Joi.boolean().default(true),
    courierId: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
    xpressbeesCourierId: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
    paymentType: Joi.string().valid('cod', 'prepaid', 'reverse').optional(),
    requestAutoPickup: Joi.boolean().optional(),
    codCharges: Joi.number().min(0).optional(),
    pickup: addressSchema.optional(),
    rto: addressSchema.optional(),
  }),
};

const updateTracking = {
  body: Joi.object({
    carrier: Joi.string().trim().optional(),
    trackingNumber: Joi.string().trim().optional(),
    trackingUrl: Joi.string().uri().optional(),
  }).min(1),
};

const createRefund = {
  body: Joi.object({
    amount: Joi.number().min(0.01).required(),
    reason: Joi.string().max(500).required(),
    items: Joi.array().items(
      Joi.object({
        orderItemId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
        quantity: Joi.number().min(1).required(),
        amount: Joi.number().min(0).optional(),
        reason: Joi.string().max(200).optional(),
      })
    ).optional(),
  }),
};

const processRefund = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  }),
};

const cancelOrder = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  }),
};

const getOrdersQuery = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    fulfillmentStatus: Joi.string().valid('unfulfilled', 'processing', 'shipped', 'delivered').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    search: Joi.string().max(100).optional(),
  }),
};

const getShipmentsQuery = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().optional(),
    carrier: Joi.string().trim().optional(),
    provider: Joi.string().trim().optional(),
  }),
};

module.exports = {
  createOrder,
  updateOrderStatus,
  createShipment,
  updateTracking,
  createRefund,
  processRefund,
  cancelOrder,
  getOrdersQuery,
  getShipmentsQuery,
};
