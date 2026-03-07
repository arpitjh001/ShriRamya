/**
 * Review Controller
 * Handles product reviews and ratings
 */

const reviewService = require('../services/review/review.service');
const { successResponse } = require('../utils/response');
const httpStatus = require('http-status');

/**
 * Create a review
 * POST /api/v1/products/:id/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const userId = req.user.id;
    const { rating, review_text } = req.body;

    const review = await reviewService.createReview(productId, userId, {
      rating,
      review_text
    });

    return successResponse(res, review, 'Review submitted successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get product reviews
 * GET /api/v1/products/:id/reviews
 */
const getProductReviews = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const result = await reviewService.getProductReviews(productId, req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user reviews
 * GET /api/v1/users/:userId/reviews
 */
const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await reviewService.getUserReviews(userId, req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a review (admin only)
 * PUT /api/v1/reviews/:id/approve
 */
const approveReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved = true } = req.body;
    
    await reviewService.approveReview(id, approved);
    return successResponse(res, { approved }, 'Review approval updated');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark review as helpful
 * POST /api/v1/reviews/:id/helpful
 */
const markReviewHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    await reviewService.markReviewHelpful(id);
    return successResponse(res, { success: true }, 'Marked as helpful');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review
 * DELETE /api/v1/reviews/:id
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await reviewService.deleteReview(id, userId);
    return successResponse(res, { deleted: true }, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get review by ID
 * GET /api/v1/reviews/:id
 */
const getReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await reviewService.getReviewById(id);
    return successResponse(res, review);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getUserReviews,
  approveReview,
  markReviewHelpful,
  deleteReview,
  getReview
};
