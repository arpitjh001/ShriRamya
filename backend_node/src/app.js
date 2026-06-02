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
const sanitizeApiErrorResponse = require('./middlewares/sanitizeApiErrorResponse');

const cookieParser = require('cookie-parser');
const { authLimiter, registrationLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

// Vercel terminates the client connection and forwards the original IP once.
app.set('trust proxy', 1);

/**
 * Request ID Middleware (Must be first for tracing)
 */
app.use(requestId);
app.use(sanitizeApiErrorResponse);

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
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', registrationLimiter);
app.use('/api/v1/auth', authLimiter);

/**
 * Compression
 */
app.use(compression());

/**
 * CORS Configuration
 */
const corsOptionsDelegate = (origin, callback) => {
  // If no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, true);
  
  const corsConfig = config.cors || '*';
  
  // If wildcard, allow all
  if (corsConfig === '*') return callback(null, true);
  
  // Split and trim allowed origins
  const allowedOrigins = corsConfig.split(',').map(o => o.trim());
  
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    console.warn(`[CORS] Origin ${origin} not allowed. Allowed: ${corsConfig}`);
    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors({
  origin: corsOptionsDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token', 'x-session-id']
}));

// Pre-flight requests
app.options('*', cors({
  origin: corsOptionsDelegate,
  credentials: true
}));

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

      const cacheService = require('./services/cache.service');
      status.redis = {
        enabled: config.redis.enabled,
        healthy: cacheService.isHealthy(),
      };

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

// Direct mount for colors to support /api/colors/resolve
app.use('/api/colors', require('./routes/v1/color.route'));

// Original v1 routes for modern controller-based features
app.use('/api/v1', routes);

// DB-backed routes handle products, categories, cart, search, auth, orders, blogs, wishlist, admin
app.use('/api/v1', dbRoutes);

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
