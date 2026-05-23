const express = require('express');
const { auth, requireRole } = require('../../middlewares/authRBAC');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.use(apiLimiter);
router.use(auth);
router.use(requireRole('admin'));

/**
 * Analytics endpoints (Admin only)
 * GET /api/v1/admin/analytics/...
 */
router.get('/overview', analyticsController.getDashboardOverview);
router.get('/visitors', analyticsController.getVisitorAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/products', analyticsController.getProductAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/cart', analyticsController.getCartAnalytics);
router.get('/categories', analyticsController.getCategoryAnalytics);
router.get('/customers', analyticsController.getTopCustomers);
router.get('/search', analyticsController.getSearchAnalytics);
router.get('/visitors/regions', analyticsController.getVisitorRegions);

module.exports = router;
