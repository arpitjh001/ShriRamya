const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Hardened Rate Limiter for Login/Register
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    handler: (req, res, next) => {
        next(new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many login attempts. Please try again after 15 minutes.'));
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    apiLimiter,
};

