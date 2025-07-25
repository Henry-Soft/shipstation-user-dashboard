<?php
// dashboard.php (full file)

$user_id = get_current_user_id();
$api_key = get_user_meta($user_id, 'shipstation_api_key', true);
$selected_stores = get_user_meta($user_id, 'shipstation_stores_selected', true);
$has_key = !empty($api_key);
$has_stores = is_array($selected_stores) && count($selected_stores) > 0;
?>

<div class="ssud-dashboard">
  <h2>ShipStation Integration</h2>
  
  <?php if (!$has_key): ?>
    <form id="ssud-api-form" class="ssud-form">
      <label for="ssud-api-key">Enter your ShipStation API Key:</label>
      <input type="password" id="ssud-api-key" autocomplete="off" required />
      <button type="submit">Save</button>
      <div id="ssud-api-response" class="ssud-message"></div>
    </form>
  
  <?php elseif ($has_key && !$has_stores): ?>
    <div id="ssud-store-section"></div>
    <button id="ssud-reset-api" class="ssud-warning ssud-reset-btn" style="margin-top:16px;">Reset API Key</button>
  
  <?php elseif ($has_key && $has_stores): ?>
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <button id="ssud-reset-api" class="ssud-warning ssud-reset-btn">Reset API Settings</button>
      <button id="ssud-list-stores" class="ssud-list-btn">List Stores</button>
    </div>
    <div id="ssud-listed-stores" class="ssud-store-list"></div>
    <div class="ssud-success" style="margin-top:16px;">Your ShipStation integration is set up!</div>
  <?php endif; ?>

  <?php if ($has_key && $has_stores): ?>
    <div id="ssud-orders-section" class="ssud-block">
      <h3>ShipStation Orders</h3>
      <button id="ssud-view-onhold-orders" type="button">View All On-Hold Orders</button>
      <div id="ssud-orders-container"></div>
      <div id="ssud-orders-pagination"></div>
    </div>
    <div id="ssud-search-section" class="ssud-block">
      <h3>Search Orders</h3>
      <form id="ssud-search-form" class="ssud-form" autocomplete="off">
        <input type="text" id="ssud-search-query" placeholder="Order # or Email Address" required>
        <button type="submit">Search</button>
      </form>
      <div id="ssud-search-results"></div>
    </div>
  <?php endif; ?>
</div>