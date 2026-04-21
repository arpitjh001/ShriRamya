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
  
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal server error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    message: message || httpStatus[statusCode],
    ...(config.env === 'development' && { stack: err.stack }),
  };

  // Log error details securely
  if (config.env === 'production') {
    console.error('[ErrorHandler]', {
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      path: req.path,
      method: req.method
    });
  } else {
    console.error(err);
  }

  res.status(statusCode).json(response);
};

module.exports = { errorConverter, errorHandler };

