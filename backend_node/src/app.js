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
const requestId = require('./middlewares/requestId');
const logger = require('./utils/logger');
const ApiError = require('./utils/ApiError');

const cookieParser = require('cookie-parser');
const { authLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

/**
 * Request ID Middleware (Must be first for tracing)
 */
app.use(requestId);

/**
 * Logging
 */
if (config.env !== 'test') {
  app.use(morgan('dev'));
  logger.info('Server initializing', {
    env: config.env,
    port: config.port,
    frontendUrl: config.frontendUrl,
  });
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
    requestId: req.requestId,
  });
});

/**
 * API Documentation (Swagger)
 */
if (config.env === 'development' || config.env === 'test') {
  try {
    const { swaggerSpec, swaggerDocs, swaggerUi } = require('./config/swagger');

    app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    app.use('/api/docs', swaggerUi.serve, swaggerDocs);
    logger.info('Swagger documentation enabled', { path: '/api/docs' });
  } catch (error) {
    logger.warn('Swagger documentation not available', { error: error.message });
  }
}

/**
 * API Routes
 * DB-backed routes take priority (MongoDB-powered)
 */
const dbRoutes = require('./routes/dbRoutes');

// DB-backed routes handle products, categories, cart, search, auth, orders, blogs, wishlist, admin
app.use('/api/v1', dbRoutes);

// Original routes for any remaining features
app.use('/api/v1', routes);

/**
 * 404 Handler
 */
app.use((req, res, next) => {
  logger.debug('Endpoint not found', {
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  });
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
