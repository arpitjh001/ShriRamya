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
 */
router.post('/', warehouseController.createWarehouse);
router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouse);
router.put('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);
router.post('/:id/stock', warehouseController.addStock);
router.get('/variants/:variantId/inventory', warehouseController.getVariantInventory);
router.get('/inventory/low-stock', warehouseController.getLowStockAlerts);

module.exports = router;
