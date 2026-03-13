-- Product and Variant Improvements Migration
-- Adds: slug auto-generation, soft delete, inventory audit log, full-text search
-- Date: 2026-03-13

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add slug column to products if not exists
ALTER TABLE products
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) DEFAULT NULL AFTER name,
ADD UNIQUE INDEX idx_slug (slug);

-- 2. Add soft delete columns to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL AFTER updated_at,
ADD INDEX idx_deleted_at (deleted_at);

-- 3. Add full-text search indexes for products
ALTER TABLE products
ADD FULLTEXT INDEX ft_products_search (name, description, fabric, occasion);

-- 4. Add SKU auto-generation trigger for product_variants
DROP TRIGGER IF EXISTS trg_auto_generate_variant_sku;
DELIMITER $$
CREATE TRIGGER trg_auto_generate_variant_sku
BEFORE INSERT ON product_variants
FOR EACH ROW
BEGIN
    DECLARE product_name_prefix VARCHAR(10);
    DECLARE product_id_val INT;
    DECLARE color_prefix VARCHAR(3);
    DECLARE size_prefix VARCHAR(3);
    
    -- Only auto-generate if SKU is NULL or empty
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        -- Get product name prefix
        SELECT id, LEFT(name, 3) INTO product_id_val, product_name_prefix
        FROM products WHERE id = NEW.product_id;
        
        -- Get color and size prefixes
        SET color_prefix = IF(NEW.color IS NULL OR NEW.color = '', 'XX', UPPER(LEFT(NEW.color, 3)));
        SET size_prefix = IF(NEW.size IS NULL OR NEW.size = '', 'XX', UPPER(LEFT(NEW.size, 3)));
        
        -- Generate SKU: SR-{PRODUCT}-{COLOR}-{SIZE}-{TIMESTAMP}
        SET NEW.sku = CONCAT(
            'SR-',
            UPPER(product_name_prefix), '-',
            color_prefix, '-',
            size_prefix, '-',
            UNIX_TIMESTAMP()
        );
    END IF;
END$$
DELIMITER ;

-- 5. Create inventory audit log table
CREATE TABLE IF NOT EXISTS inventory_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    product_id INT NOT NULL,
    change_type ENUM('restock', 'sale', 'return', 'adjustment', 'reservation', 'cancellation') NOT NULL,
    old_stock_level INT NOT NULL,
    new_stock_level INT NOT NULL,
    quantity_changed INT NOT NULL,
    reference_type VARCHAR(50) DEFAULT NULL COMMENT 'Order ID, Cart ID, Admin User ID, etc.',
    reference_id BIGINT DEFAULT NULL,
    user_id INT DEFAULT NULL COMMENT 'Admin user who made the change',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_variant_audit (variant_id),
    INDEX idx_product_audit (product_id),
    INDEX idx_change_type (change_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add trigger to log inventory changes
DROP TRIGGER IF EXISTS trg_log_inventory_changes;
DELIMITER $$
CREATE TRIGGER trg_log_inventory_changes
AFTER UPDATE ON variant_inventory
FOR EACH ROW
BEGIN
    DECLARE variant_product_id INT;
    DECLARE change_type_val VARCHAR(20);
    
    -- Get product_id for the variant
    SELECT product_id INTO variant_product_id
    FROM product_variants WHERE id = NEW.variant_id;
    
    -- Determine change type based on stock change
    IF NEW.stock_level > OLD.stock_level THEN
        SET change_type_val = 'restock';
    ELSE
        SET change_type_val = 'sale';
    END IF;
    
    -- Only log if stock actually changed
    IF OLD.stock_level != NEW.stock_level THEN
        INSERT INTO inventory_audit_log (
            variant_id, product_id, change_type,
            old_stock_level, new_stock_level, quantity_changed
        ) VALUES (
            NEW.variant_id, variant_product_id, change_type_val,
            OLD.stock_level, NEW.stock_level, NEW.stock_level - OLD.stock_level
        );
    END IF;
END$$
DELIMITER ;

-- 7. Add metadata JSON column to products for extensibility
ALTER TABLE products
ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL AFTER description;

-- 8. Add SEO fields to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255) DEFAULT NULL AFTER metadata,
ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL AFTER meta_title,
ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR(500) DEFAULT NULL AFTER meta_description;

-- 9. Add weight and dimensions for shipping
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS weight_grams DECIMAL(10, 2) DEFAULT NULL AFTER size,
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10, 2) DEFAULT NULL AFTER weight_grams,
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10, 2) DEFAULT NULL AFTER length_cm,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10, 2) DEFAULT NULL AFTER width_cm;

-- 10. Add barcode/UPC support
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) DEFAULT NULL AFTER sku,
ADD UNIQUE INDEX idx_barcode (barcode);

-- 11. Add reorder level for inventory management
ALTER TABLE variant_inventory
ADD COLUMN IF NOT EXISTS reorder_level INT DEFAULT 10 AFTER low_stock_threshold,
ADD COLUMN IF NOT EXISTS reorder_quantity INT DEFAULT 50 AFTER reorder_level;

SET FOREIGN_KEY_CHECKS = 1;

-- Add comments for documentation
ALTER TABLE products
MODIFY COLUMN slug VARCHAR(255) DEFAULT NULL COMMENT 'URL-friendly slug auto-generated from product name',
MODIFY COLUMN deleted_at TIMESTAMP DEFAULT NULL COMMENT 'Soft delete timestamp (NULL = active)',
MODIFY COLUMN metadata JSON DEFAULT NULL COMMENT 'Extensible metadata for custom fields';

ALTER TABLE product_variants
MODIFY COLUMN weight_grams DECIMAL(10, 2) DEFAULT NULL COMMENT 'Variant weight in grams for shipping calculations',
MODIFY COLUMN barcode VARCHAR(100) DEFAULT NULL COMMENT 'Barcode/UPC/EAN for retail scanning';

ALTER TABLE variant_inventory
MODIFY COLUMN reorder_level INT DEFAULT 10 COMMENT 'Stock level at which to trigger reorder alert',
MODIFY COLUMN reorder_quantity INT DEFAULT 50 COMMENT 'Suggested reorder quantity';
