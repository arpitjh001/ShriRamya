const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const fraudController = require('../../controllers/fraud.controller');

const router = express.Router();

router.use(apiLimiter);
router.use(auth(['admin']));

/**
 * Fraud detection endpoints (Admin only)
 * GET /api/v1/admin/fraud/flagged-orders
 */
router.get('/flagged-orders', fraudController.getFlaggedOrders);
router.post('/orders/:id/unflag', fraudController.unflagOrder);
router.get('/statistics', fraudController.getFraudStatistics);

module.exports = router;
