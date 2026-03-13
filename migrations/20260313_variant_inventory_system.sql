-- Variant-Based Inventory Management System Migration
-- Implements Color + Size variant matrix for clothing ecommerce
-- Date: 2026-03-13

SET FOREIGN_KEY_CHECKS = 0;

-- Add color and size columns to product_variants for explicit variant tracking
ALTER TABLE product_variants 
ADD COLUMN color VARCHAR(50) DEFAULT NULL AFTER image,
ADD COLUMN size VARCHAR(20) DEFAULT NULL AFTER color,
ADD COLUMN stock_quantity INT DEFAULT 0 AFTER attributes_hash,
ADD COLUMN price_override DECIMAL(10, 2) DEFAULT NULL AFTER stock_quantity,
ADD INDEX idx_variant_color (color),
ADD INDEX idx_variant_size (size),
ADD INDEX idx_variant_color_size (color, size);

-- Update existing variants: extract color/size from attributes_json
UPDATE product_variants 
SET 
    color = JSON_UNQUOTE(JSON_EXTRACT(attributes_json, '$.color')),
    size = JSON_UNQUOTE(JSON_EXTRACT(attributes_json, '$.size'))
WHERE JSON_EXTRACT(attributes_json, '$.color') IS NOT NULL
   OR JSON_EXTRACT(attributes_json, '$.size') IS NOT NULL;

-- Migrate stock from variant_inventory to product_variants.stock_quantity
UPDATE product_variants pv
INNER JOIN variant_inventory vi ON pv.id = vi.variant_id
SET pv.stock_quantity = vi.stock_level;

-- Add discount fields to product_variants if not exist
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10, 2) DEFAULT NULL AFTER price_override,
ADD COLUMN IF NOT EXISTS discount_start DATETIME DEFAULT NULL AFTER discount_price,
ADD COLUMN IF NOT EXISTS discount_end DATETIME DEFAULT NULL AFTER discount_start;

-- Update variant_inventory to sync with product_variants.stock_quantity
UPDATE variant_inventory vi
INNER JOIN product_variants pv ON vi.variant_id = pv.id
SET vi.stock_level = pv.stock_quantity;

-- Add trigger to keep variant_inventory in sync with product_variants
DROP TRIGGER IF EXISTS sync_variant_inventory_after_insert;
DELIMITER $$
CREATE TRIGGER sync_variant_inventory_after_insert
AFTER INSERT ON product_variants
FOR EACH ROW
BEGIN
    INSERT INTO variant_inventory (variant_id, stock_level, low_stock_threshold)
    VALUES (NEW.id, NEW.stock_quantity, 5)
    ON DUPLICATE KEY UPDATE stock_level = NEW.stock_quantity;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS sync_variant_inventory_after_update;
DELIMITER $$
CREATE TRIGGER sync_variant_inventory_after_update
AFTER UPDATE ON product_variants
FOR EACH ROW
BEGIN
    UPDATE variant_inventory 
    SET stock_level = NEW.stock_quantity
    WHERE variant_id = NEW.id;
END$$
DELIMITER ;

-- Add version column for optimistic locking (concurrent purchase protection)
ALTER TABLE product_variants
ADD COLUMN version INT DEFAULT 0 AFTER stock_quantity;

-- Add index for fast stock lookup
CREATE INDEX idx_variant_stock ON product_variants(product_id, color, size, stock_quantity);

SET FOREIGN_KEY_CHECKS = 1;

-- Add comments for documentation
ALTER TABLE product_variants 
MODIFY COLUMN color VARCHAR(50) DEFAULT NULL COMMENT 'Variant color (e.g., Black, White, Red)',
MODIFY COLUMN size VARCHAR(20) DEFAULT NULL COMMENT 'Variant size (e.g., XS, S, M, L, XL, XXL)',
MODIFY COLUMN stock_quantity INT DEFAULT 0 COMMENT 'Available stock for this specific variant',
MODIFY COLUMN price_override DECIMAL(10, 2) DEFAULT NULL COMMENT 'Optional price override for this variant (null uses product base_price)',
MODIFY COLUMN version INT DEFAULT 0 COMMENT 'Optimistic locking version for concurrent update protection';
