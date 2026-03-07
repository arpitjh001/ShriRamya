-- Update table names if your WordPress table prefix is not "wp_".
ANALYZE TABLE wp_posts, wp_postmeta, wp_terms, wp_term_taxonomy, wp_term_relationships;
ANALYZE TABLE wp_wc_product_meta_lookup, wp_wc_product_attributes_lookup, wp_options;

OPTIMIZE TABLE wp_posts, wp_postmeta, wp_term_relationships;
OPTIMIZE TABLE wp_wc_product_meta_lookup, wp_wc_product_attributes_lookup;
