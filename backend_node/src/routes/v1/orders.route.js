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
const { auth, optionalAuth, requireRole } = require('../../middlewares/authRBAC');

const router = express.Router();

// ==========================================
// Admin Order Routes
// ==========================================

// Get all orders
router.get('/admin/all', auth, requireRole('admin'), orderController.getAllOrders);

// Update order status
router.patch('/admin/:id/status',
    auth, requireRole('admin'),
    validate(orderValidation.updateOrderStatus),
    orderController.updateOrderStatus
);

// Delete order
router.delete('/admin/:id',
    auth,
    requireRole('admin'),
    validate(orderValidation.deleteOrder),
    orderController.deleteOrder
);


// Get all shipments (MUST be before /admin/:id/shipments to avoid route conflict)
router.get('/admin/shipments',
    auth, requireRole('admin'),
    validate(orderValidation.getShipmentsQuery),
    shipmentController.getAllShipments
);

// Get ready to ship
router.get('/admin/shipments/ready-to-ship', auth, requireRole('admin'), shipmentController.getReadyToShip);

// Get pending shipments
router.get('/admin/shipments/pending', auth, requireRole('admin'), shipmentController.getPendingShipments);

// Shiprocket helpers
router.get('/admin/shipping/shiprocket/couriers', auth, requireRole('admin'), shipmentController.getShiprocketCouriers);
router.post('/admin/shipping/shiprocket/serviceability', auth, requireRole('admin'), shipmentController.checkShiprocketServiceability);

// Create shipment
router.post('/admin/:id/shipments',
    auth, requireRole('admin'),
    validate(orderValidation.createShipment),
    shipmentController.createShipment
);

// Update shipment tracking
router.patch('/admin/shipments/:id/tracking',
    auth, requireRole('admin'),
    validate(orderValidation.updateTracking),
    shipmentController.updateTracking
);

// Mark shipment as shipped
router.post('/admin/shipments/:id/ship', auth, requireRole('admin'), shipmentController.markAsShipped);

// Mark shipment as delivered
router.post('/admin/shipments/:id/deliver', auth, requireRole('admin'), shipmentController.markAsDelivered);

// Sync shipment tracking from provider
router.post('/admin/shipments/:id/sync', auth, requireRole('admin'), shipmentController.syncShipment);

// Cancel shipment at provider
router.post('/admin/shipments/:id/cancel', auth, requireRole('admin'), shipmentController.cancelShipment);

// Delete shipment
router.delete('/admin/shipments/:id', auth, requireRole('admin'), shipmentController.deleteShipment);

// Approve refund
router.post('/admin/refunds/:id/approve', auth, requireRole('admin'), refundController.approveRefund);

// Process refund
router.post('/admin/refunds/:id/process',
    auth, requireRole('admin'),
    validate(orderValidation.processRefund),
    refundController.processRefund
);

// Reject refund
router.post('/admin/refunds/:id/reject', auth, requireRole('admin'), refundController.rejectRefund);

// Get refund details
router.get('/admin/refunds/:id', auth, requireRole('admin'), refundController.getRefund);

// ==========================================
// Customer Order Routes
// ==========================================

// Create order (primary route) - Supports Guest Checkout
router.post('/',
    optionalAuth,
    validate(orderValidation.createOrder),
    orderController.createOrder
);

// Create order (alias for backward compatibility with frontend)
router.post('/create',
    optionalAuth,
    validate(orderValidation.createOrder),
    orderController.createOrder
);

// Get customer's orders
router.get('/my', auth, orderController.getCustomerOrders);

// Get order details
router.get('/:id', auth, orderController.getOrder);

// Confirm payment for order
router.post('/:id/payment', optionalAuth, orderController.confirmPayment);

// Cancel order
router.post('/my/:id/cancel',
    auth,
    validate(orderValidation.cancelOrder),
    orderController.cancelOrder
);

// Get order tracking
router.get('/:id/tracking', shipmentController.getOrderTracking);

// Get order shipments
router.get('/:id/shipments', auth, shipmentController.getOrderShipments);

// Request refund
router.post('/:id/refunds',
    auth,
    validate(orderValidation.createRefund),
    refundController.createRefund
);

// Get order refunds
router.get('/:id/refunds', auth, refundController.getOrderRefunds);

// ==========================================
// Analytics Routes
// ==========================================

// Get order analytics
router.get('/admin/analytics/orders', auth, requireRole('admin'), orderController.getOrderAnalytics);

// ==========================================
// Webhook Routes (Public - signature verified in controller)
// ==========================================

// Razorpay webhook
router.post('/webhooks/payment/razorpay', webhookController.handleRazorpayWebhook);

// Stripe webhook
router.post('/webhooks/payment/stripe', webhookController.handleStripeWebhook);

// Shiprocket shipping webhook
router.post('/webhooks/shipping/shiprocket', webhookController.handleShiprocketWebhook);

module.exports = router;
