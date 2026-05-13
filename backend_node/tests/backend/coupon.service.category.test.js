jest.mock('../../src/models', () => ({
  Coupon: {},
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

jest.mock('../../src/utils/cacheKeyBuilder', () => ({
  couponValidationKey: jest.fn(() => 'coupon-validation'),
}));

const mongoose = require('mongoose');
const { Product } = require('../../src/models');
const couponService = require('../../src/services/coupon.service');

const mockProducts = (products) => {
  Product.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(products),
    }),
  });
};

describe('CouponService category eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discounts only cart items inside the coupon categories', async () => {
    const matchingCategoryId = new mongoose.Types.ObjectId('665000000000000000000001');
    const otherCategoryId = new mongoose.Types.ObjectId('665000000000000000000002');
    const matchingProductId = new mongoose.Types.ObjectId('665000000000000000000101');
    const otherProductId = new mongoose.Types.ObjectId('665000000000000000000102');

    mockProducts([
      { _id: matchingProductId, categoryId: matchingCategoryId, categories: [], variants: [] },
      { _id: otherProductId, categoryId: otherCategoryId, categories: [], variants: [] },
    ]);

    const eligibility = await couponService.resolveCartEligibility(
      { applicable_categories: [matchingCategoryId], applicable_products: [] },
      {
        subtotal: 1500,
        items: [
          { productId: matchingProductId, quantity: 1, priceSnapshot: 600 },
          { productId: otherProductId, quantity: 1, priceSnapshot: 900 },
        ],
      }
    );

    expect(eligibility).toMatchObject({
      valid: true,
      restricted: true,
      eligibleSubtotal: 600,
      eligibleItems: 1,
    });
    expect(couponService._calculateDiscount({ type: 'percentage', value: 10 }, { subtotal: 1500 }, eligibility)).toBe(60);
    expect(couponService._calculateDiscount({ type: 'flat', value: 1000 }, { subtotal: 1500 }, eligibility)).toBe(600);
  });

  it('rejects a category coupon when no cart product belongs to that category', async () => {
    const targetCategoryId = new mongoose.Types.ObjectId('665000000000000000000003');
    const otherCategoryId = new mongoose.Types.ObjectId('665000000000000000000004');
    const productId = new mongoose.Types.ObjectId('665000000000000000000103');

    mockProducts([
      { _id: productId, categoryId: otherCategoryId, categories: [], variants: [] },
    ]);

    const eligibility = await couponService.resolveCartEligibility(
      { applicable_categories: [targetCategoryId], applicable_products: [] },
      {
        subtotal: 800,
        items: [{ productId, quantity: 1, priceSnapshot: 800 }],
      }
    );

    expect(eligibility).toMatchObject({
      valid: false,
      restricted: true,
      eligibleSubtotal: 0,
      message: 'This coupon is not applicable to the products in your cart',
    });
  });
});
