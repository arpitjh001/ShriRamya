<?php
require_once('wp-load.php');

$consumer_key = 'ck_' . bin2hex(random_bytes(20));
$consumer_secret = 'cs_' . bin2hex(random_bytes(20));
$hashed_secret = hash_hmac('sha256', $consumer_secret, 'wc-admin-api-key');

global $wpdb;
$table_name = $wpdb->prefix . 'woocommerce_api_keys';

$result = $wpdb->insert($table_name, array(
    'user_id' => 1,
    'description' => 'Shri Ramya Managed Key',
    'permissions' => 'read_write',
    'consumer_key' => $consumer_key,
    'consumer_secret' => $hashed_secret,
    'truncated_key' => substr($consumer_key, -7)
));

if ($result) {
    echo "SUCCESS\n";
    echo "CK: " . $consumer_key . "\n";
    echo "CS: " . $consumer_secret . "\n";
} else {
    echo "FAILED: " . $wpdb->last_error . "\n";
}
