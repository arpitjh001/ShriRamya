const config = require('../config/config');

const GENERIC_SERVER_ERROR_MESSAGE = 'Internal server error';
const SENSITIVE_ERROR_KEYS = new Set([
  'stack',
  'stackTrace',
  'trace',
  'exception',
]);

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !Buffer.isBuffer(value)
);

const stripSensitiveErrorFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveErrorFields);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((sanitized, [key, fieldValue]) => {
    if (SENSITIVE_ERROR_KEYS.has(key)) {
      return sanitized;
    }

    sanitized[key] = stripSensitiveErrorFields(fieldValue);
    return sanitized;
  }, {});
};

const buildGenericServerErrorBody = (req) => ({
  success: false,
  message: GENERIC_SERVER_ERROR_MESSAGE,
  data: null,
  error: GENERIC_SERVER_ERROR_MESSAGE,
  ...(req.requestId && { requestId: req.requestId }),
});

const shouldSanitize = (req) => (
  config.env === 'production'
  && req.path.startsWith('/api/')
);

const sanitizeApiErrorResponse = (req, res, next) => {
  if (!shouldSanitize(req)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 500) {
      return originalJson(buildGenericServerErrorBody(req));
    }

    if (statusCode >= 400) {
      return originalJson(stripSensitiveErrorFields(body));
    }

    return originalJson(body);
  };

  return next();
};

module.exports = sanitizeApiErrorResponse;
