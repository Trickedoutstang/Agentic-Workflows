// TradeEdge Fill Capture — Popup Controller

(function() {
  'use strict';

  // ── DOM Refs ───────────────────────────────────────────────

  var modeBadge = document.getElementById('mode-badge');
  var statusDot = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');
  var btnTest = document.getElementById('btn-test');
  var selAccount = document.getElementById('sel-account');
  var btnDiscovery = document.getElementById('btn-discovery');
  var btnCapture = document.getElementById('btn-capture');
  var btnPaused = document.getElementById('btn-paused');
  var statCaptured = document.getElementById('stat-captured');
  var statSent = document.getElementById('stat-sent');
  var statPending = document.getElementById('stat-pending');
  var statError = document.getElementById('stat-error');
  var fillsList = document.getElementById('fills-list');
  var wsSection = document.getElementById('ws-section');
  var wsInfo = document.getElementById('ws-info');
  var btnExport = document.getElementById('btn-export');
  var inpUrl = document.getElementById('inp-url');
  var btnSaveUrl = document.getElementById('btn-save-url');
  var btnClear = document.getElementById('btn-clear');

  // ── Helpers ────────────────────────────────────────────────

  function send(msg) {
    return new Promise(function(resolve) {
      chrome.runtime.sendMessage(msg, function(resp) {
        resolve(resp || {});
      });
    });
  }

  // ── Load Status ────────────────────────────────────────────

  async function loadStatus() {
    var status = await send({ type: 'GET_STATUS' });

    // Mode badge
    modeBadge.textContent = (status.mode || 'discovery').toUpperCase();
    modeBadge.className = 'badge ' + (status.mode || 'discovery');

    // Mode buttons
    var modeButtons = [btnDiscovery, btnCapture, btnPaused];
    modeButtons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === status.mode);
    });

    // WS section visibility
    wsSection.style.display = status.mode === 'discovery' ? 'block' : 'none';
    wsInfo.textContent = status.wsLogCount + ' frames logged';

    // Account selector
    if (status.accounts && selAccount.options.length === 0) {
      status.accounts.forEach(function(acc) {
        var opt = document.createElement('option');
        opt.value = acc.name;
        opt.textContent = acc.label;
        selAccount.appendChild(opt);
      });
    }
    selAccount.value = status.account || 'amp_live';

    // Stats
    statCaptured.textContent = status.totalCaptured || 0;
    statPending.textContent = status.pendingCount || 0;
    statError.textContent = status.lastError || '-';

    // Webhook URL
    inpUrl.value = status.webhookUrl || 'http://localhost:5050';

    // Load fills
    await loadFills();
  }

  async function loadFills() {
    var result = await send({ type: 'GET_RECENT_FILLS' });
    var fills = result.fills || [];

    var sentCount = fills.filter(function(f) { return f.sent; }).length;
    statSent.textContent = sentCount;

    if (fills.length === 0) {
      fillsList.innerHTML = '<div class="empty">No fills captured yet</div>';
      return;
    }

    fillsList.innerHTML = fills.map(function(f) {
      var sideClass = f.action === 'buy' ? 'buy' : 'sell';
      var sentClass = f.sent ? 'ok' : 'fail';
      var sentText = f.sent ? 'Sent' : 'Queued';
      var time = f.time ? new Date(f.time).toLocaleTimeString() : '';

      return '<div class="fill-item">' +
        '<span class="fill-side ' + sideClass + '">' + f.action + '</span>' +
        '<span class="fill-sym">' + f.symbol + '</span>' +
        '<span class="fill-qty">' + (f.qty || 1) + 'x</span>' +
        '<span class="fill-price">' + (f.price || '-') + '</span>' +
        '<span class="fill-source">' + (f.source || '') + '</span>' +
        '<span class="fill-sent ' + sentClass + '">' + sentText + '</span>' +
        '</div>';
    }).join('');
  }

  // ── Event Handlers ─────────────────────────────────────────

  btnTest.addEventListener('click', async function() {
    statusText.textContent = 'Testing...';
    statusDot.className = 'dot dot-gold';

    var result = await send({ type: 'TEST_CONNECTION' });
    if (result.ok) {
      statusDot.className = 'dot dot-green';
      statusText.textContent = 'Connected — ' + (result.tradeCount || 0) + ' trades on server';
    } else {
      statusDot.className = 'dot dot-red';
      statusText.textContent = result.error || 'Connection failed';
    }
  });

  selAccount.addEventListener('change', async function() {
    await send({ type: 'SET_ACCOUNT', account: selAccount.value });
  });

  // Mode buttons
  [btnDiscovery, btnCapture, btnPaused].forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var mode = btn.dataset.mode;
      await send({ type: 'SET_MODE', mode: mode });
      await loadStatus();
    });
  });

  btnExport.addEventListener('click', async function() {
    var result = await send({ type: 'EXPORT_WS_LOG' });
    var log = result.log || [];
    if (log.length === 0) {
      wsInfo.textContent = 'No frames to export';
      return;
    }

    var blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'te-ws-traffic-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    wsInfo.textContent = log.length + ' frames exported';
  });

  btnSaveUrl.addEventListener('click', async function() {
    var url = inpUrl.value.trim().replace(/\/+$/, '');
    if (!url) return;
    await send({ type: 'SET_WEBHOOK_URL', url: url });
    btnSaveUrl.textContent = 'Saved';
    setTimeout(function() { btnSaveUrl.textContent = 'Save'; }, 1500);
  });

  btnClear.addEventListener('click', async function() {
    if (!confirm('Clear all captured data?')) return;
    await send({ type: 'CLEAR_DATA' });
    await loadStatus();
  });

  // ── Init ───────────────────────────────────────────────────

  loadStatus();

  // Auto-test connection on open
  send({ type: 'TEST_CONNECTION' }).then(function(result) {
    if (result.ok) {
      statusDot.className = 'dot dot-green';
      statusText.textContent = 'Connected — ' + (result.tradeCount || 0) + ' trades';
    } else {
      statusDot.className = 'dot dot-red';
      statusText.textContent = result.error || 'Offline';
    }
  });

  // Refresh every 5s while popup is open
  setInterval(loadStatus, 5000);
})();
