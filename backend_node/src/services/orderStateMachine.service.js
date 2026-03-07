/**
 * Order State Machine Service
 * Implements strict order lifecycle management similar to Shopify/Magento
 */

const { mysqlPool } = require('../config/db');
const orderEventService = require('./events/orderEvent.service');

/**
 * Order Status Constants
 */
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

/**
 * Payment Status Constants
 */
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

/**
 * Fulfillment Status Constants
 */
const FULFILLMENT_STATUS = {
    UNFULFILLED: 'unfulfilled',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered'
};

/**
 * Valid State Transitions
 * Defines which status can transition to which
 */
const VALID_TRANSITIONS = {
    [ORDER_STATUS.PENDING_PAYMENT]: [
        ORDER_STATUS.PAID,
        ORDER_STATUS.PAYMENT_FAILED,
        ORDER_STATUS.CANCELLED
    ],
    [ORDER_STATUS.PAYMENT_FAILED]: [
        ORDER_STATUS.PENDING_PAYMENT,
        ORDER_STATUS.CANCELLED
    ],
    [ORDER_STATUS.PAID]: [
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.CANCELLED,
        ORDER_STATUS.REFUNDED
    ],
    [ORDER_STATUS.PROCESSING]: [
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.CANCELLED
    ],
    [ORDER_STATUS.SHIPPED]: [
        ORDER_STATUS.DELIVERED
    ],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: []
};

