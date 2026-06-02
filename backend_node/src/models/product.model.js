const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  price: { type: Number, required: true, default: 0 },
  discountPrice: { type: Number, default: null },
  discountStart: { type: Date, default: null },
  discountEnd: { type: Date, default: null },
  image: { type: String, trim: true },
  color: { type: String, trim: true },
  colorName: { type: String, trim: true },
  hexCode: { type: String, trim: true },
  size: { type: String, trim: true },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  lastSaleChannel: { type: String, enum: ['online', 'offline', null], default: null },
  soldOfflineAt: { type: Date, default: null },
  offlineSoldQuantity: { type: Number, default: 0 },
  attributes: { type: Map, of: String, default: {} },
  attributes_hash: { type: String, trim: true }
});

const materialGuideSchema = new mongoose.Schema({
  description: { type: String, trim: true, default: '' },
  properties: [{ type: String, trim: true }],
  care: [{ type: String, trim: true }],
  origin: { type: String, trim: true, default: '' }
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    productId: { type: Number },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    sku: { type: String, trim: true },
    description: { type: String, trim: true },
    fabric: { type: String, trim: true },
    modelWears: { type: String, trim: true },
    modelHeight: { type: String, trim: true },
    materialGuide: { type: materialGuideSchema, default: null },
    color: { type: String, trim: true },
    occasion: { type: String, trim: true },
    work: { type: String, trim: true },
    brand: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    thumbnail: { type: String, trim: true },
    basePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: null },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    subcategoryValues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoryValue' }],
    status: { type: String, enum: ['draft', 'published', 'publish', 'archived'], default: 'draft' },
    tenant_id: { type: Number, default: 1 },
    attributes: [{
      name: String,
      values: [String]
    }],
    variants: [productVariantSchema],
    lowStockThreshold: { type: Number, default: 5, min: 0, max: 10000 },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: { type: String, trim: true },
    is_deleted: { type: Boolean, default: false },
    originalOnly: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ tenant_id: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ tenant_id: 1, is_deleted: 1, status: 1 });
productSchema.index({ 'variants.stock': 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
module.exports = Product;
