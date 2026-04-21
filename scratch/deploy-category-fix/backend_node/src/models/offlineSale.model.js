const mongoose = require('mongoose');

const offlineSaleSchema = new mongoose.Schema(
  {
    tenant_id: { type: Number, default: 1, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, default: 1 },
    salePrice: { type: Number }, // Price at which it was sold offline
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'card', 'upi', 'check', 'other'], 
      default: 'cash' 
    },
    customerName: { type: String },
    customerPhone: { type: String },
    customerEmail: { type: String },
    notes: { type: String },
    soldAt: { type: Date, default: Date.now, index: true },
    recordedBy: { type: String }, // Admin user who recorded the sale
    store_location: { type: String }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

offlineSaleSchema.index({ productId: 1 });
offlineSaleSchema.index({ variantId: 1 });
offlineSaleSchema.index({ soldAt: -1 });
offlineSaleSchema.index({ tenant_id: 1, soldAt: -1 });

const OfflineSale = mongoose.model('OfflineSale', offlineSaleSchema);
module.exports = OfflineSale;
