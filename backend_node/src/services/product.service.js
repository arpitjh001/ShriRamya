const mysqlProductRepository = require('../repositories/product.sql.repository');
const categoryService = require('./category.service');
const searchService = require('./search/search.service');

class ProductService {
  toIsoDateOrNull(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  getEffectivePrice(variant) {
    const price = Number(variant.price || 0);
    const discountPrice = variant.discountPrice != null ? Number(variant.discountPrice) : null;

    if (discountPrice == null || Number.isNaN(discountPrice) || discountPrice <= 0 || discountPrice >= price) {
      return price;
    }

    const now = Date.now();
    const start = variant.discountStart ? new Date(variant.discountStart).getTime() : null;
    const end = variant.discountEnd ? new Date(variant.discountEnd).getTime() : null;

    if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) {
      return price;
    }

    const withinStart = start === null || now >= start;
    const withinEnd = end === null || now <= end;

    return withinStart && withinEnd ? discountPrice : price;
  }

  formatVariantForResponse(variant) {
    const normalizedVariant = {
      id: variant.id,
      sku: variant.sku,
      price: Number(variant.price || 0),
      discountPrice: variant.discountPrice != null ? Number(variant.discountPrice) : null,
      discountStart: this.toIsoDateOrNull(variant.discountStart),
      discountEnd: this.toIsoDateOrNull(variant.discountEnd),
      stock: Number(variant.stock || 0),
      attributes: variant.attributes || {},
      image: variant.image || null,
      lowStockThreshold: variant.lowStockThreshold != null ? Number(variant.lowStockThreshold) : 5,
    };

    return {
      ...normalizedVariant,
      effectivePrice: this.getEffectivePrice(normalizedVariant),
    };
  }

