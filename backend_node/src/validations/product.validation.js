const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const resourceId = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(objectIdPattern)
);

const variantSchema = Joi.object({
  id: resourceId.allow(null).optional(),
  sku: Joi.string().allow('', null).optional(),
  price: Joi.number().min(0).optional(),
  discountPrice: Joi.number().min(0).less(Joi.ref('price')).allow(null, '').optional(),
  discountStart: Joi.date().iso().allow(null, '').optional(),
  discountEnd: Joi.date().iso().allow(null, '').when('discountStart', {
    is: Joi.date().iso().required(),
    then: Joi.date().iso().greater(Joi.ref('discountStart')).allow(null, ''),
    otherwise: Joi.date().iso().allow(null, '')
  }),
  stock: Joi.number().integer().min(0).default(0),
  stock_quantity: Joi.number().integer().min(0).default(0),
  image: Joi.string().allow('', null).optional(),
  color: Joi.string().allow('', null).optional(),
  size: Joi.string().allow('', null).optional(),
  attributes: Joi.object().optional().description('Map of attribute names to values, e.g. {"Color": "Red", "Size": "L"}'),
  price_override: Joi.number().min(0).allow(null).optional(),
  lowStockThreshold: Joi.number().integer().min(0).default(5).optional(),
  weight_grams: Joi.number().min(0).allow(null).optional(),
  length_cm: Joi.number().min(0).allow(null).optional(),
  width_cm: Joi.number().min(0).allow(null).optional(),
  height_cm: Joi.number().min(0).allow(null).optional(),
  barcode: Joi.string().allow('', null).optional(),
});

const materialGuideSchema = Joi.object({
  description: Joi.string().allow('', null).optional(),
  properties: Joi.array().items(Joi.string().allow('', null)).optional(),
  care: Joi.array().items(Joi.string().allow('', null)).optional(),
  origin: Joi.string().allow('', null).optional(),
}).allow(null);

const getProducts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'published', 'archived'),
    category: Joi.string(),
    category_id: resourceId,
    featured: Joi.boolean().default(false),
    stock_status: Joi.string().valid('in_stock', 'out_of_stock'),
    search: Joi.string().allow('', null),
    sort: Joi.string(),
    order: Joi.string(),
    min_price: Joi.number().min(0),
    max_price: Joi.number().min(0),
    tenant_id: Joi.number().integer(),
    include_deleted: Joi.boolean().default(false),
  }).unknown(true), // Allow unknown query params to pass through
};

const getProduct = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
  }),
};

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    slug: Joi.string().allow('', null).optional(),
    sku: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    fabric: Joi.string().allow('', null).optional(),
    modelWears: Joi.string().allow('', null).optional(),
    modelHeight: Joi.string().allow('', null).optional(),
    materialGuide: materialGuideSchema.optional(),
    occasion: Joi.string().allow('', null).optional(),
    basePrice: Joi.number().min(0).optional(),
    categoryId: resourceId.allow(null).optional(),
    categories: Joi.alternatives().try(
      resourceId,
      Joi.array().items(resourceId)
    ).allow(null).optional(),
    status: Joi.string().valid('draft', 'published', 'publish', 'archived').default('published'),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      values: Joi.array().items(Joi.string()).required()
    })).optional(),
    variants: Joi.array().items(variantSchema).optional(),
    tenantId: Joi.number().optional().default(1),
    images: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional(),
    metaTitle: Joi.string().allow('').optional(),
    metaDescription: Joi.string().allow('').optional(),
    metaKeywords: Joi.string().allow('').optional(),
    // Root level fields that are normalized into default variant if provided
    price: Joi.number().min(0).optional(),
    salePrice: Joi.number().min(0).allow(null, '').optional(),
    sale_price: Joi.number().min(0).allow(null, '').optional(),
    discountPrice: Joi.number().min(0).allow(null, '').optional(),
    stock: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).optional(),
    originalOnly: Joi.boolean().optional(),
  }).unknown(true),
};

const cloneProduct = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
  }),
};

const addVariant = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
  }),
  body: variantSchema.keys({
    id: Joi.forbidden()
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional(),
    slug: Joi.string().allow('', null).optional(),
    sku: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    fabric: Joi.string().allow('', null).optional(),
    modelWears: Joi.string().allow('', null).optional(),
    modelHeight: Joi.string().allow('', null).optional(),
    materialGuide: materialGuideSchema.optional(),
    occasion: Joi.string().allow('', null).optional(),
    basePrice: Joi.number().min(0).optional(),
    categoryId: resourceId.allow(null).optional(),
    categories: Joi.alternatives().try(
      resourceId,
      Joi.array().items(resourceId)
    ).allow(null).optional(),
    status: Joi.string().valid('draft', 'published', 'publish', 'archived').optional(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      values: Joi.array().items(Joi.string()).required()
    })).optional(),
    variants: Joi.array().items(variantSchema).optional(),
    images: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional(),
    metaTitle: Joi.string().allow('').optional(),
    metaDescription: Joi.string().allow('').optional(),
    metaKeywords: Joi.string().allow('').optional(),
    // Root level fields that are normalized into default variant if provided
    price: Joi.number().min(0).optional(),
    salePrice: Joi.number().min(0).allow(null, '').optional(),
    sale_price: Joi.number().min(0).allow(null, '').optional(),
    discountPrice: Joi.number().min(0).allow(null, '').optional(),
    stock: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).optional(),
    originalOnly: Joi.boolean().optional(),
  }).unknown(true),
};

const updateVariant = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
    variant_id: resourceId.required(),
  }),
  body: variantSchema.keys({
    id: Joi.forbidden()
  }),
};

const deleteVariant = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
    variant_id: resourceId.required(),
  }),
};

const syncVariantMatrix = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
  }),
  body: Joi.object().keys({
    variants: Joi.array().items(variantSchema).required(),
  }).required(),
};

const updateVariantStock = {
  params: Joi.object().keys({
    product_id: resourceId.required(),
    variant_id: resourceId.required(),
  }),
  body: Joi.object().keys({
    stockLevel: Joi.number().integer().min(0).required(),
  }).required(),
};

const deleteProductsBulk = {
  body: Joi.object().keys({
    ids: Joi.array().items(resourceId).min(1).required(),
  }).required(),
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  cloneProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  deleteProductsBulk,
  syncVariantMatrix,
  updateVariantStock,
};
