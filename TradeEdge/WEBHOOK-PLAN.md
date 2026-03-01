# TradingView → TradeEdge Webhook Pipeline — Implementation Plan

## Overview
Eliminate manual CSV/PDF imports by receiving live trade data directly from TradingView via webhooks into TradeEdge.

## Architecture
```
TradingView Alert (Pine Script strategy)
        ↓  webhook POST (JSON)
ngrok public URL (free tunnel)
        ↓  forwards to localhost:5000
Flask server (Python, runs on Mac)
        ↓  writes trade to JSON file
TradeEdge app reads file on import
        ↓  or auto-polls every 30s
Dashboard updates live
```

## Requirements
- **TradingView plan:** Essential or higher (webhooks require paid plan)
- **Python 3:** Already available on Mac (`python3`)
- **ngrok:** Free tier — 1 tunnel, 1GB/month bandwidth (plenty for trade alerts)
- **No server costs:** Everything runs locally on your MacBook

---

## Phase 1: Flask Webhook Receiver

### Install dependencies
```bash
pip3 install flask
brew install ngrok   # or download from ngrok.com
```

### webhook_server.py
```python
from flask import Flask, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

# Simple passphrase to verify requests come from your TradingView
PASSPHRASE = "slickrick_tradeedge"

# Where trades get saved — TradeEdge will read this
TRADES_FILE = os.path.expanduser("~/Agentic Workflows/TradeEdge/data/webhook-trades.json")

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        data = request.get_json(force=True)

        # Verify passphrase
        if data.get("passphrase") != PASSPHRASE:
            return jsonify({"error": "unauthorized"}), 401

        # Load existing trades
        trades = []
        if os.path.exists(TRADES_FILE):
            with open(TRADES_FILE, "r") as f:
                trades = json.load(f)

        # Build trade record matching TradeEdge format
        trade = {
            "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
            "time": data.get("time", datetime.now().strftime("%H:%M:%S")),
            "symbol": data.get("symbol", "MNQ"),
            "side": data.get("action", "").capitalize(),  # "Buy" or "Sell"
            "qty": int(data.get("contracts", 1)),
            "entry": float(data.get("entry", 0)),
            "exit": float(data.get("exit", 0)) if data.get("exit") else None,
            "sl": float(data.get("sl", 0)) if data.get("sl") else None,
            "tp": float(data.get("tp", 0)) if data.get("tp") else None,
            "pnl": float(data.get("pnl", 0)) if data.get("pnl") else None,
            "source": "TradingView Webhook",
            "receivedAt": datetime.now().isoformat()
        }

        trades.append(trade)

        # Save back to file
        with open(TRADES_FILE, "w") as f:
            json.dump(trades, f, indent=2)

        print(f"[Webhook] Trade received: {trade['side']} {trade['symbol']} @ {trade['entry']}")
        return jsonify({"status": "ok", "trade": trade}), 200

    except Exception as e:
        print(f"[Webhook] Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "running", "time": datetime.now().isoformat()})

if __name__ == "__main__":
    # Ensure data directory exists
    os.makedirs(os.path.dirname(TRADES_FILE), exist_ok=True)
    print(f"[Webhook] Saving trades to: {TRADES_FILE}")
    print(f"[Webhook] Server starting on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
```

### Running the server
```bash
# Terminal 1: Start Flask
cd "/Users/slickrick/Agentic Workflows/TradeEdge"
python3 webhook_server.py

# Terminal 2: Start ngrok tunnel
ngrok http 5000
```

ngrok will output something like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:5000
```

Copy that `https://abc123.ngrok-free.app/webhook` URL — that's your TradingView webhook URL.

**Note:** Free ngrok URLs change every time you restart. For a persistent URL, use ngrok paid ($8/mo) or Cloudflare Tunnel (free, more setup).

---

## Phase 2: TradingView Pine Script Alert Setup

### Option A: Strategy Alert (if using a Pine Script strategy)
When your strategy fires an order, TradingView sends the alert. Use these built-in placeholders:

