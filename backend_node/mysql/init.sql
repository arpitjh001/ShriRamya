-- MySQL Initialization Script for Docker
-- This script runs when the MySQL container is first created

-- Create additional databases if needed
CREATE DATABASE IF NOT EXISTS shriramya_ecommerce;
USE shriramya_ecommerce;

-- Grant privileges
GRANT ALL PRIVILEGES ON shriramya_ecommerce.* TO 'shriramya'@'%';
FLUSH PRIVILEGES;

-- Note: Actual table creation is handled by the migration script
-- Run: npm run migrate after the container starts
