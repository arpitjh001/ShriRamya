-- Migration: Add soft delete columns to categories table
-- This allows categories to be "deleted" without breaking foreign key constraints

-- Add soft delete columns if they don't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS deleted_at BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) DEFAULT 0;

-- Add index for faster queries on deleted status
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON categories(deleted_at, is_deleted);
