/**
 * Payment Webhook Controller
 * Handles webhooks from payment gateways (Stripe, Razorpay)
 */

const httpStatus = require('http-status');
const orderStateMachine = require('../services/orderStateMachine.service');
const orderEventService = require('../services/events/orderEvent.service');
const RazorpayGateway = require('../services/payments/RazorpayGateway');
const StripeGateway = require('../services/payments/StripeGateway');
const { successResponse } = require('../utils/response');
const { mysqlPool } = require('../config/db');

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
                await handleRazorpayPaymentCaptured(payload_data.payment.entity);
                break;
            case 'payment.failed':
                await handleRazorpayPaymentFailed(payload_data.payment.entity);
                break;
            case 'order.paid':
                await handleRazorpayOrderPaid(payload_data.payment.entity);
                break;
            case 'refund.created':
                await handleRazorpayRefundCreated(payload_data.refund.entity);
                break;
            case 'refund.processed':
                await handleRazorpayRefundProcessed(payload_data.refund.entity);
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

        if (!signature) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Missing webhook signature'
            });
        }

        // Verify webhook signature
        const verification = new StripeGateway().verifyWebhookSignature(
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

        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handleStripePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handleStripePaymentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await handleStripeRefund(event.data.object);
                break;
            default:
                console.log(`Unhandled Stripe event: ${event.type}`);
        }

        // Acknowledge webhook
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
 * Handle Razorpay payment captured
 */
