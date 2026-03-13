const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required().max(100),
    slug: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    image: Joi.string().uri().allow('', null).optional(),
    parentId: Joi.number().integer().allow(null).optional(),
    tenantId: Joi.number().optional().default(1),
  }),
};

const updateCategory = {
  params: Joi.object().keys({
    categoryId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(100).optional(),
    slug: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('').optional(),
    image: Joi.string().uri().allow('', null).optional(),
    parentId: Joi.number().integer().allow(null).optional(),
  }).min(1),
};

const categoryId = {
  params: Joi.object().keys({
    categoryId: Joi.number().integer().required(),
  }),
};

const categorySlug = {
  params: Joi.object().keys({
    slug: Joi.string().required(),
  }),
};

const getProductsByCategory = {
  params: Joi.object().keys({
    categoryId: Joi.number().integer().required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
  categoryId,
  categorySlug,
  getProductsByCategory,
};
