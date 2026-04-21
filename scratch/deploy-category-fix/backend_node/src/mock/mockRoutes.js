/**
 * Enhanced Mock Routes with Advanced Filtering System
 * Inspired by Libas.in - Production-Ready Category Filtering
 */

const express = require('express');
const router = express.Router();
const { productCatalog, FILTER_OPTIONS } = require('./productCatalog');
const crypto = require('crypto');

// ==========================================
// RAZORPAY SETUP (real or mock)
// ==========================================
let razorpayInstance = null;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
  try {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    console.log('[Payment] Razorpay initialized with real keys');
  } catch (e) {
    console.log('[Payment] Razorpay init failed, using mock:', e.message);
  }
} else {
  console.log('[Payment] No Razorpay keys, using mock payment flow');
}

// In-memory order store
const ordersStore = {};



// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Parse array query params (handles both comma-separated and array notation)
 */
const parseArrayParam = (param) => {
  if (!param) return [];
  if (Array.isArray(param)) return param;
  return param.split(',').map(s => s.trim()).filter(Boolean);
};

/**
 * Calculate discount percentage
 */
const calculateDiscount = (basePrice, salePrice) => {
  if (!salePrice || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
};

/**
 * Get effective price (sale price or base price)
 */
const getEffectivePrice = (product) => {
  return product.salePrice || product.basePrice;
};

/**
 * Apply filters to product catalog
 */
const applyFilters = (products, filters) => {
  let filtered = [...products];

  // Category filter
  if (filters.category) {
    const categories = parseArrayParam(filters.category);
    if (categories.length > 0) {
      filtered = filtered.filter(p => 
        categories.some(cat => 
          p.category === cat || 
          p.categoryName?.toLowerCase().includes(cat.toLowerCase()) ||
          p.categoryId === parseInt(cat)
        )
      );
    }
  }

  // Price range filter
  if (filters.price_min !== undefined || filters.price_max !== undefined) {
    const minPrice = parseFloat(filters.price_min) || 0;
    const maxPrice = parseFloat(filters.price_max) || Infinity;
    filtered = filtered.filter(p => {
      const effectivePrice = getEffectivePrice(p);
      return effectivePrice >= minPrice && effectivePrice <= maxPrice;
    });
  }

  // Size filter (multi-select)
  if (filters.size) {
    const sizes = parseArrayParam(filters.size);
    if (sizes.length > 0) {
      filtered = filtered.filter(p => 
        p.sizes?.some(s => sizes.includes(s))
      );
    }
  }

  // Color filter (multi-select)
  if (filters.color) {
    const colors = parseArrayParam(filters.color);
    if (colors.length > 0) {
      filtered = filtered.filter(p => 
        p.colors?.some(c => colors.some(fc => c.toLowerCase().includes(fc.toLowerCase())))
      );
    }
  }

  // Fabric filter (multi-select)
  if (filters.fabric) {
    const fabrics = parseArrayParam(filters.fabric);
    if (fabrics.length > 0) {
      filtered = filtered.filter(p => 
        fabrics.some(f => p.fabric?.toLowerCase() === f.toLowerCase())
      );
    }
  }

  // Occasion filter (multi-select)
  if (filters.occasion) {
    const occasions = parseArrayParam(filters.occasion);
    if (occasions.length > 0) {
      filtered = filtered.filter(p => 
        occasions.some(o => p.occasion?.toLowerCase() === o.toLowerCase())
      );
    }
  }

  // Pattern filter (multi-select)
  if (filters.pattern) {
    const patterns = parseArrayParam(filters.pattern);
    if (patterns.length > 0) {
      filtered = filtered.filter(p => 
        patterns.some(pat => p.pattern?.toLowerCase().includes(pat.toLowerCase()))
      );
    }
  }

  // Style filter (multi-select)
  if (filters.style) {
    const styles = parseArrayParam(filters.style);
    if (styles.length > 0) {
      filtered = filtered.filter(p => 
        styles.some(s => p.style?.toLowerCase() === s.toLowerCase())
      );
    }
  }

  // Neck type filter
  if (filters.neck) {
    const necks = parseArrayParam(filters.neck);
    if (necks.length > 0) {
      filtered = filtered.filter(p => 
        necks.some(n => p.neckType?.toLowerCase().includes(n.toLowerCase()))
      );
    }
  }

  // Sleeve type filter
  if (filters.sleeve) {
    const sleeves = parseArrayParam(filters.sleeve);
    if (sleeves.length > 0) {
      filtered = filtered.filter(p => 
        sleeves.some(s => p.sleeveType?.toLowerCase().includes(s.toLowerCase()))
      );
    }
  }

  // Discount filter (minimum discount percentage)
  if (filters.discount) {
    const minDiscount = parseInt(filters.discount);
    if (minDiscount > 0) {
      filtered = filtered.filter(p => (p.discount || 0) >= minDiscount);
    }
  }

  // Stock filter
  if (filters.in_stock === 'true' || filters.in_stock === true) {
    filtered = filtered.filter(p => p.stock > 0);
  }

  // Rating filter
  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    filtered = filtered.filter(p => (p.rating || 0) >= minRating);
  }

  // Search query
  if (filters.search || filters.q) {
    const query = (filters.search || filters.q).toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.tags?.some(t => t.toLowerCase().includes(query)) ||
      p.fabric?.toLowerCase().includes(query) ||
      p.occasion?.toLowerCase().includes(query) ||
      p.pattern?.toLowerCase().includes(query)
    );
  }

  // Featured filter
  if (filters.featured === 'true' || filters.featured === true) {
    filtered = filtered.filter(p => p.featured);
  }

  return filtered;
};

