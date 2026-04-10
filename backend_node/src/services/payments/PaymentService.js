const RazorpayGateway = require('./RazorpayGateway');
const StripeGateway = require('./StripeGateway');
const CashOnDelivery = require('./CashOnDelivery');
const { Payment, PaymentLog } = require('../../models/payment.model');
const { Order } = require('../../models');
const mongoose = require('mongoose');

const PAYMENT_METHODS = {
    RAZORPAY: 'razorpay',
    STRIPE: 'stripe',
    COD: 'cod',
    CARD: 'card',
    UPI: 'upi',
    NETBANKING: 'netbanking',
    WALLET: 'wallet'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled',
    PAID: 'paid'
};

const GATEWAY_MAP = {
    [PAYMENT_METHODS.RAZORPAY]: RazorpayGateway,
    [PAYMENT_METHODS.CARD]: RazorpayGateway,
    [PAYMENT_METHODS.UPI]: RazorpayGateway,
    [PAYMENT_METHODS.NETBANKING]: RazorpayGateway,
    [PAYMENT_METHODS.WALLET]: RazorpayGateway,
    [PAYMENT_METHODS.STRIPE]: new StripeGateway(),
    [PAYMENT_METHODS.COD]: CashOnDelivery
};

class PaymentService {
    getGateway(method) {
        const gateway = GATEWAY_MAP[method.toLowerCase()];
        if (!gateway) throw new Error(`Unsupported payment method: ${method}`);
        return gateway;
    }

    async processPayment(paymentData) {
        const { orderId, orderNumber, userId, amount, currency = 'INR', method, receipt } = paymentData;
        const gateway = this.getGateway(method);

        const gatewayOrderData = {
            orderId, orderNumber, userId, amount, currency,
            receipt: receipt || `order_${orderId}_${Date.now()}`
        };

        const result = await gateway.createPayment(gatewayOrderData);

        if (!result.success) {
            await this.logPaymentAttempt(orderId, method, amount, 'failed', result.error);
            throw new Error(result.error || 'Payment failed');
        }

        const paymentRecord = await this.createPaymentRecord({
            orderId, orderNumber, userId, amount, currency,
            method, gateway: gateway.gatewayName || method,
            transactionId: result.transactionId || result.orderId || result.paymentIntentId,
            status: PAYMENT_STATUS.PENDING,
            gatewayResponse: result
        });

        await this.logPaymentAttempt(orderId, method, amount, 'pending', null, paymentRecord._id);

        return {
            success: true,
            paymentId: paymentRecord._id,
            transactionId: result.transactionId || result.orderId || result.paymentIntentId,
            amount, currency, method, gatewayData: result,
            message: 'Payment initiated successfully'
        };
    }

    async createPaymentRecord(paymentData) {
        const payment = new Payment({
            ...paymentData,
            payment_method: paymentData.method,
            gateway_response: paymentData.gatewayResponse
        });
        await payment.save();
        return payment;
    }

    async logPaymentAttempt(orderId, method, amount, status, error = null, paymentId = null) {
        const log = new PaymentLog({ orderId, paymentId, payment_method: method, amount, status, error_message: error });
        await log.save();
    }

    async verifyPayment(verificationData) {
        const { method, ...verificationParams } = verificationData;
        const gateway = this.getGateway(method);
        const result = await gateway.verifyPayment(verificationParams);

        if (!result.success) throw new Error(result.error || 'Payment verification failed');

        await this.updatePaymentStatus(verificationParams.orderId, PAYMENT_STATUS.COMPLETED, {
            transactionId: result.transactionId,
            paidAt: result.paidAt || new Date()
        });

        await this.updateOrderPaymentStatus(verificationParams.orderId, PAYMENT_STATUS.PAID);

        return {
            success: true,
            transactionId: result.transactionId,
            status: 'paid',
            amount: result.amount,
            paidAt: result.paidAt
        };
    }

    async updatePaymentStatus(orderId, status, additionalData = {}) {
        const update = { status, updated_at: new Date() };
        if (additionalData.transactionId) update.transactionId = additionalData.transactionId;
        if (additionalData.paidAt) update.paid_at = additionalData.paidAt;
        if (additionalData.refundId) update.refundId = additionalData.refundId;

        await Payment.updateOne({ orderId }, { $set: update });
    }

    async updateOrderPaymentStatus(orderId, paymentStatus) {
        await Order.updateOne({ orderId }, { $set: { paymentStatus: paymentStatus.toLowerCase() } });
    }

    async processRefund(refundData) {
        const { orderId, paymentId, amount, reason, method } = refundData;
        const payment = await Payment.findById(paymentId);
        if (!payment) throw new Error('Payment record not found');

        const gateway = this.getGateway(method || payment.payment_method);
        const result = await gateway.refund(payment.transactionId, amount, reason);

        if (!result.success) throw new Error(result.error || 'Refund failed');

        const refundRecord = { id: 'REF-' + Date.now(), ...refundData, status: result.status || 'completed' };

        await this.updatePaymentStatus(orderId, PAYMENT_STATUS.REFUNDED, { refundId: refundRecord.id });

        return {
            success: true,
            refundId: refundRecord.id,
            refundTransactionId: result.refundId || result.id,
            amount: result.amount,
            status: result.status,
            message: 'Refund processed successfully'
        };
    }

    async getPaymentRecord(paymentId) {
        return await Payment.findById(paymentId);
    }

    async getPaymentByOrderId(orderId) {
        return await Payment.findOne({ orderId }).sort({ created_at: -1 });
    }

    async getPaymentLogs(orderId, limit = 50) {
        return await PaymentLog.find({ orderId }).sort({ created_at: -1 }).limit(limit);
    }
}

module.exports = new PaymentService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
