<?php
/*
Plugin Name: ShipStation User Dashboard
Description: Allow users to connect ShipStation, select stores, and search/manage orders from the frontend.
Version: 1.0
Author: Your Name
*/

if (!defined('ABSPATH')) exit;

define('SSUD_PATH', plugin_dir_path(__FILE__));
define('SSUD_URL', plugin_dir_url(__FILE__));

//-------------------- ASSETS -----------------------

function ssud_enqueue_assets() {
    wp_enqueue_style('ssud-style', SSUD_URL . 'assets/css/ssud-style.css', [], '1.0');
    wp_enqueue_script('ssud-script', SSUD_URL . 'assets/js/script.js', ['jquery'], '1.0', true);
    wp_localize_script('ssud-script', 'ssud_ajax', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('ssud_nonce'),
        'plugin_url' => SSUD_URL
    ]);
}
add_action('wp_enqueue_scripts', 'ssud_enqueue_assets');

//-------------------- LOGGING ----------------------

function ssud_log($label, $value = null) {
    $file = SSUD_PATH . 'ssud.log';
    $msg = date('[Y-m-d H:i:s] ') . $label;
    if ($value !== null) $msg .= ': ' . print_r($value, true);
    $msg .= "\n";
    file_put_contents($file, $msg, FILE_APPEND);
}

//-------------------- SHORTCODE: USER DASHBOARD -----------------------

function ssud_dashboard_shortcode() {
    ob_start();
    include SSUD_PATH . 'templates/dashboard.php';
    return ob_get_clean();
}
add_shortcode('shipstation_dashboard', 'ssud_dashboard_shortcode');

//-------------------- USER AJAX: SAVE API KEY -------------------------

add_action('wp_ajax_ssud_save_api_key', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $key = sanitize_text_field($_POST['api_key'] ?? '');
    $user_id = get_current_user_id();
    if (!$key) wp_send_json_error(['message' => 'API key is required.']);
    update_user_meta($user_id, 'shipstation_api_key', $key);
    delete_user_meta($user_id, 'shipstation_stores_selected');
    ssud_log("API Key Saved", ['user' => $user_id]);
    wp_send_json_success(['message' => 'API Key saved. Loading stores...']);
});

//-------------------- USER AJAX: RESET API KEY ------------------------

add_action('wp_ajax_ssud_reset_api_key', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    delete_user_meta($user_id, 'shipstation_api_key');
    delete_user_meta($user_id, 'shipstation_stores_selected');
    ssud_log("API Key Reset", ['user' => $user_id]);
    wp_send_json_success(['message' => 'API settings reset.']);
});

//-------------------- USER AJAX: GET STORES ---------------------------

add_action('wp_ajax_ssud_get_stores', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);
    $selected = get_user_meta($user_id, 'shipstation_stores_selected', true);
    if (!$api_key) wp_send_json_error(['message' => 'API key not set.']);
    $url = "https://ssapi.shipstation.com/stores";
    $response = wp_remote_get($url, [
        'headers' => [
            'Authorization' => 'Basic ' . $api_key,
            'Content-Type' => 'application/json'
        ]
    ]);
    if (is_wp_error($response)) {
        ssud_log("Get Stores ERROR", $response->get_error_message());
        wp_send_json_error(['message' => 'Could not connect to ShipStation: ' . $response->get_error_message()]);
    }
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    if (!is_array($data)) {
        ssud_log("Get Stores Invalid Response", $body);
        wp_send_json_error(['message' => 'Invalid response from ShipStation']);
    }
    $stores = [];
    foreach ($data as $store) {
        $stores[] = [
            'storeId' => $store['storeId'],
            'storeName' => $store['storeName']
        ];
    }
    $selected_ids = is_array($selected) ? $selected : [];
    ssud_log("Get Stores", ['stores' => $stores, 'selected' => $selected_ids]);
    wp_send_json_success(['stores' => $stores, 'selected' => $selected_ids]);
});

//-------------------- USER AJAX: SAVE STORE SELECTION -----------------

add_action('wp_ajax_ssud_save_stores', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $stores = json_decode(stripslashes($_POST['stores'] ?? '[]'), true);
    if (!is_array($stores) || !count($stores)) wp_send_json_error(['message' => 'Select at least one store.']);
    update_user_meta($user_id, 'shipstation_stores_selected', array_map('intval', $stores));
    ssud_log("Store Selection Saved", ['user' => $user_id, 'stores' => $stores]);
    wp_send_json_success(['message' => 'Store selection saved.']);
});

//-------------------- USER AJAX: GET ON-HOLD ORDERS (AGGREGATE) ------

add_action('wp_ajax_ssud_get_on_hold_orders', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);
    $selected_stores = get_user_meta($user_id, 'shipstation_stores_selected', true);
    if (!is_array($selected_stores) || !$api_key) wp_send_json_error(['message' => 'Not configured.']);

    $all_orders = [];
    foreach ($selected_stores as $store_id) {
        $url = "https://ssapi.shipstation.com/orders?orderStatus=on_hold&storeId=" . intval($store_id);
        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Basic ' . $api_key,
                'Content-Type' => 'application/json'
            ]
        ]);
        if (is_wp_error($response)) continue;
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (is_array($data) && isset($data['orders'])) {
            foreach ($data['orders'] as $order) {
                $all_orders[] = $order;
            }
        }
    }
    ssud_log("Aggregated On Hold Orders", ['user' => $user_id, 'total_orders' => count($all_orders)]);
    wp_send_json_success(['orders' => $all_orders]);
});

