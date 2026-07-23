<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, WordPress Language, and ABSPATH. You can find more information
 * by visiting {@link http://codex.wordpress.org/Editing_wp-config.php Editing
 * wp-config.php} Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'castello_world_1');

/** MySQL database username */
define('DB_USER', 'castelloworld1');

/** MySQL database password */
define('DB_PASSWORD', 'G4AY-^G3');

/** MySQL hostname */
define('DB_HOST', 'mysql.castello.world');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         '"q#KWp1!G4SXBV%bz;OtWBq&VYAK_(+"3g_"lZKMT(N1FItK#9HjqU4(8`jd6PXr');
define('SECURE_AUTH_KEY',  'tLA$HpiqrZgR$e0wN;@dNeCHGN!(gRE/89Tm36~~q*k*3Dz#0xy`S1HHEeyq;Zvy');
define('LOGGED_IN_KEY',    '%rfK/gxtJEFb_Ul|^F_|9Tv@*UZLwmtL86%^62x;I?xmdYz4z^BfT"*M0tmI~!!g');
define('NONCE_KEY',        'i!pfaMTV9P3xz&YHBRM2iVs6U0RKt|//jG#Cup~0zVGH7i1y6*Iv!+a^9/t*xM4J');
define('AUTH_SALT',        'l~XsEU^:FeI&AhXF+I`a0o1h1|`Vfkpyq*$Ay+~k6cbc:4V~TM*T()hrBoeCCYC2');
define('SECURE_AUTH_SALT', 'MZ*Il%5(khjo|dm:&9PLlHAryJ4:7nuT:`~7e%q$kobE@D$eH8mO|%gCfY"5Od6Y');
define('LOGGED_IN_SALT',   'OZMk:IA%FF1G~fHm9+bB(J%E|8+%uKx@in(+GH3z*wZeFy!YwcHq|#l;GBooWN9J');
define('NONCE_SALT',       'F(zihraL5Ry`FaVyYZo@3Ac^lKsLR#*&fgBatbw&Mp^24^kSuDh#s"_^0^i*9ci0');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_vgeyyh_';

/**
 * Limits total Post Revisions saved per Post/Page.
 * Change or comment this line out if you would like to increase or remove the limit.
 */
define('WP_POST_REVISIONS',  10);

/**
 * WordPress Localized Language, defaults to English.
 *
 * Change this to localize WordPress. A corresponding MO file for the chosen
 * language must be installed to wp-content/languages. For example, install
 * de_DE.mo to wp-content/languages and set WPLANG to 'de_DE' to enable German
 * language support.
 */
define('WPLANG', '');

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/**
 * Removing this could cause issues with your experience in the DreamHost panel
 */

if (isset($_SERVER['HTTP_HOST']) && preg_match("/^(.*)\.dream\.website$/", $_SERVER['HTTP_HOST'])) {
        $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        define('WP_SITEURL', $proto . '://' . $_SERVER['HTTP_HOST']);
        define('WP_HOME',    $proto . '://' . $_SERVER['HTTP_HOST']);
        define('JETPACK_STAGING_MODE', true);
}

define( 'WP_MEMORY_LIMIT', '128M' );
/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
