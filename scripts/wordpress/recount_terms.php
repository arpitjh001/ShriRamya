<?php
require_once('/var/www/html/wp-load.php');
wp_defer_term_counting(false);
$taxonomies = array('product_cat', 'product_tag', 'product_shipping_class');
$total = 0;
foreach ( $taxonomies as $taxonomy ) {
    $terms = get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => false ) );
    if (is_array($terms)) {
        foreach ( $terms as $term ) {
            wp_update_term_count_now( array( $term->term_taxonomy_id ), $taxonomy );
            $total++;
        }
    }
}
echo "Recounted $total terms for " . implode(', ', $taxonomies) . "\n";
?>
