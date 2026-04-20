const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product.variants' },
  quantity: { type: Number, required: true },
  priceSnapshot: { type: Number, required: true },
  variant_attributes: { type: Map, of: String, default: {} },
  name: { type: String, trim: true },
  thumbnail: { type: String, trim: true },
  price: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  size: { type: String, trim: true },
  color: { type: String, trim: true },
  sku: { type: String, trim: true }
});

const orderStatusHistorySchema = new mongoose.Schema({
  old_status: String,
  new_status: String,
  status_type: { type: String, enum: ['order', 'payment', 'fulfillment'] },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changed_by_type: { type: String, default: 'system' },
  reason: String,
  timestamp: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, trim: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tenant_id: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'pending_payment', 'payment_failed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending_payment'
    },
    userEmail: { type: String, trim: true, default: '' },
    userName: { type: String, trim: true, default: '' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    payment_status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    fulfillment_status: { type: String, enum: ['unfulfilled', 'processing', 'shipped', 'delivered'], default: 'unfulfilled' },
    total_amount: { type: Number, required: true },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    items: [orderItemSchema],
    shippingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      address2: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    },
    shipping_address: {
      first_name: String,
      last_name: String,
      address_1: String,
      address_2: String,
      city: String,
      state: String,
      postcode: String,
      country: String,
      phone: String
    },
    billing_address: {
      first_name: String,
      last_name: String,
      address_1: String,
      address_2: String,
      city: String,
      state: String,
      postcode: String,
      country: String,
      email: String,
      phone: String
    },
    couponCode: { type: String, trim: true, default: '' },
    paymentMethod: { type: String, trim: true, default: '' },
    payment_method: String,
    payment_details: { type: Map, of: mongoose.Schema.Types.Mixed },
    razorpayOrderId: { type: String, trim: true, default: '' },
    razorpayPaymentId: { type: String, trim: true, default: '' },
    transaction_id: String,
    trackingNumber: { type: String, trim: true, default: '' },
    trackingUrl: { type: String, trim: true, default: '' },
    stockReduced: { type: Boolean, default: false },
    statusHistory: [{
      status: String,
      timestamp: Date,
      note: String
    }],
    paid_at: Date,
    shipped_at: Date,
    delivered_at: Date,
    cancelled_at: Date,
    status_history: [orderStatusHistorySchema],
    internalNotes: { type: String, default: '' }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ tenant_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ created_at: -1 });
orderSchema.index({ tenant_id: 1, status: 1, created_at: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
