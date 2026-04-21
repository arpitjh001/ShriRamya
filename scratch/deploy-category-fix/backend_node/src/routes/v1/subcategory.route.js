const express = require('express');
const validate = require('../../middlewares/validate');
const subcategoryValidation = require('../../validations/subcategory.validation');
const subcategoryController = require('../../controllers/subcategory.controller');
const auth = require('../../middlewares/auth');
const { requireRole, ensureTenantIsolation, optionalTenantIsolation } = require('../../middlewares/authRBAC');

const router = express.Router();

// ─── Subcategory Groups (scoped to a category) ───
router.route('/categories/:categoryId/subcategories')
  .get(
    optionalTenantIsolation,
    validate(subcategoryValidation.categoryIdParam),
    subcategoryController.getGroupsByCategory
  )
  .post(
    auth(['admin', 'editor']),
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(subcategoryValidation.createGroup),
    subcategoryController.createGroup
  );

// ─── Group operations (by groupId) ───
router.route('/subcategories/groups/:groupId')
  .get(
    auth(['admin', 'editor']),
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(subcategoryValidation.groupIdParam),
    subcategoryController.getGroupDeletionImpact
  )
  .put(
    auth(['admin', 'editor']),
    validate(subcategoryValidation.updateGroup),
    subcategoryController.updateGroup
  )
  .delete(
    auth(['admin', 'editor']),
    validate(subcategoryValidation.groupIdParam),
    subcategoryController.deleteGroup
  );

// ─── Values (scoped to a group) ───
router.route('/subcategories/groups/:groupId/values')
  .post(
    auth(['admin', 'editor']),
    validate(subcategoryValidation.createValue),
    subcategoryController.createValue
  );

router.route('/subcategories/values/:valueId')
  .get(
    auth(['admin', 'editor']),
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    validate(subcategoryValidation.valueIdParam),
    subcategoryController.getValueDeletionImpact
  )
  .put(
    auth(['admin', 'editor']),
    validate(subcategoryValidation.updateValue),
    subcategoryController.updateValue
  )
  .delete(
    auth(['admin', 'editor']),
    validate(subcategoryValidation.valueIdParam),
    subcategoryController.deleteValue
  );

module.exports = router;
