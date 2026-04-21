const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || (error.response ? error.response.status : httpStatus.INTERNAL_SERVER_ERROR);
    let message = error.message || httpStatus[statusCode];

    // Specific handling for Mongoose validation errors
    if (err.name === 'ValidationError') {
      statusCode = httpStatus.BAD_REQUEST;
      message = err.message;
    }

    // Extract message from axios response if available
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    }

    error = new ApiError(statusCode, message, err.name === 'ValidationError', err.stack);
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  /* if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  } */

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    message: message || httpStatus[statusCode],
    error: err.stack && config.env === 'development' ? err.stack : undefined,
  };

  // Always log error details to console in production for Vercel logging
  if (config.env === 'production') {
    console.error('[ErrorHandler] Error details:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    });
  }

  if (config.env === 'development') {
    console.error(err);
  }

  res.status(statusCode).json(response);
};

module.exports = { errorConverter, errorHandler };