/**
 * Status Change Descriptions
 */
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
    /**
     * Check if a status transition is valid
     * @param {string} currentStatus - Current order status
     * @param {string} newStatus - Desired new status
     * @returns {boolean}
     */
    isValidTransition(currentStatus, newStatus) {
        if (!VALID_TRANSITIONS[currentStatus]) {
            return false;
        }
        return VALID_TRANSITIONS[currentStatus].includes(newStatus);
    }

    /**
     * Get allowed transitions for a status
     * @param {string} status - Current order status
     * @returns {string[]}
     */
    getAllowedTransitions(status) {
        return VALID_TRANSITIONS[status] || [];
    }

    /**
     * Get order by ID
     * @param {number} orderId - Order ID
     * @returns {Promise<Object|null>}
     */
    async getOrder(orderId) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Transition order to a new status
     * @param {number} orderId - Order ID
     * @param {string} newStatus - New status
     * @param {Object} options - Options (userId, userType, reason, metadata)
     * @returns {Promise<Object>}
     */
    async transitionStatus(orderId, newStatus, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get current order
            const [rows] = await connection.query(
                'SELECT * FROM orders WHERE id = ? FOR UPDATE',
                [orderId]
            );

            if (rows.length === 0) {
                const error = new Error('Order not found');
                error.statusCode = 404;
                throw error;
            }

            const order = rows[0];
            const currentStatus = order.status;

            // Validate transition
            if (!this.isValidTransition(currentStatus, newStatus)) {
                const allowedTransitions = this.getAllowedTransitions(currentStatus);
                const error = new Error(
                    `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                    `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
                );
                error.statusCode = 400;
                throw error;
            }

            // Prepare update fields
            const updateFields = ['status = ?', 'updated_at = NOW()'];
            const updateValues = [newStatus];

            // Add timestamp fields based on status
            const timestampMap = {
                [ORDER_STATUS.PAID]: 'paid_at',
                [ORDER_STATUS.SHIPPED]: 'shipped_at',
                [ORDER_STATUS.DELIVERED]: 'delivered_at',
                [ORDER_STATUS.CANCELLED]: 'cancelled_at'
            };

            if (timestampMap[newStatus]) {
                updateFields.push(`${timestampMap[newStatus]} = NOW()`);
            }

            // Clear cancelled_at if order is being restored
            if (newStatus !== ORDER_STATUS.CANCELLED && order.cancelled_at) {
                updateFields.push('cancelled_at = NULL');
            }

            // Execute status update
            updateValues.push(orderId);
            await connection.query(
                `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            // Update payment status if needed
            if (newStatus === ORDER_STATUS.PAID) {
                await connection.query(
                    'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
                    [PAYMENT_STATUS.PAID, orderId]
                );
            } else if (newStatus === ORDER_STATUS.REFUNDED) {
                await connection.query(
                    'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
                    [PAYMENT_STATUS.REFUNDED, orderId]
                );
            }

            // Update fulfillment status if needed
            const fulfillmentMap = {
                [ORDER_STATUS.PROCESSING]: FULFILLMENT_STATUS.PROCESSING,
                [ORDER_STATUS.SHIPPED]: FULFILLMENT_STATUS.SHIPPED,
                [ORDER_STATUS.DELIVERED]: FULFILLMENT_STATUS.DELIVERED,
                [ORDER_STATUS.CANCELLED]: FULFILLMENT_STATUS.UNFULFILLED
            };

            if (fulfillmentMap[newStatus]) {
                await connection.query(
                    'UPDATE orders SET fulfillment_status = ?, updated_at = NOW() WHERE id = ?',
                    [fulfillmentMap[newStatus], orderId]
                );
            }

            // Record status history
            await connection.query(
                `INSERT INTO order_status_history 
                (order_id, old_status, new_status, status_type, changed_by, changed_by_type, reason)
                VALUES (?, ?, ?, 'order', ?, ?, ?)`,
                [
                    orderId,
                    currentStatus,
                    newStatus,
                    options.userId || null,
                    options.userType || 'system',
                    options.reason || null
                ]
            );

            // Create order event
            const eventType = this.getEventTypeForStatus(newStatus);
            await orderEventService.logEvent(
                orderId,
                eventType,
                STATUS_DESCRIPTIONS[newStatus],
                {
                    oldStatus: currentStatus,
                    newStatus,
                    ...options.metadata
                },
                options.userId,
                options.userType || 'system',
                connection
            );

            await connection.commit();

            // Return updated order
            return await this.getOrder(orderId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get event type for status
     * @param {string} status - Order status
     * @returns {string}
     */
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

    /**
     * Transition payment status
     * @param {number} orderId - Order ID
     * @param {string} newStatus - New payment status
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async transitionPaymentStatus(orderId, newStatus, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                'SELECT * FROM orders WHERE id = ? FOR UPDATE',
                [orderId]
            );

            if (rows.length === 0) {
                const error = new Error('Order not found');
                error.statusCode = 404;
                throw error;
            }

            const order = rows[0];

            // Validate payment status transition
            const validPaymentTransitions = {
                [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
                [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED],
                [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING],
                [PAYMENT_STATUS.REFUNDED]: []
            };

            if (!validPaymentTransitions[order.payment_status]?.includes(newStatus)) {
                const error = new Error(`Invalid payment status transition`);
                error.statusCode = 400;
                throw error;
            }

            await connection.query(
                'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
                [newStatus, orderId]
            );

            // Record in history
            await connection.query(
                `INSERT INTO order_status_history 
                (order_id, old_status, new_status, status_type, changed_by, changed_by_type, reason)
                VALUES (?, ?, ?, 'payment', ?, ?, ?)`,
                [
                    orderId,
                    order.payment_status,
                    newStatus,
                    options.userId || null,
                    options.userType || 'system',
                    options.reason || null
                ]
            );

            // Log event
            const eventType = newStatus === PAYMENT_STATUS.PAID ? 'payment_success' :
                             newStatus === PAYMENT_STATUS.FAILED ? 'payment_failed' :
                             newStatus === PAYMENT_STATUS.REFUNDED ? 'order_refunded' : 'payment_updated';
            
            await orderEventService.logEvent(
                orderId,
                eventType,
                `Payment status changed to ${newStatus}`,
                { oldStatus: order.payment_status, newStatus },
                options.userId,
                options.userType || 'system',
                connection
            );

            await connection.commit();
            return await this.getOrder(orderId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Transition fulfillment status
     * @param {number} orderId - Order ID
     * @param {string} newStatus - New fulfillment status
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async transitionFulfillmentStatus(orderId, newStatus, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                'SELECT * FROM orders WHERE id = ? FOR UPDATE',
                [orderId]
            );

            if (rows.length === 0) {
                const error = new Error('Order not found');
                error.statusCode = 404;
                throw error;
            }

            const order = rows[0];

            // Validate fulfillment status transition
            const validFulfillmentTransitions = {
                [FULFILLMENT_STATUS.UNFULFILLED]: [FULFILLMENT_STATUS.PROCESSING, FULFILLMENT_STATUS.SHIPPED],
                [FULFILLMENT_STATUS.PROCESSING]: [FULFILLMENT_STATUS.SHIPPED],
                [FULFILLMENT_STATUS.SHIPPED]: [FULFILLMENT_STATUS.DELIVERED],
                [FULFILLMENT_STATUS.DELIVERED]: []
            };

            if (!validFulfillmentTransitions[order.fulfillment_status]?.includes(newStatus)) {
                const error = new Error(`Invalid fulfillment status transition`);
                error.statusCode = 400;
                throw error;
            }

            const updateFields = ['fulfillment_status = ?', 'updated_at = NOW()'];
            const updateValues = [newStatus];

            if (newStatus === FULFILLMENT_STATUS.DELIVERED) {
                updateFields.push('delivered_at = NOW()');
                // Also update order status to delivered
                updateFields.unshift('status = ?');
                updateValues.unshift(ORDER_STATUS.DELIVERED);
            }

            updateValues.push(orderId);
            await connection.query(
                `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            // Record in history
            await connection.query(
                `INSERT INTO order_status_history 
                (order_id, old_status, new_status, status_type, changed_by, changed_by_type, reason)
                VALUES (?, ?, ?, 'fulfillment', ?, ?, ?)`,
                [
                    orderId,
                    order.fulfillment_status,
                    newStatus,
                    options.userId || null,
                    options.userType || 'system',
                    options.reason || null
                ]
            );

            // Log event
            const eventType = newStatus === FULFILLMENT_STATUS.SHIPPED ? 'order_shipped' :
                             newStatus === FULFILLMENT_STATUS.DELIVERED ? 'order_delivered' : 'fulfillment_updated';
            
            await orderEventService.logEvent(
                orderId,
                eventType,
                `Fulfillment status changed to ${newStatus}`,
                { oldStatus: order.fulfillment_status, newStatus },
                options.userId,
                options.userType || 'system',
                connection
            );

            await connection.commit();
            return await this.getOrder(orderId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Cancel order (with validation)
     * @param {number} orderId - Order ID
     * @param {Object} options - Options (userId, reason)
     * @returns {Promise<Object>}
     */
    async cancelOrder(orderId, options = {}) {
        const order = await this.getOrder(orderId);
        
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if order can be cancelled
        const cancellableStatuses = [
            ORDER_STATUS.PENDING_PAYMENT,
            ORDER_STATUS.PAYMENT_FAILED,
            ORDER_STATUS.PAID,
            ORDER_STATUS.PROCESSING
        ];

        if (!cancellableStatuses.includes(order.status)) {
            const error = new Error(
                `Order cannot be cancelled in ${order.status} status. ` +
                `Only orders in ${cancellableStatuses.join(', ')} can be cancelled.`
            );
            error.statusCode = 400;
            throw error;
        }

        return await this.transitionStatus(orderId, ORDER_STATUS.CANCELLED, {
            ...options,
            reason: options.reason || 'Customer requested cancellation'
        });
    }
}

module.exports = new OrderStateMachine();
module.exports.ORDER_STATUS = ORDER_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
module.exports.FULFILLMENT_STATUS = FULFILLMENT_STATUS;
