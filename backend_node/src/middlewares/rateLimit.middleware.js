const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Auth Rate Limiter (Login/Register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many login attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many requests. Please slow down.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Search Rate Limiter
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many search requests. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Upload Rate Limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many upload requests. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Review Rate Limiter
 */
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many review submissions. Please slow down.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Coupon Rate Limiter
 */
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many coupon attempts. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  apiLimiter,
  searchLimiter,
  uploadLimiter,
  reviewLimiter,
  couponLimiter
};
