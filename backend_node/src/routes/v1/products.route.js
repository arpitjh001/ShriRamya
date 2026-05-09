const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');
const recommendationController = require('../../controllers/recommendation.controller');
const reviewController = require('../../controllers/review.controller');
const { auth: authRBAC, requireRole, requirePermission, ensureTenantIsolation, optionalTenantIsolation, optionalAuth } = require('../../middlewares/authRBAC');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

router.get('/purge-soft-deleted', async (req, res) => {
  try {
    const Product = require('../../models/product.model');
    const result = await Product.deleteMany({ is_deleted: true });
    res.json({ success: true, message: `Purged ${result.deletedCount} soft-deleted products` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ---------- PRODUCTS ----------
 * All endpoints now enforce tenant isolation
 */

// Product reviews endpoints
router.get('/:product_id/reviews', reviewController.getProductReviews);
router.post('/:product_id/reviews', authRBAC, requireRole('Customer', 'Admin'), reviewController.createReview);

// Product recommendations endpoint (public or authenticated)
router.get('/:product_id/recommendations',
    optionalTenantIsolation,
    recommendationController.getProductRecommendations
);

// Product-category mapping endpoints
router.post('/:product_id/categories',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    productController.assignCategoriesToProduct
);

router.get('/:product_id/categories',
    optionalTenantIsolation,
    productController.getProductCategories
);

router.delete('/:product_id/categories/:category_id',
    authRBAC,
    requireRole('Admin'),
    ensureTenantIsolation,
    productController.removeCategoryFromProduct
);

// List products (public or authenticated)
router.get('/',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProducts),
    productController.getProducts
);

// Redirect to categories
router.get('/categories', (req, res) => res.redirect(301, '/api/v1/categories'));

// Get single product (public or authenticated)
router.get('/:product_id',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.getProduct
);

// Create product (Admin, Editor only)
router.post('/',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.createProduct),
    productController.createProduct
);

// Add variant (Admin, Editor only)
router.post('/:product_id/variants',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.addVariant),
    productController.addVariant
);

// Update variant (Admin, Editor only)
router.put('/:product_id/variants/:variant_id',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.updateVariant),
    productController.updateVariant
);

// Delete variant (Admin only - Editors cannot delete)
router.delete('/:product_id/variants/:variant_id',
    authRBAC,
    requireRole('Admin'),
    ensureTenantIsolation,
    validate(productValidation.deleteVariant),
    productController.deleteVariant
);

// Update product (Admin, Editor only)
router.put('/:product_id',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.updateProduct),
    productController.updateProduct
);

// Delete product (Admin only - Editors cannot delete)
router.delete('/:product_id',
    authRBAC,
    requireRole('Admin'),
    ensureTenantIsolation,
    productController.deleteProduct
);

// Bulk delete products (Admin only)
router.post('/bulk-delete',
    authRBAC,
    requireRole('Admin'),
    ensureTenantIsolation,
    validate(productValidation.deleteProductsBulk),
    productController.deleteProductsBulk
);

// ========== VARIANT MATRIX ENDPOINTS ==========

// Get variant matrix for a product (Color x Size grid)
router.get('/:product_id/variants/matrix',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.getVariantMatrix
);

// Get available colors for a product
router.get('/:product_id/variants/colors',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.getProductColors
);

// Get available sizes for a product (optionally filtered by color)
router.get('/:product_id/variants/sizes',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.getProductSizes
);

// Get stock for a specific variant
router.get('/:product_id/variants/stock',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.getVariantStock
);

// Validate stock availability for a variant
router.get('/:product_id/variants/validate-stock',
    optionalAuth,
    optionalTenantIsolation,
    validate(productValidation.getProduct),
    productController.validateVariantStock
);

// Sync variant matrix for a product (bulk create/update) - Admin only
router.put('/:product_id/variants/matrix',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.syncVariantMatrix),
    productController.syncVariantMatrix
);

// Update stock level for a specific variant - Admin only
router.put('/:product_id/variants/:variant_id/stock',
    authRBAC,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.updateVariantStock),
    productController.updateVariantStockLevel
);

// Get low stock variants across all products - Admin only
router.get('/variants/low-stock',
    authRBAC,
    requireRole('Admin', 'InventoryManager'),
    ensureTenantIsolation,
    productController.getLowStockVariants
);

module.exports = router;
