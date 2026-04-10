/**
 * Payment Routes
 * Handles payment processing, verification, and callbacks
 */

const express = require('express');
const auth = require('../../middlewares/auth');
const paymentController = require('../../controllers/payment.controller');
const webhookController = require('../../controllers/webhook.controller');
const { requireRole } = require('../../middlewares/authRBAC');

const router = express.Router();

/**
 * Public Routes (No Auth Required)
 */

// Razorpay webhook (must be public for Razorpay to call)
router.post('/webhooks/razorpay', webhookController.handleRazorpayWebhook);

// Stripe webhook (must be public for Stripe to call)
router.post('/webhooks/stripe', webhookController.handleStripeWebhook);

/**
 * Protected Routes (Auth Required)
 */

// Initialize payment (create Razorpay order)
router.post('/initiate', auth(), paymentController.initiatePayment);

// Verify payment (after Razorpay success)
router.post('/verify', auth(), paymentController.verifyPayment);

// Get payment status
router.get('/status/:orderId', auth(), paymentController.getPaymentStatus);

// Get payment history
router.get('/history/:orderId', auth(), paymentController.getPaymentHistory);

/**
 * Admin Routes (Admin Role Required)
 */

// Process refund (admin or owner)
router.post('/refund', auth(), paymentController.processRefund);

module.exports = router;
