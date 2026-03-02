<?php
/**
 * Script to restore WooCommerce API keys without full WP boot.
 */

// Only load DB config
$content = file_get_contents(__DIR__ . '/wp-config.php');
preg_match("/define\( 'DB_NAME', '(.*?)' \);/", $content, $db_name);
preg_match("/define\( 'DB_USER', '(.*?)' \);/", $content, $db_user);
preg_match("/define\( 'DB_PASSWORD', '(.*?)' \);/", $content, $db_pass);
preg_match("/define\( 'DB_HOST', '(.*?)' \);/", $content, $db_host);

// Fallback to defaults if preg_match fails (env vars)
$dbname = getenv('WORDPRESS_DB_NAME') ?: 'shriramya';
$dbuser = getenv('WORDPRESS_DB_USER') ?: 'wpuser';
$dbpass = getenv('WORDPRESS_DB_PASSWORD') ?: 'wppassword';
$dbhost = getenv('WORDPRESS_DB_HOST') ?: 'mysql';

$conn = new mysqli($dbhost, $dbuser, $dbpass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$ck = 'ck_90fdc226fda14f459bfe7d0f38aaae8af258e234';
$cs = 'ShriRamyaSecret2025';

// WooCommerce uses hash_hmac('sha256', $ck, 'wc-api') for the stored key
$hashed_ck = hash_hmac( 'sha256', $ck, 'wc-api' );

$conn->query("DELETE FROM wp_woocommerce_api_keys WHERE description = 'Migrated Key'");
$sql = "INSERT INTO wp_woocommerce_api_keys (user_id, description, permissions, consumer_key, consumer_secret, truncated_key) 
        VALUES (1, 'Migrated Key', 'read_write', '$hashed_ck', '$cs', 'ae8af25')";

if ($conn->query($sql) === TRUE) {
    echo "KEYS_RESTORED_SUCCESSFULLY";
} else {
    echo "Error: " . $conn->error;
}

$conn->close();
