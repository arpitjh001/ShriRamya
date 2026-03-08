const categoryRepository = require('../repositories/category.sql.repository');
const redis = require('../config/integrations/redis');
const crypto = require('crypto');

// Cache categories for 24 hours using Redis
const CACHE_TTL = 86400; // 24 hours in seconds

class CategoryService {
    constructor() {
        this.CACHE_KEY = 'all_categories';
    }

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async createCategory(data) {
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
        return { id, ...data };
    }

    async getCategoryById(id) {
        return categoryRepository.getCategoryById(id);
    }

    async getCategoryBySlug(slug) {
        return categoryRepository.getCategoryBySlug(slug);
    }

    async getAllCategories() {
        // Try Redis cache first
        if (redis) {
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
            map.set(item.id, { ...item, children: [] });
        });
        const rootCategories = [];
        categories.forEach((item) => {
            const node = map.get(item.id);
            if (item.parent_id) {
                const parent = map.get(item.parent_id);
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
        if (redis) {
            try {
                await redis.setex(this.CACHE_KEY, CACHE_TTL, JSON.stringify(rootCategories));
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }

        return rootCategories;
    }

    async updateCategory(id, data) {
        if (data.name && !data.slug) {
            data.slug = this.generateSlug(data.name);
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && existing.id !== Number(id)) {
                data.slug = `${data.slug}-${crypto.randomBytes(2).toString('hex')}`;
            }
        } else if (data.slug) {
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && existing.id !== Number(id)) {
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
        if (redis) {
            try {
                await redis.del(this.CACHE_KEY);
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }
    }

    async getProductsByCategoryId(categoryId, limit = 100) {
        return categoryRepository.getProductsByCategoryId(categoryId, limit);
    }

    async getProductsByCategorySlug(slug, limit = 100) {
        return categoryRepository.getProductsByCategorySlug(slug, limit);
    }
}

module.exports = new CategoryService();
