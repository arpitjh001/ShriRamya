const { Review, Product, Order } = require('../../models');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const mongoose = require('mongoose');

class ReviewService {
  /**
   * Create a review
   */
  async createReview(productId, userId, reviewData) {
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    // Check if user has purchased this product (verified purchase)
    const isVerifiedPurchase = await this._checkVerifiedPurchase(userId, productId);

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You have already reviewed this product');
    }

    // Validate rating
    const rating = parseInt(reviewData.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
    }

    // Insert review
    const review = new Review({
      productId,
      userId,
      rating,
      reviewText: reviewData.review_text,
      isVerifiedPurchase,
      isApproved: false // Reviews need approval before showing
    });
    await review.save();

    return review;
  }

  /**
   * Get review by ID
   */
  async getReviewById(id) {
    const review = await Review.findById(id).populate('userId', 'name email').lean();
    if (!review) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
    }
    return review;
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

    const skip = (page - 1) * per_page;
    const query = { productId, isApproved: true };

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (verified_only === 'true') {
      query.isVerifiedPurchase = true;
    }

    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'highest': sortOption = { rating: -1, created_at: -1 }; break;
      case 'lowest': sortOption = { rating: 1, created_at: -1 }; break;
      case 'helpful': sortOption = { helpfulCount: -1, created_at: -1 }; break;
      case 'newest':
      default: sortOption = { created_at: -1 }; break;
    }

    const reviews = await Review.find(query)
      .populate('userId', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(per_page))
      .lean();

    const total = await Review.countDocuments(query);

    return {
      productId,
      reviews,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total,
        totalPages: Math.ceil(total / per_page)
      }
    };
  }

  /**
   * Approve a review
   */
  async approveReview(reviewId, approved = true) {
    const review = await Review.findByIdAndUpdate(reviewId, { isApproved: approved }, { new: true });
    if (!review) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
    }
    return { success: true, approved };
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId) {
    await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: 1 } });
    return { success: true };
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId) {
    const result = await Review.findByIdAndDelete(reviewId);
    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
    }
    return { success: true, deleted: true };
  }

  /**
   * Check if user has purchased the product
   */
  async _checkVerifiedPurchase(userId, productId) {
    // Assuming Order model has productId in its items
    // Since we're using MongoDB, we can search in the items array
    const order = await Order.findOne({
      userId,
      'items.productId': productId,
      status: { $in: ['completed', 'delivered'] }
    });
    return !!order;
  }
}

module.exports = new ReviewService();
