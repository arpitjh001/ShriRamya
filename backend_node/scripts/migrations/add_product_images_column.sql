-- Add images column to products table
-- This stores product images as JSON array

ALTER TABLE products 
ADD COLUMN images JSON DEFAULT NULL AFTER occasion;

-- Update existing products with empty array if needed
UPDATE products SET images = JSON_ARRAY() WHERE images IS NULL;
