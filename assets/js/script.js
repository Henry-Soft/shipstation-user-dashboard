document.addEventListener('DOMContentLoaded', function () {
  const ajax = ssud_ajax;
  console.log('[SSUD] Dashboard JS loaded.');

  // ---- Save API Key ----
  const apiForm = document.getElementById('ssud-api-form');
  if (apiForm) {
    apiForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const key = document.getElementById('ssud-api-key').value.trim();
      if (!key) {
        alert('Please enter your API key.');
        return;
      }
      const payload = {
        action: 'ssud_save_api_key',
        nonce: ajax.nonce,
        api_key: key
      };
      console.log('[SSUD][AJAX REQUEST] Save API Key:', payload);
      fetch(ajax.ajax_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log('[SSUD][AJAX RESPONSE] Save API Key:', data);
          if (data.success) {
            location.reload();
          } else {
            document.getElementById('ssud-api-response').textContent = data.message || 'Failed to save API key.';
            console.warn('[SSUD] API Key save failed:', data);
          }
        })
        .catch(err => {
          document.getElementById('ssud-api-response').textContent = 'Error saving API key.';
          console.error('[SSUD] Save API Key Error', err);
        });
    });
  }

  // ---- Load Store List ----
  function loadStoreList() {
    const section = document.getElementById('ssud-store-section');
    if (!section) {
      console.warn('[SSUD] No #ssud-store-section found; cannot load store list.');
      return;
    }
    section.innerHTML = 'Loading stores...';
    const payload = {
      action: 'ssud_get_stores',
      nonce: ajax.nonce
    };
    console.log('[SSUD][AJAX REQUEST] Get Stores:', payload);
    fetch(ajax.ajax_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    })
      .then(res => res.json())
      .then(data => {
        console.log('[SSUD][AJAX RESPONSE] Get Stores:', data);
        const stores = data.data && Array.isArray(data.data.stores) ? data.data.stores
                      : Array.isArray(data.stores) ? data.stores : [];
        const selected = data.data && Array.isArray(data.data.selected) ? data.data.selected.map(String)
                        : Array.isArray(data.selected) ? data.selected.map(String) : [];
        if (!stores.length) {
          section.innerHTML = '<div class="ssud-message">No stores found or could not load stores.</div>';
          console.warn('[SSUD] No stores found in AJAX response:', data);
          return;
        }
        section.innerHTML = `
          <form id="ssud-store-selection-form" class="ssud-form">
            <div id="ssud-store-list"></div>
            <button type="submit">Save Store Selection</button>
          </form>
          <div id="ssud-store-save-response" class="ssud-message"></div>
        `;
        const storeListDiv = document.getElementById('ssud-store-list');
        stores.forEach(s => {
          const wrapper = document.createElement('div');
          wrapper.className = 'ssud-store';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.name = 'stores[]';
          cb.value = s.storeId;
          if (selected.includes(String(s.storeId))) cb.checked = true;
          const label = document.createElement('label');
          label.textContent = ` ${s.storeName}`;
          wrapper.appendChild(cb);
          wrapper.appendChild(label);
          storeListDiv.appendChild(wrapper);
        });
        // Attach store save event
        document.getElementById('ssud-store-selection-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const selectedStores = Array.from(document.querySelectorAll('input[name="stores[]"]:checked')).map(cb => cb.value);
          const savePayload = {
            action: 'ssud_save_stores',
            nonce: ajax.nonce,
            stores: JSON.stringify(selectedStores)
          };
          console.log('[SSUD][AJAX REQUEST] Save Stores:', savePayload);
          fetch(ajax.ajax_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(savePayload)
          })
            .then(res => res.json())
            .then(data => {
              console.log('[SSUD][AJAX RESPONSE] Save Stores:', data);
              if (data.success) {
                location.reload();
              } else {
                document.getElementById('ssud-store-save-response').textContent = data.message || 'Failed to save store selection.';
                console.warn('[SSUD] Store save failed:', data);
              }
            })
            .catch(err => {
              document.getElementById('ssud-store-save-response').textContent = 'Error saving store selection.';
              console.error('[SSUD] Save Stores Error', err);
            });
        });
      })
      .catch(err => {
        section.innerHTML = '<div class="ssud-message">Error loading stores.</div>';
        console.error('[SSUD] Get Stores Error', err);
      });
  }

  // ---- Load Store List on 'has key, no stores' state on page load ----
  if (document.getElementById('ssud-store-section') && !document.getElementById('ssud-api-form')) {
    loadStoreList();
  }

  // ---- Reset API Key ----
  document.querySelectorAll('#ssud-reset-api').forEach(btn => {
    btn.addEventListener('click', function () {
      if (!confirm('Are you sure you want to reset your API settings?')) return;
      const payload = {
        action: 'ssud_reset_api_key',
        nonce: ajax.nonce
      };
      console.log('[SSUD][AJAX REQUEST] Reset API Key:', payload);
      fetch(ajax.ajax_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log('[SSUD][AJAX RESPONSE] Reset API Key:', data);
          if (data.success) location.reload();
          else alert(data.message || 'Failed to reset API settings.');
        })
        .catch(err => {
          alert('Error resetting API settings.');
          console.error('[SSUD] Reset API Key Error', err);
        });
    });
  });

  // ---- List Stores Button ----
  const listStoresBtn = document.getElementById('ssud-list-stores');
  if (listStoresBtn) {
    listStoresBtn.addEventListener('click', function () {
      const output = document.getElementById('ssud-listed-stores');
      output.innerHTML = 'Loading store list...';
      const payload = {
        action: 'ssud_get_stores',
        nonce: ajax.nonce
      };
      console.log('[SSUD][AJAX REQUEST] List Stores:', payload);
      fetch(ajax.ajax_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log('[SSUD][AJAX RESPONSE] List Stores:', data);
          if (!data.success) {
            output.innerHTML = '<div class="ssud-message">Could not load store list.</div>';
            return;
          }
          const stores = data.data && Array.isArray(data.data.stores) ? data.data.stores
                        : Array.isArray(data.stores) ? data.stores : [];
          const selected = data.data && Array.isArray(data.data.selected) ? data.data.selected.map(String)
                          : Array.isArray(data.selected) ? data.selected.map(String) : [];
          const selectedStores = stores.filter(s => selected.includes(String(s.storeId)));
          if (!selectedStores.length) {
            output.innerHTML = '<div class="ssud-message">No stores selected.</div>';
            return;
          }
          let html = '<ul class="ssud-store-names">';
          selectedStores.forEach(s => {
            html += `<li>${s.storeName} <span style="color:#aaa;">(ID: ${s.storeId})</span></li>`;
          });
          html += '</ul>';
          output.innerHTML = html;
        })
        .catch(err => {
          output.innerHTML = '<div class="ssud-message">Error loading store list.</div>';
          console.error('[SSUD] List Stores Error', err);
        });
    });
  }

  // ---- View All On-Hold Orders ----
  const viewOrdersBtn = document.getElementById('ssud-view-onhold-orders');
  if (viewOrdersBtn) {
    console.log('[SSUD] View All On-Hold Orders button found.');
    viewOrdersBtn.addEventListener('click', function () {
      console.log('[SSUD] View All On-Hold Orders button clicked!');
      fetchOnHoldOrders();
    });
  } else {
    console.log('[SSUD] View All On-Hold Orders button NOT found.');
  }

  function formatAddress(shipTo) {
    const parts = [
      shipTo.street1 || shipTo.address1 || '',
      shipTo.street2 || shipTo.address2 || '',
      shipTo.street3 || '',
      [shipTo.city, shipTo.state, shipTo.postalCode].filter(Boolean).join(', '),
      shipTo.country || ''
    ];
    return parts.filter(Boolean).join('<br>');
  }

  function getOrderButtons(order) {
    let html = '';
    if (order.orderStatus === 'on_hold') {
      html += `<button class="ssud-action-btn" data-action="release-hold" data-order="${order.orderId}">Release Hold</button> `;
    }
    if (order.orderStatus === 'awaiting_shipment') {
      html += `<button class="ssud-action-btn" data-action="place-hold" data-order="${order.orderId}">Place on Hold</button> `;
    }
    if (order.orderStatus === 'on_hold' || order.orderStatus === 'awaiting_shipment') {
      html += `<button class="ssud-action-btn" data-action="cancel-order" data-order="${order.orderId}">Cancel Order</button> `;
      html += `<button class="ssud-action-btn" data-action="update-address" data-order="${order.orderId}">Update Address</button>`;
    }
    return html;
  }

  function renderOrders(orders, container) {
    if (!orders.length) {
      container.innerHTML = `<div class="ssud-message">No orders found.</div>`;
      return;
    }
    container.innerHTML = '';
    orders.forEach(order => {
      const shipTo = order.shipTo || {};
      const div = document.createElement('div');
      div.className = 'ssud-order-block';
      div.innerHTML = `
        <div class="ssud-order-header">Order #${order.orderNumber} — <span class="ssud-status">${order.orderStatus}</span></div>
        <div><strong>Customer:</strong> ${shipTo.name || ''}</div>
        <div><strong>Shipping Address:</strong><br>
          ${formatAddress(shipTo)}
        </div>
        <div class="ssud-order-actions">${getOrderButtons(order)}</div>
      `;
      container.appendChild(div);
    });
  }

  function fetchOnHoldOrders() {
    const ordersContainer = document.getElementById('ssud-orders-container');
    if (ordersContainer) ordersContainer.innerHTML = 'Loading on-hold orders...';
    const payload = {
      action: 'ssud_get_on_hold_orders',
      nonce: ajax.nonce
    };
    console.log('[SSUD][AJAX REQUEST] Get On-Hold Orders:', payload);
    fetch(ajax.ajax_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    })
      .then(res => res.json())
      .then(data => {
        console.log('[SSUD][AJAX RESPONSE] Get On-Hold Orders:', data);
        const orders = data.data && Array.isArray(data.data.orders) ? data.data.orders : [];
        if (!data.success) {
          ordersContainer.innerHTML = `<div class="ssud-message">${data.message || 'Could not load on-hold orders.'}</div>`;
          return;
        }
        renderOrders(orders, ordersContainer);
      })
      .catch(err => {
        if (ordersContainer) ordersContainer.innerHTML = '<div class="ssud-message">Error loading orders.</div>';
        console.error('[SSUD] Get On-Hold Orders Error', err);
      });
  }

  // ---- Search Orders ----
  const searchForm = document.getElementById('ssud-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const query = document.getElementById('ssud-search-query').value.trim();
      const resultsDiv = document.getElementById('ssud-search-results');
      if (!query) {
        resultsDiv.innerHTML = '<div class="ssud-message">Please enter an order number or email address.</div>';
        return;
      }
      resultsDiv.innerHTML = 'Searching...';
      const payload = {
        action: 'ssud_search_orders',
        nonce: ajax.nonce,
        query: query
      };
      console.log('[SSUD][AJAX REQUEST] Search Orders:', payload);
      fetch(ajax.ajax_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log('[SSUD][AJAX RESPONSE] Search Orders:', data);
          const orders = data.data && Array.isArray(data.data.orders) ? data.data.orders : [];
          if (!data.success) {
            resultsDiv.innerHTML = `<div class="ssud-message">${data.message || 'Could not search orders.'}</div>`;
            return;
          }
          renderOrders(orders, resultsDiv);
        })
        .catch(err => {
          resultsDiv.innerHTML = '<div class="ssud-message">Error searching orders.</div>';
          console.error('[SSUD] Search Orders Error', err);
        });
    });
  }

  // ---- Dynamically Load shipstation-actions.js ----
  if (!window.ssudShipstationActionsLoaded) {
    let script = document.createElement('script');
    script.src = ajax.plugin_url ? ajax.plugin_url + 'assets/js/shipstation-actions.js' : '/wp-content/plugins/shipstation-user-dashboard/assets/js/shipstation-actions.js';
    script.onload = function () {
      window.ssudShipstationActionsLoaded = true;
      console.log('[SSUD] shipstation-actions.js loaded.');
    };
    document.body.appendChild(script);
  }
});