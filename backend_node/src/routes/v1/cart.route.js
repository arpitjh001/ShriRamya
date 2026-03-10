const express = require('express');
const validate = require('../../middlewares/validate');
const cartValidation = require('../../validations/cart.validation');
const cartController = require('../../controllers/cart.controller');
const auth = require('../../middlewares/auth');
const { apiLimiter, cartLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

/**
 * Cart Routes
 * Support both authenticated users and guest sessions
 */

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

// Get cart by ID (admin/internal use)
router.get('/:id', validate(cartValidation.getCartById), cartController.getCartById);

// ==========================================
// Coupon Routes (Customer-Facing)
// ==========================================

// Apply coupon to cart
router.post('/coupon/apply', cartLimiter, cartController.applyCoupon);

// Remove coupon from cart
router.delete('/coupon/remove', cartLimiter, cartController.removeCoupon);

// Get applied coupon
router.get('/coupon', cartController.getAppliedCoupon);

module.exports = router;
