/**
 * Mock Routes for Development/Preview Environment
 * Provides mock data when MySQL is unavailable
 */

const express = require('express');
const router = express.Router();
const { 
  mockProducts, 
  mockCategories, 
  getOrCreateCart, 
  calculateCartTotals 
} = require('../mock/mockData');

// ==========================================
// Products Routes
// ==========================================

router.get('/products', (req, res) => {
  const { featured, category, limit = 20, page = 1, search } = req.query;
  
  let filtered = [...mockProducts];
  
  if (featured === 'true') {
    filtered = filtered.filter(p => p.featured);
  }
  
  if (category) {
    filtered = filtered.filter(p => 
      p.category === category || 
      p.categoryName?.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags?.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  
  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      products: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

router.get('/products/:id', (req, res) => {
  const product = mockProducts.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  res.json({ success: true, data: product });
});

router.get('/products/:id/variants/matrix', (req, res) => {
  const product = mockProducts.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  res.json({ 
    success: true, 
    data: { 
      variants: product.variants,
      colors: [...new Set(product.variants.map(v => v.attributes?.color).filter(Boolean))],
      sizes: [...new Set(product.variants.map(v => v.attributes?.size).filter(Boolean))]
    } 
  });
});

router.get('/products/:id/variants/stock', (req, res) => {
  const { color, size } = req.query;
  const product = mockProducts.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  const variant = product.variants.find(v => 
    (!color || v.attributes?.color === color) &&
    (!size || v.attributes?.size === size)
  );
  
  res.json({ 
    success: true, 
    data: variant ? { stock: variant.stock, variant } : { stock: 0, variant: null }
  });
});

router.get('/products/:id/reviews', (req, res) => {
  res.json({
    success: true,
    data: {
      reviews: [
        {
          id: 1,
          rating: 5,
          title: "Beautiful saree!",
          comment: "The quality is amazing and the color is exactly as shown. Highly recommended!",
          author: "Priya S.",
          verified: true,
          createdAt: "2025-03-01T10:00:00Z"
        },
        {
          id: 2,
          rating: 4,
          title: "Good quality",
          comment: "Nice fabric and good value for money. Delivery was quick.",
          author: "Anita M.",
          verified: true,
          createdAt: "2025-02-20T14:30:00Z"
        }
      ],
      summary: {
        average: 4.5,
        total: 2,
        distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 }
      }
    }
  });
});

// ==========================================
// Categories Routes
// ==========================================

router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: { categories: mockCategories }
  });
});

router.get('/categories/:id', (req, res) => {
  const category = mockCategories.find(c => 
    c.id === parseInt(req.params.id) || c.slug === req.params.id
  );
  
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  
  res.json({ success: true, data: category });
});

router.get('/categories/slug/:slug', (req, res) => {
  const category = mockCategories.find(c => c.slug === req.params.slug);
  
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  
  res.json({ success: true, data: category });
});

// ==========================================
// Cart Routes
// ==========================================

router.get('/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.post('/cart/add', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { productId, variantId, quantity = 1 } = req.body;
  
  const product = mockProducts.find(p => p.id === parseInt(productId));
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  const variant = product.variants.find(v => v.id === parseInt(variantId)) || product.variants[0];
  
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  const existingItem = cart.items.find(item => 
    item.productId === product.id && item.variantId === variant.id
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: Date.now(),
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      image: product.thumbnail,
      price: variant.discountPrice || variant.price,
      originalPrice: variant.price,
      quantity,
      attributes: variant.attributes
    });
  }
  
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.put('/cart/item/:id', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { quantity } = req.body;
  const itemId = parseInt(req.params.id);
  
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  const item = cart.items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }
  
  if (quantity <= 0) {
    cart.items = cart.items.filter(i => i.id !== itemId);
  } else {
    item.quantity = quantity;
  }
  
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.delete('/cart/item/:id', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const itemId = parseInt(req.params.id);
  
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  cart.items = cart.items.filter(i => i.id !== itemId);
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.delete('/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  cart.items = [];
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

// Cart coupon routes
router.post('/cart/coupon/apply', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { couponCode } = req.body;
  
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  // Mock coupon validation
  const validCoupons = {
    'WELCOME10': { code: 'WELCOME10', discountPercent: 10, description: '10% off for new customers' },
    'SILK20': { code: 'SILK20', discountPercent: 20, description: '20% off on silk sarees' },
    'FESTIVE15': { code: 'FESTIVE15', discountPercent: 15, description: '15% festive discount' }
  };
  
  const coupon = validCoupons[couponCode?.toUpperCase()];
  if (!coupon) {
    return res.status(400).json({ success: false, message: 'Invalid coupon code' });
  }
  
  cart.coupon = coupon;
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart, message: `Coupon applied: ${coupon.description}` });
});

router.delete('/cart/coupon/remove', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  
  cart.coupon = null;
  calculateCartTotals(cart);
  
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.get('/cart/coupon', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { cart } = getOrCreateCart(sessionId);
  
  res.json({ success: true, data: cart.coupon });
});

// ==========================================
// Search Routes
// ==========================================

router.get('/search', (req, res) => {
  const { q, limit = 10 } = req.query;
  
  if (!q) {
    return res.json({ success: true, data: { products: [], total: 0 } });
  }
  
  const searchLower = q.toLowerCase();
  const results = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchLower) ||
    p.description.toLowerCase().includes(searchLower) ||
    p.tags?.some(t => t.toLowerCase().includes(searchLower))
  ).slice(0, parseInt(limit));
  
  res.json({ 
    success: true, 
    data: { products: results, total: results.length }
  });
});

router.get('/search/suggestions', (req, res) => {
  const { q, limit = 5 } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }
  
  const searchLower = q.toLowerCase();
  const suggestions = mockProducts
    .filter(p => p.name.toLowerCase().includes(searchLower))
    .slice(0, parseInt(limit))
    .map(p => ({ id: p.id, name: p.name, slug: p.slug, thumbnail: p.thumbnail }));
  
  res.json({ success: true, data: suggestions });
});

// ==========================================
// Recommendations Routes
// ==========================================

router.get('/recommendations/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = mockProducts.find(p => p.id === productId);
  
  // Return related products from same category
  const related = mockProducts
    .filter(p => p.id !== productId && p.category === product?.category)
    .slice(0, 4);
  
  // If not enough, add featured products
  if (related.length < 4) {
    const featured = mockProducts
      .filter(p => p.id !== productId && p.featured && !related.find(r => r.id === p.id))
      .slice(0, 4 - related.length);
    related.push(...featured);
  }
  
  res.json({ success: true, data: { products: related } });
});

router.get('/recommendations/personal', (req, res) => {
  const recommended = mockProducts.filter(p => p.featured).slice(0, 4);
  res.json({ success: true, data: { products: recommended } });
});

// ==========================================
// Coupons Routes (Customer-facing)
// ==========================================

router.get('/coupons/validate/:code', (req, res) => {
  const validCoupons = {
    'WELCOME10': { valid: true, code: 'WELCOME10', discountPercent: 10, description: '10% off for new customers' },
    'SILK20': { valid: true, code: 'SILK20', discountPercent: 20, description: '20% off on silk sarees' },
    'FESTIVE15': { valid: true, code: 'FESTIVE15', discountPercent: 15, description: '15% festive discount' }
  };
  
  const coupon = validCoupons[req.params.code?.toUpperCase()];
  
  if (coupon) {
    res.json({ success: true, data: coupon });
  } else {
    res.json({ success: true, data: { valid: false, message: 'Invalid coupon code' } });
  }
});

module.exports = router;
