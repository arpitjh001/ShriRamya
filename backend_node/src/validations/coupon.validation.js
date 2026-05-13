const Joi = require('joi');

const resourceId = Joi.alternatives().try(
  Joi.string().hex().length(24),
  Joi.string().trim().min(1),
  Joi.number().integer()
);

const createCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required().max(50).regex(/^[A-Z0-9_-]+$/),
    description: Joi.string().allow('').optional(),
    type: Joi.string().valid('percentage', 'flat', 'free_shipping', 'buy_x_get_y').required(),
    value: Joi.number().min(0).required(),
    min_cart_value: Joi.number().min(0).default(0),
    max_discount: Joi.number().min(0).allow(null).optional(),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    usage_limit_per_user: Joi.number().integer().min(1).allow(null).optional(),
    starts_at: Joi.date().iso().optional(),
    expires_at: Joi.date().iso().optional(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    applicable_categories: Joi.array().items(resourceId).default([]),
    applicable_products: Joi.array().items(resourceId).default([]),
    buy_x_qty: Joi.number().integer().min(1).optional(),
    get_y_qty: Joi.number().integer().min(1).optional(),
    tenant_id: Joi.number().optional().default(1),
  }),
};

const updateCoupon = {
  params: Joi.object().keys({
    coupon_id: resourceId.required(),
  }),
  body: Joi.object().keys({
    code: Joi.string().max(50).regex(/^[A-Z0-9_-]+$/).optional(),
    description: Joi.string().allow('').optional(),
    type: Joi.string().valid('percentage', 'flat', 'free_shipping', 'buy_x_get_y').optional(),
    value: Joi.number().min(0).optional(),
    min_cart_value: Joi.number().min(0).optional(),
    max_discount: Joi.number().min(0).allow(null).optional(),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    usage_limit_per_user: Joi.number().integer().min(1).allow(null).optional(),
    starts_at: Joi.date().iso().optional(),
    expires_at: Joi.date().iso().optional(),
    status: Joi.string().valid('active', 'inactive', 'expired').optional(),
    applicable_categories: Joi.array().items(resourceId).optional(),
    applicable_products: Joi.array().items(resourceId).optional(),
    buy_x_qty: Joi.number().integer().min(1).optional(),
    get_y_qty: Joi.number().integer().min(1).optional(),
  }).min(1),
};

const couponId = {
  params: Joi.object().keys({
    coupon_id: resourceId.required(),
  }),
};

const validateCoupon = {
  query: Joi.object().keys({
    code: Joi.string().required(),
    cart_value: Joi.number().min(0).optional(),
  }),
};

const couponCode = {
  params: Joi.object().keys({
    code: Joi.string().required(),
  }),
};

module.exports = {
  createCoupon,
  updateCoupon,
  couponId,
  validateCoupon,
  couponCode,
};
