/**
 * Search Service
 * Extended search functionality with filters
 */

import api from './apiClient';

export const searchService = {
  /**
   * Search products
   */
  searchProducts(params = {}) {
    return api.get('/search', { params });
  },

  /**
   * Get search suggestions
   */
  getSuggestions(query, limit = 10) {
    return api.get('/search/suggestions', { params: { q: query, limit } });
  },

  /**
   * Get available search filters
   */
  getFilters(params = {}) {
    return api.get('/search/filters', { params });
  },

  /**
   * Search by SKU
   */
  searchBySku(sku) {
    return api.get(`/search/sku/${sku}`);
  },

  /**
   * Rebuild search index (admin only)
   */
  rebuildSearchIndex() {
    return api.post('/search/rebuild-index');
  },
};

export default searchService;
