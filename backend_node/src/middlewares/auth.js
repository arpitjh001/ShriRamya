const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const User = require('../models/user.model');

const auth = (roles = []) => async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing'));
    }

    // Verify token
    const payload = jwt.verify(token, config.jwt.secret);

    // Fetch user
    const user = await User.findById(payload.sub);

    if (!user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found'));
    }

    // Role check
    if (roles.length && !roles.includes(user.role)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Access denied'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    }

    return next(error);
  }
};

module.exports = auth;