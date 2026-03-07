const express = require('express');
const auth = require('../../middlewares/auth');
const { reviewLimiter, apiLimiter } = require('../../middlewares/rateLimit.middleware');
const reviewController = require('../../controllers/review.controller');

const router = express.Router();

router.use(apiLimiter);

/**
 * Review endpoints
 * POST /api/v1/products/:id/reviews
 * GET /api/v1/products/:id/reviews
 */
router.post('/products/:id/reviews', auth(['customer', 'admin']), reviewLimiter, reviewController.createReview);
router.get('/products/:id/reviews', reviewController.getProductReviews);
router.get('/users/:userId/reviews', reviewController.getUserReviews);
router.get('/:id', reviewController.getReview);
router.post('/:id/helpful', auth(['customer', 'admin']), reviewLimiter, reviewController.markReviewHelpful);
router.put('/:id/approve', auth(['admin']), reviewController.approveReview);
router.delete('/:id', auth(['customer', 'admin']), reviewController.deleteReview);

module.exports = router;
