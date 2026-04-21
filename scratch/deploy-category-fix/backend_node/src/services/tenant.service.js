const { Role, UserRoleService, Tenant, TenantSettingsService } = require('../models/rbac.model');
const { User } = require('../models');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

class TenantService {
    /**
     * Create a new tenant with owner user
     */
    async createTenant(data) {
        try {
            const {
                name,
                domain,
                ownerEmail,
                ownerName,
                ownerPassword,
                settings = {}
            } = data;

            // 1. Create the tenant in MongoDB
            const tenant = await Tenant.create({
                name,
                domain,
                status: 'active',
                settings: settings
            });

            // 2. Find or Create owner user in MongoDB
            let owner = await User.findOne({ email: ownerEmail });
            
            if (!owner) {
                const hashedPassword = await bcrypt.hash(ownerPassword, 8);
                owner = await User.create({
                    email: ownerEmail,
                    name: ownerName,
                    password: hashedPassword,
                    tenant_id: tenant._id,
                    role: 'admin',
                    roles: ['Admin']
                });
            } else {
                // Update existing user with tenant info if needed
                owner.tenant_id = tenant._id;
                if (!owner.roles.includes('Admin')) {
                    owner.roles.push('Admin');
                }
                await owner.save();
            }

            // 3. Update tenant with ownerUserId
            await Tenant.findByIdAndUpdate(tenant._id, {
                $set: { ownerUserId: owner._id }
            });

            // 4. Ensure Admin role exists for this tenant
            let adminRole = await Role.findByName('Admin');
            if (!adminRole) {
                // System roles are usually global, but we can ensure it here
                await Role.create({
                    name: 'Admin',
                    description: 'Full administrative access',
                    tenantId: tenant._id,
                    isSystemRole: true
                });
            }

            // 5. Setup default settings if not provided
            if (!settings.store_info) {
                await TenantSettingsService.setSetting(tenant._id, 'store_info', {
                    name,
                    currency: 'INR',
                    timezone: 'Asia/Kolkata'
                });
            }

            return {
                id: tenant._id,
                name,
                domain,
                ownerUserId: owner._id,
                ownerEmail
            };
        } catch (error) {
            console.error('[TenantService] createTenant error:', error.message);
            throw error;
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
    async assignRoleToUser(userId, roleName, tenantId) {
        return UserRoleService.assignRoleToUser(userId, roleName, tenantId);
    }

    /**
     * Remove role from user in tenant
     */
    async removeRoleFromUser(userId, roleName, tenantId) {
        return UserRoleService.removeRoleFromUser(userId, roleName, tenantId);
    }
}

module.exports = new TenantService();
