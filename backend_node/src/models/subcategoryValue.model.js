const mongoose = require('mongoose');

const subcategoryValueSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoryGroup', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    display_order: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

subcategoryValueSchema.index({ groupId: 1 });
subcategoryValueSchema.index({ slug: 1 });

const SubcategoryValue = mongoose.model('SubcategoryValue', subcategoryValueSchema);
module.exports = SubcategoryValue;
