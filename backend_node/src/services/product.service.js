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
   * ---------- GET APIs ----------
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
   * ---------- CREATE ----------
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

      if (!name) throw new Error('Product name is required');
      if (!price || price <= 0) throw new Error('Price must be positive');
      if (!categoryId) throw new Error('categoryId is required');
      if (!Array.isArray(colors) || colors.length === 0)
        throw new Error('At least one color is required');
      if (!Array.isArray(sizes) || sizes.length === 0)
        throw new Error('At least one size is required');

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

  /**
   * ---------- UPDATE (PUT) ----------
   */

  async updateProduct(productId, updateData) {
    try {
      if (!productId) throw new Error('Product ID is required');

      const {
        name,
        description,
        price,
        stock,
        categoryId,
      } = updateData;

      // 1️⃣ Update Parent Product
      const updatePayload = {};

      if (name) updatePayload.name = name;
      if (description) updatePayload.description = description;
      if (categoryId) updatePayload.categories = [{ id: categoryId }];

      if (Object.keys(updatePayload).length > 0) {
        await wcClient.put(`/products/${productId}`, updatePayload);
      }

      // 2️⃣ Update Variations (Price / Stock)
      if (price || stock !== undefined) {
        const variationResponse = await wcClient.get(
          `/products/${productId}/variations`
        );

        const variations = variationResponse.data;

        await Promise.all(
          variations.map((variation) =>
            wcClient.put(
              `/products/${productId}/variations/${variation.id}`,
              {
                regular_price: price
                  ? String(price)
                  : variation.regular_price,
                stock_quantity:
                  stock !== undefined
                    ? stock
                    : variation.stock_quantity,
              }
            )
          )
        );
      }

      this.cache.flushAll();

      return {
        success: true,
        message: 'Product updated successfully',
      };
    } catch (error) {
      this._handleError(error, 'Failed to update product');
    }
  }

  /**
   * ---------- DELETE ----------
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
}

module.exports = new ProductService();