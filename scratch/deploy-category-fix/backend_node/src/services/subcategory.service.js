const subcategoryRepository = require('../repositories/subcategory.mongo.repository');
const crypto = require('crypto');

class SubcategoryService {
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ─── GROUPS ───

  async createGroup(categoryId, data) {
    const slug = data.slug || this.generateSlug(data.name);
    const id = await subcategoryRepository.createGroup(
      categoryId,
      data.name,
      slug,
      data.display_order || 0
    );
    return { id, category_id: categoryId, name: data.name, slug, display_order: data.display_order || 0 };
  }

  async getGroupsByCategoryId(categoryId) {
    return subcategoryRepository.getGroupsByCategoryId(categoryId);
  }

  async getGroupById(groupId) {
    return subcategoryRepository.getGroupById(groupId);
  }

  async updateGroup(groupId, data) {
    // Only generate slug if explicitly provided in the update data
    // Do NOT auto-regenerate slug when name changes - this preserves existing URLs/bookmarks
    // If user wants to regenerate slug, they must explicitly send it in the request
    const updateData = { ...data };

    // If slug is explicitly sent (even as empty string), use it
    // If slug is not sent at all, don't modify it
    if (updateData.slug === undefined) {
      // Remove slug from update data to preserve existing slug
      delete updateData.slug;
    } else if (updateData.slug === '' && updateData.name) {
      // Only auto-generate if explicitly requested with empty string AND name is provided
      updateData.slug = this.generateSlug(updateData.name);
    }

    return subcategoryRepository.updateGroup(groupId, updateData);
  }

  async deleteGroup(groupId) {
    return subcategoryRepository.deleteGroup(groupId);
  }

  // Get deletion impact info (for cascade warning)
  async getGroupDeletionImpact(groupId) {
    const group = await this.getGroupById(groupId);
    if (!group) return null;

    const valueCount = await subcategoryRepository.getGroupValueCount(groupId);
    const valueIds = await subcategoryRepository.getValueIdsInGroup(groupId);

    // Check how many products use values in this group
    let productCount = 0;
    for (const valueId of valueIds) {
      const count = await subcategoryRepository.getValueProductCount(valueId);
      productCount += count;
    }

    return {
      group,
      valueCount,
      productCount
    };
  }

  async getValueDeletionImpact(valueId) {
    const value = await this.getValueById(valueId);
    if (!value) return null;

    const productCount = await subcategoryRepository.getValueProductCount(valueId);
    const productIds = await subcategoryRepository.getProductIdsUsingValue(valueId);

    return {
      value,
      productCount,
      productIds
    };
  }

  // ─── VALUES ───

  async createValue(groupId, data) {
    const slug = data.slug || this.generateSlug(data.name);
    const id = await subcategoryRepository.createValue(
      groupId,
      data.name,
      slug,
      data.display_order || 0
    );
    return { id, group_id: groupId, name: data.name, slug, display_order: data.display_order || 0 };
  }

  async getValuesByGroupId(groupId) {
    return subcategoryRepository.getValuesByGroupId(groupId);
  }

  async getValueById(valueId) {
          return subcategoryRepository.getValueById(valueId);
      }
  
      async updateValue(valueId, data) {
          // Only generate slug if explicitly provided in the update data
          // Do NOT auto-regenerate slug when name changes - this preserves existing URLs/bookmarks
          const updateData = { ...data };

          if (updateData.slug === undefined) {
            delete updateData.slug;
          } else if (updateData.slug === '' && updateData.name) {
            updateData.slug = this.generateSlug(updateData.name);
          }

          return subcategoryRepository.updateValue(valueId, updateData);
      }
  async deleteValue(valueId) {
    return subcategoryRepository.deleteValue(valueId);
  }

  // ─── PRODUCT LINKING ───

  async setProductSubcategoryValues(productId, valueIds) {
    return subcategoryRepository.setProductSubcategoryValues(productId, valueIds);
  }

  async getProductSubcategoryValues(productId) {
    return subcategoryRepository.getProductSubcategoryValues(productId);
  }

  async getProductIdsBySubcategoryValues(valueIds) {
    return subcategoryRepository.getProductIdsBySubcategoryValues(valueIds);
  }
}

module.exports = new SubcategoryService();
