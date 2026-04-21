const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
  total_revenue: { type: Number, default: 0 },
  total_orders: { type: Number, default: 0 },
  total_products_sold: { type: Number, default: 0 },
  new_customers: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  avg_order_value: { type: Number, default: 0 }
}, { timestamps: true });

const productPerformanceSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  views: { type: Number, default: 0 },
  add_to_cart: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 }
}, { timestamps: true });

productPerformanceSchema.index({ productId: 1, date: 1 }, { unique: true });

const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);
const ProductPerformance = mongoose.model('ProductPerformance', productPerformanceSchema);

module.exports = { DailyStats, ProductPerformance };
