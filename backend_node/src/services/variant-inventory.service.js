const mysqlProductRepository = require('../repositories/product.sql.repository');
const { mysqlPool } = require('../config/db');

/**
 * Variant Inventory Service
 * Handles variant-based stock management for clothing ecommerce
 * Stock is stored per variant (Color + Size combination)
 */
class VariantInventoryService {
  /**
   * Calculate total stock for a product (sum of all variant stocks)
   * @param {number} productId - Product ID
   * @returns {Promise<number>} Total stock across all variants
   */
  async calculateTotalStock(productId) {
    try {
      return await mysqlProductRepository.getProductTotalStock(productId);
    } catch (error) {
      console.error('[VariantInventoryService] calculateTotalStock error:', error.message);
      throw error;
    }
  }

  /**
   * Get stock for a specific variant
   * @param {number} productId - Product ID
   * @param {string} color - Variant color
   * @param {string} size - Variant size
   * @returns {Promise<Object>} Stock information
   */
  async getVariantStock(productId, color, size) {
    try {
      const stock = await mysqlProductRepository.getVariantStock(productId, color, size);
      
      if (!stock) {
        return {
          found: false,
          stock: 0,
          isOutOfStock: true,
          isLowStock: false,
          message: 'Variant not found'
        };
      }

      return {
        found: true,
        variantId: stock.variantId,
        stock: stock.stock,
        lowStockThreshold: stock.lowStockThreshold,
        isOutOfStock: stock.isOutOfStock,
        isLowStock: stock.isLowStock,
        message: stock.isOutOfStock 
          ? 'Out of stock' 
          : stock.isLowStock 
            ? `Only ${stock.stock} pieces left`
            : 'In stock'
      };
    } catch (error) {
      console.error('[VariantInventoryService] getVariantStock error:', error.message);
      throw error;
    }
  }

  /**
   * Validate if requested quantity is available for a variant
   * @param {number} productId - Product ID
   * @param {string} color - Variant color
   * @param {string} size - Variant size
   * @param {number} requestedQuantity - Quantity requested
   * @returns {Promise<Object>} Validation result
   */
  async validateStockAvailability(productId, color, size, requestedQuantity) {
    try {
      const stockInfo = await this.getVariantStock(productId, color, size);

      if (!stockInfo.found) {
        return {
          valid: false,
          available: 0,
          requested: requestedQuantity,
          message: 'This variant is not available'
        };
      }

      if (stockInfo.isOutOfStock) {
        return {
          valid: false,
          available: 0,
          requested: requestedQuantity,
          message: 'This variant is out of stock'
        };
      }

      const isAvailable = stockInfo.stock >= requestedQuantity;

      return {
        valid: isAvailable,
        available: stockInfo.stock,
        requested: requestedQuantity,
        message: isAvailable 
          ? 'Stock available' 
          : `Only ${stockInfo.stock} items available`,
        variantId: stockInfo.variantId
      };
    } catch (error) {
      console.error('[VariantInventoryService] validateStockAvailability error:', error.message);
      throw error;
    }
  }

