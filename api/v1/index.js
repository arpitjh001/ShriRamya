const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// ==========================================
// Email Service
// ==========================================
let emailTransporter = null;
function getEmailTransporter() {
  if (!emailTransporter && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user: process.env.SMTP_USER || 'orders@shriramya.com', pass: process.env.SMTP_PASS },
    });
  }
  return emailTransporter;
}
function fmtPrice(a) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a || 0); }
function buildOrderEmail(order, isAdmin) {
  const addr = order.shippingAddress || {};
  const itemsHtml = (order.items || []).map(i => `<tr><td style="padding:10px 8px;border-bottom:1px solid #f0e6d6;"><strong>${i.name}</strong>${i.size ? ' ('+i.size+')' : ''}</td><td style="padding:10px;text-align:center;border-bottom:1px solid #f0e6d6;">${i.quantity}</td><td style="padding:10px;text-align:right;border-bottom:1px solid #f0e6d6;">${fmtPrice((i.salePrice||i.price)*i.quantity)}</td></tr>`).join('');
  if (isAdmin) {
    return { subject: `New Order - ${order.orderId} (${fmtPrice(order.total)})`, html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#2d1810;padding:20px;text-align:center;"><h1 style="color:#f0e6d6;margin:0;font-size:20px;">NEW ORDER RECEIVED</h1></div><div style="padding:20px;"><table style="width:100%;font-size:14px;"><tr><td style="padding:6px;font-weight:700;">Order</td><td>${order.orderId}</td></tr><tr><td style="padding:6px;font-weight:700;">Customer</td><td>${order.userName||addr.name||'Guest'} (${order.userEmail||addr.email||'N/A'})</td></tr><tr><td style="padding:6px;font-weight:700;">Phone</td><td>${addr.phone||'N/A'}</td></tr><tr><td style="padding:6px;font-weight:700;">Total</td><td style="font-size:18px;font-weight:700;">${fmtPrice(order.total)}</td></tr><tr><td style="padding:6px;font-weight:700;">Payment</td><td>${order.paymentMethod==='cod'?'COD':'Online'} — ${order.paymentStatus}</td></tr><tr><td style="padding:6px;font-weight:700;">Address</td><td>${addr.address||''}, ${addr.city||''} ${addr.state||''} ${addr.pincode||''}</td></tr></table><h3 style="margin-top:16px;">Items</h3><table style="width:100%;border-collapse:collapse;">${itemsHtml}</table></div></div>` };
  }
  return { subject: `Order Confirmed - ${order.orderId} | Shri Ramya`, html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fffdf9;"><div style="background:linear-gradient(135deg,#2d1810,#5c3a28);padding:28px;text-align:center;"><h1 style="color:#f0e6d6;margin:0;font-size:26px;letter-spacing:3px;">SHRI RAMYA</h1><p style="color:#c4a882;margin:6px 0 0;font-size:11px;letter-spacing:2px;">HANDCRAFTED ETHNIC WEAR</p></div><div style="padding:28px;text-align:center;"><div style="width:50px;height:50px;background:#e8f5e9;border-radius:50%;margin:0 auto 12px;line-height:50px;font-size:24px;color:#4caf50;">&#10003;</div><h2 style="color:#2d1810;margin:0 0 6px;">Thank you for your order!</h2><p style="color:#8b7355;margin:0;font-size:14px;">Order ${order.orderId} has been confirmed.</p></div><div style="padding:0 28px;"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="border-bottom:2px solid #2d1810;"><th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;">Item</th><th style="padding:8px;text-align:center;font-size:11px;text-transform:uppercase;">Qty</th><th style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table><div style="margin-top:16px;padding:14px;background:#faf6f0;border-radius:8px;"><table style="width:100%;font-size:14px;"><tr><td>Subtotal</td><td style="text-align:right;">${fmtPrice(order.subtotal)}</td></tr>${order.discount?`<tr><td style="color:#4caf50;">Discount</td><td style="text-align:right;color:#4caf50;">-${fmtPrice(order.discount)}</td></tr>`:''}<tr><td>Shipping</td><td style="text-align:right;">${order.shipping?fmtPrice(order.shipping):'Free'}</td></tr><tr style="border-top:2px solid #2d1810;"><td style="padding-top:10px;font-weight:700;font-size:16px;">Total</td><td style="text-align:right;padding-top:10px;font-weight:700;font-size:16px;">${fmtPrice(order.total)}</td></tr></table></div></div>${addr.name?`<div style="padding:20px 28px;"><h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;">Shipping Address</h3><div style="background:#faf6f0;border-radius:8px;padding:14px;font-size:14px;line-height:1.6;"><strong>${addr.name}</strong><br/>${addr.address||''}${addr.city?', '+addr.city:''}${addr.state?' '+addr.state:''} ${addr.pincode||''}<br/>${addr.phone?'Phone: '+addr.phone:''}</div></div>`:''}<div style="background:#2d1810;padding:20px;text-align:center;"><p style="color:#c4a882;margin:0;font-size:12px;">Need help? Reply to this email | www.shriramya.com</p></div></div>` };
}
async function sendOrderEmails(order) {
  const t = getEmailTransporter();
  if (!t) return;
  const smtpUser = process.env.SMTP_USER || 'orders@shriramya.com';
  const adminEmail = process.env.ADMIN_EMAIL || 'orders@shriramya.com';
  const customerEmail = order.userEmail || order.shippingAddress?.email;
  const promises = [];
  if (customerEmail) { const e = buildOrderEmail(order, false); promises.push(t.sendMail({ from: `"Shri Ramya" <${smtpUser}>`, to: customerEmail, ...e }).catch(err => console.error('Email to customer failed:', err.message))); }
  const ae = buildOrderEmail(order, true); promises.push(t.sendMail({ from: `"Shri Ramya Orders" <${smtpUser}>`, to: adminEmail, ...ae }).catch(err => console.error('Email to admin failed:', err.message)));
  await Promise.allSettled(promises);
}

// ==========================================
// MongoDB Connection (singleton for serverless)
// ==========================================
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    await mongoose.connect(mongoUrl, {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    isConnected = true;
    console.log('MongoDB connected for serverless');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

// ==========================================
// Mongoose Models (define once)
// ==========================================
const productSchema = new mongoose.Schema({
  productId: { type: Number, unique: true, index: true },
  name: String, slug: String, description: String,
  price: Number, salePrice: Number, discount: Number,
  categoryName: String, categorySlug: String, subcategory: String,
  fabric: String, color: String, occasion: String, work: String, brand: String,
  images: [String], thumbnail: String,
  stock: { type: Number, default: 50 },
  rating: { type: Number, default: 4.2 },
  reviewCount: { type: Number, default: 0 },
  tags: [String], sizes: [String],
  isNew: Boolean, isTrending: Boolean, isFeatured: Boolean,
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, index: true },
  userId: { type: String, index: true },
  userEmail: String, userName: String,
  items: [{ productId: Number, name: String, thumbnail: String, price: Number, salePrice: Number, quantity: Number, size: String, color: String }],
  shippingAddress: { name: String, phone: String, street: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
  subtotal: Number, discount: { type: Number, default: 0 }, shipping: { type: Number, default: 0 }, tax: { type: Number, default: 0 }, total: Number,
  couponCode: String, status: { type: String, default: 'pending' }, paymentStatus: { type: String, default: 'pending' },
  paymentMethod: String, razorpayOrderId: String, razorpayPaymentId: String,
  trackingNumber: String, trackingUrl: String, notes: String,
  statusHistory: [{ status: String, timestamp: Date, note: String }],
}, { timestamps: true });

const blogSchema = new mongoose.Schema({
  title: String, slug: { type: String, unique: true, index: true },
  content: String, excerpt: String,
  author: { id: String, name: String },
  categories: [String], tags: [String],
  status: { type: String, default: 'draft' },
  featuredImage: String, seoTitle: String, seoDescription: String,
  views: { type: Number, default: 0 }, commentsCount: { type: Number, default: 0 },
  publishedAt: Date,
}, { timestamps: true });

const wishlistSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  productId: { type: Number, index: true },
  name: String, thumbnail: String, price: Number, salePrice: Number,
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
  sessionId: { type: String, index: true },
  userId: String,
  items: [{ productId: Number, name: String, thumbnail: String, price: Number, salePrice: Number, quantity: { type: Number, default: 1 }, size: String, color: String }],
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

// ==========================================
// Express App Setup
// ==========================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'shriramya_jwt_secret_2026';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ==========================================
// AUTH ROUTES
// ==========================================
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const userId = user._id.toString();
    const isAdmin = user.role === 'admin';
    const token = jwt.sign({ sub: userId, user_id: userId, email: user.email, name: user.name, role: user.role, roles: [user.role], permissions: isAdmin ? ['all'] : ['read', 'write_own'], tenantId: 'shriramya' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, data: { user: { id: userId, userId, email: user.email, name: user.name, phone: user.phone, role: user.role, roles: [user.role] }, token, refreshToken: 'refresh_' + token.slice(-20) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    await connectDB();
    const { name, email, password, phone } = req.body;
    const db = mongoose.connection.db;
    const exists = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 8);
    const result = await db.collection('users').insertOne({ email: email.toLowerCase(), password: hashed, name, phone, role: 'user', is_active: true, shipping: {}, created_at: new Date(), updated_at: new Date() });
    const userId = result.insertedId.toString();
    const token = jwt.sign({ sub: userId, user_id: userId, email, name, role: 'user', roles: ['user'], tenantId: 'shriramya' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ success: true, data: { user: { id: userId, userId, email, name, phone, role: 'user' }, token } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/v1/auth/check-admin', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const role = (decoded.role || '').toLowerCase();
    const roles = (decoded.roles || []).map(r => r.toLowerCase());
    const isAdmin = role === 'admin' || roles.includes('admin');
    res.json({ success: true, data: { is_admin: isAdmin, capabilities: { edit_posts: isAdmin, publish_posts: isAdmin, edit_others_posts: isAdmin, delete_posts: isAdmin, manage_categories: isAdmin, moderate_comments: isAdmin } } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

app.post('/api/v1/auth/refresh-token', (req, res) => {
  const token = jwt.sign({ sub: 'admin_001', role: 'admin', roles: ['admin'] }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, data: { token } });
});

// ==========================================
// PRODUCTS ROUTES
// ==========================================
app.get('/api/v1/products', async (req, res) => {
  try {
    await connectDB();
    const { page = 1, limit = 20, sort, category, search, minPrice, maxPrice, fabric, color, occasion, work, brand, size, discount, rating, isNew, isTrending } = req.query;
    const filter = {};
    let sortObj = { createdAt: -1 };

    if (category) {
      if (category === 'most-desired') { sortObj = { rating: -1 }; }
      else { filter.categorySlug = { $regex: new RegExp(category, 'i') }; }
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

    const allProducts = await Product.find({}, { fabric: 1, color: 1, occasion: 1, work: 1, brand: 1, sizes: 1, salePrice: 1, _id: 0 }).lean();
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

    res.json({ success: true, data: {
      products: products.map(p => ({ ...p, id: p.productId })),
      pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total, per_page: Number(limit) },
      filterMetadata: { fabrics: fabricCounts, colors: colorCounts, occasions: occasionCounts, works: workCounts, brands: brandCounts, sizes: sizeCounts, priceRange: { min: priceMin === Infinity ? 0 : priceMin, max: priceMax } }
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/v1/products/featured', async (req, res) => {
  try { await connectDB(); const p = await Product.find({ isFeatured: true }, { _id: 0, __v: 0 }).limit(8).lean(); res.json({ success: true, data: p.map(x => ({ ...x, id: x.productId })) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/products/trending', async (req, res) => {
  try { await connectDB(); const p = await Product.find({ isTrending: true }, { _id: 0, __v: 0 }).limit(8).lean(); res.json({ success: true, data: p.map(x => ({ ...x, id: x.productId })) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/products/new-arrivals', async (req, res) => {
  try { await connectDB(); const p = await Product.find({ isNew: true }, { _id: 0, __v: 0 }).limit(8).lean(); res.json({ success: true, data: p.map(x => ({ ...x, id: x.productId })) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/products/filter', async (req, res) => { req.url = '/api/v1/products?' + new URLSearchParams(req.query).toString(); app.handle(req, res); });

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findOne({ productId: Number(req.params.id) }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const related = await Product.find({ categorySlug: product.categorySlug, productId: { $ne: product.productId } }, { _id: 0, __v: 0 }).limit(4).lean();
    res.json({ success: true, data: { ...product, id: product.productId, relatedProducts: related.map(r => ({ ...r, id: r.productId })) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// CATEGORIES
// ==========================================
app.get('/api/v1/categories', async (req, res) => {
  try {
    await connectDB();
    const cats = await Product.aggregate([{ $group: { _id: '$categorySlug', name: { $first: '$categoryName' }, count: { $sum: 1 }, image: { $first: '$thumbnail' } } }, { $project: { _id: 0, id: '$_id', slug: '$_id', name: 1, count: 1, image: 1 } }, { $sort: { name: 1 } }]);
    res.json({ success: true, data: cats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/categories/:slug', async (req, res) => {
  try {
    await connectDB();
    const products = await Product.find({ categorySlug: req.params.slug }, { _id: 0, __v: 0 }).lean();
    if (!products.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { slug: req.params.slug, name: products[0].categoryName, products: products.map(p => ({ ...p, id: p.productId })) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// SEARCH
// ==========================================
app.get('/api/v1/search', async (req, res) => {
  try {
    await connectDB();
    const { q = '', limit = 10 } = req.query;
    if (!q) return res.json({ success: true, data: { products: [], suggestions: [] } });
    const products = await Product.find({ $or: [{ name: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } }, { categoryName: { $regex: q, $options: 'i' } }] }, { _id: 0, __v: 0 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { products: products.map(p => ({ ...p, id: p.productId })), suggestions: products.slice(0, 5).map(p => p.name) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// CART
// ==========================================
const getSessionId = (req) => req.headers['x-session-id'] || req.query.sessionId || 'default_session';

app.get('/api/v1/cart', async (req, res) => {
  try { await connectDB(); const sid = getSessionId(req); let cart = await Cart.findOne({ sessionId: sid }, { _id: 0, __v: 0 }).lean(); if (!cart) cart = { sessionId: sid, items: [] }; const sub = cart.items.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0); res.json({ success: true, data: { ...cart, subtotal: sub, shipping: sub > 5000 ? 0 : 99, total: sub + (sub > 5000 ? 0 : 99), itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/v1/cart/add', async (req, res) => {
  try {
    await connectDB(); const sid = getSessionId(req); const { productId, quantity = 1, size, color } = req.body;
    const product = await Product.findOne({ productId: Number(productId) }, { _id: 0, __v: 0 }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    let cart = await Cart.findOne({ sessionId: sid }); if (!cart) cart = new Cart({ sessionId: sid, items: [] });
    const idx = cart.items.findIndex(i => i.productId === Number(productId) && i.size === (size || '') && i.color === (color || ''));
    if (idx >= 0) cart.items[idx].quantity += Number(quantity);
    else cart.items.push({ productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice, quantity: Number(quantity), size: size || product.sizes?.[0] || '', color: color || product.color || '' });
    await cart.save();
    res.json({ success: true, message: 'Added to cart', data: { items: cart.items, subtotal: cart.items.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0), itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/v1/cart/update', async (req, res) => {
  try { await connectDB(); const sid = getSessionId(req); const { productId, quantity } = req.body; const cart = await Cart.findOne({ sessionId: sid }); if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' }); const item = cart.items.find(i => i.productId === Number(productId)); if (item) { if (quantity <= 0) cart.items = cart.items.filter(i => i.productId !== Number(productId)); else item.quantity = Number(quantity); } await cart.save(); res.json({ success: true, data: { items: cart.items } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.delete('/api/v1/cart/remove/:productId', async (req, res) => { try { await connectDB(); const sid = getSessionId(req); const cart = await Cart.findOne({ sessionId: sid }); if (cart) { cart.items = cart.items.filter(i => i.productId !== Number(req.params.productId)); await cart.save(); } res.json({ success: true, message: 'Removed' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });
app.delete('/api/v1/cart/clear', async (req, res) => { try { await connectDB(); await Cart.deleteOne({ sessionId: getSessionId(req) }); res.json({ success: true, message: 'Cart cleared' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });

// ==========================================
// ORDERS
// ==========================================
app.get('/api/v1/orders/my', async (req, res) => {
  try { await connectDB(); const uid = req.query.userId || req.headers['x-user-id'] || 'customer_001'; const orders = await Order.find({ userId: uid }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean(); res.json({ success: true, data: { orders } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/v1/orders', async (req, res) => {
  try {
    await connectDB();
    const { items, shippingAddress, couponCode, paymentMethod = 'razorpay', subtotal, discount = 0, shipping = 0, tax = 0, total } = req.body;
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const razorpayOrderId = 'order_' + Date.now();
    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ productId: Number(item.productId) }, { _id: 0, __v: 0 }).lean();
      enrichedItems.push({ productId: Number(item.productId), name: item.name || product?.name || 'Unknown', thumbnail: item.thumbnail || product?.thumbnail || '', price: item.price || product?.price || 0, salePrice: item.salePrice || product?.salePrice || item.price || 0, quantity: item.quantity || 1, size: item.size || '', color: item.color || '' });
    }
    const calcSub = subtotal || enrichedItems.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0);
    const calcTotal = total || (calcSub - discount + shipping + tax);
    await Order.create({ orderId, userId: req.body.userId || 'guest', userEmail: req.body.email || shippingAddress?.email || '', userName: req.body.name || shippingAddress?.name || '', items: enrichedItems, shippingAddress, couponCode, paymentMethod, subtotal: calcSub, discount, shipping, tax, total: calcTotal, status: 'pending', paymentStatus: 'pending', razorpayOrderId, statusHistory: [{ status: 'pending', timestamp: new Date(), note: 'Order created' }] });
    res.status(201).json({ success: true, data: { orderId, razorpayOrderId, amount: calcTotal, currency: 'INR', key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key', prefill: { name: shippingAddress?.name, email: shippingAddress?.email, contact: shippingAddress?.phone } } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/v1/orders/:orderId/payment', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); order.paymentStatus = 'paid'; order.status = 'confirmed'; order.razorpayPaymentId = req.body.razorpay_payment_id || 'pay_mock_' + Date.now(); order.statusHistory.push({ status: 'confirmed', timestamp: new Date(), note: 'Payment confirmed' }); await order.save(); try { await sendOrderEmails(order.toObject()); } catch (emailErr) { console.error('Email failed:', emailErr.message); } res.json({ success: true, message: 'Payment verified', data: { orderId: order.orderId, status: 'confirmed' } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/v1/orders', async (req, res) => {
  try { await connectDB(); const { userId, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query; const filter = {}; if (userId) filter.userId = userId; if (status) filter.status = status; const skip = (Number(page) - 1) * Number(limit); const [orders, total] = await Promise.all([Order.find(filter, { _id: 0, __v: 0 }).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip(skip).limit(Number(limit)).lean(), Order.countDocuments(filter)]); res.json({ success: true, data: { orders, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total } } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/v1/orders/:orderId/tracking', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, orderId: 1, status: 1, trackingNumber: 1, trackingUrl: 1, statusHistory: 1 }).lean(); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); res.json({ success: true, data: order }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/v1/orders/:orderId', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, __v: 0 }).lean(); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); res.json({ success: true, data: order }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/v1/orders/:orderId/status', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); const { status, note, trackingNumber, trackingUrl } = req.body; order.status = status; order.statusHistory.push({ status, timestamp: new Date(), note: note || `Status updated to ${status}` }); if (trackingNumber) { order.trackingNumber = trackingNumber; order.trackingUrl = trackingUrl || ''; } await order.save(); res.json({ success: true, data: { orderId: order.orderId, status: order.status } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/v1/orders/:orderId/cancel', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); order.status = 'cancelled'; order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: req.body.reason || 'Cancelled by user' }); await order.save(); res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.post('/api/v1/orders/my/:orderId/cancel', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); order.status = 'cancelled'; order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: 'Cancelled by customer' }); await order.save(); res.json({ success: true, data: { orderId: order.orderId, status: 'cancelled' } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// BLOGS
// ==========================================
app.get('/api/v1/blogs', async (req, res) => {
  try { await connectDB(); const { page = 1, per_page = 10, category, search, status } = req.query; const filter = {}; if (category) filter.categories = { $in: [category] }; if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }]; if (status) filter.status = status; const skip = (Number(page) - 1) * Number(per_page); const [posts, total] = await Promise.all([Blog.find(filter, { _id: 0, __v: 0 }).sort({ publishedAt: -1 }).skip(skip).limit(Number(per_page)).lean(), Blog.countDocuments(filter)]); res.json({ success: true, data: { posts, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(per_page)), total } } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/blogs/capabilities', (req, res) => {
  res.json({ success: true, data: { can_create: true, can_edit: true, can_delete: true, can_publish: true } });
});
app.get('/api/v1/blogs/categories', async (req, res) => {
  try { await connectDB(); const cats = await Blog.aggregate([{ $unwind: '$categories' }, { $group: { _id: '$categories', count: { $sum: 1 } } }, { $project: { _id: 0, name: '$_id', id: '$_id', count: 1 } }]); res.json({ success: true, data: cats.length ? cats : ['Traditional Crafts', 'Style Guide', 'Silk Sarees', 'Sustainability', 'Handloom'] }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/blogs/stats', async (req, res) => {
  try { await connectDB(); const [total, published, drafts] = await Promise.all([Blog.countDocuments(), Blog.countDocuments({ status: 'published' }), Blog.countDocuments({ status: 'draft' })]); const tv = (await Blog.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]))[0]?.total || 0; res.json({ success: true, data: { total_posts: total, published, drafts, total_views: tv, total_comments: 20 } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.post('/api/v1/blogs', async (req, res) => {
  try { await connectDB(); const { title, slug, content, excerpt, status = 'draft', categories = [], tags = [], featuredImage, seoTitle, seoDescription } = req.body; const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); const blog = await Blog.create({ title, slug: blogSlug, content, excerpt, author: { id: 'admin', name: 'Admin' }, categories: Array.isArray(categories) ? categories : [], tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean), status, featuredImage, seoTitle, seoDescription, publishedAt: status === 'published' ? new Date() : null }); const d = blog.toObject(); delete d._id; delete d.__v; res.status(201).json({ success: true, data: { ...d, id: blogSlug }, message: 'Blog post created' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/blogs/:idOrSlug', async (req, res) => {
  try { await connectDB(); const blog = await Blog.findOne({ slug: req.params.idOrSlug }, { __v: 0 }).lean(); if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' }); const { _id, ...data } = blog; res.json({ success: true, data: { ...data, id: _id.toString() } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.put('/api/v1/blogs/:idOrSlug', async (req, res) => {
  try { await connectDB(); const blog = await Blog.findOne({ slug: req.params.idOrSlug }); if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' }); Object.assign(blog, req.body); if (req.body.status === 'published' && !blog.publishedAt) blog.publishedAt = new Date(); await blog.save(); res.json({ success: true, data: blog, message: 'Blog updated' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.delete('/api/v1/blogs/:idOrSlug', async (req, res) => {
  try { await connectDB(); await Blog.deleteOne({ slug: req.params.idOrSlug }); res.json({ success: true, message: 'Blog deleted' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// WISHLIST
// ==========================================
app.get('/api/v1/wishlist', async (req, res) => {
  try { await connectDB(); const uid = req.query.userId || req.headers['x-user-id'] || 'guest'; const items = await Wishlist.find({ userId: uid }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean(); res.json({ success: true, data: items }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.post('/api/v1/wishlist/add', async (req, res) => {
  try { await connectDB(); const uid = req.body.userId || req.headers['x-user-id'] || 'guest'; const product = await Product.findOne({ productId: Number(req.body.productId) }, { _id: 0, __v: 0 }).lean(); if (!product) return res.status(404).json({ success: false, message: 'Product not found' }); const exists = await Wishlist.findOne({ userId: uid, productId: Number(req.body.productId) }); if (exists) return res.json({ success: true, message: 'Already in wishlist' }); await Wishlist.create({ userId: uid, productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice }); res.status(201).json({ success: true, message: 'Added to wishlist' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.post('/api/v1/wishlist/:productId', async (req, res) => {
  try { await connectDB(); const uid = req.body.userId || req.headers['x-user-id'] || 'guest'; const pid = Number(req.params.productId); const product = await Product.findOne({ productId: pid }, { _id: 0, __v: 0 }).lean(); if (!product) return res.status(404).json({ success: false, message: 'Product not found' }); const exists = await Wishlist.findOne({ userId: uid, productId: pid }); if (exists) return res.json({ success: true, message: 'Already in wishlist' }); await Wishlist.create({ userId: uid, productId: product.productId, name: product.name, thumbnail: product.thumbnail, price: product.price, salePrice: product.salePrice }); res.status(201).json({ success: true, message: 'Added to wishlist' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/wishlist/check/:productId', async (req, res) => {
  try { await connectDB(); const uid = req.query.userId || req.headers['x-user-id'] || 'guest'; const exists = await Wishlist.findOne({ userId: uid, productId: Number(req.params.productId) }); res.json({ success: true, data: { inWishlist: !!exists } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.delete('/api/v1/wishlist/remove/:productId', async (req, res) => {
  try { await connectDB(); const uid = req.query.userId || req.headers['x-user-id'] || 'guest'; await Wishlist.deleteOne({ userId: uid, productId: Number(req.params.productId) }); res.json({ success: true, message: 'Removed' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.delete('/api/v1/wishlist/:productId', async (req, res) => {
  try { await connectDB(); const uid = req.query.userId || req.headers['x-user-id'] || 'guest'; await Wishlist.deleteOne({ userId: uid, productId: Number(req.params.productId) }); res.json({ success: true, message: 'Removed' }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// USER PROFILE
// ==========================================
app.get('/api/v1/users/profile', async (req, res) => {
  try {
    await connectDB(); const db = mongoose.connection.db; const uid = req.query.userId || req.headers['x-user-id'];
    let user; const { ObjectId } = mongoose.Types;
    if (uid) { try { user = await db.collection('users').findOne({ _id: new ObjectId(uid) }); } catch (e) {} if (!user) user = await db.collection('users').findOne({ email: uid }); }
    if (!user) user = await db.collection('users').findOne({ role: 'user' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...data } = user; data.id = data._id.toString(); data.userId = data.id; delete data._id;
    if (data.shipping) { data.address = { street: data.shipping.address_1 || '', city: data.shipping.city || '', state: data.shipping.state || '', pincode: data.shipping.postcode || '', country: data.shipping.country || 'India' }; }
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.put('/api/v1/users/profile', async (req, res) => {
  try {
    await connectDB(); const db = mongoose.connection.db; const { ObjectId } = mongoose.Types;
    const uid = req.body.userId || req.headers['x-user-id']; const { name, phone, address } = req.body;
    const update = { updated_at: new Date() }; if (name) update.name = name; if (phone) update.phone = phone;
    if (address) update.shipping = { address_1: address.street || '', city: address.city || '', state: address.state || '', postcode: address.pincode || '', country: address.country || 'India' };
    let filter; try { filter = { _id: new ObjectId(uid) }; } catch (e) { filter = { email: uid }; }
    await db.collection('users').updateOne(filter, { $set: update });
    const user = await db.collection('users').findOne(filter);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...data } = user; data.id = data._id.toString(); delete data._id;
    if (data.shipping) { data.address = { street: data.shipping.address_1 || '', city: data.shipping.city || '', state: data.shipping.state || '', pincode: data.shipping.postcode || '', country: data.shipping.country || 'India' }; }
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================
app.get('/api/v1/admin/analytics/overview', async (req, res) => {
  try { await connectDB(); const [totalOrders, totalProducts, totalUsers] = await Promise.all([Order.countDocuments(), Product.countDocuments(), mongoose.connection.db.collection('users').countDocuments()]); const rev = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]); const totalRevenue = rev[0]?.total || 0; res.json({ success: true, data: { total_revenue: totalRevenue || 485999, total_orders: totalOrders || 23, total_customers: totalUsers || 156, conversion_rate: 3.2, avg_order_value: totalOrders ? Math.round(totalRevenue / totalOrders) : 21130, revenue_growth: 12.5, orders_growth: 8.3, customers_growth: 15.2 } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/admin/analytics/revenue', (req, res) => { const m = ['Jan','Feb','Mar','Apr','May','Jun']; res.json({ success: true, data: { chart: m.map((x, i) => ({ month: x, revenue: 120000 + i * 50000, orders: 5 + i * 3 })), total: 485999, growth: 12.5 } }); });
app.get('/api/v1/admin/analytics/sales', async (req, res) => {
  try { await connectDB(); const tp = await Product.find({}, { _id: 0 }).sort({ rating: -1 }).limit(5).lean(); res.json({ success: true, data: { top_products: tp.map(p => ({ id: p.productId, name: p.name, sold: Math.floor(Math.random() * 20 + 5), revenue: p.salePrice * Math.floor(Math.random() * 10 + 3) })), top_categories: [{ name: 'Silk Sarees', sold: 45, revenue: 980000 }, { name: 'Kurtas', sold: 67, revenue: 450000 }, { name: 'Lehengas', sold: 12, revenue: 720000 }] } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/admin/analytics/products', async (req, res) => {
  try { await connectDB(); const total = await Product.countDocuments(); const byCat = await Product.aggregate([{ $group: { _id: '$categoryName', count: { $sum: 1 } } }, { $project: { _id: 0, category: '$_id', count: 1 } }]); res.json({ success: true, data: { total, in_stock: total - 3, out_of_stock: 3, low_stock: 5, by_category: byCat } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/admin/warehouses', (req, res) => { res.json({ success: true, data: [{ id: 1, name: 'Mumbai Warehouse', location: 'Mumbai, MH', capacity: 5000, utilized: 3200, status: 'active' }, { id: 2, name: 'Jaipur Warehouse', location: 'Jaipur, RJ', capacity: 3000, utilized: 1800, status: 'active' }] }); });
app.get('/api/v1/admin/inventory/low-stock', async (req, res) => { try { await connectDB(); const items = await Product.find({ stock: { $lte: 10 } }, { _id: 0, productId: 1, name: 1, stock: 1, categoryName: 1, thumbnail: 1 }).limit(10).lean(); res.json({ success: true, data: items }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });
app.get('/api/v1/admin/users', async (req, res) => { try { await connectDB(); const users = await mongoose.connection.db.collection('users').find({}, { projection: { password: 0 } }).toArray(); res.json({ success: true, data: users.map(u => { const { _id, ...r } = u; return { ...r, id: _id.toString() }; }) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });
app.get('/api/v1/admin/blogs/stats', async (req, res) => {
  try { await connectDB(); const [total, published, drafts] = await Promise.all([Blog.countDocuments(), Blog.countDocuments({ status: 'published' }), Blog.countDocuments({ status: 'draft' })]); const tv = (await Blog.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]))[0]?.total || 0; res.json({ success: true, data: { total_posts: total, published, drafts, total_views: tv, total_comments: 20 } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/admin/orders', async (req, res) => {
  try { await connectDB(); const { status, page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query; const filter = {}; if (status && status !== 'all') filter.status = status; if (search) filter.$or = [{ orderId: { $regex: search, $options: 'i' } }, { userName: { $regex: search, $options: 'i' } }]; const skip = (Number(page) - 1) * Number(limit); const [orders, total] = await Promise.all([Order.find(filter, { _id: 0, __v: 0 }).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip(skip).limit(Number(limit)).lean(), Order.countDocuments(filter)]); const [t, p, c, s, d, x] = await Promise.all([Order.countDocuments(), Order.countDocuments({ status: 'pending' }), Order.countDocuments({ status: 'confirmed' }), Order.countDocuments({ status: 'shipped' }), Order.countDocuments({ status: 'delivered' }), Order.countDocuments({ status: 'cancelled' })]); const rev = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]); res.json({ success: true, data: { orders, pagination: { current_page: Number(page), total_pages: Math.ceil(total / Number(limit)), total }, stats: { total: t, pending: p, confirmed: c, shipped: s, delivered: d, cancelled: x, revenue: rev[0]?.total || 0 } } }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.patch('/api/v1/admin/orders/:orderId/status', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); const { status, note, trackingNumber, trackingUrl } = req.body; order.status = status; order.statusHistory.push({ status, timestamp: new Date(), note: note || `Status changed to ${status}` }); if (trackingNumber) { order.trackingNumber = trackingNumber; order.trackingUrl = trackingUrl || ''; } await order.save(); res.json({ success: true, data: order.toObject() }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.get('/api/v1/admin/orders/:orderId', async (req, res) => {
  try { await connectDB(); const order = await Order.findOne({ orderId: req.params.orderId }, { _id: 0, __v: 0 }).lean(); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); res.json({ success: true, data: order }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==========================================
// COUPONS
// ==========================================
const VERCEL_COUPONS = [
  { id: 1, code: 'WELCOME10', description: '10% off on your first order', type: 'percentage', value: 10, min_cart_value: 500, used_count: 45, usage_limit: 500, status: 'active', expires_at: '2026-12-31T23:59:59' },
  { id: 2, code: 'SILK20', description: '20% off on Silk products', type: 'percentage', value: 20, min_cart_value: 2000, used_count: 120, usage_limit: 300, status: 'active', expires_at: '2026-06-30T23:59:59' },
  { id: 3, code: 'FESTIVE15', description: '15% off during festive season', type: 'percentage', value: 15, min_cart_value: 1000, used_count: 89, usage_limit: 200, status: 'active', expires_at: '2026-12-31T23:59:59' },
  { id: 4, code: 'FLAT500', description: 'Flat Rs 500 off on orders above Rs 3000', type: 'flat', value: 500, min_cart_value: 3000, used_count: 33, usage_limit: 100, status: 'active', expires_at: '2026-09-30T23:59:59' },
  { id: 5, code: 'NEWUSER25', description: '25% off for new users', type: 'percentage', value: 25, min_cart_value: 800, used_count: 200, usage_limit: 1000, status: 'active', expires_at: '2026-12-31T23:59:59' },
];
app.get('/api/v1/coupons', (req, res) => { res.json({ success: true, data: { coupons: VERCEL_COUPONS } }); });
app.get('/api/v1/coupons/:id', (req, res) => { const c = VERCEL_COUPONS.find(x => x.id === parseInt(req.params.id)); if (!c) return res.status(404).json({ success: false, message: 'Not found' }); res.json({ success: true, data: c }); });
app.post('/api/v1/coupons', (req, res) => { const nc = { id: VERCEL_COUPONS.length + 1, ...req.body, usage_count: 0, status: 'active' }; VERCEL_COUPONS.push(nc); res.json({ success: true, data: nc }); });
app.put('/api/v1/coupons/:id', (req, res) => { const i = VERCEL_COUPONS.findIndex(x => x.id === parseInt(req.params.id)); if (i === -1) return res.status(404).json({ success: false, message: 'Not found' }); VERCEL_COUPONS[i] = { ...VERCEL_COUPONS[i], ...req.body }; res.json({ success: true, data: VERCEL_COUPONS[i] }); });
app.delete('/api/v1/coupons/:id', (req, res) => { const i = VERCEL_COUPONS.findIndex(x => x.id === parseInt(req.params.id)); if (i === -1) return res.status(404).json({ success: false, message: 'Not found' }); VERCEL_COUPONS.splice(i, 1); res.json({ success: true, message: 'Deleted' }); });

// ==========================================
// MISC
// ==========================================
app.post('/api/v1/coupons/validate', (req, res) => { const { code, cartTotal } = req.body; const coupons = { WELCOME10: { discount: 10, type: 'percentage', minOrder: 500 }, SILK20: { discount: 20, type: 'percentage', minOrder: 2000 }, FESTIVE15: { discount: 15, type: 'percentage', minOrder: 1000 } }; const coupon = coupons[code?.toUpperCase()]; if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon' }); if (cartTotal < coupon.minOrder) return res.status(400).json({ success: false, message: `Min order: Rs${coupon.minOrder}` }); res.json({ success: true, data: { code: code.toUpperCase(), discount: coupon.type === 'percentage' ? Math.round(cartTotal * coupon.discount / 100) : coupon.discount, type: coupon.type, value: coupon.discount } }); });
app.get('/api/v1/recommendations', async (req, res) => { try { await connectDB(); const p = await Product.find({}, { _id: 0, __v: 0 }).sort({ rating: -1 }).limit(8).lean(); res.json({ success: true, data: p.map(x => ({ ...x, id: x.productId })) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });
app.get('/api/v1/reviews/product/:productId', (req, res) => { res.json({ success: true, data: { reviews: [{ id: 1, user: 'Priya S.', rating: 5, comment: 'Beautiful fabric!', date: '2026-03-01' }, { id: 2, user: 'Anita M.', rating: 4, comment: 'Good quality.', date: '2026-02-28' }], average: 4.5, total: 2 } }); });
app.post('/api/v1/reviews', (req, res) => { res.status(201).json({ success: true, message: 'Review submitted', data: { id: Date.now(), ...req.body } }); });
app.get('/api/v1/orders/admin/shipments', (req, res) => res.json({ success: true, data: { shipments: [], total: 0 } }));
app.get('/api/v1/orders/admin/shipments/ready-to-ship', (req, res) => res.json({ success: true, data: [] }));
app.get('/api/v1/orders/admin/shipments/pending', (req, res) => res.json({ success: true, data: [] }));

// Health check
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try { await connectDB(); dbStatus = 'connected'; } catch (e) { dbStatus = e.message; }
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: dbStatus, env: { MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'missing' } });
});

// ==========================================
// DATABASE SEED ENDPOINT (one-time use)
// ==========================================
app.get('/api/v1/seed', async (req, res) => {
  try {
    await connectDB();
    const results = { products: 0, users: 0, blogs: 0 };

    // Check if already seeded
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      // Still check for kurti material products (added later)
      const kurtiCount = await Product.countDocuments({ categorySlug: 'kurti-material' });
      if (kurtiCount === 0) {
        const kurtiProducts = [
          { productId: 51, name: 'Chanderi Silk Kurti Material - Mauve Bloom', slug: 'chanderi-silk-kurti-material-mauve-bloom', description: 'Premium unstitched Chanderi silk kurti material in a beautiful mauve shade with delicate gold butti work.', price: 1899, salePrice: 1499, discount: 21, categoryName: 'Kurti Material', categorySlug: 'kurti-material', fabric: 'Chanderi', color: 'Purple', occasion: 'Festive', work: 'Butti Work', brand: 'Shri Ramya', images: ['https://images.unsplash.com/photo-1698657169271-5b569ff3234e?w=800&q=80'], thumbnail: 'https://images.unsplash.com/photo-1698657169271-5b569ff3234e?w=400&q=80', stock: 40, rating: 4.5, reviewCount: 32, tags: ['kurti-material', 'chanderi', 'unstitched'], sizes: ['2.5 Meters'], isNew: true, isFeatured: true },
          { productId: 52, name: 'Pure Cotton Block Print Kurti Material - Jaipur Rose', slug: 'pure-cotton-block-print-kurti-material-jaipur-rose', description: 'Hand block printed pure cotton kurti material from Jaipur with rose motifs.', price: 999, salePrice: 749, discount: 25, categoryName: 'Kurti Material', categorySlug: 'kurti-material', fabric: 'Cotton', color: 'Pink', occasion: 'Casual', work: 'Block Print', brand: 'Shri Ramya', images: ['https://images.unsplash.com/photo-1767590518755-0e4bd5404e1f?w=800&q=80'], thumbnail: 'https://images.unsplash.com/photo-1767590518755-0e4bd5404e1f?w=400&q=80', stock: 60, rating: 4.3, reviewCount: 58, tags: ['kurti-material', 'cotton', 'block-print'], sizes: ['2.5 Meters'], isNew: true, isTrending: true, isFeatured: true },
          { productId: 53, name: 'Embroidered Georgette Kurti Material - Royal Black', slug: 'embroidered-georgette-kurti-material-royal-black', description: 'Luxurious georgette kurti material in black with silver thread embroidery.', price: 2499, salePrice: 1999, discount: 20, categoryName: 'Kurti Material', categorySlug: 'kurti-material', fabric: 'Georgette', color: 'Black', occasion: 'Party', work: 'Embroidery', brand: 'Shri Ramya', images: ['https://images.unsplash.com/photo-1758278212585-c050f6ee5742?w=800&q=80'], thumbnail: 'https://images.unsplash.com/photo-1758278212585-c050f6ee5742?w=400&q=80', stock: 25, rating: 4.7, reviewCount: 41, tags: ['kurti-material', 'georgette', 'embroidery'], sizes: ['2.5 Meters'], isNew: true, isTrending: true },
          { productId: 54, name: 'Rayon Floral Kurti Material - Teal Garden', slug: 'rayon-floral-kurti-material-teal-garden', description: 'Soft rayon kurti material with all-over floral digital print.', price: 799, salePrice: 599, discount: 25, categoryName: 'Kurti Material', categorySlug: 'kurti-material', fabric: 'Rayon', color: 'Teal', occasion: 'Daily Wear', work: 'Digital Print', brand: 'Shri Ramya', images: ['https://images.unsplash.com/photo-1669194722837-06fbe316a1eb?w=800&q=80'], thumbnail: 'https://images.unsplash.com/photo-1669194722837-06fbe316a1eb?w=400&q=80', stock: 75, rating: 4.1, reviewCount: 92, tags: ['kurti-material', 'rayon', 'floral'], sizes: ['2.5 Meters'], isTrending: true },
          { productId: 55, name: 'Chikankari Lucknowi Kurti Material - Ivory Elegance', slug: 'chikankari-lucknowi-kurti-material-ivory-elegance', description: 'Hand-embroidered Chikankari kurti material from Lucknow on fine cotton.', price: 2999, salePrice: 2499, discount: 17, categoryName: 'Kurti Material', categorySlug: 'kurti-material', fabric: 'Cotton', color: 'White', occasion: 'Festive', work: 'Chikankari', brand: 'Shri Ramya', images: ['https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=800&q=80'], thumbnail: 'https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=400&q=80', stock: 20, rating: 4.9, reviewCount: 67, tags: ['kurti-material', 'chikankari', 'lucknow'], sizes: ['2.5 Meters'], isNew: true, isFeatured: true },
        ];
        await Product.insertMany(kurtiProducts, { ordered: false });
        return res.json({ success: true, message: 'Kurti Material products seeded', counts: { products: existingProducts + 5, blogs: await Blog.countDocuments(), users: await mongoose.connection.db.collection('users').countDocuments() } });
      }
      return res.json({ success: true, message: 'Database already seeded', counts: { products: existingProducts, blogs: await Blog.countDocuments(), users: await mongoose.connection.db.collection('users').countDocuments() } });
    }

    // Seed products
    const productData = require('../../backend_node/src/mock/productCatalog').productCatalog;
    const products = productData.map((p, i) => ({
      ...p, productId: p.id || i + 1,
      categorySlug: (p.categoryName || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: p.price || Math.round(p.salePrice * 100 / (100 - (p.discount || 1))),
      color: p.color || 'Multi', work: p.work || 'Handwoven', brand: p.brand || 'Shri Ramya',
      isFeatured: i < 8, isTrending: i >= 4 && i < 12, isNew: i >= (productData.length - 10),
    }));
    await Product.insertMany(products, { ordered: false });
    results.products = products.length;

    // Seed users
    const db = mongoose.connection.db;
    const adminHash = await bcrypt.hash('Admin@123', 8);
    const customerHash = await bcrypt.hash('Test@123', 8);
    await db.collection('users').insertMany([
      { email: 'admin@shriramya.com', password: adminHash, name: 'Admin User', phone: '+91-9876543210', role: 'admin', is_active: true, shipping: { first_name: 'Admin', city: 'Jaipur', state: 'Rajasthan', postcode: '302001', country: 'India' }, created_at: new Date() },
      { email: 'customer@test.com', password: customerHash, name: 'Test Customer', phone: '+91-9876543211', role: 'user', is_active: true, shipping: { address_1: '123 MG Road', city: 'Jaipur', state: 'Rajasthan', postcode: '302001', country: 'India' }, created_at: new Date() }
    ]);
    results.users = 2;

    // Seed blogs
    await Blog.insertMany([
      { title: 'The Art of Sanganeri Printing', slug: 'art-of-sanganeri-printing', content: '<p>Sanganeri printing is a traditional form of hand block printing from Rajasthan.</p>', excerpt: 'Discover the centuries-old craft of Sanganeri block printing.', author: { id: 'admin', name: 'Shri Ramya Team' }, categories: ['Traditional Crafts', 'Silk Sarees'], tags: ['sanganeri', 'block-printing'], status: 'published', views: 245, commentsCount: 12, publishedAt: new Date('2026-03-01') },
      { title: 'Styling Your Silk Saree for Every Occasion', slug: 'styling-silk-saree-occasions', content: '<p>A silk saree is a versatile garment for various occasions.</p>', excerpt: 'Learn how to style your silk saree.', author: { id: 'admin', name: 'Shri Ramya Team' }, categories: ['Style Guide'], tags: ['styling', 'silk-saree'], status: 'published', views: 189, commentsCount: 8, publishedAt: new Date('2026-03-10') },
      { title: 'Sustainable Fashion: The Handloom Story', slug: 'sustainable-fashion-handloom', content: '<p>Handloom weaving is sustainable textile production.</p>', excerpt: 'How handloom supports artisan communities.', author: { id: 'admin', name: 'Shri Ramya Team' }, categories: ['Sustainability', 'Handloom'], tags: ['sustainability', 'handloom'], status: 'published', views: 0, publishedAt: new Date('2026-03-15') }
    ]);
    results.blogs = 3;

    res.json({ success: true, message: 'Database seeded successfully!', data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, stack: err.stack?.split('\n').slice(0,3) });
  }
});

// 404 fallback
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// ==========================================
// EXPORT FOR VERCEL SERVERLESS
// ==========================================
module.exports = app;
