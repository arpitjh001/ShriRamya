<?php
define('ABSPATH', dirname(__FILE__) . '/');
define('WPINC', 'wp-includes');

// Manually bootstrap WordPress
$_SERVER['HTTP_HOST'] = 'wordpress';
$_SERVER['REQUEST_URI'] = '/';
require_once '/var/www/html/wp-load.php';

// Generate raw keys
$consumer_key    = 'ck_' . wc_rand_hash();
$consumer_secret = 'cs_' . wc_rand_hash();

// Store in DB using WooCommerce's own method
global $wpdb;
$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    array(
        'user_id'         => 1,
        'description'     => 'Shri Ramya Backend Auto',
        'permissions'     => 'read_write',
        'consumer_key'    => wc_api_hash( $consumer_key ),
        'consumer_secret' => $consumer_secret,
        'truncated_key'   => substr( $consumer_key, -7 ),
    ),
    array( '%d', '%s', '%s', '%s', '%s', '%s' )
);

echo "CONSUMER_KEY=" . $consumer_key . "\n";
echo "CONSUMER_SECRET=" . $consumer_secret . "\n";
echo "Inserted ID=" . $wpdb->insert_id . "\n";
