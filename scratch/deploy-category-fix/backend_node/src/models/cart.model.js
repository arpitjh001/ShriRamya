const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product.variants' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, required: true, default: 1 },
  priceSnapshot: { type: Number, required: true }
}, { timestamps: true });

const appliedCouponSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  code: { type: String, trim: true, default: null },
  type: { type: String, trim: true, default: null },
  value: { type: Number, default: 0 },
  min_cart_value: { type: Number, default: 0 },
  description: { type: String, trim: true, default: null },
  discount_amount: { type: Number, default: 0 },
  final_total: { type: Number, default: 0 },
  source: { type: String, enum: ['database', 'mock', null], default: null }
}, { _id: false, id: false });

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, trim: true, default: null },
    status: { type: String, enum: ['active', 'converted', 'abandoned'], default: 'active' },
    items: [cartItemSchema],
    appliedCoupon: { type: appliedCouponSchema, default: null },
    tenant_id: { type: Number, default: 1 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ tenant_id: 1 });

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
module.exports = Cart;
