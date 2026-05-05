<?php
/**
 * Plugin Name: Cerebre Intelligence Connector
 * Plugin URI:  https://cerebre.media
 * Description: Connects your WordPress / WooCommerce website to Cerebre Intelligence Platform.
 *              Automatically syncs page views, conversions, leads, orders, and revenue.
 * Version:     1.0.0
 * Author:      Cerebre Media Africa
 * License:     GPL-2.0-or-later
 * Text Domain: cerebre
 *
 * HOW TO INSTALL:
 * 1. Download this file (cerebre.php) and the folder cerebre-intelligence/
 * 2. Upload to /wp-content/plugins/cerebre-intelligence/
 * 3. Activate from WP Admin > Plugins
 * 4. Go to Settings > Cerebre and paste your API key + Brand ID
 */

defined('ABSPATH') || exit;

define('CEREBRE_VERSION', '1.0.0');
define('CEREBRE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CEREBRE_API_BASE', 'https://your-api.railway.app/api'); // Replace with your Railway URL

// ── Settings Page ─────────────────────────────────────────────
add_action('admin_menu', function () {
    add_options_page(
        'Cerebre Intelligence',
        'Cerebre',
        'manage_options',
        'cerebre-settings',
        'cerebre_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('cerebre_options', 'cerebre_api_key');
    register_setting('cerebre_options', 'cerebre_brand_id');
    register_setting('cerebre_options', 'cerebre_enabled');
    register_setting('cerebre_options', 'cerebre_track_woocommerce');
    register_setting('cerebre_options', 'cerebre_track_forms');
    register_setting('cerebre_options', 'cerebre_sync_frequency');
});

function cerebre_settings_page() {
    $api_key  = get_option('cerebre_api_key');
    $brand_id = get_option('cerebre_brand_id');
    $enabled  = get_option('cerebre_enabled', '1');
    $track_wc = get_option('cerebre_track_woocommerce', '1');
    $freq     = get_option('cerebre_sync_frequency', 'hourly');

    // Test connection
    $connection_status = '';
    if (isset($_POST['cerebre_test'])) {
        $response = cerebre_api_request('/health', [], 'GET', $api_key);
        $connection_status = ($response && !is_wp_error($response))
            ? '<span style="color:green">✓ Connected successfully</span>'
            : '<span style="color:red">✗ Connection failed — check your API key</span>';
    }
    ?>
    <div class="wrap">
        <h1>⚡ Cerebre Intelligence Connector</h1>
        <?php if ($connection_status) echo "<div class='notice'><p>$connection_status</p></div>"; ?>

        <form method="post" action="options.php">
            <?php settings_fields('cerebre_options'); ?>
            <table class="form-table">
                <tr>
                    <th>Enable tracking</th>
                    <td><input type="checkbox" name="cerebre_enabled" value="1" <?php checked($enabled, '1'); ?>></td>
                </tr>
                <tr>
                    <th>API Key</th>
                    <td>
                        <input type="password" name="cerebre_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text">
                        <p class="description">From your Cerebre dashboard → Settings → API Key</p>
                    </td>
                </tr>
                <tr>
                    <th>Brand ID</th>
                    <td>
                        <input type="text" name="cerebre_brand_id" value="<?php echo esc_attr($brand_id); ?>" class="regular-text">
                        <p class="description">From your Cerebre dashboard → Settings → Brand ID</p>
                    </td>
                </tr>
                <tr>
                    <th>Track WooCommerce</th>
                    <td>
                        <input type="checkbox" name="cerebre_track_woocommerce" value="1" <?php checked($track_wc, '1'); ?>>
                        <label>Sync orders, revenue, and product performance</label>
                    </td>
                </tr>
                <tr>
                    <th>Track contact forms</th>
                    <td>
                        <input type="checkbox" name="cerebre_track_forms" value="1" <?php checked(get_option('cerebre_track_forms','1'), '1'); ?>>
                        <label>Count Contact Form 7, WPForms, and Gravity Forms submissions as leads</label>
                    </td>
                </tr>
                <tr>
                    <th>Sync frequency</th>
                    <td>
                        <select name="cerebre_sync_frequency">
                            <option value="hourly" <?php selected($freq, 'hourly'); ?>>Every hour</option>
                            <option value="twicedaily" <?php selected($freq, 'twicedaily'); ?>>Twice a day</option>
                            <option value="daily" <?php selected($freq, 'daily'); ?>>Once a day</option>
                        </select>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save settings'); ?>
        </form>

        <form method="post">
            <input type="hidden" name="cerebre_test" value="1">
            <?php submit_button('Test connection', 'secondary'); ?>
        </form>

        <hr>
        <h2>What this plugin tracks</h2>
        <table class="widefat striped">
            <thead><tr><th>Data type</th><th>How often</th><th>Where it appears in Cerebre</th></tr></thead>
            <tbody>
                <tr><td>Page views &amp; sessions</td><td>Hourly</td><td>Website platform → Sessions, Bounce rate</td></tr>
                <tr><td>Contact form leads</td><td>Real-time (on submit)</td><td>Metrics → Leads, Conversion rate</td></tr>
                <tr><td>WooCommerce orders</td><td>Real-time (on order)</td><td>Social Commerce → Orders, Revenue</td></tr>
                <tr><td>WooCommerce products</td><td>Daily</td><td>Industry Intelligence → Product performance</td></tr>
                <tr><td>Average order value</td><td>Daily</td><td>Scorecards → AOV, Revenue attribution</td></tr>
                <tr><td>Traffic sources</td><td>Daily</td><td>Attribution → Social-attributed traffic</td></tr>
            </tbody>
        </table>
    </div>
    <?php
}

// ── Tracking pixel (injected into every page) ─────────────────
add_action('wp_head', function () {
    if (!get_option('cerebre_enabled', '1')) return;
    $brand_id = get_option('cerebre_brand_id');
    $api_base = CEREBRE_API_BASE;
    if (!$brand_id) return;
    ?>
    <script>
    // Cerebre Intelligence Tracker
    (function() {
        var CEREBRE = {
            brandId: '<?php echo esc_js($brand_id); ?>',
            apiBase: '<?php echo esc_js($api_base); ?>',
            sessionId: null,
            pageStart: Date.now(),
        };

        // Generate/restore session ID
        try {
            CEREBRE.sessionId = sessionStorage.getItem('cerebre_sid') || 'cs_' + Math.random().toString(36).substr(2, 12);
            sessionStorage.setItem('cerebre_sid', CEREBRE.sessionId);
        } catch(e) { CEREBRE.sessionId = 'cs_anon'; }

        // Track page view
        CEREBRE.track = function(event, data) {
            fetch(CEREBRE.apiBase + '/website-tracking/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandId: CEREBRE.brandId,
                    sessionId: CEREBRE.sessionId,
                    event: event,
                    url: window.location.href,
                    referrer: document.referrer,
                    title: document.title,
                    timestamp: new Date().toISOString(),
                    data: data || {}
                })
            }).catch(function(){});
        };

        // Track page view on load
        window.addEventListener('load', function() {
            CEREBRE.track('page_view', {
                path: window.location.pathname,
                search: window.location.search,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                language: navigator.language
            });
        });

        // Track scroll depth
        var maxScroll = 0;
        window.addEventListener('scroll', function() {
            var scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            if (scrollPct > maxScroll) maxScroll = scrollPct;
        });

        // Track time on page + scroll depth on leave
        window.addEventListener('beforeunload', function() {
            var timeOnPage = Math.round((Date.now() - CEREBRE.pageStart) / 1000);
            CEREBRE.track('page_exit', { timeOnPage: timeOnPage, maxScrollPct: maxScroll });
        });

        // Expose globally for WooCommerce events
        window.CerebreTracker = CEREBRE;
    })();
    </script>
    <?php
});

