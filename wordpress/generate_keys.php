<?php
/**
 * Script to generate WooCommerce API keys programmatically.
 */

require_once( __DIR__ . '/wp-load.php' );

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

global $wpdb;

$user_id = 1; // Admin user
$description = 'Antigravity API Key';
$permissions = 'read_write';

$consumer_key    = 'ck_' . wc_rand_hash();
$consumer_secret = 'cs_' . wc_rand_hash();

$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    array(
        'user_id'         => $user_id,
        'description'     => $description,
        'permissions'     => $permissions,
        'consumer_key'    => wc_api_hash( $consumer_key ),
        'consumer_secret' => $consumer_secret,
        'truncated_key'   => substr( $consumer_key, -7 ),
    )
);

echo "KEYS_GENERATED\n";
echo "CK=" . $consumer_key . "\n";
echo "CS=" . $consumer_secret . "\n";
