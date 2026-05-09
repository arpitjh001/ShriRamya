const { Coupon, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const config = require('../config/config');
const cacheService = require('./cache.service');
const cacheInvalidationService = require('./cacheInvalidation.service');
const cacheKeys = require('../utils/cacheKeyBuilder');

const MOCK_COUPONS = Object.freeze({
  WELCOME10: {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    min_cart_value: 500,
    description: '10% off on your first order',
    status: 'active',
  },
  SILK20: {
    code: 'SILK20',
    type: 'percentage',
    value: 20,
    min_cart_value: 2000,
    description: '20% off on Silk products',
    status: 'active',
  },
  FESTIVE15: {
    code: 'FESTIVE15',
    type: 'percentage',
    value: 15,
    min_cart_value: 1000,
    description: '15% off during festive season',
    status: 'active',
  },
  FLAT500: {
    code: 'FLAT500',
    type: 'flat',
    value: 500,
    min_cart_value: 3000,
    description: 'Flat Rs 500 off on orders above Rs 3000',
    status: 'active',
  },
  NEWUSER25: {
    code: 'NEWUSER25',
    type: 'percentage',
    value: 25,
    min_cart_value: 800,
    description: '25% off for new users',
    status: 'active',
  },
});

class CouponService {
  normalizeCouponCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  calculateCartSubtotal(cart) {
    return (cart?.items || []).reduce((sum, item) => {
      const price = Number(item?.priceSnapshot || 0);
      const quantity = Number(item?.quantity || 0);
      return sum + (price * quantity);
    }, 0);
  }

  async resolveCouponByCode(code) {
    const normalizedCode = this.normalizeCouponCode(code);

    if (!normalizedCode) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
    }

    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (coupon) {
      return { coupon, source: 'database' };
    }

    const mockCoupon = MOCK_COUPONS[normalizedCode];
    if (mockCoupon) {
      return { coupon: mockCoupon, source: 'mock' };
    }

    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  serializeAppliedCoupon(coupon, source, discount = 0, finalTotal = 0) {
    const value = Number(coupon?.value || 0);
    const minCartValue = Number(coupon?.min_cart_value || 0);
    const description = coupon?.description
      || (coupon?.type === 'percentage'
        ? `${value}% OFF`
        : coupon?.type === 'flat'
          ? `Rs ${value} OFF`
          : 'Special offer');

    return {
      couponId: source === 'database' && coupon?._id ? coupon._id : null,
      code: coupon?.code || null,
      type: coupon?.type || null,
      value,
      min_cart_value: minCartValue,
      description,
      discount_amount: Number(discount || 0),
      final_total: Number(finalTotal || 0),
      source,
    };
  }

  async createCoupon(couponData) {
    this._validateCouponData(couponData);
    const existing = await Coupon.findOne({ code: couponData.code });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');

    const coupon = new Coupon(couponData);
    await coupon.save();
    await cacheInvalidationService.invalidateCoupons(this.normalizeCouponCode(coupon.code));
    return coupon;
  }

  async getCouponById(id) {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    return coupon;
  }

  async getCouponByCode(code) {
    const { coupon } = await this.resolveCouponByCode(code);
    return coupon;
  }

  async getAllCoupons(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const perPage = Math.max(parseInt(params.per_page || params.limit, 10) || 20, 1);
    const { status, type, search } = params;
    const skip = (page - 1) * perPage;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) query.code = { $regex: search, $options: 'i' };

    const coupons = await Coupon.find(query).sort({ created_at: -1 }).skip(skip).limit(perPage).lean();
    const total = await Coupon.countDocuments(query);

    // Calculate Global Stats
    const [totalCount, activeCount, expiredCount, totalUsageResult] = await Promise.all([
      Coupon.countDocuments({}),
      Coupon.countDocuments({ status: 'active' }),
      Coupon.countDocuments({ expires_at: { $lt: new Date() } }),
      Coupon.aggregate([
        { $group: { _id: null, totalUsage: { $sum: '$used_count' } } }
      ])
    ]);

    const totalUsage = totalUsageResult.length > 0 ? totalUsageResult[0].totalUsage : 0;

    return {
      coupons,
      stats: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        totalUsage
      },
      pagination: {
        page,
        perPage,
        limit: perPage,
        total,
        totalPages: Math.max(Math.ceil(total / perPage), 1)
      }
    };
  }

  async updateCoupon(id, updateData) {
    const coupon = await Coupon.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    await cacheInvalidationService.invalidateCoupons(this.normalizeCouponCode(coupon.code));
    return coupon;
  }

  async deleteCoupon(id) {
    const result = await Coupon.findByIdAndDelete(id);
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    await cacheInvalidationService.invalidateCoupons(this.normalizeCouponCode(result.code));
    return { id, deleted: true };
  }

  async getCouponValidationPreview(code) {
    const normalizedCode = this.normalizeCouponCode(code);
    const cacheKey = cacheKeys.couponValidationKey({ code: normalizedCode });

    return cacheService.getOrSet(cacheKey, config.cache.couponTtlSeconds, async () => {
      const { coupon } = await this.resolveCouponByCode(normalizedCode);

      if (coupon.status !== 'active') {
        return {
          valid: false,
          code: coupon.code,
          message: 'This coupon is not active',
        };
      }

      const now = new Date();
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return {
          valid: false,
          code: coupon.code,
          message: 'This coupon has expired',
        };
      }

      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return {
          valid: false,
          code: coupon.code,
          message: 'This coupon is not yet active',
        };
      }

      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return {
          valid: false,
          code: coupon.code,
          message: 'This coupon has reached its usage limit',
        };
      }

      return {
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          min_cart_value: coupon.min_cart_value ? Number(coupon.min_cart_value) : null,
          max_discount: coupon.max_discount ? Number(coupon.max_discount) : null,
          description: `${coupon.type === 'percentage' ? coupon.value + '% OFF' : coupon.type === 'flat' ? 'Rs ' + coupon.value + ' OFF' : coupon.type === 'free_shipping' ? 'Free Shipping' : 'BOGO Offer'}`,
        },
        message: 'Coupon is valid',
      };
    });
  }

  async validateAndApplyCoupon(couponCode, cartData, userId = null) {
    const { coupon, source } = await this.resolveCouponByCode(couponCode);
    if (coupon.status !== 'active') throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not active');

    const now = new Date();
    if (coupon.expires_at && coupon.expires_at < now) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon has expired');
    if (coupon.starts_at && coupon.starts_at > now) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not yet active');
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached');

    const cartTotal = cartData.subtotal || 0;
    if (coupon.min_cart_value && cartTotal < coupon.min_cart_value) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Minimum cart value of Rs ${coupon.min_cart_value} required`);
    }

    const discount = this._calculateDiscount(coupon, cartData);
    return { coupon, discount, finalTotal: Math.max(0, cartTotal - discount), source };
  }

  _calculateDiscount(coupon, cartData) {
    const cartTotal = cartData.subtotal || 0;
    let discount = 0;
    switch (coupon.type) {
      case 'percentage':
        discount = (cartTotal * coupon.value) / 100;
        if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
        break;
      case 'flat':
        discount = Math.min(coupon.value, cartTotal);
        break;
      case 'free_shipping':
        discount = cartData.shipping_cost || 0;
        break;
      default:
        discount = 0;
    }
    return Math.round(discount * 100) / 100;
  }

  async applyCouponToCart(cartId, couponCode, userId = null) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
    }

    const subtotal = this.calculateCartSubtotal(cart);
    const { coupon, discount, finalTotal, source } = await this.validateAndApplyCoupon(
      couponCode,
      { subtotal },
      userId
    );

    cart.appliedCoupon = this.serializeAppliedCoupon(coupon, source, discount, finalTotal);
    await cart.save();

    if (source === 'database' && coupon?._id) {
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { used_count: 1 } });
      await cacheInvalidationService.invalidateCoupons(this.normalizeCouponCode(coupon.code));
    }

    return {
      success: true,
      coupon: cart.appliedCoupon,
      discount_amount: discount,
      finalTotal,
    };
  }

  async removeCouponFromCart(cartId) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
    }

    cart.appliedCoupon = null;
    await cart.save();

    return { success: true, removed: true };
  }

  async getAppliedCoupon(cartId) {
    const cart = await Cart.findById(cartId).lean();
    if (!cart) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
    }

    return cart.appliedCoupon || null;
  }

  _validateCouponData(data) {
    if (!data.code || data.code.trim().length === 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
    if (!data.value || data.value <= 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon value must be greater than 0');
  }
}

module.exports = new CouponService();
