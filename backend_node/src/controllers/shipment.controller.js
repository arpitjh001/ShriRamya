/**
 * Shipment Controller
 * HTTP request handlers for shipment operations
 */

const httpStatus = require('http-status');
const shipmentService = require('../services/shipment.service');
const { successResponse } = require('../utils/response');

/**
 * Create shipment
 * POST /api/v1/admin/orders/:orderId/shipments
 */
const createShipment = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { carrier, trackingNumber, trackingUrl, shippingMethod, shippingWeight, shippingDimensions } = req.body;

        const shipment = await shipmentService.createShipment(
            {
                orderId: parseInt(orderId),
                carrier,
                trackingNumber,
                trackingUrl,
                shippingMethod,
                shippingWeight,
                shippingDimensions
            },
            {
                userId: req.user.id,
                userType: req.user.role === 'admin' ? 'admin' : 'customer'
            }
        );

        return successResponse(res, shipment, 'Shipment created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Get shipment by ID
 * GET /api/v1/shipments/:id
 */
const getShipment = async (req, res, next) => {
    try {
        const shipment = await shipmentService.getShipment(parseInt(req.params.id));
        return successResponse(res, shipment);
    } catch (error) {
        next(error);
    }
};

/**
 * Get shipments for an order
 * GET /api/v1/orders/:orderId/shipments
 */
const getOrderShipments = async (req, res, next) => {
    try {
        const shipments = await shipmentService.getOrderShipments(parseInt(req.params.orderId));
        return successResponse(res, shipments);
    } catch (error) {
        next(error);
    }
};

/**
 * Update tracking information
 * PATCH /api/v1/shipments/:id/tracking
 */
const updateTracking = async (req, res, next) => {
    try {
        const { carrier, trackingNumber, trackingUrl } = req.body;
        
        const shipment = await shipmentService.updateTracking(
            parseInt(req.params.id),
            { carrier, trackingNumber, trackingUrl },
            { userId: req.user.id, userType: 'admin' }
        );

        return successResponse(res, shipment, 'Tracking information updated');
    } catch (error) {
        next(error);
    }
};

/**
 * Mark shipment as shipped
 * POST /api/v1/shipments/:id/ship
 */
const markAsShipped = async (req, res, next) => {
    try {
        const shipment = await shipmentService.markAsShipped(
            parseInt(req.params.id),
            { userId: req.user.id, userType: 'admin' }
        );

        return successResponse(res, shipment, 'Shipment marked as shipped');
    } catch (error) {
        next(error);
    }
};

/**
 * Mark shipment as delivered
 * POST /api/v1/shipments/:id/deliver
 */
const markAsDelivered = async (req, res, next) => {
    try {
        const shipment = await shipmentService.markAsDelivered(
            parseInt(req.params.id),
            { userId: req.user.id, userType: 'admin' }
        );

        return successResponse(res, shipment, 'Shipment marked as delivered');
    } catch (error) {
        next(error);
    }
};

/**
 * Get order tracking
 * GET /api/v1/orders/:orderId/tracking
 */
const getOrderTracking = async (req, res, next) => {
    try {
        const tracking = await shipmentService.getOrderTracking(parseInt(req.params.orderId));
        return successResponse(res, tracking);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all shipments (Admin)
 * GET /api/v1/admin/shipments
 */
const getAllShipments = async (req, res, next) => {
    try {
        const { page, limit, status, carrier } = req.query;
        
        const result = await shipmentService.getAllShipments({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            status,
            carrier
        });

        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get ready to ship orders
 * GET /api/v1/admin/shipments/ready-to-ship
 */
const getReadyToShip = async (req, res, next) => {
    try {
        const orders = await shipmentService.getReadyToShip();
        return successResponse(res, orders);
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending shipments
 * GET /api/v1/admin/shipments/pending
 */
const getPendingShipments = async (req, res, next) => {
    try {
        const shipments = await shipmentService.getPendingShipments();
        return successResponse(res, shipments);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete shipment
 * DELETE /api/v1/shipments/:id
 */
const deleteShipment = async (req, res, next) => {
    try {
        const result = await shipmentService.deleteShipment(
            parseInt(req.params.id),
            { userId: req.user.id, userType: 'admin' }
        );

        return successResponse(res, result, 'Shipment deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createShipment,
    getShipment,
    getOrderShipments,
    updateTracking,
    markAsShipped,
    markAsDelivered,
    getOrderTracking,
    getAllShipments,
    getReadyToShip,
    getPendingShipments,
    deleteShipment
};