// ── Real-time: track contact form leads ──────────────────────

// Contact Form 7
add_action('wpcf7_mail_sent', function ($contact_form) {
    if (!get_option('cerebre_track_forms', '1')) return;
    cerebre_send_event('lead', [
        'source' => 'contact_form_7',
        'form_name' => $contact_form->title(),
        'form_id' => $contact_form->id(),
        'page' => $_SERVER['HTTP_REFERER'] ?? '',
    ]);
});

// WPForms
add_action('wpforms_process_complete', function ($fields, $entry, $form_data) {
    if (!get_option('cerebre_track_forms', '1')) return;
    cerebre_send_event('lead', [
        'source' => 'wpforms',
        'form_name' => $form_data['settings']['form_title'] ?? 'Unknown form',
        'form_id' => $form_data['id'],
    ]);
}, 10, 3);

// Gravity Forms
add_action('gform_after_submission', function ($entry, $form) {
    if (!get_option('cerebre_track_forms', '1')) return;
    cerebre_send_event('lead', [
        'source' => 'gravity_forms',
        'form_name' => $form['title'],
        'form_id' => $form['id'],
    ]);
}, 10, 2);

// ── Real-time: WooCommerce order events ───────────────────────
if (class_exists('WooCommerce')) {

    // New order placed
    add_action('woocommerce_payment_complete', function ($order_id) {
        if (!get_option('cerebre_track_woocommerce', '1')) return;
        $order = wc_get_order($order_id);
        if (!$order) return;

        $items = [];
        foreach ($order->get_items() as $item) {
            $items[] = [
                'product_id' => $item->get_product_id(),
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => $item->get_total(),
            ];
        }

        cerebre_send_event('purchase', [
            'order_id' => $order_id,
            'revenue' => (float) $order->get_total(),
            'items' => $items,
            'payment_method' => $order->get_payment_method_title(),
            'coupon_used' => implode(',', $order->get_coupon_codes()),
        ]);
    });

    // Cart abandoned (session timeout)
    add_action('woocommerce_cart_emptied', function ($clear_persistent_cart) {
        if (!$clear_persistent_cart) return;
        $cart = WC()->cart;
        if (!$cart || $cart->is_empty()) return;
        cerebre_send_event('cart_abandon', [
            'cart_value' => (float) $cart->get_cart_contents_total(),
            'item_count' => $cart->get_cart_contents_count(),
        ]);
    });

    // Add to cart
    add_action('woocommerce_add_to_cart', function ($cart_item_key, $product_id, $quantity, $variation_id) {
        $product = wc_get_product($product_id);
        if (!$product) return;
        cerebre_send_event('add_to_cart', [
            'product_id' => $product_id,
            'product_name' => $product->get_name(),
            'product_price' => (float) $product->get_price(),
            'quantity' => $quantity,
        ]);
    }, 10, 4);
}

