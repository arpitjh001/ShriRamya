/**
 * Notification Service
 * Multi-channel notifications: Email, SMS, Push
 */

const { mysqlPool } = require('../../config/db');
const emailService = require('../email/email.service');
const config = require('../../config/config');

class NotificationService {
  /**
   * Send email notification
   */
  async sendEmailNotification(userId, eventType, data) {
    // Get user email (from MongoDB user model or passed in data)
    const email = data.email || await this._getUserEmail(userId);
    
    if (!email) {
      throw new Error('User email not found');
    }

    // Get template
    const [template] = await mysqlPool.query(
      'SELECT * FROM email_templates WHERE event_type = ? AND is_active = TRUE',
      [eventType]
    );

    if (!template || template.length === 0) {
      console.log(`[Notification] Email template not found: ${eventType}`);
      return { success: false, error: 'Template not found' };
    }

    const tmpl = template[0];
    const subject = this._renderTemplateString(tmpl.subject, data);
    const html = this._renderTemplateString(tmpl.body_html, data);
    const text = tmpl.body_text ? this._renderTemplateString(tmpl.body_text, data) : null;

    // Send email
    const result = await emailService.sendEmail(email, subject, html, text);

    // Log notification
    await this._logNotification(userId, 'email', eventType, subject, html, result);

    return result;
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(userId, eventType, data) {
    // Get user phone
    const phone = data.phone || await this._getUserPhone(userId);
    
    if (!phone) {
      throw new Error('User phone not found');
    }

    // Get SMS template
    const [template] = await mysqlPool.query(
      'SELECT * FROM sms_templates WHERE event_type = ? AND is_active = TRUE',
      [eventType]
    );

    if (!template || template.length === 0) {
      console.log(`[Notification] SMS template not found: ${eventType}`);
      return { success: false, error: 'Template not found' };
    }

    const message = this._renderTemplateString(template[0].message, data);

    // Send SMS (using configured provider)
    let result;
    if (config.sms.provider === 'twilio' && config.sms.apiKey) {
      result = await this._sendTwilioSms(phone, message);
    } else if (config.sms.provider === 'msg91' && config.sms.apiKey) {
      result = await this._sendMsg91Sms(phone, message);
    } else {
      // Log only if no provider configured
      console.log('[SMS] Would send to:', phone);
      console.log('[SMS] Message:', message);
      result = { success: true, messageId: 'logged-only' };
    }

    // Log notification
    await this._logNotification(userId, 'sms', eventType, message, message, result);

    return result;
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, eventType, data) {
    // Get user's push tokens from database
    const pushTokens = await this._getUserPushTokens(userId);
    
    if (!pushTokens || pushTokens.length === 0) {
      console.log(`[Notification] No push tokens for user ${userId}`);
      return { success: false, error: 'No push tokens' };
    }

    const title = this._getNotificationTitle(eventType, data);
    const body = this._getNotificationBody(eventType, data);

    const result = { success: true, sent: 0 };

    for (const token of pushTokens) {
      try {
        // Send push notification (using FCM or similar)
        await this._sendPushNotification(token, title, body, {
          eventType,
          ...data
        });
        result.sent++;
      } catch (error) {
        console.error('[Push] Error sending notification:', error.message);
      }
    }

    // Log notification
    await this._logNotification(userId, 'push', eventType, title, body, result);

    return result;
  }

  /**
   * Send order notification (multi-channel)
   */
  async sendOrderNotification(order) {
    const { userId, orderId, customerEmail, customerPhone } = order;

    // Email
    try {
      await this.sendEmailNotification(userId, 'order_placed', {
        email: customerEmail,
        orderId,
        total: order.total,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send order email:', error.message);
    }

    // SMS
    try {
      await this.sendSmsNotification(userId, 'order_placed', {
        phone: customerPhone,
        orderId,
        total: order.total,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send order SMS:', error.message);
    }
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(order, trackingData) {
    const { userId, customerEmail, customerPhone } = order;

    // Email
    try {
      await this.sendEmailNotification(userId, 'order_shipped', {
        email: customerEmail,
        orderId: order.id,
        trackingNumber: trackingData.trackingNumber,
        expectedDelivery: trackingData.expectedDelivery,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send shipping email:', error.message);
    }

    // SMS
    try {
      await this.sendSmsNotification(userId, 'order_shipped', {
        phone: customerPhone,
        orderId: order.id,
        trackingNumber: trackingData.trackingNumber,
        expectedDelivery: trackingData.expectedDelivery,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send shipping SMS:', error.message);
    }
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(order) {
    const { userId, customerEmail, customerPhone } = order;

    // Email
    try {
      await this.sendEmailNotification(userId, 'order_delivered', {
        email: customerEmail,
        orderId: order.id,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send delivery email:', error.message);
    }

    // SMS
    try {
      await this.sendSmsNotification(userId, 'order_delivered', {
        phone: customerPhone,
        orderId: order.id,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send delivery SMS:', error.message);
    }
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(order, refundData) {
    const { userId, customerEmail, customerPhone } = order;

    // Email
    try {
      await this.sendEmailNotification(userId, 'refund_processed', {
        email: customerEmail,
        orderId: order.id,
        refundAmount: refundData.amount,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send refund email:', error.message);
    }

    // SMS
    try {
      await this.sendSmsNotification(userId, 'refund_processed', {
        phone: customerPhone,
        orderId: order.id,
        refundAmount: refundData.amount,
        customerName: order.customerName
      });
    } catch (error) {
      console.error('[Notification] Failed to send refund SMS:', error.message);
    }
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(item) {
    // Send to admin users
    const adminEmails = ['admin@shriramya.com']; // Get from config or database

    for (const email of adminEmails) {
      try {
        await emailService.sendLowStockAlert(email, item.productName, item.availableStock);
      } catch (error) {
        console.error('[Notification] Failed to send low stock alert:', error.message);
      }
    }
  }

  /**
   * Send restock notification
   */
  async sendRestockNotification(userId, productId, productName) {
    try {
      await this.sendEmailNotification(userId, 'product_restocked', {
        productName,
        productId
      });
    } catch (error) {
      console.error('[Notification] Failed to send restock notification:', error.message);
    }
  }

  /**
   * Send Twilio SMS
   */
  async _sendTwilioSms(phone, message) {
    // Implement Twilio integration
    console.log('[Twilio SMS] Would send to:', phone);
    console.log('[Twilio SMS] Message:', message);
    return { success: true, messageId: 'twilio-logged' };
  }

  /**
   * Send MSG91 SMS
   */
  async _sendMsg91Sms(phone, message) {
    // Implement MSG91 integration
    console.log('[MSG91 SMS] Would send to:', phone);
    console.log('[MSG91 SMS] Message:', message);
    return { success: true, messageId: 'msg91-logged' };
  }

  /**
   * Send push notification (FCM)
   */
  async _sendPushNotification(token, title, body, data) {
    // Implement FCM integration
    console.log('[FCM Push] Token:', token);
    console.log('[FCM Push] Title:', title);
    console.log('[FCM Push] Body:', body);
    return { success: true, messageId: 'fcm-logged' };
  }

  /**
   * Get user email
   */
  async _getUserEmail(userId) {
    // Get from MongoDB user model
    const User = require('../../models/user.model');
    const user = await User.findById(userId);
    return user ? user.email : null;
  }

  /**
   * Get user phone
   */
  async _getUserPhone(userId) {
    // Get from MongoDB user model
    const User = require('../../models/user.model');
    const user = await User.findById(userId);
    return user ? user.phone : null;
  }

  /**
   * Get user push tokens
   */
  async _getUserPushTokens(userId) {
    // Get from MongoDB user model (pushTokens array)
    const User = require('../../models/user.model');
    const user = await User.findById(userId);
    return user ? user.pushTokens || [] : [];
  }

  /**
   * Render template string with variables
   */
  _renderTemplateString(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Get notification title
   */
  _getNotificationTitle(eventType, data) {
    const titles = {
      order_placed: 'Order Confirmed',
      order_shipped: 'Order Shipped',
      order_delivered: 'Order Delivered',
      refund_processed: 'Refund Processed',
      product_restocked: 'Product Back in Stock'
    };
    return titles[eventType] || 'Notification';
  }

  /**
   * Get notification body
   */
  _getNotificationBody(eventType, data) {
    const bodies = {
      order_placed: `Your order #${data.orderId} has been confirmed.`,
      order_shipped: `Your order #${data.orderId} has been shipped. Track: ${data.trackingNumber}`,
      order_delivered: `Your order #${data.orderId} has been delivered.`,
      refund_processed: `Your refund of ₹${data.refundAmount} has been processed.`,
      product_restocked: `${data.productName} is back in stock!`
    };
    return bodies[eventType] || 'You have a new notification.';
  }

  /**
   * Log notification to database
   */
  async _logNotification(userId, type, eventType, title, message, result) {
    try {
      await mysqlPool.query(
        `INSERT INTO notifications (user_id, type, event_type, title, message, status, sent_at, data)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          userId,
          type,
          eventType,
          title,
          typeof message === 'string' ? message : JSON.stringify(message),
          result.success ? 'sent' : 'failed',
          JSON.stringify({ result, data: { eventType } })
        ]
      );
    } catch (error) {
      console.error('[Notification] Failed to log notification:', error.message);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, params = {}) {
    const { page = 1, per_page = 20, type, status } = params;
    const offset = (page - 1) * per_page;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const values = [userId];

    if (type) {
      query += ' AND type = ?';
      values.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(parseInt(per_page), parseInt(offset));

    const [rows] = await mysqlPool.query(query, values);

    const [countResult] = await mysqlPool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [userId]
    );

    return {
      notifications: rows.map(row => ({
        id: row.id,
        type: row.type,
        eventType: row.event_type,
        title: row.title,
        message: row.message,
        status: row.status,
        sentAt: row.sent_at,
        createdAt: row.created_at
      })),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / per_page)
      }
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId, userId) {
    const [result] = await mysqlPool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return { success: result.affectedRows > 0 };
  }
}

module.exports = new NotificationService();
