/**
 * Multi-Warehouse Inventory Service
 * Handles inventory allocation across multiple warehouses
 */

const { Warehouse, WarehouseInventory, Product } = require('../../models');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const mongoose = require('mongoose');

class WarehouseInventoryService {
  /**
   * Create a new warehouse
   */
  async createWarehouse(warehouseData) {
    const warehouse = await Warehouse.create(warehouseData);
    return warehouse;
  }

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(id) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }
    return warehouse;
  }

  /**
   * Get all warehouses
   */
  async getAllWarehouses(params = {}) {
    const { is_active, city, country } = params;
    const filter = {};

    if (is_active !== undefined) {
      filter.is_active = is_active;
    }

    if (city) {
      filter.city = city;
    }

    if (country) {
      filter.country = country;
    }

    return Warehouse.find(filter).sort({ name: 1 });
  }

  /**
   * Update warehouse
   */
  async updateWarehouse(id, updateData) {
    const warehouse = await Warehouse.findByIdAndUpdate(id, updateData, { new: true });
    if (!warehouse) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }
    return warehouse;
  }

  /**
   * Delete warehouse
   */
  async deleteWarehouse(id) {
    const result = await Warehouse.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }
    // Also cleanup inventory? Usually better to mark as inactive
    return { id, deleted: true };
  }

  /**
   * Add stock to warehouse
   */
  async addStock(variantId, warehouseId, quantity) {
    // Note: variantId here might be a Mongoose ObjectId
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }

    const inventory = await WarehouseInventory.findOneAndUpdate(
      { warehouseId, variantId },
      { $inc: { stock: quantity } },
      { upsert: true, new: true }
    );

    return this.getInventoryForVariant(variantId);
  }

  /**
   * Set stock level for variant in warehouse
   */
  async setStockLevel(variantId, warehouseId, quantity) {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
    }

    await WarehouseInventory.findOneAndUpdate(
      { warehouseId, variantId },
      { stock: quantity },
      { upsert: true, new: true }
    );

    return this.getInventoryForVariant(variantId);
  }

  /**
   * Reserve stock for order
   */
  async reserveStock(variantId, warehouseId, quantity) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const inventory = await WarehouseInventory.findOne({ warehouseId, variantId }).session(session);
      if (!inventory) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Inventory not found for this variant-warehouse combination');
      }

      const availableStock = inventory.stock - inventory.reserved_stock;
      if (availableStock < quantity) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${availableStock}`);
      }

      inventory.reserved_stock += quantity;
      await inventory.save({ session });

      await session.commitTransaction();

      return {
        variantId,
        warehouseId,
        reserved: quantity,
        remainingStock: availableStock - quantity
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release reserved stock
   */
  async releaseReservedStock(variantId, warehouseId, quantity) {
    await WarehouseInventory.findOneAndUpdate(
      { warehouseId, variantId },
      { $inc: { reserved_stock: -quantity } }
    );
    return { success: true };
  }

  /**
   * Confirm reserved stock (deduct from inventory)
   */
  async confirmReservedStock(variantId, warehouseId, quantity) {
    await WarehouseInventory.findOneAndUpdate(
      { warehouseId, variantId },
      { $inc: { stock: -quantity, reserved_stock: -quantity } }
    );
    return { success: true };
  }

  /**
   * Find nearest warehouse with stock
   */
  async findNearestWarehouseWithStock(variantId, customerCity, customerCountry, requiredQuantity = 1) {
    // Get all warehouses with sufficient stock for this variant
    const inventories = await WarehouseInventory.find({
      variantId,
      $expr: { $gte: [{ $subtract: ["$stock", "$reserved_stock"] }, requiredQuantity] }
    }).populate('warehouseId');

    if (inventories.length === 0) return null;

    // Filter and sort manually based on city/country match
    const warehouses = inventories.map(inv => inv.warehouseId).filter(w => w && w.is_active);

    // 1. Same city & country
    let best = warehouses.find(w => w.city === customerCity && w.country === customerCountry);
    if (best) return this._formatWarehouseWithInventory(inventories.find(inv => inv.warehouseId._id.equals(best._id)));

    // 2. Same country
    best = warehouses.find(w => w.country === customerCountry);
    if (best) return this._formatWarehouseWithInventory(inventories.find(inv => inv.warehouseId._id.equals(best._id)));

    // 3. Any available
    if (warehouses.length > 0) return this._formatWarehouseWithInventory(inventories[0]);

    return null;
  }

  /**
   * Get inventory for variant across all warehouses
   */
  async getInventoryForVariant(variantId) {
    const inventories = await WarehouseInventory.find({ variantId }).populate('warehouseId');
    return inventories.map(inv => this._formatWarehouseWithInventory(inv));
  }

  /**
   * Get total available stock for variant
   */
  async getTotalAvailableStock(variantId) {
    const aggregation = await WarehouseInventory.aggregate([
      { $match: { variantId: new mongoose.Types.ObjectId(variantId) } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ["$stock", "$reserved_stock"] } }
        }
      }
    ]);

    return aggregation.length > 0 ? aggregation[0].total : 0;
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
        warehouseName: warehouse.warehouseName,
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
    const inventories = await WarehouseInventory.find({
      $expr: { $lte: [{ $subtract: ["$stock", "$reserved_stock"] }, threshold] }
    }).populate('warehouseId').populate('productId');

    return inventories.map(inv => ({
      variantId: inv.variantId,
      warehouseId: inv.warehouseId._id,
      warehouseName: inv.warehouseId.name,
      city: inv.warehouseId.city,
      country: inv.warehouseId.country,
      sku: inv.productId ? inv.productId.sku : 'N/A',
      productName: inv.productId ? inv.productId.name : 'Unknown',
      availableStock: inv.stock - inv.reserved_stock,
      totalStock: inv.stock,
      reservedStock: inv.reserved_stock
    }));
  }

  /**
   * Format warehouse response
   */
  _formatWarehouse(warehouse) {
    return {
      id: warehouse._id,
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
  _formatWarehouseWithInventory(inv) {
    const w = inv.warehouseId;
    return {
      id: w ? w._id : null,
      warehouseName: w ? w.name : 'Unknown',
      city: w ? w.city : 'Unknown',
      country: w ? w.country : 'Unknown',
      variantId: inv.variantId,
      stock: inv.stock,
      reservedStock: inv.reserved_stock,
      availableStock: inv.stock - inv.reserved_stock,
      createdAt: inv.created_at
    };
  }
}

module.exports = new WarehouseInventoryService();
