/**
 * Razorpay Payment Gateway Implementation
 * Handles Razorpay payment processing
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../../config/config');

let razorpayClient = null;

const getRazorpayClient = () => {
    const keyId = config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return null;
    }

    if (!razorpayClient) {
        razorpayClient = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }

    return razorpayClient;
};

const getKeySecret = () => config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET || '';

class RazorpayGateway {
    constructor() {
        this.gatewayName = 'razorpay';
    }

    isConfigured() {
        const client = getRazorpayClient();
        return !!client;
    }

    /**
     * Create an order
     * @param {Object} order - Order details
     * @returns {Promise<Object>}
     */
    async createPayment(order) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const amountInPaise = Math.round(Number(order.amount || 0) * 100);

            const rzOrder = await razorpay.orders.create({
                amount: amountInPaise,
                currency: order.currency || 'INR',
                receipt: order.receipt || `order_${order.orderId}_${Date.now()}`,
                notes: {
                    orderId: String(order.orderId),
                    orderNumber: order.orderNumber,
                    userId: String(order.userId)
                }
            });

            return {
                success: true,
                orderId: rzOrder.id,
                amount: rzOrder.amount / 100,
                amountInPaise: rzOrder.amount,
                amount_in_paise: rzOrder.amount,
                currency: rzOrder.currency,
                receipt: rzOrder.receipt,
                status: rzOrder.status
            };
        } catch (error) {
            console.error('Razorpay createPayment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify payment signature
     * @param {string} orderId - Razorpay Order ID
     * @param {string} paymentId - Razorpay Payment ID
     * @param {string} signature - Razorpay Signature
     * @returns {Object}
     */
    verifyPayment(orderId, paymentId, signature) {
        try {
            const keySecret = getKeySecret();
            if (!keySecret) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_SECRET)',
                };
            }

            const sign = orderId + '|' + paymentId;
            const expectedSign = crypto
                .createHmac('sha256', keySecret)
                .update(sign.toString())
                .digest('hex');

            const isValid = signature === expectedSign;

            return {
                success: isValid,
                message: isValid ? 'Payment verified successfully' : 'Invalid payment signature'
            };
        } catch (error) {
            console.error('Razorpay verifyPayment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch payment details
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>}
     */
    async verifyPaymentStatus(paymentId) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const payment = await razorpay.payments.fetch(paymentId);

            return {
                success: payment.status === 'captured',
                transactionId: payment.id,
                amount: payment.amount / 100,
                currency: payment.currency,
                status: payment.status === 'captured' ? 'paid' : payment.status,
                method: payment.method,
                paidAt: new Date(payment.created_at * 1000),
                email: payment.email,
                contact: payment.contact
            };
        } catch (error) {
            console.error('Razorpay verifyPaymentStatus error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch order details
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>}
     */
    async getOrderDetails(orderId) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const order = await razorpay.orders.fetch(orderId);

            return {
                success: true,
                id: order.id,
                amount: order.amount / 100,
                currency: order.currency,
                status: order.status,
                receipt: order.receipt,
                notes: order.notes,
                createdAt: new Date(order.created_at * 1000)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process refund
     * @param {string} paymentId - Payment ID
     * @param {number} amount - Refund amount (optional)
     * @param {string} reason - Refund reason
     * @param {number} speed - Refund speed (0=normal, 1=fast)
     * @returns {Promise<Object>}
     */
    async refund(paymentId, amount = null, reason = '', speed = 0) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const refundParams = {
                payment_id: paymentId,
                speed: speed,
                notes: {
                    reason: reason || 'requested_by_customer'
                }
            };

            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            const refund = await razorpay.refunds.create(refundParams);

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                reason: refund.notes?.reason || reason,
                speed: refund.speed,
                createdAt: new Date(refund.created_at * 1000)
            };
        } catch (error) {
            console.error('Razorpay refund error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch refund details
     * @param {string} refundId - Refund ID
     * @returns {Promise<Object>}
     */
    async getRefundDetails(refundId) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const refund = await razorpay.refunds.fetch(refundId);

            return {
                success: true,
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                reason: refund.notes?.reason,
                createdAt: new Date(refund.created_at * 1000)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature
     * @param {string} payload - Raw webhook payload
     * @param {string} signature - Webhook signature
     * @returns {Object}
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const keySecret = process.env.RAZORPAY_WEBHOOK_SECRET || getKeySecret();
            if (!keySecret) {
                return {
                    valid: false,
                    error: 'Razorpay webhook secret is not configured (missing RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET)',
                };
            }

            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(payload)
                .digest('hex');

            const isValid = signature === expectedSignature;

            return {
                valid: isValid,
                message: isValid ? 'Webhook signature verified' : 'Invalid webhook signature'
            };
        } catch (error) {
            console.error('Razorpay webhook verification error:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get all payments for an order
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>}
     */
    async getPaymentsByOrder(orderId) {
        try {
            const razorpay = getRazorpayClient();
            if (!razorpay) {
                return {
                    success: false,
                    error: 'Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)',
                };
            }

            const payments = await razorpay.orders.fetchPayments(orderId);

            return {
                success: true,
                payments: payments.items.map(p => ({
                    id: p.id,
                    amount: p.amount / 100,
                    status: p.status,
                    method: p.method,
                    createdAt: new Date(p.created_at * 1000)
                }))
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new RazorpayGateway();
module.exports.RazorpayGatewayClass = RazorpayGateway;