  /**
   * Reduce stock for a variant after purchase
   * Uses optimistic locking to prevent overselling
   * @param {number} variantId - Variant ID
   * @param {number} quantity - Quantity to reduce
   * @param {number} expectedVersion - Expected version for optimistic locking
   * @returns {Promise<Object>} Result of stock reduction
   */
  async reduceStock(variantId, quantity, expectedVersion = null) {
    try {
      const result = await mysqlProductRepository.updateVariantStockOptimistic(
        variantId, 
        quantity, 
        expectedVersion
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          currentStock: result.currentStock
        };
      }

      return {
        success: true,
        newStock: result.newStock,
        newVersion: result.newVersion,
        message: `Stock reduced by ${quantity}. New stock: ${result.newStock}`
      };
    } catch (error) {
      console.error('[VariantInventoryService] reduceStock error:', error.message);
      throw error;
    }
  }

  /**
   * Reduce stock for a variant by product/color/size
   * @param {number} productId - Product ID
   * @param {string} color - Variant color
   * @param {string} size - Variant size
   * @param {number} quantity - Quantity to reduce
   * @returns {Promise<Object>} Result of stock reduction
   */
  async reduceStockByVariantDetails(productId, color, size, quantity) {
    try {
      const stockInfo = await this.getVariantStock(productId, color, size);

      if (!stockInfo.found) {
        return {
          success: false,
          error: 'Variant not found'
        };
      }

      return await this.reduceStock(stockInfo.variantId, quantity);
    } catch (error) {
      console.error('[VariantInventoryService] reduceStockByVariantDetails error:', error.message);
      throw error;
    }
  }

  /**
   * Get variant matrix with stock status for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} Variant matrix with stock status
   */
  async getVariantMatrix(productId) {
    try {
      const variants = await mysqlProductRepository.getVariantMatrix(productId);

      return variants.map(v => ({
        id: v.id,
        color: v.color,
        size: v.size,
        stock: v.stock_level || v.stock_quantity || 0,
        price: v.price,
        priceOverride: v.price_override,
        sku: v.sku,
        image: v.image,
        stockStatus: (v.stock_level || v.stock_quantity || 0) === 0 
          ? 'out_of_stock' 
          : (v.stock_level || v.stock_quantity || 0) <= (v.low_stock_threshold || 5)
            ? 'low_stock'
            : 'in_stock',
        isOutOfStock: (v.stock_level || v.stock_quantity || 0) === 0,
        isLowStock: (v.stock_level || v.stock_quantity || 0) <= (v.low_stock_threshold || 5)
      }));
    } catch (error) {
      console.error('[VariantInventoryService] getVariantMatrix error:', error.message);
      throw error;
    }
  }

  /**
   * Get all available colors for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} Array of color names
   */
  async getAvailableColors(productId) {
    try {
      return await mysqlProductRepository.getProductColors(productId);
    } catch (error) {
      console.error('[VariantInventoryService] getAvailableColors error:', error.message);
      throw error;
    }
  }

  /**
   * Get all available sizes for a product (optionally filtered by color)
   * @param {number} productId - Product ID
   * @param {string} color - Optional color filter
   * @returns {Promise<Array>} Array of sizes
   */
  async getAvailableSizes(productId, color = null) {
    try {
      return await mysqlProductRepository.getProductSizes(productId, color);
    } catch (error) {
      console.error('[VariantInventoryService] getAvailableSizes error:', error.message);
      throw error;
    }
  }

  /**
   * Sync variant matrix for a product (bulk create/update)
   * @param {number} productId - Product ID
   * @param {Array} variants - Array of variant data
   * @returns {Promise<boolean>} Success status
   */
  async syncVariantMatrix(productId, variants) {
    try {
      await mysqlProductRepository.syncVariantMatrix(productId, variants);
      return true;
    } catch (error) {
      console.error('[VariantInventoryService] syncVariantMatrix error:', error.message);
      throw error;
    }
  }

  /**
   * Update stock level for a specific variant
   * @param {number} variantId - Variant ID
   * @param {number} newStockLevel - New stock level
   * @returns {Promise<Object>} Updated variant info
   */
  async updateStockLevel(variantId, newStockLevel) {
    try {
      if (newStockLevel < 0) {
        throw new Error('Stock level cannot be negative');
      }

      const connection = await mysqlPool.getConnection();
      try {
        await connection.beginTransaction();

        // Update product_variants
        await connection.query(
          'UPDATE product_variants SET stock_quantity = ?, version = version + 1 WHERE id = ?',
          [newStockLevel, variantId]
        );

        // Update variant_inventory
        await connection.query(
          'UPDATE variant_inventory SET stock_level = ? WHERE variant_id = ?',
          [newStockLevel, variantId]
        );

        await connection.commit();

        // Fetch updated info
        const [rows] = await connection.query(
          `SELECT v.*, vi.stock_level, vi.low_stock_threshold
           FROM product_variants v
           LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
           WHERE v.id = ?`,
          [variantId]
        );

        const variant = rows[0];

        return {
          variantId,
          stock: newStockLevel,
          stockStatus: newStockLevel === 0 
            ? 'out_of_stock' 
            : newStockLevel <= (variant?.low_stock_threshold || 5)
              ? 'low_stock'
              : 'in_stock',
          version: variant?.version || 0
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[VariantInventoryService] updateStockLevel error:', error.message);
      throw error;
    }
  }

  /**
   * Get low stock variants across all products
   * @param {number} threshold - Stock threshold
   * @returns {Promise<Array>} Low stock variants
   */
  async getLowStockVariants(threshold = 5) {
    try {
      const [rows] = await mysqlPool.query(`
        SELECT 
          v.id,
          v.product_id,
          p.name as product_name,
          v.color,
          v.size,
          v.sku,
          vi.stock_level,
          vi.low_stock_threshold,
          CASE
            WHEN vi.stock_level = 0 THEN 'out_of_stock'
            WHEN vi.stock_level <= ${threshold} THEN 'low_stock'
            ELSE 'in_stock'
          END as stock_status
        FROM product_variants v
        INNER JOIN products p ON v.product_id = p.id
        LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
        WHERE vi.stock_level IS NULL OR vi.stock_level <= ?
        ORDER BY vi.stock_level ASC, p.name, v.color, v.size
      `, [threshold]);

      return rows;
    } catch (error) {
      console.error('[VariantInventoryService] getLowStockVariants error:', error.message);
      throw error;
    }
  }

  /**
   * Reserve stock for a cart item (temporary hold)
   * This is used for cart reservation with expiration
   * @param {number} variantId - Variant ID
   * @param {number} quantity - Quantity to reserve
   * @param {string} sessionId - Session/Cart ID
   * @param {number} expirationMinutes - Reservation expiration in minutes
   * @returns {Promise<Object>} Reservation result
   */
  async reserveStock(variantId, quantity, sessionId, expirationMinutes = 15) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Check current stock with lock
      const [current] = await connection.query(
        'SELECT stock_quantity, version FROM product_variants WHERE id = ? FOR UPDATE',
        [variantId]
      );

      if (current.length === 0) {
        await connection.rollback();
        return { success: false, error: 'Variant not found' };
      }

      const { stock_quantity: currentStock, version: currentVersion } = current[0];

      if (currentStock < quantity) {
        await connection.rollback();
        return { 
          success: false, 
          error: 'Insufficient stock',
          available: currentStock,
          requested: quantity
        };
      }

      // Check for existing reservation
      const [existingReservations] = await connection.query(
        `SELECT id, quantity FROM inventory_reservations 
         WHERE variant_id = ? AND session_id = ? AND status = 'active'
         AND expires_at > NOW()`,
        [variantId, sessionId]
      );

      if (existingReservations.length > 0) {
        // Update existing reservation
        const existingQty = existingReservations.reduce((sum, r) => sum + r.quantity, 0);
        if (existingQty >= quantity) {
          await connection.rollback();
          return { 
            success: true, 
            message: 'Reservation already exists',
            reserved: existingQty
          };
        }
      }

      // Create new reservation
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
      
      await connection.query(`
        INSERT INTO inventory_reservations 
        (variant_id, session_id, quantity, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, 'active', NOW())
        ON DUPLICATE KEY UPDATE 
          quantity = VALUES(quantity),
          expires_at = VALUES(expires_at),
          updated_at = NOW()
      `, [variantId, sessionId, quantity, expiresAt]);

      await connection.commit();

      return {
        success: true,
        reserved: quantity,
        expiresAt: expiresAt.toISOString(),
        message: `Reserved ${quantity} items for ${expirationMinutes} minutes`
      };
    } catch (error) {
      await connection.rollback();
      console.error('[VariantInventoryService] reserveStock error:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Release reserved stock (when cart is abandoned or checkout cancelled)
   * @param {string} sessionId - Session/Cart ID
   * @returns {Promise<number>} Number of reservations released
   */
  async releaseReservation(sessionId) {
    try {
      const [result] = await mysqlPool.query(
        `DELETE FROM inventory_reservations 
         WHERE session_id = ? AND status = 'active'`,
        [sessionId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('[VariantInventoryService] releaseReservation error:', error.message);
      throw error;
    }
  }

  /**
   * Confirm reservation and reduce stock (on successful checkout)
   * @param {string} sessionId - Session/Cart ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmReservation(sessionId) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Get all active reservations for this session
      const [reservations] = await connection.query(
        `SELECT variant_id, quantity FROM inventory_reservations 
         WHERE session_id = ? AND status = 'active' AND expires_at > NOW()
         FOR UPDATE`,
        [sessionId]
      );

      if (reservations.length === 0) {
        await connection.rollback();
        return { success: false, error: 'No active reservations found' };
      }

      // Process each reservation
      for (const reservation of reservations) {
        const result = await mysqlProductRepository.updateVariantStockOptimistic(
          reservation.variant_id,
          reservation.quantity
        );

        if (!result.success) {
          await connection.rollback();
          return {
            success: false,
            error: `Failed to reduce stock for variant ${reservation.variant_id}: ${result.error}`
          };
        }
      }

      // Delete the reservations
      await connection.query(
        `DELETE FROM inventory_reservations WHERE session_id = ?`,
        [sessionId]
      );

      await connection.commit();

      return {
        success: true,
        message: `Confirmed ${reservations.length} reservations`,
        itemsProcessed: reservations.length
      };
    } catch (error) {
      await connection.rollback();
      console.error('[VariantInventoryService] confirmReservation error:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Clean up expired reservations
   * @returns {Promise<number>} Number of expired reservations cleaned
   */
  async cleanupExpiredReservations() {
    try {
      const [result] = await mysqlPool.query(
        `DELETE FROM inventory_reservations 
         WHERE status = 'active' AND expires_at < NOW()`
      );
      return result.affectedRows;
    } catch (error) {
      console.error('[VariantInventoryService] cleanupExpiredReservations error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  VariantInventoryService,
  variantInventoryService: new VariantInventoryService(),
};
