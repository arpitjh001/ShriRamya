const httpStatus = require('http-status');

const shipmentService = require('../services/shipment.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');

const getActor = (user = null) => ({
  userId: user?.id || user?.user_id || user?.sub || null,
  userType: user?.role === 'admin' ? 'admin' : 'customer',
});

const requireIdentifier = (value, label) => {
  if (value == null || !String(value).trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${label} is required`);
  }

  return String(value).trim();
};

const createShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.createShipment(
      {
        orderId: requireIdentifier(req.params.id || req.params.orderId, 'Order ID'),
        ...req.body,
      },
      getActor(req.user)
    );

    return successResponse(res, shipment, shipment.message, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const getShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.getShipment(requireIdentifier(req.params.id, 'Shipment ID'));
    return successResponse(res, shipment);
  } catch (error) {
    next(error);
  }
};

const getOrderShipments = async (req, res, next) => {
  try {
    const shipments = await shipmentService.getOrderShipments(requireIdentifier(req.params.id || req.params.orderId, 'Order ID'));
    return successResponse(res, shipments);
  } catch (error) {
    next(error);
  }
};

const updateTracking = async (req, res, next) => {
  try {
    const shipment = await shipmentService.updateTracking(
      requireIdentifier(req.params.id, 'Shipment ID'),
      req.body,
      getActor(req.user)
    );

    return successResponse(res, shipment, shipment.message);
  } catch (error) {
    next(error);
  }
};

const markAsShipped = async (req, res, next) => {
  try {
    const shipment = await shipmentService.markAsShipped(requireIdentifier(req.params.id, 'Shipment ID'), getActor(req.user));
    return successResponse(res, shipment, shipment.message);
  } catch (error) {
    next(error);
  }
};

const markAsDelivered = async (req, res, next) => {
  try {
    const shipment = await shipmentService.markAsDelivered(requireIdentifier(req.params.id, 'Shipment ID'), getActor(req.user));
    return successResponse(res, shipment, shipment.message);
  } catch (error) {
    next(error);
  }
};

const syncShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.syncShipment(requireIdentifier(req.params.id, 'Shipment ID'), getActor(req.user));
    return successResponse(res, shipment, shipment.message);
  } catch (error) {
    next(error);
  }
};

const cancelShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.cancelShipment(requireIdentifier(req.params.id, 'Shipment ID'), getActor(req.user));
    return successResponse(res, shipment, shipment.message);
  } catch (error) {
    next(error);
  }
};

const getOrderTracking = async (req, res, next) => {
  try {
    const tracking = await shipmentService.getOrderTracking(
      requireIdentifier(req.params.id || req.params.orderId, 'Order ID'),
      getActor(req.user)
    );

    return successResponse(res, tracking);
  } catch (error) {
    next(error);
  }
};

const getAllShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.getAllShipments(req.query || {});
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

const getReadyToShip = async (req, res, next) => {
  try {
    const orders = await shipmentService.getReadyToShip();
    return successResponse(res, orders);
  } catch (error) {
    next(error);
  }
};

const getPendingShipments = async (req, res, next) => {
  try {
    const shipments = await shipmentService.getPendingShipments();
    return successResponse(res, shipments);
  } catch (error) {
    next(error);
  }
};

const deleteShipment = async (req, res, next) => {
  try {
    const result = await shipmentService.deleteShipment(requireIdentifier(req.params.id, 'Shipment ID'), getActor(req.user));
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getXpressbeesCouriers = async (req, res, next) => {
  try {
    const couriers = await shipmentService.listXpressbeesCouriers();
    return successResponse(res, couriers);
  } catch (error) {
    next(error);
  }
};

const checkXpressbeesServiceability = async (req, res, next) => {
  try {
    const serviceability = await shipmentService.checkXpressbeesServiceability(req.body || {});
    return successResponse(res, serviceability);
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
  syncShipment,
  cancelShipment,
  getOrderTracking,
  getAllShipments,
  getReadyToShip,
  getPendingShipments,
  deleteShipment,
  getXpressbeesCouriers,
  checkXpressbeesServiceability,
};
