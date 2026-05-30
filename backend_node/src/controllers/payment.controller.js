/**
 * Payment Controller
 * Handles payment processing, verification, and callbacks with Mongoose
 */

const httpStatus = require('http-status');
const { Order, Payment, Refund } = require('../models');
const RazorpayGateway = require('../services/payments/RazorpayGateway');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const orderEventService = require('../services/events/orderEvent.service');
const logger = require('../utils/logger');

/**
 * Initialize Payment
 * POST /api/v1/payments/initiate
 */
const initiatePayment = async (req, res, next) => {
    try {
        const { orderId, amount, currency = 'INR' } = req.body;
        const userId = req.user?.id;

        if (!orderId || !amount) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'orderId and amount are required');
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (order.userId.toString() !== userId && req.user.role !== 'admin') {
            throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized');
        }

        // Create Razorpay order
        const razorpayOrder = await RazorpayGateway.createPayment({
            orderId: order._id,
            orderNumber: order.orderNumber,
            userId,
            amount,
            currency,
            receipt: `order_${order._id}_${Date.now()}`
        });

        if (!razorpayOrder.success) {
            throw new ApiError(httpStatus.BAD_REQUEST, razorpayOrder.error || 'Failed to create payment order');
        }

        // Store payment record
        await Payment.create({
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            userId: userId ? String(userId) : null,
            amount,
            currency,
            payment_method: 'razorpay',
            gateway: 'razorpay',
            transactionId: razorpayOrder.orderId,
            status: 'pending',
            gateway_response: razorpayOrder
        });

        // Log payment initiated event
        await orderEventService.logEvent(
            order._id,
            'payment_initiated',
            `Payment initiated for order ${order.orderNumber}`,
            { amount, currency, razorpayOrderId: razorpayOrder.orderId },
            userId,
            'customer'
        );

        const amountInPaise = razorpayOrder.amountInPaise || razorpayOrder.amount_in_paise;
        
        return successResponse(res, {
            orderId: razorpayOrder.orderId,
            amount_in_paise: amountInPaise,
            amountInPaise: amountInPaise,
            display_amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID || '',
            receipt: razorpayOrder.receipt,
            status: razorpayOrder.status
        }, 'Payment order created successfully');

    } catch (error) {
        logger.error('[PaymentController] Initiate payment error:', error.message);
        next(error);
    }
};

/**
 * Verify Payment
 * POST /api/v1/payments/verify
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Payment details are required');
        }

        // Verify payment signature
        const verification = RazorpayGateway.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!verification.success) {
            throw new ApiError(httpStatus.BAD_REQUEST, verification.error || 'Invalid payment signature');
        }

        // Update payment record in database
        const payment = await Payment.findOneAndUpdate(
            { transactionId: razorpay_order_id },
            { 
                $set: { 
                    status: 'completed', 
                    transactionId: razorpay_payment_id,
                    paid_at: new Date(),
                    gateway_response: { razorpay_payment_id, razorpay_signature }
                } 
            },
            { new: true }
        );

        if (!payment) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Payment record not found');
        }

        // Update order status
        const order = await Order.findById(payment.orderId);
        if (order) {
            order.paymentStatus = 'paid';
            order.payment_status = 'paid';
            order.status = 'processing';
            await order.save();
            
            await orderEventService.logEvent(
                order._id,
                'payment_completed',
                `Payment verified via Razorpay`,
                { razorpayPaymentId: razorpay_payment_id },
                null,
                'system'
            );
        }

        return successResponse(res, { verified: true }, 'Payment verified successfully');

    } catch (error) {
        logger.error('[PaymentController] Verify payment error:', error.message);
        next(error);
    }
};

/**
 * Get Payment Status
 * GET /api/v1/payments/status/:orderId
 */
const getPaymentStatus = async (req, res, next) => {
    try {
        const payment = await Payment.findOne({ orderId: req.params.orderId }).sort({ created_at: -1 });
        if (!payment) throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');

        return successResponse(res, payment, 'Payment status retrieved');
    } catch (error) {
        next(error);
    }
};

/**
 * Process Refund
 * POST /api/v1/payments/refund
 */
const processRefund = async (req, res, next) => {
    try {
        const { paymentId, amount, reason } = req.body;
        const userId = req.user?.id;

        const payment = await Payment.findById(paymentId);
        if (!payment) throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');

        if (payment.status !== 'completed') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Can only refund completed payments');
        }

        const refundResult = await RazorpayGateway.refund(
            payment.transactionId,
            amount || payment.amount,
            reason || 'Customer request'
        );

        if (!refundResult.success) throw new ApiError(httpStatus.BAD_REQUEST, 'Refund failed');

        const refund = await Refund.create({
            orderId: payment.orderId,
            paymentId: payment._id,
            amount: amount || payment.amount,
            reason: reason || 'Customer request',
            refundTransactionId: refundResult.refundId,
            status: 'completed',
            createdBy: userId
        });

        payment.status = 'refunded';
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
            order.status = 'refunded';
            await order.save();
        }

        return successResponse(res, refund, 'Refund processed');
    } catch (error) {
        next(error);
    }
};

/**
 * Get Payment History
 */
const getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await Payment.find({ orderId: req.params.orderId }).sort({ created_at: -1 });
        return successResponse(res, payments);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    initiatePayment,
    verifyPayment,
    getPaymentStatus,
    processRefund,
    getPaymentHistory,
};