async function handleRazorpayPaymentCaptured(payment) {
    try {
        const orderId = payment.notes?.orderId;
        if (!orderId) {
            console.warn('Razorpay payment missing orderId in notes');
            return;
        }

        // Update order status
        await orderStateMachine.transitionStatus(parseInt(orderId), 'paid', {
            userType: 'system'
        });

        // Update payment record
        await mysqlPool.query(
            `UPDATE payments 
            SET status = 'completed', 
                transaction_id = ?, 
                paid_at = NOW(),
                gateway_response = ?
            WHERE order_id = ?`,
            [payment.id, JSON.stringify(payment), parseInt(orderId)]
        );

        // Log event
        await orderEventService.logEvent(
            parseInt(orderId),
            'payment_success',
            `Payment of ₹${payment.amount / 100} received via Razorpay`,
            {
                paymentId: payment.id,
                amount: payment.amount / 100,
                method: payment.method
            },
            null,
            'system'
        );

        console.log(`Razorpay payment captured for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Razorpay payment captured:', error);
        throw error;
    }
}

/**
 * Handle Razorpay payment failed
 */
async function handleRazorpayPaymentFailed(payment) {
    try {
        const orderId = payment.notes?.orderId;
        if (!orderId) return;

        // Update order status
        await orderStateMachine.transitionStatus(parseInt(orderId), 'payment_failed', {
            userType: 'system'
        });

        // Log event
        await orderEventService.logEvent(
            parseInt(orderId),
            'payment_failed',
            `Payment failed: ${payment.error_description || 'Unknown error'}`,
            { paymentId: payment.id },
            null,
            'system'
        );

        console.log(`Razorpay payment failed for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Razorpay payment failed:', error);
    }
}

/**
 * Handle Razorpay order paid
 */
async function handleRazorpayOrderPaid(payment) {
    // Similar to payment.captured
    await handleRazorpayPaymentCaptured(payment);
}

/**
 * Handle Razorpay refund created
 */
async function handleRazorpayRefundCreated(refund) {
    try {
        const paymentId = refund.payment_id;
        
        // Find order from payment
        const [payments] = await mysqlPool.query(
            'SELECT order_id FROM payments WHERE transaction_id = ?',
            [paymentId]
        );

        if (payments.length === 0) return;

        const orderId = payments[0].order_id;

        // Update refund record
        await mysqlPool.query(
            `UPDATE refunds 
            SET status = 'approved', 
                refund_transaction_id = ?,
                updated_at = NOW()
            WHERE order_id = ? AND amount = ?`,
            [refund.id, orderId, refund.amount / 100]
        );

        console.log(`Razorpay refund created for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Razorpay refund created:', error);
    }
}

/**
 * Handle Razorpay refund processed
 */
async function handleRazorpayRefundProcessed(refund) {
    try {
        const paymentId = refund.payment_id;
        
        const [payments] = await mysqlPool.query(
            'SELECT order_id FROM payments WHERE transaction_id = ?',
            [paymentId]
        );

        if (payments.length === 0) return;

        const orderId = payments[0].order_id;

        // Update refund record
        await mysqlPool.query(
            `UPDATE refunds 
            SET status = 'completed', 
                processed_at = NOW()
            WHERE order_id = ? AND refund_transaction_id = ?`,
            [orderId, refund.id]
        );

        // Log event
        await orderEventService.logEvent(
            orderId,
            'refund_completed',
            `Refund of ₹${refund.amount / 100} processed`,
            { refundId: refund.id },
            null,
            'system'
        );

        console.log(`Razorpay refund processed for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Razorpay refund processed:', error);
    }
}

/**
 * Handle Stripe payment succeeded
 */
async function handleStripePaymentSucceeded(paymentIntent) {
    try {
        const orderId = paymentIntent.metadata?.orderId;
        if (!orderId) {
            console.warn('Stripe payment missing orderId in metadata');
            return;
        }

        // Update order status
        await orderStateMachine.transitionStatus(parseInt(orderId), 'paid', {
            userType: 'system'
        });

        // Update payment record
        await mysqlPool.query(
            `UPDATE payments 
            SET status = 'completed', 
                transaction_id = ?, 
                paid_at = NOW(),
                gateway_response = ?
            WHERE order_id = ?`,
            [paymentIntent.id, JSON.stringify(paymentIntent), parseInt(orderId)]
        );

        // Log event
        await orderEventService.logEvent(
            parseInt(orderId),
            'payment_success',
            `Payment of $${paymentIntent.amount / 100} received via Stripe`,
            {
                paymentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency
            },
            null,
            'system'
        );

        console.log(`Stripe payment succeeded for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Stripe payment succeeded:', error);
        throw error;
    }
}

/**
 * Handle Stripe payment failed
 */
async function handleStripePaymentFailed(paymentIntent) {
    try {
        const orderId = paymentIntent.metadata?.orderId;
        if (!orderId) return;

        // Update order status
        await orderStateMachine.transitionStatus(parseInt(orderId), 'payment_failed', {
            userType: 'system'
        });

        // Log event
        await orderEventService.logEvent(
            parseInt(orderId),
            'payment_failed',
            'Payment failed via Stripe',
            { paymentId: paymentIntent.id },
            null,
            'system'
        );

        console.log(`Stripe payment failed for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Stripe payment failed:', error);
    }
}

/**
 * Handle Stripe refund
 */
async function handleStripeRefund(charge) {
    try {
        const paymentIntentId = charge.payment_intent;
        
        const [payments] = await mysqlPool.query(
            'SELECT order_id FROM payments WHERE transaction_id = ?',
            [paymentIntentId]
        );

        if (payments.length === 0) return;

        const orderId = payments[0].order_id;
        const refund = charge.refunds?.data?.[0];

        if (!refund) return;

        // Update refund record
        await mysqlPool.query(
            `UPDATE refunds 
            SET status = 'completed', 
                refund_transaction_id = ?,
                processed_at = NOW()
            WHERE order_id = ? AND refund_transaction_id = ?`,
            [refund.id, orderId, refund.id]
        );

        // Log event
        await orderEventService.logEvent(
            orderId,
            'refund_completed',
            `Refund of $${refund.amount / 100} processed via Stripe`,
            { refundId: refund.id },
            null,
            'system'
        );

        console.log(`Stripe refund processed for order ${orderId}`);
    } catch (error) {
        console.error('Error handling Stripe refund:', error);
    }
}

module.exports = {
    handleRazorpayWebhook,
    handleStripeWebhook
};
