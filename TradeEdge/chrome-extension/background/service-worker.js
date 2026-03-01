// TradeEdge Fill Capture — Background Service Worker
// Handles: keepalive, fill dedup, webhook POST, retry queue, badge updates

const DEFAULTS = {
  webhookUrl: 'http://localhost:5050',
  passphrase: 'slickrick_tradeedge',
  activeAccount: 'amp_live',
  accounts: [
    { name: 'amp_live', label: 'AMP Live' },
    { name: 'amp_demo', label: 'AMP Demo' }
  ],
  captureMode: 'discovery',
  seenFingerprints: [],
  recentFills: [],
  pendingFills: [],
  totalCaptured: 0,
  lastError: null,
  wsTrafficLog: []
};

// ── Keepalive ────────────────────────────────────────────────

// Chrome enforces minimum 0.5 min (30s) for alarms
chrome.alarms.create('keepalive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'keepalive') {
    retryPendingFills();
  }
});

// ── Message Handler ──────────────────────────────────────────

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (!msg || !msg.type) return false;

  switch (msg.type) {
    case 'FILL_CAPTURED':
      handleFillCaptured(msg.fill, msg.source).then(sendResponse);
      return true;

    case 'ORDER_EVENT':
      handleOrderEvent(msg.event, msg.source).then(sendResponse);
      return true;

    case 'WS_TRAFFIC':
      handleWsTraffic(msg.data).then(sendResponse);
      return true;

    case 'GET_STATUS':
      getStatus().then(sendResponse);
      return true;

    case 'GET_RECENT_FILLS':
      getRecentFills().then(sendResponse);
      return true;

    case 'TEST_CONNECTION':
      testConnection().then(sendResponse);
      return true;

    case 'SET_MODE':
      setMode(msg.mode).then(sendResponse);
      return true;

    case 'SET_ACCOUNT':
      setAccount(msg.account).then(sendResponse);
      return true;

    case 'SET_WEBHOOK_URL':
      setWebhookUrl(msg.url).then(sendResponse);
      return true;

    case 'EXPORT_WS_LOG':
      exportWsLog().then(sendResponse);
      return true;

    case 'CLEAR_DATA':
      clearData().then(sendResponse);
      return true;

    default:
      return false;
  }
});

// ── Fill Processing ──────────────────────────────────────────

async function handleFillCaptured(fill, source) {
  if (!fill || !fill.symbol || !fill.action) {
    return { ok: false, reason: 'invalid fill data' };
  }

  var store = await getStore();
  if (store.captureMode === 'paused') {
    return { ok: false, reason: 'paused' };
  }

  // Build fingerprint for dedup
  var timeBucket = Math.floor(Date.now() / 30000); // 30s buckets
  var fp = [fill.symbol, fill.action, fill.qty, fill.price, timeBucket].join('|');

  if (store.seenFingerprints.indexOf(fp) !== -1) {
    return { ok: false, reason: 'duplicate' };
  }

  // Add fingerprint, cap at 200
  var fps = store.seenFingerprints.concat(fp).slice(-200);

  // Build webhook payload
  var account = store.accounts.find(function(a) { return a.name === store.activeAccount; });
  var payload = {
    passphrase: store.passphrase,
    type: 'trade',
    action: fill.action.toLowerCase(),
    symbol: fill.symbol,
    qty: parseInt(fill.qty) || 1,
    entry: parseFloat(fill.price) || 0,
    sl: fill.sl || null,
    tp: fill.tp || null,
    account: account ? account.label : store.activeAccount,
    comment: 'TV auto-capture [' + (source || 'unknown') + ']'
  };

  // Record fill
  var recentFill = {
    symbol: fill.symbol,
    action: fill.action,
    qty: fill.qty,
    price: fill.price,
    source: source || 'unknown',
    time: new Date().toISOString(),
    sent: false
  };

  // Try to send
  var sent = await postWebhook(store.webhookUrl, payload);

  if (sent) {
    recentFill.sent = true;
  } else {
    // Queue for retry
    var pending = store.pendingFills.concat(payload).slice(-20);
    await chrome.storage.local.set({ pendingFills: pending });
  }

  var recent = [recentFill].concat(store.recentFills).slice(0, 50);
  var total = store.totalCaptured + 1;

  await chrome.storage.local.set({
    seenFingerprints: fps,
    recentFills: recent,
    totalCaptured: total
  });

  updateBadge(total);
  return { ok: true, sent: sent };
}

