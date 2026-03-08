/**
 * Tenant Controller
 * Handles multi-tenant API endpoints
 */

const httpStatus = require('http-status');
const tenantService = require('../services/tenant.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { mysqlPool } = require('../config/db');

/**
 * Create a new tenant
 * POST /api/v1/tenants
 * Requires: Admin role (system-level)
 */
const createTenant = async (req, res, next) => {
    try {
        const { name, domain, ownerEmail, ownerName, ownerPassword, settings } = req.body;

        // Validate required fields
        if (!name) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Tenant name is required'));
        }
        if (!ownerEmail) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Owner email is required'));
        }
        if (!ownerPassword) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Owner password is required'));
        }

        const tenant = await tenantService.createTenant({
            name,
            domain,
            ownerEmail,
            ownerName: ownerName || ownerEmail,
            ownerPassword,
            settings
        });

        return successResponse(
            res,
            tenant,
            'Tenant created successfully',
            httpStatus.CREATED
        );
    } catch (error) {
        // Handle duplicate domain error
        if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('duplicate')) {
            return next(new ApiError(httpStatus.CONFLICT, 'Tenant with this domain already exists'));
        }
        next(error);
    }
};

/**
 * Get current tenant info
 * GET /api/v1/tenants/current
 */
const getCurrentTenant = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const tenant = await tenantService.getTenantById(tenantId);

        if (!tenant) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'Tenant not found'));
        }

        return successResponse(res, tenant);
    } catch (error) {
        next(error);
    }
};

/**
 * Get tenant settings
 * GET /api/v1/tenants/settings
 */
const getTenantSettings = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const settings = await tenantService.getTenantSettings(tenantId);

        return successResponse(res, settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Update tenant setting
 * PUT /api/v1/tenants/settings/:key
 */
const updateTenantSetting = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Setting value is required'));
        }

        await tenantService.updateTenantSetting(tenantId, key, value);

        return successResponse(res, { key, value }, 'Setting updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all tenants (Admin only)
 * GET /api/v1/tenants
 */
const getAllTenants = async (req, res, next) => {
    try {
        const tenants = await tenantService.getAllTenants();
        return successResponse(res, tenants);
    } catch (error) {
        next(error);
    }
};

/**
 * Get tenant by ID
 * GET /api/v1/tenants/:id
 */
const getTenantById = async (req, res, next) => {
    try {
        const tenant = await tenantService.getTenantById(req.params.id);

        if (!tenant) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'Tenant not found'));
        }

        return successResponse(res, tenant);
    } catch (error) {
        next(error);
    }
};

/**
 * Update tenant
 * PUT /api/v1/tenants/:id
 */
const updateTenant = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Prevent updating critical fields via this endpoint
        delete updateData.owner_user_id;

        const result = await tenantService.updateTenant(id, updateData);

        if (!result) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'Tenant not found'));
        }

        return successResponse(res, { id, ...updateData }, 'Tenant updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get roles for current tenant
 * GET /api/v1/tenants/roles
 */
const getTenantRoles = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const roles = await tenantService.getTenantRoles(tenantId);

        return successResponse(res, roles);
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's roles in current tenant
 * GET /api/v1/tenants/my-roles
 */
const getMyRoles = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const userId = req.user?.id;

        // Get mysql_user_id from mongo_user_id mapping
        const [rows] = await require('../config/db').mysqlPool.query(
            'SELECT id FROM mysql_users WHERE mongo_user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            // Return default roles if user not in mysql_users
            return successResponse(res, { roles: ['Customer'] });
        }

        const mysqlUserId = rows[0].id;
        const roles = await tenantService.getUserRoles(mysqlUserId, tenantId);

        return successResponse(res, { roles });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTenant,
    getCurrentTenant,
    getTenantSettings,
    updateTenantSetting,
    getAllTenants,
    getTenantById,
    updateTenant,
    getTenantRoles,
    getMyRoles,
};
