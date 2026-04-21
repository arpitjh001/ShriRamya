const mysql = require('mysql2/promise');

const rbac_sql = `
SET FOREIGN_KEY_CHECKS = 0;

-- PART 1: TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
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

INSERT INTO tenants (id, name, domain, status) 
VALUES (1, 'Default Store', 'default', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- PART 2: RBAC TABLES
CREATE TABLE IF NOT EXISTS roles (
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

CREATE TABLE IF NOT EXISTS permissions (
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

CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role (role_id),
    INDEX idx_permission (permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    tenant_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role_tenant (user_id, role_id, tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id),
    INDEX idx_tenant (tenant_id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mysql_users (
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
    CONSTRAINT fk_mysql_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- PART 3: SEED DEFAULT ROLES AND PERMISSIONS
INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
('manage_products', 'Full product management access', 'products', 'manage'),
('create_product', 'Create new products', 'products', 'create'),
('update_product', 'Update existing products', 'products', 'update'),
('delete_product', 'Delete products', 'products', 'delete'),
('view_products', 'View products', 'products', 'view'),
('manage_orders', 'Full order management access', 'orders', 'manage'),
('create_order', 'Create new orders', 'orders', 'create'),
('update_order', 'Update orders', 'orders', 'update'),
('delete_order', 'Delete orders', 'orders', 'delete'),
('view_orders', 'View orders', 'orders', 'view'),
('view_own_orders', 'View own orders only', 'orders', 'view_own'),
('manage_users', 'Full user management access', 'users', 'manage'),
('create_user', 'Create new users', 'users', 'create'),
('update_user', 'Update users', 'users', 'update'),
('delete_user', 'Delete users', 'users', 'delete'),
('view_users', 'View users', 'users', 'view'),
('manage_inventory', 'Full inventory management access', 'inventory', 'manage'),
('update_inventory', 'Update inventory levels', 'inventory', 'update'),
('view_inventory', 'View inventory', 'inventory', 'view'),
('manage_blog', 'Full blog management access', 'blogs', 'manage'),
('create_blog', 'Create new blog posts', 'blogs', 'create'),
('update_blog', 'Update blog posts', 'blogs', 'update'),
('delete_blog', 'Delete blog posts', 'blogs', 'delete'),
('view_blog', 'View blog posts', 'blogs', 'view'),
('manage_settings', 'Manage tenant settings', 'settings', 'manage'),
('view_settings', 'View tenant settings', 'settings', 'view'),
('view_dashboard', 'View dashboard analytics', 'dashboard', 'view'),
('add_to_cart', 'Add items to cart', 'cart', 'add'),
('view_cart', 'View cart', 'cart', 'view'),
('place_order', 'Place orders (checkout)', 'checkout', 'place');

INSERT IGNORE INTO roles (id, name, description, is_system_role) VALUES
(1, 'Admin', 'Full system access with all permissions', TRUE),
(2, 'Editor', 'Can manage products and blogs, cannot delete or manage orders/users', TRUE),
(3, 'Customer', 'Standard customer access - browse, cart, orders', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE name IN (
    'create_product', 'update_product', 'view_products',
    'create_blog', 'update_blog', 'view_blog',
    'view_dashboard'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE name IN (
    'view_products', 'add_to_cart', 'place_order', 'view_own_orders',
    'view_cart'
);

SET FOREIGN_KEY_CHECKS = 1;
`;

(async () => {
    try {
        const c = await mysql.createConnection({
            host: 'mysql',
            user: 'shriramya_user',
            password: 'shriramya_password',
            database: 'shriramya',
            multipleStatements: true
        });
        
        console.log('Executing partial RBAC migration...');
        await c.query(rbac_sql);
        console.log('✅ Partial RBAC Migration executed successfully!');
        
        const [rows] = await c.query("SHOW TABLES;");
        console.log('Tables in database:');
        rows.forEach(row => console.log(`  - ${Object.values(row)[0]}`));
        
        c.end();
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();
