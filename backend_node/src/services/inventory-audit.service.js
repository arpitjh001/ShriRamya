const { mysqlPool } = require('../config/db');

/**
 * Inventory Audit Log Service
 * Tracks all inventory changes for compliance, analytics, and debugging
 */
class InventoryAuditService {
  /**
   * Log an inventory change
   * @param {Object} data - Audit log data
   * @returns {Promise<number>} Created audit log ID
   */
  async logInventoryChange(data) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO inventory_audit_log (
          variant_id, product_id, change_type,
          old_stock_level, new_stock_level, quantity_changed,
          reference_type, reference_id, user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.variantId,
          data.productId,
          data.changeType,
          data.oldStockLevel,
          data.newStockLevel,
          data.quantityChanged,
          data.referenceType || null,
          data.referenceId || null,
          data.userId || null,
          data.notes || null
        ]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Log stock reduction due to sale
   * @param {number} variantId - Variant ID
   * @param {number} productId - Product ID
   * @param {number} oldStock - Old stock level
   * @param {number} newStock - New stock level
   * @param {number} quantity - Quantity sold
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (optional)
   * @returns {Promise<number>} Audit log ID
   */
  async logSale(variantId, productId, oldStock, newStock, quantity, orderId, userId = null) {
    return this.logInventoryChange({
      variantId,
      productId,
      changeType: 'sale',
      oldStockLevel: oldStock,
      newStockLevel: newStock,
      quantityChanged: -quantity,
      referenceType: 'order',
      referenceId: orderId,
      userId,
      notes: `Stock reduced due to order #${orderId}`
    });
  }

  /**
   * Log stock increase due to restock
   * @param {number} variantId - Variant ID
   * @param {number} productId - Product ID
   * @param {number} oldStock - Old stock level
   * @param {number} newStock - New stock level
   * @param {number} quantity - Quantity added
   * @param {number} userId - User ID who performed restock
   * @param {string} notes - Additional notes
   * @returns {Promise<number>} Audit log ID
   */
  async logRestock(variantId, productId, oldStock, newStock, quantity, userId, notes = '') {
    return this.logInventoryChange({
      variantId,
      productId,
      changeType: 'restock',
      oldStockLevel: oldStock,
      newStockLevel: newStock,
      quantityChanged: quantity,
      referenceType: 'admin',
      referenceId: userId,
      userId,
      notes: notes || `Restocked ${quantity} units`
    });
  }

  /**
   * Log stock return
   * @param {number} variantId - Variant ID
   * @param {number} productId - Product ID
   * @param {number} oldStock - Old stock level
   * @param {number} newStock - New stock level
   * @param {number} quantity - Quantity returned
   * @param {number} orderId - Original order ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Audit log ID
   */
  async logReturn(variantId, productId, oldStock, newStock, quantity, orderId, userId = null) {
    return this.logInventoryChange({
      variantId,
      productId,
      changeType: 'return',
      oldStockLevel: oldStock,
      newStockLevel: newStock,
      quantityChanged: quantity,
      referenceType: 'order',
      referenceId: orderId,
      userId,
      notes: `Stock returned from order #${orderId}`
    });
  }

  /**
   * Log manual stock adjustment
   * @param {number} variantId - Variant ID
   * @param {number} productId - Product ID
   * @param {number} oldStock - Old stock level
   * @param {number} newStock - New stock level
   * @param {number} userId - User ID who made adjustment
   * @param {string} notes - Reason for adjustment
   * @returns {Promise<number>} Audit log ID
   */
  async logAdjustment(variantId, productId, oldStock, newStock, userId, notes) {
    const quantityChanged = newStock - oldStock;
    return this.logInventoryChange({
      variantId,
      productId,
      changeType: 'adjustment',
      oldStockLevel: oldStock,
      newStockLevel: newStock,
      quantityChanged,
      referenceType: 'admin',
      referenceId: userId,
      userId,
      notes: notes || `Manual adjustment: ${quantityChanged > 0 ? '+' : ''}${quantityChanged}`
    });
  }

