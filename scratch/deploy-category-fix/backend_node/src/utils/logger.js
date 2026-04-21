/**
 * Structured Logger
 * Shri Ramya E-Commerce Platform
 *
 * Provides consistent logging across the application with:
 * - Log levels (error, warn, info, debug)
 * - JSON structured output
 * - Request ID tracing
 * - Timestamp support
 * - Environment-aware formatting
 *
 * @module utils/logger
 */

const config = require('../config/config');

/**
 * Log Levels
 * 0 - error: Critical errors that need immediate attention
 * 1 - warn: Potential issues that should be monitored
 * 2 - info: General operational information
 * 3 - debug: Detailed debugging information
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Current log level based on environment
 * - Production: info (shows error, warn, info)
 * - Development: debug (shows all levels)
 * - Test: error (only errors)
 */
const getLogLevel = () => {
  const env = config.env || process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return LOG_LEVELS.info;
    case 'test':
      return LOG_LEVELS.error;
    case 'development':
    default:
      return LOG_LEVELS.debug;
  }
};

const CURRENT_LOG_LEVEL = getLogLevel();

/**
 * Format timestamp for logs
 * @returns {string} ISO 8601 timestamp
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get request ID from current context (AsyncLocalStorage)
 * @returns {string|null} Request ID or null
 */
const getRequestId = () => {
  // Simple implementation - in production, use AsyncLocalStorage
  return global.currentRequestId || null;
};

/**
 * Set request ID for current context
 * @param {string} requestId - Request ID
 */
const setRequestId = (requestId) => {
  global.currentRequestId = requestId;
};

/**
 * Format log message based on environment
 * @param {Object} logObject - Log object
 * @returns {string|Object} Formatted log
 */
const formatLog = (logObject) => {
  if (config.env === 'production') {
    // JSON format for production (better for log aggregation)
    return JSON.stringify(logObject);
  }

  // Colored console output for development
  const colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m', // Gray
    reset: '\x1b[0m',
  };

  const color = colors[logObject.level] || colors.reset;
  const level = logObject.level.toUpperCase().padEnd(5);
  const timestamp = logObject.timestamp;
  const requestId = logObject.requestId ? `[${logObject.requestId}]` : '';
  const message = logObject.message;
  const meta = logObject.meta ? JSON.stringify(logObject.meta, null, 2) : '';

  return `${color}${level}${colors.reset} [${timestamp}] ${requestId} ${message}${meta ? ' ' + meta : ''}`;
};

/**
 * Write log to console
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const log = (level, message, meta = {}) => {
  // Check if this log level should be displayed
  if (LOG_LEVELS[level] > CURRENT_LOG_LEVEL) {
    return;
  }

  const logObject = {
    level,
    timestamp: getTimestamp(),
    requestId: getRequestId(),
    message,
    meta: {
      ...meta,
      environment: config.env,
      service: 'shriramya-backend',
      version: '2.0.0',
    },
  };

  // Remove null/undefined values
  if (!logObject.requestId) {
    delete logObject.requestId;
  }

  const formattedLog = formatLog(logObject);

  // Write to appropriate stream based on level
  if (level === 'error' || level === 'warn') {
    console.error(formattedLog);
  } else {
    console.log(formattedLog);
  }
};

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata (error, stack, etc.)
 *
 * @example
 * logger.error('Database connection failed', { error: err.message, stack: err.stack });
 */
const error = (message, meta = {}) => {
  log('error', message, meta);
};

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.warn('High memory usage detected', { memoryUsage: process.memoryUsage() });
 */
const warn = (message, meta = {}) => {
  log('warn', message, meta);
};

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.info('Server started', { port: 8000, env: config.env });
 */
const info = (message, meta = {}) => {
  log('info', message, meta);
};

/**
 * Log a debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.debug('Processing request', { method: req.method, path: req.path });
 */
const debug = (message, meta = {}) => {
  log('debug', message, meta);
};

/**
 * Log API request start
 * @param {Object} req - Express request object
 *
 * @example
 * logger.logRequestStart(req);
 */
const logRequestStart = (req) => {
  const requestId = req.requestId || generateRequestId();
  setRequestId(requestId);

  debug('API Request Started', {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    requestId,
  });
};

/**
 * Log API request completion
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in milliseconds
 *
 * @example
 * logger.logRequestComplete(req, res, duration);
 */
const logRequestComplete = (req, res, duration) => {
  const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

  log(level, 'API Request Completed', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    requestId: req.requestId,
  });
};

/**
 * Log database query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {number} duration - Query duration in milliseconds
 *
 * @example
 * logger.logQuery('SELECT * FROM users WHERE id = ?', [userId], duration);
 */
const logQuery = (query, params = [], duration) => {
  debug('Database Query', {
    query,
    params,
    duration: `${duration}ms`,
    requestId: getRequestId(),
  });
};

/**
 * Log cache operation
 * @param {string} operation - Operation type (GET, SET, DELETE)
 * @param {string} key - Cache key
 * @param {boolean} hit - Cache hit or miss
 *
 * @example
 * logger.logCache('GET', 'user:123', true);
 */
const logCache = (operation, key, hit = false) => {
  debug(`Cache ${operation}`, {
    key,
    hit,
    requestId: getRequestId(),
  });
};

/**
 * Log authentication event
 * @param {string} event - Event type (login, logout, register, etc.)
 * @param {string} userId - User ID
 * @param {boolean} success - Success status
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.logAuth('login', userId, true, { email: user.email });
 */
const logAuth = (event, userId, success, meta = {}) => {
  const level = success ? 'info' : 'warn';
  log(level, `Auth Event: ${event}`, {
    userId,
    success,
    requestId: getRequestId(),
    ...meta,
  });
};

/**
 * Log payment event
 * @param {string} event - Event type (payment_initiated, payment_success, payment_failed)
 * @param {string} orderId - Order ID
 * @param {string} paymentId - Payment ID
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.logPayment('payment_success', orderId, paymentId, { amount: 1000 });
 */
const logPayment = (event, orderId, paymentId, meta = {}) => {
  log('info', `Payment: ${event}`, {
    orderId,
    paymentId,
    requestId: getRequestId(),
    ...meta,
  });
};

/**
 * Log email sending
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {boolean} success - Success status
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.logEmail('order_confirmation@example.com', 'Order Confirmed', true);
 */
const logEmail = (to, subject, success, meta = {}) => {
  const level = success ? 'info' : 'warn';
  log(level, 'Email Sent', {
    to,
    subject,
    success,
    requestId: getRequestId(),
    ...meta,
  });
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {string} context - Error context (controller, service, etc.)
 * @param {Object} meta - Additional metadata
 *
 * @example
 * logger.logError(err, 'ProductController.createProduct', { productId });
 */
const logError = (error, context, meta = {}) => {
  error('Error in ' + context, {
    error: error.message,
    stack: error.stack,
    requestId: getRequestId(),
    ...meta,
  });
};

module.exports = {
  // Log levels
  LOG_LEVELS,

  // Core logging functions
  error,
  warn,
  info,
  debug,
  log,

  // Request logging
  logRequestStart,
  logRequestComplete,

  // Database logging
  logQuery,

  // Cache logging
  logCache,

  // Business event logging
  logAuth,
  logPayment,
  logEmail,

  // Error logging
  logError,

  // Request ID management
  generateRequestId,
  getRequestId,
  setRequestId,
};
