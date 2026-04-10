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
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getSalesAnalytics(params);
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (sales):', error.message);
    // Return empty data instead of 500 error
    return successResponse(res, {
      startDate: new Date(),
      endDate: new Date(),
      data: [],
      summary: { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, totalCustomers: 0 }
    }, 'Analytics data temporarily unavailable');
  }
};

/**
 * Get product analytics
 * GET /api/v1/admin/analytics/products
 */
const getProductAnalytics = async (req, res, next) => {
  try {
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getProductAnalytics(params);
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (products):', error.message);
    return successResponse(res, {
      startDate: new Date(),
      endDate: new Date(),
      products: [],
      sortBy: 'revenue'
    }, 'Analytics data temporarily unavailable');
  }
};

/**
 * Get revenue analytics
 * GET /api/v1/admin/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getRevenueAnalytics(params);
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (revenue):', error.message);
    return successResponse(res, {
      startDate: new Date(),
      endDate: new Date(),
      metrics: { totalOrders: 0, grossRevenue: 0, refunds: 0, netRevenue: 0, avgOrderValue: 0 },
      byPaymentMethod: [],
      dailyTrend: []
    }, 'Analytics data temporarily unavailable');
  }
};

/**
 * Get dashboard overview
 * GET /api/v1/admin/analytics/overview
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const result = await analyticsService.getDashboardOverview({ tenant_id: req.user.tenant_id });
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (overview):', error.message);
    return successResponse(res, {
      today: { orders: 0, revenue: 0 },
      month: { orders: 0, revenue: 0 },
      totals: { products: 0, customers: 0, lowStockItems: 0 }
    }, 'Analytics data temporarily unavailable');
  }
};

module.exports = {
  getSalesAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  getDashboardOverview
};
