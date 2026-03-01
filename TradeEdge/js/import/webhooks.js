// TradeEdge — TradingView Webhook Import

var _webhookInterval = null;
var _webhookPolling = false;
var _webhookInFlight = false;

// ── Helpers ─────────────────────────────────────────────────

function _webhookFetch(path) {
  var url = (S.webhookUrl || 'http://localhost:5050').replace(/\/+$/, '');
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, 5000);
  return fetch(url + path, { signal: ctrl.signal }).then(function(res) {
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).catch(function(err) {
    clearTimeout(timer);
    throw err;
  });
}

function _parsePrice(v) {
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ── Polling ─────────────────────────────────────────────────

function webhookStartPolling() {
  if (_webhookInterval) return;
  _webhookPolling = true;
  webhookPoll();
  _webhookInterval = setInterval(webhookPoll, 30000);
  _webhookSetStatus('Polling every 30s', 'var(--green)');
  console.log('[TradeEdge] Webhook polling started');
}

function webhookStopPolling() {
  if (_webhookInterval) {
    clearInterval(_webhookInterval);
    _webhookInterval = null;
  }
  _webhookPolling = false;
  _webhookSetStatus('Disconnected', 'var(--t3)');
  console.log('[TradeEdge] Webhook polling stopped');
}

function webhookPoll() {
  if (_webhookInFlight) return;
  if (document.visibilityState === 'hidden') return;
  _webhookInFlight = true;
  var since = S.webhookLastFetch || '';
  var path = '/trades' + (since ? '?since=' + encodeURIComponent(since) : '');

  _webhookFetch(path)
    .then(function(data) {
      var trades = data.trades || [];
      if (trades.length) {
        var result = webhookProcessTrades(trades);
        // Update cursor before save so both persist in one call
        var latest = trades[trades.length - 1];
        S.webhookLastFetch = latest.receivedAt || new Date().toISOString();
        if (result.added > 0) {
          _recomputeStartingBalance();
          save();
          renderDash();
          updateSidebar();
          toast(result.added + ' trade' + (result.added > 1 ? 's' : '') + ' imported via webhook', 'ok');
        } else {
          save();
        }
      }
      if (_webhookPolling) {
        _webhookSetStatus('Connected — ' + S.trades.length + ' trades', 'var(--green)');
      }
      _webhookCardStatus('Connected', 'var(--green)');
      _webhookInFlight = false;
    })
    .catch(function(err) {
      var msg = err.name === 'AbortError' ? 'Timeout' : 'Server offline';
      var color = err.name === 'AbortError' ? 'var(--gold)' : 'var(--red)';
      if (_webhookPolling) _webhookSetStatus(msg, color);
      _webhookCardStatus(msg, color);
      _webhookInFlight = false;
    });
}

// ── Trade Processing ────────────────────────────────────────

function webhookProcessTrades(raw) {
  var added = 0;
  var skipped = 0;
  var seenIds = S.webhookSeenIds || [];

  raw.forEach(function(t) {
    // Dedup by server-assigned UUID
    if (seenIds.indexOf(t.id) !== -1) { skipped++; return; }

    // Secondary dedup by trade key
    var sym = nsym(t.symbol || '');
    var key = (t.receivedAt || '') + '|' + sym + '|' + (t.action || '') + '|' + (t.entry || t.exit || '');
    var isDupe = S.trades.some(function(et) {
      return et.webhookId === t.id ||
        ((et.date || '') + '|' + (et.symbol || '') + '|' + (et.side || '').toLowerCase() + '|' + (et.entry || '')) === key;
    });
    if (isDupe) { skipped++; seenIds.push(t.id); return; }

    var type = (t.type || 'trade').toLowerCase();

    if (type === 'exit') {
      // Find matching open trade (same symbol, source=webhook, no exit price)
      var matched = false;
      for (var i = S.trades.length - 1; i >= 0; i--) {
        var et = S.trades[i];
        if (et.source === 'Webhook' && et.symbol === sym && !et.exit) {
          et.exit = _parsePrice(t.exit);
          et.pnl = parseFloat(t.pnl) || 0;
          et.fees = parseFloat(t.fees) || feeForSymbol(sym) * (et.qty || 1) * 2;
          et.netPnl = et.pnl - et.fees;
          et.exitReason = t.exitReason || '';
          et.webhookExitId = t.id;
          matched = true;
          added++;
          break;
        }
      }
      if (!matched) {
        S.trades.push(webhookMapTrade(t));
        added++;
      }
    } else if (type === 'entry') {
      S.trades.push(webhookMapTrade(t));
      added++;
    } else {
      // type === 'trade' — complete trade
      S.trades.push(webhookMapTrade(t));
      added++;
    }

    seenIds.push(t.id);
  });

  // Cap seen IDs at 500
  S.webhookSeenIds = seenIds.slice(-500);
  return { added: added, skipped: skipped };
}

function webhookMapTrade(raw) {
  var sym = nsym(raw.symbol || '');
  var side = isbuy(raw.action) ? 'Long' : 'Short';
  var qty = parseInt(raw.qty) || 1;
  var entry = _parsePrice(raw.entry);
  var exit = _parsePrice(raw.exit);
  var sl = _parsePrice(raw.sl);
  var tp = _parsePrice(raw.tp);
  var pnl = parseFloat(raw.pnl) || 0;
  var fees = parseFloat(raw.fees) || feeForSymbol(sym) * qty * 2;
  var dt = pdt(raw.receivedAt || new Date().toISOString());

  var rr = null;
  if (entry && sl && tp) {
    var risk = Math.abs(entry - sl);
    var reward = Math.abs(tp - entry);
    if (risk > 0) rr = reward / risk;
  }

  return {
    date: dt.date,
    time: dt.time,
    symbol: sym,
    side: side,
    qty: qty,
    entry: entry,
    exit: exit,
    sl: sl,
    tp: tp,
    pnl: pnl,
    fees: fees,
    netPnl: pnl - fees,
    rr: rr,
    killzone: dkz(dt.time),
    tags: [],
    checklist: {},
    mistakes: [],
    rating: 0,
    emotion: '',
    bias: '',
    notes: raw.comment || '',
    chartUrl: '',
    chartImg: null,
    importedAt: new Date().toISOString(),
    source: 'Webhook',
    webhookId: raw.id || '',
  };
}

// ── Connection Test ─────────────────────────────────────────

function webhookTestConnection() {
  _webhookSetStatus('Testing...', 'var(--gold)');

  _webhookFetch('/health')
    .then(function(data) {
      _webhookSetStatus('Connected — ' + (data.tradeCount || 0) + ' trades on server', 'var(--green)');
      _webhookCardStatus('Connected', 'var(--green)');
      toast('Webhook server connected', 'ok');
    })
    .catch(function(err) {
      var msg = err.name === 'AbortError' ? 'Timeout — server not responding' : 'Server offline — ' + err.message;
      _webhookSetStatus(msg, 'var(--red)');
      _webhookCardStatus('Offline', 'var(--red)');
      toast('Webhook server not reachable', 'err');
    });
}

// ── Auto-Import Toggle ──────────────────────────────────────

function webhookToggleAutoImport(checked) {
  S.webhookAutoImport = !!checked;
  save();
  if (checked) {
    webhookStartPolling();
  } else {
    webhookStopPolling();
  }
}

// ── UI Helpers ──────────────────────────────────────────────

function _webhookSetStatus(msg, color) {
  var el = document.getElementById('webhook-status');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--t3)'; }
}

function _webhookCardStatus(msg, color) {
  var el = document.getElementById('ic-webhook-status');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--t3)'; }
}
