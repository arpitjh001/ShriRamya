<?php
/**
 * Script to recount all product categories in WooCommerce.
 * This fixes issues where categories exist in the database but don't show up in the dashboard.
 */

require_once( __DIR__ . '/wp-load.php' );

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

echo "Starting category recount...\n";

$taxonomies = array( 'product_cat', 'product_tag', 'product_shipping_class' );

foreach ( $taxonomies as $taxonomy ) {
    echo "Recounting $taxonomy...\n";
    $terms = get_terms( array(
        'taxonomy'   => $taxonomy,
        'hide_empty' => false,
        'fields'     => 'ids',
    ) );
    
    if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
        wp_update_term_count_now( $terms, $taxonomy );
        echo "Done $taxonomy. Count: " . count( $terms ) . "\n";
    } else {
        echo "No terms found for $taxonomy.\n";
    }
}

// Clear cache
wp_cache_flush();
echo "Cache cleared. Process complete.\n";
