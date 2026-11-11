<?php
/**
 * Plugin Name: wrk. app bridge
 * Description: Lets the wrk. mobile app create an order from SKUs and marks it paid only after checking the payment with Moyasar.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 *
 * Setup (wp-config.php):
 *   define('WRK_MOYASAR_SECRET', 'sk_test_...');   // Moyasar SECRET key, used only on the server to verify payments
 * Optional:
 *   define('WRK_APP_SHIPPING_FEE', 0);             // SAR, flat. Default 0: delivery is included in the price
 *   define('WRK_APP_FREE_SHIPPING_FROM', 0);       // SAR, subtotal from which shipping is free
 *
 * Endpoints (namespace wrk/v1):
 *   POST /app/order                 create a pending order. Prices always come from WooCommerce, never from the app.
 *   POST /app/order/<id>/paid       { key, payment_id }  verify with Moyasar, then payment_complete()
 *   GET  /app/order/<id>?key=...    status for the app's order screen
 */

if (!defined('ABSPATH')) { exit; }

add_action('rest_api_init', function () {
    register_rest_route('wrk/v1', '/app/order', [
        'methods' => 'POST',
        'callback' => 'wrk_app_create_order',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('wrk/v1', '/app/order/(?P<id>\d+)/paid', [
        'methods' => 'POST',
        'callback' => 'wrk_app_order_paid',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('wrk/v1', '/app/order/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'wrk_app_order_status',
        'permission_callback' => '__return_true',
    ]);
});

function wrk_app_error($code, $message, $status = 400) {
    return new WP_Error($code, $message, ['status' => $status]);
}

/** At most $max calls per $window seconds from one IP address. */
function wrk_app_throttle($bucket, $max, $window) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    $key = 'wrk_app_' . $bucket . '_' . md5($ip);
    $n = (int) get_transient($key);
    if ($n >= $max) { return false; }
    set_transient($key, $n + 1, $window);
    return true;
}

function wrk_app_clean($value, $max) {
    $s = sanitize_text_field(is_scalar($value) ? (string) $value : '');
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}

function wrk_app_create_order(WP_REST_Request $req) {
    if (!function_exists('wc_create_order')) { return wrk_app_error('wrk_no_woo', 'WooCommerce is not active.', 500); }
    if (!wrk_app_throttle('create', 12, 10 * MINUTE_IN_SECONDS)) { return wrk_app_error('wrk_rate', 'Too many requests.', 429); }

    $p = $req->get_json_params();
    $items = isset($p['items']) && is_array($p['items']) ? $p['items'] : [];
    $customer = isset($p['customer']) && is_array($p['customer']) ? $p['customer'] : [];
    $address = isset($p['address']) && is_array($p['address']) ? $p['address'] : [];
    if (count($items) < 1 || count($items) > 30) { return wrk_app_error('wrk_items', 'The cart is empty.'); }

    $name = wrk_app_clean($customer['name'] ?? '', 60);
    $mobile = preg_replace('/\D/', '', (string) ($customer['mobile'] ?? ''));
    $email = sanitize_email((string) ($customer['email'] ?? ''));
    $city = wrk_app_clean($address['city'] ?? '', 40);
    $district = wrk_app_clean($address['district'] ?? '', 40);
    $street = wrk_app_clean($address['street'] ?? '', 80);
    $extra = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) ($address['extra'] ?? '')));
    if (mb_strlen($name) < 3 || !preg_match('/^05\d{8}$/', $mobile) || $city === '' || $district === '' || $street === '') {
        return wrk_app_error('wrk_customer', 'Name, mobile and address are required.');
    }

    // Resolve every line before creating anything.
    $lines = [];
    foreach ($items as $it) {
        $sku = wrk_app_clean($it['sku'] ?? '', 40);
        $qty = max(1, min(99, (int) ($it['quantity'] ?? 1)));
        $pid = $sku !== '' ? wc_get_product_id_by_sku($sku) : 0;
        $product = $pid ? wc_get_product($pid) : null;
        if (!$product || !$product->is_purchasable() || !$product->is_in_stock()) {
            return wrk_app_error('wrk_sku', 'Not available: ' . $sku, 409);
        }
        // Personalisation: one meta per field, with the same labels the web shop writes.
        $fields = [];
        $allowed = ['الاسم' => 40, 'Name' => 40, 'أول يوم' => 10, 'الرسالة' => 60, 'من' => 30];
        if (isset($it['fields']) && is_array($it['fields'])) {
            foreach ($allowed as $label => $max) {
                if (isset($it['fields'][$label])) {
                    $v = wrk_app_clean($it['fields'][$label], $max);
                    if ($v !== '') { $fields[$label] = $v; }
                }
            }
        }
        $lines[] = [$product, $qty, $fields];
    }

    $order = wc_create_order(['status' => 'pending', 'created_via' => 'wrk-app']);
    if (is_wp_error($order)) { return wrk_app_error('wrk_create', 'Could not create the order.', 500); }

    $notes = [];
    foreach ($lines as $l) {
        list($product, $qty, $fields) = $l;
        $item_id = $order->add_product($product, $qty);
        if ($item_id && $fields) {
            $parts = [];
            foreach ($fields as $label => $v) {
                wc_add_order_item_meta($item_id, $label, $v);
                $parts[] = $label . ': ' . $v;
            }
            $notes[] = $product->get_name() . ' · ' . implode(' · ', $parts);
        }
    }

    $addr = [
        'first_name' => $name, 'last_name' => '', 'phone' => $mobile, 'email' => $email,
        'country' => 'SA', 'city' => $city, 'address_1' => $street, 'address_2' => $district, 'state' => '', 'postcode' => '',
    ];
    $order->set_address($addr, 'billing');
    unset($addr['email']);
    $order->set_address($addr, 'shipping');
    if ($extra !== '') { $order->update_meta_data('_wrk_short_address', substr($extra, 0, 8)); }
    if ($notes) { $order->set_customer_note(implode("\n", $notes)); }

    $fee = defined('WRK_APP_SHIPPING_FEE') ? (float) WRK_APP_SHIPPING_FEE : 0.0;
    $free_from = defined('WRK_APP_FREE_SHIPPING_FROM') ? (float) WRK_APP_FREE_SHIPPING_FROM : 0.0;
    $order->calculate_totals();
    $shipping = ((float) $order->get_total() >= $free_from) ? 0.0 : $fee;
    $ship = new WC_Order_Item_Shipping();
    $ship->set_method_title($shipping > 0 ? 'شحن' : 'التوصيل مشمول في السعر');
    $ship->set_method_id('wrk_app');
    $ship->set_total($shipping);
    $order->add_item($ship);

    $order->set_payment_method('moyasar');
    $order->set_payment_method_title('Moyasar (wrk. app)');
    $order->calculate_totals();
    $order->save();

    return rest_ensure_response([
        'id' => $order->get_id(),
        'number' => $order->get_order_number(),
        'key' => $order->get_order_key(),
        'total' => (float) $order->get_total(),
        'shipping' => (float) $order->get_shipping_total(),
        'currency' => $order->get_currency(),
    ]);
}

