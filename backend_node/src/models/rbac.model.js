/**
 * RBAC Models and Services
 * Multi-Tenant Role-Based Access Control
 */

const db = require('../config/db');
// Helper to get mysqlPool safely (handles potential circular dependencies)
const getPool = () => db.mysqlPool;

/**
 * Role Model
 */
class Role {
    static async findById(id) {
        const [rows] = await getPool().query('SELECT * FROM roles WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findByName(name) {
        const [rows] = await getPool().query('SELECT * FROM roles WHERE name = ?', [name]);
        return rows[0] || null;
    }

    static async findByTenant(tenantId) {
        const [rows] = await getPool().query('SELECT * FROM roles WHERE tenant_id = ? OR is_system_role = TRUE', [tenantId]);
        return rows;
    }

    static async create(data) {
        const { name, description, tenantId, isSystemRole = false } = data;
        const [result] = await getPool().query(
            'INSERT INTO roles (name, description, tenant_id, is_system_role) VALUES (?, ?, ?, ?)',
            [name, description, tenantId, isSystemRole]
        );
        return result.insertId;
    }
}

/**
 * Permission Model
 */
class Permission {
    static async findById(id) {
        const [rows] = await getPool().query('SELECT * FROM permissions WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findByName(name) {
        const [rows] = await getPool().query('SELECT * FROM permissions WHERE name = ?', [name]);
        return rows[0] || null;
    }

    static async findAll() {
        const [rows] = await getPool().query('SELECT * FROM permissions ORDER BY resource, name');
        return rows;
    }

    static async findByResource(resource) {
        const [rows] = await getPool().query('SELECT * FROM permissions WHERE resource = ?', [resource]);
        return rows;
    }
}

/**
 * Role-Permission Service
 */
class RolePermissionService {
    static async getPermissionsForRole(roleId) {
        const [rows] = await getPool().query(
            `SELECT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = ?`,
            [roleId]
        );
        return rows;
    }

    static async getPermissionNamesForRole(roleId) {
        const permissions = await this.getPermissionsForRole(roleId);
        return permissions.map(p => p.name);
    }

