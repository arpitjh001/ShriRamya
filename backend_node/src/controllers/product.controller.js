const httpStatus = require('http-status');
const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');
const redis = require('../config/integrations/redis');

// Cache TTL for product list - 60 seconds
const PRODUCTS_CACHE_TTL = 60;
const PRODUCTS_CACHE_KEY = 'api:products:list';

/**
 * Generate cache key based on query params
 */
const getCacheKey = (prefix, params) => {
  const queryString = JSON.stringify(params);
  return `${prefix}:${Buffer.from(queryString).toString('base64').substring(0, 32)}`;
};

/**
 * Get tenant ID from request (set by ensureTenantIsolation middleware)
 */
const getTenantId = (req) => {
  return req.tenantId || req.user?.tenantId || 1;
};

/**
 * ---------- PRODUCTS ----------
 */

const getProducts = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // Check for admin/editor status to allow viewing drafts
    const isAdminOrEditor = req.user && (
      (req.user.roles || []).some(r => ['admin', 'editor'].includes(r.toLowerCase())) ||
      ['admin', 'editor'].includes((req.user.role || '').toLowerCase())
    );

    // If not admin/editor, force published status
    if (!isAdminOrEditor) {
      req.query.status = 'published';
    }

    // Generate cache key based on query params and tenant
    const cacheKey = `${getCacheKey(PRODUCTS_CACHE_KEY, req.query)}:${tenantId}:${isAdminOrEditor ? 'admin' : 'public'}`;

    // Try to get from Redis cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log(`[ProductController] Cache hit for products: ${cacheKey}`);
          return res.json({ success: true, data: parsed });
        }
      } catch (cacheErr) {
        console.error('[ProductController] Redis cache read error:', cacheErr.message);
      }
    }

    // Cache miss - fetch from database
    console.log(`[ProductController] Cache miss for products: ${cacheKey} (tenant: ${tenantId})`);
    const data = await productService.getProducts(req.query, tenantId);

    // Store in Redis cache with TTL
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), { ex: PRODUCTS_CACHE_TTL });
      } catch (cacheErr) {
        console.error('[ProductController] Redis cache write error:', cacheErr.message);
      }
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const product = await productService.getProductById(req.params.product_id, tenantId);

    // Check for admin/editor status to allow viewing drafts
    const isAdminOrEditor = req.user && (
      (req.user.roles || []).some(r => ['admin', 'editor'].includes(r.toLowerCase())) ||
      ['admin', 'editor'].includes((req.user.role || '').toLowerCase())
    );

    if (product.status !== 'published' && !isAdminOrEditor) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
};

/**
 * Clear product list cache
 */
const clearProductsCache = async () => {
  if (redis) {
    try {
      // Delete all keys matching the pattern
      const keys = await redis.keys(`${PRODUCTS_CACHE_KEY}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[ProductController] Cleared ${keys.length} product cache entries`);
      }
    } catch (err) {
      console.error('[ProductController] Cache clear error:', err.message);
    }
  }
};

const createProduct = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const product = await productService.createProduct(req.body, tenantId);
    await clearProductsCache(); // Invalidate cache
    return successResponse(res, product, 'Product created successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const addVariant = async (req, res, next) => {
  try {
    const variant = await productService.addVariant(req.params.product_id, req.body);
    return successResponse(res, variant, 'Variant added successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    const variant = await productService.updateVariant(
      req.params.product_id,
      req.params.variant_id,
      req.body
    );
    return successResponse(res, variant, 'Variant updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteVariant = async (req, res, next) => {
  try {
    const deleted = await productService.deleteVariant(req.params.product_id, req.params.variant_id);
    return successResponse(res, deleted, 'Variant deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Product-category mapping methods
const assignCategoriesToProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).send({ message: 'categoryIds must be a non-empty array' });
    }

    const result = await productService.assignCategoriesToProduct(product_id, categoryIds);
    return successResponse(res, result, 'Categories assigned to product successfully');
  } catch (error) {
    next(error);
  }
};

const getProductCategories = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const categories = await productService.getProductCategories(product_id);
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
};

const removeCategoryFromProduct = async (req, res, next) => {
  try {
    const { product_id, category_id } = req.params;
    const result = await productService.removeCategoryFromProduct(product_id, category_id);
    return successResponse(res, result, 'Category removed from product successfully');
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const updated = await productService.updateProduct(req.params.product_id, req.body, tenantId);
    await clearProductsCache(); // Invalidate cache
    return successResponse(res, updated, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const deleted = await productService.deleteProduct(req.params.product_id, tenantId);
    await clearProductsCache(); // Invalidate cache
    return successResponse(res, deleted, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  assignCategoriesToProduct,
  getProductCategories,
  removeCategoryFromProduct,
};
