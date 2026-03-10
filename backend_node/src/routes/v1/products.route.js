const express = require('express');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');
const recommendationController = require('../../controllers/recommendation.controller');
const { auth, requireRole, requirePermission, ensureTenantIsolation, optionalTenantIsolation, optionalAuth } = require('../../middlewares/authRBAC');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

/**
 * ---------- PRODUCTS ----------
 * All endpoints now enforce tenant isolation
 */

// Product recommendations endpoint (public or authenticated)
router.get('/:product_id/recommendations',
    optionalTenantIsolation,
    recommendationController.getProductRecommendations
);

// Product-category mapping endpoints
router.post('/:product_id/categories',
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    productController.assignCategoriesToProduct
);

router.get('/:product_id/categories',
    optionalTenantIsolation,
    productController.getProductCategories
);

router.delete('/:product_id/categories/:category_id',
    auth,
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
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.createProduct),
    productController.createProduct
);

// Add variant (Admin, Editor only)
router.post('/:product_id/variants',
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.addVariant),
    productController.addVariant
);

// Update variant (Admin, Editor only)
router.put('/:product_id/variants/:variant_id',
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.updateVariant),
    productController.updateVariant
);

// Delete variant (Admin only - Editors cannot delete)
router.delete('/:product_id/variants/:variant_id',
    auth,
    requireRole('Admin'),
    ensureTenantIsolation,
    validate(productValidation.deleteVariant),
    productController.deleteVariant
);

// Update product (Admin, Editor only)
router.put('/:product_id',
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(productValidation.updateProduct),
    productController.updateProduct
);

// Delete product (Admin only - Editors cannot delete)
router.delete('/:product_id',
    auth,
    requireRole('Admin'),
    ensureTenantIsolation,
    productController.deleteProduct
);

module.exports = router;
