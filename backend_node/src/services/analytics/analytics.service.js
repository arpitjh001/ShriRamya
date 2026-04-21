/**
 * Analytics Service
 * Provides sales, product, revenue, and conversion analytics
 */

const { Product, Order, User, Review, DailyStats, ProductPerformance, OfflineSale } = require('../../models');
const redis = require('../../config/integrations/redis');
const { buildTenantScope, buildTenantScopedQuery, andQuery, normalizeTenantId } = require('../../utils/tenantScope');

const ANALYTICS_CACHE_VERSION = 'v2';
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

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:sales:${start_date}:${end_date}:${group_by}`;

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

    const now = new Date();
    const startDate = start_date ? new Date(start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end_date ? new Date(end_date) : now;

    // Build aggregation pipeline
    let groupFormat;
    switch (group_by) {
      case 'week':
        groupFormat = { $concat: [{ $substr: [{ $year: "$created_at" }, 0, -1] }, "-", { $substr: [{ $week: "$created_at" }, 0, -1] }] };
        break;
      case 'month':
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$created_at" } };
        break;
      case 'day':
      default:
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } };
        break;
    }

    const validStatuses = ['pending', 'pending_payment', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];
    const tenantFilter = getTenantFilter(params.tenant_id);

    // Parallelize online and offline aggregations
    const [onlineAggregation, offlineAggregation] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: validStatuses },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: groupFormat,
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$total_amount', 0] } },
            avgOrderValue: { $avg: { $ifNull: ['$total_amount', 0] } },
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
            _id: groupFormat.replace ? groupFormat.replace('$created_at', '$soldAt') : { $dateToString: { format: "%Y-%m-%d", date: "$soldAt" } },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: { $cond: [{ $eq: ["$salePrice", null] }, 0, "$salePrice"] } },
            avgOrderValue: { $avg: { $cond: [{ $eq: ["$salePrice", null] }, 0, "$salePrice"] } },
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

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:products:${start_date}:${end_date}:${sort_by}:${limit}`;

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

    const now = new Date();
    const startDate = start_date ? new Date(start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end_date ? new Date(end_date) : now;

    // Sort order
    let sortQuery = {};
    switch (sort_by) {
      case 'quantity':
        sortQuery = { totalQuantity: -1 };
        break;
      case 'views':
        sortQuery = { views: -1 };
        break;
      case 'rating':
        sortQuery = { avgRating: -1 };
        break;
      case 'revenue':
      default:
        sortQuery = { totalRevenue: -1 };
        break;
    }

    const tenantFilter = getTenantFilter(params.tenant_id);

    // This is a complex query in MongoDB. We'll simplify for now.
    // In a production app, we'd use the ProductPerformance collection.
    const performanceData = await ProductPerformance.find({
      ...tenantFilter,
      date: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] }
    }).populate('productId');

    // Grouping by product
    const productStats = new Map();
    for (const item of performanceData) {
      if (!item.productId) continue;
      const pid = item.productId._id.toString();
      if (!productStats.has(pid)) {
        productStats.set(pid, {
          id: item.productId.productId || item.productId._id,
          name: item.productId.name,
          slug: item.productId.slug,
          price: item.productId.price || item.productId.basePrice || 0,
          totalOrders: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          views: 0,
          addToCart: 0,
          avgRating: item.productId.rating || 0,
          reviewCount: item.productId.reviewCount || 0
        });
      }
      
      const stats = productStats.get(pid);
      stats.totalOrders += item.purchases;
      stats.totalQuantity += item.purchases; // Assuming 1 quantity per purchase for simple analytics
      stats.totalRevenue += item.revenue;
      stats.views += item.views;
      stats.addToCart += item.add_to_cart;
    }

    let products = Array.from(productStats.values());
    
    // Manual sort because it's a map/array now
    products.sort((a, b) => {
      const field = sort_by === 'quantity' ? 'totalQuantity' : (sort_by === 'views' ? 'views' : (sort_by === 'rating' ? 'avgRating' : 'totalRevenue'));
      return b[field] - a[field];
    });

    products = products.slice(0, limit).map(p => ({
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

    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:revenue:${start_date}:${end_date}`;

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

    const now = new Date();
    const startDate = start_date ? new Date(start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end_date ? new Date(end_date) : now;

    const tenantFilter = getTenantFilter(params.tenant_id);
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

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
            totalOrders: { $sum: 1 },
            grossRevenue: { $sum: { $ifNull: ['$total_amount', 0] } },
            refunds: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, { $ifNull: ['$total_amount', 0] }, 0] } },
            netRevenue: { $sum: { $cond: [{ $in: ["$status", validStatuses] }, { $ifNull: ['$total_amount', 0] }, 0] } },
            avgOrderValue: { $avg: { $ifNull: ['$total_amount', 0] } }
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
            totalRevenue: { $sum: { $cond: [{ $eq: ["$salePrice", null] }, 0, "$salePrice"] } },
            avgOrderValue: { $avg: { $cond: [{ $eq: ["$salePrice", null] }, 0, "$salePrice"] } }
          }
        }
      ]),
      // Online by payment method
      Order.aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $in: validStatuses },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: "$payment_method",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$total_amount', 0] } }
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
            status: { $in: validStatuses },
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            revenue: { $sum: { $ifNull: ['$total_amount', 0] } },
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
            revenue: { $sum: { $cond: [{ $eq: ["$salePrice", null] }, 0, "$salePrice"] } },
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
    const cacheKey = `analytics:${ANALYTICS_CACHE_VERSION}:dashboard:overview:${tenantId}`;

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
    const validStatuses = ['pending', 'pending_payment', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const productBaseFilter = buildTenantScopedQuery(tenantId, { is_deleted: { $ne: true } });

    // Custom range calculation
    const rangeStart = params.start_date ? new Date(params.start_date) : null;
    const rangeEnd = params.end_date ? new Date(params.end_date) : new Date();

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
        { $match: { ...tenantFilter, status: { $in: validStatuses }, created_at: { $gte: todayStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }] } } } }
      ]),
      // Today's offline stats
      OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: todayStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $multiply: [{ $ifNull: ["$quantity", 1] }, { $ifNull: ["$salePrice", 0] }] } } } }
      ]),
      // Month's online stats
      Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: validStatuses }, created_at: { $gte: monthStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }] } } } }
      ]),
      // Month's offline stats
      OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: monthStart } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $multiply: [{ $ifNull: ["$quantity", 1] }, { $ifNull: ["$salePrice", 0] }] } } } }
      ]),
      // Custom range online stats
      rangeStart ? Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: validStatuses }, created_at: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }] } } } }
      ]) : Promise.resolve([]),
      // Custom range offline stats
      rangeStart ? OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $multiply: [{ $ifNull: ["$quantity", 1] }, { $ifNull: ["$salePrice", 0] }] } } } }
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
          status: { $in: ['pending', 'pending_payment', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          average_order_value: { $avg: "$total_amount" },
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
          status: { $in: ['pending', 'pending_payment', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'] }
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
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    // Parallelize count and revenue aggregation
    const [totalOrders, revenueResult, byStatus] = await Promise.all([
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: { ...filter, status: { $in: validStatuses } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
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

    return {
      totalOrders: rows.reduce((sum, row) => sum + row.orderCount, 0),
      totalRevenue: rows.reduce((sum, row) => sum + row.totalRevenue, 0),
      avgOrderValue: rows.reduce((sum, row) => sum + row.avgOrderValue, 0) / rows.length,
      totalCustomers: rows.reduce((sum, row) => sum + row.uniqueCustomers, 0)
    };
  }
  /**
   * Get top customers by revenue
   * GET /api/v1/admin/analytics/customers
   */
  async getTopCustomers(params = {}) {
    const { limit = 10, start_date, end_date } = params;
    
    const now = new Date();
    const startDate = start_date ? new Date(start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end_date ? new Date(end_date) : now;
    
    const tenantFilter = getTenantFilter(params.tenant_id);
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    const customers = await Order.aggregate([
      {
        $match: {
          ...tenantFilter,
          status: { $in: validStatuses },
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total_amount" },
          lastOrder: { $max: "$created_at" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          id: "$_id",
          name: "$userDetails.name",
          email: "$userDetails.email",
          orderCount: 1,
          totalSpent: 1,
          lastOrder: 1,
          _id: 0
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) }
    ]);

    return {
      startDate,
      endDate,
      customers
    };
  }
}


module.exports = new AnalyticsService();