  /**
   * Log stock reservation
   * @param {number} variantId - Variant ID
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity reserved
   * @param {string} sessionId - Cart/Session ID
   * @returns {Promise<number>} Audit log ID
   */
  async logReservation(variantId, productId, quantity, sessionId) {
    return this.logInventoryChange({
      variantId,
      productId,
      changeType: 'reservation',
      oldStockLevel: 0,
      newStockLevel: 0,
      quantityChanged: -quantity,
      referenceType: 'cart',
      referenceId: sessionId,
      notes: `Stock reserved for cart ${sessionId}`
    });
  }

  /**
   * Get audit logs for a variant
   * @param {number} variantId - Variant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  async getVariantAuditLogs(variantId, options = {}) {
    const limit = options.limit || 50;
    const offset = (options.page || 1) * limit - limit;

    const [rows] = await mysqlPool.query(
      `SELECT al.*, p.name as product_name, pv.sku, pv.color, pv.size
       FROM inventory_audit_log al
       INNER JOIN product_variants pv ON al.variant_id = pv.id
       INNER JOIN products p ON al.product_id = p.id
       WHERE al.variant_id = ?
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [variantId, limit, offset]
    );

    return rows;
  }

  /**
   * Get audit logs for a product (all variants)
   * @param {number} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  async getProductAuditLogs(productId, options = {}) {
    const limit = options.limit || 50;
    const offset = (options.page || 1) * limit - limit;

    const [rows] = await mysqlPool.query(
      `SELECT al.*, pv.sku, pv.color, pv.size
       FROM inventory_audit_log al
       INNER JOIN product_variants pv ON al.variant_id = pv.id
       WHERE al.product_id = ?
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );

    return rows;
  }

  /**
   * Get inventory change summary for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} productId - Optional product filter
   * @returns {Promise<Object>} Summary statistics
   */
  async getInventorySummary(startDate, endDate, productId = null) {
    const params = [startDate, endDate];
    let productFilter = '';

    if (productId) {
      productFilter = ' AND product_id = ?';
      params.push(productId);
    }

    const [rows] = await mysqlPool.query(
      `SELECT
        change_type,
        COUNT(*) as transaction_count,
        SUM(quantity_changed) as total_quantity_changed,
        AVG(quantity_changed) as avg_quantity
       FROM inventory_audit_log
       WHERE created_at BETWEEN ? AND ?${productFilter}
       GROUP BY change_type
       ORDER BY transaction_count DESC`,
      params
    );

    return rows;
  }

  /**
   * Get low stock alerts based on reorder level
   * @returns {Promise<Array>} Low stock variants
   */
  async getLowStockAlerts() {
    const [rows] = await mysqlPool.query(`
      SELECT
        pv.id as variant_id,
        pv.sku,
        pv.color,
        pv.size,
        p.id as product_id,
        p.name as product_name,
        vi.stock_level,
        vi.low_stock_threshold,
        vi.reorder_level,
        vi.reorder_quantity,
        CASE
          WHEN vi.stock_level = 0 THEN 'out_of_stock'
          WHEN vi.stock_level <= vi.low_stock_threshold THEN 'low_stock'
          WHEN vi.stock_level <= vi.reorder_level THEN 'needs_reorder'
          ELSE 'in_stock'
        END as stock_status
      FROM product_variants pv
      INNER JOIN products p ON pv.product_id = p.id
      INNER JOIN variant_inventory vi ON pv.id = vi.variant_id
      WHERE vi.stock_level <= vi.reorder_level
        AND (p.deleted_at IS NULL OR p.deleted_at = 0)
      ORDER BY vi.stock_level ASC, p.name, pv.color, pv.size
    `);

    return rows;
  }
}

module.exports = {
  InventoryAuditService,
  inventoryAuditService: new InventoryAuditService(),
};
