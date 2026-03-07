const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

router.use(apiLimiter);
router.use(auth(['customer', 'admin']));

/**
 * Notification endpoints
 * GET /api/v1/notifications
 */
router.get('/', notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
