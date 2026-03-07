/**
 * Shipment Service
 * Business logic for shipment management
 */

const shipmentRepository = require('../repositories/shipment.repository');
const orderStateMachine = require('../services/orderStateMachine.service');
const orderEventService = require('../services/events/orderEvent.service');
const { ORDER_STATUS, FULFILLMENT_STATUS } = require('../services/orderStateMachine.service');

class ShipmentService {
    /**
     * Create a new shipment
     * @param {Object} shipmentData - Shipment data
     * @param {Object} options - Options (userId, userType)
     * @returns {Promise<Object>}
     */
    async createShipment(shipmentData, options = {}) {
        const { orderId } = shipmentData;

        // Validate order exists and is in valid state
        const order = await orderStateMachine.getOrder(orderId);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if order can be shipped
        const shippableStatuses = [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING];
        if (!shippableStatuses.includes(order.status)) {
            const error = new Error(
                `Order cannot be shipped in ${order.status} status. ` +
                `Order must be in: ${shippableStatuses.join(', ')}`
            );
            error.statusCode = 400;
            throw error;
        }

        // Check if order already has a shipment
        const existingShipments = await shipmentRepository.getByOrderId(orderId);
        if (existingShipments.length > 0 && shipmentData.preventMultiple) {
            const error = new Error('Order already has a shipment');
            error.statusCode = 400;
            throw error;
        }

        // Create shipment
        const shipmentId = await shipmentRepository.create({
            ...shipmentData,
            status: shipmentData.trackingNumber ? 'shipped' : 'pending'
        });

        // Update order fulfillment status
        await orderStateMachine.transitionFulfillmentStatus(
            orderId,
            FULFILLMENT_STATUS.PROCESSING,
            { userId: options.userId, userType: options.userType || 'admin' }
        );

        // Update order status if needed
        if (order.status === ORDER_STATUS.PAID) {
            await orderStateMachine.transitionStatus(
                orderId,
                ORDER_STATUS.PROCESSING,
                { userId: options.userId, userType: options.userType || 'admin' }
            );
        }

        // Log event
        await orderEventService.logEvent(
            orderId,
            'shipment_created',
            `Shipment created for order ${order.order_number}`,
            { shipmentId, carrier: shipmentData.carrier },
            options.userId,
            options.userType || 'admin'
        );

        // Get created shipment
        const shipment = await shipmentRepository.getById(shipmentId);

        return {
            success: true,
            shipment,
            message: 'Shipment created successfully'
        };
    }

    /**
     * Get shipment by ID
     * @param {number} id - Shipment ID
     * @returns {Promise<Object>}
     */
    async getShipment(id) {
        const shipment = await shipmentRepository.getById(id);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        // Get shipment items
        const items = await shipmentRepository.getShipmentItems(id);

        return {
            ...shipment,
            items
        };
    }

    /**
     * Get shipments for an order
     * @param {number} orderId - Order ID
     * @returns {Promise<Object[]>}
     */
    async getOrderShipments(orderId) {
        const shipments = await shipmentRepository.getByOrderId(orderId);
        
        // Get items for each shipment
        const shipmentsWithItems = await Promise.all(
            shipments.map(async (shipment) => {
                const items = await shipmentRepository.getShipmentItems(shipment.id);
                return { ...shipment, items };
            })
        );

        return shipmentsWithItems;
    }

