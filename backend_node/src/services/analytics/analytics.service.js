/**
 * Analytics Service
 * Provides sales, product, revenue, and conversion analytics
 */

const crypto = require('crypto');
const { Product, Order, User, DailyStats, OfflineSale, VisitorRegionDaily } = require('../../models');
const redis = require('../../config/integrations/redis');
const { buildTenantScope, buildTenantScopedQuery, andQuery, normalizeTenantId } = require('../../utils/tenantScope');

const ANALYTICS_CACHE_VERSION = 'v4';
const REVENUE_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
const PUBLISHED_PRODUCT_SCOPE = {
  $or: [
    { status: { $in: ['published', 'publish'] } },
    { status: { $exists: false } },
    { status: null }
  ]
};

const getTenantFilter = (tenantId) => (
  tenantId ? buildTenantScope(tenantId) : {}
);

const parseAnalyticsDate = (value, boundary = 'start') => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      const date = new Date(year, month - 1, day);
      if (boundary === 'end') {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRange = ({ start_date, end_date } = {}, defaultStartFactory) => {
  const now = new Date();
  const startDate = parseAnalyticsDate(start_date, 'start') || defaultStartFactory(now);
  const endDate = parseAnalyticsDate(end_date, 'end') || now;

  return { startDate, endDate };
};

const getDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const decodeGeoValue = (value, fallback = 'Unknown') => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue == null || rawValue === '') return fallback;

  try {
    return decodeURIComponent(String(rawValue)).trim() || fallback;
  } catch (error) {
    return String(rawValue).trim() || fallback;
  }
};

const normalizeCountryCode = (value) => {
  const countryCode = decodeGeoValue(value, 'XX').toUpperCase();
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : 'XX';
};

const getCountryName = (countryCode) => {
  if (!countryCode || countryCode === 'XX') return 'Unknown';

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch (error) {
    return countryCode;
  }
};

const getHeader = (req, name) => req.headers?.[name.toLowerCase()];

const getClientIp = (req) => {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const sanitizePath = (value) => {
  const rawPath = typeof value === 'string' && value.trim() ? value.trim() : '/';

  try {
    const parsed = rawPath.startsWith('http') ? new URL(rawPath) : null;
    const path = parsed ? `${parsed.pathname}${parsed.search}` : rawPath;
    return (path.startsWith('/') ? path : `/${path}`).slice(0, 250);
  } catch (error) {
    return '/';
  }
};

const isLikelyBot = (userAgent = '') => (
  /bot|crawl|spider|slurp|preview|facebookexternalhit|pingdom|uptime|monitor/i.test(userAgent)
);

const getVisitorLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 50);
};

const startOfCurrentMonth = (now) => new Date(now.getFullYear(), now.getMonth(), 1);

const getOrderRevenueExpression = () => ({
  $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }]
});

const getOrderItemUnitPriceExpression = () => ({
  $let: {
    vars: {
      snapshot: { $ifNull: ['$items.priceSnapshot', 0] },
      price: { $ifNull: ['$items.price', 0] },
      salePrice: { $ifNull: ['$items.salePrice', 0] }
    },
    in: {
      $cond: [
        { $gt: ['$$snapshot', 0] },
        '$$snapshot',
        {
          $cond: [
            { $gt: ['$$price', 0] },
            '$$price',
            '$$salePrice'
          ]
        }
      ]
    }
  }
});

const getOrderItemRevenueExpression = () => ({
  $multiply: [
    { $ifNull: ['$items.quantity', 1] },
    getOrderItemUnitPriceExpression()
  ]
});

const getOfflineRevenueExpression = () => ({
  $multiply: [
    { $ifNull: ['$quantity', 1] },
    { $ifNull: ['$salePrice', 0] }
  ]
});

const getPeriodGroupExpression = (dateField, groupBy) => {
  switch (groupBy) {
    case 'week':
      return {
        $dateToString: {
          format: '%G-W%V',
          date: dateField
        }
      };
    case 'month':
      return { $dateToString: { format: '%Y-%m', date: dateField } };
    case 'day':
    default:
      return { $dateToString: { format: '%Y-%m-%d', date: dateField } };
  }
};