/**
 * Apply sorting to products
 */
const applySorting = (products, sortBy) => {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price_low':
      return sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    case 'price_high':
      return sorted.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'popularity':
      return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    case 'discount':
      return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    default:
      return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
};

/**
 * Generate filter metadata with counts
 */
const generateFilterMetadata = (products, allProducts) => {
  const metadata = {
    sizes: {},
    colors: {},
    fabrics: {},
    occasions: {},
    patterns: {},
    styles: {},
    neckTypes: {},
    sleeveTypes: {},
    priceRange: { min: Infinity, max: 0 },
    discountRanges: {},
    categories: {}
  };

  // Count from filtered products (for dynamic counts)
  products.forEach(p => {
    // Sizes
    p.sizes?.forEach(s => {
      metadata.sizes[s] = (metadata.sizes[s] || 0) + 1;
    });

    // Colors
    p.colors?.forEach(c => {
      metadata.colors[c] = (metadata.colors[c] || 0) + 1;
    });

    // Fabric
    if (p.fabric) {
      metadata.fabrics[p.fabric] = (metadata.fabrics[p.fabric] || 0) + 1;
    }

    // Occasion
    if (p.occasion) {
      metadata.occasions[p.occasion] = (metadata.occasions[p.occasion] || 0) + 1;
    }

    // Pattern
    if (p.pattern) {
      metadata.patterns[p.pattern] = (metadata.patterns[p.pattern] || 0) + 1;
    }

    // Style
    if (p.style) {
      metadata.styles[p.style] = (metadata.styles[p.style] || 0) + 1;
    }

    // Neck type
    if (p.neckType) {
      metadata.neckTypes[p.neckType] = (metadata.neckTypes[p.neckType] || 0) + 1;
    }

    // Sleeve type
    if (p.sleeveType) {
      metadata.sleeveTypes[p.sleeveType] = (metadata.sleeveTypes[p.sleeveType] || 0) + 1;
    }

    // Price range
    const price = getEffectivePrice(p);
    metadata.priceRange.min = Math.min(metadata.priceRange.min, price);
    metadata.priceRange.max = Math.max(metadata.priceRange.max, price);

    // Discount ranges
    const discount = p.discount || 0;
    if (discount >= 50) metadata.discountRanges['50+'] = (metadata.discountRanges['50+'] || 0) + 1;
    else if (discount >= 40) metadata.discountRanges['40+'] = (metadata.discountRanges['40+'] || 0) + 1;
    else if (discount >= 30) metadata.discountRanges['30+'] = (metadata.discountRanges['30+'] || 0) + 1;
    else if (discount >= 20) metadata.discountRanges['20+'] = (metadata.discountRanges['20+'] || 0) + 1;
    else if (discount >= 10) metadata.discountRanges['10+'] = (metadata.discountRanges['10+'] || 0) + 1;

    // Categories
    if (p.categoryName) {
      metadata.categories[p.categoryName] = (metadata.categories[p.categoryName] || 0) + 1;
    }
  });

  // Handle edge case
  if (metadata.priceRange.min === Infinity) {
    metadata.priceRange.min = 0;
    metadata.priceRange.max = 100000;
  }

  return metadata;
};

/**
 * Paginate results
 */
const paginate = (items, page = 1, limit = 12) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
      pages: Math.ceil(items.length / limit),
      hasNext: endIndex < items.length,
      hasPrev: page > 1
    }
  };
};

// ==========================================
// PRODUCT ROUTES
// ==========================================

/**
 * GET /api/v1/products
 * Advanced product listing with filters, sorting, and pagination
 */
router.get('/products', (req, res) => {
  const {
    page = 1,
    limit = 12,
    per_page,
    sort_by = 'popularity',
    ...filters
  } = req.query;

  const effectiveLimit = per_page || limit;

  // Apply filters
  let filtered = applyFilters(productCatalog, filters);
  
  // Apply sorting
  filtered = applySorting(filtered, sort_by);

  // Generate filter metadata
  const filterMetadata = generateFilterMetadata(filtered, productCatalog);

  // Paginate
  const { items, pagination } = paginate(filtered, page, effectiveLimit);

  // Transform products for response
  const products = items.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    category: p.category,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    thumbnail: p.thumbnail,
    images: p.images,
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    effectivePrice: getEffectivePrice(p),
    discount: p.discount,
    fabric: p.fabric,
    occasion: p.occasion,
    pattern: p.pattern,
    style: p.style,
    colors: p.colors,
    sizes: p.sizes,
    stock: p.stock,
    rating: p.rating,
    reviewCount: p.reviewCount,
    featured: p.featured,
    variants: p.variants
  }));

  res.json({
    success: true,
    data: {
      products,
      pagination,
      filters: filterMetadata,
      appliedFilters: filters,
      sortOptions: FILTER_OPTIONS.sortOptions,
      totalProducts: filtered.length
    }
  });
});

