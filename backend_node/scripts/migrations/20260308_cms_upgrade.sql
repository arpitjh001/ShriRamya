-- Migration: Production-Grade CMS Module Upgrade
-- Description: Extends schema for tags, comments, SEO, and workflow

-- 1. Create Tags System
CREATE TABLE IF NOT EXISTS blog_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_tag_mapping (
    blog_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (blog_id, tag_id),
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Comments System
CREATE TABLE IF NOT EXISTS blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    user_id VARCHAR(50), -- Mapping to Mongo User
    mysql_user_id INT, -- Mapping to mysql_users if applicable
    comment TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (mysql_user_id) REFERENCES mysql_users(id) ON DELETE SET NULL,
    INDEX idx_blog_status (blog_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Upgrade Blogs Table
-- Add new columns if they don't exist
ALTER TABLE blogs 
    MODIFY COLUMN status ENUM('draft', 'review', 'published', 'archived') DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT,
    ADD COLUMN IF NOT EXISTS reading_time INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;

-- 4. Add Search Capability (FULLTEXT Index)
-- Fulltext index works on MyISAM or InnoDB (MySQL 5.6+)
ALTER TABLE blogs ADD FULLTEXT INDEX ft_blog_content (title, content);

-- 5. Seeding initial categories if not exists (Part of User request parity)
CREATE TABLE IF NOT EXISTS blog_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE KEY idx_tenant_slug (tenant_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_category_mapping (
    blog_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (blog_id, category_id),
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
