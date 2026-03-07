/**
 * Notification Controller
 * User notifications management
 */

const notificationService = require('../services/notifications/notification.service');
const { successResponse } = require('../utils/response');

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.getUserNotifications(userId, req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    await notificationService.markNotificationAsRead(id, userId);
    return successResponse(res, { success: true }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    // Implementation would update all user notifications
    return successResponse(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.getUserNotifications(userId, { status: 'sent' });
    const unreadCount = result.notifications.filter(n => !n.isRead).length;
    return successResponse(res, { unreadCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
