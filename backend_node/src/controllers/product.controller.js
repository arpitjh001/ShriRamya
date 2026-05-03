const httpStatus = require('http-status');
const productService = require('../services/product.service');
const catalogReadService = require('../services/catalog-read.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const redis = require('../config/integrations/redis');
const { Product } = require('../models');
const { buildTenantScopedQuery, andQuery } = require('../utils/tenantScope');

// Cache TTL for product list - 60 seconds
const PRODUCTS_CACHE_TTL = 300;
const PRODUCTS_CACHE_KEY = 'api:products:list:v3';

/**
 * Safely parse JSON with validation
 */
const safeJSONParse = (data, schema = null) => {
  if (typeof data !== 'string' || data.length > 1024 * 1024) {
    throw new Error('Invalid data format or size');
  }
  
  const parsed = JSON.parse(data);
  
  // Validate schema if provided
  if (schema) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed data is not an object');
    }
    
    for (const [key, validator] of Object.entries(schema)) {
      if (!validator(parsed[key])) {
        throw new Error(`Invalid data structure: ${key}`);
      }
    }
  }
  
  return parsed;
};

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

const buildProductListMeta = async (tenantId, payload = {}) => {
  // Use stats from payload if available (already computed by catalogReadService)
  if (payload.stats) {
    return {
      filters: payload.filters || {},
      sortOptions: payload.sortOptions || [],
      appliedFilters: payload.appliedFilters || {},
      stats: payload.stats
    };
  }

  const baseQuery = buildTenantScopedQuery(tenantId, {
    is_deleted: { $ne: true }
  });
  const publishedStatusQuery = {
    $or: [
      { status: { $in: ['published', 'publish'] } },
      { status: { $exists: false } },
      { status: null }
    ]
  };

  const [totalCount, publishedCount, draftCount, outOfStockResult] = await Promise.all([
    Product.countDocuments(baseQuery),
    Product.countDocuments(andQuery(baseQuery, publishedStatusQuery)),
    Product.countDocuments(andQuery(baseQuery, { status: 'draft' })),
    Product.aggregate([
      { $match: baseQuery },
      {
        $addFields: {
          totalVariantStock: {
            $sum: {
              $map: {
                input: { $ifNull: ['$variants', []] },
                as: 'variant',
                in: { $ifNull: ['$$variant.stock', 0] }
              }
            }
          },
          variantCount: {
            $size: { $ifNull: ['$variants', []] }
          },
          productStock: {
            $ifNull: ['$stock', { $ifNull: ['$stock_quantity', 0] }]
          }
        }
      },
      {
        $addFields: {
          effectiveStock: {
            $cond: [
              { $gt: ['$variantCount', 0] },
              '$totalVariantStock',
              '$productStock'
            ]
          }
        }
      },
      { $match: { effectiveStock: { $lte: 0 } } },
      { $count: 'count' }
    ])
  ]);

  return {
    filters: payload.filters || {},
    sortOptions: payload.sortOptions || [],
    appliedFilters: payload.appliedFilters || {},
    stats: {
      total: totalCount,
      published: publishedCount,
      draft: draftCount,
      outOfStock: outOfStockResult[0]?.count || 0
    }
  };
};

const sendProductsResponse = async (res, payload, tenantId) => {
  const meta = await buildProductListMeta(tenantId, payload);
  return paginatedResponse(
    res,
    payload.products,
    payload.pagination,
    'Products retrieved successfully',
    meta
  );
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
          // Safely parse and validate cached data
          const parsed = safeJSONParse(cached, {
            products: (val) => Array.isArray(val),
            pagination: (val) => val && typeof val === 'object'
          });
          
          console.log(`[ProductController] Cache hit for products: ${cacheKey}`);
          return sendProductsResponse(res, parsed, tenantId);
        }
      } catch (cacheErr) {
        console.error('[ProductController] Redis cache read/parse error:', cacheErr.message);
      }
    }

    // Cache miss - fetch from database
    console.log(`[ProductController] Cache miss for products: ${cacheKey} (tenant: ${tenantId})`);
    const data = await catalogReadService.listProducts(req.query, {
      tenantId,
      user: req.user || null,
    });

    // Store in Redis cache with TTL
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), { ex: PRODUCTS_CACHE_TTL });
      } catch (cacheErr) {
        console.error('[ProductController] Redis cache write error:', cacheErr.message);
      }
    }

    return sendProductsResponse(res, data, tenantId);

  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const product = await catalogReadService.getProduct(req.params.product_id, {
      tenantId,
      user: req.user || null,
    });

    if (!product) {
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
    const tenantId = getTenantId(req);

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).send({ message: 'categoryIds must be a non-empty array' });
    }

    const result = await productService.assignCategoriesToProduct(product_id, categoryIds, tenantId);
    await clearProductsCache();
    return successResponse(res, result, 'Categories assigned to product successfully');
  } catch (error) {
    next(error);
  }
};

