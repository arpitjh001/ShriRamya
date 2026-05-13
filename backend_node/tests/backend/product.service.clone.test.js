jest.mock('../../src/repositories/product.mongo.repository', () => ({
  getProduct: jest.fn(),
  createProduct: jest.fn(),
}));

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

const mongoProductRepository = require('../../src/repositories/product.mongo.repository');
const productService = require('../../src/services/product.service');

describe('ProductService.cloneProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoProductRepository.createProduct.mockResolvedValue('665000000000000000000099');
  });

  it('creates a draft clone without product or variant image references', async () => {
    const categoryId = '665000000000000000000001';
    const subcategoryValueId = '665000000000000000000002';
    const sourceProduct = {
      toObject: () => ({
        _id: '665000000000000000000010',
        id: '665000000000000000000010',
        productId: 42,
        slug: 'royal-saree',
        name: 'Royal Saree',
        sku: 'RS-001',
        description: 'Original description',
        status: 'published',
        images: ['https://cdn.example.com/product.jpg'],
        thumbnail: 'https://cdn.example.com/thumb.jpg',
        rating: 4.8,
        reviewCount: 12,
        categoryId,
        categories: [{ _id: categoryId, name: 'Sarees' }],
        subcategoryValues: [{ _id: subcategoryValueId }],
        variants: [
          {
            _id: '665000000000000000000020',
            id: '665000000000000000000020',
            sku: 'RS-001',
            price: 1200,
            stock: 5,
            image: 'https://cdn.example.com/variant.jpg',
            attributes: { color: 'Red', size: 'M' },
          },
        ],
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-02T00:00:00.000Z'),
        __v: 0,
      }),
    };
    const createdProduct = {
      _id: '665000000000000000000099',
      name: 'Royal Saree - cloned',
      status: 'draft',
      images: [],
      variants: [],
    };

    mongoProductRepository.getProduct
      .mockResolvedValueOnce(sourceProduct)
      .mockResolvedValueOnce(createdProduct);

    const result = await productService.cloneProduct('665000000000000000000010', 1);

    expect(result.name).toBe('Royal Saree - cloned');
    expect(mongoProductRepository.createProduct).toHaveBeenCalledTimes(1);

    const clonePayload = mongoProductRepository.createProduct.mock.calls[0][0];
    expect(clonePayload.name).toBe('Royal Saree - cloned');
    expect(clonePayload.status).toBe('draft');
    expect(clonePayload.images).toEqual([]);
    expect(clonePayload).not.toHaveProperty('thumbnail');
    expect(clonePayload).not.toHaveProperty('_id');
    expect(clonePayload).not.toHaveProperty('id');
    expect(clonePayload).not.toHaveProperty('productId');
    expect(clonePayload).not.toHaveProperty('slug');
    expect(clonePayload).not.toHaveProperty('created_at');
    expect(clonePayload).not.toHaveProperty('updated_at');
    expect(clonePayload.rating).toBe(0);
    expect(clonePayload.reviewCount).toBe(0);
    expect(clonePayload.categoryId).toBe(categoryId);
    expect(clonePayload.categories).toEqual([categoryId]);
    expect(clonePayload.subcategoryValues).toEqual([subcategoryValueId]);
    expect(clonePayload.variants).toHaveLength(1);
    expect(clonePayload.variants[0]).not.toHaveProperty('_id');
    expect(clonePayload.variants[0]).not.toHaveProperty('id');
    expect(clonePayload.variants[0].image).toBeNull();
  });

  it('throws a not found error when the source product does not exist', async () => {
    mongoProductRepository.getProduct.mockResolvedValueOnce(null);

    await expect(productService.cloneProduct('missing-product', 1)).rejects.toMatchObject({
      message: 'Product not found',
      statusCode: 404,
    });
    expect(mongoProductRepository.createProduct).not.toHaveBeenCalled();
  });
});
