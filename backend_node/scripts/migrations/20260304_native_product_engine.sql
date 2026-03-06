-- Native Product Engine Migration (Phase 1)
-- This script establishes the native product and variant schema, removing all WooCommerce dependencies.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS variant_inventory;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_attributes;
DROP TABLE IF EXISTS products;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Products Table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) DEFAULT 0.00,
    category_id INT DEFAULT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Product Attributes (e.g., Color, Size)
CREATE TABLE product_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_attr (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Product Attribute Values (e.g., Red, Blue, Large)
CREATE TABLE product_attribute_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_id INT NOT NULL,
    value VARCHAR(255) NOT NULL,
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
    INDEX idx_attr_val (attribute_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Variants (Explicitly defined items)
CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(512),
    attributes_json JSON NOT NULL, -- Normalized attributes as JSON object
    attributes_hash VARCHAR(64) NOT NULL, -- SHA256 or similar hash of sorted attributes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_product_attr_hash (product_id, attributes_hash),
    INDEX idx_product_variants (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Variant Inventory
CREATE TABLE variant_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    stock_level INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_variant_id (variant_id),
    CONSTRAINT chk_stock_positive CHECK (stock_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
