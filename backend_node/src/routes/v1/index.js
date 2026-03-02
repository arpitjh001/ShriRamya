const express = require('express');
const productsRoute = require('./products.route');
const authRoute = require('./auth.route');
const ordersRoute = require('./orders.route');
const cartRoute = require('./cart.route');
const blogRoute = require('./blog.route');
const uploadRoute = require('./upload.route');
const customersRoute = require('./customers.route');
const couponsRoute = require('./coupons.route');

const router = express.Router();

router.use('/products', productsRoute);
router.use('/auth', authRoute);
router.use('/orders', ordersRoute);
router.use('/cart', cartRoute);
router.use('/blog', blogRoute);
router.use('/upload', uploadRoute);
router.use('/customers', customersRoute);
router.use('/coupons', couponsRoute);
// Add other routes here (auth, cart, etc.)

module.exports = router;
