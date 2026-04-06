const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { Product, Order, Blog, Wishlist, Cart } = require('../models');

// ==========================================
// AUTH ENDPOINTS
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = require('../db/mongodb').mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const userId = user._id.toString();
    const isAdmin = user.role === 'admin';
    const token = jwt.sign(
      { sub: userId, user_id: userId, email: user.email, name: user.name, role: user.role, roles: [user.role], permissions: isAdmin ? ['all'] : ['read', 'write_own'], tenant_id: 'shriramya', tenantId: 'shriramya' },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    res.json({ success: true, data: { user: { id: userId, userId, email: user.email, name: user.name, phone: user.phone, role: user.role, roles: [user.role] }, token, refreshToken: 'refresh_' + token.slice(-20) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const db = require('../db/mongodb').mongoose.connection.db;
    const exists = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 8);
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(), password: hashedPassword, name, phone,
      role: 'user', is_active: true, shipping: {}, created_at: new Date(), updated_at: new Date()
    });
    const userId = result.insertedId.toString();

    const token = jwt.sign(
      { sub: userId, user_id: userId, email, name, role: 'user', roles: ['user'], permissions: ['read', 'write_own'], tenantId: 'shriramya' },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    res.status(201).json({ success: true, data: { user: { id: userId, userId, email, name, phone, role: 'user' }, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/auth/check-admin', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const role = (decoded.role || '').toLowerCase();
    const roles = (decoded.roles || []).map(r => r.toLowerCase());
    const isAdmin = role === 'admin' || roles.includes('admin');
    res.json({ success: true, data: { is_admin: isAdmin, capabilities: { edit_posts: isAdmin, publish_posts: isAdmin, edit_others_posts: isAdmin, delete_posts: isAdmin, manage_categories: isAdmin, moderate_comments: isAdmin } } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.post('/auth/refresh-token', (req, res) => {
  const token = jwt.sign({ sub: 'admin_001', role: 'admin', roles: ['admin'] }, config.jwt.secret, { expiresIn: '24h' });
  res.json({ success: true, data: { token } });
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort, category, search, minPrice, maxPrice, fabric, color, occasion, work, brand, size, discount, rating, isNew, isTrending } = req.query;
    const filter = {};
    let sortObj = { createdAt: -1 };

    if (category) {
      if (category === 'most-desired') {
        sortObj = { rating: -1 };
      } else {
        filter.categorySlug = { $regex: new RegExp(category, 'i') };
      }
    }
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { tags: { $regex: search, $options: 'i' } }];
    if (minPrice || maxPrice) { filter.salePrice = {}; if (minPrice) filter.salePrice.$gte = Number(minPrice); if (maxPrice) filter.salePrice.$lte = Number(maxPrice); }
    if (fabric) filter.fabric = { $in: fabric.split(',') };
    if (color) filter.color = { $in: color.split(',') };
    if (occasion) filter.occasion = { $in: occasion.split(',') };
    if (work) filter.work = { $in: work.split(',') };
    if (brand) filter.brand = { $in: brand.split(',') };
    if (size) filter.sizes = { $in: size.split(',') };
    if (discount) filter.discount = { $gte: Number(discount) };
    if (rating) filter.rating = { $gte: Number(rating) };
    if (isNew === 'true') filter.isNew = true;
    if (isTrending === 'true') filter.isTrending = true;
    if (req.query.featured === 'true') filter.isFeatured = true;

    if (sort === 'price_asc') sortObj = { salePrice: 1 };
    else if (sort === 'price_desc') sortObj = { salePrice: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'name_asc') sortObj = { name: 1 };
    else if (sort === 'discount') sortObj = { discount: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter, { _id: 0, __v: 0 }).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter)
    ]);

    // Build filter metadata
    const allProducts = await Product.find({}, { fabric: 1, color: 1, occasion: 1, work: 1, brand: 1, sizes: 1, salePrice: 1, discount: 1, _id: 0 }).lean();
    const fabricCounts = {}, colorCounts = {}, occasionCounts = {}, workCounts = {}, brandCounts = {}, sizeCounts = {};
    let priceMin = Infinity, priceMax = 0;
    allProducts.forEach(p => {
      if (p.fabric) fabricCounts[p.fabric] = (fabricCounts[p.fabric] || 0) + 1;
      if (p.color) colorCounts[p.color] = (colorCounts[p.color] || 0) + 1;
      if (p.occasion) occasionCounts[p.occasion] = (occasionCounts[p.occasion] || 0) + 1;
      if (p.work) workCounts[p.work] = (workCounts[p.work] || 0) + 1;
      if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      if (p.sizes) p.sizes.forEach(s => { sizeCounts[s] = (sizeCounts[s] || 0) + 1; });
      if (p.salePrice < priceMin) priceMin = p.salePrice;
      if (p.salePrice > priceMax) priceMax = p.salePrice;
    });

    res.json({
      success: true,
      data: {
        products: products.map(p => ({ ...p, id: p.productId })),
        pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total, per_page: Number(limit) },
        filterMetadata: { fabrics: fabricCounts, colors: colorCounts, occasions: occasionCounts, works: workCounts, brands: brandCounts, sizes: sizeCounts, priceRange: { min: priceMin === Infinity ? 0 : priceMin, max: priceMax } }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/products/filter', async (req, res) => {
  // Redirect to main products endpoint (same logic)
  req.url = '/products?' + new URLSearchParams(req.query).toString();
  router.handle(req, res);
});

router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true }, { _id: 0, __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/trending', async (req, res) => {
  try {
    const products = await Product.find({ isTrending: true }, { _id: 0, __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/new-arrivals', async (req, res) => {
  try {
    const products = await Product.find({ isNew: true }, { _id: 0, __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ productId: Number(req.params.id) }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const related = await Product.find({ categorySlug: product.categorySlug, productId: { $ne: product.productId } }, { _id: 0, __v: 0 }).limit(4).lean();
    res.json({ success: true, data: { ...product, id: product.productId, relatedProducts: related.map(r => ({ ...r, id: r.productId })) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// CATEGORIES
// ==========================================
router.get('/categories', async (req, res) => {
  try {
    const cats = await Product.aggregate([
      { $group: { _id: '$categorySlug', name: { $first: '$categoryName' }, count: { $sum: 1 }, image: { $first: '$thumbnail' } } },
      { $project: { _id: 0, id: '$_id', slug: '$_id', name: 1, count: 1, image: 1 } },
      { $sort: { name: 1 } }
    ]);
    res.json({ success: true, data: cats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/categories/:slug', async (req, res) => {
  try {
    const products = await Product.find({ categorySlug: req.params.slug }, { _id: 0, __v: 0 }).lean();
    if (!products.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { slug: req.params.slug, name: products[0].categoryName, products: products.map(p => ({ ...p, id: p.productId })) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// SEARCH
// ==========================================
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    if (!q) return res.json({ success: true, data: { products: [], suggestions: [] } });
    const products = await Product.find({ $or: [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } }, { categoryName: { $regex: q, $options: 'i' } }] }, { _id: 0, __v: 0 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { products: products.map(p => ({ ...p, id: p.productId })), suggestions: products.slice(0, 5).map(p => p.name) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// CART ENDPOINTS
// ==========================================
const getSessionId = (req) => req.headers['x-session-id'] || req.query.sessionId || 'default_session';

router.get('/cart', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    let cart = await Cart.findOne({ sessionId }, { _id: 0, __v: 0 }).lean();
    if (!cart) cart = { sessionId, items: [] };
    const subtotal = cart.items.reduce((sum, i) => sum + (i.salePrice || i.price) * i.quantity, 0);
    const shipping = subtotal > 5000 ? 0 : 99;
    res.json({ success: true, data: { ...cart, subtotal, shipping, total: subtotal + shipping, itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/cart/add', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const { productId, quantity = 1, size, color } = req.body;
    const product = await Product.findOne({ productId: Number(productId) }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let cart = await Cart.findOne({ sessionId });
    if (!cart) cart = new Cart({ sessionId, items: [] });

    const existIdx = cart.items.findIndex(i => i.productId === Number(productId) && i.size === (size || '') && i.color === (color || ''));
    if (existIdx >= 0) {
      cart.items[existIdx].quantity += Number(quantity);
    } else {
      cart.items.push({ productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice, quantity: Number(quantity), size: size || product.sizes?.[0] || '', color: color || product.color || '' });
    }
    await cart.save();
    const subtotal = cart.items.reduce((sum, i) => sum + (i.salePrice || i.price) * i.quantity, 0);
    res.json({ success: true, message: 'Added to cart', data: { items: cart.items, subtotal, itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/cart/update', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ sessionId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.find(i => i.productId === Number(productId));
    if (item) {
      if (quantity <= 0) cart.items = cart.items.filter(i => i.productId !== Number(productId));
      else item.quantity = Number(quantity);
    }
    await cart.save();
    res.json({ success: true, data: { items: cart.items } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/cart/remove/:productId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await Cart.findOne({ sessionId });
    if (cart) {
      cart.items = cart.items.filter(i => i.productId !== Number(req.params.productId));
      await cart.save();
    }
    res.json({ success: true, message: 'Removed from cart' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/cart/clear', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    await Cart.deleteOne({ sessionId });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// ORDERS ENDPOINTS
// ==========================================
router.get('/orders/my', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'customer_001';
    const orders = await Order.find({ userId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { orders } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/orders', async (req, res) => {
  try {
    const { items, shippingAddress, couponCode, paymentMethod = 'razorpay', subtotal, discount = 0, shipping = 0, tax = 0, total } = req.body;
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const razorpayOrderId = 'order_' + Date.now();

    // Enrich items with product data
    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ productId: Number(item.productId) }, { _id: 0, __v: 0 }).lean();
      enrichedItems.push({
        productId: Number(item.productId),
        name: item.name || product?.name || 'Unknown',
        thumbnail: item.thumbnail || product?.thumbnail || '',
        price: item.price || product?.price || 0,
        salePrice: item.salePrice || product?.salePrice || item.price || 0,
        quantity: item.quantity || 1,
        size: item.size || '',
        color: item.color || '',
      });
    }

    const calcSubtotal = subtotal || enrichedItems.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0);
    const calcTotal = total || (calcSubtotal - discount + shipping + tax);

    const order = await Order.create({
      orderId, userId: req.body.userId || 'guest', userEmail: req.body.email || shippingAddress?.email || '',
      userName: req.body.name || shippingAddress?.name || '',
      items: enrichedItems, shippingAddress, couponCode, paymentMethod,
      subtotal: calcSubtotal, discount, shipping, tax, total: calcTotal,
      status: 'pending', paymentStatus: 'pending', razorpayOrderId,
      statusHistory: [{ status: 'pending', timestamp: new Date(), note: 'Order created' }]
    });

    res.status(201).json({
      success: true, data: {
        orderId, razorpayOrderId, amount: calcTotal, currency: 'INR',
        key: config.razorpay?.keyId || 'rzp_test_mock_key',
        prefill: { name: shippingAddress?.name, email: shippingAddress?.email, contact: shippingAddress?.phone }
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/orders/:orderId/payment', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = req.body.razorpay_payment_id || 'pay_mock_' + Date.now();
    order.statusHistory.push({ status: 'confirmed', timestamp: new Date(), note: 'Payment confirmed' });
    await order.save();
    res.json({ success: true, message: 'Payment verified', data: { orderId: order.orderId, status: 'confirmed' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders', async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const [orders, total] = await Promise.all([
      Order.find(filter, { _id: 0, __v: 0 }).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(filter)
    ]);
    res.json({ success: true, data: { orders, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total } } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, __v: 0 }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const { status, note } = req.body;
    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note: note || `Status updated to ${status}` });
    if (status === 'shipped' && req.body.trackingNumber) {
      order.trackingNumber = req.body.trackingNumber;
      order.trackingUrl = req.body.trackingUrl || '';
    }
    await order.save();
    res.json({ success: true, data: { orderId: order.orderId, status: order.status } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/orders/:orderId/cancel', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: req.body.reason || 'Cancelled by user' });
    await order.save();
    res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Alias: POST /orders/my/:orderId/cancel (frontend compatibility)
router.post('/orders/my/:orderId/cancel', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: req.body.reason || 'Cancelled by user' });
    await order.save();
    res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders/:orderId/tracking', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, orderId: 1, status: 1, trackingNumber: 1, trackingUrl: 1, statusHistory: 1 }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// BLOG ENDPOINTS
// ==========================================
router.get('/blogs', async (req, res) => {
  try {
    const { page = 1, per_page = 10, category, search, status } = req.query;
    const filter = {};
    if (category) filter.categories = { $in: [category] };
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(per_page);
    const [posts, total] = await Promise.all([
      Blog.find(filter, { _id: 0, __v: 0 }).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(Number(per_page)).lean(),
      Blog.countDocuments(filter)
    ]);
    res.json({ success: true, data: { posts, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(per_page)), total } } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


router.get('/blogs/capabilities', (req, res) => {
  res.json({ success: true, data: { can_create: true, can_edit: true, can_delete: true, can_publish: true } });
});

router.get('/blogs/categories', async (req, res) => {
  try {
    const cats = await Blog.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', id: '$_id', count: 1 } }
    ]);
    res.json({ success: true, data: cats.length ? cats : ['Traditional Crafts', 'Style Guide', 'Silk Sarees', 'Sustainability', 'Handloom', 'Fashion Tips', 'Behind the Scenes'] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/blogs/stats', async (req, res) => {
  try {
    const [total, published, drafts] = await Promise.all([
      Blog.countDocuments(), Blog.countDocuments({ status: 'published' }), Blog.countDocuments({ status: 'draft' })
    ]);
    const totalViews = (await Blog.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]))[0]?.total || 0;
    res.json({ success: true, data: { total_posts: total, published, drafts, total_views: totalViews, total_comments: 20 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/blogs', async (req, res) => {
  try {
    const { title, slug, content, excerpt, status = 'draft', categories = [], tags = [], featuredImage, seoTitle, seoDescription } = req.body;
    const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const blog = await Blog.create({
      title, slug: blogSlug, content, excerpt,
      author: { id: 'admin_001', name: 'Admin' },
      categories: Array.isArray(categories) ? categories : [],
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
      status, featuredImage, seoTitle, seoDescription,
      publishedAt: status === 'published' ? new Date() : null,
    });
    const blogData = blog.toObject();
    delete blogData._id; delete blogData.__v;
    res.status(201).json({ success: true, data: { ...blogData, id: blogData._id || blogSlug }, message: 'Blog post created successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/blogs/:idOrSlug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ $or: [{ slug: req.params.idOrSlug }, { _id: req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? req.params.idOrSlug : undefined }] }, { __v: 0 }).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    const { _id, ...data } = blog;
    res.json({ success: true, data: { ...data, id: _id.toString() } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/blogs/:idOrSlug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ $or: [{ slug: req.params.idOrSlug }] });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    Object.assign(blog, req.body, { updatedAt: new Date() });
    if (req.body.status === 'published' && !blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();
    res.json({ success: true, data: blog, message: 'Blog updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/blogs/:idOrSlug', async (req, res) => {
  try {
    await Blog.deleteOne({ $or: [{ slug: req.params.idOrSlug }] });
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// WISHLIST ENDPOINTS
// ==========================================
router.get('/wishlist', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'guest';
    const items = await Wishlist.find({ userId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/wishlist/add', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'] || 'guest';
    const { productId } = req.body;
    const product = await Product.findOne({ productId: Number(productId) }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const exists = await Wishlist.findOne({ userId, productId: Number(productId) });
    if (exists) return res.json({ success: true, message: 'Already in wishlist' });

    await Wishlist.create({ userId, productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice });
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Alias: POST /wishlist/:productId (frontend compatibility)
router.post('/wishlist/:productId', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'] || 'guest';
    const productId = Number(req.params.productId);
    const product = await Product.findOne({ productId }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const exists = await Wishlist.findOne({ userId, productId });
    if (exists) return res.json({ success: true, message: 'Already in wishlist' });

    await Wishlist.create({ userId, productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice });
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/wishlist/remove/:productId', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'guest';
    await Wishlist.deleteOne({ userId, productId: Number(req.params.productId) });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Alias: DELETE /wishlist/:productId (frontend compatibility)
router.delete('/wishlist/:productId', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'guest';
    await Wishlist.deleteOne({ userId, productId: Number(req.params.productId) });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/wishlist/check/:productId', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'guest';
    const exists = await Wishlist.findOne({ userId, productId: Number(req.params.productId) });
    res.json({ success: true, data: { inWishlist: !!exists } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// USER PROFILE ENDPOINTS
// ==========================================
router.get('/users/profile', async (req, res) => {
  try {
    const db = require('../db/mongodb').mongoose.connection.db;
    const userId = req.query.userId || req.headers['x-user-id'];
    let user;
    if (userId) {
      const { ObjectId } = require('mongoose').Types;
      try { user = await db.collection('users').findOne({ _id: new ObjectId(userId) }); } catch (e) {}
      if (!user) user = await db.collection('users').findOne({ email: userId });
    }
    if (!user) user = await db.collection('users').findOne({ role: 'user' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...data } = user;
    data.id = data._id.toString();
    data.userId = data.id;
    delete data._id;
    // Map shipping to address for frontend
    if (data.shipping) {
      data.address = {
        street: data.shipping.address_1 || '',
        city: data.shipping.city || '',
        state: data.shipping.state || '',
        pincode: data.shipping.postcode || '',
        country: data.shipping.country || 'India'
      };
    }
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/users/profile', async (req, res) => {
  try {
    const db = require('../db/mongodb').mongoose.connection.db;
    const { ObjectId } = require('mongoose').Types;
    const userId = req.body.userId || req.headers['x-user-id'];
    const { name, phone, address } = req.body;
    const update = { updated_at: new Date() };
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address) {
      update.shipping = {
        address_1: address.street || '',
        city: address.city || '',
        state: address.state || '',
        postcode: address.pincode || '',
        country: address.country || 'India',
      };
    }
    let filter;
    try { filter = { _id: new ObjectId(userId) }; } catch (e) { filter = { email: userId }; }
    await db.collection('users').updateOne(filter, { $set: update });
    const user = await db.collection('users').findOne(filter);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...data } = user;
    data.id = data._id.toString();
    delete data._id;
    if (data.shipping) {
      data.address = { street: data.shipping.address_1 || '', city: data.shipping.city || '', state: data.shipping.state || '', pincode: data.shipping.postcode || '', country: data.shipping.country || 'India' };
    }
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// ADMIN ANALYTICS ENDPOINTS
// ==========================================
router.get('/admin/analytics/overview', async (req, res) => {
  try {
    const db = require('../db/mongodb').mongoose.connection.db;
    const [totalOrders, totalProducts, totalUsers] = await Promise.all([
      Order.countDocuments(), Product.countDocuments(), db.collection('users').countDocuments()
    ]);
    const revenueAgg = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]);
    const totalRevenue = revenueAgg[0]?.total || 0;
    res.json({
      success: true, data: {
        total_revenue: totalRevenue || 485999, total_orders: totalOrders || 23, total_customers: totalUsers || 156,
        conversion_rate: 3.2, avg_order_value: totalOrders ? Math.round(totalRevenue / totalOrders) : 21130,
        revenue_growth: 12.5, orders_growth: 8.3, customers_growth: 15.2
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/analytics/revenue', async (req, res) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  res.json({ success: true, data: { chart: months.map((m, i) => ({ month: m, revenue: 120000 + i * 50000, orders: 5 + i * 3 })), total: 485999, growth: 12.5 } });
});

router.get('/admin/analytics/sales', async (req, res) => {
  try {
    const topProducts = await Product.find({}, { _id: 0 }).sort({ rating: -1 }).limit(5).lean();
    res.json({
      success: true, data: {
        top_products: topProducts.map(p => ({ id: p.productId, name: p.name, sold: Math.floor(Math.random() * 20 + 5), revenue: p.salePrice * Math.floor(Math.random() * 10 + 3) })),
        top_categories: [{ name: 'Silk Sarees', sold: 45, revenue: 980000 }, { name: 'Kurtas', sold: 67, revenue: 450000 }, { name: 'Lehengas', sold: 12, revenue: 720000 }]
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/analytics/products', async (req, res) => {
  try {
    const total = await Product.countDocuments();
    const byCat = await Product.aggregate([{ $group: { _id: '$categoryName', count: { $sum: 1 } } }, { $project: { _id: 0, category: '$_id', count: 1 } }]);
    res.json({ success: true, data: { total, in_stock: total - 3, out_of_stock: 3, low_stock: 5, by_category: byCat } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/warehouses', (req, res) => {
  res.json({ success: true, data: [
    { id: 1, name: 'Mumbai Warehouse', location: 'Mumbai, MH', capacity: 5000, utilized: 3200, status: 'active' },
    { id: 2, name: 'Jaipur Warehouse', location: 'Jaipur, RJ', capacity: 3000, utilized: 1800, status: 'active' }
  ] });
});

router.get('/admin/inventory/low-stock', async (req, res) => {
  try {
    const items = await Product.find({ stock: { $lte: 10 } }, { _id: 0, productId: 1, name: 1, stock: 1, categoryName: 1, thumbnail: 1 }).limit(10).lean();
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin users
router.get('/admin/users', async (req, res) => {
  try {
    const db = require('../db/mongodb').mongoose.connection.db;
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    const mapped = users.map(u => { const { _id, ...rest } = u; return { ...rest, id: _id.toString() }; });
    res.json({ success: true, data: mapped });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin orders
router.get('/admin/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) filter.$or = [{ orderId: { $regex: search, $options: 'i' } }, { userName: { $regex: search, $options: 'i' } }, { userEmail: { $regex: search, $options: 'i' } }];
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter, { _id: 0, __v: 0 }).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(filter)
    ]);

    // Stats
    const [totalOrders, pending, confirmed, shipped, delivered, cancelled] = await Promise.all([
      Order.countDocuments(), Order.countDocuments({ status: 'pending' }), Order.countDocuments({ status: 'confirmed' }),
      Order.countDocuments({ status: 'shipped' }), Order.countDocuments({ status: 'delivered' }), Order.countDocuments({ status: 'cancelled' })
    ]);
    const revenueAgg = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]);

    res.json({
      success: true, data: {
        orders, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total },
        stats: { total: totalOrders, pending, confirmed, shipped, delivered, cancelled, revenue: revenueAgg[0]?.total || 0 }
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/admin/orders/:orderId/status', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const { status, note, trackingNumber, trackingUrl } = req.body;
    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note: note || `Status changed to ${status}` });
    if (trackingNumber) { order.trackingNumber = trackingNumber; order.trackingUrl = trackingUrl || ''; }
    await order.save();
    res.json({ success: true, data: order.toObject() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, __v: 0 }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin blog stats
router.get('/admin/blogs/stats', async (req, res) => {
  try {
    const [total, published, drafts] = await Promise.all([Blog.countDocuments(), Blog.countDocuments({ status: 'published' }), Blog.countDocuments({ status: 'draft' })]);
    const totalViews = (await Blog.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]))[0]?.total || 0;
    res.json({ success: true, data: { total_posts: total, published, drafts, total_views: totalViews, total_comments: 20 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Shipment stubs
router.get('/orders/admin/shipments', (req, res) => res.json({ success: true, data: { shipments: [], total: 0 } }));
router.get('/orders/admin/shipments/ready-to-ship', (req, res) => res.json({ success: true, data: [] }));
router.get('/orders/admin/shipments/pending', (req, res) => res.json({ success: true, data: [] }));

// ==========================================
// COUPONS
// ==========================================
router.post('/coupons/validate', (req, res) => {
  const { code, cartTotal } = req.body;
  const coupons = { WELCOME10: { discount: 10, type: 'percentage', minOrder: 500 }, SILK20: { discount: 20, type: 'percentage', minOrder: 2000 }, FESTIVE15: { discount: 15, type: 'percentage', minOrder: 1000 } };
  const coupon = coupons[code?.toUpperCase()];
  if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
  if (cartTotal < coupon.minOrder) return res.status(400).json({ success: false, message: `Min order: Rs${coupon.minOrder}` });
  const discountAmt = coupon.type === 'percentage' ? Math.round(cartTotal * coupon.discount / 100) : coupon.discount;
  res.json({ success: true, data: { code: code.toUpperCase(), discount: discountAmt, type: coupon.type, value: coupon.discount } });
});

// ==========================================
// RECOMMENDATIONS
// ==========================================
router.get('/recommendations', async (req, res) => {
  try {
    const products = await Product.find({}, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Recommendations for specific product (related products)
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await Product.findOne({ productId }, { categorySlug: 1 }).lean();
    let products;
    if (product?.categorySlug) {
      // Get related products from same category
      products = await Product.find({ categorySlug: product.categorySlug, productId: { $ne: productId } }, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean();
    } else {
      // Fallback to top rated products
      products = await Product.find({ productId: { $ne: productId } }, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean();
    }
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Also handle /products/:id/recommendations for frontend compatibility
router.get('/products/:id/recommendations', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await Product.findOne({ productId }, { categorySlug: 1 }).lean();
    let products;
    if (product?.categorySlug) {
      products = await Product.find({ categorySlug: product.categorySlug, productId: { $ne: productId } }, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean();
    } else {
      products = await Product.find({ productId: { $ne: productId } }, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean();
    }
    res.json({ success: true, data: products.map(p => ({ ...p, id: p.productId })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// REVIEWS (mock)
// ==========================================
router.get('/reviews/product/:productId', (req, res) => {
  res.json({
    success: true, data: {
      reviews: [
        { id: 1, user: 'Priya S.', rating: 5, comment: 'Beautiful fabric and excellent craftsmanship!', date: '2026-03-01' },
        { id: 2, user: 'Anita M.', rating: 4, comment: 'Good quality, fast delivery.', date: '2026-02-28' }
      ],
      average: 4.5, total: 2
    }
  });
});

router.post('/reviews', (req, res) => {
  res.status(201).json({ success: true, message: 'Review submitted', data: { id: Date.now(), ...req.body } });
});

module.exports = router;
