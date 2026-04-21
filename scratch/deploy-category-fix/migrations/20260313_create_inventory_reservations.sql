-- Inventory Reservations Table
-- For cart stock reservation with expiration
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    session_id VARCHAR(128) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status ENUM('active', 'confirmed', 'cancelled', 'expired') DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_variant_id (variant_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_status (status),
    UNIQUE INDEX idx_variant_session (variant_id, session_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment
ALTER TABLE inventory_reservations 
MODIFY COLUMN session_id VARCHAR(128) COMMENT 'Cart/Session identifier for reservation';
