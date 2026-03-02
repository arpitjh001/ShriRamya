<?php
require_once('/var/www/html/wp-load.php');

if (!class_exists('WooCommerce')) {
    echo "WooCommerce not active!\n";
    exit;
}

echo "Cleaning up WooCommerce data...\n";

// Clear transients
$transients_to_delete = array(
    'wc_term_counts',
    'wc_product_cat_lookup_last_update',
    'wc_category_lookup_last_update'
);
foreach ($transients_to_delete as $transient) {
    if (delete_transient($transient)) {
        echo "- Deleted transient: $transient\n";
    }
}

// Recount terms
$taxonomies = array('product_cat', 'product_tag');
foreach ($taxonomies as $taxonomy) {
    $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => false));
    if (is_array($terms)) {
        foreach ($terms as $term) {
            wp_update_term_count_now(array($term->term_taxonomy_id), $taxonomy);
        }
        echo "- Recounted " . count($terms) . " terms for $taxonomy\n";
    }
}

// Regenerate category lookup table if possible
if (method_exists('WC_Cache_Helper', 'get_transient_version')) {
    WC_Cache_Helper::get_transient_version('product_cat', true);
    echo "- Incremented category transient version\n";
}

echo "Done cleanup!\n";
?>
