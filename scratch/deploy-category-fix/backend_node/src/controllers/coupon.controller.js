const couponService = require('../services/coupon.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const getCoupons = async (req, res, next) => {
    try {
        const result = await couponService.getAllCoupons(req.query);
        return paginatedResponse(res, result.coupons, result.pagination, 'Coupons retrieved successfully');
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

/**
 * Validate coupon code (public endpoint)
 * GET /api/v1/coupons/validate/:code
 */
const validateCouponCode = async (req, res, next) => {
    try {
        const { code } = req.params;

        if (!code || code.trim().length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
        }

        // Get coupon by code
        const coupon = await couponService.getCouponByCode(code.trim());

        // Check if coupon is active
        if (coupon.status !== 'active') {
            return successResponse(res, {
                valid: false,
                code: coupon.code,
                message: 'This coupon is not active',
            });
        }

        // Check expiry
        const now = new Date();
        if (coupon.expires_at && new Date(coupon.expires_at) < now) {
            return successResponse(res, {
                valid: false,
                code: coupon.code,
                message: 'This coupon has expired',
            });
        }

        // Check start date
        if (coupon.starts_at && new Date(coupon.starts_at) > now) {
            return successResponse(res, {
                valid: false,
                code: coupon.code,
                message: 'This coupon is not yet active',
            });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return successResponse(res, {
                valid: false,
                code: coupon.code,
                message: 'This coupon has reached its usage limit',
            });
        }

        // Return valid coupon with preview
        return successResponse(res, {
            valid: true,
            coupon: {
                code: coupon.code,
                type: coupon.type,
                value: Number(coupon.value),
                min_cart_value: coupon.min_cart_value ? Number(coupon.min_cart_value) : null,
                max_discount: coupon.max_discount ? Number(coupon.max_discount) : null,
                description: `${coupon.type === 'percentage' ? coupon.value + '% OFF' : coupon.type === 'flat' ? '₹' + coupon.value + ' OFF' : coupon.type === 'free_shipping' ? 'Free Shipping' : 'BOGO Offer'}`,
            },
            message: 'Coupon is valid',
        });
    } catch (error) {
        if (error.statusCode === httpStatus.NOT_FOUND) {
            return successResponse(res, {
                valid: false,
                code: req.params.code,
                message: 'Invalid coupon code',
            });
        }
        next(error);
    }
};

module.exports = {
    getCoupons,
    getCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCouponCode,
};

