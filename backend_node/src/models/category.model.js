const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    menu_order: { type: Number, default: 0 },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
    tenant_id: { type: Number, default: 1 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Indexes for performance
categorySchema.index({ slug: 1 });
categorySchema.index({ tenant_id: 1 });
categorySchema.index({ parent_id: 1 });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
