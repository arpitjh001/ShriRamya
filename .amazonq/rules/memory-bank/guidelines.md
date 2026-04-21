# Development Guidelines

## Code Quality Standards

### File Organization
- **Module Exports**: Use named exports for clarity and tree-shaking (5/5 files)
  ```javascript
  // Preferred
  module.exports = { register, login, logout };
  export { HealthTracker, TokenBucketTracker };
  
  // Also acceptable for default exports
  export default { sendMessage, listModels };
  ```

- **Import Style**: Use CommonJS (`require`) for backend, ES6 modules (`import/export`) for frontend and modern Node.js code
  ```javascript
  // Backend (CommonJS)
  const express = require('express');
  const { successResponse } = require('../utils/response');
  
  // Frontend (ES6)
  import React from 'react';
  import { AuthProvider } from './context/AuthContext';
  ```

### Code Formatting
- **Indentation**: 2 or 4 spaces consistently (no tabs)
- **Semicolons**: Use semicolons consistently in backend code
- **Trailing Commas**: Use trailing commas in objects and arrays for cleaner diffs
- **Line Length**: Keep lines under 100-120 characters when possible
- **Whitespace**: Add blank lines between logical sections for readability

### Documentation Standards
- **JSDoc Comments**: Use JSDoc-style comments for functions and modules (4/5 files)
  ```javascript
  /**
   * User Registration
   * Creates a new user account and returns JWT tokens
   */
  const register = async (req, res, next) => {
    // Implementation
  };
  
  /**
   * Cloud Code Client for Antigravity
   *
   * Communicates with Google's Cloud Code internal API using the
   * v1internal:streamGenerateContent endpoint with proper request wrapping.
   */
  ```

- **Inline Comments**: Use inline comments sparingly, only for complex logic
- **File Headers**: Include descriptive headers for modules explaining purpose and usage

### Naming Conventions
- **Variables/Functions**: camelCase (`getUserById`, `accessToken`, `deviceId`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`LOCAL_API_HOST_PATTERN`, `JWT_SECRET`)
- **Classes/Components**: PascalCase (`AuthProvider`, `CartProvider`, `HealthTracker`)
- **Files**: kebab-case for utilities, camelCase for components (`auth.controller.js`, `apiBase.js`)
- **Private Functions**: Prefix with underscore or keep internal to module

## Architectural Patterns

### Layered Architecture (Backend)
Follow strict separation of concerns across layers:

1. **Controllers** - Handle HTTP requests/responses
   ```javascript
   const register = async (req, res, next) => {
     try {
       const user = await authService.createUser(req.body);
       return successResponse(res, { user, token }, "User registered successfully");
     } catch (error) {
       next(error);
     }
   };
   ```

2. **Services** - Business logic and orchestration
   ```javascript
   const createUser = async (userBody) => {
     if (await User.isEmailTaken(userBody.email)) {
       throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
     }
     return User.create({ ...userBody, role: 'user' });
   };
   ```

3. **Models** - Data structure and validation
4. **Repositories** - Data access abstraction (when needed)

### Error Handling Patterns

#### Backend Error Handling
- **Always use try-catch** in async controllers
- **Pass errors to next()** middleware for centralized handling
- **Use ApiError class** for consistent error responses
  ```javascript
  const login = async (req, res, next) => {
    try {
      const user = await authService.loginWithEmailAndPassword(email, password);
      return successResponse(res, { user, token });
    } catch (error) {
      next(error); // Centralized error handler
    }
  };
  ```

- **Throw ApiError with status codes**
  ```javascript
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  ```

#### Frontend Error Handling
- **Graceful degradation** for missing environment variables
- **Defensive checks** for browser APIs
  ```javascript
  const getBrowserHostname = () => {
    if (typeof window === "undefined" || !window.location) {
      return "";
    }
    return window.location.hostname.toLowerCase();
  };
  ```

### Authentication & Security Patterns

#### JWT Token Management
- **Access Token**: Short-lived, stored in memory or localStorage
- **Refresh Token**: Long-lived, stored in HTTPOnly cookies
  ```javascript
  res.cookie('refresh_token', encodedRT, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.secure ? 'Strict' : 'Lax',
    maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
  });
  ```

#### Device Binding
- **Device ID Header**: `x-device-id` for device-specific tokens
- **Device Validation**: Check device binding in auth middleware
  ```javascript
  const deviceId = req.headers['x-device-id'];
  if (payload.deviceId && deviceId && payload.deviceId !== deviceId) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device binding mismatch'));
  }
  ```

#### Token Blacklisting
- **Redis-based blacklist** for revoked access tokens
  ```javascript
  const isBlacklisted = await redis.get(`at_blacklist:${payload.jti}`);
  if (isBlacklisted) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token has been revoked'));
  }
  ```

### Middleware Patterns

#### Middleware Ordering (Critical)
```javascript
// 1. Request ID (for tracing)
app.use(requestId);

// 2. Logging
app.use(morgan('dev'));

// 3. Security headers
app.use(helmet());

// 4. Body parsing
app.use(express.json());
app.use(cookieParser());

// 5. Rate limiting (specific routes)
app.use('/api/v1/auth', authLimiter);

// 6. Compression
app.use(compression());

// 7. CORS
app.use(cors({ origin: config.frontendUrl, credentials: true }));

// 8. Static files
app.use('/uploads', express.static('uploads'));

// 9. Routes
app.use('/api/v1', routes);

// 10. 404 handler
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Endpoint not found'));
});

// 11. Error converter
app.use(errorConverter);

// 12. Error handler (must be last)
app.use(errorHandler);
```

