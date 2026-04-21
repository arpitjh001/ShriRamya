/**
 * CSRF Protection Middleware for Mock Routes
 * Validates CSRF tokens on state-changing operations
 */

const crypto = require('crypto');

// In-memory CSRF token store (use Redis in production)
const csrfTokens = new Map();

/**
 * Generate CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Protection Middleware
 * Validates CSRF token for POST, PUT, PATCH, DELETE requests
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }

  // Validate token
  const storedToken = csrfTokens.get(sessionId);
  if (!storedToken || storedToken !== token) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
};

/**
 * Generate and send CSRF token
 */
const getCSRFToken = (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || `session_${Date.now()}`;
  const token = generateCSRFToken();
  
  // Store token with 1 hour expiry
  csrfTokens.set(sessionId, token);
  setTimeout(() => csrfTokens.delete(sessionId), 60 * 60 * 1000);

  res.json({
    success: true,
    data: {
      csrf_token: token,
      session_id: sessionId
    }
  });
};

module.exports = {
  csrfProtection,
  getCSRFToken
};
