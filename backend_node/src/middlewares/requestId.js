/**
 * Request ID Middleware
 * Shri Ramya E-Commerce Platform
 *
 * Adds unique request ID to each request for tracing and logging purposes.
 * The request ID is:
 * - Generated if not provided in headers
 * - Extracted from X-Request-ID header if provided
 * - Added to response headers
 * - Attached to request object for use in controllers/services
 * - Included in all log messages for request tracing
 *
 * @middleware
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Header names for request ID
 */
const REQUEST_ID_HEADER = 'x-request-id';
const RESPONSE_REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Request ID Middleware
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @example
 * // In app.js
 * const requestId = require('./middlewares/requestId');
 * app.use(requestId);
 *
 * // In controller
 * const requestId = req.requestId;
 * logger.info('Processing request', { requestId });
 */
const requestIdMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Get request ID from header or generate new one
  let requestId = req.headers[REQUEST_ID_HEADER.toLowerCase()];

  if (!requestId) {
    requestId = uuidv4();
  }

  // Validate request ID format (basic validation)
  if (!isValidRequestId(requestId)) {
    requestId = uuidv4();
  }

  // Attach request ID to request object
  req.requestId = requestId;

  // Set request ID in logger context
  logger.setRequestId(requestId);

  // Add request ID to response headers
  res.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);

  // Log request start
  logger.logRequestStart(req);

  // Log response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequestComplete(req, res, duration);
  });

  next();
};

/**
 * Validate request ID format
 * Supports UUID v4 and simple alphanumeric strings
 *
 * @param {string} requestId - Request ID to validate
 * @returns {boolean} True if valid
 */
const isValidRequestId = (requestId) => {
  if (!requestId || typeof requestId !== 'string') {
    return false;
  }

  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Simple alphanumeric pattern (for backward compatibility)
  const simplePattern = /^[a-zA-Z0-9\-_]+$/;

  return uuidPattern.test(requestId) || (simplePattern.test(requestId) && requestId.length <= 64);
};

/**
 * Request ID Utility Functions
 */

/**
 * Get request ID from request or generate new one
 *
 * @param {Object} req - Express request object
 * @returns {string} Request ID
 */
const getRequestId = (req) => {
  return req.requestId || req.headers[REQUEST_ID_HEADER.toLowerCase()] || uuidv4();
};

/**
 * Set request ID in response
 *
 * @param {Object} res - Express response object
 * @param {string} requestId - Request ID
 */
const setResponseRequestId = (res, requestId) => {
  res.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
};

/**
 * Forward request ID to another service
 *
 * @param {Object} req - Express request object
 * @param {Object} headers - Headers object for outgoing request
 * @returns {Object} Headers with request ID
 */
const forwardRequestId = (req, headers = {}) => {
  headers[REQUEST_ID_HEADER] = req.requestId;
  return headers;
};

module.exports = requestIdMiddleware;
module.exports.getRequestId = getRequestId;
module.exports.setResponseRequestId = setResponseRequestId;
module.exports.forwardRequestId = forwardRequestId;
module.exports.REQUEST_ID_HEADER = REQUEST_ID_HEADER;
module.exports.RESPONSE_REQUEST_ID_HEADER = RESPONSE_REQUEST_ID_HEADER;
