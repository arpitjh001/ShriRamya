/**
 * Notification Service
 * Multi-channel notifications: Email, SMS, Push
 */

const { Notification, User } = require('../../models');
const emailService = require('../email/email.service');
const config = require('../../config/config');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

class NotificationService {
    /**
     * Create and send notification
     */
    async createNotification(notificationData) {
        const { recipient, title, message, type, actionUrl, tenantId, metadata } = notificationData;

        // Save to database
        const notification = await Notification.create({
            recipient,
            title,
            message,
            type: type || 'info',
            actionUrl,
            tenantId,
            metadata: metadata || {},
            status: 'unread'
        });

        // Trigger external channels if needed
        if (type === 'order' || type === 'promotion') {
            await this.sendEmailNotification(recipient, title, message, tenantId);
        }

        return notification;
    }

    /**
     * Send email notification (wraps email service)
     */
    async sendEmailNotification(userId, title, message, tenantId) {
        const user = await User.findById(userId);
        if (!user || !user.email) return false;

        return await emailService.sendEmailWithTemplate({
            templateName: 'general_notification',
            recipient: user.email,
            data: {
                title,
                message,
                user_name: user.name || 'User'
            },
            tenantId
        });
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(userId, tenantId, options = {}) {
        const { limit = 20, page = 1 } = options;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({
            recipient: userId,
            tenantId: tenantId
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

        const count = await Notification.countDocuments({
            recipient: userId,
            tenantId: tenantId
        });

        return {
            notifications,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Mark as read
     */
    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { $set: { status: 'read' } },
            { new: true }
        );
    }
}

module.exports = new NotificationService();
