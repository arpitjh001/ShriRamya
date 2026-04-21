-- =====================================================
-- Payment System Tables Migration
-- =====================================================

-- 1. Payments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    
    -- Amount Details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    
    -- Payment Method
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50) NOT NULL,
    
    -- Transaction Details
    transaction_id VARCHAR(100) DEFAULT NULL,
    gateway_order_id VARCHAR(100) DEFAULT NULL,
    gateway_payment_id VARCHAR(100) DEFAULT NULL,
    
    -- Status
    status ENUM(
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
        'cancelled'
    ) DEFAULT 'pending' NOT NULL,
    
    -- Gateway Response (JSON)
    gateway_response JSON DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    failed_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Payment Logs Table (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_id INT DEFAULT NULL,
    
    -- Payment Details
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status VARCHAR(50) NOT NULL,
    error_message TEXT DEFAULT NULL,
    
    -- Gateway Response
    gateway_response JSON DEFAULT NULL,
    
    -- Request Details
    request_data JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_payment_id (payment_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update Refunds Table (add payment_id)
-- =====================================================
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS payment_id INT DEFAULT NULL AFTER order_id,
ADD FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- =====================================================
-- End of Payment Tables Migration
-- =====================================================
