/**
 * Order Event Service
 * Handles order activity logging and event dispatching
 */

const { mysqlPool } = require('../../config/db');
const emailService = require('../email/orderEmail.service');

/**
 * Event Types
 */
const EVENT_TYPES = {
    // Order Events
    ORDER_CREATED: 'order_created',
    ORDER_UPDATED: 'order_updated',
    ORDER_PROCESSING: 'order_processing',
    ORDER_CANCELLED: 'order_cancelled',
    
    // Payment Events
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_PENDING: 'payment_pending',
    
    // Fulfillment Events
    ORDER_SHIPPED: 'order_shipped',
    ORDER_DELIVERED: 'order_delivered',
    ORDER_OUT_FOR_DELIVERY: 'order_out_for_delivery',
    
    // Refund Events
    REFUND_REQUESTED: 'refund_requested',
    REFUND_APPROVED: 'refund_approved',
    REFUND_REJECTED: 'refund_rejected',
    REFUND_COMPLETED: 'refund_completed',
    
    // Inventory Events
    INVENTORY_RESERVED: 'inventory_reserved',
    INVENTORY_RELEASED: 'inventory_released',
    INVENTORY_CONFIRMED: 'inventory_confirmed'
};

/**
 * Event Categories
 */
const EVENT_CATEGORIES = {
    ORDER: 'order',
    PAYMENT: 'payment',
    FULFILLMENT: 'fulfillment',
    REFUND: 'refund',
    INVENTORY: 'inventory',
    SYSTEM: 'system'
};

/**
 * Get event category for event type
 */
function getEventCategory(eventType) {
    if (eventType.includes('payment')) return EVENT_CATEGORIES.PAYMENT;
    if (eventType.includes('refund')) return EVENT_CATEGORIES.REFUND;
    if (eventType.includes('inventory')) return EVENT_CATEGORIES.INVENTORY;
    if (eventType.includes('shipped') || eventType.includes('delivered')) return EVENT_CATEGORIES.FULFILLMENT;
    return EVENT_CATEGORIES.ORDER;
};

class OrderEventService {
    /**
     * Log an order event
     * @param {number} orderId - Order ID
     * @param {string} eventType - Event type
     * @param {string} description - Event description
     * @param {Object} metadata - Additional metadata (JSON)
     * @param {number} userId - User ID who triggered the event
     * @param {string} userType - User type (customer, admin, system)
     * @param {Object} connection - Optional DB connection for transactions
     * @returns {Promise<number>} Event ID
     */
    async logEvent(orderId, eventType, description, metadata = {}, userId = null, userType = 'system', connection = null) {
        const executor = connection || mysqlPool;
        
        const eventCategory = getEventCategory(eventType);
        
        const [result] = await executor.query(
            `INSERT INTO order_events 
            (order_id, event_type, event_category, description, metadata, user_id, user_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                eventType,
                eventCategory,
                description,
                JSON.stringify(metadata),
                userId,
                userType
            ]
        );

        // Dispatch event to email service (non-blocking)
        this._dispatchEvent(orderId, eventType, metadata).catch(err => {
            console.error(`Error dispatching event ${eventType}:`, err.message);
        });

        return result.insertId;
    }

    /**
     * Get events for an order
     * @param {number} orderId - Order ID
     * @param {Object} options - Options (limit, offset, eventType)
     * @returns {Promise<Object[]>}
     */
    async getOrderEvents(orderId, options = {}) {
        const { limit = 50, offset = 0, eventType = null } = options;
        
        let query = `
            SELECT * FROM order_events 
            WHERE order_id = ?
        `;
        const params = [orderId];

        if (eventType) {
            query += ' AND event_type = ?';
            params.push(eventType);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await mysqlPool.query(query, params);
        
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
    }

    /**
     * Get order timeline (formatted events)
     * @param {number} orderId - Order ID
     * @returns {Promise<Object[]>}
     */
    async getOrderTimeline(orderId) {
        const events = await this.getOrderEvents(orderId, { limit: 100 });
        
        return events.map(event => ({
            id: event.id,
            eventType: event.event_type,
            category: event.event_category,
            description: event.description,
            metadata: event.metadata,
            userId: event.user_id,
            userType: event.user_type,
            createdAt: event.created_at,
            icon: this._getEventIcon(event.event_type),
            color: this._getEventColor(event.event_category)
        }));
    }

    /**
     * Get icon for event type
     */
    _getEventIcon(eventType) {
        const iconMap = {
            [EVENT_TYPES.ORDER_CREATED]: '📦',
            [EVENT_TYPES.PAYMENT_SUCCESS]: '💳',
            [EVENT_TYPES.PAYMENT_FAILED]: '❌',
            [EVENT_TYPES.ORDER_SHIPPED]: '🚚',
            [EVENT_TYPES.ORDER_DELIVERED]: '✅',
            [EVENT_TYPES.ORDER_CANCELLED]: '🚫',
            [EVENT_TYPES.REFUND_REQUESTED]: '💰',
            [EVENT_TYPES.REFUND_COMPLETED]: '💵',
            [EVENT_TYPES.INVENTORY_RESERVED]: '🔒',
            [EVENT_TYPES.INVENTORY_RELEASED]: '🔓'
        };
        return iconMap[eventType] || '📝';
    }

    /**
     * Get color for event category
     */
    _getEventColor(category) {
        const colorMap = {
            [EVENT_CATEGORIES.ORDER]: 'blue',
            [EVENT_CATEGORIES.PAYMENT]: 'green',
            [EVENT_CATEGORIES.FULFILLMENT]: 'purple',
            [EVENT_CATEGORIES.REFUND]: 'orange',
            [EVENT_CATEGORIES.INVENTORY]: 'gray'
        };
        return colorMap[category] || 'gray';
    }

    /**
     * Dispatch event to handlers (email, notifications, etc.)
     */
    async _dispatchEvent(orderId, eventType, metadata) {
        // Get order details
        const [orderRows] = await mysqlPool.query(
            `SELECT o.*, u.email as customer_email 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?`,
            [orderId]
        );

        if (orderRows.length === 0) return;
        
        const order = orderRows[0];

        // Handle email notifications based on event type
        switch (eventType) {
            case EVENT_TYPES.ORDER_CREATED:
                await emailService.sendOrderConfirmation(order);
                break;
            case EVENT_TYPES.PAYMENT_SUCCESS:
                await emailService.sendPaymentConfirmation(order);
                break;
            case EVENT_TYPES.ORDER_SHIPPED:
                await emailService.sendShipmentNotification(order, metadata);
                break;
            case EVENT_TYPES.ORDER_DELIVERED:
                await emailService.sendDeliveryConfirmation(order);
                break;
            case EVENT_TYPES.ORDER_CANCELLED:
                await emailService.sendOrderCancellation(order);
                break;
            case EVENT_TYPES.REFUND_COMPLETED:
                await emailService.sendRefundConfirmation(order, metadata);
                break;
        }
    }

    /**
     * Get order statistics by event type
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>}
     */
    async getEventStats(startDate, endDate) {
        const [rows] = await mysqlPool.query(
            `SELECT 
                event_type,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM order_events
            WHERE created_at BETWEEN ? AND ?
            GROUP BY event_type, DATE(created_at)
            ORDER BY date DESC, count DESC`,
            [startDate, endDate]
        );

        return rows;
    }
}

module.exports = new OrderEventService();
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
