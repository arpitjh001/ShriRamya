/**
 * Recommendation Controller
 * Handles product recommendations
 */

const recommendationEngine = require('../services/recommendations/recommendationEngine.service');
const { successResponse } = require('../utils/response');

/**
 * Get product recommendations
 * GET /api/v1/products/:product_id/recommendations
 */
const getProductRecommendations = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { strategy = 'all', limit = 10 } = req.query;

    const result = await recommendationEngine.getRecommendations(product_id, strategy, parseInt(limit));
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get personalized recommendations for user
 * GET /api/v1/recommendations/personal
 */
const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    const result = await recommendationEngine.getPersonalizedRecommendations(userId, parseInt(limit));
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Clear recommendation cache (admin only)
 * DELETE /api/v1/recommendations/cache/:productId
 */
const clearRecommendationCache = async (req, res, next) => {
  try {
    const { productId } = req.params;
    await recommendationEngine.clearCache(productId);
    return successResponse(res, { success: true }, 'Recommendation cache cleared');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProductRecommendations,
  getPersonalizedRecommendations,
  clearRecommendationCache
};
