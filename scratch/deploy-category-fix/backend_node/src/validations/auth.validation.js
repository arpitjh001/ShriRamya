const Joi = require('joi');

const register = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().min(8),
        name: Joi.string().required(),
        phone: Joi.string().allow('', null),
        tenantId: Joi.number().optional().default(1),
    }),
};

const login = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        tenantId: Joi.number().optional().default(1),
    }),
};

module.exports = {
    register,
    login,
};

