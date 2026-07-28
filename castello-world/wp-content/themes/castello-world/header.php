<?php
/**
 * The header template
 *
 * @package Castello_World
 */

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/playhtml@2.13.2/dist/style.css">
    <script type="module" src="https://unpkg.com/playhtml@2.13.2/dist/init.es.js"></script>
    <?php wp_head(); ?>
    <link rel="icon" href="<?php echo esc_url( home_url( '/favicon.svg' ) ); ?>" type="image/svg+xml">
    <link rel="icon" href="<?php echo esc_url( home_url( '/favicon.ico' ) ); ?>" sizes="32x32 48x48 256x256">
    <link rel="apple-touch-icon" href="<?php echo esc_url( home_url( '/apple-touch-icon.png' ) ); ?>">
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
