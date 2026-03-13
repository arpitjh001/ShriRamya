/**
 * Product Recommendation Engine
 * Provides related products, same category, similar attributes, and top selling recommendations
 */

const { mysqlPool } = require('../../config/db');
const redis = require('../../config/integrations/redis');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

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
    const [productRows] = await mysqlPool.query(
      'SELECT id, base_price FROM products WHERE id = ?',
      [productId]
    );

    if (productRows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const productData = productRows[0];

    // Get category IDs from the junction table instead of relying on category_id column
    const [categoryRows] = await mysqlPool.query(
      'SELECT category_id FROM product_categories WHERE product_id = ?',
      [productId]
    );

    productData.category_ids = categoryRows.map(row => row.category_id);

    // Get recommendations from different strategies with scores
    const scoredProducts = new Map();

    // Same category (score: 3)
    const sameCategory = await this._getSameCategoryProducts(productId, limit * 2);
    for (const prod of sameCategory) {
      scoredProducts.set(prod.id, { ...prod, score: 3, reason: 'Same category' });
    }

    // Similar attributes (score: 2)
    const similarAttrs = await this._getSimilarAttributeProducts(productId, limit * 2);
    for (const prod of similarAttrs) {
      if (scoredProducts.has(prod.id)) {
        scoredProducts.get(prod.id).score += 2;
        scoredProducts.get(prod.id).reason += ', Similar attributes';
      } else {
        scoredProducts.set(prod.id, { ...prod, score: 2, reason: 'Similar attributes' });
      }
    }

    // Similar price range (score: 1)
    const similarPrice = await this._getSimilarPriceProducts(productData.basePrice, limit * 2);
    for (const prod of similarPrice) {
      if (prod.id === productId) continue;
      if (scoredProducts.has(prod.id)) {
        scoredProducts.get(prod.id).score += 1;
        scoredProducts.get(prod.id).reason += ', Similar price';
      } else {
        scoredProducts.set(prod.id, { ...prod, score: 1, reason: 'Similar price' });
      }
    }

    // Convert to array, sort by score, exclude original product
    const recommendations = Array.from(scoredProducts.values())
      .filter(p => p.id !== productId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Get products from the same category
   */
  async _getSameCategoryProducts(productId, limit) {
    const [rows] = await mysqlPool.query(
      `SELECT DISTINCT p.*, 
              (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating,
              (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as review_count
       FROM products p
       INNER JOIN product_categories pc ON p.id = pc.product_id
       INNER JOIN product_categories pc2 ON pc.category_id = pc2.category_id
       WHERE pc2.product_id = ? 
         AND p.id != ?
         AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [productId, productId, limit]
    );

    return rows.map(row => this._formatRecommendation(row));
  }

  /**
   * Get products with similar attributes
   */
  async _getSimilarAttributeProducts(productId, limit) {
    // Get attributes of the product - handle column name variations
    let variants;
    try {
      [variants] = await mysqlPool.query(
        'SELECT attributes FROM product_variants WHERE product_id = ?',
        [productId]
      );
    } catch (error) {
      // If attributes column doesn't exist, return empty
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return [];
      }
      throw error;
    }

    if (variants.length === 0) {
      return [];
    }

    // Extract unique attribute keys and values
    const attributeKeys = new Set();
    const attributeValues = new Set();

    for (const variant of variants) {
      if (variant.attributes) {
        const attrs = typeof variant.attributes === 'string'
          ? JSON.parse(variant.attributes)
          : variant.attributes;

        for (const [key, value] of Object.entries(attrs)) {
          attributeKeys.add(key);
          attributeValues.add(value);
        }
      }
    }

    if (attributeKeys.size === 0) {
      return [];
    }

    // Build JSON search conditions
    const conditions = [];
    const values = [productId];

    for (const key of attributeKeys) {
      conditions.push(`JSON_SEARCH(si.attribute_names, 'one', ?, NULL, '$.${key}') IS NOT NULL`);
      values.push(key);
    }

    const [rows] = await mysqlPool.query(
      `SELECT DISTINCT p.*, 
              (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating,
              (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as review_count
       FROM products p
       INNER JOIN search_index si ON p.id = si.product_id
       WHERE p.id != ?
         AND p.status = 'published'
         AND (${conditions.join(' OR ')})
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [...values, limit]
    );

    return rows.map(row => this._formatRecommendation(row));
  }

  /**
   * Get products with similar price
   */
  async _getSimilarPriceProducts(basePrice, limit) {
    // Handle null or invalid basePrice
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      return [];
    }
    
    const minPrice = basePrice * 0.8; // ±20%
    const maxPrice = basePrice * 1.2;

    const [rows] = await mysqlPool.query(
      `SELECT p.*, 
              (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating,
              (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as review_count
       FROM products p
       WHERE p.base_price BETWEEN ? AND ?
         AND p.status = 'published'
       ORDER BY ABS(p.base_price - ?) ASC
       LIMIT ?`,
      [minPrice, maxPrice, basePrice, limit]
    );

    return rows.map(row => this._formatRecommendation(row));
  }

  /**
   * Get top selling products
   */
  async _getTopSellingProducts(limit) {
    const [rows] = await mysqlPool.query(
      `SELECT p.*, 
              COUNT(oi.id) as total_sold,
              (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating,
              (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as review_count
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('completed', 'delivered')
       WHERE p.status = 'published'
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      ...this._formatRecommendation(row),
      totalSold: row.total_sold || 0
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

    // Get user's recently viewed/purchased products
    const [purchasedProducts] = await mysqlPool.query(
      `SELECT DISTINCT oi.product_id, COUNT(*) as purchase_count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? AND o.status IN ('completed', 'delivered')
       GROUP BY oi.product_id
       ORDER BY purchase_count DESC
       LIMIT 5`,
      [userId]
    );

    if (purchasedProducts.length === 0) {
      // Fallback to top selling
      return this._getTopSellingProducts(limit);
    }

    const purchasedIds = purchasedProducts.map(p => p.product_id);

    // Get recommendations based on purchased products
    const [rows] = await mysqlPool.query(
      `SELECT DISTINCT p.*, 
              (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating
       FROM products p
       INNER JOIN product_categories pc ON p.id = pc.product_id
       INNER JOIN product_categories pc2 ON pc.category_id = pc2.category_id
       WHERE pc2.product_id IN (?)
         AND p.id NOT IN (?)
         AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [purchasedIds, purchasedIds, limit]
    );

    const result = {
      userId,
      recommendations: rows.map(row => this._formatRecommendation(row)),
      basedOn: purchasedIds
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
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: Number(product.base_price || 0),
      avgRating: product.avg_rating ? parseFloat(product.avg_rating).toFixed(1) : null,
      reviewCount: product.review_count || 0,
      image: product.image || null
    };
  }
}

module.exports = new RecommendationEngine();
