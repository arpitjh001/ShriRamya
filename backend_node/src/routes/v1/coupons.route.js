const express = require('express');
const couponController = require('../../controllers/coupon.controller');
const auth = require('../../middlewares/auth');
const { apiLimiter, couponValidationLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

// Admin endpoints
router.get('/', auth(['admin']), couponController.getCoupons);
router.get('/:coupon_id', auth(['admin']), couponController.getCoupon);
router.post('/', auth(['admin']), couponController.createCoupon);
router.put('/:coupon_id', auth(['admin']), couponController.updateCoupon);
router.delete('/:coupon_id', auth(['admin']), couponController.deleteCoupon);

// ==========================================
// Customer-Facing Endpoints
// ==========================================

// Validate coupon code (public, rate-limited)
router.get('/validate/:code', couponValidationLimiter, couponController.validateCouponCode);

module.exports = router;

