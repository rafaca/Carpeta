<?php
/**
 * Plugin Name: RC Exclude My Visits
 * Description: Cookie-based GA4 opt-out. Visit /exclude-me to set cookie, /include-me to remove it.
 * Version: 1.0
 * Author: Rafa Castello
 */

// Register the opt-out/opt-in URL endpoints
add_action('init', function () {
    $request = isset($_SERVER['REQUEST_URI']) ? strtok($_SERVER['REQUEST_URI'], '?') : '';
    $request = rtrim($request, '/');

    if ($request === '/exclude-me') {
        setcookie('rc_exclude_analytics', '1', [
            'expires'  => time() + (10 * 365 * 24 * 60 * 60), // 10 years
            'path'     => '/',
            'secure'   => true,
            'httponly'  => false,
            'samesite'  => 'Lax',
        ]);
        wp_die(
            '<div style="font-family:system-ui;text-align:center;padding:60px 20px;">'
            . '<h1 style="color:#2e7d32;">&#10003; Analytics excluded</h1>'
            . '<p>Your visits to <strong>' . esc_html($_SERVER['HTTP_HOST']) . '</strong> will no longer be tracked by Google Analytics.</p>'
            . '<p style="color:#666;font-size:14px;">Cookie set for 10 years. Visit <code>/include-me</code> to reverse this.</p>'
            . '</div>',
            'Analytics Excluded',
            200
        );
    }

    if ($request === '/include-me') {
        setcookie('rc_exclude_analytics', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => true,
            'httponly'  => false,
            'samesite'  => 'Lax',
        ]);
        wp_die(
            '<div style="font-family:system-ui;text-align:center;padding:60px 20px;">'
            . '<h1 style="color:#d32f2f;">&#10007; Analytics re-enabled</h1>'
            . '<p>Your visits to <strong>' . esc_html($_SERVER['HTTP_HOST']) . '</strong> will now be tracked again.</p>'
            . '</div>',
            'Analytics Included',
            200
        );
    }
});

// Always inject the GA disable script — cookie check happens client-side
// This is cache-safe: works even if Cloudflare or WP caching serves stale HTML
add_action('wp_head', function () {
    ?>
    <script>
    // RC Exclude: client-side cookie check, cache-safe
    (function() {
        if (document.cookie.indexOf('rc_exclude_analytics=1') === -1) return;
        window['ga-disable'] = true;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'gtm.init_consent',
            'analytics_storage': 'denied'
        });
        window.gtag = function() {};
        var origCreateElement = document.createElement;
        document.createElement = function(tag) {
            var el = origCreateElement.call(document, tag);
            if (tag.toLowerCase() === 'script') {
                var origSetAttribute = el.setAttribute.bind(el);
                el.setAttribute = function(name, value) {
                    if (name === 'src' && typeof value === 'string' &&
                        (value.includes('googletagmanager.com/gtag') ||
                         value.includes('google-analytics.com'))) {
                        return;
                    }
                    return origSetAttribute(name, value);
                };
                var descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                if (descriptor && descriptor.set) {
                    Object.defineProperty(el, 'src', {
                        set: function(value) {
                            if (typeof value === 'string' &&
                                (value.includes('googletagmanager.com/gtag') ||
                                 value.includes('google-analytics.com'))) {
                                return;
                            }
                            descriptor.set.call(this, value);
                        },
                        get: function() {
                            return descriptor.get ? descriptor.get.call(this) : '';
                        }
                    });
                }
            }
            return el;
        };
    })();
    </script>
    <?php
}, 1); // Priority 1 = runs before Site Kit (priority 10)
