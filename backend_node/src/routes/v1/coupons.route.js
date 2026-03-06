const express = require('express');
const couponController = require('../../controllers/coupon.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(['admin']), couponController.getCoupons);
router.get('/:coupon_id', auth(['admin']), couponController.getCoupon);
router.post('/', auth(['admin']), couponController.createCoupon);
router.put('/:coupon_id', auth(['admin']), couponController.updateCoupon);
router.delete('/:coupon_id', auth(['admin']), couponController.deleteCoupon);

module.exports = router;

