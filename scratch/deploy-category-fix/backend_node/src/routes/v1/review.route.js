const express = require('express');
const auth = require('../../middlewares/auth');
const { reviewLimiter, apiLimiter } = require('../../middlewares/rateLimit.middleware');
const reviewController = require('../../controllers/review.controller');

const router = express.Router();

router.use(apiLimiter);

/**
 * Review endpoints
 * Specific routes MUST come before parameterized routes
 */

// Product reviews (must come first before /:id)
router.get('/products/:id/reviews', reviewController.getProductReviews);
router.post('/products/:id/reviews', auth(['customer', 'admin']), reviewLimiter, reviewController.createReview);

// User reviews
router.get('/users/:userId/reviews', reviewController.getUserReviews);

// Get review by ID (specific route first)
router.get('/:id', reviewController.getReview);

// Mark review as helpful (must come before /approve to avoid conflicts)
router.post('/:id/helpful', auth(['customer', 'admin']), reviewLimiter, reviewController.markReviewHelpful);

// Approve review (admin only)
router.put('/:id/approve', auth(['admin']), reviewController.approveReview);

// Delete review
router.delete('/:id', auth(['customer', 'admin']), reviewController.deleteReview);

module.exports = router;
