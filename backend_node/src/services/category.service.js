const categoryRepository = require('../repositories/category.mongo.repository');
const { Category } = require('../models');
const config = require('../config/config');
const cacheService = require('./cache.service');
const cacheInvalidationService = require('./cacheInvalidation.service');
const crypto = require('crypto');

class CategoryService {
    constructor() {
        this.CACHE_KEY = 'categories:legacy-tree';
    }

    normalizeIdentifier(value) {
        if (value == null) return null;
        if (typeof value === 'object' && typeof value.toString === 'function') {
            return value.toString();
        }
        return String(value);
    }

    normalizeCategoryPayload(data = {}) {
        const normalizedData = { ...data };

        if (Object.prototype.hasOwnProperty.call(normalizedData, 'parentId') && !Object.prototype.hasOwnProperty.call(normalizedData, 'parent_id')) {
            normalizedData.parent_id = normalizedData.parentId;
        }

        delete normalizedData.parentId;

        if (normalizedData.parent_id === '' || normalizedData.parent_id == null) {
            normalizedData.parent_id = null;
        }

        return normalizedData;
    }

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async createCategory(data) {
        data = this.normalizeCategoryPayload(data);
        if (!data.slug && data.name) {
            data.slug = this.generateSlug(data.name);
        }

        // check if slug exists
        let existing = await categoryRepository.getCategoryBySlug(data.slug);
        if (existing) {
            data.slug = `${data.slug}-${crypto.randomBytes(2).toString('hex')}`;
        }

        const id = await categoryRepository.createCategory(data);
        await this.clearCache(); // clear cache
        return { id: this.normalizeIdentifier(id), ...data };
    }

    async getCategoryById(id) {
        return categoryRepository.getCategoryById(id);
    }

    async getCategoryBySlug(slug) {
        return categoryRepository.getCategoryBySlug(slug);
    }

    async getAllCategories() {
        return cacheService.getOrSet(this.CACHE_KEY, config.cache.categoryTtlSeconds, async () => {
            const categories = await categoryRepository.getAllCategories();
            // Build tree
            const map = new Map();
            categories.forEach((item) => {
                const normalizedItem = {
                    ...item,
                    id: this.normalizeIdentifier(item.id || item._id),
                    parent_id: this.normalizeIdentifier(item.parent_id),
                    children: [],
                };
                map.set(normalizedItem.id, normalizedItem);
            });
            const rootCategories = [];
            categories.forEach((item) => {
                const node = map.get(this.normalizeIdentifier(item.id || item._id));
                const parentId = this.normalizeIdentifier(item.parent_id);
                if (parentId) {
                    const parent = map.get(parentId);
                    if (parent) {
                        parent.children.push(node);
                    } else {
                        rootCategories.push(node);
                    }
                } else {
                    rootCategories.push(node);
                }
            });

            return rootCategories;
        });
    }

    async updateCategory(id, data) {
        data = this.normalizeCategoryPayload(data);
        if (data.name && !data.slug) {
            data.slug = this.generateSlug(data.name);
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && this.normalizeIdentifier(existing.id || existing._id) !== this.normalizeIdentifier(id)) {
                data.slug = `${data.slug}-${crypto.randomBytes(2).toString('hex')}`;
            }
        } else if (data.slug) {
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && this.normalizeIdentifier(existing.id || existing._id) !== this.normalizeIdentifier(id)) {
                throw new Error('Slug already exists');
            }
        }

        const updated = await categoryRepository.updateCategory(id, data);
        await this.clearCache();
        return updated;
    }

    async deleteCategory(id) {
        const deleted = await categoryRepository.deleteCategory(id);
        await this.clearCache();
        return deleted;
    }

    async clearCache() {
        await cacheService.del(this.CACHE_KEY);
        await cacheInvalidationService.invalidateCategories();
    }

    async getProductsByCategoryId(categoryId, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategoryId(categoryId, limit, status);
    }

    async getProductsByCategorySlug(slug, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategorySlug(slug, limit, status);
    }

    async ensureUncategorized(tenant_id = 1) {
        try {
            let category = await Category.findOne({ 
                name: 'Uncategorized', 
                tenant_id: tenant_id 
            });

            if (!category) {
                category = await Category.create({
                    name: 'Uncategorized',
                    slug: 'uncategorized',
                    tenant_id: tenant_id,
                    description: 'Default category for products'
                });
            }
            return category;
        } catch (error) {
            console.error('Error in ensureUncategorized:', error);
            throw error;
        }
    }
}

module.exports = new CategoryService();
