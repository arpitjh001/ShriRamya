/**
 * Refund Service
 * Handles refund processing with inventory restoration
 */

const { mysqlPool } = require('../config/db');
const orderStateMachine = require('../services/orderStateMachine.service');
const orderEventService = require('../services/events/orderEvent.service');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../services/orderStateMachine.service');
const RazorpayGateway = require('./payments/RazorpayGateway');
const StripeGateway = require('./payments/StripeGateway');

class RefundService {
    /**
     * Create refund request
     * @param {Object} refundData - Refund data
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async createRefund(refundData, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            const {
                orderId,
                amount,
                reason,
                items = [] // Array of { orderItemId, quantity, reason }
            } = refundData;

            // Get order
            const order = await orderStateMachine.getOrder(orderId);
            if (!order) {
                const error = new Error('Order not found');
                error.statusCode = 404;
                throw error;
            }

            // Validate order can be refunded
            if (![ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
                const error = new Error(`Order cannot be refunded in ${order.status} status`);
                error.statusCode = 400;
                throw error;
            }

            // Validate refund amount
            if (amount <= 0 || amount > parseFloat(order.grand_total)) {
                const error = new Error('Invalid refund amount');
                error.statusCode = 400;
                throw error;
            }

            // Check existing refunds
            const [existingRefunds] = await connection.query(
                'SELECT COALESCE(SUM(amount), 0) as totalRefunded FROM refunds WHERE order_id = ? AND status != ?',
                [orderId, 'rejected']
            );
            const totalRefunded = parseFloat(existingRefunds[0].totalRefunded);

            if (totalRefunded + amount > parseFloat(order.grand_total)) {
                const error = new Error('Refund amount exceeds order total');
                error.statusCode = 400;
                throw error;
            }

            // Create refund record
            const [result] = await connection.query(
                `INSERT INTO refunds 
                (order_id, amount, reason, status, processed_by)
                VALUES (?, ?, ?, ?, ?)`,
                [orderId, amount, reason, 'pending', options.userId || null]
            );

            const refundId = result.insertId;

            // Create refund items if provided
            for (const item of items) {
                await connection.query(
                    `INSERT INTO refund_items (refund_id, order_item_id, quantity, amount, reason)
                     VALUES (?, ?, ?, ?, ?)`,
                    [refundId, item.orderItemId, item.quantity, item.amount || 0, item.reason || reason]
                );
            }

            // Log event
            await orderEventService.logEvent(
                orderId,
                'refund_requested',
                `Refund of ₹${amount} requested`,
                { refundId, amount, reason },
                options.userId,
                options.userType || 'customer',
                connection
            );

            await connection.commit();

            return {
                success: true,
                refundId,
                message: 'Refund request created successfully'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Approve refund (Admin)
     * @param {number} refundId - Refund ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async approveRefund(refundId, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get refund
            const [refunds] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );

            if (refunds.length === 0) {
                const error = new Error('Refund not found');
                error.statusCode = 404;
                throw error;
            }

            const refund = refunds[0];

            if (refund.status !== 'pending') {
                const error = new Error(`Refund cannot be approved in ${refund.status} status`);
                error.statusCode = 400;
                throw error;
            }

            // Update refund status
            await connection.query(
                'UPDATE refunds SET status = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
                ['approved', options.userId || null, refundId]
            );

            // Log event
            await orderEventService.logEvent(
                refund.order_id,
                'refund_approved',
                `Refund of ₹${refund.amount} approved`,
                { refundId, amount: refund.amount },
                options.userId,
                'admin',
                connection
            );

            await connection.commit();

            return {
                success: true,
                message: 'Refund approved successfully'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Process refund (execute payment gateway refund)
     * @param {number} refundId - Refund ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async processRefund(refundId, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get refund
            const [refunds] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );

            if (refunds.length === 0) {
                const error = new Error('Refund not found');
                error.statusCode = 404;
                throw error;
            }

            const refund = refunds[0];

            if (refund.status !== 'approved') {
                const error = new Error('Refund must be approved before processing');
                error.statusCode = 400;
                throw error;
            }

            // Get payment record
            const [payments] = await connection.query(
                'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
                [refund.order_id]
            );

            if (payments.length === 0) {
                const error = new Error('No payment record found for order');
                error.statusCode = 404;
                throw error;
            }

            const payment = payments[0];

            // Get gateway
            const gateway = this._getGateway(payment.payment_gateway);

            // Process refund with gateway
            const gatewayResult = await gateway.refund(
                payment.transaction_id,
                refund.amount,
                refund.reason
            );

            if (!gatewayResult.success) {
                throw new Error(gatewayResult.error || 'Gateway refund failed');
            }

            // Update refund record
            await connection.query(
                `UPDATE refunds 
                SET status = 'completed', 
                    refund_transaction_id = ?, 
                    payment_gateway = ?,
                    processed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?`,
                [gatewayResult.refundId || gatewayResult.id, payment.payment_gateway, refundId]
            );

            // Restore inventory for refunded items
            await this._restoreInventory(refund.order_id, refundId, connection);

            // Update order status if full refund
            const [refundTotal] = await connection.query(
                'SELECT SUM(amount) as totalRefunded FROM refunds WHERE order_id = ? AND status = ?',
                [refund.order_id, 'completed']
            );

            const [orderRows] = await connection.query(
                'SELECT grand_total FROM orders WHERE id = ?',
                [refund.order_id]
            );

            if (parseFloat(refundTotal[0].totalRefunded) >= parseFloat(orderRows[0].grand_total)) {
                // Full refund - update order status
                await orderStateMachine.transitionStatus(
                    refund.order_id,
                    ORDER_STATUS.REFUNDED,
                    { userId: options.userId, userType: 'admin' }
                );
            }

            // Log event
            await orderEventService.logEvent(
                refund.order_id,
                'refund_completed',
                `Refund of ₹${refund.amount} processed successfully`,
                { 
                    refundId, 
                    amount: refund.amount,
                    transactionId: gatewayResult.refundId 
                },
                options.userId,
                'admin',
                connection
            );

            await connection.commit();

            return {
                success: true,
                refundId,
                transactionId: gatewayResult.refundId,
                message: 'Refund processed successfully'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Reject refund (Admin)
     * @param {number} refundId - Refund ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async rejectRefund(refundId, options = {}) {
        const connection = await mysqlPool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [refunds] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );

            if (refunds.length === 0) {
                const error = new Error('Refund not found');
                error.statusCode = 404;
                throw error;
            }

            const refund = refunds[0];

            if (refund.status !== 'pending') {
                const error = new Error(`Refund cannot be rejected in ${refund.status} status`);
                error.statusCode = 400;
                throw error;
            }

            await connection.query(
                'UPDATE refunds SET status = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
                ['rejected', options.userId || null, refundId]
            );

            // Log event
            await orderEventService.logEvent(
                refund.order_id,
                'refund_rejected',
                `Refund of ₹${refund.amount} rejected`,
                { refundId, reason: options.reason },
                options.userId,
                'admin',
                connection
            );

            await connection.commit();

            return {
                success: true,
                message: 'Refund rejected'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Restore inventory for refunded items
     */
    async _restoreInventory(orderId, refundId, connection) {
        // Get refund items
        const [refundItems] = await connection.query(
            'SELECT * FROM refund_items WHERE refund_id = ?',
            [refundId]
        );

        for (const item of refundItems) {
            // Get variant info from order item
            const [orderItems] = await connection.query(
                'SELECT variant_id, quantity FROM order_items WHERE id = ?',
                [item.order_item_id]
            );

            if (orderItems.length > 0 && orderItems[0].variant_id) {
                const variantId = orderItems[0].variant_id;
                const quantityToRestore = item.quantity;

                // Update variant inventory
                await connection.query(
                    `UPDATE variant_inventory vi
                    SET stock_level = stock_level + ?
                    WHERE variant_id = ?`,
                    [quantityToRestore, variantId]
                );

                // Log inventory restoration
                await connection.query(
                    `INSERT INTO inventory_reservations 
                    (order_id, variant_id, quantity, status, released_at)
                    VALUES (?, ?, ?, 'released', NOW())
                    ON DUPLICATE KEY UPDATE status = 'released', released_at = NOW()`,
                    [orderId, variantId, -quantityToRestore] // Negative to indicate restoration
                );
            }
        }
    }

