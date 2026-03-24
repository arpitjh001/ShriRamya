const { mongoose } = require('../db/mongodb');

const productSchema = new mongoose.Schema({
  productId: { type: Number, unique: true, index: true },
  name: String,
  slug: String,
  description: String,
  price: Number,
  salePrice: Number,
  discount: Number,
  categoryName: String,
  categorySlug: String,
  subcategory: String,
  fabric: String,
  color: String,
  occasion: String,
  work: String,
  brand: String,
  images: [String],
  thumbnail: String,
  stock: { type: Number, default: 50 },
  rating: { type: Number, default: 4.2 },
  reviewCount: { type: Number, default: 0 },
  tags: [String],
  sizes: [String],
  isNew: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  email: { type: String, unique: true, index: true },
  password: String,
  name: String,
  phone: String,
  role: { type: String, default: 'customer' },
  roles: [String],
  permissions: [String],
  tenantId: { type: String, default: 'shriramya' },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, index: true },
  userId: { type: String, index: true },
  userEmail: String,
  userName: String,
  items: [{
    productId: Number,
    name: String,
    thumbnail: String,
    price: Number,
    salePrice: Number,
    quantity: Number,
    size: String,
    color: String,
  }],
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  subtotal: Number,
  discount: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: Number,
  couponCode: String,
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'refunded'] },
  paymentMethod: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  trackingNumber: String,
  trackingUrl: String,
  notes: String,
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String,
  }],
}, { timestamps: true });

const blogSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true, index: true },
  content: String,
  excerpt: String,
  author: { id: String, name: String },
  categories: [String],
  tags: [String],
  status: { type: String, default: 'draft', enum: ['draft', 'published', 'archived'] },
  featuredImage: String,
  seoTitle: String,
  seoDescription: String,
  views: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  publishedAt: Date,
}, { timestamps: true });

const wishlistSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  productId: { type: Number, index: true },
  name: String,
  thumbnail: String,
  price: Number,
  salePrice: Number,
}, { timestamps: true });

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const cartSchema = new mongoose.Schema({
  sessionId: { type: String, index: true },
  userId: String,
  items: [{
    productId: Number,
    name: String,
    thumbnail: String,
    price: Number,
    salePrice: Number,
    quantity: { type: Number, default: 1 },
    size: String,
    color: String,
  }],
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

module.exports = { Product, User, Order, Blog, Wishlist, Cart };
