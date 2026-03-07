-- Phase 5: Add discount pricing support for product variants

SET @has_discount_price := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND column_name = 'discount_price'
);

SET @discount_price_sql := IF(
    @has_discount_price = 0,
    'ALTER TABLE product_variants ADD COLUMN discount_price DECIMAL(10, 2) NULL AFTER price',
    'SELECT 1'
);

PREPARE discount_price_stmt FROM @discount_price_sql;
EXECUTE discount_price_stmt;
DEALLOCATE PREPARE discount_price_stmt;

SET @has_discount_start := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND column_name = 'discount_start'
);

SET @discount_start_sql := IF(
    @has_discount_start = 0,
    'ALTER TABLE product_variants ADD COLUMN discount_start DATETIME NULL AFTER discount_price',
    'SELECT 1'
);

PREPARE discount_start_stmt FROM @discount_start_sql;
EXECUTE discount_start_stmt;
DEALLOCATE PREPARE discount_start_stmt;

SET @has_discount_end := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND column_name = 'discount_end'
);

SET @discount_end_sql := IF(
    @has_discount_end = 0,
    'ALTER TABLE product_variants ADD COLUMN discount_end DATETIME NULL AFTER discount_start',
    'SELECT 1'
);

PREPARE discount_end_stmt FROM @discount_end_sql;
EXECUTE discount_end_stmt;
DEALLOCATE PREPARE discount_end_stmt;

SET @has_discount_price_check := (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'product_variants'
      AND constraint_name = 'chk_discount_price_less_than_price'
      AND constraint_type = 'CHECK'
);

SET @discount_price_check_sql := IF(
    @has_discount_price_check = 0,
    'ALTER TABLE product_variants ADD CONSTRAINT chk_discount_price_less_than_price CHECK (discount_price IS NULL OR discount_price < price)',
    'SELECT 1'
);

PREPARE discount_stmt FROM @discount_price_check_sql;
EXECUTE discount_stmt;
DEALLOCATE PREPARE discount_stmt;

SET @has_discount_window_index := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND index_name = 'idx_discount_window'
);

SET @discount_window_index_sql := IF(
    @has_discount_window_index = 0,
    'CREATE INDEX idx_discount_window ON product_variants (discount_start, discount_end)',
    'SELECT 1'
);

PREPARE discount_index_stmt FROM @discount_window_index_sql;
EXECUTE discount_index_stmt;
DEALLOCATE PREPARE discount_index_stmt;
