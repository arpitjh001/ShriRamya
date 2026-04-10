const mongoose = require('mongoose');
const mongoProductRepository = require('../repositories/product.mongo.repository');
const categoryService = require('./category.service');
const searchService = require('./search/search.service');

class ProductService {
  normalizeIdentifier(value) {
    if (value == null) return null;
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return value.toString();
    }
    return String(value);
  }

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
    const source = variant && typeof variant.toObject === 'function'
      ? variant.toObject()
      : (variant && variant._doc ? { ...variant._doc } : variant);
    const attributes = source?.attributes instanceof Map
      ? Object.fromEntries(source.attributes.entries())
      : (source?.attributes || {});
    const color = attributes.color || attributes.Color || source?.color || null;
    const size = attributes.size || attributes.Size || source?.size || null;

    const normalizedVariant = {
      id: this.normalizeIdentifier(source?.id || source?._id),
      sku: source?.sku,
      price: Number(source?.price || 0),
      discountPrice: source?.discountPrice != null ? Number(source.discountPrice) : null,
      discountStart: this.toIsoDateOrNull(source?.discountStart),
      discountEnd: this.toIsoDateOrNull(source?.discountEnd),
      stock: Number(source?.stock || 0),
      attributes: {
        ...attributes,
        color,
        size,
        Color: attributes.Color || color || '',
        Size: attributes.Size || size || '',
      },
      image: source?.image || null,
      lowStockThreshold: source?.lowStockThreshold != null ? Number(source.lowStockThreshold) : 5,
      color,
      size,
    };

    return {
      ...normalizedVariant,
      effectivePrice: this.getEffectivePrice(normalizedVariant),
    };
  }

  formatProductForResponse(product) {
    if (!product) return product;

    const source = typeof product.toObject === 'function'
      ? product.toObject({ flattenMaps: true })
      : (product._doc ? { ...product._doc } : { ...product });

    const basePriceValue = source.basePrice ?? source.base_price ?? source.price ?? 0;
    const categoryId = source.categoryId ?? source.category_id ?? null;

    return {
      ...source,
      id: this.normalizeIdentifier(source.id || source._id || source.productId),
      _id: this.normalizeIdentifier(source._id),
      basePrice: Number(basePriceValue || 0),
      categoryId: this.normalizeIdentifier(categoryId),
      categories: source.categories || [],
      variants: Array.isArray(source.variants)
        ? source.variants.map((variant) => this.formatVariantForResponse(variant))
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

  normalizeVariantForPersistence(variant = {}) {
    const source = { ...variant };
    const variantId = source.id || source._id;
    const attributes = source.attributes instanceof Map
      ? Object.fromEntries(source.attributes.entries())
      : { ...(source.attributes || {}) };
    const color = source.color || attributes.color || attributes.Color || '';
    const size = source.size || attributes.size || attributes.Size || '';

    delete source.id;
    delete source._id;
    delete source.stock_quantity;

    const normalizedVariant = {
      ...source,
      sku: source.sku || '',
      price: Number(source.price || 0) || 0,
      discountPrice: source.discountPrice === '' || source.discountPrice == null
        ? null
        : (Number(source.discountPrice) || null),
      stock: Number(source.stock ?? source.stock_quantity ?? 0) || 0,
      lowStockThreshold: Number(source.lowStockThreshold || 5) || 5,
      color,
      size,
      attributes: {
        ...attributes,
        color,
        size,
        Color: attributes.Color || color || '',
        Size: attributes.Size || size || '',
      },
      image: source.image || null,
    };

    if (source.discountStart) {
      normalizedVariant.discountStart = source.discountStart;
    }
    if (source.discountEnd) {
      normalizedVariant.discountEnd = source.discountEnd;
    }

    if (variantId && mongoose.Types.ObjectId.isValid(String(variantId))) {
      normalizedVariant._id = String(variantId);
    }

    return normalizedVariant;
  }

  normalizeProductData(productData = {}) {
    const normalizedProductData = { ...productData };

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'categories')) {
      const categories = Array.isArray(normalizedProductData.categories)
        ? normalizedProductData.categories
        : [normalizedProductData.categories];
      normalizedProductData.categories = categories
        .map((categoryId) => this.normalizeIdentifier(categoryId))
        .filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'categoryId')) {
      normalizedProductData.categoryId = normalizedProductData.categoryId
        ? this.normalizeIdentifier(normalizedProductData.categoryId)
        : null;
    }

    // Normalize lowStockThreshold
    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'lowStockThreshold')) {
      normalizedProductData.lowStockThreshold = Math.max(0, parseInt(normalizedProductData.lowStockThreshold || 5, 10)) || 5;
    }

    if (Array.isArray(normalizedProductData.variants)) {
      normalizedProductData.variants = normalizedProductData.variants.map((variant) => this.normalizeVariantForPersistence(variant));
    }

    return normalizedProductData;
  }

  /**
   * Create a new product with its attributes and optional variants
   */
  async createProduct(productData, tenantId = 1) {
    try {
      console.log(`[ProductService] Creating native product: ${productData.name} for tenant: ${tenantId}`);
      productData = this.normalizeProductData(productData);
      await this._ensureDefaultCategory(productData);
      const productId = await mongoProductRepository.createProduct(productData, tenantId);

      const product = await mongoProductRepository.getProduct(productId, tenantId);

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

      const variantId = await mongoProductRepository.addVariant(productId, this.normalizeVariantForPersistence(variantData));
      const variant = await mongoProductRepository.getVariantById(productId, variantId);
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
      const updatedVariant = await mongoProductRepository.updateVariant(productId, variantId, this.normalizeVariantForPersistence(variantData));
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
      const deleted = await mongoProductRepository.deleteVariant(productId, variantId);
      if (!deleted) {
        const error = new Error('Variant not found');
        error.statusCode = 404;
        throw error;
      }
      return { productId: this.normalizeIdentifier(productId), variantId: this.normalizeIdentifier(variantId), deleted: true };
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
      const product = await mongoProductRepository.getProduct(id, tenantId);
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
      const result = await mongoProductRepository.listProducts(params, options, tenantId);
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
      updateData = this.normalizeProductData(updateData);
      await this._ensureDefaultCategory(updateData, true);

      const product = await mongoProductRepository.getProduct(id, tenantId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      // Repository now handles base fields, attributes, AND variants sync in one transaction
      await mongoProductRepository.updateProduct(id, updateData, tenantId);

      // Update search index
      try {
        await searchService.updateSearchIndex(id);
      } catch (searchError) {
        console.error(`[ProductService] Failed to update search index for product ${id}:`, searchError.message);
      }

      const updatedProduct = await mongoProductRepository.getProduct(id, tenantId);
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
      const success = await mongoProductRepository.deleteProduct(id, tenantId);
      if (!success) throw new Error('Product not found or already deleted');
      return { id: this.normalizeIdentifier(id), deleted: true };
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
  async assignCategoriesToProduct(productId, categoryIds, tenantId = 1) {
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
      await mongoProductRepository.assignCategoriesToProduct(productId, categoryIds, tenantId);
      return { productId: this.normalizeIdentifier(productId), categoryIds: categoryIds.map((id) => this.normalizeIdentifier(id)), assigned: true };
    } catch (error) {
      console.error('[ProductService] assignCategoriesToProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Get categories assigned to a product
   */
  async getProductCategories(productId, tenantId = 1) {
    try {
      const categories = await mongoProductRepository.getProductCategories(productId, tenantId);
      return categories.map((category) => ({
        id: this.normalizeIdentifier(category.id || category._id),
        _id: this.normalizeIdentifier(category._id || category.id),
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || null,
      }));
    } catch (error) {
      console.error('[ProductService] getProductCategories failed:', error.message);
      throw error;
    }
  }

  /**
   * Remove a category from a product
   */
  async removeCategoryFromProduct(productId, categoryId, tenantId = 1) {
    try {
      const result = await mongoProductRepository.removeCategoryFromProduct(productId, categoryId, tenantId);
      if (!result) {
        const error = new Error('Category not assigned to product');
        error.statusCode = 404;
        throw error;
      }
      return { productId: this.normalizeIdentifier(productId), categoryId: this.normalizeIdentifier(categoryId), removed: true };
    } catch (error) {
      console.error('[ProductService] removeCategoryFromProduct failed:', error.message);
      throw error;
    }
  }
}

module.exports = new ProductService();
