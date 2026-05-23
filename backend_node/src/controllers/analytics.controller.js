/**
 * Analytics Controller
 * Admin analytics endpoints
 */

const legacyAnalyticsService = require('../services/analytics/analytics.service');
const ecommerceAnalyticsService = require('../services/analytics/ecommerceAnalytics.service');
const { successResponse } = require('../utils/response');

const getTenantParams = (req) => ({
  ...req.query,
  tenant_id: req.user?.tenant_id || req.user?.tenantId || 1,
});

const isClientDateError = (error) => error?.statusCode && error.statusCode < 500;

const runAnalyticsHandler = async (req, res, next, serviceCall, fallback, label) => {
  try {
    const result = await serviceCall(getTenantParams(req));
    return successResponse(res, result);
  } catch (error) {
    if (isClientDateError(error)) {
      return next(error);
    }

    console.error(`Analytics error (${label}):`, error.message);
    return successResponse(res, fallback, 'Analytics data temporarily unavailable');
  }
};

/**
 * Track a storefront visitor page view
 * POST /api/v1/analytics/visit
 */
const trackVisitor = async (req, res, next) => {
  try {
    const payload = {
      ...(req.body || {}),
      event_name: 'page_view',
    };
    const result = ecommerceAnalyticsService.enqueueEvent(req, payload);

    // Keep the legacy geo rollup alive for older reports without blocking storefront traffic.
    setImmediate(() => {
      legacyAnalyticsService.trackVisitor(req, req.body || {}).catch((error) => {
        console.warn('Legacy visitor analytics error:', error.message);
      });
    });

    return successResponse(res, result, 'Visitor tracked');
  } catch (error) {
    console.error('Analytics error (track visitor):', error.message);
    return successResponse(res, { tracked: false }, 'Visitor tracking temporarily unavailable');
  }
};

/**
 * Track a storefront ecommerce event
 * POST /api/v1/analytics/events
 */
const trackEvent = async (req, res, next) => {
  try {
    const result = ecommerceAnalyticsService.enqueueEvent(req, req.body || {});
    return successResponse(res, result, 'Analytics event accepted', 202);
  } catch (error) {
    if (isClientDateError(error)) {
      return next(error);
    }

    console.error('Analytics error (track event):', error.message);
    return successResponse(res, { accepted: false }, 'Analytics event temporarily unavailable', 202);
  }
};

/**
 * Get sales analytics
 * GET /api/v1/admin/analytics/sales
 */
const getSalesAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getSalesAnalytics(params),
    {
      startDate: new Date(),
      endDate: new Date(),
      data: [],
      summary: { totalOrders: 0, paidOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      revenueByDate: [],
      revenueByCategory: [],
      revenueByPaymentMethod: [],
    },
    'sales'
  );
};

/**
 * Get product analytics
 * GET /api/v1/admin/analytics/products
 */
const getProductAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getProductAnalytics(params),
    {
      startDate: new Date(),
      endDate: new Date(),
      products: [],
    },
    'products'
  );
};

/**
 * Get revenue analytics
 * GET /api/v1/admin/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getRevenueAnalytics(params),
    {
      startDate: new Date(),
      endDate: new Date(),
      metrics: { totalOrders: 0, grossRevenue: 0, refunds: 0, netRevenue: 0, avgOrderValue: 0 },
      byPaymentMethod: [],
      dailyTrend: []
    },
    'revenue'
  );
};

/**
 * Get dashboard overview
 * GET /api/v1/admin/analytics/overview
 */
const getDashboardOverview = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getOverview(params),
    {
      cards: {},
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        totalVisitors: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        cartAbandonmentRate: 0,
      },
    },
    'overview'
  );
};

/**
 * Get top customers analytics
 * GET /api/v1/admin/analytics/customers
 */
const getTopCustomers = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getCustomerAnalytics(params),
    {
      startDate: new Date(),
      endDate: new Date(),
      summary: { newCustomers: 0, returningCustomers: 0, registeredUsers: 0, guestUsers: 0, repeatPurchaseRate: 0 },
      topCustomers: [],
      customers: [],
    },
    'customers'
  );
};

/**
 * Get visitor analytics
 * GET /api/v1/admin/analytics/visitors
 */
const getVisitorAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getVisitorAnalytics(params),
    {
      summary: { totalVisitors: 0, uniqueVisitors: 0, pageViews: 0, sessions: 0, newVisitors: 0, returningVisitors: 0 },
      daily: [],
      devices: [],
      browsers: [],
      sources: [],
      topPages: [],
      locations: [],
    },
    'visitors'
  );
};

/**
 * Get cart and checkout analytics
 * GET /api/v1/admin/analytics/cart
 */
const getCartAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getCartAnalytics(params),
    {
      summary: {
        addToCart: 0,
        checkoutStarted: 0,
        paymentInitiated: 0,
        paymentSuccess: 0,
        paymentFailed: 0,
        cartAbandonmentRate: 0,
        checkoutAbandonmentRate: 0,
      },
      funnel: [],
      daily: [],
    },
    'cart'
  );
};

/**
 * Get category analytics
 * GET /api/v1/admin/analytics/categories
 */
const getCategoryAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getCategoryAnalytics(params),
    {
      mostVisited: [],
      bestSelling: [],
      revenueByCategory: [],
      categories: [],
    },
    'categories'
  );
};

/**
 * Get search analytics
 * GET /api/v1/admin/analytics/search
 */
const getSearchAnalytics = async (req, res, next) => {
  return runAnalyticsHandler(
    req,
    res,
    next,
    (params) => ecommerceAnalyticsService.getSearchAnalytics(params),
    {
      summary: { totalSearches: 0, noResultSearches: 0 },
      keywords: [],
    },
    'search'
  );
};

/**
 * Get visitor region analytics
 * GET /api/v1/admin/analytics/visitors/regions
 */
const getVisitorRegions = async (req, res, next) => {
  try {
    const params = getTenantParams(req);
    const result = await legacyAnalyticsService.getVisitorRegions(params);
    return successResponse(res, result);
  } catch (error) {
    if (isClientDateError(error)) {
      return next(error);
    }

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
  trackEvent,
  getSalesAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  getDashboardOverview,
  getTopCustomers,
  getVisitorAnalytics,
  getCartAnalytics,
  getCategoryAnalytics,
  getSearchAnalytics,
  getVisitorRegions
};
