<?php
/*
Plugin Name: Allow Internal Docker Requests
Description: Allows WordPress to make HTTP requests to internal Docker services like 'backend' or 'nginx'.
*/

add_filter( 'http_request_host_is_external', function( $is_external, $host ) {
    if ( $host === 'backend' || $host === 'nginx' ) {
        return true;
    }
    return $is_external;
}, 10, 2 );

add_filter( 'http_request_args', function( $args, $url ) {
    // Specifically allow internal docker hostnames
    if ( strpos( $url, 'backend' ) !== false || strpos( $url, 'nginx' ) !== false ) {
        $args['reject_unsafe_urls'] = false;
    }
    return $args;
}, 10, 2 );
