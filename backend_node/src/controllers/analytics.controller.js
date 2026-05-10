/**
 * Analytics Controller
 * Admin analytics endpoints
 */

const analyticsService = require('../services/analytics/analytics.service');
const { successResponse } = require('../utils/response');

/**
 * Track a storefront visitor page view
 * POST /api/v1/analytics/visit
 */
const trackVisitor = async (req, res, next) => {
  try {
    const result = await analyticsService.trackVisitor(req, req.body || {});
    return successResponse(res, result, 'Visitor tracked');
  } catch (error) {
    console.error('Analytics error (track visitor):', error.message);
    return successResponse(res, { tracked: false }, 'Visitor tracking temporarily unavailable');
  }
};

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
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getDashboardOverview(params);
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

/**
 * Get top customers analytics
 * GET /api/v1/admin/analytics/customers
 */
const getTopCustomers = async (req, res, next) => {
  try {
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getTopCustomers(params);
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (customers):', error.message);
    return successResponse(res, {
      startDate: new Date(),
      endDate: new Date(),
      customers: []
    }, 'Analytics data temporarily unavailable');
  }
};

/**
 * Get visitor region analytics
 * GET /api/v1/admin/analytics/visitors/regions
 */
const getVisitorRegions = async (req, res, next) => {
  try {
    const params = { ...req.query, tenant_id: req.user.tenant_id };
    const result = await analyticsService.getVisitorRegions(params);
    return successResponse(res, result);
  } catch (error) {
    console.error('Analytics error (visitor regions):', error.message);
    return successResponse(res, {
      startDate: new Date(),
      endDate: new Date(),
      source: 'vercel-geo-headers',
      summary: { totalVisitors: 0, totalPageviews: 0, countryCount: 0, regionCount: 0 },
      regions: [],
      countries: [],
      daily: []
    }, 'Visitor analytics temporarily unavailable');
  }
};

module.exports = {
  trackVisitor,
  getSalesAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  getDashboardOverview,
  getTopCustomers,
  getVisitorRegions
};
