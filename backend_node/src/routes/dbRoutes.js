const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config/config');
const { Product, Order, Blog, Wishlist, Cart } = require('../models');
const { sendOrderConfirmation } = require('../services/emailService');
const catalogReadService = require('../services/catalog-read.service');
const storefrontCheckoutService = require('../services/storefront-checkout.service');
const auth = require('../middlewares/auth');
const { optionalAuth } = require('../middlewares/authRBAC');

const isAdminOrEditor = (user) => {
  if (!user) return false;

  const role = String(user.role || '').toLowerCase();
  const roles = Array.isArray(user.roles) ? user.roles.map((entry) => String(entry).toLowerCase()) : [];

  return role === 'admin' || role === 'editor' || roles.includes('admin') || roles.includes('editor');
};

const normalizeTenantId = (value) => {
  const numericTenantId = Number(value);
  return Number.isInteger(numericTenantId) && numericTenantId > 0 ? numericTenantId : 1;
};

const getRequestTenantId = (req) => normalizeTenantId(
  req.user?.tenantId ||
  req.user?.tenant_id ||
  req.headers['x-tenant-id'] ||
  1
);

const buildProductLookup = (identifier) => {
  if (identifier == null) {
    return null;
  }

  const stringIdentifier = String(identifier).trim();

  if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
    return { _id: new mongoose.Types.ObjectId(stringIdentifier) };
  }

  if (/^\d+$/.test(stringIdentifier)) {
    return { productId: Number(stringIdentifier) };
  }

  return { slug: stringIdentifier };
};

const PUBLIC_PRODUCT_STATUS_FILTER = {
  $or: [
    { status: { $exists: false } },
    { status: 'published' },
    { status: 'publish' },
  ],
};

const isPubliclyVisibleProduct = (product) => {
  if (!product || !product.status) return true;
  return ['published', 'publish'].includes(String(product.status).toLowerCase());
};

const isPublishedBlogStatus = (status) => String(status || '').toLowerCase() === 'published';

router.use('/admin', auth(['admin']));
router.use('/orders/admin', auth(['admin']));

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
    const tenantId = normalizeTenantId(user.tenantId || user.tenant_id || 1);
    const token = jwt.sign(
      { sub: userId, user_id: userId, email: user.email, name: user.name, role: user.role, roles: [user.role], permissions: isAdmin ? ['all'] : ['read', 'write_own'], tenant_id: tenantId, tenantId },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    const refreshToken = 'refresh_' + token.slice(-20);
    res.json({
      success: true,
      data: {
        user: { id: userId, userId, email: user.email, name: user.name, phone: user.phone, role: user.role, roles: [user.role], tenantId },
        token,
        access_token: token,
        refreshToken,
        refresh_token: refreshToken,
      }
    });
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
      { sub: userId, user_id: userId, email, name, role: 'user', roles: ['user'], permissions: ['read', 'write_own'], tenant_id: 1, tenantId: 1 },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, userId, email, name, phone, role: 'user', tenantId: 1 },
        token,
        access_token: token,
      }
    });
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
router.get('/products', optionalAuth, async (req, res) => {
  try {
    const data = await catalogReadService.listProducts(
      {
        ...req.query,
        per_page: req.query.per_page || req.query.limit || 20,
      },
      {
        tenantId: getRequestTenantId(req),
        user: req.user || null,
      }
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/products/filter', async (req, res) => {
  // Redirect to main products endpoint (same logic)
  req.url = '/products?' + new URLSearchParams(req.query).toString();
  router.handle(req, res);
});

router.get('/products/featured', optionalAuth, async (req, res) => {
  try {
    const filter = { isFeatured: true };
    if (!isAdminOrEditor(req.user)) {
      filter.$and = [PUBLIC_PRODUCT_STATUS_FILTER];
    }
    const products = await Product.find(filter, { __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p._id?.toString() || String(p.productId || '') })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/trending', optionalAuth, async (req, res) => {
  try {
    const filter = { isTrending: true };
    if (!isAdminOrEditor(req.user)) {
      filter.$and = [PUBLIC_PRODUCT_STATUS_FILTER];
    }
    const products = await Product.find(filter, { __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p._id?.toString() || String(p.productId || '') })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/new-arrivals', optionalAuth, async (req, res) => {
  try {
    const filter = { isNew: true };
    if (!isAdminOrEditor(req.user)) {
      filter.$and = [PUBLIC_PRODUCT_STATUS_FILTER];
    }
    const products = await Product.find(filter, { __v: 0 }).limit(8).lean();
    res.json({ success: true, data: products.map(p => ({ ...p, id: p._id?.toString() || String(p.productId || '') })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/:id', optionalAuth, async (req, res) => {
  try {
    const product = await catalogReadService.getProduct(req.params.id, {
      tenantId: getRequestTenantId(req),
      user: req.user || null,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// CATEGORIES
// ==========================================
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const categories = await catalogReadService.listCategories({
      tenantId: getRequestTenantId(req),
      user: req.user || null,
    });
    res.json({ success: true, data: categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/categories/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const category = await catalogReadService.getCategory(req.params.slug, {
      tenantId: getRequestTenantId(req),
      user: req.user || null,
      includeProducts: true,
    });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/categories/:identifier', optionalAuth, async (req, res) => {
  try {
    const category = await catalogReadService.getCategory(req.params.identifier, {
      tenantId: getRequestTenantId(req),
      user: req.user || null,
      includeProducts: true,
    });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// SEARCH
// ==========================================
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    if (!q) return res.json({ success: true, data: { products: [], suggestions: [] } });
    const query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { categoryName: { $regex: q, $options: 'i' } },
      ],
    };

    if (!isAdminOrEditor(req.user)) {
      query.$and = [PUBLIC_PRODUCT_STATUS_FILTER];
    }

    const products = await Product.find(query, { __v: 0 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { products: products.map(p => ({ ...p, id: p._id?.toString() || p.productId })), suggestions: products.slice(0, 5).map(p => p.name) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// CART ENDPOINTS
// ==========================================
const getSessionId = (req) => req.headers['x-session-id'] || req.query.sessionId || req.query.session_id || storefrontCheckoutService.generateSessionId();

router.get('/cart', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.getCart(sessionId);
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, data: cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/cart/add', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.addToCart({
      sessionId,
      productId: req.body.productId,
      variantId: req.body.variantId,
      quantity: req.body.quantity,
      size: req.body.size,
      color: req.body.color,
    });
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, message: 'Added to cart', data: cart });
  } catch (err) {
    const statusCode = err.statusCode || (err.code === 'INSUFFICIENT_STOCK' ? 409 : 500);
    res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.availableStock != null ? { availableStock: err.availableStock } : {}),
    });
  }
});

router.put('/cart/item/:itemId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.updateCartItem({
      sessionId,
      itemId: req.params.itemId,
      quantity: req.body.quantity,
    });
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, data: cart });
  } catch (err) {
    const statusCode = err.statusCode || (err.code === 'INSUFFICIENT_STOCK' ? 409 : 500);
    res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.availableStock != null ? { availableStock: err.availableStock } : {}),
    });
  }
});