**Alert message (paste this into TradingView alert → Message field):**
```json
{
  "passphrase": "slickrick_tradeedge",
  "action": "{{strategy.order.action}}",
  "symbol": "{{ticker}}",
  "contracts": "{{strategy.order.contracts}}",
  "entry": "{{strategy.order.price}}",
  "time": "{{timenow}}",
  "date": "{{time}}"
}
```

### Option B: Strategy with SL/TP via alert_message parameter
In your Pine Script, pass SL/TP values directly:

```pine
//@version=6
// Inside your strategy, when placing orders:
strategy.entry("Long", strategy.long,
    alert_message='{"passphrase":"slickrick_tradeedge","action":"buy","symbol":"' + syminfo.ticker + '","entry":"' + str.tostring(close) + '","sl":"' + str.tostring(your_sl_price) + '","tp":"' + str.tostring(your_tp_price) + '"}')

strategy.close("Long",
    alert_message='{"passphrase":"slickrick_tradeedge","action":"sell","symbol":"' + syminfo.ticker + '","exit":"' + str.tostring(close) + '","pnl":"' + str.tostring(strategy.netprofit) + '"}')
```

Then set the alert message to just: `{{strategy.order.alert_message}}`

### Option C: Manual Indicator Alert (no strategy needed)
If you just draw levels manually and want to send them:

```json
{
  "passphrase": "slickrick_tradeedge",
  "action": "buy",
  "symbol": "MNQ",
  "entry": "{{close}}",
  "sl": "YOUR_SL_PRICE",
  "tp": "YOUR_TP_PRICE"
}
```

### Setting up the alert in TradingView
1. Right-click chart → **Add Alert**
2. Condition: Your strategy or indicator
3. Check **Webhook URL** box
4. Paste: `https://abc123.ngrok-free.app/webhook`
5. In Message field: paste the JSON from above
6. **Enable 2FA on TradingView** (required for webhooks)

---

## Phase 3: TradeEdge App Integration

### Add to tradeedge-ict.html — new import method

Add a "Webhook Import" button to the import view that reads `webhook-trades.json`:

```javascript
// Import trades from webhook server
function importWebhookTrades() {
    // Read the webhook trades file via fetch (if served) or FileReader
    // For local file: user selects webhook-trades.json from data/ folder
    // For auto-poll: use setInterval to check for new trades

    fetch('/data/webhook-trades.json')
        .then(r => r.json())
        .then(trades => {
            let added = 0;
            trades.forEach(t => {
                // Dedup: check if trade already exists
                const exists = S.trades.some(et =>
                    et.date === t.date &&
                    et.symbol === t.symbol &&
                    et.entry === t.entry &&
                    et.source === 'TradingView Webhook'
                );
                if (!exists) {
                    S.trades.push(t);
                    added++;
                }
            });
            if (added > 0) {
                _recomputeStartingBalance();
                save();
                renderDash();
                showToast(added + ' webhook trade(s) imported');
            } else {
                showToast('No new webhook trades');
            }
        })
        .catch(e => console.error('[Webhook Import]', e));
}
```

### Alternative: Auto-poll (no manual import needed)
```javascript
// In load() or init, start polling:
setInterval(function() {
    if (document.visibilityState === 'visible') {
        importWebhookTrades();
    }
}, 30000); // Check every 30 seconds
```

**Important:** Since TradeEdge is a local HTML file (not served), the simplest approach is:
1. Flask server also serves a `/trades` endpoint
2. TradeEdge fetches from `http://localhost:5000/trades`
3. Or: add a "Load Webhook Trades" button that reads the JSON file via `<input type="file">`

---

## Phase 4: Mobile Hotspot Considerations

| Concern | Solution |
|---------|----------|
| ngrok URL changes on restart | Use a startup script that logs the current URL |
| Hotspot drops | Flask keeps running locally; trades queue up in TradingView until reconnected |
| TradingView 3-second timeout | Flask is lightweight, responds instantly |
| Security | Passphrase in JSON body prevents random hits |
| ngrok free tier 1GB/month | Trade alerts are tiny (~500 bytes each) — thousands of trades per month easily |

### Startup script (run both servers with one command)
```bash
#!/bin/bash
# start-webhook.sh
echo "[TradeEdge] Starting webhook pipeline..."

# Start Flask in background
python3 "/Users/slickrick/Agentic Workflows/TradeEdge/webhook_server.py" &
FLASK_PID=$!

# Wait for Flask to start
sleep 2

# Start ngrok
ngrok http 5000

# If ngrok exits, kill Flask
kill $FLASK_PID
```

