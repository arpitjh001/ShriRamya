const express = require('express');
const colorController = require('../../controllers/color.controller');
const { auth: authRBAC, requireRole } = require('../../middlewares/authRBAC');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Resolve endpoint - open to public/authenticated
router.post('/resolve', colorController.resolveColor);

// Save manual override endpoint - restricted to Admin and Editor roles
router.post('/override', authRBAC, requireRole('Admin', 'Editor'), colorController.saveManualOverride);

module.exports = router;
