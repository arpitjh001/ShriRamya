const { inventoryService } = require('../services/inventory.service');
const { successResponse, paginatedResponse } = require('../utils/response');

/**
 * Get low stock items
 * @route GET /api/v1/admin/inventory/low-stock
 */
const getLowStockItems = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const lowStockItems = await inventoryService.getLowStockItems(threshold, tenantId);
    
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
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const result = await inventoryService.getStockLevels(req.query, tenantId);
    
    return paginatedResponse(res, result.items, result.pagination, 'Stock levels retrieved successfully');
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
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const updated = await inventoryService.updateStockLevel(variantId, stockLevel, lowStockThreshold, tenantId);
    
    return successResponse(res, updated, 'Stock level updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Record an admin-only offline sale for a variant
 * @route POST /api/v1/admin/inventory/offline-sale
 */
const recordOfflineSale = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const result = await inventoryService.recordOfflineSale({
      ...req.body,
      userId: req.user?.id,
    }, tenantId);

    return successResponse(res, result, 'Product marked as sold offline and inventory updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLowStockItems,
  getStockLevels,
  updateStockLevel,
  recordOfflineSale,
};
