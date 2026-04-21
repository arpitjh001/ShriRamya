/**
 * Refund Service
 * Handles processing and tracking of order refunds
 */

const { Refund, Order, User, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const orderStateMachine = require('../services/orderStateMachine.service');
const orderEventService = require('../services/events/orderEvent.service');
const { ORDER_STATUS } = require('../services/orderStateMachine.service');

class RefundService {
    /**
     * Create a refund request
     */
    async createRefund(refundData, options = {}) {
        const { orderId, amount, reason, items = [] } = refundData;

        const order = await Order.findById(orderId);
        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        // Validate refund amount
        const existingRefunds = await Refund.find({ orderId, status: { $ne: 'rejected' } });
        const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

        if (totalRefunded + amount > order.total_amount) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Refund amount exceeds order total');
        }

        const refund = await Refund.create({
            orderId,
            userId: order.userId,
            amount,
            reason,
            refundItems: items,
            status: 'pending'
        });

        // Log event
        if (orderEventService && orderEventService.logEvent) {
            await orderEventService.logEvent(
                orderId,
                'refund_requested',
                `Refund of ${amount} requested`,
                { refundId: refund._id, amount, reason },
                options.userId,
                options.userType || 'customer'
            );
        }

        return refund;
    }

    /**
     * Get refund by ID
     */
    async getRefundById(id) {
        const refund = await Refund.findById(id).populate('orderId').populate('userId');
        if (!refund) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Refund not found');
        }
        return refund;
    }

    /**
     * Approve refund (Admin)
     */
    async approveRefund(refundId, options = {}) {
        const refund = await Refund.findById(refundId);
        if (!refund) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Refund not found');
        }

        if (refund.status !== 'pending') {
            throw new ApiError(httpStatus.BAD_REQUEST, `Refund cannot be approved in ${refund.status} status`);
        }

        refund.status = 'approved';
        await refund.save();

        // Log event
        if (orderEventService && orderEventService.logEvent) {
            await orderEventService.logEvent(
                refund.orderId,
                'refund_approved',
                `Refund of ${refund.amount} approved`,
                { refundId, amount: refund.amount },
                options.userId,
                'admin'
            );
        }

        return refund;
    }

    /**
     * Process refund (execute payment gateway refund)
     */
    async processRefund(refundId, options = {}) {
        const refund = await Refund.findById(refundId);
        if (!refund) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Refund not found');
        }

        if (refund.status !== 'approved') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Refund must be approved before processing');
        }

        // Logic to communicate with payment gateway would go here
        const transactionId = `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        refund.status = 'completed';
        refund.transactionId = transactionId;
        refund.processed_at = new Date();
        await refund.save();

        // Update order status if full refund
        const existingRefunds = await Refund.find({ orderId: refund.orderId, status: 'completed' });
        const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

        const order = await Order.findById(refund.orderId);
        if (order && totalRefunded >= order.total_amount) {
            if (orderStateMachine && orderStateMachine.transitionStatus) {
                await orderStateMachine.transitionStatus(
                    refund.orderId,
                    ORDER_STATUS.REFUNDED,
                    { userId: options.userId, userType: 'admin' }
                );
            }
        }

        // Log event
        if (orderEventService && orderEventService.logEvent) {
            await orderEventService.logEvent(
                refund.orderId,
                'refund_completed',
                `Refund of ${refund.amount} processed successfully`,
                { 
                    refundId, 
                    amount: refund.amount,
                    transactionId
                },
                options.userId,
                'admin'
            );
        }

        return refund;
    }

    /**
     * Reject refund (Admin)
     */
    async rejectRefund(refundId, options = {}) {
        const refund = await Refund.findById(refundId);
        if (!refund) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Refund not found');
        }

        if (refund.status !== 'pending') {
            throw new ApiError(httpStatus.BAD_REQUEST, `Refund cannot be rejected in ${refund.status} status`);
        }

        refund.status = 'rejected';
        await refund.save();

        // Log event
        if (orderEventService && orderEventService.logEvent) {
            await orderEventService.logEvent(
                refund.orderId,
                'refund_rejected',
                `Refund of ${refund.amount} rejected`,
                { refundId, reason: options.reason },
                options.userId,
                'admin'
            );
        }

        return refund;
    }
}

module.exports = new RefundService();