class AnalyticsService {
  /**
   * Get sales analytics (Online + Offline)
   * GET /api/v1/admin/analytics/sales
   */
  async getSalesAnalytics(params = {}) {
    const {
      start_date,
      end_date,
      group_by = 'day'
    } = params;
    const tenantId = normalizeTenantId(params.tenant_id || 1);

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:sales:${tenantId}:${start_date}:${end_date}:${group_by}`;

    // Try cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    const { startDate, endDate } = getDateRange({ start_date, end_date }, startOfCurrentMonth);
    const onlineGroupFormat = getPeriodGroupExpression('$created_at', group_by);
    const offlineGroupFormat = getPeriodGroupExpression('$soldAt', group_by);
    const tenantFilter = getTenantFilter(tenantId);

    // Parallelize online and offline aggregations
    const [onlineAggregation, offlineAggregation] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: REVENUE_STATUSES },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: onlineGroupFormat,
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: getOrderRevenueExpression() },
            avgOrderValue: { $avg: getOrderRevenueExpression() },
            uniqueCustomers: { $addToSet: "$userId" }
          }
        },
        {
          $project: {
            period: "$_id",
            orderCount: 1,
            totalRevenue: 1,
            avgOrderValue: 1,
            uniqueCustomers: { $size: "$uniqueCustomers" },
            _id: 0
          }
        },
        { $sort: { period: 1 } }
      ]),
      OfflineSale.aggregate([
        {
          $match: {
            ...tenantFilter,
            soldAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: offlineGroupFormat,
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: getOfflineRevenueExpression() },
            avgOrderValue: { $avg: getOfflineRevenueExpression() },
            quantity: { $sum: "$quantity" }
          }
        },
        {
          $project: {
            period: "$_id",
            orderCount: 1,
            totalRevenue: 1,
            avgOrderValue: 1,
            quantity: 1,
            _id: 0
          }
        }
      ])
    ]);

    // Merge online and offline data
    const mergedData = this._mergeOnlineOfflineData(onlineAggregation, offlineAggregation);

    const result = {
      startDate,
      endDate,
      groupBy: group_by,
      data: mergedData,
      summary: this._calculateSalesSummary(mergedData)
    };

    // Cache for 5 minutes
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Merge online and offline sales data
   */
  _mergeOnlineOfflineData(onlineData, offlineData) {
    const merged = new Map();

    // Add online data
    onlineData.forEach(item => {
      merged.set(item.period, {
        period: item.period,
        onlineOrders: item.orderCount,
        onlineRevenue: item.totalRevenue,
        onlineCustomers: item.uniqueCustomers,
        offlineOrders: 0,
        offlineRevenue: 0,
        offlineQuantity: 0,
        totalOrders: item.orderCount,
        totalRevenue: item.totalRevenue,
        avgOrderValue: item.avgOrderValue,
        avgValue: item.avgOrderValue
      });
    });

    // Add offline data
    offlineData.forEach(item => {
      if (merged.has(item.period)) {
        const existing = merged.get(item.period);
        existing.offlineOrders = item.orderCount;
        existing.offlineRevenue = item.totalRevenue;
        existing.offlineQuantity = item.quantity;
        existing.totalOrders = existing.onlineOrders + item.orderCount;
        existing.totalRevenue = existing.onlineRevenue + item.totalRevenue;
        existing.avgOrderValue = (existing.onlineRevenue + item.totalRevenue) / (existing.onlineOrders + item.orderCount);
        existing.avgValue = existing.avgOrderValue;
      } else {
        merged.set(item.period, {
          period: item.period,
          onlineOrders: 0,
          onlineRevenue: 0,
          onlineCustomers: 0,
          offlineOrders: item.orderCount,
          offlineRevenue: item.totalRevenue,
          offlineQuantity: item.quantity,
          totalOrders: item.orderCount,
          totalRevenue: item.totalRevenue,
          avgOrderValue: item.avgOrderValue,
          avgValue: item.avgOrderValue
        });
      }
    });

    return Array.from(merged.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get product analytics
   * GET /api/v1/admin/analytics/products
   */
  async getProductAnalytics(params = {}) {
    const {
      start_date,
      end_date,
      limit = 20,
      sort_by = 'revenue'
    } = params;
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:products:${tenantId}:${start_date}:${end_date}:${sort_by}:${parsedLimit}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    const { startDate, endDate } = getDateRange({ start_date, end_date }, startOfCurrentMonth);

    const tenantFilter = getTenantFilter(tenantId);

    const [onlineProductSales, offlineProductSales] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: REVENUE_STATUSES },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': { $ne: null } } },
        {
          $group: {
            _id: '$items.productId',
            orderIds: { $addToSet: '$_id' },
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            totalQuantity: { $sum: { $ifNull: ['$items.quantity', 1] } },
            totalRevenue: { $sum: getOrderItemRevenueExpression() }
          }
        },
        {
          $project: {
            productId: '$_id',
            name: 1,
            sku: 1,
            totalOrders: { $size: '$orderIds' },
            totalQuantity: 1,
            totalRevenue: 1,
            _id: 0
          }
        }
      ]),
      OfflineSale.aggregate([
        {
          $match: {
            ...tenantFilter,
            soldAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$productId',
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: { $ifNull: ['$quantity', 1] } },
            totalRevenue: { $sum: getOfflineRevenueExpression() }
          }
        },
        {
          $project: {
            productId: '$_id',
            totalOrders: 1,
            totalQuantity: 1,
            totalRevenue: 1,
            _id: 0
          }
        }
      ])
    ]);

    const productStats = new Map();

    const ensureProductStats = (productId, fallback = {}) => {
      const key = String(productId || '');
      if (!key) return null;

      if (!productStats.has(key)) {
        productStats.set(key, {
          id: key,
          productId,
          name: fallback.name || 'Unknown product',
          slug: null,
          sku: fallback.sku || 'N/A',
          price: 0,
          totalOrders: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          onlineOrders: 0,
          onlineQuantity: 0,
          onlineRevenue: 0,
          offlineOrders: 0,
          offlineQuantity: 0,
          offlineRevenue: 0,
          views: 0,
          addToCart: 0,
          avgRating: 0,
          reviewCount: 0
        });
      }

      return productStats.get(key);
    };

    onlineProductSales.forEach((item) => {
      const stats = ensureProductStats(item.productId, item);
      if (!stats) return;

      stats.name = item.name || stats.name;
      stats.sku = item.sku || stats.sku;
      stats.totalOrders += Number(item.totalOrders || 0);
      stats.totalQuantity += Number(item.totalQuantity || 0);
      stats.totalRevenue += Number(item.totalRevenue || 0);
      stats.onlineOrders += Number(item.totalOrders || 0);
      stats.onlineQuantity += Number(item.totalQuantity || 0);
      stats.onlineRevenue += Number(item.totalRevenue || 0);
    });

    offlineProductSales.forEach((item) => {
      const stats = ensureProductStats(item.productId);
      if (!stats) return;

      stats.totalOrders += Number(item.totalOrders || 0);
      stats.totalQuantity += Number(item.totalQuantity || 0);
      stats.totalRevenue += Number(item.totalRevenue || 0);
      stats.offlineOrders += Number(item.totalOrders || 0);
      stats.offlineQuantity += Number(item.totalQuantity || 0);
      stats.offlineRevenue += Number(item.totalRevenue || 0);
    });

    const productIds = Array.from(productStats.keys());
    if (productIds.length > 0) {
      const productDocuments = await Product.find({
        ...tenantFilter,
        _id: { $in: productIds }
      }).lean();

      productDocuments.forEach((product) => {
        const stats = productStats.get(String(product._id));
        if (!stats) return;

        stats.id = product.productId || product._id;
        stats.name = product.name || stats.name;
        stats.slug = product.slug || null;
        stats.sku = product.sku || product.variants?.[0]?.sku || stats.sku || 'N/A';
        stats.price = product.price || product.basePrice || product.variants?.[0]?.price || 0;
        stats.avgRating = product.rating || 0;
        stats.reviewCount = product.reviewCount || 0;
      });
    }

    let products = Array.from(productStats.values());
    
    // Manual sort because it's a map/array now
    products.sort((a, b) => {
      const field = sort_by === 'quantity' ? 'totalQuantity' : (sort_by === 'views' ? 'views' : (sort_by === 'rating' ? 'avgRating' : 'totalRevenue'));
      return b[field] - a[field];
    });

    products = products.slice(0, parsedLimit).map(p => ({
      ...p,
      avgRating: parseFloat(p.avgRating).toFixed(1),
      conversionRate: p.views > 0 ? ((p.totalQuantity / p.views) * 100).toFixed(2) : 0
    }));

    const result = {
      startDate,
      endDate,
      sortBy: sort_by,
      products
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Get revenue analytics (Online + Offline)
   * GET /api/v1/admin/analytics/revenue
   */
  async getRevenueAnalytics(params = {}) {
    const { start_date, end_date } = params;
    const tenantId = normalizeTenantId(params.tenant_id || 1);

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:revenue:${tenantId}:${start_date}:${end_date}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    const { startDate, endDate } = getDateRange({ start_date, end_date }, startOfCurrentMonth);
    const tenantFilter = getTenantFilter(tenantId);

    // Parallelize all revenue metrics and trends
    const [
      onlineMetricsAggregation,
      offlineMetrics,
      byPaymentMethod,
      onlineDailyTrend,
      offlineDailyTrend
    ] = await Promise.all([
      // Online metrics
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: { $cond: [{ $in: ["$status", REVENUE_STATUSES] }, 1, 0] } },
            grossRevenue: { $sum: { $cond: [{ $in: ["$status", REVENUE_STATUSES] }, getOrderRevenueExpression(), 0] } },
            refunds: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, getOrderRevenueExpression(), 0] } },
            netRevenue: { $sum: { $cond: [{ $in: ["$status", REVENUE_STATUSES] }, getOrderRevenueExpression(), 0] } },
            avgOrderValue: { $avg: { $cond: [{ $in: ["$status", REVENUE_STATUSES] }, getOrderRevenueExpression(), null] } }
          }
        }
      ]),
      // Offline sales summary
      OfflineSale.aggregate([
        {
          $match: {
            ...tenantFilter,
            soldAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: getOfflineRevenueExpression() },
            avgOrderValue: { $avg: getOfflineRevenueExpression() }
          }
        }
      ]),
      // Online by payment method
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: REVENUE_STATUSES },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: "$payment_method",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: getOrderRevenueExpression() }
          }
        },
        {
          $project: {
            method: "$_id",
            orderCount: 1,
            totalRevenue: 1,
            _id: 0
          }
        }
      ]),
      // Online Daily trend
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: REVENUE_STATUSES },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            revenue: { $sum: getOrderRevenueExpression() },
            orders: { $sum: 1 }
          }
        },
        {
          $project: {
            date: "$_id",
            onlineRevenue: "$revenue",
            onlineOrders: "$orders",
            offlineRevenue: { $literal: 0 },
            offlineOrders: { $literal: 0 },
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ]),
      // Offline Daily trend
      OfflineSale.aggregate([
        {
          $match: {
            ...tenantFilter,
            soldAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$soldAt" } },
            revenue: { $sum: getOfflineRevenueExpression() },
            orders: { $sum: 1 }
          }
        },
        {
          $project: {
            date: "$_id",
            onlineRevenue: { $literal: 0 },
            onlineOrders: { $literal: 0 },
            offlineRevenue: "$revenue",
            offlineOrders: "$orders",
            _id: 0
          }
        }
      ])
    ]);

    const onlineMetrics = onlineMetricsAggregation[0] || { totalOrders: 0, grossRevenue: 0, refunds: 0, netRevenue: 0, avgOrderValue: 0 };
    const offlineMetricsData = offlineMetrics[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };

    // Add offline to payment methods
    if (offlineMetricsData.totalOrders > 0) {
      byPaymentMethod.push({
        method: 'offline',
        orderCount: offlineMetricsData.totalOrders,
        totalRevenue: offlineMetricsData.totalRevenue
      });
    }

    // Merge daily trends
    const mergedDailyTrend = this._mergeDailyTrends(onlineDailyTrend, offlineDailyTrend);

    const result = {
      startDate,
      endDate,
      metrics: {
        totalOrders: onlineMetrics.totalOrders + offlineMetricsData.totalOrders,
        onlineOrders: onlineMetrics.totalOrders,
        offlineOrders: offlineMetricsData.totalOrders,
        grossRevenue: onlineMetrics.grossRevenue + offlineMetricsData.totalRevenue,
        onlineRevenue: onlineMetrics.grossRevenue,
        offlineRevenue: offlineMetricsData.totalRevenue,
        refunds: onlineMetrics.refunds,
        netRevenue: onlineMetrics.netRevenue + offlineMetricsData.totalRevenue,
        avgOrderValue: (onlineMetrics.grossRevenue + offlineMetricsData.totalRevenue) / (onlineMetrics.totalOrders + offlineMetricsData.totalOrders) || 0
      },
      byPaymentMethod,
      dailyTrend: mergedDailyTrend
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Merge daily trend data from online and offline sources
   */
  _mergeDailyTrends(onlineData, offlineData) {
    const merged = new Map();

    // Add online trends
    onlineData.forEach(item => {
      merged.set(item.date, {
        date: item.date,
        onlineRevenue: item.onlineRevenue,
        onlineOrders: item.onlineOrders,
        offlineRevenue: 0,
        offlineOrders: 0,
        revenue: item.onlineRevenue,
        orders: item.onlineOrders
      });
    });

    // Add offline trends
    offlineData.forEach(item => {
      if (merged.has(item.date)) {
        const existing = merged.get(item.date);
        existing.offlineRevenue = item.offlineRevenue;
        existing.offlineOrders = item.offlineOrders;
        existing.revenue = existing.onlineRevenue + item.offlineRevenue;
        existing.orders = existing.onlineOrders + item.offlineOrders;
      } else {
        merged.set(item.date, {
          date: item.date,
          onlineRevenue: 0,
          onlineOrders: 0,
          offlineRevenue: item.offlineRevenue,
          offlineOrders: item.offlineOrders,
          revenue: item.offlineRevenue,
          orders: item.offlineOrders
        });
      }
    });

    return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get dashboard overview (Online + Offline)
   */
  async getDashboardOverview(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:dashboard:overview:${tenantId}:${params.start_date || ''}:${params.end_date || ''}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    const tenantFilter = buildTenantScope(tenantId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const productBaseFilter = buildTenantScopedQuery(tenantId, { is_deleted: { $ne: true } });

    // Custom range calculation
    const rangeStart = parseAnalyticsDate(params.start_date, 'start');
    const rangeEnd = parseAnalyticsDate(params.end_date, 'end') || new Date();

    // Parallelize all database queries for maximum performance
    const [
      todayOnlineStats,
      todayOfflineStats,
      monthOnlineStats,
      monthOfflineStats,
      rangeOnlineStats,
      rangeOfflineStats,
      productCount,
      totalProductCount,
      customerCount,
      lowStockCount
    ] = await Promise.all([
      // Today's online stats
      Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: REVENUE_STATUSES }, created_at: { $gte: todayStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOrderRevenueExpression() } } }
      ]),
      // Today's offline stats
      OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: todayStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOfflineRevenueExpression() } } }
      ]),
      // Month's online stats
      Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: REVENUE_STATUSES }, created_at: { $gte: monthStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOrderRevenueExpression() } } }
      ]),
      // Month's offline stats
      OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: monthStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOfflineRevenueExpression() } } }
      ]),
      // Custom range online stats
      rangeStart ? Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: REVENUE_STATUSES }, created_at: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOrderRevenueExpression() } } }
      ]) : Promise.resolve([]),
      // Custom range offline stats
      rangeStart ? OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: getOfflineRevenueExpression() } } }
      ]) : Promise.resolve([]),
      // "Active products"
      Product.countDocuments(andQuery(productBaseFilter, PUBLISHED_PRODUCT_SCOPE)),
      // Total products
      Product.countDocuments(productBaseFilter),
      // Active customers
      User.countDocuments({ is_active: { $ne: false }, role: { $in: ['user', 'customer'] } }),
      // Low stock items
      Product.countDocuments(andQuery(
        productBaseFilter,
        PUBLISHED_PRODUCT_SCOPE,
        { $or: [{ stock: { $lte: 5 } }, { "variants.stock": { $lte: 5 } }] }
      ))
    ]);

    const todayOnline = todayOnlineStats[0] || { orders: 0, revenue: 0 };
    const todayOffline = todayOfflineStats[0] || { orders: 0, revenue: 0 };
    const monthOnline = monthOnlineStats[0] || { orders: 0, revenue: 0 };
    const monthOffline = monthOfflineStats[0] || { orders: 0, revenue: 0 };
    const rangeOnline = (rangeOnlineStats && rangeOnlineStats[0]) || { orders: 0, revenue: 0 };
    const rangeOffline = (rangeOfflineStats && rangeOfflineStats[0]) || { orders: 0, revenue: 0 };

    const result = {
      today: {
        orders: todayOnline.orders + todayOffline.orders,
        onlineOrders: todayOnline.orders,
        offlineOrders: todayOffline.orders,
        revenue: todayOnline.revenue + todayOffline.revenue,
        onlineRevenue: todayOnline.revenue,
        offlineRevenue: todayOffline.revenue
      },
      month: {
        orders: monthOnline.orders + monthOffline.orders,
        onlineOrders: monthOnline.orders,
        offlineOrders: monthOffline.orders,
        revenue: monthOnline.revenue + monthOffline.revenue,
        onlineRevenue: monthOnline.revenue,
        offlineRevenue: monthOffline.revenue
      },
      range: rangeStart ? {
        orders: rangeOnline.orders + rangeOffline.orders,
        onlineOrders: rangeOnline.orders,
        offlineOrders: rangeOffline.orders,
        revenue: rangeOnline.revenue + rangeOffline.revenue,
        onlineRevenue: rangeOnline.revenue,
        offlineRevenue: rangeOffline.revenue,
        startDate: rangeStart,
        endDate: rangeEnd
      } : null,
      totals: {
        products: totalProductCount,
        activeProducts: productCount,
        customers: customerCount,
        lowStockItems: lowStockCount
      }
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Aggregate daily stats (for background job)
   */
  async aggregateDailyStats(date = null) {
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const stats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: REVENUE_STATUSES }
        }
      },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: getOrderRevenueExpression() },
          average_order_value: { $avg: getOrderRevenueExpression() },
          new_customers: { $addToSet: "$userId" } // Simplified, should check if first order
        }
      }
    ]);

    const orderData = stats[0] || { total_orders: 0, total_revenue: 0, average_order_value: 0, new_customers: [] };

    // Get quantity of products sold
    const itemsSold = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: REVENUE_STATUSES }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.quantity" }
        }
      }
    ]);

    const totalSold = itemsSold[0] ? itemsSold[0].total : 0;

    await DailyStats.findOneAndUpdate(
      { date: dateStr },
      {
        total_revenue: orderData.total_revenue,
        total_orders: orderData.total_orders,
        total_products_sold: totalSold,
        new_customers: orderData.new_customers.length,
        avg_order_value: orderData.average_order_value,
        conversion_rate: 0 // Placeholder
      },
      { upsert: true, new: true }
    );

    return {
      date: dateStr,
      revenue: orderData.total_revenue,
      orders: orderData.total_orders,
      productsSold: totalSold,
      newCustomers: orderData.new_customers.length
    };
  }

  /**
   * Update product performance (for background job)
   */
  async updateProductPerformance(productId, date = null) {
    // This method would be complex to fully refactor without proper event tracking.
    // Simplified placeholder implementation.
    return { productId, success: true };
  }

  /**
   * Get legacy order analytics (consolidated)
   */
  async getOrderAnalytics(params = {}) {
    const tenantId = params.tenant_id || params.tenantId;
    const filter = getTenantFilter(tenantId);

    // Parallelize count and revenue aggregation
    const [totalOrders, revenueResult, byStatus] = await Promise.all([
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: { ...filter, status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, total: { $sum: getOrderRevenueExpression() } } }
      ]),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    return {
      totalOrders,
      totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0,
      ordersByStatus: byStatus
    };
  }

  /**
   * Calculate sales summary
   */
  _calculateSalesSummary(rows) {
    if (!rows || rows.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        totalCustomers: 0
      };
    }

    const totalOrders = rows.reduce((sum, row) => sum + (row.totalOrders || row.orderCount || 0), 0);
    const totalRevenue = rows.reduce((sum, row) => sum + (row.totalRevenue || 0), 0);

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalCustomers: rows.reduce((sum, row) => sum + (row.uniqueCustomers || row.onlineCustomers || 0), 0)
    };
  }
  /**
   * Get top customers by revenue
   * GET /api/v1/admin/analytics/customers
   */
  async getTopCustomers(params = {}) {
    const { limit = 10, start_date, end_date } = params;
    const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);
    
    const { startDate, endDate } = getDateRange({ start_date, end_date }, startOfCurrentMonth);
    
    const tenantFilter = getTenantFilter(params.tenant_id);

    const customers = await Order.aggregate([
      {
        $match: {
          ...tenantFilter,
          status: { $in: REVENUE_STATUSES },
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          customerEmail: {
            $ifNull: [
              '$userEmail',
              { $ifNull: ['$billing_address.email', '$shippingAddress.email'] }
            ]
          },
          customerName: {
            $ifNull: [
              '$userName',
              {
                $ifNull: [
                  '$shippingAddress.name',
                  {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ['$billing_address.first_name', ''] },
                          ' ',
                          { $ifNull: ['$billing_address.last_name', ''] }
                        ]
                      }
                    }
                  }
                ]
              }
            ]
          },
          customerKey: {
            $ifNull: [
              { $toString: '$userId' },
              {
                $ifNull: [
                  '$userEmail',
                  { $ifNull: ['$billing_address.email', '$shippingAddress.email'] }
                ]
              }
            ]
          }
        }
      },
      { $match: { customerKey: { $nin: [null, ''] } } },
      {
        $group: {
          _id: "$customerKey",
          userId: { $first: "$userId" },
          name: { $first: "$customerName" },
          email: { $first: "$customerEmail" },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: getOrderRevenueExpression() },
          lastOrder: { $max: "$created_at" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: "$_id",
          name: { $ifNull: ["$userDetails.name", "$name"] },
          email: { $ifNull: ["$userDetails.email", "$email"] },
          orderCount: 1,
          totalSpent: 1,
          lastOrder: 1,
          _id: 0
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parsedLimit }
    ]);

    return {
      startDate,
      endDate,
      customers
    };
  }

  /**
   * Track one storefront page view using Vercel geo headers.
   */
  async trackVisitor(req, payload = {}) {
    const userAgent = req.headers?.['user-agent'] || '';
    const path = sanitizePath(payload.path || payload.pathname || payload.url || '/');

    if (path.startsWith('/admin') || isLikelyBot(userAgent)) {
      return { tracked: false };
    }

    const tenantId = normalizeTenantId(payload.tenant_id || payload.tenantId || 1);
    const now = new Date();
    const date = getDateKey(now);
    const ip = getClientIp(req);
    const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || 'shriramya-analytics';
    const visitorHash = hashValue(`${tenantId}:${date}:${ip}:${userAgent}:${secret}`);
    const userAgentHash = userAgent ? hashValue(userAgent).slice(0, 24) : null;

    const countryCode = normalizeCountryCode(payload.countryCode || getHeader(req, 'x-vercel-ip-country'));
    const country = getCountryName(countryCode);
    const regionCode = decodeGeoValue(
      payload.regionCode || getHeader(req, 'x-vercel-ip-country-region'),
      'Unknown'
    );
    const city = decodeGeoValue(payload.city || getHeader(req, 'x-vercel-ip-city'), 'Unknown');
    const region = regionCode === 'Unknown' ? country : `${regionCode}, ${country}`;

    await VisitorRegionDaily.findOneAndUpdate(
      { tenantId, date, visitorHash },
      {
        $setOnInsert: {
          tenantId,
          date,
          visitorHash,
          firstSeenAt: now,
          userAgentHash
        },
        $set: {
          countryCode,
          country,
          regionCode,
          region,
          city,
          lastSeenAt: now
        },
        $inc: { pageviews: 1 }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { tracked: true };
  }

  /**
   * Get unique visitors and pageviews grouped by Vercel geo region.
   */
  async getVisitorRegions(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const limit = getVisitorLimit(params.limit);
    const { startDate, endDate } = getDateRange(
      { start_date: params.start_date, end_date: params.end_date },
      (now) => {
        const date = new Date(now);
        date.setDate(date.getDate() - 30);
        date.setHours(0, 0, 0, 0);
        return date;
      }
    );

    const startKey = getDateKey(startDate);
    const endKey = getDateKey(endDate);
    const match = {
      tenantId,
      date: { $gte: startKey, $lte: endKey }
    };

    const [summaryRows, regions, countries, daily] = await Promise.all([
      VisitorRegionDaily.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalVisitors: { $sum: 1 },
            totalPageviews: { $sum: '$pageviews' },
            countries: { $addToSet: '$countryCode' },
            regions: { $addToSet: { countryCode: '$countryCode', regionCode: '$regionCode' } }
          }
        }
      ]),
      VisitorRegionDaily.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              countryCode: '$countryCode',
              country: '$country',
              regionCode: '$regionCode',
              region: '$region'
            },
            visitors: { $sum: 1 },
            pageviews: { $sum: '$pageviews' },
            cities: { $addToSet: '$city' }
          }
        },
        {
          $project: {
            _id: 0,
            countryCode: '$_id.countryCode',
            country: '$_id.country',
            regionCode: '$_id.regionCode',
            region: '$_id.region',
            visitors: 1,
            pageviews: 1,
            cities: { $slice: ['$cities', 6] }
          }
        },
        { $sort: { visitors: -1, pageviews: -1 } },
        { $limit: limit }
      ]),
      VisitorRegionDaily.aggregate([
        { $match: match },
        {
          $group: {
            _id: { countryCode: '$countryCode', country: '$country' },
            visitors: { $sum: 1 },
            pageviews: { $sum: '$pageviews' }
          }
        },
        {
          $project: {
            _id: 0,
            countryCode: '$_id.countryCode',
            country: '$_id.country',
            visitors: 1,
            pageviews: 1
          }
        },
        { $sort: { visitors: -1, pageviews: -1 } },
        { $limit: limit }
      ]),
      VisitorRegionDaily.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$date',
            visitors: { $sum: 1 },
            pageviews: { $sum: '$pageviews' }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            visitors: 1,
            pageviews: 1
          }
        },
        { $sort: { date: 1 } }
      ])
    ]);

    const summary = summaryRows[0] || {
      totalVisitors: 0,
      totalPageviews: 0,
      countries: [],
      regions: []
    };

    const activeCountries = (summary.countries || []).filter((entry) => entry && entry !== 'XX');
    const activeRegions = (summary.regions || []).filter((entry) => entry?.regionCode && entry.regionCode !== 'Unknown');

    return {
      startDate,
      endDate,
      source: 'vercel-geo-headers',
      summary: {
        totalVisitors: summary.totalVisitors || 0,
        totalPageviews: summary.totalPageviews || 0,
        countryCount: activeCountries.length,
        regionCount: activeRegions.length
      },
      regions,
      countries,
      daily
    };
  }
}


module.exports = new AnalyticsService();