/** Loads the order and checks the key the app was given when it created the order. */
function wrk_app_get_order(WP_REST_Request $req, $key) {
    $order = function_exists('wc_get_order') ? wc_get_order((int) $req['id']) : null;
    if (!$order || !is_string($key) || $key === '' || !hash_equals($order->get_order_key(), $key)) {
        return wrk_app_error('wrk_not_found', 'Order not found.', 404);
    }
    return $order;
}

function wrk_app_status_of($order) {
    $stage = (string) $order->get_meta('_wrk_stage');   // optional manual stage: personalising | shipped | out-for-delivery | delivered
    $map = ['pending' => 'pending-payment', 'failed' => 'cancelled', 'cancelled' => 'cancelled', 'refunded' => 'cancelled',
            'on-hold' => 'paid', 'processing' => 'paid', 'completed' => 'shipped'];
    $status = isset($map[$order->get_status()]) ? $map[$order->get_status()] : 'paid';
    if (in_array($status, ['paid', 'shipped'], true) && in_array($stage, ['personalising', 'shipped', 'out-for-delivery', 'delivered'], true)) {
        $status = $stage;
    }
    $out = ['status' => $status];
    $tracking = (string) $order->get_meta('_wrk_tracking_url');
    if ($tracking !== '') { $out['tracking_url'] = esc_url_raw($tracking); }
    return $out;
}

