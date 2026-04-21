const Joi = require('joi');

const userId = {
  params: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),
};

const mongoUserId = {
  params: Joi.object().keys({
    userId: Joi.alternatives().try(
      Joi.string().hex().length(24), // MongoDB ObjectId
      Joi.number().integer()
    ).required(),
  }),
};

const roleId = {
  params: Joi.object().keys({
    roleId: Joi.number().integer().required(),
  }),
};

const syncUserMapping = {
  body: Joi.object().keys({
    mongoUserId: Joi.alternatives().try(
      Joi.string().hex().length(24),
      Joi.number().integer()
    ).required(),
    email: Joi.string().email().required(),
    tenantId: Joi.number().integer().optional().default(1),
  }),
};

const assignRole = {
  params: Joi.object().keys({
    userId: Joi.alternatives().try(
      Joi.string().hex().length(24),
      Joi.number().integer()
    ).required(),
  }),
  body: Joi.object().keys({
    roleId: Joi.number().integer().required(),
    tenantId: Joi.number().integer().optional().default(1),
  }),
};

const assignMultipleRoles = {
  params: Joi.object().keys({
    userId: Joi.alternatives().try(
      Joi.string().hex().length(24),
      Joi.number().integer()
    ).required(),
  }),
  body: Joi.object().keys({
    roleIds: Joi.array().items(Joi.number().integer()).min(1).required(),
    tenantId: Joi.number().integer().optional().default(1),
  }),
};

const removeRole = {
  params: Joi.object().keys({
    userId: Joi.alternatives().try(
      Joi.string().hex().length(24),
      Joi.number().integer()
    ).required(),
    roleId: Joi.number().integer().required(),
  }),
};

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().required().max(50).regex(/^[A-Za-z_]+$/),
    description: Joi.string().allow('').optional(),
    permissions: Joi.array().items(Joi.string()).optional(),
    tenantId: Joi.number().integer().optional().default(1),
  }),
};

const deleteRole = {
  params: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().allow('').optional(),
    search: Joi.string().allow('').optional(),
    tenantId: Joi.number().integer().optional(),
  }),
};

module.exports = {
  userId,
  mongoUserId,
  roleId,
  syncUserMapping,
  assignRole,
  assignMultipleRoles,
  removeRole,
  createRole,
  deleteRole,
  getUsers,
};