// ── Scheduled sync (hourly batch) ─────────────────────────────
add_action('cerebre_hourly_sync', 'cerebre_run_hourly_sync');

function cerebre_run_hourly_sync() {
    if (!get_option('cerebre_enabled', '1')) return;

    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    // Build metrics payload
    $metrics = [
        'platform' => 'website',
        'report_period_start' => $yesterday,
        'report_period_end' => $today,
        'source' => 'wordpress',
    ];

    // WooCommerce metrics
    if (class_exists('WooCommerce') && get_option('cerebre_track_woocommerce', '1')) {
        $orders = cerebre_get_wc_stats($yesterday, $today);
        $metrics['revenue'] = $orders['revenue'];
        $metrics['conversions'] = $orders['count'];
        $metrics['avg_order_value'] = $orders['aov'];
        $metrics['top_products'] = $orders['top_products'];
    }

    // WordPress traffic (from database)
    global $wpdb;
    $page_views = (int) get_transient('cerebre_pageviews_' . $today) ?: 0;
    $metrics['website_visits'] = $page_views;

    cerebre_api_request('/website-tracking/sync', $metrics, 'POST');
}

// Register scheduled event
register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled('cerebre_hourly_sync')) {
        $freq = get_option('cerebre_sync_frequency', 'hourly');
        wp_schedule_event(time(), $freq, 'cerebre_hourly_sync');
    }
});
register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('cerebre_hourly_sync');
});