    static async assignPermissionsToRole(roleId, permissionIds) {
        const connection = await getPool().getConnection();
        try {
            await connection.beginTransaction();

            // Remove existing permissions
            await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

            // Add new permissions
            if (permissionIds && permissionIds.length > 0) {
                const values = permissionIds.map(pid => [roleId, pid]);
                await connection.query(
                    'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
                    [values]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async addPermissionToRole(roleId, permissionId) {
        await getPool().query(
            'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permissionId]
        );
        return true;
    }

    static async removePermissionFromRole(roleId, permissionId) {
        await getPool().query(
            'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
            [roleId, permissionId]
        );
        return true;
    }
}

/**
 * User-Role Service
 */
class UserRoleService {
    static async getRolesForUser(userId, tenantId) {
        // First, get the MySQL user ID from MongoDB user ID
        const [userRows] = await getPool().query(
            'SELECT id FROM mysql_users WHERE mongo_user_id = ? AND tenant_id = ?',
            [userId, tenantId]
        );

        if (userRows.length === 0) {
            // Try without tenant_id match (for backward compatibility)
            const [fallbackRows] = await getPool().query(
                'SELECT id FROM mysql_users WHERE mongo_user_id = ?',
                [userId]
            );
            if (fallbackRows.length === 0) {
                return [];
            }
            userId = fallbackRows[0].id;
        } else {
            userId = userRows[0].id;
        }

        // Now get roles using MySQL user ID
        const [rows] = await getPool().query(
            `SELECT r.* FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = ? AND ur.tenant_id = ?`,
            [userId, tenantId]
        );
        return rows;
    }

    static async getRoleNamesForUser(userId, tenantId) {
        const roles = await this.getRolesForUser(userId, tenantId);
        return roles.map(r => r.name);
    }

    static async assignRoleToUser(userId, roleId, tenantId) {
        const [result] = await getPool().query(
            'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
            [userId, roleId, tenantId]
        );
        return result.insertId;
    }

    static async removeRoleFromUser(userId, roleId, tenantId) {
        await getPool().query(
            'DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND tenant_id = ?',
            [userId, roleId, tenantId]
        );
        return true;
    }

    static async syncUserRoles(userId, roleIds, tenantId) {
        const connection = await getPool().getConnection();
        try {
            await connection.beginTransaction();

            // Remove existing roles for this tenant
            await connection.query(
                'DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?',
                [userId, tenantId]
            );

            // Add new roles
            if (roleIds && roleIds.length > 0) {
                const values = roleIds.map(rid => [userId, rid, tenantId]);
                await connection.query(
                    'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ?',
                    [values]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async hasRole(userId, roleName, tenantId) {
        const [rows] = await getPool().query(
            `SELECT r.* FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = ? AND ur.tenant_id = ? AND r.name = ?`,
            [userId, roleName, tenantId]
        );
        return rows.length > 0;
    }

    static async hasPermission(userId, permissionName, tenantId) {
        const [rows] = await getPool().query(
            `SELECT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = ? AND ur.tenant_id = ? AND p.name = ?`,
            [userId, permissionName, tenantId]
        );
        return rows.length > 0;
    }

    static async getPermissionsForUser(userId, tenantId) {
        const [rows] = await getPool().query(
            `SELECT DISTINCT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = ? AND ur.tenant_id = ?`,
            [userId, tenantId]
        );
        return rows;
    }

    static async getPermissionNamesForUser(userId, tenantId) {
        const permissions = await this.getPermissionsForUser(userId, tenantId);
        return [...new Set(permissions.map(p => p.name))];
    }
}

/**
 * Tenant Model
 */
class Tenant {
    static async findById(id) {
        const [rows] = await getPool().query('SELECT * FROM tenants WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findByDomain(domain) {
        const [rows] = await getPool().query('SELECT * FROM tenants WHERE domain = ?', [domain]);
        return rows[0] || null;
    }

    static async findAll() {
        const [rows] = await getPool().query('SELECT * FROM tenants WHERE status = "active"');
        return rows;
    }

    static async create(data) {
        const { name, domain, ownerUserId, status = 'active', settings = null } = data;
        const [result] = await getPool().query(
            'INSERT INTO tenants (name, domain, owner_user_id, status, settings) VALUES (?, ?, ?, ?, ?)',
            [name, domain, ownerUserId, status, settings ? JSON.stringify(settings) : null]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.name) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.domain) {
            fields.push('domain = ?');
            values.push(data.domain);
        }
        if (data.status) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.settings) {
            fields.push('settings = ?');
            values.push(JSON.stringify(data.settings));
        }

        if (fields.length === 0) return false;

        values.push(id);
        await getPool().query(
            `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return true;
    }

    static async delete(id) {
        await getPool().query('DELETE FROM tenants WHERE id = ?', [id]);
        return true;
    }
}

/**
 * Tenant Settings Service
 */
class TenantSettingsService {
    static async getSetting(tenantId, key) {
        const [rows] = await getPool().query(
            'SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
            [tenantId, key]
        );
        return rows[0] ? rows[0].setting_value : null;
    }

    static async getAllSettings(tenantId) {
        const [rows] = await getPool().query(
            'SELECT setting_key, setting_value FROM tenant_settings WHERE tenant_id = ?',
            [tenantId]
        );
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = typeof row.setting_value === 'string' 
                ? JSON.parse(row.setting_value) 
                : row.setting_value;
        });
        return settings;
    }

    static async setSetting(tenantId, key, value) {
        await getPool().query(
            `INSERT INTO tenant_settings (tenant_id, setting_key, setting_value) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [tenantId, key, typeof value === 'object' ? JSON.stringify(value) : value]
        );
        return true;
    }

    static async deleteSetting(tenantId, key) {
        await getPool().query(
            'DELETE FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
            [tenantId, key]
        );
        return true;
    }
}

module.exports = {
    Role,
    Permission,
    RolePermissionService,
    UserRoleService,
    Tenant,
    TenantSettingsService
};
