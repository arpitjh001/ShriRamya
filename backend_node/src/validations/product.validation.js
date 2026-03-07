const Joi = require('joi');

const variantSchema = Joi.object({
  id: Joi.number().integer().allow(null).optional(),
  sku: Joi.string().required(),
  price: Joi.number().min(0).required(),
  discountPrice: Joi.number().min(0).less(Joi.ref('price')).allow(null).optional(),
  discountStart: Joi.date().iso().allow(null).optional(),
  discountEnd: Joi.date().iso().allow(null).when('discountStart', {
    is: Joi.date().iso().required(),
    then: Joi.date().iso().greater(Joi.ref('discountStart')).allow(null),
    otherwise: Joi.date().iso().allow(null)
  }),
  stock: Joi.number().integer().min(0).default(0),
  image: Joi.string().allow('', null).optional(),
  attributes: Joi.object().required().description('Map of attribute names to values, e.g. {"Color": "Red", "Size": "L"}'),
  lowStockThreshold: Joi.number().integer().min(0).default(5).optional(),
});

const getProducts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'published', 'archived'),
    category: Joi.string(),
    category_id: Joi.number().integer(),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    product_id: Joi.number().integer().required(),
  }),
};

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    sku: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    fabric: Joi.string().allow('', null).optional(),
    occasion: Joi.string().allow('', null).optional(),
    basePrice: Joi.number().min(0).optional(),
    categoryId: Joi.number().integer().allow(null).optional(),
    categories: Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()))
    ).allow(null).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').default('published'),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      values: Joi.array().items(Joi.string()).required()
    })).optional(),
    variants: Joi.array().items(variantSchema).optional()
  }),
};

const addVariant = {
  params: Joi.object().keys({
    product_id: Joi.number().integer().required(),
  }),
  body: variantSchema.keys({
    id: Joi.forbidden()
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    product_id: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional(),
    sku: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    fabric: Joi.string().allow('', null).optional(),
    occasion: Joi.string().allow('', null).optional(),
    basePrice: Joi.number().min(0).optional(),
    categoryId: Joi.number().integer().allow(null).optional(),
    categories: Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()))
    ).allow(null).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      values: Joi.array().items(Joi.string()).required()
    })).optional(),
    variants: Joi.array().items(variantSchema).optional(),
  }).min(1),
};

const updateVariant = {
  params: Joi.object().keys({
    product_id: Joi.number().integer().required(),
    variant_id: Joi.number().integer().required(),
  }),
  body: variantSchema.keys({
    id: Joi.forbidden()
  }),
};

const deleteVariant = {
  params: Joi.object().keys({
    product_id: Joi.number().integer().required(),
    variant_id: Joi.number().integer().required(),
  }),
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
};
