const { InventoryAuditLog, Product } = require('../models');
const mongoose = require('mongoose');

/**
 * Inventory Audit Log Service
 * Tracks all inventory changes using MongoDB
 */
class InventoryAuditService {
  /**
   * Log an inventory change
   * @param {Object} data - Audit log data
   * @returns {Promise<Object>} Created audit log document
   */
  async logInventoryChange(data) {
    try {
      const auditLog = await InventoryAuditLog.create({
        variantId: data.variantId,
        productId: data.productId,
        changeType: data.changeType,
        oldStockLevel: data.oldStockLevel,
        newStockLevel: data.newStockLevel,
        quantityChanged: data.quantityChanged,
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null,
        userId: data.userId || null,
        notes: data.notes || null
      });

      return auditLog;
    } catch (error) {
      console.error('[InventoryAuditService] logInventoryChange error:', error.message);
      throw error;
    }
  }

  /**
   * Log stock reduction due to sale
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
   */
  async getVariantAuditLogs(variantId, options = {}) {
    const limit = parseInt(options.limit) || 50;
    const page = parseInt(options.page) || 1;
    const skip = (page - 1) * limit;

    const logs = await InventoryAuditLog.find({ variantId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'name')
      .lean();

    return logs;
  }

  /**
   * Get audit logs for a product
   */
  async getProductAuditLogs(productId, options = {}) {
    const limit = parseInt(options.limit) || 50;
    const page = parseInt(options.page) || 1;
    const skip = (page - 1) * limit;

    const logs = await InventoryAuditLog.find({ productId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return logs;
  }

  /**
   * Get inventory change summary
   */
  async getInventorySummary(startDate, endDate, productId = null) {
    const query = {
      created_at: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (productId) {
      query.productId = productId;
    }

    const summary = await InventoryAuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$changeType',
          transaction_count: { $sum: 1 },
          total_quantity_changed: { $sum: '$quantityChanged' },
          avg_quantity: { $avg: '$quantityChanged' }
        }
      },
      {
        $project: {
          change_type: '$_id',
          transaction_count: 1,
          total_quantity_changed: 1,
          avg_quantity: 1,
          _id: 0
        }
      },
      { $sort: { transaction_count: -1 } }
    ]);

    return summary;
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts() {
    // This logic is better handled in InventoryService or via a more complex aggregation
    // For now, return products with low stock variants
    const products = await Product.find({
      'variants.stock': { $lte: 5 }, // Default threshold
      is_deleted: { $ne: true }
    }).lean();

    const alerts = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        if (v.stock <= (v.lowStockThreshold || 5)) {
          alerts.push({
            variant_id: v._id,
            sku: v.sku,
            product_id: p._id,
            product_name: p.name,
            stock_level: v.stock,
            low_stock_threshold: v.lowStockThreshold || 5,
            stock_status: v.stock === 0 ? 'out_of_stock' : 'low_stock'
          });
        }
      });
    });

    return alerts;
  }
}

module.exports = {
  InventoryAuditService,
  inventoryAuditService: new InventoryAuditService(),
};