  formatProductForResponse(product) {
    if (!product) return product;

    const basePriceValue = product.basePrice ?? product.base_price ?? product.price ?? 0;

    return {
      ...product,
      basePrice: Number(basePriceValue || 0),
      categoryId: product.categoryId ?? product.category_id ?? null,
      categories: product.categories || [],
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => this.formatVariantForResponse(variant))
        : [],
    };
  }

  async _ensureDefaultCategory(productData, isUpdate = false) {
    const hasCategories = Object.prototype.hasOwnProperty.call(productData, 'categories');
    const hasCategoryId = Object.prototype.hasOwnProperty.call(productData, 'categoryId');

    // Normalize categories to array if it's a single value
    if (hasCategories && productData.categories && !Array.isArray(productData.categories)) {
      productData.categories = [productData.categories];
    }

    // If it's an update and no category info is provided (keys missing), don't force Uncategorized
    if (isUpdate && !hasCategories && !hasCategoryId) {
      return;
    }

    // Ensure at least one category exists (Uncategorized) if currently empty
    if ((!productData.categories || productData.categories.length === 0) && !productData.categoryId) {
      let uncategorized = await categoryService.getCategoryBySlug('uncategorized');
      if (!uncategorized) {
        uncategorized = await categoryService.createCategory({ name: 'Uncategorized', slug: 'uncategorized' });
      }
      productData.categories = [uncategorized.id];
    }

    // Ensure categoryId is set for the 'products' table base column if categories array exists
    if (!productData.categoryId && productData.categories && productData.categories.length > 0) {
      productData.categoryId = productData.categories[0];
    }
  }

  /**
   * Create a new product with its attributes and optional variants
   */
  async createProduct(productData, tenantId = 1) {
    try {
      console.log(`[ProductService] Creating native product: ${productData.name} for tenant: ${tenantId}`);
      await this._ensureDefaultCategory(productData);
      const productId = await mysqlProductRepository.createProduct(productData, tenantId);

      // If variants are provided during creation, add them
      if (productData.variants && Array.isArray(productData.variants)) {
        for (const variant of productData.variants) {
          await mysqlProductRepository.addVariant(productId, variant);
        }
      }

      const product = await mysqlProductRepository.getProduct(productId);

      // Update search index
      try {
        await searchService.updateSearchIndex(productId);
      } catch (searchError) {
        console.error(`[ProductService] Failed to update search index for new product ${productId}:`, searchError.message);
      }

      return this.formatProductForResponse(product);
    } catch (error) {
      console.error('[ProductService] createProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Add a single variant to an existing product
   */
  async addVariant(productId, variantData) {
    try {
      console.log(`[ProductService] Adding variant to product ${productId}: ${variantData.sku}`);

      const variantId = await mysqlProductRepository.addVariant(productId, variantData);
      const variant = await mysqlProductRepository.getVariantById(productId, variantId);
      return this.formatVariantForResponse(variant);
    } catch (error) {
      console.error('[ProductService] addVariant failed:', error.message);
      throw error;
    }
  }

  /**
   * Update a single variant for a product
   */
  async updateVariant(productId, variantId, variantData) {
    try {
      console.log(`[ProductService] Updating variant ${variantId} for product ${productId}`);
      const updatedVariant = await mysqlProductRepository.updateVariant(productId, variantId, variantData);
      return this.formatVariantForResponse(updatedVariant);
    } catch (error) {
      console.error('[ProductService] updateVariant failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete a single variant from a product
   */
  async deleteVariant(productId, variantId) {
    try {
      console.log(`[ProductService] Deleting variant ${variantId} for product ${productId}`);
      const deleted = await mysqlProductRepository.deleteVariant(productId, variantId);
      if (!deleted) {
        const error = new Error('Variant not found');
        error.statusCode = 404;
        throw error;
      }
      return { productId: Number(productId), variantId: Number(variantId), deleted: true };
    } catch (error) {
      console.error('[ProductService] deleteVariant failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a single product with full details
   */
  async getProductById(id, tenantId = 1) {
    try {
      const product = await mysqlProductRepository.getProduct(id, tenantId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }
      return this.formatProductForResponse(product);
    } catch (error) {
      console.error('[ProductService] getProductById failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all products with pagination
   */
  async getProducts(params = {}, tenantId = 1) {
    try {
      const options = {
        page: parseInt(params.page || 1, 10),
        perPage: parseInt(params.per_page || 20, 10),
      };
      const result = await mysqlProductRepository.listProducts(params, options, tenantId);
      return {
        ...result,
        products: Array.isArray(result.products)
          ? result.products.map((product) => this.formatProductForResponse(product))
          : [],
      };
    } catch (error) {
      console.error('[ProductService] getProducts failed:', error.message);
      throw error;
    }
  }

  /**
   * Update product, attributes, and variants (full sync)
   */
  async updateProduct(id, updateData, tenantId = 1) {
    try {
      console.log(`[ProductService] Updating native product: ${id} for tenant: ${tenantId}`);
      await this._ensureDefaultCategory(updateData, true);

      const product = await mysqlProductRepository.getProduct(id, tenantId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      // Repository now handles base fields, attributes, AND variants sync in one transaction
      await mysqlProductRepository.updateProduct(id, updateData, tenantId);

      // Update search index
      try {
        await searchService.updateSearchIndex(id);
      } catch (searchError) {
        console.error(`[ProductService] Failed to update search index for product ${id}:`, searchError.message);
      }

      const updatedProduct = await mysqlProductRepository.getProduct(id);
      return this.formatProductForResponse(updatedProduct);
    } catch (error) {
      console.error('[ProductService] updateProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id, tenantId = 1) {
    try {
      const success = await mysqlProductRepository.deleteProduct(id, tenantId);
      if (!success) throw new Error('Product not found or already deleted');
      return { id, deleted: true };
    } catch (error) {
      console.error('[ProductService] deleteProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Bulk add variants (Internal usage)
   */
  async bulkAddVariants(productId, variants) {
    const results = [];
    for (const variant of variants) {
      results.push(await this.addVariant(productId, variant));
    }
    return results;
  }

  /**
   * Assign categories to a product
   */
  async assignCategoriesToProduct(productId, categoryIds) {
    try {
      // Validate that all categories exist
      for (const categoryId of categoryIds) {
        const category = await categoryService.getCategoryById(categoryId);
        if (!category) {
          const error = new Error(`Category with ID ${categoryId} not found`);
          error.statusCode = 404;
          throw error;
        }
      }

      // Assign categories to product
      const result = await mysqlProductRepository.assignCategoriesToProduct(productId, categoryIds);
      return { productId: Number(productId), categoryIds: categoryIds.map(Number), assigned: true };
    } catch (error) {
      console.error('[ProductService] assignCategoriesToProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Get categories assigned to a product
   */
  async getProductCategories(productId) {
    try {
      const categories = await mysqlProductRepository.getProductCategories(productId);
      return categories;
    } catch (error) {
      console.error('[ProductService] getProductCategories failed:', error.message);
      throw error;
    }
  }

  /**
   * Remove a category from a product
   */
  async removeCategoryFromProduct(productId, categoryId) {
    try {
      const result = await mysqlProductRepository.removeCategoryFromProduct(productId, categoryId);
      if (!result) {
        const error = new Error('Category not assigned to product');
        error.statusCode = 404;
        throw error;
      }
      return { productId: Number(productId), categoryId: Number(categoryId), removed: true };
    } catch (error) {
      console.error('[ProductService] removeCategoryFromProduct failed:', error.message);
      throw error;
    }
  }
}

module.exports = new ProductService();
