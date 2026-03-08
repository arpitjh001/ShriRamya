-- Migration: Create Native Blog System Tables
-- Description: Creates tables for multi-tenant blog system and mysql_users mapping

-- 1. Create mysql_users table for mapping Mongo users to MySQL (for relations)
CREATE TABLE IF NOT EXISTS mysql_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mongo_user_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'editor', 'author', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mongo_user (mongo_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    author_id INT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    view_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Constraints
    UNIQUE KEY idx_tenant_slug (tenant_id, slug),
    FOREIGN KEY (author_id) REFERENCES mysql_users(id) ON DELETE SET NULL,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Initial Admin User Mapping (Optional default)
INSERT IGNORE INTO mysql_users (id, name, email, role) 
VALUES (1, 'System Admin', 'admin@shriramya.com', 'admin');
