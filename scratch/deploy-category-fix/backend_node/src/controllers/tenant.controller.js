/**
 * Tenant Controller
 * Handles multi-tenant API endpoints with Mongoose
 */

const httpStatus = require('http-status');
const tenantService = require('../services/tenant.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { Tenant, User } = require('../models');

/**
 * Create a new tenant
 */
const createTenant = async (req, res, next) => {
    try {
        const { name, domain, ownerEmail, ownerName, ownerPassword, settings } = req.body;

        if (!name || !ownerEmail || !ownerPassword) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
        }

        const tenant = await tenantService.createTenant({
            name,
            domain,
            ownerEmail,
            ownerName: ownerName || ownerEmail,
            ownerPassword,
            settings
        });

        return successResponse(res, tenant, 'Tenant created successfully', httpStatus.CREATED);
    } catch (error) {
        if (error.code === 11000) {
            return next(new ApiError(httpStatus.CONFLICT, 'Tenant with this domain already exists'));
        }
        next(error);
    }
};

/**
 * Get current tenant info
 */
const getCurrentTenant = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 'default';
        const tenant = await tenantService.getTenantById(tenantId);

        if (!tenant) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
        }

        return successResponse(res, tenant);
    } catch (error) {
        next(error);
    }
};

/**
 * Update tenant setting
 */
const updateTenantSetting = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 'default';
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Setting value is required');
        }

        await tenantService.updateTenantSetting(tenantId, key, value);
        return successResponse(res, { key, value }, 'Setting updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all tenants (Admin only)
 */
const getAllTenants = async (req, res, next) => {
    try {
        const tenants = await Tenant.find({}).sort({ createdAt: -1 });
        return successResponse(res, tenants);
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's roles in current tenant
 */
const getMyRoles = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const tenantId = req.tenantId || req.user?.tenantId || 'default';
        
        if (userId) {
            const roles = await tenantService.getUserRoles(userId, tenantId);
            return successResponse(res, { roles });
        }
        
        const defaultRoles = req.user?.roles || ['Customer'];
        return successResponse(res, { roles: defaultRoles });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all roles for a tenant
 */
const getTenantRoles = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 'default';
        const roles = await tenantService.getTenantRoles(tenantId);
        return successResponse(res, roles);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTenant,
    getCurrentTenant,
    updateTenantSetting,
    getAllTenants,
    getMyRoles,
    getTenantRoles,
    // Add other methods if needed or proxy to service
    getTenantSettings: async (req, res, next) => {
        try {
            const tenantId = req.tenantId || req.user?.tenantId || 'default';
            const settings = await tenantService.getTenantSettings(tenantId);
            return successResponse(res, settings);
        } catch (e) { next(e); }
    },
    getTenantById: async (req, res, next) => {
        try {
            const tenant = await Tenant.findById(req.params.id);
            return successResponse(res, tenant);
        } catch (e) { next(e); }
    },
    updateTenant: async (req, res, next) => {
        try {
            const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
            return successResponse(res, tenant);
        } catch (e) { next(e); }
    }
};
