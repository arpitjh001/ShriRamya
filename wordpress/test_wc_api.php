<?php
/**
 * Test WooCommerce API permissions locally.
 */

require_once( __DIR__ . '/wp-load.php' );

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$ck = 'ck_90fdc226fda14f459bfe7d0f38aaae8af258e234';
$cs = 'ShriRamyaSecret2025';

$url = home_url( '/wp-json/wc/v3/products/categories?per_page=1' );

$args = array(
    'headers' => array(
        'Authorization' => 'Basic ' . base64_encode( $ck . ':' . $cs ),
    ),
    'timeout' => 15,
);

$response = wp_remote_get( $url, $args );

if ( is_wp_error( $response ) ) {
    echo "ERROR: " . $response->get_error_message() . "\n";
} else {
    echo "STATUS: " . wp_remote_retrieve_response_code( $response ) . "\n";
    echo "BODY: " . wp_remote_retrieve_body( $response ) . "\n";
}
