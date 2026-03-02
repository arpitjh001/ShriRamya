const Joi = require('joi');

const getProducts = {
  query: Joi.object().keys({
    category: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
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
    description: Joi.string().required(),
    price: Joi.number().positive().required(),
    category: Joi.string().required(),
    color: Joi.string().required(),
    size: Joi.string().required(),
    stock: Joi.number().integer().min(0).required(),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    product_id: Joi.number().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    price: Joi.number().positive().optional(),
    regular_price: Joi.string().optional(),
    sale_price: Joi.string().optional(),
    stock: Joi.number().min(0).optional(),
    stock_quantity: Joi.number().min(0).optional(),
    sku: Joi.string().optional(),
    status: Joi.string().valid('publish', 'draft', 'pending', 'private').optional(),
    categoryId: Joi.number().optional(),
    categories: Joi.array().items(Joi.object({ id: Joi.number() })).optional(),
    images: Joi.array().items(Joi.object()).optional(),
    // Custom Attributes/Meta
    fabric: Joi.string().optional(),
    occasion: Joi.string().optional(),
    care_instructions: Joi.string().optional(),
    size_stock: Joi.array().optional(),
    color_stock: Joi.array().optional(),
  }).min(1),
};

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    slug: Joi.string(),
    description: Joi.string(),
    parent: Joi.number().integer(),
    display: Joi.string(),
    image: Joi.object(),
    menu_order: Joi.number().integer(),
  }),
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  createCategory,
  updateProduct,
};
