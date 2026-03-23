/**
 * Mock Data for Development/Preview Environment
 * Used when MySQL database is not available
 */

// Mock admin user for testing
const mockUsers = {
  'admin@shriramya.com': {
    id: 'admin_001',
    email: 'admin@shriramya.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'shriramya',
    permissions: ['all'],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z'
  },
  'customer@test.com': {
    id: 'customer_001',
    email: 'customer@test.com',
    password: 'Test@123',
    name: 'Test Customer',
    role: 'customer',
    tenantId: 'shriramya',
    permissions: ['read', 'order'],
    isActive: true,
    createdAt: '2025-02-01T00:00:00Z'
  }
};

// Simple JWT-like token generator for mock purposes
// Format: header.payload.signature (base64 encoded)
const generateMockToken = (user) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    sub: user.id,
    user_id: user.id,  // Frontend expects this
    email: user.email,
    name: user.name,
    role: user.role,
    roles: [user.role],  // Frontend expects array
    permissions: user.permissions || [],
    tenant_id: user.tenantId,
    tenantId: user.tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) // 24 hours
  };
  
  // Create JWT-like token (header.payload.signature)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  const signature = 'mock_signature_' + Date.now();
  const encodedSignature = Buffer.from(signature).toString('base64').replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

const mockProducts = [
  {
    id: 1,
    name: "Banarasi Silk Saree - Royal Blue",
    slug: "banarasi-silk-saree-royal-blue",
    description: "Exquisite handwoven Banarasi silk saree with intricate gold zari work. Perfect for weddings and special occasions.",
    shortDescription: "Handwoven Banarasi silk with gold zari",
    status: "published",
    featured: true,
    category: "silk-sarees",
    categoryId: 1,
    categoryName: "Silk Sarees",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
    // Product with multiple colors only (no size variants - sarees are one-size)
    variants: [
      {
        id: 1,
        sku: "BAN-SILK-RB-001",
        price: 25999,
        discountPrice: 22999,
        stock: 15,
        attributes: { color: "Royal Blue" },
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"
      },
      {
        id: 11,
        sku: "BAN-SILK-MR-001",
        price: 25999,
        discountPrice: 22999,
        stock: 10,
        attributes: { color: "Maroon" },
        image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
      },
      {
        id: 12,
        sku: "BAN-SILK-GD-001",
        price: 27999,
        discountPrice: 24999,
        stock: 8,
        attributes: { color: "Gold" },
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"
      }
    ],
    basePrice: 25999,
    effectivePrice: 22999,
    totalStock: 33,
    rating: 4.8,
    reviewCount: 124,
    tags: ["wedding", "silk", "banarasi", "premium"],
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-03-20T14:30:00Z"
  },
  {
    id: 2,
    name: "Kanjivaram Silk Saree - Magenta",
    slug: "kanjivaram-silk-saree-magenta",
    description: "Traditional Kanjivaram silk saree from Tamil Nadu with temple border design and contrast pallu.",
    shortDescription: "Pure Kanjivaram silk with temple border",
    status: "published",
    featured: true,
    category: "silk-sarees",
    categoryId: 1,
    categoryName: "Silk Sarees",
    images: [
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400",
    // Product with NO variants - single SKU
    variants: [
      {
        id: 2,
        sku: "KAN-SILK-MG-001",
        price: 35999,
        discountPrice: 31999,
        stock: 8,
        attributes: {},
        image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
      }
    ],
    basePrice: 35999,
    effectivePrice: 31999,
    totalStock: 8,
    rating: 4.9,
    reviewCount: 89,
    tags: ["wedding", "silk", "kanjivaram", "traditional"],
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-03-18T11:00:00Z"
  },
  {
    id: 3,
    name: "Chanderi Cotton Saree - Mint Green",
    slug: "chanderi-cotton-saree-mint-green",
    description: "Lightweight Chanderi cotton saree with delicate butis and golden border. Ideal for summer occasions.",
    shortDescription: "Light Chanderi cotton with golden border",
    status: "published",
    featured: true,
    category: "cotton-sarees",
    categoryId: 2,
    categoryName: "Cotton Sarees",
    images: [
      "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400",
    variants: [
      {
        id: 3,
        sku: "CHN-COT-MG-001",
        price: 8999,
        discountPrice: 7499,
        stock: 25,
        attributes: { color: "Mint Green", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
      }
    ],
    basePrice: 8999,
    effectivePrice: 7499,
    totalStock: 25,
    rating: 4.6,
    reviewCount: 156,
    tags: ["casual", "cotton", "chanderi", "summer"],
    createdAt: "2025-02-01T10:00:00Z",
    updatedAt: "2025-03-15T09:00:00Z"
  },
  {
    id: 4,
    name: "Pochampally Ikat Saree - Coral",
    slug: "pochampally-ikat-saree-coral",
    description: "Beautiful Pochampally Ikat saree with geometric patterns. Handwoven by skilled artisans of Telangana.",
    shortDescription: "Handwoven Pochampally with Ikat patterns",
    status: "published",
    featured: true,
    category: "handloom-sarees",
    categoryId: 3,
    categoryName: "Handloom Sarees",
    images: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400",
    variants: [
      {
        id: 4,
        sku: "POC-IKAT-CR-001",
        price: 12999,
        discountPrice: 10999,
        stock: 12,
        attributes: { color: "Coral", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800"
      }
    ],
    basePrice: 12999,
    effectivePrice: 10999,
    totalStock: 12,
    rating: 4.7,
    reviewCount: 78,
    tags: ["handloom", "ikat", "pochampally", "artisan"],
    createdAt: "2025-02-10T10:00:00Z",
    updatedAt: "2025-03-10T16:00:00Z"
  },
  {
    id: 5,
    name: "Mysore Silk Saree - Gold",
    slug: "mysore-silk-saree-gold",
    description: "Elegant Mysore silk saree with pure gold zari. A timeless piece for festive celebrations.",
    shortDescription: "Pure Mysore silk with gold zari",
    status: "published",
    featured: false,
    category: "silk-sarees",
    categoryId: 1,
    categoryName: "Silk Sarees",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
    variants: [
      {
        id: 5,
        sku: "MYS-SILK-GD-001",
        price: 18999,
        discountPrice: null,
        stock: 20,
        attributes: { color: "Gold", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"
      }
    ],
    basePrice: 18999,
    effectivePrice: 18999,
    totalStock: 20,
    rating: 4.5,
    reviewCount: 45,
    tags: ["festive", "silk", "mysore", "gold"],
    createdAt: "2025-02-15T10:00:00Z",
    updatedAt: "2025-03-05T12:00:00Z"
  },
  {
    id: 6,
    name: "Jamdani Cotton Saree - White",
    slug: "jamdani-cotton-saree-white",
    description: "Authentic Bengali Jamdani with intricate motifs woven on fine cotton muslin.",
    shortDescription: "Fine Jamdani muslin with traditional motifs",
    status: "published",
    featured: false,
    category: "cotton-sarees",
    categoryId: 2,
    categoryName: "Cotton Sarees",
    images: [
      "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400",
    variants: [
      {
        id: 6,
        sku: "JAM-COT-WH-001",
        price: 15999,
        discountPrice: 13999,
        stock: 10,
        attributes: { color: "White", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
      }
    ],
    basePrice: 15999,
    effectivePrice: 13999,
    totalStock: 10,
    rating: 4.8,
    reviewCount: 67,
    tags: ["bengali", "jamdani", "cotton", "muslin"],
    createdAt: "2025-02-20T10:00:00Z",
    updatedAt: "2025-03-01T14:00:00Z"
  },
  {
    id: 7,
    name: "Paithani Silk Saree - Purple",
    slug: "paithani-silk-saree-purple",
    description: "Maharashtra's pride - handwoven Paithani with peacock motifs and muniya border.",
    shortDescription: "Traditional Paithani with peacock motifs",
    status: "published",
    featured: true,
    category: "silk-sarees",
    categoryId: 1,
    categoryName: "Silk Sarees",
    images: [
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400",
    variants: [
      {
        id: 7,
        sku: "PAI-SILK-PR-001",
        price: 45999,
        discountPrice: 39999,
        stock: 5,
        attributes: { color: "Purple", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800"
      }
    ],
    basePrice: 45999,
    effectivePrice: 39999,
    totalStock: 5,
    rating: 5.0,
    reviewCount: 32,
    tags: ["wedding", "silk", "paithani", "premium", "maharashtra"],
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-20T10:00:00Z"
  },
  {
    id: 8,
    name: "Tant Cotton Saree - Yellow",
    slug: "tant-cotton-saree-yellow",
    description: "Comfortable Bengali Tant saree in vibrant yellow. Perfect for daily wear and pujas.",
    shortDescription: "Classic Bengali Tant for everyday elegance",
    status: "published",
    featured: false,
    category: "cotton-sarees",
    categoryId: 2,
    categoryName: "Cotton Sarees",
    images: [
      "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400",
    variants: [
      {
        id: 8,
        sku: "TAN-COT-YL-001",
        price: 3999,
        discountPrice: 3499,
        stock: 50,
        attributes: { color: "Yellow", size: "Free Size" },
        image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800"
      }
    ],
    basePrice: 3999,
    effectivePrice: 3499,
    totalStock: 50,
    rating: 4.4,
    reviewCount: 234,
    tags: ["daily", "cotton", "tant", "bengali", "affordable"],
    createdAt: "2025-03-05T10:00:00Z",
    updatedAt: "2025-03-15T11:00:00Z"
  }
];

const mockCategories = [
  {
    id: 1,
    name: "Silk Sarees",
    slug: "silk-sarees",
    description: "Luxurious silk sarees for special occasions",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
    productCount: 4,
    isActive: true
  },
  {
    id: 2,
    name: "Cotton Sarees",
    slug: "cotton-sarees",
    description: "Comfortable cotton sarees for everyday elegance",
    image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400",
    productCount: 3,
    isActive: true
  },
  {
    id: 3,
    name: "Handloom Sarees",
    slug: "handloom-sarees",
    description: "Artisan handwoven sarees from across India",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400",
    productCount: 1,
    isActive: true
  },
  {
    id: 4,
    name: "Designer Sarees",
    slug: "designer-sarees",
    description: "Contemporary designer sarees with modern aesthetics",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400",
    productCount: 0,
    isActive: true
  }
];

// In-memory cart storage
const carts = new Map();

const generateCartId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getOrCreateCart = (sessionId) => {
  if (!sessionId) {
    sessionId = generateCartId();
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

module.exports = {
  mockProducts,
  mockCategories,
  mockUsers,
  generateMockToken,
  carts,
  getOrCreateCart,
  calculateCartTotals,
  generateCartId
};