// ── WooCommerce stats helper ──────────────────────────────────
function cerebre_get_wc_stats($start, $end) {
    global $wpdb;

    $stats = $wpdb->get_row($wpdb->prepare("
        SELECT
            COUNT(*) as order_count,
            SUM(pm.meta_value) as total_revenue
        FROM {$wpdb->posts} p
        JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_order_total'
        WHERE p.post_type = 'shop_order'
          AND p.post_status IN ('wc-completed', 'wc-processing')
          AND p.post_date >= %s
          AND p.post_date < %s
    ", $start, $end . ' 23:59:59'));

    $count = (int) ($stats->order_count ?? 0);
    $revenue = (float) ($stats->total_revenue ?? 0);

    // Top products
    $top_products = $wpdb->get_results($wpdb->prepare("
        SELECT
            oi.order_item_name as name,
            SUM(oim.meta_value) as quantity
        FROM {$wpdb->prefix}woocommerce_order_items oi
        JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
        JOIN {$wpdb->posts} p ON oi.order_id = p.ID
        WHERE oim.meta_key = '_qty'
          AND oi.order_item_type = 'line_item'
          AND p.post_date >= %s AND p.post_date < %s
        GROUP BY oi.order_item_name
        ORDER BY quantity DESC
        LIMIT 10
    ", $start, $end . ' 23:59:59'), ARRAY_A);

    return [
        'count' => $count,
        'revenue' => $revenue,
        'aov' => $count > 0 ? $revenue / $count : 0,
        'top_products' => $top_products,
    ];
}

// ── API request helper ────────────────────────────────────────
function cerebre_api_request($endpoint, $data = [], $method = 'POST', $api_key = null) {
    if (!$api_key) $api_key = get_option('cerebre_api_key');
    $brand_id = get_option('cerebre_brand_id');

    if (!$api_key || !$brand_id) return false;

    $args = [
        'method'  => $method,
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
            'X-Brand-ID'    => $brand_id,
        ],
        'timeout' => 10,
    ];

    if ($method !== 'GET' && !empty($data)) {
        $args['body'] = json_encode(array_merge($data, ['brandId' => $brand_id]));
    }

    $url = CEREBRE_API_BASE . $endpoint;
    $response = wp_remote_request($url, $args);

    if (is_wp_error($response)) {
        error_log('[Cerebre] API error: ' . $response->get_error_message());
        return false;
    }

    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

// ── Send event helper ─────────────────────────────────────────
function cerebre_send_event($event_type, $data = []) {
    cerebre_api_request('/website-tracking/event', array_merge($data, [
        'event' => $event_type,
        'timestamp' => date('c'),
        'source' => 'wordpress_plugin',
    ]));
}

// ── WooCommerce tracking JS ───────────────────────────────────
add_action('wp_footer', function () {
    if (!class_exists('WooCommerce') || !get_option('cerebre_track_woocommerce', '1')) return;
    if (!is_checkout() && !is_product()) return;
    ?>
    <script>
    // Cerebre WooCommerce events
    jQuery(document).ready(function($) {
        // Checkout initiated
        $('form.checkout').on('checkout_place_order', function() {
            if (window.CerebreTracker) {
                window.CerebreTracker.track('checkout_initiated', {
                    cart_value: <?php echo (float) WC()->cart->get_total('numeric'); ?>
                });
            }
        });
    });
    </script>
    <?php
});
