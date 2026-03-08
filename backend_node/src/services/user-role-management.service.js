/**
 * User Role Management Service
 * Handles user role assignment and management
 */

const { mysqlPool } = require('../config/db');
const { Role, UserRoleService } = require('../models/rbac.model');
const User = require('../models/user.model');

class UserRoleManagementService {
    /**
     * Get all users with their roles for a tenant
     */
    async getUsersWithRoles(tenantId) {
        const [users] = await mysqlPool.query(
            `SELECT 
                mu.id as mysql_user_id,
                mu.mongo_user_id,
                mu.email,
                mu.name,
                mu.tenant_id,
                GROUP_CONCAT(r.name) as roles,
                GROUP_CONCAT(r.id) as role_ids
            FROM mysql_users mu
            LEFT JOIN user_roles ur ON mu.id = ur.user_id AND ur.tenant_id = mu.tenant_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE mu.tenant_id = ?
            GROUP BY mu.id, mu.mongo_user_id, mu.email, mu.name, mu.tenant_id`,
            [tenantId]
        );

        return users.map(user => ({
            mysql_user_id: user.mysql_user_id,
            mongo_user_id: user.mongo_user_id,
            email: user.email,
            name: user.name,
            tenant_id: user.tenant_id,
            roles: user.roles ? user.roles.split(',') : [],
            role_ids: user.role_ids ? user.role_ids.split(',').map(Number) : []
        }));
    }

    /**
     * Get user by MongoDB ID
     */
    async getUserByMongoId(mongoUserId) {
        const [users] = await mysqlPool.query(
            'SELECT * FROM mysql_users WHERE mongo_user_id = ?',
            [mongoUserId]
        );
        return users[0] || null;
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        const [users] = await mysqlPool.query(
            'SELECT * FROM mysql_users WHERE email = ?',
            [email]
        );
        return users[0] || null;
    }

    /**
     * Create or update mysql_users mapping for MongoDB user
     */
    async syncUserMapping(mongoUser, tenantId) {
        const existing = await this.getUserByMongoId(mongoUser.id);

        if (existing) {
            // Update existing mapping
            await mysqlPool.query(
                'UPDATE mysql_users SET email = ?, name = ?, tenant_id = ? WHERE mongo_user_id = ?',
                [mongoUser.email, mongoUser.name || mongoUser.email, tenantId, mongoUser.id]
            );
            return existing.id;
        }

        // Create new mapping
        const [result] = await mysqlPool.query(
            'INSERT INTO mysql_users (mongo_user_id, email, name, tenant_id) VALUES (?, ?, ?, ?)',
            [mongoUser.id, mongoUser.email, mongoUser.name || mongoUser.email, tenantId]
        );

        // Assign default Customer role
        const customerRole = await Role.findByName('Customer');
        if (customerRole) {
            await mysqlPool.query(
                'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
                [result.insertId, customerRole.id, tenantId]
            );
        }

        return result.insertId;
    }

    /**
     * Assign role to user
     */
    async assignRoleToUser(userId, roleId, tenantId) {
        // Check if role exists
        const role = await Role.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        // Check if user exists
        const user = await this.getUserByMongoId(userId);
        if (!user) {
            // Create user mapping first
            const mongoUser = await User.findById(userId);
            if (!mongoUser) {
                throw new Error('User not found');
            }
            await this.syncUserMapping(mongoUser, tenantId);
        }

        // Get mysql_user_id
        const mysqlUser = await this.getUserByMongoId(userId);
        
        // Remove existing roles for this tenant
        await mysqlPool.query(
            'DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?',
            [mysqlUser.id, tenantId]
        );

        // Assign new role
        const [result] = await mysqlPool.query(
            'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
            [mysqlUser.id, roleId, tenantId]
        );

        return {
            user_id: userId,
            mysql_user_id: mysqlUser.id,
            role_id: roleId,
            tenant_id: tenantId
        };
    }

    /**
     * Assign multiple roles to user
     */
    async assignMultipleRoles(userId, roleIds, tenantId) {
        // Get mysql_user_id
        const mysqlUser = await this.getUserByMongoId(userId);
        if (!mysqlUser) {
            throw new Error('User not found in mysql_users mapping');
        }

        // Remove existing roles
        await mysqlPool.query(
            'DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?',
            [mysqlUser.id, tenantId]
        );

        // Assign new roles
        const values = roleIds.map(roleId => [mysqlUser.id, roleId, tenantId]);
        await mysqlPool.query(
            'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ?',
            [values]
        );

        return {
            user_id: userId,
            mysql_user_id: mysqlUser.id,
            role_ids: roleIds,
            tenant_id: tenantId
        };
    }

    /**
     * Remove role from user
     */
    async removeRoleFromUser(userId, roleId, tenantId) {
        const mysqlUser = await this.getUserByMongoId(userId);
        if (!mysqlUser) {
            throw new Error('User not found');
        }

        await mysqlPool.query(
            'DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND tenant_id = ?',
            [mysqlUser.id, roleId, tenantId]
        );

        return true;
    }

    /**
     * Get all available roles
     */
    async getAllRoles(tenantId) {
        const [roles] = await mysqlPool.query(
            'SELECT * FROM roles WHERE tenant_id IS NULL OR tenant_id = ? ORDER BY name',
            [tenantId]
        );

        // Get permissions for each role
        const rolesWithPermissions = await Promise.all(
            roles.map(async (role) => {
                const permissions = await UserRoleService.getPermissionsForRole(role.id);
                return {
                    ...role,
                    permissions: permissions.map(p => p.name)
                };
            })
        );

        return rolesWithPermissions;
    }

    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        const { Permission } = require('../models/rbac.model');
        return await Permission.findAll();
    }

    /**
     * Create custom role
     */
    async createCustomRole(name, description, permissionIds, tenantId) {
        // Check if role already exists
        const existing = await Role.findByName(name);
        if (existing) {
            throw new Error('Role already exists');
        }

        // Create role
        const roleId = await Role.create({
            name,
            description,
            tenantId,
            isSystemRole: false
        });

        // Assign permissions
        if (permissionIds && permissionIds.length > 0) {
            const { RolePermissionService } = require('../models/rbac.model');
            await RolePermissionService.assignPermissionsToRole(roleId, permissionIds);
        }

        return roleId;
    }

    /**
     * Delete custom role
     */
    async deleteCustomRole(roleId, tenantId) {
        const role = await Role.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        if (role.is_system_role) {
            throw new Error('Cannot delete system roles');
        }

        await mysqlPool.query(
            'DELETE FROM roles WHERE id = ? AND tenant_id = ?',
            [roleId, tenantId]
        );

        return true;
    }
}

module.exports = new UserRoleManagementService();
