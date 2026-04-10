const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  address: String,
  latitude: Number,
  longitude: Number,
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const warehouseInventorySchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Ref to variant subdocument if possible, or just ID
  stock: { type: Number, default: 0 },
  reserved_stock: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

warehouseInventorySchema.index({ warehouseId: 1, variantId: 1 }, { unique: true });
warehouseInventorySchema.index({ variantId: 1 });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
const WarehouseInventory = mongoose.model('WarehouseInventory', warehouseInventorySchema);

module.exports = { Warehouse, WarehouseInventory };
