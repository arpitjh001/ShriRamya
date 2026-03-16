/**
 * Tenant Routes
 * Multi-tenant management endpoints
 * 
 * IMPORTANT: Route ordering matters! Specific string routes MUST be defined
 * BEFORE parameterized routes like /:id to avoid route conflicts.
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../../controllers/tenant.controller');
const { auth, requireRole, ensureTenantIsolation } = require('../../middlewares/authRBAC');

/**
 * @route   POST /api/v1/tenants
 * @desc    Create a new tenant (system admin only)
 * @access  Public (or Admin only in production)
 */
router.post('/', 
    // In production, add: auth, requireRole('Admin')
    tenantController.createTenant
);

/**
 * @route   GET /api/v1/tenants
 * @desc    Get all tenants (system admin only)
 * @access  Private (Admin only)
 */
router.get('/', 
    auth, 
    requireRole('Admin'),
    tenantController.getAllTenants
);

/**
 * @route   GET /api/v1/tenants/current
 * @desc    Get current tenant info
 * @access  Private (All authenticated users)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/current', 
    auth,
    ensureTenantIsolation,
    tenantController.getCurrentTenant
);

/**
 * @route   GET /api/v1/tenants/settings
 * @desc    Get tenant settings
 * @access  Private (All authenticated users in tenant)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/settings', 
    auth,
    ensureTenantIsolation,
    tenantController.getTenantSettings
);

/**
 * @route   PUT /api/v1/tenants/settings/:key
 * @desc    Update tenant setting
 * @access  Private (Admin/Editor only)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.put('/settings/:key', 
    auth,
    requireRole('Admin'),
    tenantController.updateTenantSetting
);

/**
 * @route   GET /api/v1/tenants/roles
 * @desc    Get all roles for current tenant
 * @access  Private (All authenticated users)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/roles', 
    auth,
    tenantController.getTenantRoles
);

/**
 * @route   GET /api/v1/tenants/my-roles
 * @desc    Get current user's roles
 * @access  Private (All authenticated users)
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/my-roles', 
    auth,
    tenantController.getMyRoles
);

/**
 * @route   GET /api/v1/tenants/:id
 * @desc    Get tenant by ID (admin only)
 * @access  Private (Admin only)
 * NOTE: Parameterized route MUST come AFTER specific routes like /current, /settings, /roles
 */
router.get('/:id', 
    auth, 
    requireRole('Admin'),
    tenantController.getTenantById
);

/**
 * @route   PUT /api/v1/tenants/:id
 * @desc    Update tenant (admin only)
 * @access  Private (Admin only)
 */
router.put('/:id', 
    auth, 
    requireRole('Admin'),
    tenantController.updateTenant
);

module.exports = router;
