/**
 * Analytics Service
 * Provides sales, product, revenue, and conversion analytics
 */

const { mysqlPool } = require('../../config/db');
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

    // Group by format
    let dateFormat;
    switch (group_by) {
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'day':
      default:
        dateFormat = '%Y-%m-%d';
        break;
    }

    const [rows] = await mysqlPool.query(
      `SELECT 
         DATE_FORMAT(created_at, ?) as period,
         COUNT(*) as order_count,
         SUM(total_amount) as total_revenue,
         AVG(total_amount) as avg_order_value,
         COUNT(DISTINCT user_id) as unique_customers
       FROM orders
       WHERE status IN ('completed', 'delivered', 'processing')
         AND created_at BETWEEN ? AND ?
       GROUP BY period
       ORDER BY period ASC`,
      [dateFormat, startDate, endDate]
    );

    const result = {
      startDate,
      endDate,
      groupBy: group_by,
      data: rows.map(row => ({
        period: row.period,
        orderCount: parseInt(row.order_count),
        totalRevenue: parseFloat(row.total_revenue || 0),
        avgOrderValue: parseFloat(row.avg_order_value || 0),
        uniqueCustomers: parseInt(row.unique_customers)
      })),
      summary: this._calculateSalesSummary(rows)
    };

    // Cache for 5 minutes
    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(result));
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
    let orderBy;
    switch (sort_by) {
      case 'quantity':
        orderBy = 'total_quantity DESC';
        break;
      case 'views':
        orderBy = 'views DESC';
        break;
      case 'rating':
        orderBy = 'avg_rating DESC';
        break;
      case 'revenue':
      default:
        orderBy = 'total_revenue DESC';
        break;
    }

    const [rows] = await mysqlPool.query(
      `SELECT 
         p.id,
         p.name,
         p.slug,
         p.basePrice as price,
         COUNT(DISTINCT oi.id) as total_orders,
         SUM(oi.quantity) as total_quantity,
         SUM(oi.quantity * oi.price) as total_revenue,
         COALESCE(ap.views, 0) as views,
         COALESCE(ap.add_to_cart, 0) as add_to_cart,
         COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE), 0) as avg_rating,
         COALESCE((SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE), 0) as review_count
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('completed', 'delivered')
         AND o.created_at BETWEEN ? AND ?
       LEFT JOIN analytics_product_performance ap ON p.id = ap.product_id
         AND ap.date BETWEEN ? AND ?
       WHERE p.status = 'published'
       GROUP BY p.id
       ORDER BY ${orderBy}
       LIMIT ?`,
      [startDate, endDate, startDate, endDate, limit]
    );

    const result = {
      startDate,
      endDate,
      sortBy: sort_by,
      products: rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: parseFloat(row.price),
        totalOrders: parseInt(row.total_orders),
        totalQuantity: parseInt(row.total_quantity),
        totalRevenue: parseFloat(row.total_revenue),
        views: parseInt(row.views),
        addToCart: parseInt(row.add_to_cart),
        avgRating: parseFloat(row.avg_rating).toFixed(1),
        reviewCount: parseInt(row.review_count),
        conversionRate: row.views > 0 ? ((row.total_quantity / row.views) * 100).toFixed(2) : 0
      }))
    };

    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(result));
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

    // Get revenue metrics
    const [metrics] = await mysqlPool.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(total_amount) as gross_revenue,
         SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END) as refunds,
         SUM(CASE WHEN status IN ('completed', 'delivered') THEN total_amount ELSE 0 END) as net_revenue,
         AVG(total_amount) as avg_order_value
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // Get revenue by payment method
    const [byPaymentMethod] = await mysqlPool.query(
      `SELECT 
         payment_method,
         COUNT(*) as order_count,
         SUM(total_amount) as total_revenue
       FROM orders
       WHERE status IN ('completed', 'delivered')
         AND created_at BETWEEN ? AND ?
       GROUP BY payment_method`,
      [startDate, endDate]
    );

    // Get daily revenue trend
    const [dailyTrend] = await mysqlPool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m-%d') as date,
         SUM(total_amount) as revenue,
         COUNT(*) as orders
       FROM orders
       WHERE status IN ('completed', 'delivered')
         AND created_at BETWEEN ? AND ?
       GROUP BY date
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    const result = {
      startDate,
      endDate,
      metrics: {
        totalOrders: parseInt(metrics[0].total_orders),
        grossRevenue: parseFloat(metrics[0].gross_revenue || 0),
        refunds: parseFloat(metrics[0].refunds || 0),
        netRevenue: parseFloat(metrics[0].net_revenue || 0),
        avgOrderValue: parseFloat(metrics[0].avg_order_value || 0)
      },
      byPaymentMethod: byPaymentMethod.map(row => ({
        method: row.payment_method,
        orderCount: parseInt(row.order_count),
        totalRevenue: parseFloat(row.total_revenue)
      })),
      dailyTrend: dailyTrend.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders)
      }))
    };

    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(result));
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Get dashboard overview
   */
  async getDashboardOverview() {
    const cacheKey = 'analytics:dashboard:overview';

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

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const [todayStats] = await mysqlPool.query(
      `SELECT 
         COUNT(*) as orders,
         SUM(total_amount) as revenue
       FROM orders
       WHERE status IN ('completed', 'delivered')
         AND created_at >= ?`,
      [startOfDay]
    );

    // Month stats
    const [monthStats] = await mysqlPool.query(
      `SELECT 
         COUNT(*) as orders,
         SUM(total_amount) as revenue
       FROM orders
       WHERE status IN ('completed', 'delivered')
         AND created_at >= ?`,
      [startOfMonth]
    );

    // Total products
    const [productCount] = await mysqlPool.query(
      "SELECT COUNT(*) as total FROM products WHERE status = 'published'"
    );

    // Total customers
    const User = require('../../models/user.model');
    const customerCount = await User.countDocuments({ role: 'customer' });

    // Low stock count
    const [lowStock] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT pv.product_id) as count
       FROM product_variants pv
       JOIN variant_inventory vi ON pv.id = vi.variant_id
       WHERE vi.stock_level <= 10`
    );

    const result = {
      today: {
        orders: parseInt(todayStats[0].orders || 0),
        revenue: parseFloat(todayStats[0].revenue || 0)
      },
      month: {
        orders: parseInt(monthStats[0].orders || 0),
        revenue: parseFloat(monthStats[0].revenue || 0)
      },
      totals: {
        products: parseInt(productCount[0].total),
        customers: customerCount,
        lowStockItems: parseInt(lowStock[0].count)
      }
    };

    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(result));
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

    const [stats] = await mysqlPool.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(total_amount) as total_revenue,
         COUNT(DISTINCT user_id) as new_customers,
         AVG(total_amount) as avg_order_value
       FROM orders
       WHERE created_at BETWEEN ? AND ?
         AND status IN ('completed', 'delivered')`,
      [startOfDay, endOfDay]
    );

    const [productsSold] = await mysqlPool.query(
      `SELECT SUM(oi.quantity) as total
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at BETWEEN ? AND ?
         AND o.status IN ('completed', 'delivered')`,
      [startOfDay, endOfDay]
    );

    // Calculate conversion rate (visitors to orders)
    // This would need analytics page views table
    const conversionRate = 0; // Placeholder

    await mysqlPool.query(
      `INSERT INTO analytics_daily_stats 
        (date, total_revenue, total_orders, total_products_sold, new_customers, conversion_rate, avg_order_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        total_revenue = VALUES(total_revenue),
        total_orders = VALUES(total_orders),
        total_products_sold = VALUES(total_products_sold),
        new_customers = VALUES(new_customers),
        conversion_rate = VALUES(conversion_rate),
        avg_order_value = VALUES(avg_order_value)`,
      [
        dateStr,
        stats[0].total_revenue || 0,
        stats[0].total_orders || 0,
        productsSold[0].total || 0,
        stats[0].new_customers || 0,
        conversionRate,
        stats[0].avg_order_value || 0
      ]
    );

    return {
      date: dateStr,
      revenue: stats[0].total_revenue || 0,
      orders: stats[0].total_orders || 0,
      productsSold: productsSold[0].total || 0,
      newCustomers: stats[0].new_customers || 0
    };
  }

  /**
   * Update product performance (for background job)
   */
  async updateProductPerformance(productId, date = null) {
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get views and add-to-cart from analytics_product_performance if exists
    // For now, we'll calculate from orders
    const [orderStats] = await mysqlPool.query(
      `SELECT 
         COUNT(DISTINCT oi.id) as purchases,
         SUM(oi.quantity) as quantity_sold,
         SUM(oi.quantity * oi.price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = ?
         AND o.status IN ('completed', 'delivered')
         AND DATE(o.created_at) = ?`,
      [productId, dateStr]
    );

    const stats = orderStats[0] || { purchases: 0, quantity_sold: 0, revenue: 0 };

    await mysqlPool.query(
      `INSERT INTO analytics_product_performance 
        (product_id, date, views, add_to_cart, purchases, revenue)
       VALUES (?, ?, 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
        purchases = VALUES(purchases),
        revenue = VALUES(revenue)`,
      [productId, dateStr, stats.purchases, stats.revenue]
    );

    return { productId, date: dateStr, ...stats };
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
      totalOrders: rows.reduce((sum, row) => sum + parseInt(row.order_count), 0),
      totalRevenue: rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
      avgOrderValue: rows.reduce((sum, row) => sum + parseFloat(row.avg_order_value || 0), 0) / rows.length,
      totalCustomers: rows.reduce((sum, row) => sum + parseInt(row.unique_customers), 0)
    };
  }
}

module.exports = new AnalyticsService();
