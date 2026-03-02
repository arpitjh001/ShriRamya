const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');

const config = require('./config/config');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

/**
 * Logging
 */
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

/**
 * Security Headers
 */
app.use(helmet());

/**
 * Rate Limiting (Basic protection)
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

/**
 * Body Parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Compression
 */
app.use(compression());

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: config.frontendUrl || '*',
    credentials: true,
  })
);
app.options('*', cors());

/**
 * Static Files
 */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/**
 * Health Check Endpoint
 */
app.get('/api/v1/health', (req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/v1', routes);

/**
 * 404 Handler
 */
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Endpoint not found'));
});

/**
 * Convert error to ApiError (if needed)
 */
app.use(errorConverter);

/**
 * Global Error Handler
 */
app.use(errorHandler);

module.exports = app;