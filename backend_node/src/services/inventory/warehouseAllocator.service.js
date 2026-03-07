/**
 * Multi-Warehouse Inventory Service
 * Handles inventory allocation across multiple warehouses
 */

const { mysqlPool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

class WarehouseInventoryService {
  /**
   * Create a new warehouse
   */
  async createWarehouse(warehouseData) {
    const [result] = await mysqlPool.query(
      `INSERT INTO warehouses (name, city, country, address, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        warehouseData.name,
        warehouseData.city,
        warehouseData.country,
        warehouseData.address || null,
        warehouseData.latitude || null,
        warehouseData.longitude || null,
        warehouseData.is_active !== undefined ? warehouseData.is_active : true
      ]
    );

    return this.getWarehouseById(result.insertId);
  }

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(id) {
    const [rows] = await mysqlPool.query('SELECT * FROM warehouses WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }

    return this._formatWarehouse(rows[0]);
  }

  /**
   * Get all warehouses
   */
  async getAllWarehouses(params = {}) {
    const { is_active, city, country } = params;
    
    let query = 'SELECT * FROM warehouses WHERE 1=1';
    const values = [];

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      values.push(is_active);
    }

    if (city) {
      query += ' AND city = ?';
      values.push(city);
    }

    if (country) {
      query += ' AND country = ?';
      values.push(country);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await mysqlPool.query(query, values);
    return rows.map(warehouse => this._formatWarehouse(warehouse));
  }

  /**
   * Update warehouse
   */
  async updateWarehouse(id, updateData) {
    const allowedFields = ['name', 'city', 'country', 'address', 'latitude', 'longitude', 'is_active'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');
    }

    values.push(id);
    await mysqlPool.query(
      `UPDATE warehouses SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getWarehouseById(id);
  }

  /**
   * Delete warehouse
   */
  async deleteWarehouse(id) {
    const [result] = await mysqlPool.query('DELETE FROM warehouses WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }

    return { id, deleted: true };
  }

  /**
   * Add stock to warehouse
   */
  async addStock(variantId, warehouseId, quantity) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if warehouse exists
      const [warehouse] = await connection.query('SELECT id FROM warehouses WHERE id = ?', [warehouseId]);
      if (warehouse.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
      }

      // Check if variant exists
      const [variant] = await connection.query('SELECT id FROM product_variants WHERE id = ?', [variantId]);
      if (variant.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Variant not found');
      }

      // Upsert inventory
      await connection.query(
        `INSERT INTO warehouse_inventory (variant_id, warehouse_id, stock, reserved_stock)
         VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)`,
        [variantId, warehouseId, quantity]
      );

      await connection.commit();

      return this.getInventoryForVariant(variantId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Set stock level for variant in warehouse
   */
  async setStockLevel(variantId, warehouseId, quantity) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if warehouse exists
      const [warehouse] = await connection.query('SELECT id FROM warehouses WHERE id = ?', [warehouseId]);
      if (warehouse.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
      }

      // Upsert inventory with exact stock level
      await connection.query(
        `INSERT INTO warehouse_inventory (variant_id, warehouse_id, stock, reserved_stock)
         VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
        [variantId, warehouseId, quantity]
      );

      await connection.commit();

      return this.getInventoryForVariant(variantId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reserve stock for order
   */
  async reserveStock(variantId, warehouseId, quantity) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current inventory
      const [inventory] = await connection.query(
        'SELECT * FROM warehouse_inventory WHERE variant_id = ? AND warehouse_id = ? FOR UPDATE',
        [variantId, warehouseId]
      );

      if (inventory.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Inventory not found for this variant-warehouse combination');
      }

      const availableStock = inventory[0].stock - inventory[0].reserved_stock;
      
      if (availableStock < quantity) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${availableStock}`);
      }

      // Reserve stock
      await connection.query(
        'UPDATE warehouse_inventory SET reserved_stock = reserved_stock + ? WHERE variant_id = ? AND warehouse_id = ?',
        [quantity, variantId, warehouseId]
      );

      await connection.commit();

      return {
        variantId,
        warehouseId,
        reserved: quantity,
        remainingStock: availableStock - quantity
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Release reserved stock
   */
  async releaseReservedStock(variantId, warehouseId, quantity) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE warehouse_inventory 
         SET reserved_stock = GREATEST(0, reserved_stock - ?)
         WHERE variant_id = ? AND warehouse_id = ?`,
        [quantity, variantId, warehouseId]
      );

      await connection.commit();

      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Confirm reserved stock (deduct from inventory)
   */
  async confirmReservedStock(variantId, warehouseId, quantity) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE warehouse_inventory 
         SET stock = stock - ?, reserved_stock = reserved_stock - ?
         WHERE variant_id = ? AND warehouse_id = ?`,
        [quantity, quantity, variantId, warehouseId]
      );

      await connection.commit();

      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find nearest warehouse with stock
   */
  async findNearestWarehouseWithStock(variantId, customerCity, customerCountry, requiredQuantity = 1) {
    // First, try to find warehouse in same city
    let [warehouses] = await mysqlPool.query(
      `SELECT wi.*, w.name as warehouse_name, w.city, w.country,
              (wi.stock - wi.reserved_stock) as available_stock
       FROM warehouse_inventory wi
       JOIN warehouses w ON wi.warehouse_id = w.id
       WHERE wi.variant_id = ? 
         AND w.city = ? 
         AND w.country = ?
         AND w.is_active = TRUE
         AND (wi.stock - wi.reserved_stock) >= ?
       ORDER BY available_stock DESC`,
      [variantId, customerCity, customerCountry, requiredQuantity]
    );

    if (warehouses.length > 0) {
      return this._formatWarehouseWithInventory(warehouses[0]);
    }

    // If not found in same city, try same country
    [warehouses] = await mysqlPool.query(
      `SELECT wi.*, w.name as warehouse_name, w.city, w.country,
              (wi.stock - wi.reserved_stock) as available_stock
       FROM warehouse_inventory wi
       JOIN warehouses w ON wi.warehouse_id = w.id
       WHERE wi.variant_id = ? 
         AND w.country = ?
         AND w.is_active = TRUE
         AND (wi.stock - wi.reserved_stock) >= ?
       ORDER BY available_stock DESC`,
      [variantId, customerCountry, requiredQuantity]
    );

    if (warehouses.length > 0) {
      return this._formatWarehouseWithInventory(warehouses[0]);
    }

    // If still not found, return any warehouse with stock
    [warehouses] = await mysqlPool.query(
      `SELECT wi.*, w.name as warehouse_name, w.city, w.country,
              (wi.stock - wi.reserved_stock) as available_stock
       FROM warehouse_inventory wi
       JOIN warehouses w ON wi.warehouse_id = w.id
       WHERE wi.variant_id = ? 
         AND w.is_active = TRUE
         AND (wi.stock - wi.reserved_stock) >= ?
       ORDER BY available_stock DESC
       LIMIT 1`,
      [variantId, requiredQuantity]
    );

    if (warehouses.length > 0) {
      return this._formatWarehouseWithInventory(warehouses[0]);
    }

    return null;
  }

  /**
   * Get inventory for variant across all warehouses
   */
  async getInventoryForVariant(variantId) {
    const [rows] = await mysqlPool.query(
      `SELECT wi.*, w.name as warehouse_name, w.city, w.country,
              (wi.stock - wi.reserved_stock) as available_stock
       FROM warehouse_inventory wi
       JOIN warehouses w ON wi.warehouse_id = w.id
       WHERE wi.variant_id = ?
       ORDER BY available_stock DESC`,
      [variantId]
    );

    return rows.map(row => this._formatWarehouseWithInventory(row));
  }

  /**
   * Get total available stock for variant
   */
  async getTotalAvailableStock(variantId) {
    const [rows] = await mysqlPool.query(
      `SELECT SUM(stock - reserved_stock) as total_available
       FROM warehouse_inventory
       WHERE variant_id = ?`,
      [variantId]
    );

    return rows[0].total_available || 0;
  }

  /**
   * Allocate order to warehouse
   * This is the main method called during order creation
   */
  async allocateOrderToWarehouse(orderItems, customerLocation) {
    const { city, country } = customerLocation;
    const allocations = [];

    for (const item of orderItems) {
      const { variantId, quantity } = item;

      // Find best warehouse for this item
      const warehouse = await this.findNearestWarehouseWithStock(
        variantId,
        city,
        country,
        quantity
      );

      if (!warehouse) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock for variant ${variantId}`
        );
      }

      // Reserve stock
      await this.reserveStock(variantId, warehouse.id, quantity);

      allocations.push({
        variantId,
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouse_name,
        quantity,
        city: warehouse.city,
        country: warehouse.country
      });
    }

    return allocations;
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(threshold = 10) {
    const [rows] = await mysqlPool.query(
      `SELECT wi.*, w.name as warehouse_name, w.city, w.country,
              (wi.stock - wi.reserved_stock) as available_stock,
              pv.sku, p.name as product_name
       FROM warehouse_inventory wi
       JOIN warehouses w ON wi.warehouse_id = w.id
       JOIN product_variants pv ON wi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE (wi.stock - wi.reserved_stock) <= ?
       ORDER BY available_stock ASC`,
      [threshold]
    );

    return rows.map(row => ({
      variantId: row.variant_id,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      city: row.city,
      country: row.country,
      sku: row.sku,
      productName: row.product_name,
      availableStock: row.available_stock,
      totalStock: row.stock,
      reservedStock: row.reserved_stock
    }));
  }

  /**
   * Format warehouse response
   */
  _formatWarehouse(warehouse) {
    return {
      id: warehouse.id,
      name: warehouse.name,
      city: warehouse.city,
      country: warehouse.country,
      address: warehouse.address,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      is_active: warehouse.is_active,
      created_at: warehouse.created_at,
      updated_at: warehouse.updated_at
    };
  }

  /**
   * Format warehouse with inventory response
   */
  _formatWarehouseWithInventory(data) {
    return {
      id: data.warehouse_id || data.id,
      warehouseName: data.warehouse_name || data.name,
      city: data.city,
      country: data.country,
      variantId: data.variant_id,
      stock: data.stock,
      reservedStock: data.reserved_stock,
      availableStock: data.available_stock,
      createdAt: data.created_at
    };
  }
}

module.exports = new WarehouseInventoryService();
