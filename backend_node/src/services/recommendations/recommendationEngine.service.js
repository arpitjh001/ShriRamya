/**
 * Product Recommendation Engine
 * Provides related products, same category, similar attributes, and top selling recommendations
 */

const { Product, Order, Review } = require('../../models');
const redis = require('../../config/integrations/redis');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const mongoose = require('mongoose');

class RecommendationEngine {
  /**
   * Get recommendations for a product
   * GET /api/v1/products/:id/recommendations
   */
  async getRecommendations(productId, strategy = 'all', limit = 10) {
    const cacheKey = `recommendations:${productId}:${strategy}:${limit}`;

    // Try cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    let recommendations = [];

    switch (strategy) {
      case 'related':
        recommendations = await this._getRelatedProducts(productId, limit);
        break;
      case 'same_category':
        recommendations = await this._getSameCategoryProducts(productId, limit);
        break;
      case 'similar_attributes':
        recommendations = await this._getSimilarAttributeProducts(productId, limit);
        break;
      case 'top_selling':
        recommendations = await this._getTopSellingProducts(limit);
        break;
      case 'all':
      default:
        recommendations = await this._getAllRecommendations(productId, limit);
        break;
    }

    const result = {
      productId,
      strategy,
      recommendations,
      count: recommendations.length
    };

    // Cache for 1 hour
    if (redis) {
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(result));
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Get all recommendations (combined strategies)
   */
  async _getAllRecommendations(productId, limit) {
    const product = await Product.findOne({
      $or: [
        { productId: isNaN(productId) ? -1 : Number(productId) },
        { _id: mongoose.Types.ObjectId.isValid(productId) ? productId : new mongoose.Types.ObjectId() },
        { slug: productId }
      ]
    });

    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    // Get recommendations from different strategies with scores
    const scoredProducts = new Map();

    // Same category (score: 3)
    const sameCategory = await this._getSameCategoryProducts(product.productId || product._id, limit * 2);
    for (const prod of sameCategory) {
      scoredProducts.set(prod.id.toString(), { ...prod, score: 3, reason: 'Same category' });
    }

    // Similar attributes (score: 2)
    const similarAttrs = await this._getSimilarAttributeProducts(product.productId || product._id, limit * 2);
    for (const prod of similarAttrs) {
      const id = prod.id.toString();
      if (scoredProducts.has(id)) {
        scoredProducts.get(id).score += 2;
        scoredProducts.get(id).reason += ', Similar attributes';
      } else {
        scoredProducts.set(id, { ...prod, score: 2, reason: 'Similar attributes' });
      }
    }

    // Similar price range (score: 1)
    const price = product.price || product.basePrice || 0;
    const similarPrice = await this._getSimilarPriceProducts(price, limit * 2);
    for (const prod of similarPrice) {
      const id = prod.id.toString();
      if (id === product._id.toString() || id === (product.productId && product.productId.toString())) continue;
      if (scoredProducts.has(id)) {
        scoredProducts.get(id).score += 1;
        scoredProducts.get(id).reason += ', Similar price';
      } else {
        scoredProducts.set(id, { ...prod, score: 1, reason: 'Similar price' });
      }
    }

    // Convert to array, sort by score, exclude original product
    const recommendations = Array.from(scoredProducts.values())
      .filter(p => p.id.toString() !== product._id.toString() && p.id.toString() !== (product.productId && product.productId.toString()))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Get products from the same category
   */
  async _getSameCategoryProducts(productId, limit) {
    const product = await Product.findOne({
      $or: [
        { productId: isNaN(productId) ? -1 : Number(productId) },
        { _id: mongoose.Types.ObjectId.isValid(productId) ? productId : new mongoose.Types.ObjectId() }
      ]
    });

    if (!product) return [];

    const filter = {
      _id: { $ne: product._id },
      status: { $in: ['published', 'publish'] }
    };

    if (product.categorySlug) {
      filter.categorySlug = product.categorySlug;
    } else if (product.categoryName) {
      filter.categoryName = product.categoryName;
    } else {
      return [];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return products.map(p => this._formatRecommendation(p));
  }

  /**
   * Get products with similar attributes
   */
  async _getSimilarAttributeProducts(productId, limit) {
    const product = await Product.findOne({
      $or: [
        { productId: isNaN(productId) ? -1 : Number(productId) },
        { _id: mongoose.Types.ObjectId.isValid(productId) ? productId : new mongoose.Types.ObjectId() }
      ]
    });

    if (!product) return [];

    const searchTerms = [];
    if (product.fabric) searchTerms.push(product.fabric);
    if (product.occasion) searchTerms.push(product.occasion);
    if (product.brand) searchTerms.push(product.brand);
    if (product.work) searchTerms.push(product.work);

    if (searchTerms.length === 0) return [];

    const filter = {
      _id: { $ne: product._id },
      status: { $in: ['published', 'publish'] },
      $or: [
        { fabric: { $in: searchTerms } },
        { occasion: { $in: searchTerms } },
        { brand: { $in: searchTerms } },
        { work: { $in: searchTerms } },
        { tags: { $in: searchTerms } }
      ]
    };

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return products.map(p => this._formatRecommendation(p));
  }

  /**
   * Get products with similar price
   */
  async _getSimilarPriceProducts(basePrice, limit) {
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      return [];
    }
    
    const minPrice = basePrice * 0.8; // ±20%
    const maxPrice = basePrice * 1.2;

    const products = await Product.find({
      price: { $gte: minPrice, $lte: maxPrice },
      status: { $in: ['published', 'publish'] }
    })
    .sort({ price: 1 })
    .limit(limit);

    return products.map(p => this._formatRecommendation(p));
  }

  /**
   * Get top selling products
   */
  async _getTopSellingProducts(limit) {
    // In a real production system, this would come from a pre-computed analytics collection
    // For now, we aggregate orders or just return featured/new products
    const products = await Product.find({
      status: { $in: ['published', 'publish'] }
    })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit);

    return products.map(p => ({
      ...this._formatRecommendation(p),
      totalSold: p.stock < 50 ? 50 - p.stock : 0 // Mocking sales based on stock for now
    }));
  }

  /**
   * Get related products (based on multiple factors)
   */
  async _getRelatedProducts(productId, limit) {
    return this._getAllRecommendations(productId, limit);
  }

  /**
   * Get personalized recommendations for a user
   * Based on browsing/purchase history
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    const cacheKey = `recommendations:user:${userId}:${limit}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    // Get user's recent orders
    const orders = await Order.find({ userId: userId.toString() })
      .sort({ createdAt: -1 })
      .limit(5);

    if (orders.length === 0) {
      // Fallback to top selling
      return {
        userId,
        recommendations: await this._getTopSellingProducts(limit),
        basedOn: []
      };
    }

    const purchasedProductIds = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        purchasedProductIds.push(item.productId);
      });
    });

    const uniqueProductIds = [...new Set(purchasedProductIds)];

    // Get recommendations based on one of the products
    const recommendations = await this._getSameCategoryProducts(uniqueProductIds[0], limit);

    const result = {
      userId,
      recommendations,
      basedOn: uniqueProductIds
    };

    if (redis) {
      try {
        await redis.setex(cacheKey, 1800, JSON.stringify(result)); // 30 minutes
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Clear recommendations cache for a product
   */
  async clearCache(productId) {
    if (redis) {
      try {
        const keys = await redis.keys(`recommendations:${productId}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        console.error('Redis cache clear error:', err.message);
      }
    }
  }

  /**
   * Format recommendation response
   */
  _formatRecommendation(product) {
    return {
      id: product.productId || product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: Number(product.price || product.basePrice || 0),
      avgRating: product.rating ? parseFloat(product.rating).toFixed(1) : "4.0",
      reviewCount: product.reviewCount || 0,
      image: product.thumbnail || (product.images && product.images[0]) || null
    };
  }
}

module.exports = new RecommendationEngine();