/**
 * GET /api/v1/products/filters
 * Get available filter options with counts
 */
router.get('/products/filters', (req, res) => {
  const { category, ...otherFilters } = req.query;

  // Get products filtered by category if specified
  let filtered = productCatalog;
  if (category) {
    filtered = applyFilters(productCatalog, { category });
  }

  // Apply other filters to get dynamic counts
  if (Object.keys(otherFilters).length > 0) {
    filtered = applyFilters(filtered, otherFilters);
  }

  const filterMetadata = generateFilterMetadata(filtered, productCatalog);

  res.json({
    success: true,
    data: {
      filterOptions: FILTER_OPTIONS,
      availableFilters: filterMetadata,
      totalProducts: filtered.length
    }
  });
});

/**
 * GET /api/v1/products/:id
 * Get single product details
 */
router.get('/products/:id', (req, res) => {
  const product = productCatalog.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ 
    success: true, 
    data: {
      ...product,
      effectivePrice: getEffectivePrice(product)
    }
  });
});

/**
 * GET /api/v1/products/:id/variants/matrix
 */
router.get('/products/:id/variants/matrix', (req, res) => {
  const product = productCatalog.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const colors = [...new Set(product.variants?.map(v => v.attributes?.color || v.color).filter(Boolean))];
  const sizes = [...new Set(product.variants?.map(v => v.attributes?.size || v.size).filter(Boolean))];

  res.json({
    success: true,
    data: {
      variants: product.variants || [],
      colors,
      sizes
    }
  });
});

/**
 * GET /api/v1/products/:id/variants/stock
 */
router.get('/products/:id/variants/stock', (req, res) => {
  const { color, size } = req.query;
  const product = productCatalog.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const variant = product.variants?.find(v => 
    (!color || v.attributes?.color === color || v.color === color) &&
    (!size || v.attributes?.size === size || v.size === size)
  );

  res.json({
    success: true,
    data: variant ? { stock: variant.stock, variant, isOutOfStock: variant.stock <= 0 } : { stock: 0, variant: null, isOutOfStock: true }
  });
});

/**
 * GET /api/v1/products/:id/reviews
 */
router.get('/products/:id/reviews', (req, res) => {
  const product = productCatalog.find(p => p.id === parseInt(req.params.id));
  
  // Generate mock reviews
  const reviews = [
    {
      id: 1,
      rating: 5,
      title: "Absolutely beautiful!",
      comment: "The quality exceeded my expectations. The fabric feels premium and the colors are exactly as shown.",
      author: "Priya S.",
      verified: true,
      createdAt: "2025-03-01T10:00:00Z"
    },
    {
      id: 2,
      rating: 4,
      title: "Good quality, fast delivery",
      comment: "Nice product. Delivery was quick and packaging was good.",
      author: "Anita M.",
      verified: true,
      createdAt: "2025-02-20T14:30:00Z"
    },
    {
      id: 3,
      rating: 5,
      title: "Perfect for the occasion",
      comment: "Wore this for a family function and received so many compliments!",
      author: "Neha K.",
      verified: true,
      createdAt: "2025-02-15T09:00:00Z"
    }
  ];

  res.json({
    success: true,
    data: {
      reviews,
      summary: {
        average: product?.rating || 4.5,
        total: product?.reviewCount || reviews.length,
        distribution: { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 }
      }
    }
  });
});

// ==========================================
// CATEGORY ROUTES
// ==========================================

/**
 * GET /api/v1/categories
 */
router.get('/categories', (req, res) => {
  const categories = FILTER_OPTIONS.categories.map(cat => {
    const productCount = productCatalog.filter(p => p.categoryId === cat.id).length;
    return {
      ...cat,
      productCount,
      image: cat.image || `https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=400`
    };
  });

  res.json({
    success: true,
    data: { categories }
  });
});

/**
 * GET /api/v1/categories/:id
 */
router.get('/categories/:id', (req, res) => {
  const category = FILTER_OPTIONS.categories.find(c => 
    c.id === parseInt(req.params.id) || c.slug === req.params.id
  );

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const productCount = productCatalog.filter(p => p.categoryId === category.id).length;

  res.json({
    success: true,
    data: {
      ...category,
      productCount,
      image: category.image || `https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=800`,
      description: `Explore our beautiful collection of ${category.name}. Premium quality with traditional craftsmanship.`
    }
  });
});

/**
 * GET /api/v1/categories/slug/:slug
 */
