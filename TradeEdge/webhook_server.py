#!/usr/bin/env python3
"""TradeEdge — TradingView Webhook Receiver

Flask server that receives trade alerts from TradingView via POST /webhook,
stores them in data/webhook-trades.json, and serves them to TradeEdge via
GET /trades?since=<ISO timestamp>.

Start:  python3 webhook_server.py
Test:   curl http://localhost:5050/health
"""

import hmac
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone

from flask import Flask, request, jsonify

MAX_TRADES = 5000  # Prune server-side file beyond this

app = Flask(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TRADES_FILE = os.path.join(DATA_DIR, "webhook-trades.json")
SUMMARY_FILE = os.path.join(DATA_DIR, "webhook-summary.json")
PASSPHRASE = os.environ.get("WEBHOOK_PASSPHRASE", "slickrick_tradeedge")


# ── Helpers ──────────────────────────────────────────────────

def _load_json(path):
    """Load JSON file, returning empty list/dict on missing or corrupt file."""
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_json(path, data):
    """Atomic write: write to temp file then rename to prevent corruption."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def _cors(response):
    """Add CORS headers (TradeEdge runs on :8787)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.after_request
def after_request(response):
    return _cors(response)


# ── Routes ───────────────────────────────────────────────────

@app.route("/webhook", methods=["POST", "OPTIONS"])
def webhook():
    """Receive trade or summary from TradingView alert."""
    if request.method == "OPTIONS":
        return jsonify({"ok": True})

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    # Validate passphrase (timing-safe since ngrok exposes this to internet)
    if not hmac.compare_digest(data.get("passphrase", ""), PASSPHRASE):
        return jsonify({"error": "Invalid passphrase"}), 403

    msg_type = data.get("type", "trade").lower()
    now = datetime.now(timezone.utc).isoformat()

    if msg_type == "summary":
        # Account summary snapshot
        summary = {
            "balance": data.get("balance"),
            "equity": data.get("equity"),
            "openPnl": data.get("openPnl"),
            "receivedAt": now,
        }
        _save_json(SUMMARY_FILE, summary)
        print(f"[webhook] Summary received: balance={summary['balance']}")
        return jsonify({"ok": True, "type": "summary"})

    # Trade entry, exit, or complete trade
    trade = {
        "id": str(uuid.uuid4()),
        "type": msg_type,
        "action": data.get("action", ""),
        "symbol": data.get("symbol", ""),
        "qty": data.get("qty", data.get("contracts", 1)),
        "entry": data.get("entry", data.get("price")),
        "exit": data.get("exit"),
        "sl": data.get("sl"),
        "tp": data.get("tp"),
        "pnl": data.get("pnl"),
        "fees": data.get("fees"),
        "exitReason": data.get("exitReason", data.get("exit_reason", "")),
        "comment": data.get("comment", ""),
        "receivedAt": now,
    }

    trades = _load_json(TRADES_FILE)
    trades.append(trade)
    # Prune oldest trades if file grows beyond limit
    if len(trades) > MAX_TRADES:
        trades = trades[-MAX_TRADES:]
    _save_json(TRADES_FILE, trades)

    side = trade["action"] or msg_type
    print(f"[webhook] Trade received: {side} {trade['symbol']} (id={trade['id'][:8]})")
    return jsonify({"ok": True, "id": trade["id"], "type": msg_type})


@app.route("/trades", methods=["GET"])
def get_trades():
    """Return trades received after ?since=<ISO timestamp>."""
    since = request.args.get("since")
    trades = _load_json(TRADES_FILE)

    if since:
        trades = [t for t in trades if t.get("receivedAt", "") > since]

    return jsonify({"trades": trades, "count": len(trades)})


@app.route("/summary", methods=["GET"])
def get_summary():
    """Return latest account summary snapshot."""
    summary = _load_json(SUMMARY_FILE)
    if not summary:
        return jsonify({"summary": None})
    return jsonify({"summary": summary})


@app.route("/health", methods=["GET"])
def health():
    """Server status + trade count."""
    trades = _load_json(TRADES_FILE)
    return jsonify({
        "status": "ok",
        "server": "TradeEdge Webhook Receiver",
        "version": "1.0",
        "tradeCount": len(trades),
        "uptime": "running",
    })


# ── Main ─────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    port = int(os.environ.get("PORT", 5050))
    print(f"\n  TradeEdge Webhook Server")
    print(f"  Listening on http://localhost:{port}")
    print(f"  Passphrase: {'*' * len(PASSPHRASE)} ({len(PASSPHRASE)} chars)")
    print(f"  Data dir:   {DATA_DIR}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