//-------------------- USER AJAX: SEARCH ORDERS (AGGREGATE) -----------

add_action('wp_ajax_ssud_search_orders', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);
    $selected_stores = get_user_meta($user_id, 'shipstation_stores_selected', true);
    if (!is_array($selected_stores) || !$api_key) wp_send_json_error(['message' => 'Not configured.']);
    $query = trim($_POST['query'] ?? '');
    if (!$query) wp_send_json_error(['message' => 'Search query is required.']);

    $all_orders = [];
    $search_type = (strpos($query, '@') !== false) ? 'email' : 'order';

    foreach ($selected_stores as $store_id) {
        if ($search_type === 'email') {
            $url = "https://ssapi.shipstation.com/orders?orderStatus=on_hold&orderStatus=awaiting_shipment&customerEmail=" . urlencode($query) . "&storeId=" . intval($store_id);
        } else {
            $url = "https://ssapi.shipstation.com/orders?orderNumber=" . urlencode($query) . "&storeId=" . intval($store_id);
        }
        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Basic ' . $api_key,
                'Content-Type' => 'application/json'
            ]
        ]);
        if (is_wp_error($response)) continue;
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (is_array($data) && isset($data['orders'])) {
            foreach ($data['orders'] as $order) {
                $all_orders[] = $order;
            }
        }
    }
    ssud_log("Aggregated Search Orders", ['user' => $user_id, 'search_type' => $search_type, 'query' => $query, 'total_orders' => count($all_orders)]);
    wp_send_json_success(['orders' => $all_orders]);
});

//-------------------- USER AJAX: RELEASE HOLD (NEW!) ------------------

add_action('wp_ajax_ssud_release_hold', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);
    $order_id = intval($_POST['orderId'] ?? 0);
    $order_key = trim($_POST['orderKey'] ?? '');

    if (!$api_key || (!$order_id && !$order_key)) {
        wp_send_json_error(['message' => 'Not configured or missing order information.']);
    }

    $body = $order_id ? ['orderId' => $order_id] : ['orderKey' => $order_key];
    ssud_log('Release Hold body', $body);

    $response = wp_remote_post('https://ssapi.shipstation.com/orders/restorefromhold', [
        'headers' => [
            'Authorization' => 'Basic ' . $api_key,
            'Content-Type'  => 'application/json'
        ],
        'body'    => json_encode($body)
    ]);

    ssud_log('Release Hold response', $response);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
    }
    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (isset($data['orderStatus']) && $data['orderStatus'] === 'awaiting_shipment') {
        wp_send_json_success(['message' => 'Order released from hold.']);
    } else {
        wp_send_json_error(['message' => $data['Message'] ?? 'Unknown error.']);
    }
});

//-------------------- USER AJAX: UPDATE SHIPPING ADDRESS (NEW!) -------

add_action('wp_ajax_ssud_update_address', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);
    $order_id = intval($_POST['order_id'] ?? 0);
    $address = json_decode(stripslashes($_POST['address'] ?? '{}'), true);

    if (!$api_key || !$order_id || !is_array($address)) wp_send_json_error(['message' => 'Invalid request.']);

    // Step 1: GET the order
    $get_url = "https://ssapi.shipstation.com/orders/$order_id";
    $get_resp = wp_remote_get($get_url, [
        'headers' => [
            'Authorization' => 'Basic ' . $api_key,
            'Content-Type'  => 'application/json'
        ]
    ]);
    ssud_log('Update Address GET order', $get_resp);

    if (is_wp_error($get_resp)) {
        wp_send_json_error(['message' => 'Failed to retrieve order: ' . $get_resp->get_error_message()]);
    }
    $order = json_decode(wp_remote_retrieve_body($get_resp), true);
    if (!isset($order['orderId'])) {
        wp_send_json_error(['message' => 'Order not found or invalid response.']);
    }

    // Step 2: Overwrite shipTo fields
    foreach (['street1', 'street2', 'street3', 'city', 'state', 'postalCode', 'country'] as $k) {
        $order['shipTo'][$k] = $address[$k] ?? $order['shipTo'][$k];
    }

    // Step 3: POST to /orders/createorder
    $update_resp = wp_remote_post('https://ssapi.shipstation.com/orders/createorder', [
        'headers' => [
            'Authorization' => 'Basic ' . $api_key,
            'Content-Type'  => 'application/json'
        ],
        'body' => json_encode($order)
    ]);
    ssud_log('Update Address POST response', $update_resp);

    if (is_wp_error($update_resp)) {
        wp_send_json_error(['message' => 'Failed to update address: ' . $update_resp->get_error_message()]);
    }
    $data = json_decode(wp_remote_retrieve_body($update_resp), true);
    if (isset($data['orderId'])) {
        wp_send_json_success(['message' => 'Order address updated.']);
    } else {
        wp_send_json_error(['message' => $data['Message'] ?? 'Unknown error.']);
    }
});