router.get('/categories/slug/:slug', (req, res) => {
  const category = FILTER_OPTIONS.categories.find(c => c.slug === req.params.slug);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const productCount = productCatalog.filter(p => p.categoryId === category.id).length;

  res.json({
    success: true,
    data: {
      ...category,
      productCount,
      image: category.image || `https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=800`,
      description: `Explore our beautiful collection of ${category.name}. Premium quality with traditional craftsmanship.`
    }
  });
});

// ==========================================
// SEARCH ROUTES
// ==========================================

/**
 * GET /api/v1/search
 */
router.get('/search', (req, res) => {
  const { q, limit = 20, page = 1 } = req.query;

  if (!q) {
    return res.json({ success: true, data: { products: [], total: 0 } });
  }

  const filtered = applyFilters(productCatalog, { search: q });
  const { items, pagination } = paginate(filtered, page, limit);

  res.json({
    success: true,
    data: {
      products: items,
      pagination,
      total: filtered.length,
      query: q
    }
  });
});

/**
 * GET /api/v1/search/suggestions
 */
router.get('/search/suggestions', (req, res) => {
  const { q, limit = 5 } = req.query;

  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const searchLower = q.toLowerCase();
  const suggestions = productCatalog
    .filter(p => p.name.toLowerCase().includes(searchLower))
    .slice(0, parseInt(limit))
    .map(p => ({ id: p.id, name: p.name, slug: p.slug, thumbnail: p.thumbnail }));

  res.json({ success: true, data: suggestions });
});

/**
 * GET /api/v1/search/filters
 */
router.get('/search/filters', (req, res) => {
  res.json({
    success: true,
    data: {
      filterOptions: FILTER_OPTIONS
    }
  });
});

// ==========================================
// RECOMMENDATIONS ROUTES
// ==========================================

/**
 * GET /api/v1/recommendations/:id
 */
router.get('/recommendations/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = productCatalog.find(p => p.id === productId);

  let related = productCatalog
    .filter(p => p.id !== productId && p.category === product?.category)
    .slice(0, 4);

  if (related.length < 4) {
    const featured = productCatalog
      .filter(p => p.id !== productId && p.featured && !related.find(r => r.id === p.id))
      .slice(0, 4 - related.length);
    related.push(...featured);
  }

  res.json({ success: true, data: { products: related } });
});

/**
 * GET /api/v1/recommendations/personal
 */
router.get('/recommendations/personal', (req, res) => {
  const recommended = productCatalog.filter(p => p.featured).slice(0, 8);
  res.json({ success: true, data: { products: recommended } });
});

// ==========================================
// CART ROUTES (Keep existing implementation)
// ==========================================

const carts = new Map();

const getOrCreateCart = (sessionId) => {
  if (!sessionId) {
    sessionId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  if (!carts.has(sessionId)) {
    carts.set(sessionId, {
      id: sessionId,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      coupon: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return { cart: carts.get(sessionId), sessionId };
};

const calculateCartTotals = (cart) => {
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cart.discount = cart.coupon ? Math.round(cart.subtotal * (cart.coupon.discountPercent / 100)) : 0;
  cart.total = cart.subtotal - cart.discount;
  cart.updatedAt = new Date().toISOString();
  return cart;
};

router.get('/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);
  res.setHeader('x-session-id', newSessionId);
  res.json({ success: true, data: cart });
});

router.post('/cart/add', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { productId, variantId, quantity = 1, color, size } = req.body;

  const product = productCatalog.find(p => p.id === parseInt(productId));
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  let variant = null;
  if (variantId) {
    variant = product.variants?.find(v => v.id === parseInt(variantId));
  } else if (color || size) {
    variant = product.variants?.find(v =>
      (!color || v.attributes?.color === color) &&
      (!size || v.attributes?.size === size)
    );
  }

  if (!variant && product.variants?.length > 0) {
    variant = product.variants[0];
  }

  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);

  const itemPrice = variant ? (variant.discountPrice || variant.price) : (product.salePrice || product.basePrice);
  const itemOriginalPrice = variant ? variant.price : product.basePrice;
  const itemAttributes = variant?.attributes || {};

  const existingItem = cart.items.find(item =>
    item.productId === product.id &&
    (variant ? item.variantId === variant.id : !item.variantId)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: Date.now(),
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      image: product.thumbnail,
      price: itemPrice,
      originalPrice: itemOriginalPrice,
      quantity,
      attributes: itemAttributes
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

// Coupon routes
router.post('/cart/coupon/apply', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { couponCode } = req.body;

  const { cart, sessionId: newSessionId } = getOrCreateCart(sessionId);

  const validCoupons = {
    'WELCOME10': { code: 'WELCOME10', discountPercent: 10, description: '10% off for new customers' },
    'SILK20': { code: 'SILK20', discountPercent: 20, description: '20% off on silk sarees' },
    'FESTIVE15': { code: 'FESTIVE15', discountPercent: 15, description: '15% festive discount' },
    'FIRST25': { code: 'FIRST25', discountPercent: 25, description: '25% off on first order' }
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
// AUTH ROUTES (Mock)
// ==========================================

const mockUsers = {
  'admin@shriramya.com': {
    id: 'admin_001',
    email: 'admin@shriramya.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'shriramya',
    permissions: ['all'],
    isActive: true
  },
  'customer@test.com': {
    id: 'customer_001',
    email: 'customer@test.com',
    password: 'Test@123',
    name: 'Test Customer',
    role: 'customer',
    tenantId: 'shriramya',
    permissions: ['read', 'order'],
    isActive: true
  }
};

const generateMockToken = (user) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roles: [user.role],
    permissions: user.permissions || [],
    tenant_id: user.tenantId,
    tenantId: user.tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  const encodedSignature = Buffer.from('mock_signature_' + Date.now()).toString('base64').replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers[email?.toLowerCase()];

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }

  const token = generateMockToken(user);
  const refreshToken = generateMockToken({ ...user, type: 'refresh' });
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      access_token: token,
      refresh_token: refreshToken,
      tokens: {
        access: { token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
        refresh: { token: refreshToken, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
      }
    }
  });
});

router.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const user = Object.values(mockUsers).find(u => u.id === payload.sub || u.id === payload.user_id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ success: true, data: userWithoutPassword });
      }
    }
  } catch (e) {}
  res.status(401).json({ success: false, message: 'Invalid token' });
});

