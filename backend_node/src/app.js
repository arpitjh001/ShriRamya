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

const cookieParser = require('cookie-parser');
const { authLimiter } = require('./middlewares/rateLimit.middleware');

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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Auth Rate Limiting
 */
app.use('/api/v1/auth', authLimiter);

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
