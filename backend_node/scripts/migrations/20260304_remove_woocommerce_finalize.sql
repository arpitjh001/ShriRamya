-- Migration file: Remove WooCommerce dependencies and finalize native product schema

-- 1. Create variant_inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS variant_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    stock_level INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_variant_id (variant_id)
);

-- 2. Modify products table
ALTER TABLE products DROP COLUMN wc_id;

-- 3. Modify product_variants table
ALTER TABLE product_variants DROP COLUMN wc_variant_id;
-- Ensure SKU is unique (already unique from previous migration, but good to be sure)
-- Ensure attributes_hash exists and is indexed (already exists from previous migration)

-- 4. Sync stock if needed (optional, just to move data if it exists)
-- INSERT IGNORE INTO variant_inventory (variant_id, stock_level)
-- SELECT id, stock FROM product_variants;

-- 5. Drop stock from product_variants if we want it isolated, 
-- but often it's kept in variants for performance. 
-- The user asked for variant_inventory in the schema list, so I'll move it there.
-- For simplicity in this phase, I'll keep stock in variants OR use inventory table.
-- Let's use the variant_inventory table as requested.

-- Move existing stock to inventory table
INSERT IGNORE INTO variant_inventory (variant_id, stock_level)
SELECT id, stock FROM product_variants;

-- Now drop stock from variants
ALTER TABLE product_variants DROP COLUMN stock;
