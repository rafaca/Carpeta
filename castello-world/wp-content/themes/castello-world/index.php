<?php
/**
 * The main template file
 *
 * @package Castello_World
 */

get_header();
?>

<div class="landing">
    <nav class="navbar">
        <?php
        // Get menu items
        $menu_items = wp_get_nav_menu_items( 'primary' );
        $left_items = array();
        $right_items = array();

        if ( $menu_items ) {
            $count = count( $menu_items );
            $mid = ceil( $count / 2 );
            foreach ( $menu_items as $index => $item ) {
                if ( $index < $mid ) {
                    $left_items[] = $item;
                } else {
                    $right_items[] = $item;
                }
            }
        }

        // Output left menu items
        foreach ( $left_items as $item ) {
            echo '<a href="' . esc_url( $item->url ) . '" class="nav-link">' . esc_html( $item->title ) . '</a>';
        }
        ?>

        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo" aria-label="<?php esc_attr_e( 'castello.world home', 'castello-world' ); ?>">
            <svg width="56" height="90" viewBox="0 0 56 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer ellipse (left arc) -->
                <path d="M32 8 C12 20 12 70 32 82" stroke="white" stroke-width="1.2" fill="none"/>
                <!-- Inner ellipse (right arc) -->
                <path d="M24 8 C44 20 44 70 24 82" stroke="white" stroke-width="1.2" fill="none"/>
                <!-- Vertical line -->
                <line x1="28" y1="27" x2="28" y2="63" stroke="white" stroke-width="1.2"/>
            </svg>
        </a>

        <?php
        // Output right menu items
        foreach ( $right_items as $item ) {
            echo '<a href="' . esc_url( $item->url ) . '" class="nav-link">' . esc_html( $item->title ) . '</a>';
        }

        // Fallback if no menu is set
        if ( ! $menu_items ) {
            echo '<a href="#about" class="nav-link">ABOUT</a>';
            echo '<a href="#contact" class="nav-link">CONTACT</a>';
        }
        ?>

        <?php if ( ! $menu_items ) : ?>
        <a href="#work" class="nav-link">WORK</a>
        <a href="#capabilities" class="nav-link">CAPABILITIES</a>
        <?php endif; ?>
    </nav>

    <main class="hero">
        <?php if ( is_front_page() ) : ?>
            <p class="tagline"><?php echo esc_html( get_bloginfo( 'description' ) ?: 'castello.world is a research practice in service of culture and people' ); ?></p>
        <?php else : ?>
            <div class="page-content">
                <?php
                if ( have_posts() ) :
                    while ( have_posts() ) :
                        the_post();
                        ?>
                        <h1><?php the_title(); ?></h1>
                        <?php the_content(); ?>
                        <?php
                    endwhile;
                endif;
                ?>
            </div>
        <?php endif; ?>
    </main>
</div>

<?php get_footer(); ?>
