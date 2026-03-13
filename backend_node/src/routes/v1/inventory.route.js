const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/authRBAC');
const inventoryController = require('../../controllers/inventory.controller');

/**
 * @route   GET /api/v1/admin/inventory/low-stock
 * @desc    Get low stock items
 * @access  Private (Admin/Editor only)
 */
router.get('/low-stock',
  auth,
  requireRole('Admin', 'Editor'),
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
  inventoryController.getStockLevels
);

/**
 * @route   PUT /api/v1/admin/inventory/:variantId
 * @desc    Update stock level for a variant
 * @access  Private (Admin only)
 */
router.put('/:variantId',
  auth,
  requireRole('Admin'),
  inventoryController.updateStockLevel
);

module.exports = router;
