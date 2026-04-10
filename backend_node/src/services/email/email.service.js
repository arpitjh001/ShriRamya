/**
 * Email Service
 * Handles sending emails using templates and logging
 */

const { EmailTemplate, EmailLog } = require('../../models');
const nodemailer = require('nodemailer');
const config = require('../../config/config');

class EmailService {
    constructor() {
        if (config.email && config.email.smtp && config.email.smtp.host) {
            this.transporter = nodemailer.createTransport(config.email.smtp);
        } else {
            console.warn('Email service SMTP not configured');
            this.transporter = null;
        }
    }

    /**
     * Send an email using a template
     */
    async sendEmailWithTemplate(options) {
        const { templateName, recipient, data, tenantId = 'default' } = options;

        try {
            // Get template
            const template = await EmailTemplate.findOne({
                name: templateName,
                isActive: true,
                tenantId
            });

            if (!template) {
                console.warn(`Email template ${templateName} not found for tenant ${tenantId}, using default rendering`);
            }

            // Render template (or use defaults if missing)
            const subject = template ? this._renderTemplate(template.subject, data) : options.subject || 'Notification';
            const html = template ? this._renderTemplate(template.bodyHtml, data) : options.body || '';
            const text = template && template.bodyText ? this._renderTemplate(template.bodyText, data) : '';

            if (this.transporter) {
                const info = await this.transporter.sendMail({
                    from: config.email.from,
                    to: recipient,
                    subject,
                    text,
                    html
                });

                // Log successful email
                await EmailLog.create({
                    recipient,
                    subject,
                    templateName,
                    status: 'sent',
                    tenantId,
                    metadata: { messageId: info.messageId }
                });

                return true;
            } else {
                console.log(`[Email-Log-Only] To: ${recipient}, Subject: ${subject}`);
                await EmailLog.create({
                    recipient,
                    subject,
                    templateName,
                    status: 'sent',
                    tenantId,
                    metadata: { messageId: 'logged-only' }
                });
                return true;
            }
        } catch (error) {
            console.error('Failed to send email:', error);

            // Log failed email
            await EmailLog.create({
                recipient: recipient || 'unknown',
                subject: 'Failed Email',
                templateName,
                status: 'failed',
                error: error.message,
                tenantId
            });

            return false;
        }
    }

    /**
     * Render template string with data
     */
    _renderTemplate(templateString, data) {
        if (!templateString) return '';
        return templateString.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            const value = data[key.trim()];
            return value !== undefined ? value : match;
        });
    }

    /**
     * Get email logs for admin
     */
    async getEmailLogs(params = {}) {
        const { status, limit = 20, page = 1, tenantId } = params;
        const filter = {};
        if (status) filter.status = status;
        if (tenantId) filter.tenantId = tenantId;

        const skip = (page - 1) * limit;

        const logs = await EmailLog.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const count = await EmailLog.countDocuments(filter);

        return {
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalResults: count
        };
    }

    // Legacy method wrappers for compatibility
    async sendOrderConfirmation(email, orderData) {
        return this.sendEmailWithTemplate({
            templateName: 'order_placed',
            recipient: email,
            data: {
                customer_name: orderData.customerName || 'Valued Customer',
                order_id: orderData.orderId,
                total: orderData.total,
                order_date: new Date(orderData.createdAt).toLocaleDateString()
            }
        });
    }

    async sendShippingNotification(email, trackingData) {
        return this.sendEmailWithTemplate({
            templateName: 'order_shipped',
            recipient: email,
            data: {
                customer_name: trackingData.customerName || 'Valued Customer',
                order_id: trackingData.orderId,
                tracking_number: trackingData.trackingNumber,
                expected_delivery: trackingData.expectedDelivery || 'Soon'
            }
        });
    }

    async sendPasswordReset(email, resetToken, userName) {
        const resetUrl = `${config.publicBaseUrl}/reset-password?token=${resetToken}`;
        return this.sendEmailWithTemplate({
            templateName: 'password_reset',
            recipient: email,
            data: {
                user_name: userName || 'there',
                reset_url: resetUrl
            }
        });
    }
}

module.exports = new EmailService();
