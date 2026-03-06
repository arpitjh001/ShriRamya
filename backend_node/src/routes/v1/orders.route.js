const express = require('express');
const orderController = require('../../controllers/order.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(['admin']), orderController.getOrders);
router.get('/:order_id', auth(['admin']), orderController.getOrder);

// Order creation and payment
router.post('/', auth(), orderController.createOrder); // Basic creation (no payment)
router.post('/create-intent', auth(), orderController.createPaymentIntent); // Razorpay creation
router.post('/complete', auth(), orderController.completeOrder); // Razorpay callback completion

// Admin-only operations
router.put('/:order_id', auth(['admin']), orderController.updateOrder);
router.delete('/:order_id', auth(['admin']), orderController.deleteOrder);

module.exports = router;

