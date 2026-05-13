const mongoose = require('mongoose');
const Product = require('../models/product.model');
const mongoProductRepository = require('../repositories/product.mongo.repository');
const categoryService = require('./category.service');
const searchService = require('./search/search.service');
const cacheInvalidationService = require('./cacheInvalidation.service');

class ProductService {
  normalizeOptionalString(value) {
    if (value == null) return null;
    const normalizedValue = String(value).trim();
    return normalizedValue || '';
  }

  normalizeMaterialGuide(materialGuide) {
    if (!materialGuide || typeof materialGuide !== 'object') {
      return null;
    }

    const description = this.normalizeOptionalString(materialGuide.description);
    const origin = this.normalizeOptionalString(materialGuide.origin);
    const normalizeStringList = (values) => (
      Array.isArray(values)
        ? values
            .map((value) => this.normalizeOptionalString(value))
            .filter(Boolean)
        : []
    );

    const properties = normalizeStringList(materialGuide.properties);
    const care = normalizeStringList(materialGuide.care);

    if (!description && !origin && properties.length === 0 && care.length === 0) {
      return null;
    }

    return {
      description: description || '',
      properties,
      care,
      origin: origin || '',
    };
  }

  normalizeIdentifier(value) {
    if (value == null) return null;
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return value.toString();
    }
    return String(value);
  }

  normalizeProductStatus(status) {
    if (status == null || status === '') return status;

    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus === 'publish') return 'published';
    if (['draft', 'published', 'archived'].includes(normalizedStatus)) {
      return normalizedStatus;
    }

    return status;
  }

  getCloneName(name) {
    const baseName = String(name || 'Untitled product').trim() || 'Untitled product';
    return `${baseName} - cloned`;
  }

  normalizeCloneReference(value) {
    if (!value) return null;
    if (value._id) return this.normalizeIdentifier(value._id);
    if (value.id) return this.normalizeIdentifier(value.id);
    return this.normalizeIdentifier(value);
  }

  buildClonePayload(product) {
    const source = typeof product.toObject === 'function'
      ? product.toObject({ depopulate: true, flattenMaps: true })
      : (product._doc ? { ...product._doc } : { ...product });

    const categories = Array.isArray(source.categories)
      ? source.categories
          .map((category) => this.normalizeCloneReference(category))
          .filter(Boolean)
      : [];

    const subcategoryValues = Array.isArray(source.subcategoryValues)
      ? source.subcategoryValues
          .map((subcategoryValue) => this.normalizeCloneReference(subcategoryValue))
          .filter(Boolean)
      : [];

    const variants = Array.isArray(source.variants)
      ? source.variants.map((variant) => {
          const cloneVariant = variant && typeof variant.toObject === 'function'
            ? variant.toObject({ flattenMaps: true })
            : { ...variant };

          delete cloneVariant._id;
          delete cloneVariant.id;
          delete cloneVariant.image;

          return cloneVariant;
        })
      : [];

    const cloneData = {
      ...source,
      name: this.getCloneName(source.name),
      status: 'draft',
      images: [],
      categories,
      subcategoryValues,
      categoryId: this.normalizeCloneReference(source.categoryId) || categories[0] || null,
      variants,
      rating: 0,
      reviewCount: 0,
      is_deleted: false,
      deleted_at: null,
    };

    delete cloneData._id;
    delete cloneData.id;
    delete cloneData.productId;
    delete cloneData.slug;
    delete cloneData.thumbnail;
    delete cloneData.created_at;
    delete cloneData.updated_at;
    delete cloneData.__v;

    return cloneData;
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
    try {
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

      // If categories already has items, no need for default
      if (productData.categories && productData.categories.length > 0) {
        // Ensure categoryId is also set if missing but categories array has data
        if (!productData.categoryId) {
          productData.categoryId = productData.categories[0];
        }
        return;
      }

      // If categoryId is set but categories array is not, sync them
      if (productData.categoryId && (!productData.categories || productData.categories.length === 0)) {
        productData.categories = [productData.categoryId];
        return;
      }

      // Force tenant_id check
      const tenantId = parseInt(productData.tenant_id || 1, 10);
      
      console.log(`[ProductService] Ensuring default 'Uncategorized' category for tenant: ${tenantId}`);
      const uncategorized = await categoryService.ensureUncategorized(tenantId);
      
      if (!uncategorized || !uncategorized._id) {
        console.error(`[ProductService] Failed to ensure 'Uncategorized' category joined for tenant ${tenantId}`);
        return; // Fallback to avoid breaking creation if possible, though Mongoose might later fail if required
      }

      productData.categories = [uncategorized._id];
      productData.categoryId = uncategorized._id;
      
      console.log(`[ProductService] Default category '${uncategorized.name}' (${uncategorized._id}) assigned.`);
    } catch (error) {
      console.error('[ProductService] _ensureDefaultCategory error:', error);
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
      sku: source.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    const basePrice = Number(
      normalizedProductData.basePrice
        ?? normalizedProductData.base_price
        ?? normalizedProductData.price
        ?? 0
    ) || 0;

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

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'status')) {
      normalizedProductData.status = this.normalizeProductStatus(normalizedProductData.status);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'modelWears')) {
      normalizedProductData.modelWears = this.normalizeOptionalString(normalizedProductData.modelWears);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'modelHeight')) {
      normalizedProductData.modelHeight = this.normalizeOptionalString(normalizedProductData.modelHeight);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'materialGuide')) {
      normalizedProductData.materialGuide = this.normalizeMaterialGuide(normalizedProductData.materialGuide);
    }

    // Normalize lowStockThreshold
    if (Object.prototype.hasOwnProperty.call(normalizedProductData, 'lowStockThreshold')) {
      normalizedProductData.lowStockThreshold = Math.max(0, parseInt(normalizedProductData.lowStockThreshold || 5, 10)) || 5;
    }

    if (Array.isArray(normalizedProductData.variants)) {
      normalizedProductData.variants = normalizedProductData.variants.map((variant) => {
        const normalizedVariant = this.normalizeVariantForPersistence(variant);
        if ((Number(normalizedVariant.price || 0) || 0) <= 0 && basePrice > 0) {
          normalizedVariant.price = basePrice;
        }
        return normalizedVariant;
      });
    }

    return normalizedProductData;
  }

  /**
   * Create a new product with its attributes and optional variants
   */
  async createProduct(productData, tenantId = 1) {
    try {
      console.log(`[ProductService] Initiating creation for product: "${productData.name}" (Tenant: ${tenantId})`);
      
      // 1. Normalize data
      console.log('[ProductService] Step 1: Normalizing product data...');
      productData = this.normalizeProductData(productData);
      
      // 2. Ensure default category
      console.log('[ProductService] Step 2: Ensuring category assignment...');
      await this._ensureDefaultCategory(productData);
      
      // 3. Create in MongoDB
      console.log('[ProductService] Step 3: Saving to MongoDB repository...');
      const productId = await mongoProductRepository.createProduct(productData, tenantId);
      
      if (!productId) {
        throw new Error('MongoDB repository failed to return a product ID after creation');
      }

      // 4. Fetch the created product for background tasks and response
      console.log(`[ProductService] Step 4: Fetching created product (ID: ${productId})...`);
      const product = await mongoProductRepository.getProduct(productId, tenantId);
      
      if (!product) {
        console.warn(`[ProductService] Product ${productId} created but not found immediately after (eventual consistency?)`);
      }

      // 5. Update Search Index (Background task)
      if (product) {
        try {
          console.log('[ProductService] Step 5: Updating search index...');
          await searchService.updateSearchIndex(productId);
        } catch (searchError) {
          console.error('[ProductService] Search index update failed (non-blocking):', searchError.message);
        }
      }
      
      console.log(`[ProductService] Success: Product "${productData.name}" created successfully.`);
      return this.formatProductForResponse(product || { ...productData, _id: productId });
    } catch (error) {
      // Enhanced diagnostic logging for production
      console.error('[ProductService] createProduct CRITICAL FAILURE:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code,
        errors: error.errors ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`) : undefined
      });
      
      throw error;
    }
  }

  async cloneProduct(id, tenantId = 1) {
    try {
      console.log(`[ProductService] Cloning product: ${id} for tenant: ${tenantId}`);
      const sourceProduct = await mongoProductRepository.getProduct(id, tenantId);
      if (!sourceProduct) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      const cloneData = this.buildClonePayload(sourceProduct);
      return await this.createProduct(cloneData, tenantId);
    } catch (error) {
      console.error('[ProductService] cloneProduct failed:', error.message);
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
      
      // Calculate Stats (Global, not just paginated)
      const statsQuery = { tenant_id: tenantId, is_deleted: { $ne: true } };
      if (params.status) statsQuery.status = params.status;
      
      // Use a separate count for stats or an aggregation if we want detailed break down
      // For now, let's get the standard counts
      const [totalCount, publishedCount, draftCount, outOfStockResult] = await Promise.all([
        Product.countDocuments({ tenant_id: tenantId, is_deleted: { $ne: true } }),
        Product.countDocuments({ tenant_id: tenantId, is_deleted: { $ne: true }, status: 'published' }),
        Product.countDocuments({ tenant_id: tenantId, is_deleted: { $ne: true }, status: 'draft' }),
        Product.aggregate([
          { $match: { tenant_id: tenantId, is_deleted: { $ne: true } } },
          {
            $addFields: {
              variantCount: { $size: { $ifNull: ['$variants', []] } },
              totalVariantStock: {
                $sum: {
                  $map: {
                    input: { $ifNull: ['$variants', []] },
                    as: 'variant',
                    in: { $ifNull: ['$$variant.stock', 0] }
                  }
                }
              },
              productStock: { $ifNull: ['$stock', { $ifNull: ['$stock_quantity', 0] }] }
            }
          },
          {
            $addFields: {
              effectiveStock: {
                $cond: [
                  { $gt: ['$variantCount', 0] },
                  '$totalVariantStock',
                  '$productStock'
                ]
              }
            }
          },
          { $match: { effectiveStock: { $lte: 0 } } },
          { $count: 'count' }
        ])
      ]);

      return {
        ...result,
        products: Array.isArray(result.products)
          ? result.products.map((product) => this.formatProductForResponse(product))
          : [],
        stats: {
          total: totalCount,
          published: publishedCount,
          draft: draftCount,
          outOfStock: outOfStockResult[0]?.count || 0
        }
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
      
      // Invalidate caches
      await cacheInvalidationService.invalidateProducts({ id });
      
      return { id: this.normalizeIdentifier(id), deleted: true };
    } catch (error) {
      console.error('[ProductService] deleteProduct failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete multiple products
   */
  async deleteProductsBulk(ids, tenantId = 1) {
    try {
      console.log(`[ProductService] Bulk deleting ${ids.length} products for tenant ${tenantId}`);
      const deletedCount = await mongoProductRepository.deleteProductsBulk(ids, tenantId);
      
      // Invalidate caches
      await cacheInvalidationService.invalidateProducts();
      
      return { deletedCount, ids: ids.map(id => this.normalizeIdentifier(id)) };
    } catch (error) {
      console.error('[ProductService] deleteProductsBulk failed:', error.message);
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

  async decrementStock(productId, variantId, quantity) {
    return await mongoProductRepository.decrementStock(productId, variantId, quantity);
  }

  async incrementStock(productId, variantId, quantity) {
    return await mongoProductRepository.incrementStock(productId, variantId, quantity);
  }
}

module.exports = new ProductService();
