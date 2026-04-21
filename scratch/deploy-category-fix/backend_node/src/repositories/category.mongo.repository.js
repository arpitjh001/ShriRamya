const Category = require('../models/category.model');
const mongoose = require('mongoose');

class CategoryMongoRepository {
  async createCategory(data) {
    const category = new Category(data);
    await category.save();
    return category._id;
  }

  async getCategoryById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Category.findOne({ _id: id, is_deleted: { $ne: true } });
  }

  async getCategoryBySlug(slug) {
    return await Category.findOne({ slug, is_deleted: { $ne: true } });
  }

  async getAllCategories() {
    return await Category.find({ is_deleted: { $ne: true } }).sort({ menu_order: 1, name: 1 });
  }

  async updateCategory(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await Category.updateOne({ _id: id }, { $set: data });
    return result.modifiedCount > 0;
  }

  async deleteCategory(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await Category.updateOne(
      { _id: id },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async getProductsByCategoryId(categoryId, limit = 100, status = 'published') {
    // This logic might need to be shifted to Product repository in MongoDB
    // or we can use the Product model directly here if needed, but it's cleaner in Product repository.
    const Product = mongoose.model('Product');
    const query = {
      $or: [{ categoryId: categoryId }, { categories: categoryId }],
      is_deleted: { $ne: true }
    };

    if (status) {
      query.status = status;
    }

    return await Product.find(query).limit(limit).sort({ created_at: -1 });
  }

  async getProductsByCategorySlug(slug, limit = 100, status = 'published') {
    const category = await this.getCategoryBySlug(slug);
    if (!category) return [];
    return await this.getProductsByCategoryId(category._id, limit, status);
  }
}

module.exports = new CategoryMongoRepository();
