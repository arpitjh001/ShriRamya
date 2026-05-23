const productMongoRepository = require('../repositories/product.mongo.repository');
const Category = require('../models/category.model');
const cacheService = require('./cache.service');
const config = require('../config/config');

const STATIC_FALLBACK_MAP = {
  sarees: [
    { label: "Cotton", value: "cotton", count: 0 },
    { label: "Silk", value: "silk", count: 0 },
    { label: "Kota Doria", value: "kota-doria", count: 0 },
    { label: "Chanderi", value: "chanderi", count: 0 }
  ],
  saree: [
    { label: "Cotton", value: "cotton", count: 0 },
    { label: "Silk", value: "silk", count: 0 },
    { label: "Kota Doria", value: "kota-doria", count: 0 },
    { label: "Chanderi", value: "chanderi", count: 0 }
  ],
  suits: [
    { label: "Cotton", value: "cotton", count: 0 },
    { label: "Rayon", value: "rayon", count: 0 },
    { label: "Linen", value: "linen", count: 0 },
    { label: "Chanderi", value: "chanderi", count: 0 }
  ],
  dupattas: [
    { label: "Chiffon", value: "chiffon", count: 0 },
    { label: "Silk", value: "silk", count: 0 },
    { label: "Cotton", value: "cotton", count: 0 }
  ],
  jewellery: [
    { label: "Alloy", value: "alloy", count: 0 },
    { label: "Metal", value: "metal", count: 0 }
  ],
  'home-lifestyle': [
    { label: "Cotton", value: "cotton", count: 0 }
  ]
};

function normalizeFilterValue(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function isExcluded(fabric) {
  const lower = fabric.trim().toLowerCase();
  return ['null', 'undefined', 'unknown', 'n/a', 'na', ''].includes(lower);
}

class CategoryFilterService {
  /**
   * Get available filter parameters (e.g. fabrics) for a category
   * @param {string} categorySlug
   * @returns {Promise<Object>} Filters containing category info and fabrics list
   */
  async getAvailableFiltersByCategory(categorySlug) {
    try {
      const fabrics = await this.getAvailableFabricsByCategory(categorySlug);
      
      const category = await Category.findOne({ slug: categorySlug.toLowerCase(), is_deleted: { $ne: true } }).lean();
      if (!category) {
        throw new Error('Category not found');
      }

      return {
        category: {
          id: category._id.toString(),
          slug: category.slug,
          name: category.name
        },
        filters: {
          fabrics
        }
      };
    } catch (error) {
      console.error(`[CategoryFilterService] Error fetching filters for category ${categorySlug}:`, error.message);
      
      if (error.message === 'Category not found') {
        throw error;
      }

      // Final fallback to static map
      const normalizedSlug = categorySlug.toLowerCase();
      const fallbackFabrics = STATIC_FALLBACK_MAP[normalizedSlug] || [];
      return {
        category: {
          id: categorySlug,
          slug: categorySlug,
          name: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
        },
        filters: {
          fabrics: fallbackFabrics
        }
      };
    }
  }

  /**
   * Fetch available fabrics for a category (cache-aside)
   * @param {string} categorySlug
   * @returns {Promise<Array>} List of fabric filter items
   */
  async getAvailableFabricsByCategory(categorySlug) {
    const cacheKey = `category_filters:${categorySlug.toLowerCase()}:fabrics`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      console.warn(`[CategoryFilterService] Redis GET error for key ${cacheKey}:`, error.message);
    }

    // Cache miss or Redis down
    return await this.rebuildFabricCacheForCategory(categorySlug);
  }

  /**
   * Rebuild the fabric cache from MongoDB
   * @param {string} categorySlug
   * @returns {Promise<Array>} List of fabric filter items
   */
  async rebuildFabricCacheForCategory(categorySlug) {
    const cacheKey = `category_filters:${categorySlug.toLowerCase()}:fabrics`;
    
    const dbResult = await productMongoRepository.getFabricCountsByCategory(categorySlug);
    if (!dbResult) {
      throw new Error('Category not found');
    }

    const { rawFabrics } = dbResult;
    const normalizedMap = {};

    for (const item of rawFabrics) {
      const rawFabric = item.fabric ? item.fabric.trim() : '';
      if (!rawFabric || isExcluded(rawFabric)) continue;

      const val = normalizeFilterValue(rawFabric);
      if (!normalizedMap[val]) {
        normalizedMap[val] = {
          label: rawFabric, // keep the first encountered readable label
          value: val,
          count: 0
        };
      }
      normalizedMap[val].count += item.count;
    }

    const fabricsList = Object.values(normalizedMap).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    // Save back to Redis cache
    try {
      await cacheService.set(cacheKey, fabricsList, config.cache.categoryTtlSeconds);
    } catch (error) {
      console.warn(`[CategoryFilterService] Redis SET error for key ${cacheKey}:`, error.message);
    }

    return fabricsList;
  }

  /**
   * Invalidate cache for a specific category
   * @param {string} categorySlug
   */
  async invalidateFabricCacheForCategory(categorySlug) {
    const cacheKey = `category_filters:${categorySlug.toLowerCase()}:fabrics`;
    try {
      await cacheService.del(cacheKey);
    } catch (error) {
      console.warn(`[CategoryFilterService] Redis DEL error for key ${cacheKey}:`, error.message);
    }
  }

  /**
   * Invalidate all category filter caches
   */
  async invalidateAllFabricFilterCaches() {
    try {
      await cacheService.delPattern('category_filters:*');
    } catch (error) {
      console.warn('[CategoryFilterService] Redis delPattern error for category_filters:*:', error.message);
    }
  }

  /**
   * Warm up fabric filter cache for all categories
   */
  async warmAllCategoryFabricCaches() {
    console.log('[CategoryFilterService] Starting warm up for all category fabric filters...');
    const categories = await Category.find({ is_deleted: { $ne: true } }).lean();
    
    let warmedCount = 0;
    for (const category of categories) {
      try {
        console.log(`[CategoryFilterService] Warming cache for category: ${category.slug}`);
        const list = await this.rebuildFabricCacheForCategory(category.slug);
        const listSummary = list.map(item => `${item.label}: ${item.count}`).join(', ');
        console.log(`[CategoryFilterService] Warmed category: ${category.slug} -> ${listSummary || 'No Fabrics'}`);
        warmedCount++;
      } catch (err) {
        console.error(`[CategoryFilterService] Failed to warm cache for category ${category.slug}:`, err.message);
      }
    }
    console.log(`[CategoryFilterService] Warmed ${warmedCount} categories successfully.`);
  }
}

module.exports = new CategoryFilterService();
