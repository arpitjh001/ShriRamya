const express = require('express');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const promoBarValidation = require('../../validations/promoBar.validation');
const categoryController = require('../../controllers/category.controller');
const promoBarController = require('../../controllers/promoBar.controller');
const { optionalAuth, optionalTenantIsolation } = require('../../middlewares/authRBAC');

const router = express.Router();

// Get filter options (e.g. fabrics) for a category slug
router.route('/categories/:categorySlug/filters')
    .get(
        optionalAuth,
        optionalTenantIsolation,
        validate(categoryValidation.categoryFilters),
        categoryController.getCategoryFilters
    );

router
    .route('/promo-bar')
    .get(
        validate(promoBarValidation.storefrontPromoBar),
        promoBarController.getStorefrontPromoBar
    );

module.exports = router;