    /**
     * Update shipment tracking
     * @param {number} id - Shipment ID
     * @param {Object} trackingData - Tracking data
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async updateTracking(id, trackingData, options = {}) {
        const shipment = await shipmentRepository.getById(id);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        // Update tracking
        await shipmentRepository.update(id, {
            trackingNumber: trackingData.trackingNumber,
            trackingUrl: trackingData.trackingUrl,
            carrier: trackingData.carrier
        });

        // Log event
        await orderEventService.logEvent(
            shipment.order_id,
            'tracking_updated',
            `Tracking information updated for shipment ${shipment.id}`,
            { shipmentId: id, ...trackingData },
            options.userId,
            options.userType || 'admin'
        );

        const updatedShipment = await shipmentRepository.getById(id);
        return {
            success: true,
            shipment: updatedShipment,
            message: 'Tracking information updated'
        };
    }

    /**
     * Mark shipment as shipped
     * @param {number} id - Shipment ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async markAsShipped(id, options = {}) {
        const shipment = await shipmentRepository.getById(id);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        // Update shipment status
        await shipmentRepository.updateStatus(id, 'shipped');

        // Update order status
        await orderStateMachine.transitionFulfillmentStatus(
            shipment.order_id,
            FULFILLMENT_STATUS.SHIPPED,
            { userId: options.userId, userType: options.userType || 'admin' }
        );

        await orderStateMachine.transitionStatus(
            shipment.order_id,
            ORDER_STATUS.SHIPPED,
            { userId: options.userId, userType: options.userType || 'admin' }
        );

        // Log event
        await orderEventService.logEvent(
            shipment.order_id,
            'order_shipped',
            `Order shipped via ${shipment.carrier}`,
            { 
                shipmentId: id, 
                trackingNumber: shipment.tracking_number,
                carrier: shipment.carrier 
            },
            options.userId,
            options.userType || 'admin'
        );

        const updatedShipment = await shipmentRepository.getById(id);
        return {
            success: true,
            shipment: updatedShipment,
            message: 'Shipment marked as shipped'
        };
    }

    /**
     * Mark shipment as delivered
     * @param {number} id - Shipment ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async markAsDelivered(id, options = {}) {
        const shipment = await shipmentRepository.getById(id);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        // Update shipment status
        await shipmentRepository.updateStatus(id, 'delivered');

        // Update order status
        await orderStateMachine.transitionFulfillmentStatus(
            shipment.order_id,
            FULFILLMENT_STATUS.DELIVERED,
            { userId: options.userId, userType: options.userType || 'admin' }
        );

        await orderStateMachine.transitionStatus(
            shipment.order_id,
            ORDER_STATUS.DELIVERED,
            { userId: options.userId, userType: options.userType || 'admin' }
        );

        // Log event
        await orderEventService.logEvent(
            shipment.order_id,
            'order_delivered',
            `Order delivered successfully`,
            { shipmentId: id, trackingNumber: shipment.tracking_number },
            options.userId,
            options.userType || 'admin'
        );

        const updatedShipment = await shipmentRepository.getById(id);
        return {
            success: true,
            shipment: updatedShipment,
            message: 'Shipment marked as delivered'
        };
    }

    /**
     * Get tracking information for order
     * @param {number} orderId - Order ID
     * @returns {Promise<Object>}
     */
    async getOrderTracking(orderId) {
        const shipments = await shipmentRepository.getByOrderId(orderId);
        
        if (shipments.length === 0) {
            return {
                hasShipment: false,
                message: 'No shipment created for this order yet'
            };
        }

        // Get the latest shipment
        const latestShipment = shipments[0];
        const items = await shipmentRepository.getShipmentItems(latestShipment.id);

        return {
            hasShipment: true,
            shipment: {
                id: latestShipment.id,
                carrier: latestShipment.carrier,
                trackingNumber: latestShipment.tracking_number,
                trackingUrl: latestShipment.tracking_url,
                status: latestShipment.status,
                shippedAt: latestShipment.shipped_at,
                deliveredAt: latestShipment.delivered_at,
                createdAt: latestShipment.created_at
            },
            items
        };
    }

    /**
     * Get all shipments with pagination
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async getAllShipments(options = {}) {
        return await shipmentRepository.getAll(options);
    }

    /**
     * Get ready to ship orders
     * @returns {Promise<Object[]>}
     */
    async getReadyToShip() {
        return await shipmentRepository.getReadyToShip();
    }

    /**
     * Get pending shipments
     * @returns {Promise<Object[]>}
     */
    async getPendingShipments() {
        return await shipmentRepository.getPendingShipments();
    }

    /**
     * Delete shipment (only if not shipped)
     * @param {number} id - Shipment ID
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async deleteShipment(id, options = {}) {
        const shipment = await shipmentRepository.getById(id);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        // Can only delete pending shipments
        if (shipment.status !== 'pending') {
            const error = new Error('Cannot delete shipment that has been shipped');
            error.statusCode = 400;
            throw error;
        }

        await shipmentRepository.delete(id);

        // Log event
        await orderEventService.logEvent(
            shipment.order_id,
            'shipment_deleted',
            `Shipment ${id} was deleted`,
            { shipmentId: id },
            options.userId,
            options.userType || 'admin'
        );

        return {
            success: true,
            message: 'Shipment deleted successfully'
        };
    }
}

module.exports = new ShipmentService();
