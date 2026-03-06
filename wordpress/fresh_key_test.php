<?php
/**
 * Generate a fresh WooCommerce API key and test it immediately.
 */

require_once( __DIR__ . '/wp-load.php' );

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

global $wpdb;

$user_id = 1;
$desc = 'Fresh Key ' . time();
$ck_plain = 'ck_' . bin2hex(random_bytes(20));
$cs_plain = 'cs_' . bin2hex(random_bytes(20));

// Use the official hash function
$ck_hash = hash_hmac( 'sha256', $ck_plain, 'wc-api' );

$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    array(
        'user_id'         => $user_id,
        'description'     => $desc,
        'permissions'     => 'read_write',
        'consumer_key'    => $ck_hash,
        'consumer_secret' => $cs_plain,
        'truncated_key'   => substr( $ck_plain, -7 ),
    )
);

echo "NEW_KEY_CREATED\n";
echo "CK=$ck_plain\n";
echo "CS=$cs_plain\n";

// Test it immediately
$url = home_url( '/wp-json/wc/v3/products/categories?per_page=1' );
$args = array(
    'headers' => array(
        'Authorization' => 'Basic ' . base64_encode( $ck_plain . ':' . $cs_plain ),
    ),
    'timeout' => 10,
);

$response = wp_remote_get( $url, $args );

if ( is_wp_error( $response ) ) {
    echo "TEST_FAILED: " . $response->get_error_message() . "\n";
} else {
    echo "TEST_STATUS: " . wp_remote_retrieve_response_code( $response ) . "\n";
    echo "TEST_BODY: " . wp_remote_retrieve_body( $response ) . "\n";
}
