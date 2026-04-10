const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  productId: { type: Number, index: true },
  name: String,
  thumbnail: String,
  price: Number,
  salePrice: Number,
}, { timestamps: true });

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
