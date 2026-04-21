const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Counter = require('../models/counter.model');
const mongoose = require('mongoose');
const crypto = require('crypto');

class ProductMongoRepository {
  async allocateNextProductId() {
    // The production database has a unique `productId_1` index.
    // Native product creation must always set a unique numeric productId.
    const counterId = 'productId';

    // Determine a safe baseline (max existing numeric productId).
    const maxDoc = await Product.findOne({ productId: { $type: 'number' } })
      .sort({ productId: -1 })
      .select({ productId: 1 })
      .lean();

    const baseline = Number(maxDoc?.productId || 0);

    // Atomic: if counter doesn't exist, start from baseline; then increment once and return.
    // If the counter already exists, `$setOnInsert` is ignored and we just increment.
    const updated = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $setOnInsert: { seq: baseline }, $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();

    // Defensive fallback (should not happen, but avoids sending null productId).
    return Number(updated?.seq || (baseline + 1));
  }

  generateFallbackProductId() {
    // Millisecond timestamp * 1000 + random(0..999) stays within JS safe integer range.
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  buildProductQuery(identifier, tenantId = null) {
    const query = {};
    const stringIdentifier = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      query._id = stringIdentifier;
    } else if (/^\d+$/.test(stringIdentifier)) {
      query.productId = Number(stringIdentifier);
    } else {
      query.slug = stringIdentifier;
    }

    if (tenantId !== null && tenantId !== undefined) {
      query.tenant_id = tenantId;
    }

    return query;
  }

