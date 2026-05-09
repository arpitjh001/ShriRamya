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

/**
 * Flexible shipping address schema that accepts multiple field naming conventions
 * from the frontend (address_line1, address1, first_name/lastName, etc.)
 */
const flexibleAddressSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(Joi.string().allow(''), Joi.number(), Joi.boolean(), Joi.allow(null))
).optional();

const createOrder = {
  body: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
        variantId: Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow(null, ''),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().optional(),
        price: Joi.number().optional(),
        image: Joi.string().optional().allow(null, ''),
        attributes: Joi.object().optional(),
        size: Joi.string().optional().allow(null, ''),
        color: Joi.string().optional().allow(null, ''),
      })
    ).min(1).required(),
    // Accept billing in multiple formats
    billing: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.string().allow(''), Joi.number(), Joi.boolean(), Joi.allow(null))
    ).optional(),
    // Accept shipping in multiple formats
    shipping: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.string().allow(''), Joi.number(), Joi.boolean(), Joi.allow(null))
    ).optional(),
    // Accept shipping_address (frontend format)
    shipping_address: flexibleAddressSchema,
    // Accept email at top level
    email: Joi.string().email().optional(),
    // Accept amount at top level
    amount: Joi.number().optional(),
    paymentMethod: Joi.string().valid('razorpay', 'stripe', 'cod', 'card', 'upi', 'netbanking').default('cod'),
    customerNotes: Joi.string().max(1000).optional().allow(''),
    couponCode: Joi.string().optional().allow(null, ''),
    tenantId: Joi.number().optional(),
  }),
};

const updateOrderStatus = {
  body: Joi.object({
    status: Joi.string().valid(
      'pending', 'pending_payment', 'processing', 'confirmed',
      'shipped', 'out_for_delivery', 'delivered', 'cancelled',
      'refunded', 'payment_failed', 'returned'
    ).optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    fulfillmentStatus: Joi.string().valid(
      'unfulfilled', 'partially_fulfilled', 'fulfilled', 'returned'
    ).optional(),
    internalNotes: Joi.string().max(2000).allow('').optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const cancelOrder = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const createShipment = {
  body: Joi.object({
    trackingNumber: Joi.string().trim().optional(),
    carrier: Joi.string().trim().optional(),
    method: Joi.string().trim().optional(),
    estimatedDelivery: Joi.date().optional(),
    weight: Joi.number().positive().optional(),
    shippingWeight: Joi.number().positive().optional(),
    length: Joi.number().positive().optional(),
    breadth: Joi.number().positive().optional(),
    width: Joi.number().positive().optional(),
    height: Joi.number().positive().optional(),
    dimensions: shippingDimensionsSchema.optional(),
    shippingDimensions: shippingDimensionsSchema.optional(),
    items: Joi.array().items(
      Joi.object({
        orderItemId: Joi.string().optional(),
        productId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
        variantId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
        quantity: Joi.number().min(1).optional(),
      })
    ).optional(),
    provider: Joi.string().valid('manual', 'shiprocket').default('manual'),
    courier_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    courierId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    pickup_location: Joi.string().trim().optional(),
    pickupLocation: Joi.string().trim().optional(),
    request_pickup: Joi.boolean().optional(),
    request_auto_pickup: Joi.boolean().optional(),
    generateManifest: Joi.boolean().optional(),
    generateLabel: Joi.boolean().optional(),
    generateInvoice: Joi.boolean().optional(),
    paymentType: Joi.string().valid('prepaid', 'cod', 'Prepaid', 'COD').optional(),
    payment_type: Joi.string().valid('prepaid', 'cod', 'Prepaid', 'COD').optional(),
    providerOptions: Joi.object({
      courier_id: Joi.string().optional(),
      payment_type: Joi.string().valid('prepaid', 'cod').optional(),
    }).optional(),
    pickupAddress: addressSchema.optional(),
    deliveryAddress: addressSchema.optional(),
    rtoAddress: addressSchema.optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const updateTracking = {
  body: Joi.object({
    status: Joi.string().optional(),
    location: Joi.string().optional(),
    description: Joi.string().optional(),
    estimatedDelivery: Joi.date().optional(),
    trackingNumber: Joi.string().optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const getShipmentsQuery = {
  query: Joi.object({
    status: Joi.string().valid(
      'pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery',
      'delivered', 'cancelled', 'returned', 'failed', 'ready_to_ship'
    ).optional(),
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    carrier: Joi.string().optional(),
    search: Joi.string().optional(),
  }),
};

const createRefund = {
  body: Joi.object({
    reason: Joi.string().max(1000).required(),
    amount: Joi.number().positive().optional(),
    items: Joi.array().items(
      Joi.object({
        orderItemId: Joi.string().optional(),
        quantity: Joi.number().min(1).optional(),
      })
    ).optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const processRefund = {
  body: Joi.object({
    transactionId: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  createOrder,
  updateOrderStatus,
  cancelOrder,
  createShipment,
  updateTracking,
  getShipmentsQuery,
  createRefund,
  processRefund,
};
