const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const redis = require('../config/integrations/redis');
const User = require('../models/user.model');

const auth = (roles = []) => async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Access token missing'));
    }

    // Verify signature and expiry (Stateless)
    const payload = jwt.verify(token, config.jwt.secret);

    // Check Blacklist in Redis (Stateful check for revoked tokens)
    const isBlacklisted = await redis.get(`at_blacklist:${payload.jti}`);
    if (isBlacklisted) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token has been revoked'));
    }

    // Device Binding Check (Optional but recommended)
    const deviceId = req.headers['x-device-id'];
    if (payload.deviceId && deviceId && payload.deviceId !== deviceId) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device binding mismatch'));
    }

    // Role check (RBAC) - case insensitive
    console.log('AUTH MIDDLEWARE - Payload Role:', payload.role);
    console.log('AUTH MIDDLEWARE - Payload Roles:', payload.roles);
    console.log('AUTH MIDDLEWARE - Allowed Roles:', roles);
    
    if (roles.length && payload.role) {
      // Check if user's role or roles array includes any of the required roles (case-insensitive)
      const userRole = payload.role.toLowerCase();
      const userRoles = (payload.roles || []).map(r => r.toLowerCase());
      const requiredRoles = roles.map(r => r.toLowerCase());
      
      const hasRole = requiredRoles.includes(userRole) || 
                      requiredRoles.some(r => userRoles.includes(r));
      
      if (!hasRole) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
      }
    }

    // Attach to request
    req.user = payload;
    req.deviceId = payload.deviceId;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
    }
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid authentication'));
  }
};

module.exports = auth;