  normalizeCategoryIdentifier(identifier) {
    if (identifier == null) return identifier;
    const stringIdentifier = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      return new mongoose.Types.ObjectId(stringIdentifier);
    }
    if (/^\d+$/.test(stringIdentifier)) {
      return Number(stringIdentifier);
    }
    return stringIdentifier;
  }

  generateSlug(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  }

  async generateUniqueSlug(baseSlug, productId = null) {
    let slug = baseSlug;
    let suffix = '';
    let attempts = 0;
    while (attempts < 10) {
      const checkSlug = slug + (suffix ? `-${suffix}` : '');
      const existing = await Product.findOne({ slug: checkSlug, _id: { $ne: productId } });
      if (!existing) return checkSlug;
      suffix = Math.floor(1000 + Math.random() * 9000);
      attempts++;
    }
    return `${slug}-${Date.now()}`;
  }

  hashAttributes(attrs) {
    if (!attrs || typeof attrs !== 'object') return '';
    const normalized = Object.keys(attrs).sort().reduce((acc, key) => {
      acc[key.toLowerCase()] = String(attrs[key]).toLowerCase();
      return acc;
    }, {});
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  async createProduct(data, tenantId = 1) {
    let slug = data.slug || this.generateSlug(data.name);
    data.slug = await this.generateUniqueSlug(slug);
    data.tenant_id = tenantId;

    // Ensure a unique numeric productId for environments with a unique index on `productId`.
    if (data.productId == null) {
      try {
        data.productId = await this.allocateNextProductId();
      } catch (error) {
        // If counters are unavailable for any reason, still avoid null productId collisions.
        data.productId = this.generateFallbackProductId();
      }
    }

    const product = new Product(data);
    await product.save();
    return product._id;
  }

  async getProduct(id, tenantId = 1) {
    return await Product.findOne({
      ...this.buildProductQuery(id, tenantId),
      is_deleted: { $ne: true },
    }).populate('categories');
  }

  async listProducts(filter = {}, options = {}, tenantId = 1) {
    const skip = (options.page - 1) * options.perPage;
    const limit = options.perPage;
    
    const query = { tenant_id: tenantId, is_deleted: { $ne: true } };
    if (filter.status) query.status = filter.status;
    if (filter.category_id) {
      const normalizedCategoryId = this.normalizeCategoryIdentifier(filter.category_id);
      query.$or = [{ categoryId: normalizedCategoryId }, { categories: normalizedCategoryId }];
    }
    
    const products = await Product.find(query).populate('categories').skip(skip).limit(limit).sort({ created_at: -1 });
    const total = await Product.countDocuments(query);
    
    return { products, total, page: options.page, perPage: options.perPage };
  }

  async updateProduct(id, data, tenantId = 1) {
    const product = await Product.findOne(this.buildProductQuery(id, tenantId));
    if (!product) {
      return false;
    }

    if (data.name && !data.slug) {
      data.slug = await this.generateUniqueSlug(this.generateSlug(data.name), id);
    }

    product.set(data);
    await product.save();
    return true;
  }

  async deleteProduct(id, tenantId = 1) {
    const result = await Product.deleteOne(
      this.buildProductQuery(id, tenantId)
    );
    return result.deletedCount > 0;
  }

  async addVariant(productId, variantData) {
    const product = await Product.findOne(this.buildProductQuery(productId));
    if (!product) throw new Error('Product not found');

    variantData.attributes_hash = this.hashAttributes(variantData.attributes);
    product.variants.push(variantData);
    await product.save();
    return product.variants[product.variants.length - 1]._id;
  }

  async getVariantById(productId, variantId) {
    const product = await Product.findOne(this.buildProductQuery(productId));
    if (!product) return null;
    return product.variants.id(variantId);
  }

  async updateVariant(productId, variantId, variantData) {
    const product = await Product.findOne(this.buildProductQuery(productId));
    if (!product) throw new Error('Product not found');
    const variant = product.variants.id(variantId);
    if (!variant) throw new Error('Variant not found');

    Object.assign(variant, variantData);
    variant.attributes_hash = this.hashAttributes(variant.attributes);
    await product.save();
    return variant;
  }

  async deleteVariant(productId, variantId) {
    const product = await Product.findOne(this.buildProductQuery(productId));
    if (!product) return false;
    product.variants.pull(variantId);
    await product.save();
    return true;
  }

  async assignCategoriesToProduct(productId, categoryIds, tenantId = 1) {
    const normalizedCategoryIds = categoryIds.map((categoryId) => this.normalizeCategoryIdentifier(categoryId)).filter(Boolean);
    const product = await Product.findOne(this.buildProductQuery(productId, tenantId));
    if (!product) {
      throw new Error('Product not found');
    }

    product.categories = normalizedCategoryIds;
    product.categoryId = normalizedCategoryIds[0] || null;
    await product.save();

    return product.populate('categories');
  }

  async getProductCategories(productId, tenantId = 1) {
    const product = await Product.findOne(this.buildProductQuery(productId, tenantId)).populate('categories');
    if (!product) {
      throw new Error('Product not found');
    }

    return product.categories || [];
  }

  async removeCategoryFromProduct(productId, categoryId, tenantId = 1) {
    const normalizedCategoryId = this.normalizeCategoryIdentifier(categoryId);
    const product = await Product.findOne(this.buildProductQuery(productId, tenantId));
    if (!product) {
      throw new Error('Product not found');
    }

    const nextCategories = (product.categories || [])
      .map((entry) => entry?.toString())
      .filter((entry) => entry !== normalizedCategoryId?.toString());

    if (nextCategories.length === (product.categories || []).length) {
      return false;
    }

    product.categories = nextCategories.map((entry) => this.normalizeCategoryIdentifier(entry));
    product.categoryId = product.categories[0] || null;
    await product.save();
    return true;
  }

  /**
   * Atomic stock decrement for a specific variant
   * @param {string} productId - Product ID/Slug
   * @param {string} variantId - Specific Variant ID
   * @param {number} quantity - Quantity to decrement (usually positive)
   * @returns {Promise<boolean>} Success status
   */
  async decrementStock(productId, variantId, quantity) {
    const prodId = this.normalizeCategoryIdentifier(productId);
    const varId = this.normalizeCategoryIdentifier(variantId);

    const result = await Product.updateOne(
      { 
        _id: prodId, 
        variants: {
          $elemMatch: {
            _id: varId,
            stock: { $gte: quantity }
          }
        }
      },
      { $inc: { 'variants.$.stock': -quantity } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Atomic stock increment (restock) for a specific variant
   * @param {string|ObjectId} productId
   * @param {string|ObjectId} variantId
   * @param {number} quantity
   */
  async incrementStock(productId, variantId, quantity) {
    const prodId = this.normalizeCategoryIdentifier(productId);
    const varId = this.normalizeCategoryIdentifier(variantId);

    const result = await Product.updateOne(
      { _id: prodId, 'variants._id': varId },
      { $inc: { 'variants.$.stock': quantity } }
    );

    return result.modifiedCount > 0;
  }
}

module.exports = new ProductMongoRepository();
