const express = require('express');
const auth = require('../../middlewares/auth');
const { searchLimiter, apiLimiter } = require('../../middlewares/rateLimit.middleware');
const searchController = require('../../controllers/search.controller');

const router = express.Router();

router.use(apiLimiter);

/**
 * Search endpoints
 */
router.get('/', searchLimiter, searchController.searchProducts);
router.get('/suggestions', searchLimiter, searchController.getSuggestions);
router.get('/filters', searchController.getSearchFilters);
router.get('/sku/:sku', searchController.searchBySku);
router.post('/rebuild-index', auth(['admin']), searchController.rebuildSearchIndex);

module.exports = router;
