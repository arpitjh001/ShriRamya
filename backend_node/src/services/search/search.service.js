const Product = require('../../models/product.model');
const redis = require('../../config/integrations/redis');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const cacheInvalidationService = require('../cacheInvalidation.service');

class SearchService {
  /**
   * Search products with advanced filters
   */
  async searchProducts(queryParams) {
    const {
      q,
      category,
      color,
      size,
      price_min,
      price_max,
      sort = 'relevance',
      page = 1,
      per_page = 20
    } = queryParams;

    const skip = (page - 1) * per_page;
    const cacheKey = this._buildCacheKey(queryParams);

    // Try cache first
    if (redis && redis.get) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    // Build MongoDB query
    const query = { status: { $in: ['published', 'publish'] }, is_deleted: { $ne: true } };

    if (q) {
      query.$text = { $search: q };
    }

    if (category) {
      query.$or = [
        { categoryId: category },
        { categories: category }
      ];
    }

    if (color) {
      query['variants.attributes.color'] = color;
    }

    if (size) {
      query['variants.attributes.size'] = size;
    }

    if (price_min || price_max) {
      query.basePrice = {};
      if (price_min) query.basePrice.$gte = parseFloat(price_min);
      if (price_max) query.basePrice.$lte = parseFloat(price_max);
    }

    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'price_asc': sortOption = { basePrice: 1 }; break;
      case 'price_desc': sortOption = { basePrice: -1 }; break;
      case 'newest': sortOption = { created_at: -1 }; break;
      case 'relevance':
      default:
        if (q) sortOption = { score: { $meta: 'textScore' } };
        else sortOption = { created_at: -1 };
        break;
    }

    // Execute query
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(per_page))
      .lean();

    const total = await Product.countDocuments(query);

    const result = {
      query: q,
      products: products.map(p => this._formatProductSearchResult(p)),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total,
        totalPages: Math.ceil(total / per_page)
      }
    };

    // Cache result
    if (redis && redis.set) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  async getSuggestions(query, limit = 10) {
    if (!query || query.length < 2) return { suggestions: [] };
    
    // Simple regex search for suggestions
    const products = await Product.find({
      name: { $regex: query, $options: 'i' },
      status: { $in: ['published', 'publish'] }
    }).limit(limit).select('name slug').lean();

    return {
      suggestions: products.map(p => ({
        text: p.name,
        type: 'product',
        slug: p.slug
      }))
    };
  }

  async updateSearchIndex(productId) {
    try {
      await cacheInvalidationService.invalidateProducts({ id: productId });
    } catch (err) {
      console.error(`[SearchService] Failed to clear search cache for product ${productId}:`, err.message);
    }

    return { updated: true, productId };
  }

  _buildCacheKey(params) {
    const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `search:products:${sortedParams}`;
  }

  _formatProductSearchResult(product) {
    return {
      id: product._id,
      name: product.name,
      description: product.description,
      slug: product.slug,
      basePrice: product.basePrice,
      status: product.status,
      inStock: (product.variants || []).some(v => v.stock > 0)
    };
  }
}

module.exports = new SearchService();
