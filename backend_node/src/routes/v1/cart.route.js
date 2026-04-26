const express = require('express');
const validate = require('../../middlewares/validate');
const cartValidation = require('../../validations/cart.validation');
const cartController = require('../../controllers/cart.controller');
const auth = require('../../middlewares/auth');
const { apiLimiter, cartLimiter } = require('../../middlewares/rateLimit.middleware');
const { csrfProtection } = require('../../middlewares/csrf.middleware');

const router = express.Router();

router.use(apiLimiter);

/**
 * Cart Routes with CSRF Protection
 *
 * CSRF Protection Strategy:
 * 1. Double-Submit Cookie Pattern: CSRF token set in cookie and validated from header
 * 2. JWT Bearer Authentication: Not vulnerable to CSRF as tokens are in Authorization header
 * 3. SameSite Cookie Policy: Prevents cross-site cookie sending
 * 4. Origin Validation: CORS middleware validates request origin
 * 5. Rate Limiting: Prevents brute-force attacks
 * 
 * All state-changing operations (POST, PUT, DELETE) require:
 * - Valid CSRF token in x-csrf-token header matching csrf-token cookie
 * - Valid JWT token in Authorization header (for authenticated users)
 * - Request from allowed origin (CORS)
 */

// Apply CSRF protection to all cart routes
router.use(csrfProtection);

// Get current cart (auto-creates if doesn't exist)
router.get('/', cartController.getCart);

// Add item to cart
router.post('/add', validate(cartValidation.addToCart), cartController.addToCart);

// Update item quantity
router.put('/item/:id', validate(cartValidation.updateCartItem), cartController.updateCartItem);

// Remove item from cart
router.delete('/item/:id', validate(cartValidation.removeCartItem), cartController.removeCartItem);

// Clear entire cart
router.delete('/', validate(cartValidation.clearCart), cartController.clearCart);

// ==========================================
// Coupon Routes (Customer-Facing)
// ==========================================

// Apply coupon to cart
router.post('/coupon/apply', cartLimiter, cartController.applyCoupon);

// Remove coupon from cart
router.delete('/coupon/remove', cartLimiter, cartController.removeCoupon);

// Get applied coupon
router.get('/coupon', cartController.getAppliedCoupon);

// Get cart by ID (admin/internal use)
router.get('/:id', validate(cartValidation.getCartById), cartController.getCartById);

module.exports = router;
