/**
 * User Role Management Service
 * Handles user role assignment and management
 */

const { Role, Permission, UserRoleService } = require('../models/rbac.model');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

class UserRoleManagementService {
    /**
     * Get all users with their roles for a tenant
     */
    async getUsersWithRoles(tenantId) {
        const users = await User.find({ tenantId: tenantId }).select('email name tenantId roles');
        
        return users.map(user => ({
            id: user._id,
            email: user.email,
            name: user.name,
            tenant_id: user.tenantId,
            roles: user.roles || [],
            role_ids: [] // IDs are not used in the simplified MongoDB roles model (uses names)
        }));
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        return User.findById(userId);
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        return User.findOne({ email });
    }

    /**
     * Assign role to user
     */
    async assignRoleToUser(userId, roleName, tenantId) {
        // Check if role exists
        const role = await Role.findByName(roleName);
        if (!role) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
        }

        const success = await UserRoleService.assignRoleToUser(userId, roleName, tenantId);
        if (!success) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to assign role');
        }

        return {
            user_id: userId,
            role: roleName,
            tenant_id: tenantId
        };
    }

    /**
     * Assign multiple roles to user
     */
    async assignMultipleRoles(userId, roleNames, tenantId) {
        // If current user is Admin and we are removing Admin role, check if it's the last one
        const user = await User.findById(userId);
        if (user && user.roles.includes('Admin') && !roleNames.includes('Admin')) {
            const adminCount = await User.countDocuments({ 
                tenantId: tenantId, 
                roles: 'Admin' 
            });
            
            if (adminCount <= 1) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove the last Admin of this tenant');
            }
        }

        const success = await UserRoleService.syncUserRoles(userId, roleNames, tenantId);
        if (!success) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to sync roles');
        }

        return {
            user_id: userId,
            roles: roleNames,
            tenant_id: tenantId
        };
    }

    /**
     * Remove role from user
     */
    async removeRoleFromUser(userId, roleName, tenantId) {
        if (roleName === 'Admin') {
            const adminCount = await User.countDocuments({ 
                tenantId: tenantId, 
                roles: 'Admin' 
            });
            
            if (adminCount <= 1) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove the last Admin of this tenant');
            }
        }
        
        return UserRoleService.removeRoleFromUser(userId, roleName, tenantId);
    }

    /**
     * Get all available roles
     */
    async getAllRoles(tenantId) {
        const roles = await Role.findByTenant(tenantId);
        
        // Get permissions for each role
        const rolesWithPermissions = await Promise.all(
            roles.map(async (role) => {
                const permissions = await UserRoleService.getPermissionsForUser(role._id, tenantId);
                return {
                    id: role._id,
                    name: role.name,
                    description: role.description,
                    isSystemRole: role.isSystemRole,
                    permissions: role.permissions || []
                };
            })
        );

        return rolesWithPermissions;
    }

    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        return await Permission.findAll();
    }

    /**
     * Create custom role
     */
    async createCustomRole(name, description, permissionNames, tenantId) {
        // Check if role already exists
        const existing = await Role.findByName(name);
        if (existing) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Role already exists');
        }

        // Create role
        const roleId = await Role.create({
            name,
            description,
            tenantId,
            isSystemRole: false
        });

        // Assign permissions
        if (permissionNames && permissionNames.length > 0) {
            await Role.findByIdAndUpdate(roleId, {
                $set: { permissions: permissionNames }
            });
        }

        return roleId;
    }

    /**
     * Delete custom role
     */
    async deleteCustomRole(roleId, tenantId) {
        const role = await Role.findById(roleId);
        if (!role) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
        }

        if (role.isSystemRole) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete system roles');
        }

        await Role.findByIdAndDelete(roleId);
        return true;
    }
}

module.exports = new UserRoleManagementService();
