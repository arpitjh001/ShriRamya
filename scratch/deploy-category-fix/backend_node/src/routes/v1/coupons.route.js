const express = require('express');
const validate = require('../../middlewares/validate');
const couponValidation = require('../../validations/coupon.validation');
const couponController = require('../../controllers/coupon.controller');
const auth = require('../../middlewares/auth');
const { apiLimiter, couponValidationLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

// Admin endpoints
router.get('/', auth(['admin']), couponController.getCoupons);
router.get('/:coupon_id', auth(['admin']), validate(couponValidation.couponId), couponController.getCoupon);
router.post('/', auth(['admin']), validate(couponValidation.createCoupon), couponController.createCoupon);
router.put('/:coupon_id', auth(['admin']), validate(couponValidation.updateCoupon), couponController.updateCoupon);
router.delete('/:coupon_id', auth(['admin']), validate(couponValidation.couponId), couponController.deleteCoupon);

// ==========================================
// Customer-Facing Endpoints
// ==========================================

// Validate coupon code (public, rate-limited)
router.get('/validate/:code', couponValidationLimiter, validate(couponValidation.couponCode), couponController.validateCouponCode);

module.exports = router;

