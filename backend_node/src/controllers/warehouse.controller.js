/**
 * Warehouse Controller
 * Multi-warehouse inventory management
 */

const warehouseService = require('../services/inventory/warehouseAllocator.service');
const { successResponse } = require('../utils/response');
const httpStatus = require('http-status');

/**
 * Create warehouse
 * POST /api/v1/admin/warehouses
 */
const createWarehouse = async (req, res, next) => {
  try {
    const warehouse = await warehouseService.createWarehouse(req.body);
    return successResponse(res, warehouse, 'Warehouse created successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all warehouses
 * GET /api/v1/admin/warehouses
 */
const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await warehouseService.getAllWarehouses(req.query);
    return successResponse(res, warehouses);
  } catch (error) {
    next(error);
  }
};

/**
 * Get warehouse by ID
 * GET /api/v1/admin/warehouses/:id
 */
const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await warehouseService.getWarehouseById(req.params.id);
    return successResponse(res, warehouse);
  } catch (error) {
    next(error);
  }
};

/**
 * Update warehouse
 * PUT /api/v1/admin/warehouses/:id
 */
const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await warehouseService.updateWarehouse(req.params.id, req.body);
    return successResponse(res, warehouse, 'Warehouse updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete warehouse
 * DELETE /api/v1/admin/warehouses/:id
 */
const deleteWarehouse = async (req, res, next) => {
  try {
    await warehouseService.deleteWarehouse(req.params.id);
    return successResponse(res, { deleted: true }, 'Warehouse deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Add stock to warehouse
 * POST /api/v1/admin/warehouses/:id/stock
 */
const addStock = async (req, res, next) => {
  try {
    const { variant_id, quantity } = req.body;
    const result = await warehouseService.addStock(variant_id, req.params.id, quantity);
    return successResponse(res, result, 'Stock added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory for variant
 * GET /api/v1/admin/variants/:variantId/inventory
 */
const getVariantInventory = async (req, res, next) => {
  try {
    const inventory = await warehouseService.getInventoryForVariant(req.params.variantId);
    return successResponse(res, inventory);
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock alerts
 * GET /api/v1/admin/inventory/low-stock
 */
const getLowStockAlerts = async (req, res, next) => {
  try {
    const { threshold = 10 } = req.query;
    const alerts = await warehouseService.getLowStockAlerts(parseInt(threshold));
    return successResponse(res, alerts);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addStock,
  getVariantInventory,
  getLowStockAlerts
};
