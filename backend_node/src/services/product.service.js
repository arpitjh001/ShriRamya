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
    const apiMessage = error.response?.data?.message;
    const errorMessage = apiMessage || error.message || defaultMessage;
    console.error(`[ProductService] ${defaultMessage}:`, errorMessage);
    if (error.response?.data) {
      console.error('[ProductService] API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(errorMessage);
  }

  _transformImages(images) {
    if (!images || !Array.isArray(images)) return [];
    return images.map((img) => {
      let src = typeof img === 'string' ? img : (img.src || '');
      if (!src) return null;

      // Robust Internal Docker Transformation
      // Convert browser-accessible localhost:8080 to container-accessible backend:8000
      if (src.includes('localhost:8080/uploads/')) {
        src = src.replace('localhost:8080/uploads/', 'backend:8000/uploads/');
      } else if (src.includes('127.0.0.1:8080/uploads/')) {
        src = src.replace('127.0.0.1:8080/uploads/', 'backend:8000/uploads/');
      }

      return { src };
    }).filter(Boolean);
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
        regular_price,
        sale_price,
        stock_quantity,
        sku,
        status,
        images,
        categoryId,
        categories,
        fabric,
        occasion,
        care_instructions,
        size_stock,
        color_stock,
        // legacy
        price,
        stock,
        colors: legacyColors,
        sizes: legacySizes,
      } = productData;

      if (!name) throw new Error('Product name is required');

      const finalPrice = regular_price || price;
      if (!finalPrice) throw new Error('Price is required');

      // 1. Data Scrubbing & Validation
      // Sale price must be less than regular price
      let validatedSalePrice = sale_price;
      if (sale_price && parseFloat(sale_price) >= parseFloat(finalPrice)) {
        console.warn(`Sale price (${sale_price}) must be lower than Regular price (${finalPrice}). Ignoring sale price.`);
        validatedSalePrice = '';
      }

      // Filter out empty sizes/colors
      const filteredSizeStock = (size_stock || []).filter(s => s.size && s.size.trim() !== '');
      const filteredColorStock = (color_stock || []).filter(c => c.color && c.color.trim() !== '');

      // Prepare Attributes
      const finalColors = filteredColorStock.length > 0 ? filteredColorStock.map(c => c.color) : (legacyColors || []).filter(v => v);
      const finalSizes = filteredSizeStock.length > 0 ? filteredSizeStock.map(s => s.size) : (legacySizes || []).filter(v => v);

      const attributes = [];
      if (finalColors.length > 0) {
        attributes.push({ name: 'Color', options: finalColors, visible: true, variation: true });
      }
      if (finalSizes.length > 0) {
        attributes.push({ name: 'Size', options: finalSizes, visible: true, variation: true });
      }

      // 2. Prepare Meta Data
      const metaData = [];
      if (fabric) metaData.push({ key: '_fabric', value: fabric });
      if (occasion) metaData.push({ key: '_occasion', value: occasion });
      if (care_instructions) metaData.push({ key: '_care_instructions', value: care_instructions });
      if (filteredSizeStock.length > 0) metaData.push({ key: '_sr_sizes', value: JSON.stringify(filteredSizeStock) });
      if (filteredColorStock.length > 0) metaData.push({ key: '_sr_colors', value: JSON.stringify(filteredColorStock) });

      // 3. Prepare Payload
      const productPayload = {
        name,
        description: description || '',
        type: (attributes.length > 0) ? 'variable' : 'simple',
        status: status || 'publish',
        sku: sku || '',
        regular_price: String(finalPrice),
        sale_price: validatedSalePrice ? String(validatedSalePrice) : '',
        categories: categories && categories.length > 0 ? categories : (categoryId ? [{ id: categoryId }] : []),
        images: this._transformImages(images),
        attributes,
        meta_data: metaData,
      };

      console.log('Sending payload to WooCommerce:', JSON.stringify(productPayload, null, 2));
      const productResponse = await wcClient.post('/products', productPayload);
      const createdProduct = productResponse.data;

      // 4. Create Variations if variable
      if (productPayload.type === 'variable') {
        const variations = [];

        // Use combinations
        if (finalColors.length > 0 && finalSizes.length > 0) {
          for (const color of finalColors) {
            for (const size of finalSizes) {
              const matchedSize = filteredSizeStock?.find(s => s.size === size);
              const matchedColor = filteredColorStock?.find(c => c.color === color);

              variations.push({
                regular_price: String(finalPrice),
                manage_stock: true,
                stock_quantity: (matchedSize?.qty || 0) + (matchedColor?.qty || 0) || (stock_quantity || stock || 0),
                attributes: [
                  { name: 'Color', option: color },
                  { name: 'Size', option: size },
                ],
              });
            }
          }
        } else if (finalColors.length > 0) {
          for (const color of finalColors) {
            const matched = filteredColorStock?.find(c => c.color === color);
            variations.push({
              regular_price: String(finalPrice),
              manage_stock: true,
              stock_quantity: matched?.qty || stock_quantity || stock || 0,
              attributes: [{ name: 'Color', option: color }],
            });
          }
        } else if (finalSizes.length > 0) {
          for (const size of finalSizes) {
            const matched = filteredSizeStock?.find(s => s.size === size);
            variations.push({
              regular_price: String(finalPrice),
              manage_stock: true,
              stock_quantity: matched?.qty || stock_quantity || stock || 0,
              attributes: [{ name: 'Size', option: size }],
            });
          }
        }

        if (variations.length > 0) {
          console.log(`Processing ${variations.length} variations sequentially for product ID ${createdProduct.id}...`);
          for (let i = 0; i < variations.length; i++) {
            console.log(`Creating variation ${i + 1}/${variations.length}...`);
            await wcClient.post(`/products/${createdProduct.id}/variations`, variations[i]);
          }
          console.log('All variations created.');
        }
      }

      this.cache.flushAll();
      return createdProduct;
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
        regular_price,
        sale_price,
        stock,
        stock_quantity,
        sku,
        status,
        categoryId,
        categories,
        images,
        fabric,
        occasion,
        care_instructions,
        size_stock,
        color_stock,
      } = updateData;

      // 1️⃣ Prepare Parent Product Payload
      const updatePayload = {};

      if (name !== undefined) updatePayload.name = name;
      if (description !== undefined) updatePayload.description = description;
      if (sku !== undefined) updatePayload.sku = sku;
      if (status !== undefined) updatePayload.status = status;
      if (categories !== undefined) updatePayload.categories = categories;
      else if (categoryId) updatePayload.categories = [{ id: categoryId }];

      if (images) {
        updatePayload.images = this._transformImages(images);
      }

      // Handle Meta Data for Custom Fields
      const metaData = [];
      if (fabric !== undefined) metaData.push({ key: '_fabric', value: fabric });
      if (occasion !== undefined) metaData.push({ key: '_occasion', value: occasion });
      if (care_instructions !== undefined) metaData.push({ key: '_care_instructions', value: care_instructions });
      if (size_stock) metaData.push({ key: '_sr_sizes', value: JSON.stringify(size_stock) });
      if (color_stock) metaData.push({ key: '_sr_colors', value: JSON.stringify(color_stock) });

      if (metaData.length > 0) {
        updatePayload.meta_data = metaData;
      }

      // Update Parent if needed
      if (Object.keys(updatePayload).length > 0) {
        await wcClient.put(`/products/${productId}`, updatePayload);
      }

      // 2️⃣ Update Variations (Price / Stock)
      const newPrice = regular_price || price;
      const newStock = stock_quantity !== undefined ? stock_quantity : stock;

      if (newPrice || newStock !== undefined) {
        const variationResponse = await wcClient.get(
          `/products/${productId}/variations`
        );

        const variations = variationResponse.data;

        if (Array.isArray(variations)) {
          console.log(`Updating ${variations.length} variations sequentially for product ${productId}...`);
          for (const variation of variations) {
            await wcClient.put(
              `/products/${productId}/variations/${variation.id}`,
              {
                regular_price: newPrice ? String(newPrice) : variation.regular_price,
                stock_quantity: newStock !== undefined ? newStock : variation.stock_quantity,
                manage_stock: true,
              }
            );
          }
          console.log('Variations updated.');
        }
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