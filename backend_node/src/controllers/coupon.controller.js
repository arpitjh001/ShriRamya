const couponService = require('../services/coupon.service');
const { successResponse } = require('../utils/response');

const getCoupons = async (req, res, next) => {
    try {
        const coupons = await couponService.getAllCoupons(req.query);
        return successResponse(res, coupons);
    } catch (error) {
        next(error);
    }
};

const getCoupon = async (req, res, next) => {
    try {
        const coupon = await couponService.getCouponById(req.params.coupon_id);
        return successResponse(res, coupon);
    } catch (error) {
        next(error);
    }
};

const createCoupon = async (req, res, next) => {
    try {
        const result = await couponService.createCoupon(req.body);
        return successResponse(res, result, "Coupon created successfully");
    } catch (error) {
        next(error);
    }
};

const updateCoupon = async (req, res, next) => {
    try {
        const result = await couponService.updateCoupon(req.params.coupon_id, req.body);
        return successResponse(res, result, "Coupon updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteCoupon = async (req, res, next) => {
    try {
        const result = await couponService.deleteCoupon(req.params.coupon_id);
        return successResponse(res, result, "Coupon deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCoupons,
    getCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
};
