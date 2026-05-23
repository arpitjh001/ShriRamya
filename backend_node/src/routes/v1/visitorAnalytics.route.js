const express = require('express');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.use(apiLimiter);

router.post('/visit', analyticsController.trackVisitor);
router.post('/events', analyticsController.trackEvent);

module.exports = router;
