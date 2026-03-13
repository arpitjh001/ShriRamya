const { inventoryService } = require('../services/inventory.service');
const { successResponse } = require('../utils/response');

/**
 * Get low stock items
 * @route GET /api/v1/admin/inventory/low-stock
 */
const getLowStockItems = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const lowStockItems = await inventoryService.getLowStockItems(threshold);
    
    return successResponse(res, lowStockItems, 'Low stock items retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock levels for all variants
 * @route GET /api/v1/admin/inventory/stock-levels
 */
const getStockLevels = async (req, res, next) => {
  try {
    const stockLevels = await inventoryService.getStockLevels();
    
    return successResponse(res, stockLevels, 'Stock levels retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock level for a variant
 * @route PUT /api/v1/admin/inventory/:variantId
 */
const updateStockLevel = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const { stockLevel, lowStockThreshold } = req.body;
    
    const updated = await inventoryService.updateStockLevel(variantId, stockLevel, lowStockThreshold);
    
    return successResponse(res, updated, 'Stock level updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLowStockItems,
  getStockLevels,
  updateStockLevel,
};
