-- Migration: Add missing indexes to categories table
-- Date: 2026-03-25
-- Purpose: Fix category creation timeout by adding essential indexes

-- Add index on slug for fast lookups (used in getCategoryBySlug)
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Add index on parent_id for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Add composite index for active categories (excluding soft deleted)
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(deleted_at, is_deleted, menu_order, name);

-- Add index on menu_order for sorting
CREATE INDEX IF NOT EXISTS idx_categories_menu_order ON categories(menu_order);