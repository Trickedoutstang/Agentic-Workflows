// TradeEdge Fill Capture — MAIN World WebSocket Interceptor
// Runs at document_start with access to window.WebSocket
// Intercepts TradingView broker WebSocket connections to detect fills

(function() {
  'use strict';

  var OriginalWebSocket = window.WebSocket;
  var activeConnections = [];

  // ── Config from sessionStorage (set by bridge.js) ──────────

  function getMode() {
    try { return sessionStorage.getItem('__te_mode__') || 'discovery'; }
    catch (e) { return 'discovery'; }
  }

  // ── Symbol normalization ───────────────────────────────────

  // Map contract+month codes to base symbols (all 12 months per product)
  var SYMBOL_MAP = {
    // ── Equity Index ──
    'MNQH': 'MNQ', 'MNQM': 'MNQ', 'MNQU': 'MNQ', 'MNQZ': 'MNQ',
    'MESH': 'MES', 'MESM': 'MES', 'MESU': 'MES', 'MESZ': 'MES',
    'NQH': 'NQ', 'NQM': 'NQ', 'NQU': 'NQ', 'NQZ': 'NQ',
    'ESH': 'ES', 'ESM': 'ES', 'ESU': 'ES', 'ESZ': 'ES',
    'YMH': 'YM', 'YMM': 'YM', 'YMU': 'YM', 'YMZ': 'YM',
    'MYMH': 'MYM', 'MYMM': 'MYM', 'MYMU': 'MYM', 'MYMZ': 'MYM',
    'RTYH': 'RTY', 'RTYM': 'RTY', 'RTYU': 'RTY', 'RTYZ': 'RTY',
    'M2KH': 'M2K', 'M2KM': 'M2K', 'M2KU': 'M2K', 'M2KZ': 'M2K',
    // ── Energy (all 12 months for CL) ──
    'CLF': 'CL', 'CLG': 'CL', 'CLH': 'CL', 'CLJ': 'CL', 'CLK': 'CL', 'CLM': 'CL',
    'CLN': 'CL', 'CLQ': 'CL', 'CLU': 'CL', 'CLV': 'CL', 'CLX': 'CL', 'CLZ': 'CL',
    'MCLF': 'MCL', 'MCLG': 'MCL', 'MCLH': 'MCL', 'MCLJ': 'MCL', 'MCLK': 'MCL', 'MCLM': 'MCL',
    'MCLN': 'MCL', 'MCLQ': 'MCL', 'MCLU': 'MCL', 'MCLV': 'MCL', 'MCLX': 'MCL', 'MCLZ': 'MCL',
    'NGF': 'NG', 'NGG': 'NG', 'NGH': 'NG', 'NGJ': 'NG', 'NGK': 'NG', 'NGM': 'NG',
    'NGN': 'NG', 'NGQ': 'NG', 'NGU': 'NG', 'NGV': 'NG', 'NGX': 'NG', 'NGZ': 'NG',
    // ── Metals (all 12 months for GC) ──
    'GCF': 'GC', 'GCG': 'GC', 'GCH': 'GC', 'GCJ': 'GC', 'GCK': 'GC', 'GCM': 'GC',
    'GCN': 'GC', 'GCQ': 'GC', 'GCU': 'GC', 'GCV': 'GC', 'GCX': 'GC', 'GCZ': 'GC',
    'MGCF': 'MGC', 'MGCG': 'MGC', 'MGCH': 'MGC', 'MGCJ': 'MGC', 'MGCK': 'MGC', 'MGCM': 'MGC',
    'MGCN': 'MGC', 'MGCQ': 'MGC', 'MGCU': 'MGC', 'MGCV': 'MGC', 'MGCX': 'MGC', 'MGCZ': 'MGC',
    'SIH': 'SI', 'SIK': 'SI', 'SIN': 'SI', 'SIU': 'SI', 'SIZ': 'SI',
    'SILH': 'SIL', 'SILK': 'SIL', 'SILN': 'SIL', 'SILU': 'SIL', 'SILZ': 'SIL',
    'HGH': 'HG', 'HGK': 'HG', 'HGN': 'HG', 'HGU': 'HG', 'HGZ': 'HG',
    'PLF': 'PL', 'PLJ': 'PL', 'PLN': 'PL', 'PLV': 'PL',
    // ── Treasury ──
    'ZBH': 'ZB', 'ZBM': 'ZB', 'ZBU': 'ZB', 'ZBZ': 'ZB',
    'ZNH': 'ZN', 'ZNM': 'ZN', 'ZNU': 'ZN', 'ZNZ': 'ZN',
    'ZFH': 'ZF', 'ZFM': 'ZF', 'ZFU': 'ZF', 'ZFZ': 'ZF',
    'ZTH': 'ZT', 'ZTM': 'ZT', 'ZTU': 'ZT', 'ZTZ': 'ZT',
    // ── Agriculture ──
    'ZCH': 'ZC', 'ZCK': 'ZC', 'ZCN': 'ZC', 'ZCU': 'ZC', 'ZCZ': 'ZC',
    'ZSF': 'ZS', 'ZSH': 'ZS', 'ZSK': 'ZS', 'ZSN': 'ZS', 'ZSQ': 'ZS', 'ZSU': 'ZS', 'ZSX': 'ZS',
    'ZWH': 'ZW', 'ZWK': 'ZW', 'ZWN': 'ZW', 'ZWU': 'ZW', 'ZWZ': 'ZW',
    // ── Currency (digit-prefixed) ──
    '6EH': '6E', '6EM': '6E', '6EU': '6E', '6EZ': '6E',
    '6BH': '6B', '6BM': '6B', '6BU': '6B', '6BZ': '6B',
    '6JH': '6J', '6JM': '6J', '6JU': '6J', '6JZ': '6J',
    '6AH': '6A', '6AM': '6A', '6AU': '6A', '6AZ': '6A',
    '6CH': '6C', '6CM': '6C', '6CU': '6C', '6CZ': '6C',
    '6SH': '6S', '6SM': '6S', '6SU': '6S', '6SZ': '6S',
    // ── Livestock ──
    'HEG': 'HE', 'HEJ': 'HE', 'HEM': 'HE', 'HEN': 'HE', 'HEQ': 'HE', 'HEV': 'HE', 'HEZ': 'HE',
    'LEG': 'LE', 'LEJ': 'LE', 'LEM': 'LE', 'LEQ': 'LE', 'LEV': 'LE', 'LEZ': 'LE',
    // ── Crypto ──
    'BTCF': 'BTC', 'BTCG': 'BTC', 'BTCH': 'BTC', 'BTCJ': 'BTC', 'BTCK': 'BTC', 'BTCM': 'BTC',
    'MBTH': 'MBT', 'MBTM': 'MBT', 'MBTU': 'MBT', 'MBTZ': 'MBT',
  };

  function normalizeSymbol(raw) {
    if (!raw) return '';
    // Handle "CME_MINI:MNQH26", "CME:NQH2026", "MNQH6", etc.
    var s = raw.replace(/^[A-Z_]+:/, '');        // strip exchange prefix
    s = s.replace(/\d{1,4}$/, '');                // strip contract year/month digits
    s = s.toUpperCase();

    if (SYMBOL_MAP[s]) return SYMBOL_MAP[s];

    // Direct match for base symbols (longest first to avoid partial matches)
    var bases = [
      'MNQ', 'MES', 'MYM', 'M2K', 'MCL', 'MGC',  // Micros first (longer)
      'NQ', 'ES', 'YM', 'RTY', 'EMD', 'NKD',       // Equity index
      'CL', 'NG', 'QM', 'QG', 'RB', 'HO',          // Energy
      'GC', 'SI', 'SIL', 'HG', 'PL', 'PA',         // Metals
      'ZB', 'ZN', 'ZF', 'ZT', 'UB', 'TN',          // Treasury
      'ZC', 'ZS', 'ZW', 'ZM', 'ZL', 'CT', 'KC', 'SB', 'CC', // Agriculture
      'HE', 'LE', 'GF',                             // Livestock
      '6E', '6B', '6J', '6A', '6C', '6S', '6N', '6M', // Currency
      'BTC', 'MBT', 'ETH', 'MET'                    // Crypto
    ];
    for (var i = 0; i < bases.length; i++) {
      if (s.indexOf(bases[i]) === 0) return bases[i];
    }
    return s;
  }

  // ── TradingView Frame Parser ───────────────────────────────

  function parseTvFrames(data) {
    // TradingView uses ~m~<length>~m~<payload> framing
    if (typeof data !== 'string') return [];
    var frames = [];
    var pos = 0;
    while (pos < data.length) {
      var match = data.substring(pos).match(/^~m~(\d+)~m~/);
      if (!match) break;
      var headerLen = match[0].length;
      var payloadLen = parseInt(match[1], 10);
      var payload = data.substring(pos + headerLen, pos + headerLen + payloadLen);
      frames.push(payload);
      pos += headerLen + payloadLen;
    }
    // If no framing found, treat whole string as a single frame
    if (frames.length === 0 && data.length > 0) {
      frames.push(data);
    }
    return frames;
  }

  function tryParseJson(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
  }

  // ── Event Detection ─────────────────────────────────────────
  // Detects: fills, limit order placements, SL/TP brackets, order modifications

  function tryParseEvent(frame) {
    var obj = tryParseJson(frame);
    if (!obj) return null;

    // Pattern 1: TradingView broker integration messages
    // {"m":"execution_report"|"order_event"|"trade_completed"|...,"p":[...]}
    var brokerMethods = [
      'execution_report', 'trade_completed', 'order_event',
      'order_placed', 'order_modified', 'order_cancelled',
      'bracket_update', 'position_update'
    ];
    if (brokerMethods.indexOf(obj.m) !== -1) {
      var p = obj.p;
      if (!Array.isArray(p)) return null;

      for (var i = 0; i < p.length; i++) {
        var item = p[i];
        if (typeof item !== 'object' || item === null) continue;

        var symbol = normalizeSymbol(item.symbol || item.instrument || item.ticker || '');
        if (!symbol) continue;

        var status = (item.status || item.state || item.execType || item.orderStatus || '').toLowerCase();
        var orderType = (item.orderType || item.type || item.ordType || '').toLowerCase();
        var side = (item.side || item.action || '').toLowerCase();
        var action = '';
        if (side === 'buy' || side === 'long' || side === '1') action = 'buy';
        else if (side === 'sell' || side === 'short' || side === '2') action = 'sell';

        // ── Fill event
        if (status === 'filled' || status === 'fill' || status === 'trade') {
          if (!action) continue;
          return {
            eventType: 'fill',
            symbol: symbol,
            action: action,
            qty: parseInt(item.qty || item.quantity || item.filledQty || item.amount || 1, 10),
            price: parseFloat(item.price || item.avgPrice || item.fillPrice || item.avgFillPrice || 0),
            sl: parseFloat(item.sl || item.stopLoss || item.stopPrice || 0) || null,
            tp: parseFloat(item.tp || item.takeProfit || item.limitPrice || 0) || null,
            timestamp: item.time || item.timestamp || new Date().toISOString(),
            orderId: item.orderId || item.id || item.execId || ''
          };
        }

        // ── Limit order placed (working, not yet filled)
        if (status === 'working' || status === 'pending' || status === 'new' || status === 'accepted') {
          if (!action) continue;
          var limitPrice = parseFloat(item.limitPrice || item.price || item.orderPrice || 0);
          if (!limitPrice) continue;
          return {
            eventType: 'order_placed',
            symbol: symbol,
            action: action,
            orderType: orderType || 'limit',
            qty: parseInt(item.qty || item.quantity || 1, 10),
            price: limitPrice,
            sl: parseFloat(item.sl || item.stopLoss || item.stopPrice || 0) || null,
            tp: parseFloat(item.tp || item.takeProfit || 0) || null,
            timestamp: item.time || item.timestamp || new Date().toISOString(),
            orderId: item.orderId || item.id || ''
          };
        }

        // ── SL/TP bracket placed or modified
        if (orderType === 'stop' || orderType === 'stoploss' || orderType === 'stop_loss' ||
            orderType === 'take_profit' || orderType === 'takeprofit' || orderType === 'bracket' ||
            orderType === 'oco' || orderType === 'oso') {
          var bracketType = '';
          if (orderType.indexOf('stop') !== -1) bracketType = 'sl';
          else if (orderType.indexOf('take') !== -1 || orderType.indexOf('profit') !== -1) bracketType = 'tp';
          else bracketType = 'bracket';

          return {
            eventType: 'bracket',
            bracketType: bracketType,
            symbol: symbol,
            action: action || '',
            sl: parseFloat(item.sl || item.stopLoss || item.stopPrice || (bracketType === 'sl' ? item.price : 0) || 0) || null,
            tp: parseFloat(item.tp || item.takeProfit || item.limitPrice || (bracketType === 'tp' ? item.price : 0) || 0) || null,
            timestamp: item.time || item.timestamp || new Date().toISOString(),
            orderId: item.orderId || item.id || item.parentId || ''
          };
        }

        // ── Order modified (SL/TP adjustment mid-trade)
        if (status === 'modified' || status === 'replaced' || obj.m === 'order_modified') {
          return {
            eventType: 'order_modified',
            symbol: symbol,
            action: action || '',
            orderType: orderType || '',
            price: parseFloat(item.price || item.newPrice || 0) || null,
            sl: parseFloat(item.sl || item.stopLoss || item.newStopLoss || item.stopPrice || 0) || null,
            tp: parseFloat(item.tp || item.takeProfit || item.newTakeProfit || item.limitPrice || 0) || null,
            timestamp: item.time || item.timestamp || new Date().toISOString(),
            orderId: item.orderId || item.id || ''
          };
        }
      }
    }

    // Pattern 2: CQG / AMP broker messages (nested structure)
    if (obj.d && typeof obj.d === 'object') {
      var d = obj.d;
      var dsym = normalizeSymbol(d.symbol || d.instrument || d.contractSymbol || '');
      if (!dsym) return null;

      var dstatus = (d.status || d.state || '').toLowerCase();
      var dorderType = (d.orderType || d.type || '').toLowerCase();
      var dside = (d.side || d.action || '').toLowerCase();
      var daction = '';
      if (dside === 'buy' || dside === '1') daction = 'buy';
      else if (dside === 'sell' || dside === '2') daction = 'sell';

      // Fill
      if (dstatus === 'filled' || dstatus === 'fill') {
        if (daction) {
          return {
            eventType: 'fill',
            symbol: dsym,
            action: daction,
            qty: parseInt(d.qty || d.quantity || 1, 10),
            price: parseFloat(d.price || d.avgPrice || 0),
            sl: parseFloat(d.sl || d.stopLoss || 0) || null,
            tp: parseFloat(d.tp || d.takeProfit || 0) || null,
            timestamp: d.time || d.timestamp || new Date().toISOString(),
            orderId: d.orderId || d.id || ''
          };
        }
      }

      // Order placed
      if (dstatus === 'working' || dstatus === 'pending' || dstatus === 'new') {
        if (daction) {
          return {
            eventType: 'order_placed',
            symbol: dsym,
            action: daction,
            orderType: dorderType || 'limit',
            qty: parseInt(d.qty || d.quantity || 1, 10),
            price: parseFloat(d.limitPrice || d.price || 0),
            sl: parseFloat(d.sl || d.stopLoss || d.stopPrice || 0) || null,
            tp: parseFloat(d.tp || d.takeProfit || 0) || null,
            timestamp: d.time || d.timestamp || new Date().toISOString(),
            orderId: d.orderId || d.id || ''
          };
        }
      }

      // Modified
      if (dstatus === 'modified' || dstatus === 'replaced') {
        return {
          eventType: 'order_modified',
          symbol: dsym,
          action: daction || '',
          orderType: dorderType || '',
          price: parseFloat(d.price || d.newPrice || 0) || null,
          sl: parseFloat(d.sl || d.stopLoss || d.newStopLoss || 0) || null,
          tp: parseFloat(d.tp || d.takeProfit || d.newTakeProfit || 0) || null,
          timestamp: d.time || d.timestamp || new Date().toISOString(),
          orderId: d.orderId || d.id || ''
        };
      }
    }

    return null;
  }

  // Backward-compatible wrapper — returns fill-only for existing callers
  function tryParseFill(frame) {
    var evt = tryParseEvent(frame);
    if (evt && evt.eventType === 'fill') return evt;
    return null;
  }

  // ── WebSocket Classification ───────────────────────────────

  function classifyWsUrl(url) {
    if (!url) return 'unknown';
    var u = url.toLowerCase();
    // Market data streams — skip these (high volume, no fills)
    if (u.indexOf('data.tradingview.com') !== -1) return 'market_data';
    if (u.indexOf('widgetdata') !== -1) return 'market_data';
    if (u.indexOf('quotes') !== -1) return 'market_data';
    // Broker connections
    if (u.indexOf('broker') !== -1) return 'tv_broker';
    if (u.indexOf('trading') !== -1) return 'tv_broker';
    if (u.indexOf('order') !== -1) return 'tv_broker';
    if (u.indexOf('cqg') !== -1) return 'external_broker';
    if (u.indexOf('amp') !== -1) return 'external_broker';
    return 'other';
  }

  // ── Dispatch to Bridge ─────────────────────────────────────

  function dispatchFill(fill, source) {
    window.dispatchEvent(new CustomEvent('__te_bridge__', {
      detail: { type: 'fill', fill: fill, source: source }
    }));
  }

  function dispatchOrderEvent(event, source) {
    window.dispatchEvent(new CustomEvent('__te_bridge__', {
      detail: { type: 'order_event', event: event, source: source }
    }));
  }

  function dispatchTraffic(url, direction, payload, wsType) {
    window.dispatchEvent(new CustomEvent('__te_bridge__', {
      detail: {
        type: 'traffic',
        data: {
          url: url,
          direction: direction,
          payload: typeof payload === 'string' ? payload.substring(0, 2000) : String(payload).substring(0, 2000),
          wsType: wsType
        }
      }
    }));
  }

  // ── Intercepted WebSocket ──────────────────────────────────

  function InterceptedWebSocket(url, protocols) {
    var ws;
    if (protocols !== undefined) {
      ws = new OriginalWebSocket(url, protocols);
    } else {
      ws = new OriginalWebSocket(url);
    }

    var wsType = classifyWsUrl(url);
    var connId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    activeConnections.push({ id: connId, url: url, type: wsType, ws: ws });

    // Skip market data — too much volume
    if (wsType === 'market_data') return ws;

    var origOnMessage = null;
    var origAddEventListener = ws.addEventListener.bind(ws);

    // Intercept onmessage setter — store handler, we relay via our listener
    Object.defineProperty(ws, 'onmessage', {
      get: function() { return origOnMessage; },
      set: function(fn) { origOnMessage = fn; },
      configurable: true
    });

    // Flag to prevent processMessage from firing twice per event.
    // The direct listener below always fires first (registered earliest).
    // If a wrapped addEventListener handler fires later for the same event,
    // it skips processMessage because _processed is already true.
    var _processed = false;

    // Direct listener — catches messages even if page only uses ws.onmessage
    origAddEventListener('message', function(event) {
      if (!_processed) {
        processMessage(event.data, url, wsType, 'received');
        _processed = true;
      }
      // Reset flag after all handlers for this event have run
      setTimeout(function() { _processed = false; }, 0);
      if (origOnMessage) {
        origOnMessage.call(ws, event);
      }
    });

    // Intercept addEventListener — wrap message listeners so page handlers
    // still work, and mark _processed to prevent double processMessage
    ws.addEventListener = function(type, listener, options) {
      if (type === 'message') {
        var wrappedListener = function(event) {
          if (!_processed) {
            processMessage(event.data, url, wsType, 'received');
            _processed = true;
          }
          listener.call(ws, event);
        };
        return origAddEventListener(type, wrappedListener, options);
      }
      return origAddEventListener(type, listener, options);
    };

    // Intercept send
    var origSend = ws.send.bind(ws);
    ws.send = function(data) {
      var mode = getMode();
      if (mode === 'discovery') {
        dispatchTraffic(url, 'sent', data, wsType);
      }
      return origSend(data);
    };

    // Cleanup on close
    origAddEventListener('close', function() {
      activeConnections = activeConnections.filter(function(c) { return c.id !== connId; });
    });

    return ws;
  }

  function processMessage(data, url, wsType, direction) {
    var mode = getMode();

    if (mode === 'discovery') {
      // In discovery mode, log all non-market-data WS traffic
      dispatchTraffic(url, direction, data, wsType);
      return;
    }

    if (mode !== 'capture') return;

    // In capture mode, parse frames and look for fills + order events
    var frames = parseTvFrames(typeof data === 'string' ? data : '');
    for (var i = 0; i < frames.length; i++) {
      var evt = tryParseEvent(frames[i]);
      if (!evt) continue;

      if (evt.eventType === 'fill') {
        dispatchFill(evt, 'websocket');
      } else {
        dispatchOrderEvent(evt, 'websocket');
      }
    }
  }

  // ── Install Interceptor ────────────────────────────────────

  // Copy static properties
  InterceptedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  InterceptedWebSocket.OPEN = OriginalWebSocket.OPEN;
  InterceptedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  InterceptedWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  InterceptedWebSocket.prototype = OriginalWebSocket.prototype;

  window.WebSocket = InterceptedWebSocket;

  console.log('[TradeEdge] WebSocket interceptor installed');
})();
