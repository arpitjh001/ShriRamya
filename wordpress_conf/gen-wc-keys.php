<?php
/**
 * Generates WooCommerce REST API keys and outputs them.
 * Run: wp --allow-root eval-file /tmp/gen-wc-keys.php
 */
global $wpdb;

// Check for existing API keys
$existing = $wpdb->get_results("SELECT key_id, description, truncated_key, permissions FROM {$wpdb->prefix}woocommerce_api_keys");

if (!empty($existing)) {
    echo "Existing API Keys:\n";
    foreach ($existing as $k) {
        echo "  ID: {$k->key_id} | Desc: {$k->description} | Key: ...{$k->truncated_key} | Perms: {$k->permissions}\n";
    }
    echo "\nNote: Consumer secret is only shown at creation time.\n";
    echo "If you need new keys, delete the existing ones first.\n";
} else {
    echo "No existing API keys. Generating new ones...\n";

    // Generate keys
    $consumer_key = 'ck_' . wc_rand_hash();
    $consumer_secret = 'cs_' . wc_rand_hash();

    $data = array(
        'user_id'         => 1,
        'description'     => 'ShriRamya Backend',
        'permissions'     => 'read_write',
        'consumer_key'    => wc_api_hash($consumer_key),
        'consumer_secret' => $consumer_secret,
        'truncated_key'   => substr($consumer_key, -7),
    );

    $wpdb->insert($wpdb->prefix . 'woocommerce_api_keys', $data);

    echo "NEW API KEYS GENERATED:\n";
    echo "Consumer Key: {$consumer_key}\n";
    echo "Consumer Secret: {$consumer_secret}\n";
    echo "\nUpdate your .env with these values.\n";
}
