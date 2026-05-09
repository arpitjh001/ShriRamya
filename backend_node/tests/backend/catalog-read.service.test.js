jest.mock('../../src/models', () => ({
  Product: {},
  Category: {},
}));

jest.mock('../../src/services/product.service', () => ({
  formatProductForResponse: (product) => product,
  normalizeProductStatus: (status) => status || 'published',
}));

jest.mock('../../src/config/config', () => ({
  cache: {
    productListTtlSeconds: 60,
    productDetailTtlSeconds: 60,
    categoryTtlSeconds: 60,
  },
}));

jest.mock('../../src/services/cache.service', () => ({
  getOrSet: jest.fn((key, ttl, loader) => loader()),
  delPattern: jest.fn(),
}));

jest.mock('../../src/utils/cacheKeyBuilder', () => ({
  joinKey: (...parts) => parts.join(':'),
  productListKey: jest.fn(() => 'product-list'),
  productDetailKey: jest.fn(() => 'product-detail'),
  categoryListKey: jest.fn(() => 'category-list'),
  categoryDetailKey: jest.fn(() => 'category-detail'),
}));

const catalogReadService = require('../../src/services/catalog-read.service');

describe('CatalogReadService category filters', () => {
  it('matches category names against product slugs case-insensitively', () => {
    const products = [
      {
        id: 'product-1',
        categoryId: 'category-1',
        categorySlug: 'sarees',
        categoryName: 'Sarees',
        categories: [{ id: 'category-1', slug: 'sarees', name: 'Sarees' }],
      },
      {
        id: 'product-2',
        categoryId: 'category-2',
        categorySlug: 'dupattas',
        categoryName: 'Dupattas',
        categories: [{ id: 'category-2', slug: 'dupattas', name: 'Dupattas' }],
      },
    ];

    const filtered = catalogReadService.filterByCategory(products, ['Sarees']);

    expect(filtered.map((product) => product.id)).toEqual(['product-1']);
  });

  it('builds category metadata from legacy category fields', () => {
    const metadata = catalogReadService.buildFilterMetadata([
      {
        id: 'legacy-product',
        categorySlug: 'unstitched-suits',
        categoryName: 'Unstitched Suits',
        categories: [],
        price: 2500,
      },
    ]);

    expect(metadata.categories).toEqual({
      'unstitched-suits': {
        name: 'Unstitched Suits',
        count: 1,
      },
    });
  });

  it('does not expose raw category ids as visible metadata labels', () => {
    const metadata = catalogReadService.buildFilterMetadata([
      {
        id: 'id-only-product',
        categoryId: '665555555555555555555555',
        categories: [],
        price: 1800,
      },
    ]);

    expect(metadata.categories).toEqual({});
  });
});