---

## File Structure After Implementation
```
TradeEdge/
├── tradeedge-ict.html          (add webhook import function)
├── webhook_server.py           (new — Flask receiver)
├── start-webhook.sh            (new — one-command startup)
├── data/
│   ├── webhook-trades.json     (new — auto-created by Flask)
│   ├── amp-order-history-*.csv
│   └── Custom reports_*.PDF
```

---

## Quick Start Summary
```bash
# One-time setup
pip3 install flask
brew install ngrok
ngrok config add-authtoken YOUR_TOKEN   # get free token from ngrok.com

# Every trading session
cd "/Users/slickrick/Agentic Workflows/TradeEdge"
bash start-webhook.sh
# Copy the ngrok URL → paste into TradingView alert webhook field
```

---

## TradingView Plan Check
- You need **Essential** plan minimum ($12.95/month billed annually) for webhooks
- Premium ($24.95/month) includes more alerts (400 vs 20)
- Check your current plan: TradingView → Profile → Subscription
- **2FA must be enabled** on TradingView for webhooks to work

---

## Phase 5: Cancelled Orders & Account Summary

### Cancelled Orders (SL/TP that got hit or cancelled)
TradingView strategies handle this natively through **OCA (One-Cancels-All) groups**:

- When you use `strategy.exit()` with both `stop` and `limit` (SL and TP), they form a bracket
- When one side fills (e.g., TP hit), TradingView **automatically cancels** the other (SL)
- The **fill** fires the webhook alert — the cancelled side is implicit
- You can also use `strategy.cancel()` to manually cancel pending orders

**What the webhook captures for each trade lifecycle:**

| Event | Webhook fires? | Data sent |
|-------|---------------|-----------|
| Entry order fills | Yes | action, symbol, entry price, SL, TP |
| SL hit (exit fills) | Yes | action=sell/buy, exit price, pnl |
| TP hit (exit fills) | Yes | action=sell/buy, exit price, pnl |
| SL cancelled (because TP hit) | No webhook needed | Implied — the TP fill webhook tells you |
| TP cancelled (because SL hit) | No webhook needed | Implied — the SL fill webhook tells you |
| Manual cancel | Optional | Can fire alert on `strategy.cancel()` |

**Pine Script for full bracket with cancel tracking:**
```pine
//@version=6
// Entry with bracket order
strategy.entry("Long", strategy.long,
    alert_message='{"passphrase":"slickrick_tradeedge","type":"entry","action":"buy","symbol":"' + syminfo.ticker + '","entry":"' + str.tostring(close) + '","sl":"' + str.tostring(sl_price) + '","tp":"' + str.tostring(tp_price) + '"}')

// Exit via SL or TP — TradingView auto-cancels the other
strategy.exit("Exit Long", "Long",
    stop=sl_price, limit=tp_price,
    alert_message='{"passphrase":"slickrick_tradeedge","type":"exit","action":"sell","symbol":"' + syminfo.ticker + '","exit":"' + str.tostring(strategy.order.price) + '","pnl":"' + str.tostring(strategy.netprofit) + '","exitReason":"' + (close <= sl_price ? "SL" : "TP") + '"}')
```

The `exitReason` field tells TradeEdge whether the trade closed via SL or TP — no need to reconstruct from cancelled orders like you do now with AMP CSVs.

### Account Summary Data
These Pine Script variables are available and can be sent in webhooks:

| Variable | What it returns |
|----------|----------------|
| `strategy.equity` | Current account equity (initial capital + net P&L) |
| `strategy.netprofit` | Total net profit across all closed trades |
| `strategy.grossprofit` | Total profit from winning trades |
| `strategy.grossloss` | Total loss from losing trades |
| `strategy.position_size` | Current position size (0 = flat) |
| `strategy.closedtrades` | Number of closed trades |
| `strategy.wintrades` | Number of winning trades |
| `strategy.losstrades` | Number of losing trades |
| `strategy.openprofit` | Unrealized P&L of open position |
| `strategy.initial_capital` | Starting capital |

