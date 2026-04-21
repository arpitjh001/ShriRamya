const { Role, Permission, Tenant, User } = require('./index');
const mongoose = require('mongoose');

/**
 * Role Model Wrapper
 */
class RoleWrapper {
    static async findById(id) {
        return Role.findById(id);
    }

    static async findByName(name) {
        return Role.findOne({ name });
    }

    static async findByTenant(tenantId) {
        return Role.find({ 
            $or: [{ tenantId }, { isSystemRole: true }] 
        });
    }

    static async create(data) {
        const { name, description, tenantId, isSystemRole = false } = data;
        const role = await Role.create({
            name,
            description,
            tenantId,
            isSystemRole
        });
        return role._id;
    }
}

/**
 * Permission Model Wrapper
 */
class PermissionWrapper {
    static async findById(id) {
        return Permission.findById(id);
    }

    static async findByName(name) {
        return Permission.findOne({ name });
    }

    static async findAll() {
        return Permission.find({}).sort({ resource: 1, name: 1 });
    }

    static async findByResource(resource) {
        return Permission.find({ resource });
    }
}

/**
 * Role-Permission Service
 */
class RolePermissionService {
    static async getPermissionsForRole(roleId) {
        const role = await Role.findById(roleId);
        if (!role) return [];
        // In the new model, permissions are names in the role.permissions array
        // We return the Permission objects for compatibility
        return Permission.find({ name: { $in: role.permissions || [] } });
    }

    static async getPermissionNamesForRole(roleId) {
        const role = await Role.findById(roleId);
        return role ? role.permissions || [] : [];
    }

    static async assignPermissionsToRole(roleId, permissionNames) {
        // Handle input which might be IDs or names
        // But the new model uses names for simplicity in roles
        await Role.findByIdAndUpdate(roleId, {
            $set: { permissions: permissionNames }
        });
        return true;
    }

    static async addPermissionToRole(roleId, permissionName) {
        await Role.findByIdAndUpdate(roleId, {
            $addToSet: { permissions: permissionName }
        });
        return true;
    }

    static async removePermissionFromRole(roleId, permissionName) {
        await Role.findByIdAndUpdate(roleId, {
            $pull: { permissions: permissionName }
        });
        return true;
    }
}

/**
 * User-Role Service
 */
class UserRoleService {
    static async getRolesForUser(userId, tenantId) {
        const user = await User.findById(userId);
        if (!user) return [];
        
        // Find Role objects that match the names in user.roles
        return Role.find({ 
            name: { $in: user.roles || [] },
            $or: [{ tenantId }, { isSystemRole: true }]
        });
    }

    static async getRoleNamesForUser(userId, tenantId) {
        const user = await User.findById(userId);
        return user ? user.roles || [] : [];
    }

    static async assignRoleToUser(userId, roleName, tenantId) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { roles: roleName }
        });
        return true;
    }

    static async removeRoleFromUser(userId, roleName, tenantId) {
        await User.findByIdAndUpdate(userId, {
            $pull: { roles: roleName }
        });
        return true;
    }

    static async syncUserRoles(userId, roleNames, tenantId) {
        await User.findByIdAndUpdate(userId, {
            $set: { roles: roleNames }
        });
        return true;
    }

    static async hasRole(userId, roleName, tenantId) {
        const user = await User.findOne({
            _id: userId,
            roles: roleName
            // Note: tenantId check could be added if roles are scoped strictly
        });
        return !!user;
    }

    static async hasPermission(userId, permissionName, tenantId) {
        const user = await User.findById(userId);
        if (!user) return false;

        // Check if user has explicit permission
        if (user.permissions && user.permissions.includes(permissionName)) return true;

        // Check if any of user's roles have the permission
        const roles = await Role.find({ 
            name: { $in: user.roles || [] },
            permissions: permissionName
        });
        
        return roles.length > 0;
    }

    static async getPermissionsForUser(userId, tenantId) {
        const user = await User.findById(userId);
        if (!user) return [];

        let allPermissions = user.permissions || [];
        
        const roles = await Role.find({ name: { $in: user.roles || [] } });
        roles.forEach(role => {
            if (role.permissions) {
                allPermissions = [...allPermissions, ...role.permissions];
            }
        });

        const uniquePermissionNames = [...new Set(allPermissions)];
        return Permission.find({ name: { $in: uniquePermissionNames } });
    }

    static async getPermissionNamesForUser(userId, tenantId) {
        const user = await User.findById(userId);
        if (!user) return [];

        let allPermissions = user.permissions || [];
        
        const roles = await Role.find({ name: { $in: user.roles || [] } });
        roles.forEach(role => {
            if (role.permissions) {
                allPermissions = [...allPermissions, ...role.permissions];
            }
        });

        return [...new Set(allPermissions)];
    }
}

/**
 * Tenant Model Wrapper
 */
class TenantWrapper {
    static async findById(id) {
        return Tenant.findById(id);
    }

    static async findByDomain(domain) {
        return Tenant.findOne({ domain });
    }

    static async findAll() {
        return Tenant.find({ status: 'active' });
    }

    static async create(data) {
        return Tenant.create(data);
    }

    static async update(id, data) {
        return Tenant.findByIdAndUpdate(id, { $set: data }, { new: true });
    }

    static async delete(id) {
        return Tenant.findByIdAndDelete(id);
    }
}

/**
 * Tenant Settings Service
 */
class TenantSettingsService {
    static async getSetting(tenantId, key) {
        const tenant = await Tenant.findById(tenantId);
        return tenant && tenant.settings ? tenant.settings.get(key) : null;
    }

    static async getAllSettings(tenantId) {
        const tenant = await Tenant.findById(tenantId);
        return tenant ? Object.fromEntries(tenant.settings || new Map()) : {};
    }

    static async setSetting(tenantId, key, value) {
        // Validate and sanitize key to prevent NoSQL injection
        if (typeof key !== 'string' || !key.match(/^[a-zA-Z0-9_-]+$/)) {
            throw new Error('Invalid setting key format');
        }
        
        // Validate tenantId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(tenantId)) {
            throw new Error('Invalid tenant ID');
        }
        
        const update = {};
        update[`settings.${key}`] = value;
        await Tenant.findByIdAndUpdate(tenantId, { $set: update });
        return true;
    }

    static async deleteSetting(tenantId, key) {
        // Validate and sanitize key to prevent NoSQL injection
        if (typeof key !== 'string' || !key.match(/^[a-zA-Z0-9_-]+$/)) {
            throw new Error('Invalid setting key format');
        }
        
        // Validate tenantId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(tenantId)) {
            throw new Error('Invalid tenant ID');
        }
        
        const update = {};
        update[`settings.${key}`] = 1;
        await Tenant.findByIdAndUpdate(tenantId, { $unset: update });
        return true;
    }
}

module.exports = {
    Role: RoleWrapper,
    Permission: PermissionWrapper,
    RolePermissionService,
    UserRoleService,
    Tenant: TenantWrapper,
    TenantSettingsService
};
