/**
 * Database Migration Utility
 * Handles schema updates for production-grade ecommerce features
 */

const { mysqlPool } = require('../config/db');

const migrations = [
  // 0. Product Attributes Tables (Required for product updates)
  {
    name: 'create_product_attributes_tables',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS product_attributes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_product (product_id),
          CONSTRAINT fk_product_attributes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ product_attributes table created');

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS product_attribute_values (
          id INT AUTO_INCREMENT PRIMARY KEY,
          attribute_id INT NOT NULL,
          value VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_attribute (attribute_id),
          CONSTRAINT fk_attribute_values_attribute FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ product_attribute_values table created');
    }
  },

  // 1. Enhanced Coupons Table
  {
    name: 'create_coupons_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          type ENUM('percentage', 'flat', 'free_shipping', 'buy_x_get_y') NOT NULL DEFAULT 'percentage',
          value DECIMAL(10, 2) NOT NULL DEFAULT 0,
          min_cart_value DECIMAL(10, 2) DEFAULT 0,
          max_discount DECIMAL(10, 2) DEFAULT NULL,
          usage_limit INT DEFAULT NULL,
          used_count INT DEFAULT 0,
          starts_at DATETIME DEFAULT NULL,
          expires_at DATETIME DEFAULT NULL,
          status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
          applicable_products JSON DEFAULT NULL,
          applicable_categories JSON DEFAULT NULL,
          buy_x_qty INT DEFAULT 1,
          get_y_qty INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_status (status),
          INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Coupons table created');
    }
  },

  // 2. Warehouses Table
  {
    name: 'create_warehouses_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS warehouses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          city VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          address TEXT,
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_location (city, country),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Warehouses table created');
    }
  },

  // 3. Enhanced Inventory with Warehouse Support
  {
    name: 'create_warehouse_inventory_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS warehouse_inventory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          variant_id INT NOT NULL,
          warehouse_id INT NOT NULL,
          stock INT DEFAULT 0,
          reserved_stock INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_variant_warehouse (variant_id, warehouse_id),
          INDEX idx_variant (variant_id),
          INDEX idx_warehouse (warehouse_id),
          CONSTRAINT fk_warehouse_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
          CONSTRAINT fk_warehouse_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Warehouse inventory table created');
    }
  },

  // 4. Product Reviews Table
  {
    name: 'create_reviews_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          user_id VARCHAR(24) NOT NULL,
          rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_text TEXT,
          is_verified_purchase BOOLEAN DEFAULT FALSE,
          is_approved BOOLEAN DEFAULT FALSE,
          helpful_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_product (product_id),
          INDEX idx_user (user_id),
          INDEX idx_rating (rating),
          INDEX idx_approved (is_approved),
          CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Reviews table created');
    }
  },

  // 5. Product Recommendations Cache
  {
    name: 'create_recommendations_cache_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS recommendations_cache (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          recommended_product_ids JSON NOT NULL,
          strategy VARCHAR(50) NOT NULL,
          score DECIMAL(5, 4) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          INDEX idx_product (product_id),
          INDEX idx_strategy (strategy),
          INDEX idx_expires (expires_at),
          CONSTRAINT fk_recommendations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Recommendations cache table created');
    }
  },

  // 6. Search Index Table (for optimized search)
  {
    name: 'create_search_index_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS search_index (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          sku VARCHAR(100),
          category_names JSON,
          attribute_names JSON,
          price DECIMAL(10, 2),
          stock INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'draft',
          search_vector TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FULLTEXT INDEX ft_search_vector (search_vector),
          FULLTEXT INDEX ft_title (title),
          INDEX idx_status (status),
          INDEX idx_price (price),
          CONSTRAINT fk_search_index_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Search index table created');
    }
  },

  // 7. Notifications Table
  {
    name: 'create_notifications_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(24) NOT NULL,
          type ENUM('email', 'sms', 'push') NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          data JSON,
          status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
          sent_at DATETIME DEFAULT NULL,
          error_message TEXT,
          retry_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_type (type),
          INDEX idx_status (status),
          INDEX idx_event (event_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Notifications table created');
    }
  },

  // 8. Background Jobs Table
  {
    name: 'create_background_jobs_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS background_jobs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          job_type VARCHAR(50) NOT NULL,
          payload JSON NOT NULL,
          status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
          priority TINYINT DEFAULT 5,
          attempts INT DEFAULT 0,
          max_attempts INT DEFAULT 3,
          result JSON,
          error_message TEXT,
          scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME DEFAULT NULL,
          completed_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_type (job_type),
          INDEX idx_priority (priority, scheduled_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Background jobs table created');
    }
  },

  // 9. Analytics Tables
  {
    name: 'create_analytics_tables',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_daily_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          total_revenue DECIMAL(12, 2) DEFAULT 0,
          total_orders INT DEFAULT 0,
          total_products_sold INT DEFAULT 0,
          new_customers INT DEFAULT 0,
          conversion_rate DECIMAL(5, 4) DEFAULT 0,
          avg_order_value DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Analytics daily stats table created');

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_product_performance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          date DATE NOT NULL,
          views INT DEFAULT 0,
          add_to_cart INT DEFAULT 0,
          purchases INT DEFAULT 0,
          revenue DECIMAL(12, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_product_date (product_id, date),
          INDEX idx_product (product_id),
          INDEX idx_date (date),
          CONSTRAINT fk_analytics_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Analytics product performance table created');
    }
  },

  // 10. Fraud Detection - Add flag to orders
  {
    name: 'add_fraud_detection_to_orders',
    up: async () => {
      // Check if columns exist before adding
      const [columns] = await mysqlPool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_flagged'
      `);
      
      if (columns.length === 0) {
        await mysqlPool.query(`
          ALTER TABLE orders 
          ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE,
          ADD COLUMN fraud_score INT DEFAULT 0,
          ADD COLUMN fraud_reasons JSON DEFAULT NULL,
          ADD INDEX idx_flagged (is_flagged)
        `);
        console.log('✓ Fraud detection columns added to orders');
      } else {
        console.log('✓ Fraud detection columns already exist');
      }
    }
  },

  // 11. Cart Coupons Table
  {
    name: 'create_cart_coupons_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS cart_coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cart_id INT NOT NULL,
          coupon_id INT NOT NULL,
          discount_amount DECIMAL(10, 2) DEFAULT 0,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_cart_coupon (cart_id, coupon_id),
          INDEX idx_cart (cart_id),
          CONSTRAINT fk_cart_coupons_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
          CONSTRAINT fk_cart_coupons_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Cart coupons table created');
    }
  },

  // 12. User Purchase History (for verified reviews)
  {
    name: 'create_user_purchase_history_view',
    up: async () => {
      await mysqlPool.query(`
        CREATE VIEW IF NOT EXISTS user_product_purchases AS
        SELECT 
          o.user_id,
          oi.product_id,
          COUNT(*) as purchase_count,
          MAX(o.created_at) as last_purchase_date
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status IN ('completed', 'delivered')
        GROUP BY o.user_id, oi.product_id
      `);
      console.log('✓ User product purchases view created');
    }
  },

  // 13. Product Attributes Index (for recommendations)
  {
    name: 'create_product_attributes_index',
    up: async () => {
      const tableExists = await mysqlPool.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_attributes_index'
      `);
      
      if (tableExists[0].length === 0) {
        await mysqlPool.query(`
          CREATE TABLE product_attributes_index (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            attribute_key VARCHAR(100) NOT NULL,
            attribute_value VARCHAR(200) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_product_attr (product_id, attribute_key, attribute_value),
            INDEX idx_attr (attribute_key, attribute_value),
            CONSTRAINT fk_attr_index_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ Product attributes index table created');
      }
    }
  },

  // 14. Email Templates Table
  {
    name: 'create_email_templates_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_type VARCHAR(50) UNIQUE NOT NULL,
          subject VARCHAR(200) NOT NULL,
          body_html TEXT NOT NULL,
          body_text TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_event (event_type),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Email templates table created');
    }
  },

  // 15. SMS Templates Table
  {
    name: 'create_sms_templates_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS sms_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_type VARCHAR(50) UNIQUE NOT NULL,
          message TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_event (event_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ SMS templates table created');
    }
  },

  // 16. API Rate Limits Tracking
  {
    name: 'create_api_rate_limits_table',
    up: async () => {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS api_rate_limits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          identifier VARCHAR(100) NOT NULL,
          endpoint VARCHAR(100) NOT NULL,
          request_count INT DEFAULT 1,
          window_start DATETIME NOT NULL,
          window_end DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_identifier_endpoint (identifier, endpoint, window_start),
          INDEX idx_window (window_end)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ API rate limits table created');
    }
  },

  // 17. Default Email Templates
  {
    name: 'seed_email_templates',
    up: async () => {
      const templates = [
        {
          event_type: 'order_placed',
          subject: 'Order Confirmation - Order #{{order_id}}',
          body_html: `
            <html>
              <body>
                <h1>Thank you for your order!</h1>
                <p>Hi {{customer_name}},</p>
                <p>Your order #{{order_id}} has been placed successfully.</p>
                <p><strong>Order Total:</strong> ₹{{total}}</p>
                <p>We'll notify you once your order is shipped.</p>
              </body>
            </html>
          `,
          body_text: 'Thank you for your order! Order #{{order_id}} has been placed. Total: ₹{{total}}'
        },
        {
          event_type: 'order_shipped',
          subject: 'Your Order Has Been Shipped - Order #{{order_id}}',
          body_html: `
            <html>
              <body>
                <h1>Your order is on the way!</h1>
                <p>Hi {{customer_name}},</p>
                <p>Great news! Your order #{{order_id}} has been shipped.</p>
                <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
                <p>Expected delivery: {{expected_delivery}}</p>
              </body>
            </html>
          `,
          body_text: 'Your order #{{order_id}} has been shipped. Tracking: {{tracking_number}}'
        },
        {
          event_type: 'order_delivered',
          subject: 'Your Order Has Been Delivered - Order #{{order_id}}',
          body_html: `
            <html>
              <body>
                <h1>Order Delivered!</h1>
                <p>Hi {{customer_name}},</p>
                <p>Your order #{{order_id}} has been delivered.</p>
                <p>We hope you enjoy your purchase!</p>
              </body>
            </html>
          `,
          body_text: 'Your order #{{order_id}} has been delivered. Enjoy your purchase!'
        },
        {
          event_type: 'refund_processed',
          subject: 'Refund Processed - Order #{{order_id}}',
          body_html: `
            <html>
              <body>
                <h1>Refund Processed</h1>
                <p>Hi {{customer_name}},</p>
                <p>Your refund for order #{{order_id}} has been processed.</p>
                <p><strong>Refund Amount:</strong> ₹{{refund_amount}}</p>
                <p>The amount will be credited to your account within 5-7 business days.</p>
              </body>
            </html>
          `,
          body_text: 'Your refund of ₹{{refund_amount}} for order #{{order_id}} has been processed.'
        },
        {
          event_type: 'low_stock_alert',
          subject: 'Low Stock Alert - {{product_name}}',
          body_html: `
            <html>
              <body>
                <h1>Low Stock Alert</h1>
                <p>Product: {{product_name}}</p>
                <p>Current Stock: {{current_stock}}</p>
                <p>Please restock soon.</p>
              </body>
            </html>
          `,
          body_text: 'Low stock alert: {{product_name}} - Current stock: {{current_stock}}'
        }
      ];

      for (const template of templates) {
        await mysqlPool.query(`
          INSERT INTO email_templates (event_type, subject, body_html, body_text)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE subject = VALUES(subject), body_html = VALUES(body_html)
        `, [template.event_type, template.subject, template.body_html, template.body_text]);
      }
      console.log('✓ Default email templates seeded');
    }
  },

  // 18. Default SMS Templates
  {
    name: 'seed_sms_templates',
    up: async () => {
      const templates = [
        {
          event_type: 'order_placed',
          message: 'Hi {{customer_name}}! Your order #{{order_id}} of ₹{{total}} is confirmed. Thank you for shopping with us!'
        },
        {
          event_type: 'order_shipped',
          message: 'Your order #{{order_id}} has been shipped! Track: {{tracking_number}}. Expected: {{expected_delivery}}'
        },
        {
          event_type: 'order_delivered',
          message: 'Your order #{{order_id}} has been delivered. Enjoy! - ShriRamya'
        },
        {
          event_type: 'refund_processed',
          message: 'Refund of ₹{{refund_amount}} for order #{{order_id}} processed. Will credit in 5-7 days.'
        }
      ];

      for (const template of templates) {
        await mysqlPool.query(`
          INSERT INTO sms_templates (event_type, message)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE message = VALUES(message)
        `, [template.event_type, template.message]);
      }
      console.log('✓ Default SMS templates seeded');
    }
  }
];

const runMigrations = async () => {
  console.log('Starting database migrations...\n');
  
  try {
    // Create migrations tracking table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(200) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Schema migrations tracking table created\n');

    // Get already executed migrations
    const [executed] = await mysqlPool.query('SELECT migration_name FROM schema_migrations');
    const executedSet = new Set(executed.map(row => row.migration_name));

    // Run pending migrations
    for (const migration of migrations) {
      if (!executedSet.has(migration.name)) {
        console.log(`Running migration: ${migration.name}...`);
        await migration.up();
        await mysqlPool.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [migration.name]);
        console.log(`✓ Migration completed: ${migration.name}\n`);
      } else {
        console.log(`Skipping already executed: ${migration.name}`);
      }
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

const rollbackMigration = async (migrationName) => {
  console.log(`Rolling back migration: ${migrationName}...`);
  // Note: Implement down migrations if rollback functionality is needed
  console.log('Rollback not implemented for this migration');
};

module.exports = {
  runMigrations,
  rollbackMigration,
  migrations
};