**Account summary webhook (send periodically or on each trade close):**
```pine
// Add to your strategy.exit alert_message:
alert_message='{"passphrase":"slickrick_tradeedge","type":"summary","equity":"' + str.tostring(strategy.equity) + '","netProfit":"' + str.tostring(strategy.netprofit) + '","grossProfit":"' + str.tostring(strategy.grossprofit) + '","grossLoss":"' + str.tostring(strategy.grossloss) + '","closedTrades":"' + str.tostring(strategy.closedtrades) + '","winTrades":"' + str.tostring(strategy.wintrades) + '","lossTrades":"' + str.tostring(strategy.losstrades) + '","openProfit":"' + str.tostring(strategy.openprofit) + '"}'
```

### Updated Flask Server — handle all event types

Add to `webhook_server.py`:
```python
SUMMARY_FILE = os.path.expanduser("~/Agentic Workflows/TradeEdge/data/webhook-summary.json")

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json(force=True)
    if data.get("passphrase") != PASSPHRASE:
        return jsonify({"error": "unauthorized"}), 401

    msg_type = data.get("type", "trade")

    if msg_type == "summary":
        # Save account summary snapshot
        summary = {
            "equity": float(data.get("equity", 0)),
            "netProfit": float(data.get("netProfit", 0)),
            "grossProfit": float(data.get("grossProfit", 0)),
            "grossLoss": float(data.get("grossLoss", 0)),
            "closedTrades": int(data.get("closedTrades", 0)),
            "winTrades": int(data.get("winTrades", 0)),
            "lossTrades": int(data.get("lossTrades", 0)),
            "openProfit": float(data.get("openProfit", 0)),
            "updatedAt": datetime.now().isoformat()
        }
        with open(SUMMARY_FILE, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"[Webhook] Summary updated: equity={summary['equity']}")
        return jsonify({"status": "ok", "type": "summary"}), 200

    elif msg_type in ("entry", "exit", "trade"):
        # Handle trade (existing logic + exitReason field)
        trade = {
            "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
            "time": data.get("time", datetime.now().strftime("%H:%M:%S")),
            "symbol": data.get("symbol", "MNQ"),
            "side": data.get("action", "").capitalize(),
            "type": msg_type,
            "qty": int(data.get("contracts", 1)),
            "entry": float(data.get("entry", 0)) if data.get("entry") else None,
            "exit": float(data.get("exit", 0)) if data.get("exit") else None,
            "sl": float(data.get("sl", 0)) if data.get("sl") else None,
            "tp": float(data.get("tp", 0)) if data.get("tp") else None,
            "pnl": float(data.get("pnl", 0)) if data.get("pnl") else None,
            "exitReason": data.get("exitReason"),  # "SL", "TP", or null
            "source": "TradingView Webhook",
            "receivedAt": datetime.now().isoformat()
        }
        # ... save to trades file (same as before)

@app.route("/trades", methods=["GET"])
def get_trades():
    """TradeEdge app can fetch trades from this endpoint"""
    if os.path.exists(TRADES_FILE):
        with open(TRADES_FILE, "r") as f:
            return jsonify(json.load(f))
    return jsonify([])

@app.route("/summary", methods=["GET"])
def get_summary():
    """TradeEdge app can fetch account summary from this endpoint"""
    if os.path.exists(SUMMARY_FILE):
        with open(SUMMARY_FILE, "r") as f:
            return jsonify(json.load(f))
    return jsonify({})
```

### TradeEdge endpoints to consume:
| Endpoint | What TradeEdge gets |
|----------|-------------------|
| `GET /trades` | All webhook trades (entries + exits with SL/TP/exitReason) |
| `GET /summary` | Latest account equity, net P&L, win/loss counts |
| `GET /health` | Server status check |

---

## What This Replaces
- No more downloading CSVs from AMP
- No more uploading PDFs
- No more reconstructing SL/TP from cancelled orders CSV
- Trades appear in TradeEdge within seconds of execution
- SL/TP captured at time of order placement
- Exit reason (SL hit vs TP hit) sent explicitly — no guessing
- Account summary (equity, win rate, P&L) available in real time