// Register
router.post('/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  if (mockUsers[email.toLowerCase()]) {
    return res.status(409).json({ success: false, message: 'User already exists with this email' });
  }

  const newUser = {
    id: 'customer_' + Date.now(),
    email: email.toLowerCase(),
    password,
    name,
    phone: phone || '',
    role: 'customer',
    tenantId: 'shriramya',
    permissions: ['read', 'order'],
    isActive: true
  };
  mockUsers[email.toLowerCase()] = newUser;

  const token = generateMockToken(newUser);
  const refreshToken = generateMockToken({ ...newUser, type: 'refresh' });
  const { password: _, ...userWithoutPassword } = newUser;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      access_token: token,
      refresh_token: refreshToken,
      tokens: {
        access: { token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
        refresh: { token: refreshToken, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
      }
    }
  });
});

router.get('/auth/check-admin', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, data: { isAdmin: false, is_admin: false } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const isAdmin = payload.role === 'admin' || payload.roles?.includes('admin');
      return res.json({
        success: true,
        data: { isAdmin, is_admin: isAdmin, role: payload.role }
      });
    }
  } catch (e) {}
  res.status(401).json({ success: false, data: { isAdmin: false, is_admin: false } });
});

// ==========================================
// BLOG / JOURNAL ENDPOINTS
// ==========================================
const blogPostsStore = [
  {
    id: 'blog_1',
    title: 'The Art of Sanganeri Printing',
    slug: 'art-of-sanganeri-printing',
    content: '<p>Sanganeri printing is a traditional form of hand block printing that originated in the town of Sanganer, near Jaipur, Rajasthan. This centuries-old craft combines intricate floral and geometric patterns with natural dyes to create stunning textile designs.</p><p>The artisans use hand-carved wooden blocks dipped in natural dyes to stamp patterns onto fabric. Each block is a work of art in itself, carved with remarkable precision.</p>',
    excerpt: 'Discover the centuries-old craft of Sanganeri block printing and how it transforms silk sarees into wearable masterpieces.',
    author: { id: 'admin_001', name: 'Shri Ramya Team' },
    categories: ['Traditional Crafts', 'Silk Sarees'],
    tags: ['sanganeri', 'block-print', 'handcraft', 'rajasthan'],
    status: 'published',
    featured_image: 'https://images.pexels.com/photos/9419251/pexels-photo-9419251.jpeg?auto=compress&cs=tinysrgb&w=800',
    views: 245,
    comments_count: 3,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    publishedAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'blog_2',
    title: 'How to Style a Banarasi Saree for Every Occasion',
    slug: 'style-banarasi-saree-every-occasion',
    content: '<p>A Banarasi saree is the epitome of Indian elegance. Whether you are attending a wedding, a festive celebration, or a formal event, a Banarasi saree can be styled to suit any occasion.</p><p>For weddings, pair your Banarasi with heavy gold jewellery and a classic bun adorned with flowers. For formal events, go minimal with pearl earrings and a sleek updo.</p>',
    excerpt: 'Learn how to style your Banarasi saree for weddings, festivals, and everyday elegance.',
    author: { id: 'admin_001', name: 'Shri Ramya Team' },
    categories: ['Style Guide', 'Silk Sarees'],
    tags: ['banarasi', 'styling', 'fashion-tips'],
    status: 'published',
    featured_image: 'https://images.unsplash.com/photo-1616586169180-2671c5e1cbdc?w=800&q=80',
    views: 189,
    comments_count: 5,
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
    publishedAt: '2026-03-10T12:00:00.000Z'
  },
  {
    id: 'blog_3',
    title: 'Sustainable Fashion: Why Handloom Matters',
    slug: 'sustainable-fashion-handloom-matters',
    content: '<p>In an era of fast fashion, handloom weaving stands as a beacon of sustainable textile production. Each handloom piece is crafted with minimal environmental impact, using traditional techniques passed down through generations.</p>',
    excerpt: 'Explore why handloom weaving is the future of sustainable fashion and how your choices make a difference.',
    author: { id: 'admin_001', name: 'Shri Ramya Team' },
    categories: ['Sustainability', 'Handloom'],
    tags: ['handloom', 'sustainable', 'eco-fashion'],
    status: 'draft',
    featured_image: 'https://images.unsplash.com/photo-1771507056872-bcb9eeba5946?w=800&q=80',
    views: 0,
    comments_count: 0,
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
    publishedAt: null
  }
];

