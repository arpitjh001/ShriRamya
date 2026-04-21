/**
 * Payment Webhook Controller
 * Handles webhooks from payment gateways (Stripe, Razorpay)
 */

const httpStatus = require('http-status');
const { Order, Payment } = require('../models');
const orderEventService = require('../services/events/orderEvent.service');
const RazorpayGateway = require('../services/payments/RazorpayGateway');
const StripeGateway = require('../services/payments/StripeGateway');

/**
 * Handle Razorpay Webhook
 * POST /api/v1/webhooks/payment/razorpay
 */
const handleRazorpayWebhook = async (req, res, next) => {
    try {
        const body = req.body;
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Missing webhook signature'
            });
        }

        // Verify webhook signature
        const payload = JSON.stringify(body);
        const verification = RazorpayGateway.verifyWebhookSignature(payload, signature);

        if (!verification.valid) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }

        const event = body.event;
        const payload_data = body.payload;

        console.log(`Razorpay webhook received: ${event}`);

        // Handle different event types
        switch (event) {
            case 'payment.captured':
            case 'order.paid':
                await handleRazorpayPaymentStatus(payload_data.payment.entity, 'completed');
                break;
            case 'payment.failed':
                await handleRazorpayPaymentStatus(payload_data.payment.entity, 'failed');
                break;
            default:
                console.log(`Unhandled Razorpay event: ${event}`);
        }

        // Acknowledge webhook
        res.status(httpStatus.OK).json({
            success: true,
            message: 'Webhook received'
        });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        next(error);
    }
};

/**
 * Handle Stripe Webhook
 * POST /api/v1/webhooks/payment/stripe
 */
const handleStripeWebhook = async (req, res, next) => {
    try {
        const body = req.body;
        const signature = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        // Verify webhook signature (using gateway service)
        const stripeGateway = new StripeGateway();
        const verification = stripeGateway.verifyWebhookSignature(
            JSON.stringify(body),
            signature,
            endpointSecret
        );

        if (!verification.valid) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }

        const event = verification.event;
        console.log(`Stripe webhook received: ${event.type}`);

        switch (event.type) {
            case 'payment_intent.succeeded':
                await handleStripePaymentStatus(event.data.object, 'completed');
                break;
            case 'payment_intent.payment_failed':
                await handleStripePaymentStatus(event.data.object, 'failed');
                break;
            default:
                console.log(`Unhandled Stripe event: ${event.type}`);
        }

        res.status(httpStatus.OK).json({
            success: true,
            message: 'Webhook received'
        });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        next(error);
    }
};

/**
 * Handle Razorpay payment status
 */
async function handleRazorpayPaymentStatus(payment, status) {
    const orderId = payment.notes?.orderId;
    if (!orderId) return;

    try {
        const order = await Order.findById(orderId);
        if (!order) return;

        if (status === 'completed') {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            await order.save();
        } else if (status === 'failed') {
            order.paymentStatus = 'failed';
            await order.save();
        }

        // Update Payment record
        await Payment.findOneAndUpdate(
            { orderId: order._id },
            { 
                $set: { 
                    status, 
                    transactionId: payment.id,
                    paidAt: status === 'completed' ? new Date() : null,
                    gatewayResponse: payment,
                    amount: payment.amount / 100
                } 
            },
            { upsert: true, new: true }
        );

        // Log event
        await orderEventService.logEvent(
            order._id,
            status === 'completed' ? 'payment_success' : 'payment_failed',
            `Payment ${status} via Razorpay`,
            { paymentId: payment.id, amount: payment.amount / 100 },
            null,
            'system'
        );
    } catch (error) {
        console.error('Error handling Razorpay payment status:', error);
    }
}

/**
 * Handle Stripe payment status
 */
async function handleStripePaymentStatus(paymentIntent, status) {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return;

    try {
        const order = await Order.findById(orderId);
        if (!order) return;

        if (status === 'completed') {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            await order.save();
        } else if (status === 'failed') {
            order.paymentStatus = 'failed';
            await order.save();
        }

        await Payment.findOneAndUpdate(
            { orderId: order._id },
            { 
                $set: { 
                    status, 
                    transactionId: paymentIntent.id,
                    paidAt: status === 'completed' ? new Date() : null,
                    gatewayResponse: paymentIntent,
                    amount: paymentIntent.amount / 100
                } 
            },
            { upsert: true, new: true }
        );

        await orderEventService.logEvent(
            order._id,
            status === 'completed' ? 'payment_success' : 'payment_failed',
            `Payment ${status} via Stripe`,
            { paymentId: paymentIntent.id, amount: paymentIntent.amount / 100 },
            null,
            'system'
        );
    } catch (error) {
        console.error('Error handling Stripe payment status:', error);
    }
}

module.exports = {
    handleRazorpayWebhook,
    handleStripeWebhook
};
