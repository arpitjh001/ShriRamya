# CSRF Protection Fix for mockRoutes.js

## Issue
CWE-352 - Cross-Site Request Forgery vulnerability at line 963 and other state-changing routes.

## Fix Applied

### 1. Created CSRF Middleware
File: `backend_node/src/middlewares/csrf.middleware.js`
- Generates CSRF tokens
- Validates tokens on POST/PUT/PATCH/DELETE requests
- Stores tokens in memory (use Redis in production)

### 2. Required Changes to mockRoutes.js

Add at the top of the file (after other requires):
```javascript
const { csrfProtection, getCSRFToken } = require('../middlewares/csrf.middleware');
```

Add CSRF token endpoint (before other routes):
```javascript
// Get CSRF token
router.get('/csrf-token', getCSRFToken);
```

Apply CSRF protection to all state-changing routes:
```javascript
// Cart routes - ADD csrfProtection middleware
router.post('/cart/add', csrfProtection, (req, res) => { ... });
router.put('/cart/item/:id', csrfProtection, (req, res) => { ... });
router.delete('/cart/item/:id', csrfProtection, (req, res) => { ... });
router.delete('/cart', csrfProtection, (req, res) => { ... });
router.post('/cart/coupon/apply', csrfProtection, (req, res) => { ... });
router.delete('/cart/coupon/remove', csrfProtection, (req, res) => { ... });

// Auth routes - ADD csrfProtection middleware
router.post('/auth/login', csrfProtection, (req, res) => { ... });
router.post('/auth/register', csrfProtection, (req, res) => { ... });

// Blog routes - ADD csrfProtection middleware
router.post('/blogs', csrfProtection, (req, res) => { ... });
router.put('/blogs/:id', csrfProtection, (req, res) => { ... });
router.post('/blogs/:id/publish', csrfProtection, (req, res) => { ... });
router.post('/blogs/:id/archive', csrfProtection, (req, res) => { ... });
router.delete('/blogs/:id', csrfProtection, (req, res) => { ... });
router.post('/blogs/:id/comment', csrfProtection, (req, res) => { ... });

// Order routes - ADD csrfProtection middleware
router.post('/orders', csrfProtection, async (req, res) => { ... });
router.post('/orders/:orderId/payment', csrfProtection, (req, res) => { ... });
router.put('/orders/:id/status', csrfProtection, (req, res) => { ... });
router.patch('/orders/admin/:id/status', csrfProtection, (req, res) => { ... });
router.post('/orders/my/:id/cancel', csrfProtection, (req, res) => { ... });
```

### 3. Frontend Integration

Clients must:
1. Fetch CSRF token: `GET /api/v1/csrf-token`
2. Include token in requests: `x-csrf-token` header or `_csrf` body field
3. Include session ID: `x-session-id` header

Example:
```javascript
// Get CSRF token
const { data } = await api.get('/csrf-token');
const csrfToken = data.csrf_token;
const sessionId = data.session_id;

// Use in requests
await api.post('/cart/add', {
  productId: 123,
  quantity: 1
}, {
  headers: {
    'x-csrf-token': csrfToken,
    'x-session-id': sessionId
  }
});
```

### 4. Alternative: Apply globally to router

Add after router creation:
```javascript
// Apply CSRF protection to all state-changing routes
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
});
```

## Security Benefits
- Prevents CSRF attacks on cart operations
- Protects authentication endpoints
- Secures order creation and payment
- Validates all state-changing operations
- Token-based validation with session binding

## Production Recommendations
1. Use Redis for token storage instead of in-memory Map
2. Implement token rotation
3. Add rate limiting on token generation
4. Use SameSite cookies for additional protection
5. Implement double-submit cookie pattern as fallback
