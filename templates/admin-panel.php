<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) {
    echo '<div class="ssud-message">Admin access only.</div>';
    return;
}
echo "<div class='ssud-dashboard'><h2>Admin Panel</h2><p>Admin tools coming soon.</p></div>";
?>