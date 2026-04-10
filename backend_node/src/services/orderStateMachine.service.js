const Order = require('../models/order.model');
const orderMongoRepository = require('../repositories/order.mongo.repository');
const orderEventService = require('./events/orderEvent.service');
const { variantInventoryService } = require('./variant-inventory.service');
const mongoose = require('mongoose');

const ORDER_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PAYMENT_FAILED: 'payment_failed',
    PAID: 'paid',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

const FULFILLMENT_STATUS = {
    UNFULFILLED: 'unfulfilled',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered'
};

const VALID_TRANSITIONS = {
    [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_FAILED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAYMENT_FAILED]: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: []
};

const STATUS_DESCRIPTIONS = {
    [ORDER_STATUS.PENDING_PAYMENT]: 'Order created, awaiting payment',
    [ORDER_STATUS.PAYMENT_FAILED]: 'Payment attempt failed',
    [ORDER_STATUS.PAID]: 'Payment received successfully',
    [ORDER_STATUS.PROCESSING]: 'Order is being prepared for shipment',
    [ORDER_STATUS.SHIPPED]: 'Order has been shipped',
    [ORDER_STATUS.DELIVERED]: 'Order has been delivered to customer',
    [ORDER_STATUS.CANCELLED]: 'Order has been cancelled',
    [ORDER_STATUS.REFUNDED]: 'Order has been refunded'
};

class OrderStateMachine {
    isValidTransition(currentStatus, newStatus) {
        if (!VALID_TRANSITIONS[currentStatus]) return false;
        return VALID_TRANSITIONS[currentStatus].includes(newStatus);
    }

    getAllowedTransitions(status) {
        return VALID_TRANSITIONS[status] || [];
    }

    async getOrder(orderId) {
        return await orderMongoRepository.getOrder(orderId);
    }

    async transitionStatus(orderId, newStatus, options = {}) {
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        const currentStatus = order.status;
        if (!this.isValidTransition(currentStatus, newStatus)) {
            const error = new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
            error.statusCode = 400;
            throw error;
        }

        order.status = newStatus;
        
        const timestampMap = {
            [ORDER_STATUS.PAID]: 'paid_at',
            [ORDER_STATUS.SHIPPED]: 'shipped_at',
            [ORDER_STATUS.DELIVERED]: 'delivered_at',
            [ORDER_STATUS.CANCELLED]: 'cancelled_at'
        };
        if (timestampMap[newStatus]) order[timestampMap[newStatus]] = new Date();

        if (newStatus === ORDER_STATUS.PAID) {
            order.payment_status = PAYMENT_STATUS.PAID;
            await this.reduceOrderStock(order);
        } else if (newStatus === ORDER_STATUS.REFUNDED) {
            order.payment_status = PAYMENT_STATUS.REFUNDED;
        }

        const fulfillmentMap = {
            [ORDER_STATUS.PROCESSING]: FULFILLMENT_STATUS.PROCESSING,
            [ORDER_STATUS.SHIPPED]: FULFILLMENT_STATUS.SHIPPED,
            [ORDER_STATUS.DELIVERED]: FULFILLMENT_STATUS.DELIVERED,
            [ORDER_STATUS.CANCELLED]: FULFILLMENT_STATUS.UNFULFILLED
        };
        if (fulfillmentMap[newStatus]) order.fulfillment_status = fulfillmentMap[newStatus];

        const historyEntry = {
            old_status: currentStatus,
            new_status: newStatus,
            status_type: 'order',
            changed_by: options.userId || null,
            changed_by_type: options.userType || 'system',
            reason: options.reason || null
        };
        order.status_history.push(historyEntry);

        await order.save();
        
        await orderEventService.logEvent(
            orderId,
            this.getEventTypeForStatus(newStatus),
            STATUS_DESCRIPTIONS[newStatus],
            { oldStatus: currentStatus, newStatus, ...options.metadata },
            options.userId,
            options.userType || 'system'
        );

        return order;
    }

    getEventTypeForStatus(status) {
        const eventMap = {
            [ORDER_STATUS.PENDING_PAYMENT]: 'order_created',
            [ORDER_STATUS.PAID]: 'payment_success',
            [ORDER_STATUS.PAYMENT_FAILED]: 'payment_failed',
            [ORDER_STATUS.PROCESSING]: 'order_processing',
            [ORDER_STATUS.SHIPPED]: 'order_shipped',
            [ORDER_STATUS.DELIVERED]: 'order_delivered',
            [ORDER_STATUS.CANCELLED]: 'order_cancelled',
            [ORDER_STATUS.REFUNDED]: 'order_refunded'
        };
        return eventMap[status] || 'order_updated';
    }

    async reduceOrderStock(order) {
        for (const item of order.items) {
            if (item.variantId) {
                await variantInventoryService.reduceStock(item.variantId, item.quantity);
            }
        }
    }

    async cancelOrder(orderId, options = {}) {
        const order = await this.getOrder(orderId);
        if (!order) throw new Error('Order not found');
        return await this.transitionStatus(orderId, ORDER_STATUS.CANCELLED, options);
    }
}

module.exports = new OrderStateMachine();
module.exports.ORDER_STATUS = ORDER_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
module.exports.FULFILLMENT_STATUS = FULFILLMENT_STATUS;