function wrk_app_order_status(WP_REST_Request $req) {
    if (!wrk_app_throttle('status', 120, 10 * MINUTE_IN_SECONDS)) { return wrk_app_error('wrk_rate', 'Too many requests.', 429); }
    $order = wrk_app_get_order($req, $req->get_param('key'));
    if (is_wp_error($order)) { return $order; }
    return rest_ensure_response(wrk_app_status_of($order));
}

function wrk_app_order_paid(WP_REST_Request $req) {
    if (!wrk_app_throttle('paid', 30, 10 * MINUTE_IN_SECONDS)) { return wrk_app_error('wrk_rate', 'Too many requests.', 429); }
    $p = $req->get_json_params();
    $order = wrk_app_get_order($req, $p['key'] ?? '');
    if (is_wp_error($order)) { return $order; }
    if ($order->is_paid()) { return rest_ensure_response(wrk_app_status_of($order)); }

    $payment_id = isset($p['payment_id']) ? (string) $p['payment_id'] : '';
    if (!preg_match('/^[A-Za-z0-9\-]{10,64}$/', $payment_id)) { return wrk_app_error('wrk_payment', 'Bad payment id.'); }
    if (!defined('WRK_MOYASAR_SECRET') || WRK_MOYASAR_SECRET === '') { return wrk_app_error('wrk_config', 'Payment verification is not configured.', 500); }

    // One payment pays one order.
    $used = wc_get_orders(['limit' => 1, 'return' => 'ids', 'transaction_id' => $payment_id, 'exclude' => [$order->get_id()]]);
    if (!empty($used)) { return wrk_app_error('wrk_payment_used', 'Payment already used.', 409); }

    $res = wp_remote_get('https://api.moyasar.com/v1/payments/' . rawurlencode($payment_id), [
        'timeout' => 15,
        'headers' => ['Authorization' => 'Basic ' . base64_encode(WRK_MOYASAR_SECRET . ':'), 'Accept' => 'application/json'],
    ]);
    if (is_wp_error($res) || (int) wp_remote_retrieve_response_code($res) !== 200) {
        return wrk_app_error('wrk_gateway', 'Could not verify the payment.', 502);
    }
    $pay = json_decode(wp_remote_retrieve_body($res), true);
    $expected = (int) round(((float) $order->get_total()) * 100);
    $ok = is_array($pay)
        && in_array($pay['status'] ?? '', ['paid', 'captured'], true)
        && strtoupper((string) ($pay['currency'] ?? '')) === 'SAR'
        && (int) ($pay['amount'] ?? 0) === $expected
        && (string) ($pay['metadata']['order_id'] ?? '') === (string) $order->get_id();
    if (!$ok) {
        $order->add_order_note('wrk. app: payment ' . $payment_id . ' did not match this order and was rejected.');
        return wrk_app_error('wrk_mismatch', 'The payment does not match the order.', 402);
    }

    $order->payment_complete($payment_id);
    $order->add_order_note('wrk. app: paid with Moyasar payment ' . $payment_id . '.');
    return rest_ensure_response(wrk_app_status_of(wc_get_order($order->get_id())));
}
