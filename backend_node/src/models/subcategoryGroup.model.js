const mongoose = require('mongoose');

const subcategoryGroupSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    display_order: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

subcategoryGroupSchema.index({ categoryId: 1 });
subcategoryGroupSchema.index({ slug: 1 }, { unique: true });

const SubcategoryGroup = mongoose.model('SubcategoryGroup', subcategoryGroupSchema);
module.exports = SubcategoryGroup;
