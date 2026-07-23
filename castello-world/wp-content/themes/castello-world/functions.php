<?php
/**
 * Castello World theme functions and definitions
 *
 * @package Castello_World
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Sets up theme defaults and registers support for various WordPress features.
 */
function castello_world_setup() {
    // Add default posts and comments RSS feed links to head.
    add_theme_support( 'automatic-feed-links' );

    // Let WordPress manage the document title.
    add_theme_support( 'title-tag' );

    // Enable support for Post Thumbnails on posts and pages.
    add_theme_support( 'post-thumbnails' );

    // Register nav menus.
    register_nav_menus(
        array(
            'primary' => esc_html__( 'Primary Menu', 'castello-world' ),
        )
    );

    // HTML5 support.
    add_theme_support(
        'html5',
        array(
            'search-form',
            'comment-form',
            'comment-list',
            'gallery',
            'caption',
            'style',
            'script',
        )
    );
}
add_action( 'after_setup_theme', 'castello_world_setup' );

/**
 * Enqueue scripts and styles.
 */
function castello_world_scripts() {
    // Enqueue main stylesheet
    wp_enqueue_style(
        'castello-world-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get( 'Version' )
    );
}
add_action( 'wp_enqueue_scripts', 'castello_world_scripts' );

/**
 * Remove admin bar margin for logged in users (we handle it in CSS)
 */
function castello_world_admin_bar_style() {
    remove_action( 'wp_head', '_admin_bar_bump_cb' );
}
add_action( 'get_header', 'castello_world_admin_bar_style' );
