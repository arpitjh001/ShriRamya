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
};
