/**
 * Search Controller
 * Handles product search with advanced filters
 */

const searchService = require('../services/search/search.service');
const { successResponse } = require('../utils/response');

/**
 * Search products
 * GET /api/v1/search?q=saree&color=red&price_min=1000
 */
const searchProducts = async (req, res, next) => {
  try {
    const result = await searchService.searchProducts(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get search suggestions
 * GET /api/v1/search/suggestions?q=sar
 */
const getSuggestions = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    const result = await searchService.getSuggestions(q, limit);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get search filters
 * GET /api/v1/search/filters
 */
const getSearchFilters = async (req, res, next) => {
  try {
    const result = await searchService.getSearchFilters(req.query);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Search by SKU
 * GET /api/v1/search/sku/:sku
 */
const searchBySku = async (req, res, next) => {
  try {
    const result = await searchService.searchBySku(req.params.sku);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Rebuild search index (admin only)
 * POST /api/v1/search/rebuild-index
 */
const rebuildSearchIndex = async (req, res, next) => {
  try {
    const result = await searchService.rebuildSearchIndex();
    return successResponse(res, result, 'Search index rebuilt successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchProducts,
  getSuggestions,
  getSearchFilters,
  searchBySku,
  rebuildSearchIndex
};
