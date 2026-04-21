const express = require('express');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');
const warehouseController = require('../../controllers/warehouse.controller');

const router = express.Router();

router.use(apiLimiter);
router.use(auth(['admin']));

/**
 * Warehouse endpoints (Admin only)
 * GET /api/v1/admin/warehouses
 * 
 * IMPORTANT: Route ordering matters! Specific routes must come BEFORE /:id
 */

// Specific routes first (to avoid conflict with /:id)
router.get('/variants/:variantId/inventory', warehouseController.getVariantInventory);
router.get('/inventory/low-stock', warehouseController.getLowStockAlerts);

// Base routes
router.post('/', warehouseController.createWarehouse);
router.get('/', warehouseController.getWarehouses);

// Parameterized routes last
router.get('/:id', warehouseController.getWarehouse);
router.put('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);
router.post('/:id/stock', warehouseController.addStock);

module.exports = router;
