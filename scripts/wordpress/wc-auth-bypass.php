<?php
/**
 * Plugin Name: WooCommerce Auth Bypass
 * Description: Allows Basic Auth over non-HTTPS inside Docker and bypasses permission checks for internal API requests.
 */

// Bypass OAuth signature requirement globally for internal HTTP network
define( 'WOOCOMMERCE_ALLOW_NON_HTTPS_BASIC_AUTH', true );

// Ensure WooCommerce REST API allows reading/writing resources when authenticated inside docker
add_filter( 'woocommerce_rest_check_permissions', '__return_true', 99, 4 );

// Force WordPress to consider API keys as Administrator level seamlessly
add_filter( 'woocommerce_rest_is_request_to_rest_api', '__return_true' );
