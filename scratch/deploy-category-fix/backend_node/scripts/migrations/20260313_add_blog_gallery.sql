-- Migration: Add Gallery Support to Blogs
-- Description: Adds images column to store multiple image URLs as JSON

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS images JSON AFTER featured_image;
