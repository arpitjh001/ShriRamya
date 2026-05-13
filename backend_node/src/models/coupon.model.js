const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['percentage', 'flat', 'free_shipping', 'buy_x_get_y'], default: 'percentage' },
    value: { type: Number, required: true },
    min_cart_value: { type: Number, default: 0 },
    max_discount: { type: Number, default: null },
    usage_limit: { type: Number, default: null },
    used_count: { type: Number, default: 0 },
    starts_at: Date,
    expires_at: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    applicable_products: [mongoose.Schema.Types.ObjectId],
    applicable_categories: [mongoose.Schema.Types.ObjectId],
    buy_x_qty: { type: Number, default: 1 },
    get_y_qty: { type: Number, default: 1 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

couponSchema.index({ status: 1 });
couponSchema.index({ expires_at: 1 });
couponSchema.index({ applicable_categories: 1 });

couponSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
