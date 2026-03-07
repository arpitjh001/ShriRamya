/**
 * Fraud Detection Controller
 * Admin fraud detection management
 */

const fraudDetectionService = require('../services/fraud/fraudDetection.service');
const { successResponse } = require('../utils/response');

/**
 * Get flagged orders
 * GET /api/v1/admin/fraud/flagged-orders
 */
const getFlaggedOrders = async (req, res, next) => {
  try {
    const result = await fraudDetectionService.getFlaggedOrders(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Unflag an order (admin only)
 * POST /api/v1/admin/fraud/orders/:id/unflag
 */
const unflagOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body;
    
    await fraudDetectionService.unflagOrder(id, adminId, notes);
    return successResponse(res, { success: true }, 'Order unflagged successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get fraud statistics
 * GET /api/v1/admin/fraud/statistics
 */
const getFraudStatistics = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();
    
    const stats = await fraudDetectionService.getFraudStats(startDate, endDate);
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFlaggedOrders,
  unflagOrder,
  getFraudStatistics
};
