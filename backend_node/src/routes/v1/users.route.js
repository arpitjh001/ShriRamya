/**
 * User Management Routes
 * User role assignment and management endpoints
 */

const express = require('express');
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
    userManagementController.getUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by MongoDB ID
 * @access  Private (Admin only)
 */
router.get('/:id', 
    auth,
    requireRole('Admin'),
    userManagementController.getUserById
);

/**
 * @route   POST /api/v1/users/sync
 * @desc    Sync MongoDB user with mysql_users mapping
 * @access  Private (Admin only)
 */
router.post('/sync', 
    auth,
    requireRole('Admin'),
    userManagementController.syncUserMapping
);

/**
 * @route   POST /api/v1/users/:userId/roles
 * @desc    Assign single role to user
 * @access  Private (Admin only)
 */
router.post('/:userId/roles', 
    auth,
    requireRole('Admin'),
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
    userManagementController.removeRole
);

/**
 * @route   GET /api/v1/users/roles
 * @desc    Get all available roles
 * @access  Private (Admin, Editor)
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
 */
router.get('/permissions', 
    auth,
    userManagementController.getPermissions
);

/**
 * @route   POST /api/v1/users/roles
 * @desc    Create custom role
 * @access  Private (Admin only)
 */
router.post('/roles', 
    auth,
    requireRole('Admin'),
    userManagementController.createRole
);

/**
 * @route   DELETE /api/v1/users/roles/:id
 * @desc    Delete custom role
 * @access  Private (Admin only)
 */
router.delete('/roles/:id', 
    auth,
    requireRole('Admin'),
    userManagementController.deleteRole
);

module.exports = router;