    /**
     * Get gateway instance
     */
    _getGateway(gatewayName) {
        if (gatewayName === 'razorpay') {
            return RazorpayGateway;
        } else if (gatewayName === 'stripe') {
            return new StripeGateway();
        }
        throw new Error(`Unsupported gateway: ${gatewayName}`);
    }

    /**
     * Get refund by ID
     */
    async getRefund(refundId) {
        const [refunds] = await mysqlPool.query(
            `SELECT r.*, o.order_number 
             FROM refunds r
             INNER JOIN orders o ON r.order_id = o.id
             WHERE r.id = ?`,
            [refundId]
        );

        if (refunds.length === 0) {
            const error = new Error('Refund not found');
            error.statusCode = 404;
            throw error;
        }

        const refund = refunds[0];

        // Get refund items
        const [items] = await mysqlPool.query(
            'SELECT ri.*, oi.product_name FROM refund_items ri INNER JOIN order_items oi ON ri.order_item_id = oi.id WHERE ri.refund_id = ?',
            [refundId]
        );

        return {
            ...refund,
            items
        };
    }

    /**
     * Get refunds for order
     */
    async getOrderRefunds(orderId) {
        const [refunds] = await mysqlPool.query(
            'SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC',
            [orderId]
        );

        return refunds;
    }
}

module.exports = new RefundService();
