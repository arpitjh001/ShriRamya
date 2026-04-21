const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const recommendationController = require('../../controllers/recommendation.controller');

const router = express.Router();

router.use(apiLimiter);

/**
 * Recommendation endpoints
 * NOTE: Specific routes (/personal, /cache/:productId) MUST come BEFORE /:id
 * GET /api/v1/recommendations/personal - Get personalized recommendations
 * DELETE /api/v1/recommendations/cache/:productId - Clear recommendation cache
 * GET /api/v1/recommendations/:id - Get recommendations for a product
 */

// Specific routes first
router.get('/personal', auth(['customer', 'admin']), recommendationController.getPersonalizedRecommendations);
router.delete('/cache/:productId', auth(['admin']), recommendationController.clearRecommendationCache);

// Parameterized route last
router.get('/:id', recommendationController.getProductRecommendations);

module.exports = router;
