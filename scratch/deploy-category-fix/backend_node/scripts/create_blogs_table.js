/**
 * Script to create blogs tables
 */

const { mysqlPool } = require('../src/config/db');

async function createBlogsTables() {
    console.log('Creating blogs tables...\n');
    
    try {
        // 1. Create blogs table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS blogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                excerpt TEXT,
                content LONGTEXT NOT NULL,
                featured_image VARCHAR(500),
                author_id VARCHAR(24),
                author_name VARCHAR(100),
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                published_at DATETIME DEFAULT NULL,
                meta_title VARCHAR(255),
                meta_description TEXT,
                tags JSON,
                tenant_id INT DEFAULT 1,
                views INT DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_slug (slug),
                INDEX idx_status (status),
                INDEX idx_tenant (tenant_id),
                INDEX idx_published (published_at),
                FULLTEXT INDEX ft_search (title, content, excerpt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ blogs table created');

        // 2. Create blog_category_mapping table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS blog_category_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                blog_id INT NOT NULL,
                category_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_blog_category (blog_id, category_id),
                INDEX idx_blog (blog_id),
                INDEX idx_category (category_id),
                CONSTRAINT fk_blog_category_mapping_blog FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
                CONSTRAINT fk_blog_category_mapping_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ blog_category_mapping table created');

        // 3. Create blog_tags table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS blog_tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                tenant_id INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_slug (slug),
                INDEX idx_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ blog_tags table created');

        // 4. Create blog_tag_mapping table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS blog_tag_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                blog_id INT NOT NULL,
                tag_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_blog_tag (blog_id, tag_id),
                INDEX idx_blog (blog_id),
                INDEX idx_tag (tag_id),
                CONSTRAINT fk_blog_tag_mapping_blog FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
                CONSTRAINT fk_blog_tag_mapping_tag FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ blog_tag_mapping table created');

        // 5. Create mysql_users table if not exists (for blog authors)
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS mysql_users (
                id VARCHAR(24) PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ mysql_users table created');

        console.log('\n✅ All blogs tables created successfully!');
        
        // Verify tables exist
        const [tables] = await mysqlPool.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME IN ('blogs', 'blog_category_mapping', 'blog_tags', 'blog_tag_mapping', 'mysql_users')
        `);
        
        console.log('\nTables in database:');
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        process.exit(1);
    }
}

createBlogsTables();
