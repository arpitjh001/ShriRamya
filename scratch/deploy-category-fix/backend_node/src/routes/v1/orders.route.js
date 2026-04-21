/**
 * Order Routes (Enhanced)
 * Complete order management routes
 */

const express = require('express');
const orderController = require('../../controllers/order.controller');
const shipmentController = require('../../controllers/shipment.controller');
const refundController = require('../../controllers/refund.controller');
const webhookController = require('../../controllers/webhook.controller');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');
const auth = require('../../middlewares/auth');

const router = express.Router();

// ==========================================
// Customer Order Routes
// ==========================================

// Create order (primary route)
router.post('/',
    auth(),
    validate(orderValidation.createOrder),
    orderController.createOrder
);

// Create order (alias for backward compatibility with frontend)
router.post('/create',
    auth(),
    validate(orderValidation.createOrder),
    orderController.createOrder
);

// Get customer's orders
router.get('/my', auth(), orderController.getCustomerOrders);

// Get order details
router.get('/:id', auth(), orderController.getOrder);

// Cancel order
router.post('/my/:id/cancel',
    auth(),
    validate(orderValidation.cancelOrder),
    orderController.cancelOrder
);

// Get order tracking
router.get('/:id/tracking', shipmentController.getOrderTracking);

// Get order shipments
router.get('/:id/shipments', auth(), shipmentController.getOrderShipments);

// Request refund
router.post('/:id/refunds',
    auth(),
    validate(orderValidation.createRefund),
    refundController.createRefund
);

// Get order refunds
router.get('/:id/refunds', auth(), refundController.getOrderRefunds);

// ==========================================
// Admin Order Routes
// ==========================================

// Get all orders
router.get('/admin/all', auth(['admin']), orderController.getAllOrders);

// Update order status
router.patch('/admin/:id/status',
    auth(['admin']),
    validate(orderValidation.updateOrderStatus),
    orderController.updateOrderStatus
);

// Get all shipments (MUST be before /admin/:id/shipments to avoid route conflict)
router.get('/admin/shipments',
    auth(['admin']),
    validate(orderValidation.getShipmentsQuery),
    shipmentController.getAllShipments
);

// Get ready to ship
router.get('/admin/shipments/ready-to-ship', auth(['admin']), shipmentController.getReadyToShip);

// Get pending shipments
router.get('/admin/shipments/pending', auth(['admin']), shipmentController.getPendingShipments);

// Xpressbees helpers
router.get('/admin/shipping/xpressbees/couriers', auth(['admin']), shipmentController.getXpressbeesCouriers);
router.post('/admin/shipping/xpressbees/serviceability', auth(['admin']), shipmentController.checkXpressbeesServiceability);

// Create shipment
router.post('/admin/:id/shipments',
    auth(['admin']),
    validate(orderValidation.createShipment),
    shipmentController.createShipment
);

// Update shipment tracking
router.patch('/admin/shipments/:id/tracking',
    auth(['admin']),
    validate(orderValidation.updateTracking),
    shipmentController.updateTracking
);

// Mark shipment as shipped
router.post('/admin/shipments/:id/ship', auth(['admin']), shipmentController.markAsShipped);

// Mark shipment as delivered
router.post('/admin/shipments/:id/deliver', auth(['admin']), shipmentController.markAsDelivered);

// Sync shipment tracking from provider
router.post('/admin/shipments/:id/sync', auth(['admin']), shipmentController.syncShipment);

// Cancel shipment at provider
router.post('/admin/shipments/:id/cancel', auth(['admin']), shipmentController.cancelShipment);

// Delete shipment
router.delete('/admin/shipments/:id', auth(['admin']), shipmentController.deleteShipment);

// Approve refund
router.post('/admin/refunds/:id/approve', auth(['admin']), refundController.approveRefund);

// Process refund
router.post('/admin/refunds/:id/process',
    auth(['admin']),
    validate(orderValidation.processRefund),
    refundController.processRefund
);

// Reject refund
router.post('/admin/refunds/:id/reject', auth(['admin']), refundController.rejectRefund);

// Get refund details
router.get('/admin/refunds/:id', auth(['admin']), refundController.getRefund);

// ==========================================
// Analytics Routes
// ==========================================

// Get order analytics
router.get('/admin/analytics/orders', auth(['admin']), orderController.getOrderAnalytics);

// ==========================================
// Webhook Routes (Public - signature verified in controller)
// ==========================================

// Razorpay webhook
router.post('/webhooks/payment/razorpay', webhookController.handleRazorpayWebhook);

// Stripe webhook
router.post('/webhooks/payment/stripe', webhookController.handleStripeWebhook);

module.exports = router;
