/**
 * Email Service
 * Handles sending emails via SMTP
 */

const nodemailer = require('nodemailer');
const { mysqlPool } = require('../../config/db');
const config = require('../../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this._initializeTransporter();
  }

  /**
   * Initialize SMTP transporter
   */
  _initializeTransporter() {
    if (config.smtp.host && config.smtp.user) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port || 587,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      });
      console.log('[Email] SMTP transporter initialized');
    } else {
      console.log('[Email] SMTP not configured, emails will be logged only');
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      console.log('[Email] Would send to:', to);
      console.log('[Email] Subject:', subject);
      console.log('[Email] HTML:', html);
      return { success: true, messageId: 'logged-only' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"ShriRamya" <${config.smtp.user}>`,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html
      });

      console.log('[Email] Message sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Email] Error sending email:', error.message);
      throw error;
    }
  }

  /**
   * Get email template from database
   */
  async _getEmailTemplate(eventType) {
    const [rows] = await mysqlPool.query(
      'SELECT * FROM email_templates WHERE event_type = ? AND is_active = TRUE',
      [eventType]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Render template with variables
   */
  _renderTemplate(template, data) {
    let subject = template.subject;
    let html = template.body_html;
    let text = template.body_text;

    // Replace variables
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
      if (text) {
        text = text.replace(regex, value);
      }
    }

    return { subject, html, text };
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(email, orderData) {
    const template = await this._getEmailTemplate('order_placed');
    
    if (!template) {
      console.error('[Email] Template not found: order_placed');
      return { success: false, error: 'Template not found' };
    }

    const { subject, html, text } = this._renderTemplate(template, {
      customer_name: orderData.customerName || 'Valued Customer',
      order_id: orderData.orderId,
      total: orderData.total,
      order_date: new Date(orderData.createdAt).toLocaleDateString()
    });

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(email, trackingData) {
    const template = await this._getEmailTemplate('order_shipped');
    
    if (!template) {
      console.error('[Email] Template not found: order_shipped');
      return { success: false, error: 'Template not found' };
    }

    const { subject, html, text } = this._renderTemplate(template, {
      customer_name: trackingData.customerName || 'Valued Customer',
      order_id: trackingData.orderId,
      tracking_number: trackingData.trackingNumber,
      expected_delivery: trackingData.expectedDelivery || 'Soon'
    });

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(email, orderData) {
    const template = await this._getEmailTemplate('order_delivered');
    
    if (!template) {
      console.error('[Email] Template not found: order_delivered');
      return { success: false, error: 'Template not found' };
    }

    const { subject, html, text } = this._renderTemplate(template, {
      customer_name: orderData.customerName || 'Valued Customer',
      order_id: orderData.orderId
    });

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(email, refundData) {
    const template = await this._getEmailTemplate('refund_processed');
    
    if (!template) {
      console.error('[Email] Template not found: refund_processed');
      return { success: false, error: 'Template not found' };
    }

    const { subject, html, text } = this._renderTemplate(template, {
      customer_name: refundData.customerName || 'Valued Customer',
      order_id: refundData.orderId,
      refund_amount: refundData.refundAmount
    });

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send low stock alert to admin
   */
  async sendLowStockAlert(adminEmail, productName, currentStock) {
    const template = await this._getEmailTemplate('low_stock_alert');
    
    if (!template) {
      console.error('[Email] Template not found: low_stock_alert');
      return { success: false, error: 'Template not found' };
    }

    const { subject, html, text } = this._renderTemplate(template, {
      product_name: productName,
      current_stock: currentStock
    });

    return this.sendEmail(adminEmail, subject, html, text);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetToken, userName) {
    const resetUrl = `${config.publicBaseUrl}/reset-password?token=${resetToken}`;
    
    const html = `
      <html>
        <body>
          <h1>Password Reset Request</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </body>
      </html>
    `;

    const text = `Password Reset Request\n\nHi,\n\nYou requested a password reset. Visit this link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.`;

    return this.sendEmail(email, 'Password Reset Request', html, text);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, userName) {
    const html = `
      <html>
        <body>
          <h1>Welcome to ShriRamya!</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>Thank you for joining us. We're excited to have you on board!</p>
          <p>Start exploring our amazing products and enjoy your shopping experience.</p>
        </body>
      </html>
    `;

    const text = `Welcome to ShriRamya!\n\nHi,\n\nThank you for joining us. We're excited to have you on board!`;

    return this.sendEmail(email, 'Welcome to ShriRamya!', html, text);
  }
}

module.exports = new EmailService();
