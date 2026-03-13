const express = require('express');
const productsRoute = require('./products.route');
const authRoute = require('./auth.route');
const ordersRoute = require('./orders.route');
const cartRoute = require('./cart.route');
const blogsRoute = require('./blogs.route'); // Native multi-tenant blogs
const uploadRoute = require('./upload.route');
const customersRoute = require('./customers.route');
const couponsRoute = require('./coupons.route');
const categoryRoute = require('./category.route');
const searchRoute = require('./search.route');
const reviewRoute = require('./review.route');
const recommendationRoute = require('./recommendation.route');
const analyticsRoute = require('./analytics.route');
const warehouseRoute = require('./warehouse.route');
const inventoryRoute = require('./inventory.route');
const notificationRoute = require('./notification.route');
const fraudRoute = require('./fraud.route');
const tenantsRoute = require('./tenants.route');
const usersRoute = require('./users.route'); // User management
const aiCollaborationRoute = require('./ai-collaboration.route'); // AI collaboration loop

const router = express.Router();

router.use('/products', productsRoute);
router.use('/auth', authRoute);
router.use('/orders', ordersRoute);
router.use('/cart', cartRoute);
router.use('/blogs', blogsRoute); // Native multi-tenant blogs
router.use('/upload', uploadRoute);
router.use('/customers', customersRoute);
router.use('/coupons', couponsRoute);
router.use('/categories', categoryRoute);
router.use('/search', searchRoute);
router.use('/reviews', reviewRoute);
router.use('/recommendations', recommendationRoute);
router.use('/admin/analytics', analyticsRoute);
router.use('/admin/warehouses', warehouseRoute);
// router.use('/admin/inventory', inventoryRoute); // Temporarily disabled
router.use('/notifications', notificationRoute);
router.use('/admin/fraud', fraudRoute);
router.use('/tenants', tenantsRoute);
router.use('/users', usersRoute); // User management routes
router.use('/ai-collaborate', aiCollaborationRoute); // AI collaboration loop

module.exports = router;

