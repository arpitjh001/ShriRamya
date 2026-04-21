/**
 * Order Email Service
 * Handles all order-related email notifications
 */

const nodemailer = require('nodemailer');
const config = require('../../config/config');

/**
 * Email Transporter Configuration
 * Uses environment variables for SMTP settings
 */
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return transporter;
}

/**
 * Email Templates
 */
const TEMPLATES = {
    ORDER_CONFIRMATION: {
        subject: 'Order Confirmation - {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #181C14; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    .button { display: inline-block; padding: 12px 24px; background: #181C14; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Order Confirmed!</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Thank you for your order! We've received your order and will begin processing it right away.</p>
                        
                        <div class="order-details">
                            <h3>Order Details</h3>
                            <p><strong>Order Number:</strong> {{orderNumber}}</p>
                            <p><strong>Order Date:</strong> {{orderDate}}</p>
                            <p><strong>Total Amount:</strong> ₹{{totalAmount}}</p>
                            <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
                        </div>

                        <h4>Shipping Address:</h4>
                        <p>{{shippingAddress}}</p>

                        <h4>Order Items:</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #eee;">
                                    <th style="padding: 10px; text-align: left;">Product</th>
                                    <th style="padding: 10px;">Qty</th>
                                    <th style="padding: 10px; text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{orderItems}}
                            </tbody>
                        </table>

                        <p style="margin-top: 20px;">
                            <a href="{{orderTrackingUrl}}" class="button">Track Your Order</a>
                        </p>

                        <p>We'll send you another email when your order ships.</p>
                        <p>Thank you for shopping with ShriRamya!</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 ShriRamya. All rights reserved.</p>
                        <p>Need help? Contact us at support@shriramya.com</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    PAYMENT_CONFIRMATION: {
        subject: 'Payment Received - Order {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .receipt { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Payment Received</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Your payment has been successfully processed.</p>
                        
                        <div class="receipt">
                            <h3>Payment Receipt</h3>
                            <p><strong>Order Number:</strong> {{orderNumber}}</p>
                            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                            <p><strong>Amount Paid:</strong> ₹{{amount}}</p>
                            <p><strong>Payment Date:</strong> {{paymentDate}}</p>
                        </div>

                        <p>Your order is now being prepared for shipment.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    SHIPMENT_NOTIFICATION: {
        subject: 'Your Order Has Shipped! - {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .tracking { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
                    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚚 Your Order Has Shipped!</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Great news! Your order is on its way.</p>
                        
                        <div class="tracking">
                            <h3>Tracking Information</h3>
                            <p><strong>Order Number:</strong> {{orderNumber}}</p>
                            <p><strong>Carrier:</strong> {{carrier}}</p>
                            <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
                        </div>

                        <p>
                            <a href="{{trackingUrl}}" class="button">Track Your Package</a>
                        </p>

                        <p>Expected delivery: {{estimatedDelivery}}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    DELIVERY_CONFIRMATION: {
        subject: 'Order Delivered - {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Order Delivered</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Your order has been delivered successfully!</p>
                        <p><strong>Order Number:</strong> {{orderNumber}}</p>
                        <p><strong>Delivered at:</strong> {{deliveryDate}}</p>
                        
                        <p style="margin-top: 20px;">
                            We hope you love your purchase! If you have any issues, please contact our support team.
                        </p>
                        
                        <p>Thank you for choosing ShriRamya!</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    ORDER_CANCELLATION: {
        subject: 'Order Cancelled - {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Cancelled</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Your order has been cancelled as requested.</p>
                        <p><strong>Order Number:</strong> {{orderNumber}}</p>
                        <p><strong>Cancellation Date:</strong> {{cancellationDate}}</p>
                        {{refundInfo}}
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    REFUND_CONFIRMATION: {
        subject: 'Refund Processed - Order {{orderNumber}}',
        template: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #ffc107; color: #333; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .refund-details { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💵 Refund Processed</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Your refund has been processed successfully.</p>
                        
                        <div class="refund-details">
                            <h3>Refund Details</h3>
                            <p><strong>Order Number:</strong> {{orderNumber}}</p>
                            <p><strong>Refund Amount:</strong> ₹{{refundAmount}}</p>
                            <p><strong>Refund Method:</strong> {{refundMethod}}</p>
                            <p><strong>Transaction ID:</strong> {{refundTransactionId}}</p>
                        </div>

                        <p>The refund should appear in your account within 5-7 business days.</p>
                        <p><strong>Reason:</strong> {{reason}}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }
};

class OrderEmailService {
    /**
     * Send email
     */
    async sendEmail(to, subject, html) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('Email not sent (SMTP not configured):', to, subject);
            return { success: false, message: 'SMTP not configured' };
        }

        try {
            const mailer = getTransporter();
            
            const info = await mailer.sendMail({
                from: `"ShriRamya" <${process.env.SMTP_FROM || 'noreply@shriramya.com'}>`,
                to,
                subject,
                html
            });

            console.log('Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Render template with variables
     */
    renderTemplate(templateKey, variables) {
        const template = TEMPLATES[templateKey];
        if (!template) {
            throw new Error(`Template ${templateKey} not found`);
        }

        let subject = template.subject;
        let html = template.template;

        // Replace variables
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, variables[key] || '');
            html = html.replace(regex, variables[key] || '');
        });

        return { subject, html };
    }

    /**
     * Send order confirmation email
     */
    async sendOrderConfirmation(order) {
        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            orderDate: new Date(order.created_at).toLocaleDateString('en-IN'),
            totalAmount: order.grand_total,
            paymentMethod: order.payment_method || 'Not specified',
            shippingAddress: this._formatAddress(order),
            orderItems: this._generateOrderItemsHTML(order),
            orderTrackingUrl: `${process.env.PUBLIC_BASE_URL || 'http://localhost:8080'}/orders/${order.id}`
        };

        const { subject, html } = this.renderTemplate('ORDER_CONFIRMATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmation(order) {
        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            transactionId: order.transaction_id || 'N/A',
            amount: order.grand_total,
            paymentDate: new Date().toLocaleDateString('en-IN')
        };

        const { subject, html } = this.renderTemplate('PAYMENT_CONFIRMATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Send shipment notification email
     */
    async sendShipmentNotification(order, shipmentData = {}) {
        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            carrier: shipmentData.carrier || 'Not specified',
            trackingNumber: shipmentData.tracking_number || 'N/A',
            trackingUrl: shipmentData.tracking_url || '#',
            estimatedDelivery: this._getEstimatedDelivery(shipmentData.carrier)
        };

        const { subject, html } = this.renderTemplate('SHIPMENT_NOTIFICATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Send delivery confirmation email
     */
    async sendDeliveryConfirmation(order) {
        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            deliveryDate: new Date().toLocaleDateString('en-IN')
        };

        const { subject, html } = this.renderTemplate('DELIVERY_CONFIRMATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Send order cancellation email
     */
    async sendOrderCancellation(order) {
        const refundInfo = order.payment_status === 'paid' 
            ? '<p>A refund will be processed within 5-7 business days.</p>'
            : '<p>No payment was processed for this order.</p>';

        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            cancellationDate: new Date().toLocaleDateString('en-IN'),
            refundInfo
        };

        const { subject, html } = this.renderTemplate('ORDER_CANCELLATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Send refund confirmation email
     */
    async sendRefundConfirmation(order, refundData = {}) {
        const variables = {
            customerName: `${order.shipping_first_name || order.billing_first_name || 'Customer'}`,
            orderNumber: order.order_number,
            refundAmount: refundData.amount || order.grand_total,
            refundMethod: order.payment_method || 'Original payment method',
            refundTransactionId: refundData.refund_transaction_id || 'N/A',
            reason: refundData.reason || 'Customer request'
        };

        const { subject, html } = this.renderTemplate('REFUND_CONFIRMATION', variables);
        return await this.sendEmail(order.customer_email, subject, html);
    }

    /**
     * Helper: Format address
     */
    _formatAddress(order) {
        const parts = [
            order.shipping_address_1,
            order.shipping_address_2,
            order.shipping_city,
            order.shipping_state,
            order.shipping_postcode,
            order.shipping_country
        ].filter(Boolean);
        return parts.join(', ');
    }

    /**
     * Helper: Generate order items HTML
     */
    _generateOrderItemsHTML(order) {
        // This would need order items data - for now return placeholder
        return `
            <tr>
                <td colspan="3" style="padding: 10px; text-align: center; color: #666;">
                    Order items details available in your account
                </td>
            </tr>
        `;
    }

    /**
     * Helper: Get estimated delivery
     */
    _getEstimatedDelivery(carrier) {
        const date = new Date();
        date.setDate(date.getDate() + 5); // Default 5 days
        return date.toLocaleDateString('en-IN');
    }
}

module.exports = new OrderEmailService();
