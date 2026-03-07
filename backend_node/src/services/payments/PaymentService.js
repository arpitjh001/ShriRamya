/**
 * Payment Service
 * Central payment orchestration layer with dynamic gateway selection
 */

const RazorpayGateway = require('./RazorpayGateway');
const StripeGateway = require('./StripeGateway');
const CashOnDelivery = require('./CashOnDelivery');
const { mysqlPool } = require('../../config/db');

/**
 * Payment Methods
 */
const PAYMENT_METHODS = {
    RAZORPAY: 'razorpay',
    STRIPE: 'stripe',
    COD: 'cod',
    CARD: 'card',
    UPI: 'upi',
    NETBANKING: 'netbanking',
    WALLET: 'wallet'
};

/**
 * Payment Status
 */
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
};

/**
 * Gateway Mapper - Maps payment method to gateway
 */
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
    /**
     * Get gateway for payment method
     * @param {string} method - Payment method
     * @returns {Object}
     */
    getGateway(method) {
        const gateway = GATEWAY_MAP[method.toLowerCase()];
        if (!gateway) {
            throw new Error(`Unsupported payment method: ${method}`);
        }
        return gateway;
    }

    /**
     * Process payment
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>}
     */
    async processPayment(paymentData) {
        const {
            orderId,
            orderNumber,
            userId,
            amount,
            currency = 'INR',
            method,
            receipt
        } = paymentData;

        // Validate amount
        if (!amount || amount <= 0) {
            throw new Error('Invalid payment amount');
        }

        // Get gateway
        const gateway = this.getGateway(method);

        // Prepare order data for gateway
        const gatewayOrderData = {
            orderId,
            orderNumber,
            userId,
            amount,
            currency,
            receipt: receipt || `order_${orderId}_${Date.now()}`
        };

        // Create payment with gateway
        const result = await gateway.createPayment(gatewayOrderData);

        if (!result.success) {
            // Log failed payment attempt
            await this.logPaymentAttempt(orderId, method, amount, 'failed', result.error);
            throw new Error(result.error || 'Payment failed');
        }

        // Store payment record in database
        const paymentRecord = await this.createPaymentRecord({
            orderId,
            orderNumber,
            userId,
            amount,
            currency,
            method,
            gateway: gateway.gatewayName || method,
            transactionId: result.transactionId || result.orderId || result.paymentIntentId,
            status: PAYMENT_STATUS.PENDING,
            gatewayResponse: result
        });

        // Log successful payment attempt
        await this.logPaymentAttempt(orderId, method, amount, 'pending', null, paymentRecord.id);

        return {
            success: true,
            paymentId: paymentRecord.id,
            transactionId: result.transactionId || result.orderId || result.paymentIntentId,
            amount,
            currency,
            method,
            gatewayData: result,
            message: 'Payment initiated successfully'
        };
    }

    /**
     * Create payment record in database
     */
    async createPaymentRecord(paymentData) {
        const [result] = await mysqlPool.query(
            `INSERT INTO payments 
            (order_id, order_number, user_id, amount, currency, payment_method, 
             gateway, transaction_id, status, gateway_response)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                paymentData.orderId,
                paymentData.orderNumber,
                paymentData.userId,
                paymentData.amount,
                paymentData.currency,
                paymentData.method,
                paymentData.gateway,
                paymentData.transactionId,
                paymentData.status,
                JSON.stringify(paymentData.gatewayResponse)
            ]
        );

        return {
            id: result.insertId,
            ...paymentData
        };
    }

    /**
     * Log payment attempt
     */
    async logPaymentAttempt(orderId, method, amount, status, error = null, paymentId = null) {
        await mysqlPool.query(
            `INSERT INTO payment_logs 
            (order_id, payment_id, payment_method, amount, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, paymentId, method, amount, status, error]
        );
    }

    /**
     * Verify payment (for webhook/callback)
     * @param {Object} verificationData - Verification data
     * @returns {Promise<Object>}
     */
    async verifyPayment(verificationData) {
        const { method, ...verificationParams } = verificationData;
        const gateway = this.getGateway(method);

        // Verify with gateway
        const result = await gateway.verifyPayment(verificationParams);

        if (!result.success) {
            throw new Error(result.error || 'Payment verification failed');
        }

        // Update payment record
        await this.updatePaymentStatus(verificationParams.orderId, PAYMENT_STATUS.COMPLETED, {
            transactionId: result.transactionId,
            paidAt: result.paidAt || new Date()
        });

        // Update order payment status
        await this.updateOrderPaymentStatus(verificationParams.orderId, PAYMENT_STATUS.PAID);

        return {
            success: true,
            transactionId: result.transactionId,
            status: 'paid',
            amount: result.amount,
            paidAt: result.paidAt
        };
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(orderId, status, additionalData = {}) {
        const updateFields = ['status = ?', 'updated_at = NOW()'];
        const updateValues = [status];

        if (additionalData.transactionId) {
            updateFields.push('transaction_id = ?');
            updateValues.push(additionalData.transactionId);
        }

        if (additionalData.paidAt) {
            updateFields.push('paid_at = ?');
            updateValues.push(additionalData.paidAt);
        }

        updateValues.push(orderId);

        await mysqlPool.query(
            `UPDATE payments SET ${updateFields.join(', ')} WHERE order_id = ?`,
            updateValues
        );
    }

    /**
     * Update order payment status
     */
    async updateOrderPaymentStatus(orderId, paymentStatus) {
        await mysqlPool.query(
            `UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?`,
            [paymentStatus, orderId]
        );
    }

    /**
     * Process refund
     * @param {Object} refundData - Refund data
     * @returns {Promise<Object>}
     */
    async processRefund(refundData) {
        const {
            orderId,
            paymentId,
            amount,
            reason,
            method
        } = refundData;

        // Get payment record
        const payment = await this.getPaymentRecord(paymentId);
        if (!payment) {
            throw new Error('Payment record not found');
        }

        // Get gateway
        const gateway = this.getGateway(method || payment.payment_method);

        // Process refund with gateway
        const result = await gateway.refund(
            payment.transaction_id,
            amount,
            reason
        );

        if (!result.success) {
            throw new Error(result.error || 'Refund failed');
        }

        // Create refund record
        const refundRecord = await this.createRefundRecord({
            orderId,
            paymentId,
            amount,
            reason,
            refundTransactionId: result.refundId || result.id,
            gateway: gateway.gatewayName || method,
            status: result.status || 'pending'
        });

        // Update payment status
        await this.updatePaymentStatus(orderId, PAYMENT_STATUS.REFUNDED, {
            refundId: refundRecord.id
        });

        return {
            success: true,
            refundId: refundRecord.id,
            refundTransactionId: result.refundId || result.id,
            amount: result.amount,
            status: result.status,
            message: 'Refund processed successfully'
        };
    }

    /**
     * Create refund record
     */
    async createRefundRecord(refundData) {
        const [result] = await mysqlPool.query(
            `INSERT INTO refunds 
            (order_id, payment_id, amount, reason, refund_transaction_id, 
             payment_gateway, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                refundData.orderId,
                refundData.paymentId,
                refundData.amount,
                refundData.reason,
                refundData.refundTransactionId,
                refundData.gateway,
                refundData.status
            ]
        );

        return {
            id: result.insertId,
            ...refundData
        };
    }

    /**
     * Get payment record
     */
    async getPaymentRecord(paymentId) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM payments WHERE id = ?',
            [paymentId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get payment by order ID
     */
    async getPaymentByOrderId(orderId) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get payment logs
     */
    async getPaymentLogs(orderId, limit = 50) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM payment_logs WHERE order_id = ? ORDER BY created_at DESC LIMIT ?',
            [orderId, limit]
        );
        return rows;
    }
}

module.exports = new PaymentService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