async function handleOrderEvent(event, source) {
  if (!event || !event.symbol) {
    return { ok: false, reason: 'invalid event' };
  }

  var store = await getStore();
  if (store.captureMode === 'paused') {
    return { ok: false, reason: 'paused' };
  }

  var account = store.accounts.find(function(a) { return a.name === store.activeAccount; });
  var payload = {
    passphrase: store.passphrase,
    type: event.eventType || 'update',
    symbol: event.symbol,
    action: (event.action || '').toLowerCase(),
    account: account ? account.label : store.activeAccount
  };

  // Include relevant fields based on event type
  if (event.eventType === 'order_placed') {
    payload.orderType = event.orderType || 'limit';
    payload.qty = parseInt(event.qty) || 1;
    payload.entry = parseFloat(event.price) || 0;
    payload.sl = event.sl || null;
    payload.tp = event.tp || null;
    payload.comment = 'TV auto-capture: limit order [' + (source || 'unknown') + ']';
  } else if (event.eventType === 'bracket') {
    payload.sl = event.sl || null;
    payload.tp = event.tp || null;
    payload.bracketType = event.bracketType || '';
    payload.comment = 'TV auto-capture: bracket ' + (event.bracketType || '') + ' [' + (source || 'unknown') + ']';
  } else if (event.eventType === 'order_modified') {
    payload.sl = event.sl || null;
    payload.tp = event.tp || null;
    payload.entry = event.price || null;
    payload.comment = 'TV auto-capture: order modified [' + (source || 'unknown') + ']';
  }

  if (event.orderId) payload.orderId = event.orderId;

  // Record in recent fills for visibility
  var recentEntry = {
    symbol: event.symbol,
    action: event.action || event.eventType,
    qty: event.qty || '-',
    price: event.price || event.sl || event.tp || '-',
    source: (source || '') + ':' + event.eventType,
    time: new Date().toISOString(),
    sent: false
  };

  var sent = await postWebhook(store.webhookUrl, payload);
  recentEntry.sent = sent;

  if (!sent) {
    var pending = store.pendingFills.concat(payload).slice(-20);
    await chrome.storage.local.set({ pendingFills: pending });
  }

  var recent = [recentEntry].concat(store.recentFills).slice(0, 50);
  await chrome.storage.local.set({ recentFills: recent });

  return { ok: true, sent: sent, eventType: event.eventType };
}

async function handleWsTraffic(data) {
  var store = await getStore();
  if (store.captureMode !== 'discovery') return { ok: false };

  var log = store.wsTrafficLog.concat({
    timestamp: new Date().toISOString(),
    url: data.url || '',
    direction: data.direction || 'received',
    payload: data.payload || '',
    type: data.wsType || 'unknown'
  }).slice(-100);

  await chrome.storage.local.set({ wsTrafficLog: log });
  return { ok: true, count: log.length };
}

// ── Webhook POST ─────────────────────────────────────────────

async function postWebhook(url, payload) {
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 5000);
    var res = await fetch(url + '/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      await chrome.storage.local.set({ lastError: 'HTTP ' + res.status });
      return false;
    }
    await chrome.storage.local.set({ lastError: null });
    return true;
  } catch (err) {
    await chrome.storage.local.set({
      lastError: err.name === 'AbortError' ? 'Timeout' : err.message
    });
    return false;
  }
}

// ── Retry Queue ──────────────────────────────────────────────

async function retryPendingFills() {
  var store = await getStore();
  if (!store.pendingFills.length) return;

  var still = [];
  for (var i = 0; i < store.pendingFills.length; i++) {
    var sent = await postWebhook(store.webhookUrl, store.pendingFills[i]);
    if (!sent) {
      still.push(store.pendingFills[i]);
    }
  }
  await chrome.storage.local.set({ pendingFills: still });
}

// ── Status & Config ──────────────────────────────────────────

async function getStatus() {
  var store = await getStore();
  return {
    mode: store.captureMode,
    account: store.activeAccount,
    accounts: store.accounts,
    webhookUrl: store.webhookUrl,
    totalCaptured: store.totalCaptured,
    pendingCount: store.pendingFills.length,
    lastError: store.lastError,
    wsLogCount: store.wsTrafficLog.length
  };
}

async function getRecentFills() {
  var store = await getStore();
  return { fills: store.recentFills.slice(0, 10) };
}

async function testConnection() {
  var store = await getStore();
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 5000);
    var res = await fetch(store.webhookUrl + '/health', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
    var data = await res.json();
    return { ok: true, tradeCount: data.tradeCount, version: data.version };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

async function setMode(mode) {
  if (['discovery', 'capture', 'paused'].indexOf(mode) === -1) {
    return { ok: false, reason: 'invalid mode' };
  }
  await chrome.storage.local.set({ captureMode: mode });
  return { ok: true, mode: mode };
}

async function setAccount(account) {
  await chrome.storage.local.set({ activeAccount: account });
  return { ok: true, account: account };
}

async function setWebhookUrl(url) {
  await chrome.storage.local.set({ webhookUrl: url });
  return { ok: true, url: url };
}

async function exportWsLog() {
  var store = await getStore();
  return { log: store.wsTrafficLog };
}

async function clearData() {
  await chrome.storage.local.set({
    seenFingerprints: [],
    recentFills: [],
    pendingFills: [],
    totalCaptured: 0,
    lastError: null,
    wsTrafficLog: []
  });
  updateBadge(0);
  return { ok: true };
}

// ── Badge ────────────────────────────────────────────────────

function updateBadge(count) {
  var text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: '#00d4ff' });
}

// ── Storage Helper ───────────────────────────────────────────

async function getStore() {
  var keys = Object.keys(DEFAULTS);
  var data = await chrome.storage.local.get(keys);
  var result = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    result[k] = data[k] !== undefined ? data[k] : DEFAULTS[k];
  }
  return result;
}

// ── Init ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async function() {
  var store = await getStore();
  // Set defaults for any missing keys
  var toSet = {};
  var keys = Object.keys(DEFAULTS);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (store[k] === undefined || store[k] === null) {
      toSet[k] = DEFAULTS[k];
    }
  }
  if (Object.keys(toSet).length) {
    await chrome.storage.local.set(toSet);
  }
  updateBadge(store.totalCaptured || 0);
});
