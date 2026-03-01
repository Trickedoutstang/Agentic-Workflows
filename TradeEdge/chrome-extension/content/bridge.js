// TradeEdge Fill Capture — ISOLATED World Bridge
// Runs at document_idle with chrome.runtime API access
// Three detection layers: WS relay, DOM observer, Toast watcher

(function() {
  'use strict';

  // ── Local Dedup ────────────────────────────────────────────

  var seenFills = new Map(); // fingerprint → timestamp
  var MAX_SEEN = 200;

  function isDuplicate(fill) {
    var bucket = Math.floor(Date.now() / 30000); // 30s buckets
    var fp = [fill.symbol, fill.action, fill.qty, fill.price, bucket].join('|');

    if (seenFills.has(fp)) return true;

    seenFills.set(fp, Date.now());
    // Prune old entries
    if (seenFills.size > MAX_SEEN) {
      var keys = Array.from(seenFills.keys());
      for (var i = 0; i < keys.length - MAX_SEEN; i++) {
        seenFills.delete(keys[i]);
      }
    }
    return false;
  }

  // ── Forward to Service Worker ──────────────────────────────

  function forwardFill(fill, source) {
    if (isDuplicate(fill)) return;

    chrome.runtime.sendMessage({
      type: 'FILL_CAPTURED',
      fill: fill,
      source: source
    }, function() { void chrome.runtime.lastError; });
  }

  function forwardOrderEvent(event, source) {
    chrome.runtime.sendMessage({
      type: 'ORDER_EVENT',
      event: event,
      source: source
    }, function() { void chrome.runtime.lastError; });
  }

  function forwardTraffic(data) {
    chrome.runtime.sendMessage({
      type: 'WS_TRAFFIC',
      data: data
    }, function() { void chrome.runtime.lastError; });
  }

  // ── Sync Mode to sessionStorage ────────────────────────────

  function syncMode() {
    chrome.storage.local.get(['captureMode'], function(result) {
      try {
        sessionStorage.setItem('__te_mode__', result.captureMode || 'discovery');
      } catch (e) {
        // sessionStorage may be unavailable
      }
    });
  }

  syncMode();
  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.captureMode) {
      try {
        sessionStorage.setItem('__te_mode__', changes.captureMode.newValue || 'discovery');
      } catch (e) {}
    }
  });

  // ── Layer 1: WS Relay from MAIN World ──────────────────────

  window.addEventListener('__te_bridge__', function(e) {
    if (!e.detail) return;

    if (e.detail.type === 'fill') {
      forwardFill(e.detail.fill, e.detail.source || 'websocket');
    } else if (e.detail.type === 'order_event') {
      forwardOrderEvent(e.detail.event, e.detail.source || 'websocket');
    } else if (e.detail.type === 'traffic') {
      forwardTraffic(e.detail.data);
    }
  });

  // ── Layer 2: Account Manager DOM Observer ──────────────────

  var FUTURES_SYMBOLS = ['MNQ', 'MES', 'NQ', 'ES', 'CL', 'GC', 'YM', 'MYM', 'RTY', 'M2K', 'SI', 'HG', 'ZB', 'ZN'];
  var PRICE_REGEX = /\b\d{2,6}\.\d{1,4}\b/;
  var SIDE_REGEX = /\b(Buy|Sell|Long|Short)\b/i;
  var FILLED_REGEX = /\b(Filled|Executed|Complete)\b/i;

  function extractFillFromText(text) {
    if (!text) return null;

    // Must contain "Filled" or "Executed"
    if (!FILLED_REGEX.test(text)) return null;

    // Find symbol
    var symbol = null;
    for (var i = 0; i < FUTURES_SYMBOLS.length; i++) {
      if (text.indexOf(FUTURES_SYMBOLS[i]) !== -1) {
        symbol = FUTURES_SYMBOLS[i];
        break;
      }
    }
    if (!symbol) return null;

    // Find side
    var sideMatch = text.match(SIDE_REGEX);
    if (!sideMatch) return null;
    var side = sideMatch[1].toLowerCase();
    var action = (side === 'buy' || side === 'long') ? 'buy' : 'sell';

    // Find price
    var priceMatch = text.match(PRICE_REGEX);
    if (!priceMatch) return null;
    var price = parseFloat(priceMatch[0]);

    // Find quantity (look for digits before the symbol or standalone small numbers)
    var qtyMatch = text.match(/\b(\d{1,3})\s*(?:x\s*)?(?:MNQ|MES|NQ|ES|CL|GC)/i) ||
                   text.match(/Qty[:\s]*(\d{1,3})/i) ||
                   text.match(/(\d{1,3})\s*(?:contract|lot)/i);
    var qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    return {
      symbol: symbol,
      action: action,
      qty: qty,
      price: price,
      timestamp: new Date().toISOString()
    };
  }

  function observeAccountManager() {
    // Find the account manager panel
    var selectors = [
      '[data-name="account-manager"]',
      '[class*="accountManager"]',
      '[class*="bottomPanel"]',
      '[class*="order-panel"]'
    ];

    var panel = null;
    for (var i = 0; i < selectors.length; i++) {
      panel = document.querySelector(selectors[i]);
      if (panel) break;
    }

    if (!panel) {
      // Retry in 2s — panel may not be loaded yet
      setTimeout(observeAccountManager, 2000);
      return;
    }

    var observer = new MutationObserver(function(mutations) {
      chrome.storage.local.get(['captureMode'], function(result) {
        if (result.captureMode === 'paused') return;

        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.type !== 'childList') continue;

          for (var j = 0; j < mutation.addedNodes.length; j++) {
            var node = mutation.addedNodes[j];
            if (node.nodeType !== 1) continue; // Element nodes only

            var text = node.textContent || '';
            if (text.length < 5 || text.length > 500) continue;

            var fill = extractFillFromText(text);
            if (fill) {
              forwardFill(fill, 'dom');
            }
          }
        }
      });
    });

    observer.observe(panel, {
      childList: true,
      subtree: true
    });

    console.log('[TradeEdge] Account Manager observer attached');
  }

  // ── Layer 3: Toast / Notification Watcher ──────────────────

  function observeToasts() {
    var toastObserver = new MutationObserver(function(mutations) {
      chrome.storage.local.get(['captureMode'], function(result) {
        if (result.captureMode === 'paused') return;

        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.type !== 'childList') continue;

          for (var j = 0; j < mutation.addedNodes.length; j++) {
            var node = mutation.addedNodes[j];
            if (node.nodeType !== 1) continue;

            var text = node.textContent || '';

            // Toast format: "Order filled: Buy 1 MNQ @ 21650.25"
            var toastMatch = text.match(/(?:order|fill)\w*[:\s]+(\w+)\s+(\d+)\s+(MNQ|MES|NQ|ES|CL|GC|YM|MYM|RTY|M2K)\s*@\s*([\d.]+)/i);
            if (toastMatch) {
              var side = toastMatch[1].toLowerCase();
              forwardFill({
                symbol: toastMatch[3].toUpperCase(),
                action: (side === 'buy' || side === 'long') ? 'buy' : 'sell',
                qty: parseInt(toastMatch[2], 10) || 1,
                price: parseFloat(toastMatch[4]) || 0,
                timestamp: new Date().toISOString()
              }, 'toast');
              continue;
            }

            // Fallback: check for generic fill text
            var fill = extractFillFromText(text);
            if (fill) {
              forwardFill(fill, 'toast');
            }
          }
        }
      });
    });

    toastObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[TradeEdge] Toast observer attached');
  }

  // ── Init ───────────────────────────────────────────────────

  // Start DOM observers when ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    observeAccountManager();
    observeToasts();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observeAccountManager();
      observeToasts();
    });
  }

  console.log('[TradeEdge] Bridge loaded (ISOLATED world)');
})();
