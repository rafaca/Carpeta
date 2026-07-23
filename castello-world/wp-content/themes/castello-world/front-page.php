<?php
/**
 * The front page template
 *
 * @package Castello_World
 */

get_header();
?>

<div class="landing">
    <nav class="navbar">
        <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>" class="nav-link">ABOUT</a>
        <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="nav-link">CONTACT</a>

        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo" aria-label="<?php esc_attr_e( 'castello.world home', 'castello-world' ); ?>">
            <svg width="38" height="69" viewBox="0 0 38 69" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M23.4 48.75H23.05C17.75 48.75 16.56 42.33 16.56 34.39C16.56 26.45 17.75 20.02 23.05 20.02H23.4C23.71 20.02 23.96 19.55 23.96 18.95C23.96 18.52 23.83 18.15 23.63 17.98L23.59 17.95C22.22 16.9 20.69 16.31 19.09 16.31C12.61 16.31 10.3 25.65 10.3 34.39C10.3 43.13 12.61 52.47 19.09 52.47C20.7 52.47 22.23 51.88 23.6 50.83C23.81 50.67 23.96 50.28 23.96 49.83C23.96 49.24 23.71 48.76 23.4 48.76V48.75Z" fill="white"/>
<path d="M20.44 66.3C11.61 64.84 5.53 51.11 5.53 34.38C5.53 17.65 11.61 3.92 20.45 2.46C20.76 2.46 21.01 1.98 21.01 1.38C21.01 0.779999 20.76 0.309999 20.45 0.309999C19.67 0.0999995 18.87 0 18.06 0C8.1 0 0 15.42 0 34.38C0 53.34 8.1 68.76 18.06 68.76C18.91 68.76 19.75 68.65 20.57 68.43C20.83 68.33 21.02 67.9 21.02 67.38C21.02 66.79 20.77 66.31 20.46 66.31L20.44 66.3Z" fill="white"/>
<path d="M20.5 59.71C20.5 59.71 20.48 59.71 20.47 59.7C20.47 59.7 20.49 59.7 20.5 59.71Z" fill="white"/>
<path d="M20.48 59.7C20.23 59.59 20.05 59.16 20.05 58.66C20.05 58.07 20.3 57.6 20.6 57.59C27.89 57.31 31.78 47.03 31.78 34.39C31.78 21.75 27.89 11.48 20.61 11.19C20.3 11.19 20.05 10.71 20.05 10.11C20.05 9.61 20.23 9.19 20.47 9.07L20.51 9.05C21.71 8.47 22.96 8.15 24.26 8.15C28.03 8.15 31.46 10.84 33.92 15.74C36.35 20.58 37.69 27.2 37.69 34.38C37.69 41.56 36.35 48.18 33.92 53.02C31.46 57.91 28.03 60.61 24.26 60.61C22.96 60.61 21.71 60.29 20.51 59.71" fill="white"/>
</svg>
        </a>

        <a href="<?php echo esc_url( home_url( '/work/' ) ); ?>" class="nav-link">WORK</a>
        <a href="<?php echo esc_url( home_url( '/capabilities/' ) ); ?>" class="nav-link">CAPABILITIES</a>
    </nav>

    <main class="hero">
        <p class="tagline">castello.world is a research practice in service of culture and people</p>
    </main>
</div>

<?php get_footer(); ?>
