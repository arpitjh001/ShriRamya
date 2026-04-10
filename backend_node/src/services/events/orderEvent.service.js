/**
 * Order Event Service
 * Handles order activity logging and event dispatching
 */

const { OrderEvent, Order } = require('../../models');

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
     */
    async logEvent(orderId, eventType, description, metadata = {}, userId = null, userType = 'system') {
        try {
            const eventCategory = getEventCategory(eventType);
            
            const event = await OrderEvent.create({
                orderId,
                eventType,
                eventCategory,
                description,
                metadata,
                userId,
                userType
            });
            return event;
        } catch (error) {
            console.error('Failed to log order event:', error);
            return null;
        }
    }

    /**
     * Get events for an order
     */
    async getOrderEvents(orderId, options = {}) {
        const { limit = 50, page = 1, eventType = null } = options;
        const skip = (page - 1) * limit;

        const filter = { orderId };
        if (eventType) {
            filter.eventType = eventType;
        }

        return await OrderEvent.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);
    }

    /**
     * Get order timeline (formatted events)
     */
    async getOrderTimeline(orderId) {
        const events = await this.getOrderEvents(orderId, { limit: 100 });
        
        return events.map(event => ({
            id: event._id,
            eventType: event.eventType,
            category: event.eventCategory,
            description: event.description,
            metadata: event.metadata,
            userId: event.userId,
            userType: event.userType,
            createdAt: event.created_at,
            icon: this._getEventIcon(event.eventType),
            color: this._getEventColor(event.eventCategory)
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
     * Get event statistics
     */
    async getEventStats(startDate, endDate) {
        return await OrderEvent.aggregate([
            {
                $match: {
                    created_at: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: {
                        eventType: '$eventType',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': -1, count: -1 }
            }
        ]);
    }
}

const service = new OrderEventService();
module.exports = service;
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