const blogCategories = ['Traditional Crafts', 'Style Guide', 'Silk Sarees', 'Sustainability', 'Handloom', 'Fashion Tips', 'Behind the Scenes'];

// GET blogs
router.get('/blogs', (req, res) => {
  let filtered = [...blogPostsStore];
  const { status, search, page = 1, per_page = 10, category } = req.query;

  if (status && status !== 'all') filtered = filtered.filter(p => p.status === status);
  if (search) filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  if (category) filtered = filtered.filter(p => p.categories.includes(category));

  const total = filtered.length;
  const start = (page - 1) * per_page;
  const posts = filtered.slice(start, start + parseInt(per_page));

  res.json({
    success: true,
    data: {
      posts,
      pagination: { current_page: parseInt(page), total_pages: Math.ceil(total / per_page), total }
    }
  });
});

// GET blog categories — MUST come before /blogs/:id
router.get('/blogs/categories', (req, res) => {
  res.json({ success: true, data: blogCategories });
});

// GET blog tags — MUST come before /blogs/:id
router.get('/blogs/tags', (req, res) => {
  const allTags = [...new Set(blogPostsStore.flatMap(p => p.tags || []))];
  res.json({ success: true, data: allTags });
});

// GET blog analytics — MUST come before /blogs/:id
router.get('/blogs/admin/analytics', (req, res) => {
  const published = blogPostsStore.filter(p => p.status === 'published').length;
  const drafts = blogPostsStore.filter(p => p.status === 'draft').length;
  const totalViews = blogPostsStore.reduce((s, p) => s + (p.views || 0), 0);
  const totalComments = blogPostsStore.reduce((s, p) => s + (p.comments_count || 0), 0);
  res.json({
    success: true,
    data: { total_posts: blogPostsStore.length, published, drafts, total_views: totalViews, total_comments: totalComments }
  });
});

// GET blog capabilities — MUST come before /blogs/:id
router.get('/blogs/capabilities', (req, res) => {
  res.json({
    success: true,
    data: { edit_posts: true, delete_posts: true, publish_posts: true, manage_categories: true }
  });
});

// GET blog by slug — MUST come before /blogs/:id
router.get('/blogs/slug/:slug', (req, res) => {
  const post = blogPostsStore.find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, data: post });
});

// GET blog by ID — AFTER all specific /blogs/* routes
router.get('/blogs/:id', (req, res) => {
  const post = blogPostsStore.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, data: post });
});

// POST create blog
router.post('/blogs', (req, res) => {
  const { title, content, excerpt, status, slug, tags, categories, featured_image, seo_title, seo_description } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

  const newPost = {
    id: 'blog_' + Date.now(),
    title,
    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    content: content || '',
    excerpt: excerpt || '',
    author: { id: 'admin_001', name: 'Admin' },
    categories: categories || [],
    tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
    status: status || 'draft',
    featured_image: featured_image || null,
    seo_title: seo_title || '',
    seo_description: seo_description || '',
    views: 0,
    comments_count: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: status === 'published' ? new Date().toISOString() : null
  };

  blogPostsStore.push(newPost);
  res.json({ success: true, data: newPost, message: 'Blog post created successfully' });
});

// PUT update blog
router.put('/blogs/:id', (req, res) => {
  const idx = blogPostsStore.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Post not found' });

  blogPostsStore[idx] = { ...blogPostsStore[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: blogPostsStore[idx] });
});

// POST publish blog
router.post('/blogs/:id/publish', (req, res) => {
  const post = blogPostsStore.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  post.updatedAt = new Date().toISOString();
  res.json({ success: true, data: post });
});

// POST archive blog
router.post('/blogs/:id/archive', (req, res) => {
  const post = blogPostsStore.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  post.status = 'archived';
  post.updatedAt = new Date().toISOString();
  res.json({ success: true, data: post });
});

// DELETE blog
router.delete('/blogs/:id', (req, res) => {
  const idx = blogPostsStore.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Post not found' });
  blogPostsStore.splice(idx, 1);
  res.json({ success: true, message: 'Blog post deleted successfully' });
});

