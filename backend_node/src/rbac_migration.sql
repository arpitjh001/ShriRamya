-- =====================================================
-- MULTI-TENANT ARCHITECTURE & RBAC MIGRATION
-- =====================================================
-- This migration adds:
-- 1. Tenants table for multi-store support
-- 2. RBAC tables (roles, permissions, role_permissions, user_roles)
-- 3. tenant_id to all business tables
-- 4. Native blogs table for tenant-specific content
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- PART 1: TENANTS TABLE
-- =====================================================

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

-- Insert default tenant for existing data
INSERT INTO tenants (id, name, domain, status) 
VALUES (1, 'Default Store', 'default', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =====================================================
-- PART 2: RBAC TABLES
-- =====================================================

-- Roles table
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

-- Permissions table
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

-- Role-Permissions mapping (many-to-many)
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

-- User-Roles mapping (many-to-many)
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

-- =====================================================
-- PART 3: SEED DEFAULT ROLES AND PERMISSIONS
-- =====================================================

-- Insert system permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Product permissions
('manage_products', 'Full product management access', 'products', 'manage'),
('create_product', 'Create new products', 'products', 'create'),
('update_product', 'Update existing products', 'products', 'update'),
('delete_product', 'Delete products', 'products', 'delete'),
('view_products', 'View products', 'products', 'view'),

-- Order permissions
('manage_orders', 'Full order management access', 'orders', 'manage'),
('create_order', 'Create new orders', 'orders', 'create'),
('update_order', 'Update orders', 'orders', 'update'),
('delete_order', 'Delete orders', 'orders', 'delete'),
('view_orders', 'View orders', 'orders', 'view'),
('view_own_orders', 'View own orders only', 'orders', 'view_own'),

-- User permissions
('manage_users', 'Full user management access', 'users', 'manage'),
('create_user', 'Create new users', 'users', 'create'),
('update_user', 'Update users', 'users', 'update'),
('delete_user', 'Delete users', 'users', 'delete'),
('view_users', 'View users', 'users', 'view'),

-- Inventory permissions
('manage_inventory', 'Full inventory management access', 'inventory', 'manage'),
('update_inventory', 'Update inventory levels', 'inventory', 'update'),
('view_inventory', 'View inventory', 'inventory', 'view'),

-- Blog permissions
('manage_blog', 'Full blog management access', 'blogs', 'manage'),
('create_blog', 'Create new blog posts', 'blogs', 'create'),
('update_blog', 'Update blog posts', 'blogs', 'update'),
('delete_blog', 'Delete blog posts', 'blogs', 'delete'),
('view_blog', 'View blog posts', 'blogs', 'view'),

-- Settings permissions
('manage_settings', 'Manage tenant settings', 'settings', 'manage'),
('view_settings', 'View tenant settings', 'settings', 'view'),

-- Dashboard permissions
('view_dashboard', 'View dashboard analytics', 'dashboard', 'view'),

-- Cart permissions
('add_to_cart', 'Add items to cart', 'cart', 'add'),
('view_cart', 'View cart', 'cart', 'view'),

-- Checkout permissions
('place_order', 'Place orders (checkout)', 'checkout', 'place');

-- Insert system roles
INSERT INTO roles (name, description, is_system_role) VALUES
('Admin', 'Full system access with all permissions', TRUE),
('Editor', 'Can manage products and blogs, cannot delete or manage orders/users', TRUE),
('Customer', 'Standard customer access - browse, cart, orders', TRUE);

-- Assign permissions to Admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to Editor role (role_id = 2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE name IN (
    'create_product', 'update_product', 'view_products',
    'create_blog', 'update_blog', 'view_blog',
    'view_dashboard'
);

-- Assign permissions to Customer role (role_id = 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE name IN (
    'view_products', 'add_to_cart', 'place_order', 'view_own_orders',
    'view_cart'
);

-- =====================================================
-- PART 4: ADD TENANT_ID TO EXISTING TABLES
-- =====================================================

-- Products table
SET @has_tenant_products := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_products = 0, 
    'ALTER TABLE products ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Product Variants table
SET @has_tenant_variants := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'product_variants' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_variants = 0, 
    'ALTER TABLE product_variants ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_variants_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Variant Inventory table
SET @has_tenant_inventory := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'variant_inventory' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_inventory = 0, 
    'ALTER TABLE variant_inventory ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_inventory_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Categories table
SET @has_tenant_categories := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_categories = 0, 
    'ALTER TABLE categories ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Orders table
SET @has_tenant_orders := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_orders = 0, 
    'ALTER TABLE orders ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order Items table
SET @has_tenant_order_items := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_order_items = 0, 
    'ALTER TABLE order_items ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_order_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Carts table
SET @has_tenant_carts := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'carts' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_carts = 0, 
    'ALTER TABLE carts ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_carts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Reviews table
SET @has_tenant_reviews := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_reviews = 0, 
    'ALTER TABLE reviews ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_reviews_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Coupons table
SET @has_tenant_coupons := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'coupons' AND column_name = 'tenant_id'
);
SET @sql = IF(@has_tenant_coupons = 0, 
    'ALTER TABLE coupons ADD COLUMN tenant_id INT DEFAULT 1 AFTER id, ADD INDEX idx_tenant (tenant_id), ADD CONSTRAINT fk_coupons_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 5: UPDATE USERS TABLE FOR MULTI-TENANT
-- =====================================================

-- Add tenant_id to users table (for MongoDB, we'll handle this in the model)
-- For MySQL-based user tracking, add the column
SET @has_tenant_users := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'tenant_id'
);

-- Note: Users are stored in MongoDB, but we create a MySQL reference table for RBAC
CREATE TABLE IF NOT EXISTS mysql_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mongo_user_id VARCHAR(24) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_tenant (tenant_id),
    INDEX idx_mongo (mongo_user_id),
    CONSTRAINT fk_mysql_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 6: NATIVE BLOGS TABLE (Tenant-specific)
-- =====================================================

CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT,
    excerpt TEXT,
    featured_image VARCHAR(255) DEFAULT NULL,
    author_id INT NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    published_at DATETIME DEFAULT NULL,
    meta_title VARCHAR(255) DEFAULT NULL,
    meta_description TEXT DEFAULT NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_slug_tenant (slug, tenant_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_author (author_id),
    INDEX idx_status (status),
    INDEX idx_published (published_at),
    CONSTRAINT fk_blogs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_blogs_author FOREIGN KEY (author_id) REFERENCES mysql_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 7: TENANT SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_setting (tenant_id, setting_key),
    INDEX idx_tenant (tenant_id),
    CONSTRAINT fk_tenant_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings for default tenant
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value) VALUES
(1, 'store_info', JSON_OBJECT('name', 'Default Store', 'currency', 'INR', 'timezone', 'Asia/Kolkata')),
(1, 'email_settings', JSON_OBJECT('from_name', 'Default Store', 'from_email', 'noreply@default.store')),
(1, 'feature_flags', JSON_OBJECT('enable_reviews', TRUE, 'enable_coupons', TRUE, 'enable_blog', TRUE))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- =====================================================
-- PART 8: ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common tenant queries
CREATE INDEX IF NOT EXISTS idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_user ON orders(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_blogs_tenant_status ON blogs(tenant_id, status);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- VERIFICATION QUERIES (Commented out for production)
-- =====================================================
-- SELECT 'Tenants:' as table_name, COUNT(*) as count FROM tenants;
-- SELECT 'Roles:' as table_name, COUNT(*) as count FROM roles;
-- SELECT 'Permissions:' as table_name, COUNT(*) as count FROM permissions;
-- SELECT 'Role Permissions:' as table_name, COUNT(*) as count FROM role_permissions;
