const cacheService = require('./cache.service');

class CacheInvalidationService {
  async invalidateProducts(product = {}) {
    await Promise.all([
      cacheService.delPattern('products:list:*'),
      cacheService.delPattern('catalog:base-products:*'),
      cacheService.delPattern('search:products:*'),
      cacheService.delPattern('recommendations:*'),
      cacheService.delPattern('homepage:*'),
      cacheService.delPattern('product:detail:*'),
    ]);
  }

  async invalidateCategories() {
    await Promise.all([
      cacheService.delPattern('categories:*'),
      cacheService.delPattern('category:*'),
      cacheService.delPattern('products:list:*'),
      cacheService.delPattern('catalog:base-products:*'),
      cacheService.delPattern('homepage:*'),
    ]);
  }

  async invalidateSubcategories(categoryId = '*') {
    await Promise.all([
      cacheService.delPattern(`subcategory:groups:${categoryId}`),
      cacheService.delPattern('products:list:*'),
      cacheService.delPattern('catalog:base-products:*'),
      cacheService.delPattern('homepage:*'),
    ]);
  }

  async invalidateCoupons(code = '*') {
    await cacheService.delPattern(`coupon:validate:${code}:*`);
  }
}

module.exports = new CacheInvalidationService();
