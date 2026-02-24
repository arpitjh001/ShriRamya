<?php
require 'wp-load.php';

$user_id = 1;

$consumer_key = 'ck_' . wc_rand_hash();
$consumer_secret = 'cs_' . wc_rand_hash();

global $wpdb;
$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    array(
        'user_id' => $user_id,
        'description' => 'Shri Ramya API',
        'permissions' => 'read_write',
        'consumer_key' => wc_api_hash($consumer_key),
        'consumer_secret' => $consumer_secret,
        'truncated_key' => substr($consumer_key, -7)
    )
);

echo "key=" . $consumer_key . "\n";
echo "secret=" . $consumer_secret . "\n";
