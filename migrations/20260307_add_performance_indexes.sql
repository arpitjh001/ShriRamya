-- Performance Optimization: Add Database Indexes
-- Phase 3: Performance Optimization
-- Date: 2026-03-07
-- Purpose: Improve query performance on frequently accessed columns

-- ============================================
-- PRODUCTS TABLE INDEXES
-- ============================================

-- Index on category_id for faster category-based product lookups
-- Used in: product filtering, category pages
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Index on status for filtering by product status
-- Used in: admin product lists, active product queries
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Index on created_at for sorting and pagination
-- Used in: product listings with ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Composite index for common query pattern: status + created_at
-- Used in: active product listings sorted by date
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);

-- ============================================
-- PRODUCT_VARIANTS TABLE INDEXES
-- ============================================

-- Index on product_id for faster variant lookups by product
-- Used in: product detail pages, variant queries
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Index on sku for unique lookups
-- Used in: SKU-based searches, inventory management
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- ============================================
-- PRODUCT_CATEGORIES TABLE INDEXES
-- ============================================

-- Index on product_id for faster category lookups by product
-- Used in: product category assignments
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);

-- Index on category_id for faster product lookups by category
-- Used in: category pages, product filtering
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Composite index for both directions
CREATE INDEX IF NOT EXISTS idx_product_categories_both ON product_categories(product_id, category_id);

-- ============================================
-- CATEGORIES TABLE INDEXES
-- ============================================

-- Index on slug for faster slug-based lookups
-- Used in: category pages, URL routing
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Index on parent_id for hierarchical queries
-- Used in: category tree building, subcategory queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ============================================
-- VARIANT_INVENTORY TABLE INDEXES
-- ============================================

-- Index on variant_id for faster inventory lookups
-- Used in: stock checks, inventory management
CREATE INDEX IF NOT EXISTS idx_variant_inventory_variant_id ON variant_inventory(variant_id);

-- Index on stock_level for low stock queries
-- Used in: inventory alerts, admin dashboard
CREATE INDEX IF NOT EXISTS idx_variant_inventory_stock ON variant_inventory(stock_level);

-- ============================================
-- ORDERS TABLE INDEXES (if using MySQL for orders)
-- ============================================

-- Index on user_id for customer order lookups
-- Used in: user order history, account pages
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Index on status for order filtering
-- Used in: admin order management, order lists
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index on created_at for date-based queries
-- Used in: order sorting, analytics, date range filters
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Composite index for user's orders sorted by date
-- Used in: user order history with sorting
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- Composite index for status + created_at (analytics)
-- Used in: order analytics, status-based reports
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- ============================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================

-- Index on order_id for items lookup by order
-- Used in: order detail pages
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Index on product_id for product sales analysis
-- Used in: product analytics, sales reports
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- PRODUCT_ATTRIBUTES TABLE INDEXES
-- ============================================

-- Index on product_id for attribute lookups
-- Used in: product detail pages
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);

-- ============================================
-- PRODUCT_ATTRIBUTE_VALUES TABLE INDEXES
-- ============================================

-- Index on attribute_id for value lookups
-- Used in: product attribute display
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute_id ON product_attribute_values(attribute_id);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all indexes were created:
-- SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
-- FROM INFORMATION_SCHEMA.STATISTICS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- ORDER BY TABLE_NAME, INDEX_NAME;
