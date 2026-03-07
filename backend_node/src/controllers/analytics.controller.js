/**
 * Analytics Controller
 * Admin analytics endpoints
 */

const analyticsService = require('../services/analytics/analytics.service');
const { successResponse } = require('../utils/response');

/**
 * Get sales analytics
 * GET /api/v1/admin/analytics/sales
 */
const getSalesAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getSalesAnalytics(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get product analytics
 * GET /api/v1/admin/analytics/products
 */
const getProductAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getProductAnalytics(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue analytics
 * GET /api/v1/admin/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getRevenueAnalytics(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard overview
 * GET /api/v1/admin/analytics/overview
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const result = await analyticsService.getDashboardOverview();
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  getDashboardOverview
};
