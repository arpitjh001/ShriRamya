-- =====================================================
-- Order Processing Engine Migration
-- Shopify-level Order Management System
-- =====================================================

-- 1. Orders Table (Extended)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Status Fields
    status ENUM(
        'pending_payment',
        'payment_failed',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
    ) DEFAULT 'pending_payment' NOT NULL,
    
    payment_status ENUM(
        'pending',
        'paid',
        'failed',
        'refunded'
    ) DEFAULT 'pending' NOT NULL,
    
    fulfillment_status ENUM(
        'unfulfilled',
        'processing',
        'shipped',
        'delivered'
    ) DEFAULT 'unfulfilled' NOT NULL,
    
    -- Pricing Fields
    subtotal DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    discount_total DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    tax_total DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    grand_total DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    
    -- Payment Fields
    payment_method VARCHAR(50) DEFAULT NULL,
    transaction_id VARCHAR(100) DEFAULT NULL,
    payment_gateway VARCHAR(50) DEFAULT NULL,
    
    -- Customer Info (snapshot at order time)
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) DEFAULT NULL,
    
    -- Billing Address
    billing_first_name VARCHAR(100) DEFAULT NULL,
    billing_last_name VARCHAR(100) DEFAULT NULL,
    billing_address_1 VARCHAR(255) DEFAULT NULL,
    billing_address_2 VARCHAR(255) DEFAULT NULL,
    billing_city VARCHAR(100) DEFAULT NULL,
    billing_state VARCHAR(100) DEFAULT NULL,
    billing_postcode VARCHAR(20) DEFAULT NULL,
    billing_country VARCHAR(10) DEFAULT NULL,
    
    -- Shipping Address
    shipping_first_name VARCHAR(100) DEFAULT NULL,
    shipping_last_name VARCHAR(100) DEFAULT NULL,
    shipping_address_1 VARCHAR(255) DEFAULT NULL,
    shipping_address_2 VARCHAR(255) DEFAULT NULL,
    shipping_city VARCHAR(100) DEFAULT NULL,
    shipping_state VARCHAR(100) DEFAULT NULL,
    shipping_postcode VARCHAR(20) DEFAULT NULL,
    shipping_country VARCHAR(10) DEFAULT NULL,
    
    -- Notes
    customer_notes TEXT DEFAULT NULL,
    internal_notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    shipped_at TIMESTAMP NULL DEFAULT NULL,
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    cancelled_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_fulfillment_status (fulfillment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Order Items Table
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT DEFAULT NULL,
    variant_id INT DEFAULT NULL,
    
    -- Product Info (snapshot at order time)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) DEFAULT NULL,
    
    -- Quantity and Pricing
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Variant Attributes (JSON)
    variant_attributes JSON DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_variant_id (variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Shipments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS shipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    
    -- Carrier Info
    carrier VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100) DEFAULT NULL,
    tracking_url VARCHAR(500) DEFAULT NULL,
    
    -- Status
    status ENUM(
        'pending',
        'shipped',
        'in_transit',
        'delivered',
        'returned'
    ) DEFAULT 'pending' NOT NULL,
    
    -- Shipping Details
    shipping_method VARCHAR(100) DEFAULT NULL,
    shipping_weight DECIMAL(10, 2) DEFAULT NULL,
    shipping_dimensions VARCHAR(50) DEFAULT NULL,
    
    -- Timestamps
    shipped_at TIMESTAMP NULL DEFAULT NULL,
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_tracking_number (tracking_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Shipment Items Table (for partial shipments)
-- =====================================================
CREATE TABLE IF NOT EXISTS shipment_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shipment_id INT NOT NULL,
    order_item_id INT NOT NULL,
    quantity INT NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_shipment_id (shipment_id),
    INDEX idx_order_item_id (order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Refunds Table
-- =====================================================
CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    
    -- Refund Details
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT DEFAULT NULL,
    
    -- Status
    status ENUM(
        'pending',
        'approved',
        'rejected',
        'completed'
    ) DEFAULT 'pending' NOT NULL,
    
    -- Payment Info
    refund_transaction_id VARCHAR(100) DEFAULT NULL,
    payment_gateway VARCHAR(50) DEFAULT NULL,
    
    -- Admin Info
    processed_by INT DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    
    -- Notes
    admin_notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Refund Items Table (for partial refunds)
-- =====================================================
CREATE TABLE IF NOT EXISTS refund_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_id INT NOT NULL,
    order_item_id INT NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_refund_id (refund_id),
    INDEX idx_order_item_id (order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Order Events Table (Activity Log / Timeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) DEFAULT 'system' NOT NULL,
    description TEXT NOT NULL,
    
    -- Metadata (JSON for flexibility)
    metadata JSON DEFAULT NULL,
    
    -- User Info (who triggered the event)
    user_id INT DEFAULT NULL,
    user_type ENUM('customer', 'admin', 'system') DEFAULT 'system',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Order Status History Table (for audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    
    -- Status Changes
    old_status VARCHAR(50) DEFAULT NULL,
    new_status VARCHAR(50) NOT NULL,
    status_type ENUM('order', 'payment', 'fulfillment') NOT NULL,
    
    -- Change Info
    changed_by INT DEFAULT NULL,
    changed_by_type ENUM('customer', 'admin', 'system') DEFAULT 'system',
    reason VARCHAR(255) DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Inventory Reservations Table (for order locking)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    variant_id INT NOT NULL,
    quantity INT NOT NULL,
    
    -- Status
    status ENUM(
        'reserved',
        'confirmed',
        'released',
        'expired'
    ) DEFAULT 'reserved' NOT NULL,
    
    -- Expiry (for pending orders)
    expires_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL DEFAULT NULL,
    released_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_variant_id (variant_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Insert Default Order Events Types
-- =====================================================
INSERT INTO order_events (order_id, event_type, event_category, description, user_type)
VALUES 
    (0, 'order_created', 'order', 'Order was created', 'system'),
    (0, 'payment_success', 'payment', 'Payment was received', 'system'),
    (0, 'payment_failed', 'payment', 'Payment failed', 'system'),
    (0, 'order_shipped', 'fulfillment', 'Order was shipped', 'system'),
    (0, 'order_delivered', 'fulfillment', 'Order was delivered', 'system'),
    (0, 'order_cancelled', 'order', 'Order was cancelled', 'system'),
    (0, 'order_refunded', 'refund', 'Order was refunded', 'system'),
    (0, 'shipment_created', 'fulfillment', 'Shipment was created', 'system'),
    (0, 'tracking_updated', 'fulfillment', 'Tracking information was updated', 'system'),
    (0, 'refund_requested', 'refund', 'Refund was requested', 'customer'),
    (0, 'refund_approved', 'refund', 'Refund was approved', 'admin'),
    (0, 'refund_rejected', 'refund', 'Refund was rejected', 'admin'),
    (0, 'inventory_reserved', 'inventory', 'Inventory was reserved', 'system'),
    (0, 'inventory_released', 'inventory', 'Inventory was released', 'system'),
    (0, 'inventory_confirmed', 'inventory', 'Inventory reservation was confirmed', 'system')
ON DUPLICATE KEY UPDATE description = description;

-- =====================================================
-- Sample Data for Testing (Optional - Comment out in production)
-- =====================================================
-- INSERT INTO orders (user_id, order_number, status, payment_status, fulfillment_status, 
--                     subtotal, discount_total, tax_total, shipping_cost, grand_total,
--                     payment_method, transaction_id, customer_email, customer_phone,
--                     billing_first_name, billing_last_name, billing_address_1, billing_city,
--                     billing_state, billing_postcode, billing_country)
-- VALUES 
--     (1, 'ORD-2026-000001', 'paid', 'paid', 'processing', 
--      2999.00, 0.00, 540.00, 100.00, 3639.00,
--      'razorpay', 'txn_test_001', 'customer@example.com', '9876543210',
--      'John', 'Doe', '123 Main St', 'Mumbai',
--      'Maharashtra', '400001', 'IN');

-- =====================================================
-- End of Migration
-- =====================================================
