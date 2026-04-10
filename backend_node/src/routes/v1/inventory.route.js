const express = require('express');
const router = express.Router();
const { auth, requireRole, ensureTenantIsolation } = require('../../middlewares/authRBAC');
const inventoryController = require('../../controllers/inventory.controller');

/**
 * @route   GET /api/v1/admin/inventory/low-stock
 * @desc    Get low stock items
 * @access  Private (Admin/Editor only)
 */
router.get('/low-stock',
  auth,
  requireRole('Admin', 'Editor'),
  ensureTenantIsolation,
  inventoryController.getLowStockItems
);

/**
 * @route   GET /api/v1/admin/inventory/stock-levels
 * @desc    Get stock levels for all variants
 * @access  Private (Admin/Editor only)
 */
router.get('/stock-levels',
  auth,
  requireRole('Admin', 'Editor'),
  ensureTenantIsolation,
  inventoryController.getStockLevels
);

/**
 * @route   POST /api/v1/admin/inventory/offline-sale
 * @desc    Mark a variant as sold offline and reduce inventory
 * @access  Private (Admin only)
 */
router.post('/offline-sale',
  auth,
  requireRole('Admin'),
  ensureTenantIsolation,
  inventoryController.recordOfflineSale
);

/**
 * @route   PUT /api/v1/admin/inventory/:variantId
 * @desc    Update stock level for a variant
 * @access  Private (Admin only)
 */
router.put('/:variantId',
  auth,
  requireRole('Admin'),
  ensureTenantIsolation,
  inventoryController.updateStockLevel
);

module.exports = router;
