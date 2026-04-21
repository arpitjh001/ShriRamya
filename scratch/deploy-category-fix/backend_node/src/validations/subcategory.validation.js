const Joi = require('joi');

const categoryIdParam = {
  params: Joi.object().keys({
    categoryId: Joi.number().integer().required(),
  }),
};

const groupIdParam = {
  params: Joi.object().keys({
    groupId: Joi.number().integer().required(),
  }),
};

const valueIdParam = {
  params: Joi.object().keys({
    valueId: Joi.number().integer().required(),
  }),
};

const createGroup = {
  params: Joi.object().keys({
    categoryId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().required().max(100),
    slug: Joi.string().allow('', null).optional(),
    display_order: Joi.number().integer().optional().default(0),
  }),
};

const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(100).optional(),
    slug: Joi.string().allow('', null).optional(),
    display_order: Joi.number().integer().optional(),
  }).min(1),
};

const createValue = {
  params: Joi.object().keys({
    groupId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().required().max(100),
    slug: Joi.string().allow('', null).optional(),
    display_order: Joi.number().integer().optional().default(0),
  }),
};

const updateValue = {
  params: Joi.object().keys({
    valueId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(100).optional(),
    slug: Joi.string().allow('', null).optional(),
    display_order: Joi.number().integer().optional(),
  }).min(1),
};

module.exports = {
  categoryIdParam,
  groupIdParam,
  valueIdParam,
  createGroup,
  updateGroup,
  createValue,
  updateValue,
};
