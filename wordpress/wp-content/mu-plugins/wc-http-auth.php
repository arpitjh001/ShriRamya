<?php
/*
Plugin Name: WC HTTP Auth Force
Description: Forces WooCommerce REST API to accept Basic Auth and Query String parameters over HTTP.
*/
add_filter( 'woocommerce_rest_is_https', '__return_true', 999 );
