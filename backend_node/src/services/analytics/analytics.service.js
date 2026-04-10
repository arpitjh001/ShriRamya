/**
 * Analytics Service
 * Provides sales, product, revenue, and conversion analytics
 */

const { Product, Order, User, Review, DailyStats, ProductPerformance } = require('../../models');
const redis = require('../../config/integrations/redis');

class AnalyticsService {
  /**
   * Get sales analytics
   * GET /api/v1/admin/analytics/sales
   */
  async getSalesAnalytics(params = {}) {
    const {
      start_date,
      end_date,
      group_by = 'day'
    } = params;

    const cacheKey = `analytics:sales:${start_date}:${end_date}:${group_by}`;

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

    const validStatuses = ['placed', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];
    const tenantFilter = params.tenant_id ? { tenant_id: parseInt(params.tenant_id) } : {};

    const aggregation = await Order.aggregate([
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
          totalRevenue: { $sum: "$total_amount" },
          avgOrderValue: { $avg: "$total_amount" },
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
    ]);

    const result = {
      startDate,
      endDate,
      groupBy: group_by,
      data: aggregation,
      summary: this._calculateSalesSummary(aggregation)
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

    const cacheKey = `analytics:products:${start_date}:${end_date}:${sort_by}:${limit}`;

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

    const tenantFilter = params.tenant_id ? { tenant_id: parseInt(params.tenant_id) } : {};

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
   * Get revenue analytics
   * GET /api/v1/admin/analytics/revenue
   */
  async getRevenueAnalytics(params = {}) {
    const { start_date, end_date } = params;

    const cacheKey = `analytics:revenue:${start_date}:${end_date}`;

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

    const tenantFilter = params.tenant_id ? { tenant_id: parseInt(params.tenant_id) } : {};
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    // Get metrics
    const metricsAggregation = await Order.aggregate([
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
          grossRevenue: { $sum: "$total_amount" },
          refunds: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, "$total_amount", 0] } },
          netRevenue: { $sum: { $cond: [{ $in: ["$status", validStatuses] }, "$total_amount", 0] } },
          avgOrderValue: { $avg: "$total_amount" }
        }
      }
    ]);

    const metrics = metricsAggregation[0] || { totalOrders: 0, grossRevenue: 0, refunds: 0, netRevenue: 0, avgOrderValue: 0 };

    const byPaymentMethod = await Order.aggregate([
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
          totalRevenue: { $sum: "$total_amount" }
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
    ]);

    // Daily trend
    const dailyTrend = await Order.aggregate([
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
          revenue: { $sum: "$total_amount" },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          orders: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    const result = {
      startDate,
      endDate,
      metrics: {
        totalOrders: metrics.totalOrders,
        grossRevenue: metrics.grossRevenue,
        refunds: metrics.refunds,
        netRevenue: metrics.netRevenue,
        avgOrderValue: metrics.avgOrderValue
      },
      byPaymentMethod,
      dailyTrend
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
   * Get dashboard overview
   */
  async getDashboardOverview(params = {}) {
    const tenantId = params.tenant_id || 1;
    const cacheKey = `analytics:dashboard:overview:${tenantId}`;

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

    const tenantFilter = { tenant_id: parseInt(tenantId) };
    const validStatuses = ['placed', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Today's stats
    const todayStats = await Order.aggregate([
      {
        $match: {
          ...tenantFilter,
          status: { $in: validStatuses },
          created_at: { $gte: todayStart }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$total_amount" }
        }
      }
    ]);

    // Month stats
    const monthStats = await Order.aggregate([
      {
        $match: {
          ...tenantFilter,
          status: { $in: validStatuses },
          created_at: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$total_amount" }
        }
      }
    ]);

    // Counts
    const productBaseFilter = { ...tenantFilter, is_deleted: { $ne: true } };

    // "Active products" means published and not deleted.
    const productCount = await Product.countDocuments({
      ...productBaseFilter,
      status: { $in: ['published', 'publish'] }
    });

    const customerCount = await User.countDocuments({
      is_active: { $ne: false },
      role: { $in: ['user', 'customer'] }
    }); // Users are currently global but roles distinguish

    const lowStockCount = await Product.countDocuments({
      ...productBaseFilter,
      status: { $in: ['published', 'publish'] },
      $or: [
        { stock: { $lte: 5 } }, // Fallback to 5 if not specified
        { "variants.stock": { $lte: 5 } }
      ]
      // Note: Ideally we would use the lowStockThreshold field, but MongoDB aggregate/count 
      // with field-to-field comparison is more complex than a simple match. 
      // For now, we use 5 as the standard baseline for the dashboard.
    });

    const result = {
      today: {
        orders: todayStats[0] ? todayStats[0].orders : 0,
        revenue: todayStats[0] ? todayStats[0].revenue : 0
      },
      month: {
        orders: monthStats[0] ? monthStats[0].orders : 0,
        revenue: monthStats[0] ? monthStats[0].revenue : 0
      },
      totals: {
        products: productCount,
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
          status: { $in: ['paid', 'processing', 'shipped', 'delivered'] }
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
          status: { $in: ['paid', 'processing', 'shipped', 'delivered'] }
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
    const filter = tenantId ? { tenant_id: parseInt(tenantId) } : {};
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

    const totalOrders = await Order.countDocuments(filter);
    const revenueResult = await Order.aggregate([
      { $match: { ...filter, status: { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);

    const byStatus = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
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
}

module.exports = new AnalyticsService();
