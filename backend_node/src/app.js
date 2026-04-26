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
const { csrfProtection, getCSRFToken } = require('./middlewares/csrf.middleware');

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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// Body Parsing with size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
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
 * CSRF Token Endpoint
 */
app.get('/api/v1/csrf-token', getCSRFToken);

/**
 * Debug Endpoint - Check Database and Redis Connection (Development Only)
 */
if (config.env === 'development') {
  app.get('/api/v1/debug/status', async (req, res) => {
  try {
    const { Product, Order } = require('./models');
    const mongoose = require('mongoose');
    
    const status = {
      timestamp: new Date().toISOString(),
      mongoConnection: mongoose.connection.readyState,
      mongoConnectionState: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      }[mongoose.connection.readyState],
    };

    // Test MongoDB with sample queries
    if (mongoose.connection.readyState === 1) {
      try {
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        status.database = {
          products: productCount,
          orders: orderCount,
        };
      } catch (dbErr) {
        status.database = { error: dbErr.message };
      }
    }

    // Test Redis
    try {
      const redis = require('./config/integrations/redis').getRedis();
      if (redis) {
        const ping = await redis.ping();
        status.redis = ping === 'PONG' ? 'connected' : 'disconnected';
      } else {
        status.redis = 'not initialized';
      }
    } catch (redisErr) {
      status.redis = { error: redisErr.message };
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: config.env === 'development' ? err.stack : undefined,
    });
  }
});
}

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

// Protect state-changing browser requests before dbRoutes, which owns many active handlers.
app.use('/api/v1', csrfProtection);

// DB-backed routes handle products, categories, cart, search, auth, orders, blogs, wishlist, admin
app.use('/api/v1', dbRoutes);

// Original v1 routes for modern controller-based features
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
