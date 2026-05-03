const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const reset_sql = `
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tenant_settings;
DROP TABLE IF EXISTS blogs;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS mysql_users;
DROP TABLE IF EXISTS tenants;

-- 1. Tenants table
CREATE TABLE tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) DEFAULT NULL,
    owner_user_id INT DEFAULT NULL,
    status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    settings JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_domain (domain),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tenants (id, name, domain, status) VALUES (1, 'Default Store', 'default', 'active');

-- 2. RBAC tables
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    tenant_id INT DEFAULT NULL,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_resource (resource),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    tenant_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role_tenant (user_id, role_id, tenant_id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mysql_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mongo_user_id VARCHAR(24) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    tenant_id INT DEFAULT 1,
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_tenant (tenant_id),
    INDEX idx_mongo (mongo_user_id),
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed data
INSERT INTO permissions (name, description, resource, action) VALUES
('manage_products', 'Full product management access', 'products', 'manage'),
('create_product', 'Create new products', 'products', 'create'),
('update_product', 'Update existing products', 'products', 'update'),
('delete_product', 'Delete products', 'products', 'delete'),
('view_products', 'View products', 'products', 'view'),
('manage_orders', 'Full order management access', 'orders', 'manage'),
('view_dashboard', 'View dashboard analytics', 'dashboard', 'view');

INSERT INTO roles (id, name, description, is_system_role) VALUES
(1, 'Admin', 'Full system access', TRUE),
(2, 'Editor', 'Editor access', TRUE),
(3, 'Customer', 'Customer access', TRUE);

-- Assign all permissions to Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

SET FOREIGN_KEY_CHECKS = 1;
`;

(async () => {
    try {
        const c = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'mysql',
            user: process.env.MYSQL_USER || 'shriramya_user',
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE || 'shriramya',
            multipleStatements: true
        });
        
        console.log('Resetting RBAC schema...');
        await c.query(reset_sql);
        console.log('✅ RBAC schema reset successfully!');
        c.end();
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();
