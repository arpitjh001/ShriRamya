const mongoose = require('mongoose');

const DISPLAY_LOCATIONS = ['all', 'home', 'category', 'product', 'cart', 'checkout'];

const promoBarSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' },
    promoText: { type: String, required: true, trim: true, maxlength: 240 },
    couponCode: { type: String, trim: true, uppercase: true, default: null },
    isActive: { type: Boolean, default: true, index: true },
    displayLocation: {
      type: String,
      enum: DISPLAY_LOCATIONS,
      default: 'all',
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    priority: { type: Number, default: 0, min: 0, index: true },
    backgroundColor: { type: String, trim: true, default: '' },
    textColor: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
  }
);

promoBarSchema.index({ isActive: 1, displayLocation: 1, priority: -1 });
promoBarSchema.index({ startDate: 1, endDate: 1 });

promoBarSchema.pre('save', function normalize(next) {
  if (this.couponCode) {
    this.couponCode = this.couponCode.trim().toUpperCase();
  }
  if (this.promoText) {
    this.promoText = this.promoText.trim();
  }
  if (this.title) {
    this.title = this.title.trim();
  }
  next();
});

promoBarSchema.statics.DISPLAY_LOCATIONS = DISPLAY_LOCATIONS;

const PromoBar = mongoose.models.PromoBar || mongoose.model('PromoBar', promoBarSchema);

module.exports = PromoBar;
module.exports.DISPLAY_LOCATIONS = DISPLAY_LOCATIONS;
