const { mysqlPool } = require('../config/db');

/**
 * Inventory Service
 * Handles inventory and stock level operations
 */
class InventoryService {
  /**
   * Get low stock items
   * @param {number} threshold - Stock level threshold
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItems(threshold = 10) {
    try {
      // Check if variant_inventory table exists
      const [tables] = await mysqlPool.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'variant_inventory'
      `);

      if (tables.length === 0) {
        // Fallback: return variants with low stock from product_variants
        const [variants] = await mysqlPool.query(`
          SELECT 
            pv.id,
            pv.sku,
            pv.product_id,
            p.name as product_name,
            pv.price,
            pv.stock as stock_level,
            pv.low_stock_threshold,
            pv.created_at,
            pv.updated_at
          FROM product_variants pv
          INNER JOIN products p ON pv.product_id = p.id
          WHERE pv.stock IS NULL OR pv.stock <= ?
          ORDER BY pv.stock ASC
        `, [threshold]);
        return variants;
      }

      // Use variant_inventory table
      const [items] = await mysqlPool.query(`
        SELECT 
          pv.id,
          pv.sku,
          pv.product_id,
          p.name as product_name,
          pv.price,
          vi.stock_level,
          vi.low_stock_threshold,
          pv.created_at,
          pv.updated_at
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN variant_inventory vi ON pv.id = vi.variant_id
        WHERE vi.stock_level IS NULL OR vi.stock_level <= ?
        ORDER BY vi.stock_level ASC
      `, [threshold]);

      return items;
    } catch (error) {
      console.error('[InventoryService] getLowStockItems error:', error.message);
      throw error;
    }
  }

  /**
   * Get stock levels for all variants
   * @returns {Promise<Array>} Stock levels
   */
  async getStockLevels() {
    try {
      const [levels] = await mysqlPool.query(`
        SELECT 
          pv.id,
          pv.sku,
          pv.product_id,
          p.name as product_name,
          COALESCE(pv.stock, 0) as stock_level,
          COALESCE(pv.low_stock_threshold, 5) as low_stock_threshold,
          CASE 
            WHEN pv.stock IS NULL THEN 'unknown'
            WHEN pv.stock = 0 THEN 'out_of_stock'
            WHEN pv.stock <= pv.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END as stock_status
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        ORDER BY pv.product_id, pv.sku
      `);

      return levels;
    } catch (error) {
      console.error('[InventoryService] getStockLevels error:', error.message);
      throw error;
    }
  }

  /**
   * Update stock level for a variant
   * @param {number} variantId - Variant ID
   * @param {number} stockLevel - New stock level
   * @param {number} lowStockThreshold - Low stock threshold
   * @returns {Promise<Object>} Updated stock info
   */
  async updateStockLevel(variantId, stockLevel, lowStockThreshold = 5) {
    try {
      // Update product_variants directly
      await mysqlPool.query(
        `UPDATE product_variants 
         SET stock = ?, low_stock_threshold = ? 
         WHERE id = ?`,
        [stockLevel, lowStockThreshold, variantId]
      );

      // Fetch updated record
      const [updated] = await mysqlPool.query(
        `SELECT 
          pv.id,
          pv.sku,
          p.name as product_name,
          pv.stock as stock_level,
          pv.low_stock_threshold,
          CASE 
            WHEN pv.stock = 0 THEN 'out_of_stock'
            WHEN pv.stock <= pv.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END as stock_status
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        WHERE pv.id = ?`,
        [variantId]
      );

      return updated[0];
    } catch (error) {
      console.error('[InventoryService] updateStockLevel error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  InventoryService,
  inventoryService: new InventoryService(),
};
