/**
 * Fraud Detection Service
 * Basic fraud detection rules for orders
 */

const { mysqlPool } = require('../../config/db');

class FraudDetectionService {
  /**
   * Analyze order for fraud
   * Called during order creation
   */
  async analyzeOrder(orderData) {
    const {
      userId,
      totalAmount,
      billingAddress,
      shippingAddress,
      paymentMethod
    } = orderData;

    const fraudScore = 0;
    const fraudReasons = [];

    // Rule 1: Unusually high order value
    const highValueThreshold = 50000; // ₹50,000
    if (totalAmount > highValueThreshold) {
      fraudScore += 30;
      fraudReasons.push(`High order value: ₹${totalAmount}`);
    }

    // Rule 2: Mismatched billing and shipping country
    if (billingAddress && shippingAddress) {
      if (billingAddress.country !== shippingAddress.country) {
        fraudScore += 25;
        fraudReasons.push('Billing and shipping country mismatch');
      }

      // Rule 3: Mismatched billing and shipping state with high value
      if (billingAddress.state !== shippingAddress.state && totalAmount > 10000) {
        fraudScore += 15;
        fraudReasons.push('Billing and shipping state mismatch with high value');
      }
    }

    // Rule 4: Multiple orders from same user in short time
    const recentOrdersCount = await this._getRecentOrdersCount(userId, 60); // Last 60 minutes
    if (recentOrdersCount >= 3) {
      fraudScore += 35;
      fraudReasons.push(`Multiple orders (${recentOrdersCount}) in last 60 minutes`);
    }

    // Rule 5: First-time customer with high value order
    const isFirstTimeCustomer = await this._isFirstTimeCustomer(userId);
    if (isFirstTimeCustomer && totalAmount > 20000) {
      fraudScore += 20;
      fraudReasons.push('First-time customer with high value order');
    }

    // Rule 6: COD with high value
    if (paymentMethod === 'cod' && totalAmount > 15000) {
      fraudScore += 25;
      fraudReasons.push('COD with high value');
    }

    // Rule 7: Suspicious email pattern
    if (orderData.email && this._isSuspiciousEmail(orderData.email)) {
      fraudScore += 15;
      fraudReasons.push('Suspicious email pattern');
    }

    // Rule 8: International shipping with high value
    const isInternational = shippingAddress && shippingAddress.country !== 'India';
    if (isInternational && totalAmount > 30000) {
      fraudScore += 20;
      fraudReasons.push('International shipping with high value');
    }

    // Determine if order should be flagged
    const isFlagged = fraudScore >= 50;
    const riskLevel = this._getRiskLevel(fraudScore);

    return {
      isFlagged,
      fraudScore: Math.min(fraudScore, 100),
      riskLevel,
      fraudReasons,
      requiresReview: isFlagged
    };
  }

  /**
   * Mark order as flagged
   */
  async flagOrder(orderId, fraudAnalysis) {
    await mysqlPool.query(
      `UPDATE orders 
       SET is_flagged = TRUE, fraud_score = ?, fraud_reasons = ?
       WHERE id = ?`,
      [fraudAnalysis.fraudScore, JSON.stringify(fraudAnalysis.fraudReasons), orderId]
    );

    return { success: true, orderId, flagged: true };
  }

  /**
   * Get flagged orders
   */
  async getFlaggedOrders(params = {}) {
    const { page = 1, per_page = 20, status } = params;
    const offset = (page - 1) * per_page;

    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u._id
      WHERE o.is_flagged = TRUE
    `;
    const values = [];

    if (status) {
      query += ' AND o.status = ?';
      values.push(status);
    }

    query += ' ORDER BY o.fraud_score DESC, o.created_at DESC LIMIT ? OFFSET ?';
    values.push(parseInt(per_page), parseInt(offset));

    const [rows] = await mysqlPool.query(query, values);

    const [countResult] = await mysqlPool.query(
      'SELECT COUNT(*) as total FROM orders WHERE is_flagged = TRUE'
    );

    return {
      orders: rows.map(row => ({
        id: row.id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        totalAmount: parseFloat(row.total_amount),
        fraudScore: row.fraud_score,
        fraudReasons: row.fraud_reasons ? JSON.parse(row.fraud_reasons) : [],
        status: row.status,
        isFlagged: row.is_flagged,
        createdAt: row.created_at
      })),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / per_page)
      }
    };
  }

  /**
   * Unflag order
   */
  async unflagOrder(orderId, adminId, notes = '') {
    await mysqlPool.query(
      `UPDATE orders SET is_flagged = FALSE, fraud_score = 0, fraud_reasons = NULL
       WHERE id = ?`,
      [orderId]
    );

    // Log the action (could go to order_notes table)
    console.log(`[Fraud Detection] Order ${orderId} unflagged by admin ${adminId}. Notes: ${notes}`);

    return { success: true, orderId, flagged: false };
  }

  /**
   * Get recent orders count for user
   */
  async _getRecentOrdersCount(userId, minutes = 60) {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    const [rows] = await mysqlPool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at >= ?',
      [userId, cutoffTime]
    );

    return rows[0].count;
  }

  /**
   * Check if customer is first-time
   */
  async _isFirstTimeCustomer(userId) {
    const [rows] = await mysqlPool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN ("completed", "delivered")',
      [userId]
    );

    return rows[0].count === 0;
  }

  /**
   * Check for suspicious email pattern
   */
  _isSuspiciousEmail(email) {
    if (!email) return false;

    // Check for temporary email domains
    const suspiciousDomains = [
      'tempmail.com',
      'throwaway.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.includes(domain)) {
      return true;
    }

    // Check for excessive numbers in email
    const localPart = email.split('@')[0];
    if (localPart && /\d{5,}/.test(localPart)) {
      return true;
    }

    return false;
  }

  /**
   * Get risk level from score
   */
  _getRiskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'minimal';
  }

  /**
   * Get fraud statistics
   */
  async getFraudStats(startDate, endDate) {
    const [stats] = await mysqlPool.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(CASE WHEN is_flagged = TRUE THEN 1 ELSE 0 END) as flagged_orders,
         AVG(CASE WHEN is_flagged = TRUE THEN fraud_score ELSE NULL END) as avg_fraud_score,
         SUM(total_amount) as total_revenue,
         SUM(CASE WHEN is_flagged = TRUE THEN total_amount ELSE 0 END) as flagged_revenue
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const s = stats[0];
    return {
      totalOrders: parseInt(s.total_orders),
      flaggedOrders: parseInt(s.flagged_orders),
      flagRate: s.total_orders > 0 ? ((s.flagged_orders / s.total_orders) * 100).toFixed(2) : 0,
      avgFraudScore: parseFloat(s.avg_fraud_score || 0),
      totalRevenue: parseFloat(s.total_revenue || 0),
      flaggedRevenue: parseFloat(s.flagged_revenue || 0)
    };
  }
}

module.exports = new FraudDetectionService();
