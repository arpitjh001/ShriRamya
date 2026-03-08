/**
 * Tenant Service
 * Handles multi-tenant operations
 */

const { Tenant, TenantSettingsService, UserRoleService, Role } = require('../models/rbac.model');
const { mysqlPool } = require('../config/db');
const bcrypt = require('bcryptjs');

class TenantService {
    /**
     * Create a new tenant with owner user
     */
    async createTenant(data) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                name,
                domain,
                ownerEmail,
                ownerName,
                ownerPassword,
                settings = {}
            } = data;

            // 1. Create the tenant
            const tenantId = await Tenant.create({
                name,
                domain,
                ownerUserId: null, // Will update after creating user
                status: 'active',
                settings
            });

            // 2. Create owner user in mysql_users (for RBAC)
            // Note: Actual authentication still happens via MongoDB
            const hashedPassword = await bcrypt.hash(ownerPassword, 8);
            
            // First check if email exists
            const [existingUsers] = await connection.query(
                'SELECT id FROM mysql_users WHERE email = ?',
                [ownerEmail]
            );

            let ownerUserId;
            if (existingUsers.length > 0) {
                ownerUserId = existingUsers[0].id;
            } else {
                const [userResult] = await connection.query(
                    'INSERT INTO mysql_users (email, name, tenant_id) VALUES (?, ?, ?)',
                    [ownerEmail, ownerName, tenantId]
                );
                ownerUserId = userResult.insertId;
            }

            // 3. Update tenant with owner_user_id
            await connection.query(
                'UPDATE tenants SET owner_user_id = ? WHERE id = ?',
                [ownerUserId, tenantId]
            );

            // 4. Assign Admin role to owner
            const adminRole = await Role.findByName('Admin');
            if (adminRole) {
                await UserRoleService.assignRoleToUser(ownerUserId, adminRole.id, tenantId);
            }

            // 5. Create default tenant settings
            await TenantSettingsService.setSetting(tenantId, 'store_info', {
                name,
                currency: 'INR',
                timezone: 'Asia/Kolkata'
            });

            await TenantSettingsService.setSetting(tenantId, 'feature_flags', {
                enable_reviews: true,
                enable_coupons: true,
                enable_blog: true
            });

            await connection.commit();

            return {
                id: tenantId,
                name,
                domain,
                ownerUserId,
                ownerEmail
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get tenant by ID
     */
    async getTenantById(id) {
        return Tenant.findById(id);
    }

    /**
     * Get tenant by domain
     */
    async getTenantByDomain(domain) {
        return Tenant.findByDomain(domain);
    }

    /**
     * Get all active tenants
     */
    async getAllTenants() {
        return Tenant.findAll();
    }

    /**
     * Update tenant
     */
    async updateTenant(id, data) {
        return Tenant.update(id, data);
    }

    /**
     * Get tenant settings
     */
    async getTenantSettings(tenantId) {
        return TenantSettingsService.getAllSettings(tenantId);
    }

    /**
     * Update tenant setting
     */
    async updateTenantSetting(tenantId, key, value) {
        return TenantSettingsService.setSetting(tenantId, key, value);
    }

    /**
     * Get roles for a tenant
     */
    async getTenantRoles(tenantId) {
        return Role.findByTenant(tenantId);
    }

    /**
     * Get user's roles in a tenant
     */
    async getUserRoles(userId, tenantId) {
        return UserRoleService.getRolesForUser(userId, tenantId);
    }

    /**
     * Assign role to user in tenant
     */
    async assignRoleToUser(userId, roleId, tenantId) {
        return UserRoleService.assignRoleToUser(userId, roleId, tenantId);
    }

    /**
     * Remove role from user in tenant
     */
    async removeRoleFromUser(userId, roleId, tenantId) {
        return UserRoleService.removeRoleFromUser(userId, roleId, tenantId);
    }
}

module.exports = new TenantService();
