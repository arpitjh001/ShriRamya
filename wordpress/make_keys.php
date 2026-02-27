<?php
// Load WordPress
require_once('wp-load.php');

// Create new API key
$key_data = array(
    'user_id' => 1,
    'description' => 'Shri Ramya Backend Key',
    'permissions' => 'read_write',
);

$key = WC()->api->create_api_key( $key_data );

if ( ! is_wp_error( $key ) ) {
    echo "CK: " . $key['consumer_key'] . "\n";
    echo "CS: " . $key['consumer_secret'] . "\n";
} else {
    echo "Error: " . $key->get_error_message() . "\n";
}
