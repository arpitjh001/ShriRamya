<?php
require_once('wp-load.php');

if (!class_exists('WooCommerce')) {
    echo "WooCommerce not active\n";
    exit;
}

$user_id = 1; // Admin user
$description = 'Shri Ramya Managed Key';

// Create new key
$data = array(
    'user_id' => $user_id,
    'description' => $description,
    'permissions' => 'read_write',
    'consumer_key' => wc_generate_api_key(),
    'consumer_secret' => wc_generate_api_key(),
);

$key_id = WC_Admin_API_Keys::set_key($data);

if ($key_id) {
    echo "SUCCESS\n";
    echo "CK: " . $data['consumer_key'] . "\n";
    echo "CS: " . $data['consumer_secret'] . "\n";
} else {
    echo "FAILED\n";
}
