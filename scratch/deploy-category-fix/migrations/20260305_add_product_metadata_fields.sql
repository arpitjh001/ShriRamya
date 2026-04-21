-- Add product metadata fields required by admin update flow

SET @has_sku := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'sku'
);

SET @sku_sql := IF(
    @has_sku = 0,
    'ALTER TABLE products ADD COLUMN sku VARCHAR(150) NULL AFTER name',
    'SELECT 1'
);

PREPARE sku_stmt FROM @sku_sql;
EXECUTE sku_stmt;
DEALLOCATE PREPARE sku_stmt;

SET @has_fabric := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'fabric'
);

SET @fabric_sql := IF(
    @has_fabric = 0,
    'ALTER TABLE products ADD COLUMN fabric VARCHAR(255) NULL AFTER description',
    'SELECT 1'
);

PREPARE fabric_stmt FROM @fabric_sql;
EXECUTE fabric_stmt;
DEALLOCATE PREPARE fabric_stmt;

SET @has_occasion := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'occasion'
);

SET @occasion_sql := IF(
    @has_occasion = 0,
    'ALTER TABLE products ADD COLUMN occasion VARCHAR(255) NULL AFTER fabric',
    'SELECT 1'
);

PREPARE occasion_stmt FROM @occasion_sql;
EXECUTE occasion_stmt;
DEALLOCATE PREPARE occasion_stmt;