// GET related blogs
router.get('/blogs/:id/related', (req, res) => {
  const post = blogPostsStore.find(p => p.id === req.params.id);
  const related = blogPostsStore.filter(p => p.id !== req.params.id && p.status === 'published').slice(0, 3);
  res.json({ success: true, data: related });
});

// GET blog comments
router.get('/blogs/:id/comments', (req, res) => {
  res.json({ success: true, data: [] });
});

// POST blog comment
router.post('/blogs/:id/comment', (req, res) => {
  res.json({ success: true, data: { id: 'comment_' + Date.now(), ...req.body, createdAt: new Date().toISOString() } });
});

// ==========================================
// ANALYTICS ENDPOINTS (Admin)
// Both /analytics/* and /admin/analytics/* paths supported
// ==========================================
router.get('/admin/analytics/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      total_revenue: 485999,
      total_orders: 23,
      total_customers: 156,
      conversion_rate: 3.2,
      avg_order_value: 21130,
      revenue_growth: 12.5,
      orders_growth: 8.3,
      customers_growth: 15.2
    }
  });
});

router.get('/admin/analytics/revenue', (req, res) => {
  const months = ['Jan', 'Feb', 'Mar'];
  res.json({
    success: true,
    data: {
      chart: months.map((m, i) => ({ month: m, revenue: 120000 + i * 50000, orders: 5 + i * 3 })),
      total: 485999,
      growth: 12.5
    }
  });
});

router.get('/admin/analytics/sales', (req, res) => {
  res.json({
    success: true,
    data: {
      top_products: productCatalog.slice(0, 5).map(p => ({ id: p.id, name: p.name, sold: Math.floor(Math.random() * 20 + 5), revenue: p.salePrice * Math.floor(Math.random() * 10 + 3) })),
      top_categories: [{ name: 'Silk Sarees', sold: 45, revenue: 980000 }, { name: 'Kurtas', sold: 67, revenue: 450000 }, { name: 'Lehengas', sold: 12, revenue: 720000 }]
    }
  });
});

router.get('/admin/analytics/products', (req, res) => {
  res.json({
    success: true,
    data: {
      total: productCatalog.length,
      in_stock: productCatalog.length - 3,
      out_of_stock: 3,
      low_stock: 5,
      by_category: [
        { category: 'Silk Sarees', count: 4 }, { category: 'Cotton Sarees', count: 4 },
        { category: 'Kurtas', count: 20 }, { category: 'Lehengas', count: 5 },
        { category: 'Suits', count: 5 }, { category: 'Ethnic Dresses', count: 5 }
      ]
    }
  });
});

// Admin warehouse & inventory
router.get('/admin/warehouses', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Mumbai Warehouse', location: 'Mumbai, MH', capacity: 5000, utilized: 3200, status: 'active' },
      { id: 2, name: 'Jaipur Warehouse', location: 'Jaipur, RJ', capacity: 3000, utilized: 1800, status: 'active' }
    ]
  });
});

router.get('/admin/inventory/low-stock', (req, res) => {
  const lowStock = productCatalog.filter(p => p.stock <= 10).slice(0, 10).map(p => ({
    id: p.id, name: p.name, stock: p.stock, category: p.categoryName, thumbnail: p.thumbnail
  }));
  res.json({ success: true, data: lowStock });
});

// Legacy non-prefixed analytics routes (keep for backward compatibility)
router.get('/analytics/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      total_revenue: 485999,
      total_orders: 23,
      total_customers: 156,
      conversion_rate: 3.2,
      avg_order_value: 21130,
      revenue_growth: 12.5,
      orders_growth: 8.3,
      customers_growth: 15.2
    }
  });
});

router.get('/analytics/revenue', (req, res) => {
  const months = ['Jan', 'Feb', 'Mar'];
  res.json({
    success: true,
    data: {
      chart: months.map((m, i) => ({ month: m, revenue: 120000 + i * 50000, orders: 5 + i * 3 })),
      total: 485999,
      growth: 12.5
    }
  });
});

router.get('/analytics/sales', (req, res) => {
  res.json({
    success: true,
    data: {
      top_products: productCatalog.slice(0, 5).map(p => ({ id: p.id, name: p.name, sold: Math.floor(Math.random() * 20 + 5), revenue: p.salePrice * Math.floor(Math.random() * 10 + 3) })),
      top_categories: [{ name: 'Silk Sarees', sold: 45, revenue: 980000 }, { name: 'Kurtas', sold: 67, revenue: 450000 }, { name: 'Lehengas', sold: 12, revenue: 720000 }]
    }
  });
});

router.get('/analytics/products', (req, res) => {
  res.json({
    success: true,
    data: {
      total: productCatalog.length,
      in_stock: productCatalog.length - 3,
      out_of_stock: 3,
      low_stock: 5,
      by_category: [
        { category: 'Silk Sarees', count: 4 }, { category: 'Cotton Sarees', count: 4 },
        { category: 'Kurtas', count: 20 }, { category: 'Lehengas', count: 5 },
        { category: 'Suits', count: 5 }, { category: 'Ethnic Dresses', count: 5 }
      ]
    }
  });
});

