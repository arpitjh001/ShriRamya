/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */

const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const config = require('../config/config');

/**
 * Generate CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getCookieOptions = () => {
  const secure = config.cookie.secure || process.env.NODE_ENV === 'production';

  return {
    httpOnly: false,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  };
};

const tokensMatch = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getHeaderValue = (value) => (typeof value === 'string' ? value.trim() : '');

const hasHeaderValue = (value) => getHeaderValue(value).length > 0;

const usesNonCookieCredentials = (req) => {
  const authorization = getHeaderValue(req.headers.authorization);
  const hasBearerToken = authorization.toLowerCase().startsWith('bearer ');
  const hasCartSessionHeader = hasHeaderValue(req.headers['x-session-id']);
  const hasBodyRefreshToken = /\/api\/v1\/auth\/refresh$/.test(req.originalUrl || req.path || '')
    && hasHeaderValue(req.body?.refresh_token);

  return hasBearerToken || hasCartSessionHeader || hasBodyRefreshToken;
};

const CSRF_EXEMPT_PATHS = [
  /^\/api\/v1\/orders\/webhooks\/payment\//,
  /^\/api\/v1\/payment\/webhooks\//,
  /^\/api\/v1\/analytics\/visit$/,
  /^\/api\/v1\/analytics\/events$/,
  /^\/api\/v1\/admin\/insiders\/weekly-digest$/,
];

const isCsrfExempt = (req) => CSRF_EXEMPT_PATHS.some((pattern) => pattern.test(req.originalUrl || req.path || ''));

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 * Validates CSRF token for POST, PUT, PATCH, DELETE requests
 *
 * This middleware:
 * 1. Sets a CSRF token cookie on GET requests
 * 2. Validates the token from header matches cookie on state-changing requests
 * 3. Uses httpOnly=false for cookie so JavaScript can read it
 */
const csrfProtection = (req, res, next) => {
  if (isCsrfExempt(req)) {
    return next();
  }

  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Generate and set CSRF token cookie if not present
    if (!req.cookies?.['csrf-token']) {
      const token = generateCSRFToken();
      res.cookie('csrf-token', token, getCookieOptions());
    }
    return next();
  }

  // Requests authenticated by app-controlled headers are not relying on ambient cookies.
  // This covers admin/editor Bearer JWT writes and guest cart mutations with x-session-id.
  if (usesNonCookieCredentials(req)) {
    return next();
  }

  // Get token from header
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['csrf-token'];

  if (!headerToken) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'CSRF token missing in header'));
  }

  if (!cookieToken) {
    console.warn(`[CSRF] Cookie missing for ${req.method} ${req.originalUrl}. Headers: ${JSON.stringify(req.headers)}`);
    return next(new ApiError(httpStatus.FORBIDDEN, 'CSRF token missing in cookie'));
  }

  // Validate token - header must match cookie
  if (!tokensMatch(headerToken, cookieToken)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Invalid CSRF token'));
  }

  next();
};

/**
 * Generate and send CSRF token (for explicit token requests)
 */
const getCSRFToken = (req, res) => {
  const token = generateCSRFToken();
  
  res.cookie('csrf-token', token, getCookieOptions());

  res.json({
    success: true,
    data: {
      csrf_token: token
    }
  });
};

module.exports = {
  csrfProtection,
  getCSRFToken
};
