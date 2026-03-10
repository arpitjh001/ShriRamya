/**
 * Notification Service
 * Handles user notifications
 */

import api from './apiClient';

export const notificationService = {
  /**
   * Get user notifications
   */
  getNotifications(params = {}) {
    return api.get('/notifications', { params });
  },

  /**
   * Get unread count
   */
  getUnreadCount() {
    return api.get('/notifications/unread-count');
  },

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    return api.put(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    return api.put('/notifications/read-all');
  },
};

export default notificationService;
