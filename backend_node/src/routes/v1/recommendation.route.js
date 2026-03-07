const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const recommendationController = require('../../controllers/recommendation.controller');

const router = express.Router();

router.use(apiLimiter);

/**
 * Recommendation endpoints
 * GET /api/v1/recommendations/:id - Get recommendations for a product
 * GET /api/v1/recommendations/personal - Get personalized recommendations
 */
router.get('/:id', recommendationController.getProductRecommendations);
router.get('/personal', auth(['customer', 'admin']), recommendationController.getPersonalizedRecommendations);
router.delete('/cache/:productId', auth(['admin']), recommendationController.clearRecommendationCache);

module.exports = router;
