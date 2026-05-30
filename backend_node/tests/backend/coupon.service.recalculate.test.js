jest.mock('../../src/models', () => ({
  Coupon: {
    findOne: jest.fn(),
  },
  Cart: {},
  Product: {
    find: jest.fn(),
  },
}));

jest.mock('../../src/config/config', () => ({
  cache: {
    couponTtlSeconds: 60,
  },
}));

jest.mock('../../src/services/cache.service', () => ({
  getOrSet: jest.fn((key, ttl, loader) => loader()),
}));

jest.mock('../../src/services/cacheInvalidation.service', () => ({
  invalidateCoupons: jest.fn(),
}));

const mongoose = require('mongoose');
const { Product, Coupon } = require('../../src/models');
const couponService = require('../../src/services/coupon.service');

const mockProducts = (products) => {
  Product.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(products),
    }),
  });
};

describe('CouponService recalculateAppliedCoupon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recalculates percentage discount correctly when cart items change', async () => {
    const matchingCategoryId = new mongoose.Types.ObjectId('665000000000000000000001');
    const matchingProductId = new mongoose.Types.ObjectId('665000000000000000000101');

    mockProducts([
      { _id: matchingProductId, categoryId: matchingCategoryId, categories: [], variants: [] },
    ]);

    Coupon.findOne.mockResolvedValue({
      code: 'SILK20',
      type: 'percentage',
      value: 20,
      min_cart_value: 1000,
      status: 'active',
      applicable_categories: [matchingCategoryId],
      applicable_products: [],
    });

    const cart = {
      items: [
        { productId: matchingProductId, quantity: 2, priceSnapshot: 600 },
      ],
      appliedCoupon: {
        code: 'SILK20',
        type: 'percentage',
        value: 20,
      },
    };

    // Before recalculation, subtotal is 1200. Expected discount: 20% of 1200 = 240
    await couponService.recalculateAppliedCoupon(cart);

    expect(cart.appliedCoupon).not.toBeNull();
    expect(cart.appliedCoupon.discount_amount).toBe(240);
    expect(cart.appliedCoupon.final_total).toBe(960);
  });

  it('removes applied coupon if min_cart_value condition is no longer met', async () => {
    const matchingCategoryId = new mongoose.Types.ObjectId('665000000000000000000001');
    const matchingProductId = new mongoose.Types.ObjectId('665000000000000000000101');

    mockProducts([
      { _id: matchingProductId, categoryId: matchingCategoryId, categories: [], variants: [] },
    ]);

    Coupon.findOne.mockResolvedValue({
      code: 'SILK20',
      type: 'percentage',
      value: 20,
      min_cart_value: 1000,
      status: 'active',
      applicable_categories: [matchingCategoryId],
      applicable_products: [],
    });

    const cart = {
      items: [
        { productId: matchingProductId, quantity: 1, priceSnapshot: 600 }, // Subtotal 600 < min_cart_value 1000
      ],
      appliedCoupon: {
        code: 'SILK20',
        type: 'percentage',
        value: 20,
      },
    };

    await couponService.recalculateAppliedCoupon(cart);

    // Coupon should be invalidated and set to null
    expect(cart.appliedCoupon).toBeNull();
  });
});
