const SubcategoryGroup = require('../models/subcategoryGroup.model');
const SubcategoryValue = require('../models/subcategoryValue.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

class SubcategoryMongoRepository {
  // ─── GROUP CRUD ───

  async createGroup(categoryId, name, slug, displayOrder = 0) {
    const group = new SubcategoryGroup({ categoryId, name, slug, display_order: displayOrder });
    await group.save();
    return group._id;
  }

  async getGroupById(groupId) {
    return await SubcategoryGroup.findById(groupId);
  }

  async getGroupsByCategoryId(categoryId) {
    const groups = await SubcategoryGroup.find({ categoryId }).sort({ display_order: 1, name: 1 }).lean();
    if (groups.length === 0) return [];

    const groupIds = groups.map(g => g._id);
    const values = await SubcategoryValue.find({ groupId: { $in: groupIds } }).sort({ display_order: 1, name: 1 }).lean();

    const valuesByGroup = {};
    values.forEach(v => {
      if (!valuesByGroup[v.groupId]) valuesByGroup[v.groupId] = [];
      valuesByGroup[v.groupId].push(v);
    });

    return groups.map(g => ({
      ...g,
      id: g._id, // Backward compatibility
      values: (valuesByGroup[g._id] || []).map(v => ({ ...v, id: v._id }))
    }));
  }

  async updateGroup(groupId, data) {
    const result = await SubcategoryGroup.updateOne({ _id: groupId }, { $set: data });
    return result.modifiedCount > 0;
  }

  async deleteGroup(groupId) {
    // Delete values first
    await SubcategoryValue.deleteMany({ groupId });
    const result = await SubcategoryGroup.deleteOne({ _id: groupId });
    return result.deletedCount > 0;
  }

  async getGroupValueCount(groupId) {
    return await SubcategoryValue.countDocuments({ groupId });
  }

  async getValueProductCount(valueId) {
    return await Product.countDocuments({ subcategoryValues: valueId });
  }

  async getProductIdsUsingValue(valueId) {
    const products = await Product.find({ subcategoryValues: valueId }, { _id: 1 }).lean();
    return products.map(p => p._id);
  }

  async getValueIdsInGroup(groupId) {
    const values = await SubcategoryValue.find({ groupId }, { _id: 1 }).lean();
    return values.map(v => v._id);
  }

  // ─── VALUE CRUD ───

  async createValue(groupId, name, slug, displayOrder = 0) {
    const value = new SubcategoryValue({ groupId, name, slug, display_order: displayOrder });
    await value.save();
    return value._id;
  }

  async getValueById(valueId) {
    return await SubcategoryValue.findById(valueId);
  }

  async getValuesByGroupId(groupId) {
    return await SubcategoryValue.find({ groupId }).sort({ display_order: 1, name: 1 });
  }

  async updateValue(valueId, data) {
    const result = await SubcategoryValue.updateOne({ _id: valueId }, { $set: data });
    return result.modifiedCount > 0;
  }

  async deleteValue(valueId) {
    const result = await SubcategoryValue.deleteOne({ _id: valueId });
    return result.deletedCount > 0;
  }

  // ─── PRODUCT LINKING ───

  async setProductSubcategoryValues(productId, valueIds) {
    const result = await Product.updateOne(
      { _id: productId },
      { $set: { subcategoryValues: valueIds } }
    );
    return result.modifiedCount > 0 || result.matchedCount > 0;
  }

  async getProductSubcategoryValues(productId) {
    const product = await Product.findById(productId);
    if (!product || !product.subcategoryValues || product.subcategoryValues.length === 0) return [];
    
    // Complex join equivalent:
    const values = await SubcategoryValue.find({ _id: { $in: product.subcategoryValues } }).lean();
    const groupIds = [...new Set(values.map(v => v.groupId))];
    const groups = await SubcategoryGroup.find({ _id: { $in: groupIds } }).lean();
    
    const groupMap = new Map(groups.map(g => [g._id.toString(), g]));

    return values.map(v => ({
      ...v,
      id: v._id,
      group_name: groupMap.get(v.groupId.toString())?.name,
      group_slug: groupMap.get(v.groupId.toString())?.slug,
      group_id: v.groupId
    }));
  }

  async getProductIdsBySubcategoryValues(valueIds) {
    if (!valueIds || valueIds.length === 0) return [];
    const products = await Product.find({ subcategoryValues: { $in: valueIds } }, { _id: 1 }).lean();
    return products.map(p => p._id);
  }
}

module.exports = new SubcategoryMongoRepository();