const getProductCategories = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const tenantId = getTenantId(req);
    const categories = await productService.getProductCategories(product_id, tenantId);
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
};

const removeCategoryFromProduct = async (req, res, next) => {
  try {
    const { product_id, category_id } = req.params;
    const tenantId = getTenantId(req);
    const result = await productService.removeCategoryFromProduct(product_id, category_id, tenantId);
    await clearProductsCache();
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

/**
 * Get variant matrix for a product (Color x Size grid)
 * GET /api/v1/products/:product_id/variants/matrix
 */
const getVariantMatrix = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const tenantId = getTenantId(req);

    // First verify product exists and belongs to tenant
    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const matrix = await variantInventoryService.getVariantMatrix(product_id);

    return successResponse(res, {
      productId: product_id,
      productName: product.name,
      variants: matrix,
      totalStock: matrix.reduce((sum, v) => sum + v.stock, 0),
      availableColors: [...new Set(matrix.map(v => v.color).filter(Boolean))],
      availableSizes: [...new Set(matrix.map(v => v.size).filter(Boolean))]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available colors for a product
 * GET /api/v1/products/:product_id/variants/colors
 */
const getProductColors = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const tenantId = getTenantId(req);

    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const colors = await variantInventoryService.getAvailableColors(product_id);

    return successResponse(res, { productId: product_id, colors });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available sizes for a product (optionally filtered by color)
 * GET /api/v1/products/:product_id/variants/sizes
 */
const getProductSizes = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { color } = req.query;
    const tenantId = getTenantId(req);

    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const sizes = await variantInventoryService.getAvailableSizes(product_id, color);

    return successResponse(res, { productId: product_id, color, sizes });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock for a specific variant
 * GET /api/v1/products/:product_id/variants/stock
 */
const getVariantStock = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { color, size } = req.query;
    const tenantId = getTenantId(req);

    if (!color || !size) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.BAD_REQUEST, 'color and size query parameters are required');
    }

    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const stockInfo = await variantInventoryService.getVariantStock(product_id, color, size);

    return successResponse(res, stockInfo);
  } catch (error) {
    next(error);
  }
};

/**
 * Validate stock availability for a variant
 * GET /api/v1/products/:product_id/variants/validate-stock
 */
const validateVariantStock = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { color, size, quantity = 1 } = req.query;
    const tenantId = getTenantId(req);

    if (!color || !size) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.BAD_REQUEST, 'color and size query parameters are required');
    }

    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const validation = await variantInventoryService.validateStockAvailability(
      product_id,
      color,
      size,
      parseInt(quantity, 10)
    );

    return successResponse(res, validation);
  } catch (error) {
    next(error);
  }
};

/**
 * Sync variant matrix for a product (bulk create/update)
 * PUT /api/v1/products/:product_id/variants/matrix
 */
const syncVariantMatrix = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { variants } = req.body;
    const tenantId = getTenantId(req);

    if (!Array.isArray(variants)) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.BAD_REQUEST, 'variants must be an array');
    }

    // Verify product exists
    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    await variantInventoryService.syncVariantMatrix(product_id, variants);

    // Clear cache
    await clearProductsCache();

    // Fetch updated variant matrix
    const updatedMatrix = await variantInventoryService.getVariantMatrix(product_id);

    return successResponse(res, {
      productId: product_id,
      variants: updatedMatrix,
      message: 'Variant matrix synced successfully'
    }, 'Variant matrix synced successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock level for a specific variant
 * PUT /api/v1/products/:product_id/variants/:variant_id/stock
 */
const updateVariantStockLevel = async (req, res, next) => {
  try {
    const { product_id, variant_id } = req.params;
    const { stockLevel } = req.body;
    const tenantId = getTenantId(req);

    if (stockLevel === undefined || stockLevel === null) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.BAD_REQUEST, 'stockLevel is required');
    }

    // Verify product exists
    const product = await productService.getProductById(product_id, tenantId);
    if (!product) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const result = await variantInventoryService.updateStockLevel(variant_id, stockLevel);

    // Clear cache
    await clearProductsCache();

    return successResponse(res, result, 'Stock level updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock variants
 * GET /api/v1/products/variants/low-stock
 */
const getLowStockVariants = async (req, res, next) => {
  try {
    const { threshold = 5 } = req.query;

    const variantInventoryService = require('../services/variant-inventory.service').variantInventoryService;
    const lowStockVariants = await variantInventoryService.getLowStockVariants(parseInt(threshold, 10));

    return successResponse(res, lowStockVariants, 'Low stock variants retrieved successfully');
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
  getVariantMatrix,
  getProductColors,
  getProductSizes,
  getVariantStock,
  validateVariantStock,
  syncVariantMatrix,
  updateVariantStockLevel,
  getLowStockVariants,
};
