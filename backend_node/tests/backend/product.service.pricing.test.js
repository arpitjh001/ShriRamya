jest.mock('../../src/repositories/product.mongo.repository', () => ({}));

jest.mock('../../src/services/category.service', () => ({
  ensureUncategorized: jest.fn(),
  getCategoryById: jest.fn(),
}));

jest.mock('../../src/services/search/search.service', () => ({
  updateSearchIndex: jest.fn(),
}));

jest.mock('../../src/services/cacheInvalidation.service', () => ({
  invalidateProducts: jest.fn(),
}));

const productService = require('../../src/services/product.service');

describe('ProductService pricing normalization', () => {
  it('normalizes root discountPrice into persisted salePrice', () => {
    const normalized = productService.normalizeProductData({
      name: 'Heritage Saree',
      basePrice: 2500,
      discountPrice: '1999',
    });

    expect(normalized.salePrice).toBe(1999);
    expect(normalized).not.toHaveProperty('discountPrice');
  });

  it('clears persisted salePrice when the root sale value is empty', () => {
    const normalized = productService.normalizeProductData({
      name: 'Heritage Saree',
      basePrice: 2500,
      salePrice: '',
    });

    expect(normalized.salePrice).toBeNull();
  });

  it('applies root salePrice to variants when a variant has no discountPrice', () => {
    const normalized = productService.normalizeProductData({
      basePrice: 2500,
      salePrice: 1999,
      variants: [
        {
          sku: 'HS-001',
          price: 2500,
          stock: 4,
        },
      ],
    });

    expect(normalized.salePrice).toBe(1999);
    expect(normalized.variants[0]).toMatchObject({
      sku: 'HS-001',
      price: 2500,
      discountPrice: 1999,
      stock: 4,
    });
  });
});
