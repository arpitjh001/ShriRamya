const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.use(apiLimiter);
router.use(auth(['admin']));

/**
 * Analytics endpoints (Admin only)
 * GET /api/v1/admin/analytics/...
 */
router.get('/overview', analyticsController.getDashboardOverview);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/products', analyticsController.getProductAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);

module.exports = router;
