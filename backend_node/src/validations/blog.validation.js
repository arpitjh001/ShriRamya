const Joi = require('joi');

const createPost = {
  body: Joi.object().keys({
    title: Joi.string().required().max(200),
    slug: Joi.string().allow('', null).optional(),
    excerpt: Joi.string().allow('').optional(),
    content: Joi.string().required(),
    featuredImage: Joi.string().uri().allow('', null).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    categoryId: Joi.number().integer().allow(null).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('draft', 'review', 'published', 'archived').default('draft'),
    seoTitle: Joi.string().allow('').optional(),
    seoDescription: Joi.string().allow('').optional(),
    tenantId: Joi.number().optional().default(1),
  }),
};

const updatePost = {
  params: Joi.object().keys({
    postId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    title: Joi.string().max(200).optional(),
    slug: Joi.string().allow('', null).optional(),
    excerpt: Joi.string().allow('').optional(),
    content: Joi.string().optional(),
    featuredImage: Joi.string().uri().allow('', null).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    categoryId: Joi.number().integer().allow(null).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('draft', 'review', 'published', 'archived').optional(),
    seoTitle: Joi.string().allow('').optional(),
    seoDescription: Joi.string().allow('').optional(),
  }).min(1),
};

const postId = {
  params: Joi.object().keys({
    postId: Joi.number().integer().required(),
  }),
};

const postSlug = {
  params: Joi.object().keys({
    slug: Joi.string().required(),
  }),
};

const addComment = {
  params: Joi.object().keys({
    postId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    content: Joi.string().required().max(1000),
    parentId: Joi.number().integer().allow(null).optional(),
  }),
};

const getPosts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().allow('', null).optional(),
    tag: Joi.string().allow('', null).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    search: Joi.string().allow('').optional(),
    author: Joi.number().integer().optional(),
  }),
};

module.exports = {
  createPost,
  updatePost,
  postId,
  postSlug,
  addComment,
  getPosts,
};
