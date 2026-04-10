const categoryRepository = require('../repositories/category.mongo.repository');
const redis = require('../config/integrations/redis');
const crypto = require('crypto');

// Cache categories for 24 hours using Redis
const CACHE_TTL = 86400; // 24 hours in seconds

class CategoryService {
    constructor() {
        this.CACHE_KEY = 'all_categories';
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
        // Try Redis cache first
        if (redis && redis.get) {
            try {
                const cached = await redis.get(this.CACHE_KEY);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }

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

        // Cache in Redis
        if (redis && redis.set) {
            try {
                await redis.set(this.CACHE_KEY, JSON.stringify(rootCategories), { ex: CACHE_TTL });
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }

        return rootCategories;
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
        if (redis && redis.del) {
            try {
                await redis.del(this.CACHE_KEY);
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }
    }

    async getProductsByCategoryId(categoryId, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategoryId(categoryId, limit, status);
    }

    async getProductsByCategorySlug(slug, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategorySlug(slug, limit, status);
    }
}

module.exports = new CategoryService();
