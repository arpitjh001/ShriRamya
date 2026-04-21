const mongoose = require('mongoose');

/**
 * Counter Model
 * Simple numeric sequences for legacy numeric IDs (e.g. `productId`).
 *
 * Note: We intentionally keep this generic so we can extend it to other sequences later.
 */

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'counters',
  }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
module.exports = Counter;

