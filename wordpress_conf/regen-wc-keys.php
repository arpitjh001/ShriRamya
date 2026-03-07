<?php
/**
 * Regenerates WooCommerce REST API keys.
 * Deletes existing keys first, then generates fresh ones.
 * Run: wp --allow-root eval-file /tmp/regen-wc-keys.php
 */
global $wpdb;

// Delete all existing API keys
$wpdb->query("DELETE FROM {$wpdb->prefix}woocommerce_api_keys");
echo "Cleared existing API keys.\n";

// Generate new keys
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

echo "CONSUMER_KEY={$consumer_key}\n";
echo "CONSUMER_SECRET={$consumer_secret}\n";
