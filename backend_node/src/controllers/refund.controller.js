/**
 * Refund Controller
 * HTTP request handlers for refund operations
 */

const httpStatus = require('http-status');
const refundService = require('../services/refund.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');

/**
 * Validate ID parameter
 */
const validateId = (id, paramName = 'ID') => {
    const parsed = parseInt(id);
    if (isNaN(parsed) || parsed <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid ${paramName} ID`);
    }
    return parsed;
};

/**
 * Create refund request
 * POST /api/v1/orders/:orderId/refunds
 */
const createRefund = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { amount, reason, items } = req.body;

        const result = await refundService.createRefund(
            {
                orderId: validateId(orderId, 'Order'),
                amount,
                reason,
                items
            },
            {
                userId: req.user.id,
                userType: req.user.role === 'admin' ? 'admin' : 'customer'
            }
        );

        return successResponse(res, result, 'Refund request created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Get refund by ID
 * GET /api/v1/refunds/:id
 */
const getRefund = async (req, res, next) => {
    try {
        const refundId = validateId(req.params.id, 'Refund');
        const refund = await refundService.getRefund(refundId);
        return successResponse(res, refund);
    } catch (error) {
        next(error);
    }
};

/**
 * Get refunds for order
 * GET /api/v1/orders/:orderId/refunds
 */
const getOrderRefunds = async (req, res, next) => {
    try {
        const orderId = validateId(req.params.orderId, 'Order');
        const refunds = await refundService.getOrderRefunds(orderId);
        return successResponse(res, refunds);
    } catch (error) {
        next(error);
    }
};

/**
 * Approve refund (Admin)
 * POST /api/v1/admin/refunds/:id/approve
 */
const approveRefund = async (req, res, next) => {
    try {
        const result = await refundService.approveRefund(
            parseInt(req.params.id),
            { userId: req.user.id }
        );

        return successResponse(res, result, 'Refund approved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Process refund (Admin)
 * POST /api/v1/admin/refunds/:id/process
 */
const processRefund = async (req, res, next) => {
    try {
        const result = await refundService.processRefund(
            parseInt(req.params.id),
            { userId: req.user.id }
        );

        return successResponse(res, result, 'Refund processed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Reject refund (Admin)
 * POST /api/v1/admin/refunds/:id/reject
 */
const rejectRefund = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await refundService.rejectRefund(
            parseInt(req.params.id),
            { 
                userId: req.user.id,
                reason 
            }
        );

        return successResponse(res, result, 'Refund rejected');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createRefund,
    getRefund,
    getOrderRefunds,
    approveRefund,
    processRefund,
    rejectRefund
};
