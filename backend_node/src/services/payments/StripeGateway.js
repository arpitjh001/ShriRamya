/**
 * Stripe Payment Gateway Implementation
 * Handles Stripe payment processing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

class StripeGateway {
    constructor() {
        this.gatewayName = 'stripe';
    }

    /**
     * Create a payment intent
     * @param {Object} order - Order details
     * @returns {Promise<Object>}
     */
    async createPayment(order) {
        try {
            const amount = Math.round(order.amount * 100); // Convert to paise/cents

            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: order.currency || 'INR',
                metadata: {
                    orderId: String(order.orderId),
                    orderNumber: order.orderNumber
                },
                automatic_payment_methods: {
                    enabled: true
                }
            });

            return {
                success: true,
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount,
                currency: paymentIntent.currency
            };
        } catch (error) {
            console.error('Stripe createPayment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify and capture payment
     * @param {string} paymentIntentId - Payment Intent ID
     * @returns {Promise<Object>}
     */
    async verifyPayment(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status === 'succeeded') {
                return {
                    success: true,
                    transactionId: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: 'paid',
                    paidAt: new Date(paymentIntent.created * 1000)
                };
            }

            return {
                success: false,
                status: paymentIntent.status,
                error: 'Payment not succeeded'
            };
        } catch (error) {
            console.error('Stripe verifyPayment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process refund
     * @param {string} paymentIntentId - Payment Intent ID
     * @param {number} amount - Refund amount (optional, full refund if not specified)
     * @param {string} reason - Refund reason
     * @returns {Promise<Object>}
     */
    async refund(paymentIntentId, amount, reason = '') {
        try {
            const refundParams = {
                payment_intent: paymentIntentId,
                reason: reason || 'requested_by_customer'
            };

            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            const refund = await stripe.refunds.create(refundParams);

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                reason: refund.reason
            };
        } catch (error) {
            console.error('Stripe refund error:', error);
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
     * @param {string} endpointSecret - Webhook endpoint secret
     * @returns {boolean}
     */
    verifyWebhookSignature(payload, signature, endpointSecret) {
        try {
            const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
            return { valid: true, event };
        } catch (error) {
            console.error('Stripe webhook signature verification failed:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Get payment details
     * @param {string} paymentIntentId - Payment Intent ID
     * @returns {Promise<Object>}
     */
    async getPaymentDetails(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return {
                success: true,
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                created: new Date(paymentIntent.created * 1000),
                metadata: paymentIntent.metadata
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = StripeGateway;