#### Role-Based Access Control (RBAC)
- **Flexible role checking** with case-insensitive comparison
  ```javascript
  const auth = (roles = []) => async (req, res, next) => {
    const userRole = payload.role.toLowerCase();
    const requiredRoles = roles.map(r => r.toLowerCase());
    
    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }
    
    req.user = payload;
    next();
  };
  ```

### Configuration Management

#### Environment-Based Configuration
- **Centralized config module** (`config/config.js`)
- **Environment variable validation** at startup
- **Fallback values** for non-critical settings
  ```javascript
  const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8000,
    jwt: {
      secret: process.env.JWT_SECRET,
      accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  };
  ```

#### Frontend Configuration
- **Environment-specific API URLs**
- **Runtime validation** for configuration
  ```javascript
  export const normalizeBackendUrl = (value) => {
    const trimmedValue = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
    
    if (!trimmedValue) return "";
    
    const browserHostname = getBrowserHostname();
    const pointsToLocalApi = LOCAL_API_HOST_PATTERN.test(trimmedValue);
    
    // Prevent local API URLs in production
    if (pointsToLocalApi && !isLocalBrowserHost(browserHostname)) {
      return "";
    }
    
    return trimmedValue;
  };
  ```

### React Patterns

#### Context Providers
- **Nested providers** for separation of concerns
  ```javascript
  function App() {
    return (
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  }
  ```

#### Component Structure
- **Functional components** with hooks (no class components)
- **Named exports** for components
- **Default export** for main component

### Data Validation

#### Request Validation
- **Joi schemas** for backend validation
- **Zod schemas** for frontend validation
- **Validate early** in the request lifecycle

#### Data Normalization
- **Normalize inputs** before processing
  ```javascript
  const normalizeTenantId = (value) => {
    const numericTenantId = Number(value);
    return Number.isInteger(numericTenantId) && numericTenantId > 0 ? numericTenantId : 1;
  };
  ```

## API Design Patterns

### Response Format
- **Consistent response structure** using utility functions
  ```javascript
  return successResponse(res, data, message, statusCode);
  ```

### Status Codes
- **Use http-status library** for semantic status codes
  ```javascript
  const httpStatus = require('http-status');
  throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  ```

### Request ID Tracing
- **Attach request ID** to all requests for debugging
- **Include in logs** and error responses

## Testing Patterns

### Backend Testing
- **Jest + Supertest** for API testing
- **Test isolation** with separate test database
- **Mock external dependencies** (Redis, payment gateways)

### Frontend Testing
- **Playwright** for E2E testing
- **Test user flows** end-to-end
- **Multiple browsers** for compatibility

## Performance Patterns

### Caching
- **Redis caching** for frequently accessed data
- **Cache invalidation** on updates
- **TTL-based expiration**

### Image Optimization
- **Sharp** for image processing
- **Multiple sizes** (thumbnail, medium, large, original)
- **WebP format** for modern browsers

### Database Optimization
- **Indexes** on frequently queried fields
- **Pagination** for large result sets
- **Connection pooling** for database connections

## Security Best Practices

### Input Sanitization
- **Validate all inputs** before processing
- **Sanitize user-generated content**
- **Prevent SQL injection** with parameterized queries

### Authentication Security
- **HTTPOnly cookies** for refresh tokens
- **Secure flag** in production
- **SameSite attribute** for CSRF protection
- **Token blacklisting** for logout

### CORS Configuration
- **Whitelist specific origins** in production
- **Enable credentials** for cookie-based auth
- **Preflight requests** with OPTIONS

### Rate Limiting
- **Auth endpoints** have stricter limits
- **Per-IP rate limiting**
- **Exponential backoff** for repeated failures

## Common Idioms

### Async/Await Pattern
```javascript
// Always use async/await over promises
const getData = async () => {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};
```

### Destructuring
```javascript
// Destructure for cleaner code
const { email, password } = req.body;
const { id, name, email: userEmail } = user;
```

### Spread Operator
```javascript
// Use spread for object composition
return User.create({ ...userBody, role: 'user' });
```

### Optional Chaining
```javascript
// Safe property access
const tenantId = user?.tenantId || user?.tenant_id || 1;
```

### Template Literals
```javascript
// Use template literals for string interpolation
logger.info(`User ${userId} logged in from ${deviceId}`);
```

## Module Organization

### Index Files
- **Re-export** related modules for cleaner imports
  ```javascript
  // trackers/index.js
  export { HealthTracker } from './health-tracker.js';
  export { TokenBucketTracker } from './token-bucket-tracker.js';
  export { QuotaTracker } from './quota-tracker.js';
  ```

### Barrel Exports
- **Group related exports** in index files
- **Simplify imports** for consumers
  ```javascript
  // Instead of multiple imports
  import { HealthTracker } from './trackers/health-tracker';
  import { QuotaTracker } from './trackers/quota-tracker';
  
  // Use barrel export
  import { HealthTracker, QuotaTracker } from './trackers';
  ```

## Logging Standards

### Structured Logging
- **Include context** in log messages
  ```javascript
  logger.info('Server initializing', {
    env: config.env,
    port: config.port,
    frontendUrl: config.frontendUrl,
  });
  ```

### Log Levels
- **debug**: Detailed debugging information
- **info**: General informational messages
- **warn**: Warning messages for potential issues
- **error**: Error messages for failures

### Request Logging
- **Morgan** for HTTP request logging in development
- **Disable in test** environment to reduce noise
  ```javascript
  if (config.env !== 'test') {
    app.use(morgan('dev'));
  }
  ```
