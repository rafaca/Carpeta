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
    <script>
    // Daylight: page luminance follows the visitor's local time of day.
    // light = 0 at midnight, 1 at noon; ink flips to keep the mark readable.
    (function () {
        function update() {
            var now = new Date();
            var h = now.getHours() + now.getMinutes() / 60;
            var light = (1 - Math.cos(Math.PI * h / 12)) / 2;
            var v = Math.round(light * 242);
            var root = document.documentElement.style;
            root.setProperty('--bg', 'rgb(' + v + ',' + v + ',' + v + ')');
            root.setProperty('--ink', light >= 0.5 ? '#000000' : '#ffffff');
        }
        update();
        setInterval(update, 60000);
    })();
    </script>
    <?php wp_head(); ?>
    <link rel="icon" href="<?php echo esc_url( home_url( '/favicon.svg' ) ); ?>" type="image/svg+xml">
    <link rel="icon" href="<?php echo esc_url( home_url( '/favicon.ico' ) ); ?>" sizes="32x32 48x48 256x256">
    <link rel="apple-touch-icon" href="<?php echo esc_url( home_url( '/apple-touch-icon.png' ) ); ?>">
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
