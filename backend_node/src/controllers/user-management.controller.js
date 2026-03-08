/**
 * User Role Management Controller
 * Handles user role assignment and management
 */

const httpStatus = require('http-status');
const userRoleManagementService = require('../services/user-role-management.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const User = require('../models/user.model');

/**
 * Get tenant ID from request
 */
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 1;
};

/**
 * Get all users with their roles
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const users = await userRoleManagementService.getUsersWithRoles(tenantId);
        return successResponse(res, users);
    } catch (error) {
        next(error);
    }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
    try {
        const user = await userRoleManagementService.getUserByMongoId(req.params.id);
        
        if (!user) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
        }

        return successResponse(res, user);
    } catch (error) {
        next(error);
    }
};

/**
 * Sync user mapping (create mysql_users entry for MongoDB user)
 * POST /api/v1/users/sync
 */
const syncUserMapping = async (req, res, next) => {
    try {
        const { mongoUserId, tenantId } = req.body;

        if (!mongoUserId) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'mongoUserId is required'));
        }

        const tenant = tenantId || getTenantId(req);
        const mongoUser = await User.findById(mongoUserId);

        if (!mongoUser) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'MongoDB user not found'));
        }

        const mysqlUserId = await userRoleManagementService.syncUserMapping(mongoUser, tenant);
        
        return successResponse(res, { 
            mongo_user_id: mongoUserId, 
            mysql_user_id: mysqlUserId 
        }, 'User mapping created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Assign role to user
 * POST /api/v1/users/:userId/roles
 */
const assignRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { roleId, tenantId } = req.body;

        if (!roleId) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'roleId is required'));
        }

        const tenant = tenantId || getTenantId(req);
        const result = await userRoleManagementService.assignRoleToUser(userId, roleId, tenant);

        return successResponse(res, result, 'Role assigned successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Assign multiple roles to user
 * POST /api/v1/users/:userId/roles/multiple
 */
const assignMultipleRoles = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { roleIds, tenantId } = req.body;

        if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'roleIds array is required'));
        }

        const tenant = tenantId || getTenantId(req);
        const result = await userRoleManagementService.assignMultipleRoles(userId, roleIds, tenant);

        return successResponse(res, result, 'Roles assigned successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Remove role from user
 * DELETE /api/v1/users/:userId/roles/:roleId
 */
const removeRole = async (req, res, next) => {
    try {
        const { userId, roleId } = req.params;
        const { tenantId } = req.body;

        const tenant = tenantId || getTenantId(req);
        await userRoleManagementService.removeRoleFromUser(userId, roleId, tenant);

        return successResponse(res, null, 'Role removed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all available roles
 * GET /api/v1/users/roles
 */
const getRoles = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const roles = await userRoleManagementService.getAllRoles(tenantId);
        return successResponse(res, roles);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all available permissions
 * GET /api/v1/users/permissions
 */
const getPermissions = async (req, res, next) => {
    try {
        const permissions = await userRoleManagementService.getAllPermissions();
        return successResponse(res, permissions);
    } catch (error) {
        next(error);
    }
};

/**
 * Create custom role
 * POST /api/v1/users/roles
 */
const createRole = async (req, res, next) => {
    try {
        const { name, description, permissionIds } = req.body;
        const tenantId = getTenantId(req);

        if (!name) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Role name is required'));
        }

        const roleId = await userRoleManagementService.createCustomRole(
            name,
            description || '',
            permissionIds || [],
            tenantId
        );

        return successResponse(res, { id: roleId, name }, 'Role created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete custom role
 * DELETE /api/v1/users/roles/:id
 */
const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);

        await userRoleManagementService.deleteCustomRole(parseInt(id), tenantId);

        return successResponse(res, null, 'Role deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getUserById,
    syncUserMapping,
    assignRole,
    assignMultipleRoles,
    removeRole,
    getRoles,
    getPermissions,
    createRole,
    deleteRole,
};
