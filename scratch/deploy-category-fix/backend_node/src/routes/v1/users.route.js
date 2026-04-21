/**
 * User Management Routes
 * User role assignment and management endpoints
 */

const express = require('express');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const router = express.Router();
const userManagementController = require('../../controllers/user-management.controller');
const { auth, requireRole, ensureTenantIsolation } = require('../../middlewares/authRBAC');

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with roles for tenant
 * @access  Private (Admin only)
 */
router.get('/',
    auth,
    requireRole('Admin'),
    ensureTenantIsolation,
    validate(userValidation.getUsers),
    userManagementController.getUsers
);

/**
 * @route   GET /api/v1/users/roles
 * @desc    Get all available roles
 * @access  Private (Admin, Editor)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/roles',
    auth,
    requireRole('Admin', 'Editor'),
    userManagementController.getRoles
);

/**
 * @route   GET /api/v1/users/permissions
 * @desc    Get all available permissions
 * @access  Private (Admin, Editor)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/permissions',
    auth,
    userManagementController.getPermissions
);

/**
 * @route   POST /api/v1/users/sync
 * @desc    Sync MongoDB user with mysql_users mapping
 * @access  Private (Admin only)
 */
router.post('/sync',
    auth,
    requireRole('Admin'),
    validate(userValidation.syncUserMapping),
    userManagementController.syncUserMapping
);

/**
 * @route   POST /api/v1/users/roles
 * @desc    Create custom role
 * @access  Private (Admin only)
 * NOTE: POST route defined before /:id pattern
 */
router.post('/roles',
    auth,
    requireRole('Admin'),
    validate(userValidation.createRole),
    userManagementController.createRole
);

/**
 * @route   DELETE /api/v1/users/roles/:id
 * @desc    Delete custom role
 * @access  Private (Admin only)
 * NOTE: Specific path defined before /:id pattern
 */
router.delete('/roles/:id',
    auth,
    requireRole('Admin'),
    validate(userValidation.deleteRole),
    userManagementController.deleteRole
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by MongoDB ID
 * @access  Private (Admin only)
 * NOTE: Parameterized route must come AFTER specific routes like /roles, /permissions
 */
router.get('/:id',
    auth,
    requireRole('Admin'),
    validate(userValidation.mongoUserId),
    userManagementController.getUserById
);

/**
 * @route   POST /api/v1/users/:userId/roles
 * @desc    Assign single role to user
 * @access  Private (Admin only)
 */
router.post('/:userId/roles',
    auth,
    requireRole('Admin'),
    validate(userValidation.assignRole),
    userManagementController.assignRole
);

/**
 * @route   POST /api/v1/users/:userId/roles/multiple
 * @desc    Assign multiple roles to user
 * @access  Private (Admin only)
 */
router.post('/:userId/roles/multiple',
    auth,
    requireRole('Admin'),
    validate(userValidation.assignMultipleRoles),
    userManagementController.assignMultipleRoles
);

/**
 * @route   DELETE /api/v1/users/:userId/roles/:roleId
 * @desc    Remove role from user
 * @access  Private (Admin only)
 */
router.delete('/:userId/roles/:roleId',
    auth,
    requireRole('Admin'),
    validate(userValidation.removeRole),
    userManagementController.removeRole
);

module.exports = router;
