console.log('[SSUD Actions] Listening for order action buttons...');

// Utility: find order data for a given button/order block
function ssudFindOrderObj(orderBlock) {
  if (!orderBlock) return null;
  // Look for a hidden <script type="application/json"> blob
  const jsonBlob = orderBlock.querySelector('script[type="application/json"].ssud-order-json');
  if (jsonBlob) {
    try {
      return JSON.parse(jsonBlob.textContent);
    } catch (e) {
      console.warn('[SSUD Actions] Failed to parse order JSON:', e);
    }
  }
  // Fallback: partial info from DOM
  return {
    orderNumber: orderBlock.querySelector('.ssud-order-header')?.textContent.match(/\d+/)?.[0] || '',
    orderId: orderBlock.getAttribute('data-orderid') || '',
    shipTo: {}
  };
}

function ssudShowAddressModal(order) {
  // Remove existing modal if any
  document.querySelectorAll('.ssud-modal').forEach(modal => modal.remove());
  // Modal wrapper
  const modal = document.createElement('div');
  modal.className = 'ssud-modal';
  modal.innerHTML = `
    <div class="ssud-modal-content">
      <h3>Update Address - Order #${order.orderNumber}</h3>
      <form id="ssud-update-address-form">
        <label>Street 1: <input name="street1" value="${order.shipTo.street1 || order.shipTo.address1 || ''}" required></label>
        <label>Street 2: <input name="street2" value="${order.shipTo.street2 || order.shipTo.address2 || ''}"></label>
        <label>Street 3: <input name="street3" value="${order.shipTo.street3 || ''}"></label>
        <label>City: <input name="city" value="${order.shipTo.city || ''}" required></label>
        <label>State: <input name="state" value="${order.shipTo.state || ''}" required></label>
        <label>Postal Code: <input name="postalCode" value="${order.shipTo.postalCode || ''}" required></label>
        <label>Country: <input name="country" value="${order.shipTo.country || ''}" required></label>
        <div style="margin-top:12px;display:flex;gap:12px;">
          <button type="submit" class="ssud-update-address-save">Save</button>
          <button type="button" class="ssud-update-address-cancel">Cancel</button>
        </div>
        <div id="ssud-update-address-result" style="margin-top:8px;"></div>
      </form>
    </div>
    <div class="ssud-modal-backdrop"></div>
  `;
  document.body.appendChild(modal);

  // Cancel button closes modal
  modal.querySelector('.ssud-update-address-cancel').onclick = () => modal.remove();

  // Save button submits AJAX to backend
  modal.querySelector('#ssud-update-address-form').onsubmit = function(e) {
    e.preventDefault();
    const form = this;
    const result = form.querySelector('#ssud-update-address-result');
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      action: 'ssud_update_address',
      nonce: ssud_ajax.nonce,
      order_id: order.orderId,
      address: JSON.stringify(data)
    };
    console.log(`[SSUD][AJAX] Update Address: order_id=${order.orderId}`, payload);
    result.textContent = "Saving...";
    fetch(ssud_ajax.ajax_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    })
    .then(res => res.json())
    .then(resp => {
      result.textContent = resp.message || (resp.success ? "Updated!" : "Error updating address.");
      if (resp.success) setTimeout(() => modal.remove(), 1200);
    })
    .catch(err => {
      result.textContent = "Error updating address.";
      console.error('[SSUD Actions] Update Address error:', err);
    });
  };
}

document.addEventListener('click', function (e) {
  if (!e.target.classList.contains('ssud-action-btn')) return;
  const orderId = e.target.getAttribute('data-order');
  const action = e.target.getAttribute('data-action');
  const orderBlock = e.target.closest('.ssud-order-block');
  const order = ssudFindOrderObj(orderBlock);

  if (action === 'release-hold' || action === 'place-hold' || action === 'cancel-order') {
    let status = '';
    if (action === 'release-hold') status = 'awaiting_shipment';
    if (action === 'place-hold') status = 'on_hold';
    if (action === 'cancel-order') status = 'cancelled';
    if (!status) return;

    const payload = {
      action: 'ssud_update_order_status',
      nonce: ssud_ajax.nonce,
      order_id: orderId,
      status: status
    };
    console.log(`[SSUD][AJAX] Update Order Status: order_id=${orderId}, status=${status}`, payload);

    e.target.disabled = true;
    e.target.textContent = 'Working...';

    fetch(ssud_ajax.ajax_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    })
      .then(res => res.json())
      .then(resp => {
        alert(resp.message || (resp.success ? 'Order updated.' : 'Failed.'));
        window.location.reload();
      })
      .catch(err => {
        alert("Error updating order.");
        console.error('[SSUD Actions] Update status error:', err);
        window.location.reload();
      });
  }

  if (action === 'update-address') {
    ssudShowAddressModal(order);
  }
});

// ---- Ensure each .ssud-order-block includes a hidden JSON blob for order data ----
window.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.ssud-order-block').forEach(orderBlock => {
    // If block already has a JSON blob, skip
    if (orderBlock.querySelector('script[type="application/json"].ssud-order-json')) return;
    // Try to extract minimal data from DOM if present (for demo, this should be injected server-side for real orders)
    let orderObj = {
      orderId: orderBlock.getAttribute('data-orderid') || '',
      orderNumber: orderBlock.querySelector('.ssud-order-header')?.textContent.match(/\d+/)?.[0] || '',
      shipTo: {}
    };
    // But if there's global JS order data (ideally rendered by server), attach it
    if (orderBlock.__orderObj) orderObj = orderBlock.__orderObj;
    // Add JSON
    const script = document.createElement('script');
    script.type = 'application/json';
    script.className = 'ssud-order-json';
    script.textContent = JSON.stringify(orderObj);
    orderBlock.appendChild(script);
  });
});