router.delete('/cart/item/:itemId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.removeCartItem({
      sessionId,
      itemId: req.params.itemId,
    });
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, message: 'Removed from cart', data: cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/cart/update', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.updateCartItem({
      sessionId,
      itemId: req.body.itemId || req.body.cartItemId,
      quantity: req.body.quantity,
    });
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, data: cart });
  } catch (err) {
    const statusCode = err.statusCode || (err.code === 'INSUFFICIENT_STOCK' ? 409 : 500);
    res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.availableStock != null ? { availableStock: err.availableStock } : {}),
    });
  }
});

router.delete('/cart/remove/:productId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.removeCartItem({
      sessionId,
      itemId: req.params.productId,
    });
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, message: 'Removed from cart', data: cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/cart/clear', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.clearCart(sessionId);
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, message: 'Cart cleared', data: cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/cart', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await storefrontCheckoutService.clearCart(sessionId);
    res.setHeader('x-session-id', sessionId);
    res.json({ success: true, message: 'Cart cleared', data: cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// ORDERS ENDPOINTS
// ==========================================
router.get('/orders/my', auth(), async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.sub;
    const data = await storefrontCheckoutService.getOrders({ userId, page: 1, limit: 100 });
    res.json({ success: true, data: { orders: data.orders } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/orders', optionalAuth, async (req, res) => {
  try {
    const data = await storefrontCheckoutService.createOrder(req.body, {
      user: req.user || null,
      tenantId: getRequestTenantId(req),
    });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/orders/:orderId/payment', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.confirmPayment(req.params.orderId, req.body);
    res.json({ success: true, message: 'Payment verified', data: { orderId: order.orderId, status: order.status, paymentStatus: order.paymentStatus } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.availableStock != null ? { availableStock: err.availableStock } : {}),
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const data = await storefrontCheckoutService.getOrders(req.query);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.getOrderByOrderId(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.updateOrderStatus(req.params.orderId, req.body);
    res.json({ success: true, data: { orderId: order.orderId, status: order.status } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/orders/:orderId/cancel', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.updateOrderStatus(req.params.orderId, {
      status: 'cancelled',
      note: req.body.reason || 'Cancelled by user',
    });
    res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Alias: POST /orders/my/:orderId/cancel (frontend compatibility)
router.post('/orders/my/:orderId/cancel', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.updateOrderStatus(req.params.orderId, {
      status: 'cancelled',
      note: req.body.reason || 'Cancelled by user',
    });
    res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders/:orderId/tracking', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.getOrderByOrderId(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        trackingNumber: order.trackingNumber || '',
        trackingUrl: order.trackingUrl || '',
        statusHistory: order.statusHistory || [],
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// BLOG ENDPOINTS
// ==========================================
router.get('/blogs', optionalAuth, async (req, res) => {
  try {
    const { page = 1, per_page = 10, category, search, status } = req.query;
    const filter = {};
    const privileged = isAdminOrEditor(req.user);
    if (category) filter.categories = { $in: [category] };
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
    if (privileged && status) {
      filter.status = status;
    } else {
      filter.status = 'published';
    }
    const skip = (Number(page) - 1) * Number(per_page);
    const [posts, total] = await Promise.all([
      Blog.find(filter, { __v: 0 }).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(Number(per_page)).lean(),
      Blog.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({ ...post, id: post._id?.toString() || post.slug })),
        pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(per_page)), total }
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


router.get('/blogs/capabilities', optionalAuth, (req, res) => {
  const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
  const isEditor = String(req.user?.role || '').toLowerCase() === 'editor';
  res.json({
    success: true,
    data: {
      capabilities: {
        edit_posts: isAdmin || isEditor,
        publish_posts: isAdmin || isEditor,
        edit_others_posts: isAdmin,
        delete_posts: isAdmin,
      }
    }
  });
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

router.post('/blogs', auth(['admin', 'editor']), async (req, res) => {
  try {
    const { title, slug, content, excerpt, status = 'draft', categories = [], tags = [], featuredImage, seoTitle, seoDescription } = req.body;
    const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const blog = await Blog.create({
      title, slug: blogSlug, content, excerpt,
      author: { id: req.user?.user_id || req.user?.sub || 'unknown', name: req.user?.name || 'Admin' },
      categories: Array.isArray(categories) ? categories : [],
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
      status, featuredImage, seoTitle, seoDescription,
      publishedAt: status === 'published' ? new Date() : null,
    });
    const blogData = blog.toObject();
    const blogId = blogData._id?.toString();
    delete blogData.__v;
    res.status(201).json({ success: true, data: { ...blogData, id: blogId || blogSlug }, message: 'Blog post created successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/blogs/:idOrSlug', optionalAuth, async (req, res) => {
  try {
    const blog = await Blog.findOne({ $or: [{ slug: req.params.idOrSlug }, { _id: req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? req.params.idOrSlug : undefined }] }, { __v: 0 }).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    if (!isAdminOrEditor(req.user) && !isPublishedBlogStatus(blog.status)) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    const { _id, ...data } = blog;
    res.json({ success: true, data: { ...data, id: _id.toString() } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/blogs/:idOrSlug', auth(['admin', 'editor']), async (req, res) => {
  try {
    const lookup = [{ slug: req.params.idOrSlug }];
    if (req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      lookup.push({ _id: req.params.idOrSlug });
    }
    const blog = await Blog.findOne({ $or: lookup });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    Object.assign(blog, req.body, { updatedAt: new Date() });
    if (req.body.status === 'published' && !blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();
    const blogData = blog.toObject();
    res.json({ success: true, data: { ...blogData, id: blogData._id?.toString() || blog.slug }, message: 'Blog updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/blogs/:idOrSlug', auth(['admin']), async (req, res) => {
  try {
    const lookup = [{ slug: req.params.idOrSlug }];
    if (req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      lookup.push({ _id: req.params.idOrSlug });
    }
    await Blog.deleteOne({ $or: lookup });
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
    const userId = (req.body && req.body.userId) || req.headers['x-user-id'] || 'guest';

    // Safely read productId from body (avoid destructuring errors when body is not an object)
    const rawProductId = req.body && (req.body.productId || req.body.product_id) ? (req.body.productId || req.body.product_id) : null;
    const pid = Number(rawProductId);

    if (!rawProductId || Number.isNaN(pid)) {
      return res.status(400).json({ success: false, message: 'productId is required in request body' });
    }

    const product = await Product.findOne({ productId: pid }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const exists = await Wishlist.findOne({ userId, productId: pid });
    if (exists) return res.json({ success: true, message: 'Already in wishlist' });

    await Wishlist.create({ userId, productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice });
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    console.error('[dbRoutes] /wishlist/add error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
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
// NOTE: These endpoints are implemented in the v1 routes with proper auth + unified response shape.
// We keep the mount order in app.js (dbRoutes first), so these handlers must pass through.
router.get('/admin/analytics/overview', (req, res, next) => next());
router.get('/admin/analytics/revenue', (req, res, next) => next());
router.get('/admin/analytics/sales', (req, res, next) => next());
router.get('/admin/analytics/products', (req, res, next) => next());

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
    const data = await storefrontCheckoutService.getOrders(req.query);
    const stats = await storefrontCheckoutService.getOrderStats();
    res.json({
      success: true, data: {
        orders: data.orders,
        pagination: data.pagination,
        stats,
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/admin/orders/:orderId/status', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.updateOrderStatus(req.params.orderId, req.body);
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/orders/:orderId', async (req, res) => {
  try {
    const order = await storefrontCheckoutService.getOrderByOrderId(req.params.orderId);
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
// ==========================================
// COUPONS
// ==========================================
const MOCK_COUPONS = [
  { id: 1, code: 'WELCOME10', description: '10% off on your first order', type: 'percentage', value: 10, min_cart_value: 500, used_count: 45, usage_limit: 500, status: 'active', expires_at: '2026-12-31T23:59:59' },
  { id: 2, code: 'SILK20', description: '20% off on Silk products', type: 'percentage', value: 20, min_cart_value: 2000, used_count: 120, usage_limit: 300, status: 'active', expires_at: '2026-06-30T23:59:59' },
  { id: 3, code: 'FESTIVE15', description: '15% off during festive season', type: 'percentage', value: 15, min_cart_value: 1000, used_count: 89, usage_limit: 200, status: 'active', expires_at: '2026-12-31T23:59:59' },
  { id: 4, code: 'FLAT500', description: 'Flat Rs 500 off on orders above Rs 3000', type: 'flat', value: 500, min_cart_value: 3000, used_count: 33, usage_limit: 100, status: 'active', expires_at: '2026-09-30T23:59:59' },
  { id: 5, code: 'NEWUSER25', description: '25% off for new users', type: 'percentage', value: 25, min_cart_value: 800, used_count: 200, usage_limit: 1000, status: 'active', expires_at: '2026-12-31T23:59:59' },
];

router.get('/coupons', (req, res) => {
  res.json({ success: true, data: { coupons: MOCK_COUPONS } });
});

router.get('/coupons/validate/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const coupon = MOCK_COUPONS.find((entry) => entry.code === code && entry.status === 'active');

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid coupon code' });
  }

  return res.json({
    success: true,
    data: {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      min_cart_value: coupon.min_cart_value || 0,
    },
  });
});

router.get('/coupons/:id', (req, res) => {
  const coupon = MOCK_COUPONS.find(c => c.id === parseInt(req.params.id));
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  res.json({ success: true, data: coupon });
});

router.post('/coupons', (req, res) => {
  const newCoupon = { id: MOCK_COUPONS.length + 1, ...req.body, usage_count: 0, status: 'active' };
  MOCK_COUPONS.push(newCoupon);
  res.json({ success: true, data: newCoupon });
});

router.put('/coupons/:id', (req, res) => {
  const idx = MOCK_COUPONS.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Coupon not found' });
  MOCK_COUPONS[idx] = { ...MOCK_COUPONS[idx], ...req.body };
  res.json({ success: true, data: MOCK_COUPONS[idx] });
});

router.delete('/coupons/:id', (req, res) => {
  const idx = MOCK_COUPONS.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Coupon not found' });
  MOCK_COUPONS.splice(idx, 1);
  res.json({ success: true, message: 'Coupon deleted' });
});

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
router.get('/recommendations', optionalAuth, async (req, res) => {
  try {
    const data = await catalogReadService.listProducts(
      { sort: 'rating', per_page: 8 },
      { tenantId: getRequestTenantId(req), user: req.user || null }
    );
    res.json({ success: true, data: data.products });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Recommendations for specific product (related products)
router.get('/recommendations/:productId', optionalAuth, async (req, res) => {
  try {
    const product = await catalogReadService.getProduct(req.params.productId, {
      tenantId: getRequestTenantId(req),
      user: req.user || null,
    });
    res.json({ success: true, data: product?.relatedProducts || [] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Also handle /products/:id/recommendations for frontend compatibility
router.get('/products/:id/recommendations', optionalAuth, async (req, res) => {
  try {
    const product = await catalogReadService.getProduct(req.params.id, {
      tenantId: getRequestTenantId(req),
      user: req.user || null,
    });
    res.json({ success: true, data: product?.relatedProducts || [] });
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
