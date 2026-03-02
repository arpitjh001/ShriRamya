const NodeCache = require('node-cache');
const wcClient = require('../integrations/woocommerce');

class ProductService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  /**
   * ---------- Private Helpers ----------
   */

  _safeStringify(obj = {}) {
    return JSON.stringify(
      Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
          acc[key] = obj[key];
          return acc;
        }, {})
    );
  }

  _handleError(error, defaultMessage) {
    throw new Error(error.response?.data?.message || defaultMessage || error.message);
  }

  /**
   * ---------- Product APIs ----------
   */

  async getAllProducts(params = {}) {
    try {
      const cacheKey = `products_${this._safeStringify(params)}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const response = await wcClient.get('/products', { params });

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch products');
    }
  }

  async getProductById(id) {
    try {
      if (!id) throw new Error('Product ID is required');

      const cacheKey = `product_${id}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const response = await wcClient.get(`/products/${id}`);

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      this._handleError(error, 'Product not found');
    }
  }

  async getCategories(params = {}) {
    try {
      const cacheKey = `categories_${this._safeStringify(params)}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const response = await wcClient.get('/products/categories', { params });

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch categories');
    }
  }

  /**
   * Create Variable Product with Color + Size Variations
   */
  async createProduct(productData) {
    try {
      const {
        name,
        description,
        price,
        stock,
        categoryId,
        colors,
        sizes,
      } = productData;

      // ---------- Validation ----------
      if (!name) throw new Error('Product name is required');
      if (!price || price <= 0) throw new Error('Price must be positive');
      if (!categoryId) throw new Error('categoryId is required');
      if (!Array.isArray(colors) || colors.length === 0)
        throw new Error('At least one color is required');
      if (!Array.isArray(sizes) || sizes.length === 0)
        throw new Error('At least one size is required');

      // ---------- Step 1: Create Variable Product ----------
      const productPayload = {
        name,
        description,
        type: 'variable',
        categories: [{ id: categoryId }],
        attributes: [
          {
            name: 'Color',
            options: colors,
            visible: true,
            variation: true,
          },
          {
            name: 'Size',
            options: sizes,
            visible: true,
            variation: true,
          },
        ],
      };

      const productResponse = await wcClient.post('/products', productPayload);
      const createdProduct = productResponse.data;

      // ---------- Step 2: Create Variations ----------
      const variations = [];

      for (const color of colors) {
        for (const size of sizes) {
          variations.push({
            regular_price: String(price),
            manage_stock: true,
            stock_quantity: stock || 10,
            attributes: [
              { name: 'Color', option: color },
              { name: 'Size', option: size },
            ],
          });
        }
      }

      await Promise.all(
        variations.map((variation) =>
          wcClient.post(`/products/${createdProduct.id}/variations`, variation)
        )
      );

      this.cache.flushAll();

      return {
        success: true,
        message: 'Product created successfully',
        productId: createdProduct.id,
      };
    } catch (error) {
      this._handleError(error, 'Failed to create product');
    }
  }

  async createCategory(categoryData) {
    try {
      if (!categoryData?.name) {
        throw new Error('Category name is required');
      }

      const response = await wcClient.post(
        '/products/categories',
        categoryData
      );

      this.cache.flushAll();

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to create category');
    }
  }

  /**
   * Optional: Delete Product
   */
  async deleteProduct(id) {
    try {
      if (!id) throw new Error('Product ID is required');

      const response = await wcClient.delete(`/products/${id}`, {
        params: { force: true },
      });

      this.cache.flushAll();

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to delete product');
    }
  }
}

module.exports = new ProductService();