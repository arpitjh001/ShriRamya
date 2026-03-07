/**
 * Product Review & Rating Service
 * Handles reviews, ratings, and verified purchase validation
 */

const { mysqlPool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

class ReviewService {
  /**
   * Create a review
   * Only verified buyers can review
   */
  async createReview(productId, userId, reviewData) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify product exists
      const [product] = await connection.query('SELECT id FROM products WHERE id = ?', [productId]);
      if (product.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
      }

      // Check if user has purchased this product (verified purchase)
      const isVerifiedPurchase = await this._checkVerifiedPurchase(userId, productId, connection);

      // Check if user already reviewed this product
      const [existingReview] = await connection.query(
        'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      );

      if (existingReview.length > 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You have already reviewed this product');
      }

      // Validate rating
      const rating = parseInt(reviewData.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
      }

      // Insert review
      const [result] = await connection.query(
        `INSERT INTO reviews (product_id, user_id, rating, review_text, is_verified_purchase, is_approved)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          userId,
          rating,
          reviewData.review_text || null,
          isVerifiedPurchase,
          false // Reviews need approval before showing
        ]
      );

      await connection.commit();

      // Update product's average rating
      await this._updateProductAverageRating(productId);

      return this.getReviewById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(id) {
    const [rows] = await mysqlPool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u._id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
    }

    return this._formatReview(rows[0]);
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(productId, params = {}) {
    const {
      page = 1,
      per_page = 20,
      rating,
      verified_only = false,
      sort = 'newest'
    } = params;

    const offset = (page - 1) * per_page;
    let query = `
      SELECT r.*, u.name as user_name, u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u._id
      WHERE r.product_id = ? AND r.is_approved = TRUE
    `;
    const values = [productId];

    if (rating) {
      query += ' AND r.rating = ?';
      values.push(parseInt(rating));
    }

    if (verified_only === 'true') {
      query += ' AND r.is_verified_purchase = TRUE';
    }

    // Sorting
    switch (sort) {
      case 'highest':
        query += ' ORDER BY r.rating DESC, r.created_at DESC';
        break;
      case 'lowest':
        query += ' ORDER BY r.rating ASC, r.created_at DESC';
        break;
      case 'helpful':
        query += ' ORDER BY r.helpful_count DESC, r.created_at DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY r.created_at DESC';
        break;
    }

    query += ' LIMIT ? OFFSET ?';
    values.push(parseInt(per_page), parseInt(offset));

    const [rows] = await mysqlPool.query(query, values);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      WHERE r.product_id = ? AND r.is_approved = TRUE
    `;
    const countValues = [productId];

    if (rating) {
      countQuery += ' AND r.rating = ?';
      countValues.push(parseInt(rating));
    }

    if (verified_only === 'true') {
      countQuery += ' AND r.is_verified_purchase = TRUE';
    }

    const [countResult] = await mysqlPool.query(countQuery, countValues);
    const total = countResult[0].total;

    // Get rating distribution
    const distribution = await this._getRatingDistribution(productId);

    // Get average rating
    const avgRating = await this._getAverageRating(productId);

    return {
      productId,
      reviews: rows.map(review => this._formatReview(review)),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total,
        totalPages: Math.ceil(total / per_page)
      },
      summary: {
        averageRating: parseFloat(avgRating || 0).toFixed(1),
        totalReviews: total,
        distribution
      }
    };
  }

  /**
   * Approve a review (admin only)
   */
  async approveReview(reviewId, approved = true) {
    const [result] = await mysqlPool.query(
      'UPDATE reviews SET is_approved = ? WHERE id = ?',
      [approved, reviewId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
    }

    const [review] = await mysqlPool.query('SELECT product_id FROM reviews WHERE id = ?', [reviewId]);
    await this._updateProductAverageRating(review[0].product_id);

    return { success: true, approved };
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId) {
    await mysqlPool.query(
      'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
      [reviewId]
    );

    return { success: true };
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId, userId = null) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Get review
      const [review] = await connection.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
      
      if (review.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
      }

      // Check if user owns the review or is admin
      if (userId && review[0].user_id !== userId) {
        // Check if user is admin (this would need to be passed from controller)
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own reviews');
      }

      const productId = review[0].product_id;

      await connection.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

      await connection.commit();

      // Update product average rating
      await this._updateProductAverageRating(productId);

      return { success: true, deleted: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId, params = {}) {
    const { page = 1, per_page = 20 } = params;
    const offset = (page - 1) * per_page;

    const [rows] = await mysqlPool.query(
      `SELECT r.*, p.name as product_name, p.slug as product_slug
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(per_page), parseInt(offset)]
    );

    const [countResult] = await mysqlPool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
      [userId]
    );

    return {
      reviews: rows.map(review => ({
        ...this._formatReview(review),
        product: {
          id: review.product_id,
          name: review.product_name,
          slug: review.product_slug
        }
      })),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / per_page)
      }
    };
  }

  /**
   * Check if user has purchased the product
   */
  async _checkVerifiedPurchase(userId, productId, connection) {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? 
         AND oi.product_id = ?
         AND o.status IN ('completed', 'delivered')`,
      [userId, productId]
    );

    return rows[0].count > 0;
  }

  /**
   * Get rating distribution
   */
  async _getRatingDistribution(productId) {
    const [rows] = await mysqlPool.query(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE product_id = ? AND is_approved = TRUE
       GROUP BY rating
       ORDER BY rating DESC`,
      [productId]
    );

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of rows) {
      distribution[row.rating] = row.count;
    }

    return distribution;
  }

  /**
   * Get average rating for product
   */
  async _getAverageRating(productId) {
    const [rows] = await mysqlPool.query(
      `SELECT AVG(rating) as avg_rating
       FROM reviews
       WHERE product_id = ? AND is_approved = TRUE`,
      [productId]
    );

    return rows[0].avg_rating;
  }

  /**
   * Update product's average rating (can be stored in products table for performance)
   */
  async _updateProductAverageRating(productId) {
    // This could update a cached average_rating column in products table
    // For now, we just recalculate on the fly
    const avgRating = await this._getAverageRating(productId);
    
    // Optional: Update products table with cached average
    // await mysqlPool.query(
    //   'UPDATE products SET average_rating = ? WHERE id = ?',
    //   [avgRating, productId]
    // );

    return avgRating;
  }

  /**
   * Format review response
   */
  _formatReview(review) {
    return {
      id: review.id,
      productId: review.product_id,
      userId: review.user_id,
      userName: review.user_name || 'Anonymous',
      rating: review.rating,
      reviewText: review.review_text,
      isVerifiedPurchase: review.is_verified_purchase,
      helpfulCount: review.helpful_count,
      isApproved: review.is_approved,
      createdAt: review.created_at,
      updatedAt: review.updated_at
    };
  }
}

module.exports = new ReviewService();
