const mongoose = require('mongoose');

const inventoryAuditSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product.variants' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    changeType: { 
      type: String, 
      enum: ['sale', 'restock', 'return', 'adjustment', 'reservation', 'reorder'],
      required: true 
    },
    oldStockLevel: { type: Number, required: true },
    newStockLevel: { type: Number, required: true },
    quantityChanged: { type: Number, required: true },
    referenceType: { type: String }, // e.g., 'order', 'admin', 'cart'
    referenceId: { type: String },
    userId: { type: String },
    notes: { type: String }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

inventoryAuditSchema.index({ productId: 1 });
inventoryAuditSchema.index({ variantId: 1 });
inventoryAuditSchema.index({ changeType: 1 });
inventoryAuditSchema.index({ created_at: -1 });

const InventoryAuditLog = mongoose.model('InventoryAuditLog', inventoryAuditSchema);
module.exports = InventoryAuditLog;
