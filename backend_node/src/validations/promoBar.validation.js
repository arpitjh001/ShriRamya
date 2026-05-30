const Joi = require('joi');

const displayLocations = ['all', 'home', 'category', 'product', 'cart', 'checkout'];

const objectId = Joi.string().hex().length(24);
const optionalColor = Joi.string()
  .trim()
  .max(32)
  .allow('', null)
  .pattern(/^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|[a-zA-Z][a-zA-Z0-9-]*)$/);

const validateDateRange = (value, helpers) => {
  if (value.startDate && value.endDate && new Date(value.startDate) > new Date(value.endDate)) {
    return helpers.message('startDate must be before endDate');
  }
  return value;
};

const promoBarBody = {
  title: Joi.string().trim().max(120).allow('', null).optional(),
  promoText: Joi.string().trim().min(1).max(240).required(),
  couponCode: Joi.string().trim().max(50).allow('', null).optional(),
  isActive: Joi.boolean().default(true),
  displayLocation: Joi.string().valid(...displayLocations).default('all'),
  startDate: Joi.date().iso().allow(null).optional(),
  endDate: Joi.date().iso().allow(null).optional(),
  priority: Joi.number().integer().min(0).default(0),
  backgroundColor: optionalColor.optional(),
  textColor: optionalColor.optional(),
};

const createPromoBar = {
  body: Joi.object().keys(promoBarBody).custom(validateDateRange),
};

const updatePromoBar = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object()
    .keys({
      ...promoBarBody,
      promoText: Joi.string().trim().min(1).max(240).optional(),
      isActive: Joi.boolean().optional(),
      displayLocation: Joi.string().valid(...displayLocations).optional(),
      priority: Joi.number().integer().min(0).optional(),
    })
    .min(1)
    .custom(validateDateRange),
};

const promoBarId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const togglePromoBar = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    isActive: Joi.boolean().optional(),
  }),
};

const listPromoBars = {
  query: Joi.object().keys({
    displayLocation: Joi.string().valid(...displayLocations, 'all-locations').optional(),
    location: Joi.string().valid(...displayLocations, 'all-locations').optional(),
    isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false', 'all')).optional(),
  }),
};

const storefrontPromoBar = {
  query: Joi.object().keys({
    location: Joi.string().valid(...displayLocations).default('all'),
  }),
};

module.exports = {
  createPromoBar,
  updatePromoBar,
  promoBarId,
  togglePromoBar,
  listPromoBars,
  storefrontPromoBar,
  displayLocations,
};
