-- Migration: Add coupon tracking to orders table
-- This allows orders to store coupon usage and discount information

-- Add coupon-related columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_id INT NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) NULL AFTER coupon_id,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0 AFTER subtotal,
ADD COLUMN IF NOT EXISTS final_total DECIMAL(10,2) DEFAULT 0 AFTER discount_amount;

-- Add foreign key constraint for coupon_id
ALTER TABLE orders
ADD CONSTRAINT fk_orders_coupon 
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- Add index for faster coupon-based order queries
CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders(coupon_code);

-- Update existing orders to have final_total = total (if total exists) or subtotal + shipping
UPDATE orders 
SET final_total = COALESCE(subtotal, 0) + COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0)
WHERE final_total IS NULL OR final_total = 0;

-- Add trigger to auto-calculate final_total on insert
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.final_total IS NULL OR NEW.final_total = 0 THEN
        SET NEW.final_total = COALESCE(NEW.subtotal, 0) + COALESCE(NEW.shipping_cost, 0) - COALESCE(NEW.discount_amount, 0);
    END IF;
END$$
DELIMITER ;

-- Add trigger to auto-calculate final_total on update
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS before_order_update
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.final_total IS NULL OR NEW.final_total = 0 THEN
        SET NEW.final_total = COALESCE(NEW.subtotal, 0) + COALESCE(NEW.shipping_cost, 0) - COALESCE(NEW.discount_amount, 0);
    END IF;
END$$
DELIMITER ;
