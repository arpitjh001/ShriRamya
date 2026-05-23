const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

/**
 * Auth Rate Limiter (Login/Register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestOrDev ? 10000 : 10,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many login attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Registration Rate Limiter (Stricter to prevent bot account creation)
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestOrDev ? 10000 : 5, // 5 registrations per hour
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many registration attempts from this IP. Please try again after an hour.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isTestOrDev ? 100000 : 100,
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
  max: isTestOrDev ? 10000 : 30,
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
  max: isTestOrDev ? 10000 : 20,
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
  max: isTestOrDev ? 10000 : 5,
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
  max: isTestOrDev ? 10000 : 10,
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many coupon attempts. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Coupon Validation Rate Limiter (Stricter for public endpoint)
 */
const couponValidationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTestOrDev ? 10000 : 5, // 5 attempts per minute
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many coupon validation attempts. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Cart Rate Limiter
 */
const cartLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTestOrDev ? 10000 : 30, // 30 cart operations per minute
  message: new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    'Too many cart operations. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  registrationLimiter,
  apiLimiter,
  searchLimiter,
  uploadLimiter,
  reviewLimiter,
  couponLimiter,
  couponValidationLimiter,
  cartLimiter
};

