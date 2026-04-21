/**
 * Review Management Service
 * Extended review functionality including moderation
 */

import api from './apiClient';

export const reviewService = {
  /**
   * Get review by ID
   */
  getReview(reviewId) {
    return api.get(`/reviews/${reviewId}`);
  },

  /**
   * Get product reviews
   */
  getProductReviews(productId, params = {}) {
    return api.get(`/reviews/products/${productId}/reviews`, { params });
  },

  /**
   * Get user reviews
   */
  getUserReviews(userId, params = {}) {
    return api.get(`/reviews/users/${userId}/reviews`, { params });
  },

  /**
   * Create review
   */
  createReview(productId, reviewData) {
    return api.post(`/reviews/products/${productId}/reviews`, reviewData);
  },

  /**
   * Mark review as helpful
   */
  markAsHelpful(reviewId) {
    return api.post(`/reviews/${reviewId}/helpful`);
  },

  /**
   * Approve review (admin only)
   */
  approveReview(reviewId) {
    return api.put(`/reviews/${reviewId}/approve`, { approved: true });
  },

  /**
   * Reject review (admin only)
   */
  rejectReview(reviewId) {
    return api.put(`/reviews/${reviewId}/approve`, { approved: false });
  },

  /**
   * Delete review
   */
  deleteReview(reviewId) {
    return api.delete(`/reviews/${reviewId}`);
  },
};

export default reviewService;
