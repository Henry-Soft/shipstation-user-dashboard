<?php
/**
 * ShipStation User Dashboard - Core Plugin Functions
 * Place this file in: /wp-content/plugins/shipstation-user-dashboard/ssud-core.php
 */

// If accessed directly, abort.
if (!defined('WPINC')) die();

/**
 * Simple log helper.
 */
function ssud_log($msg, $data = null) {
    $logfile = WP_CONTENT_DIR . '/plugins/shipstation-user-dashboard/ssud.log';
    $line = date('[Y-m-d H:i:s] ') . $msg;
    if ($data !== null) $line .= ': ' . print_r($data, true);
    $line .= PHP_EOL;
    file_put_contents($logfile, $line, FILE_APPEND);
}

// ===== AJAX: Release Hold =====
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

// ===== AJAX: Update Address =====
add_action('wp_ajax_ssud_update_address', function() {
    check_ajax_referer('ssud_nonce', 'nonce');
    $user_id = get_current_user_id();
    $api_key = get_user_meta($user_id, 'shipstation_api_key', true);

    $order_id = intval($_POST['orderId'] ?? 0);
    $order_key = trim($_POST['orderKey'] ?? '');
    $address = $_POST['address'] ?? [];
    if (!$api_key || (!$order_id && !$order_key) || !$address) {
        wp_send_json_error(['message' => 'Missing info.']);
    }

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

// ===== Add your other AJAX and core plugin handlers here =====