// ==========================================
// USER MANAGEMENT (Admin)
// ==========================================
router.get('/users', (req, res) => {
  const users = Object.values(mockUsers).map(u => {
    const { password, ...user } = u;
    return { ...user, createdAt: '2026-01-15T10:00:00.000Z', orders_count: Math.floor(Math.random() * 5) };
  });
  res.json({ success: true, data: users });
});

// ==========================================
// ORDER STATUS UPDATE (Admin)
// ==========================================
router.put('/orders/:id/status', (req, res) => {
  const order = ordersStore[req.params.id];
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = req.body.status || order.status;
  order.updatedAt = new Date().toISOString();
  res.json({ success: true, data: order });
});

router.patch('/orders/admin/:id/status', (req, res) => {
  const order = ordersStore[req.params.id];
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = req.body.status || order.status;
  order.updatedAt = new Date().toISOString();
  res.json({ success: true, data: order });
});

// Admin shipment stubs
router.get('/orders/admin/shipments', (req, res) => {
  res.json({ success: true, data: { shipments: [], total: 0 } });
});
router.get('/orders/admin/shipments/ready-to-ship', (req, res) => {
  res.json({ success: true, data: [] });
});
router.get('/orders/admin/shipments/pending', (req, res) => {
  res.json({ success: true, data: [] });
});

// ==========================================
// UPLOAD ENDPOINT (for blog images)
// ==========================================
router.post('/upload/image', (req, res) => {
  res.json({
    success: true,
    data: {
      url: 'https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=800',
      original: 'https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=1200',
      medium: 'https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=800',
      thumbnail: 'https://images.pexels.com/photos/35212993/pexels-photo-35212993.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  });
});

// ==========================================
// ORDER & PAYMENT ENDPOINTS
// ==========================================

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { items, shipping_address, email, amount, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orderId = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const totalAmount = amount || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const amountInPaise = Math.round(totalAmount * 100);

    let razorpayOrderId = null;

    if (razorpayInstance) {
      // Real Razorpay order
      const rzOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId.substring(0, 40),
        payment_capture: 1
      });
      razorpayOrderId = rzOrder.id;
    } else {
      // Mock Razorpay order
      razorpayOrderId = 'order_mock_' + Date.now();
    }

    const order = {
      id: orderId,
      razorpay_order_id: razorpayOrderId,
      items,
      shipping_address,
      email,
      couponCode,
      amount: amountInPaise,
      amountDisplay: totalAmount,
      currency: 'INR',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ordersStore[orderId] = order;

    res.json({
      success: true,
      data: {
        order_id: orderId,
        razorpay_order_id: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        razorpay_key_id: RAZORPAY_KEY_ID || 'rzp_test_mock'
      }
    });
  } catch (error) {
    console.error('[Orders] Create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Confirm payment
router.post('/orders/:orderId/payment', (req, res) => {
  const { orderId } = req.params;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const order = ordersStore[orderId];
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Verify signature if real Razorpay
  if (razorpayInstance && RAZORPAY_KEY_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      order.status = 'payment_failed';
      order.updatedAt = new Date().toISOString();
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  }

  order.status = 'paid';
  order.payment = {
    razorpay_payment_id: razorpay_payment_id || 'pay_mock_' + Date.now(),
    razorpay_order_id,
    razorpay_signature,
    paidAt: new Date().toISOString()
  };
  order.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    data: {
      order_id: orderId,
      status: 'paid',
      payment_id: order.payment.razorpay_payment_id,
      message: 'Payment confirmed successfully'
    }
  });
});

// Get user orders
router.get('/orders/my', (req, res) => {
  const orders = Object.values(ordersStore)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: orders });
});

// Get all orders (admin)
router.get('/orders/admin/all', (req, res) => {
  const orders = Object.values(ordersStore)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: { orders, total: orders.length } });
});

// Get single order
router.get('/orders/:id', (req, res) => {
  const order = ordersStore[req.params.id];
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// Order tracking
router.get('/orders/:orderNumber/tracking', (req, res) => {
  const order = ordersStore[req.params.orderNumber];
  res.json({
    success: true,
    data: {
      order_id: req.params.orderNumber,
      status: order?.status || 'processing',
      tracking: [
        { status: 'Order Placed', date: order?.createdAt || new Date().toISOString(), completed: true },
        { status: 'Payment Confirmed', date: order?.payment?.paidAt || null, completed: order?.status === 'paid' },
        { status: 'Shipped', date: null, completed: false },
        { status: 'Delivered', date: null, completed: false }
      ]
    }
  });
});

// Cancel order
router.post('/orders/my/:id/cancel', (req, res) => {
  const order = ordersStore[req.params.id];
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  order.status = 'cancelled';
  order.updatedAt = new Date().toISOString();
  res.json({ success: true, data: { message: 'Order cancelled', order_id: req.params.id } });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    razorpay: razorpayInstance ? 'connected' : 'mock',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

module.exports = router;
