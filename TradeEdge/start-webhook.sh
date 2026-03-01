#!/bin/bash
# TradeEdge — Webhook Server Launcher
# Starts Flask server + ngrok tunnel in one command.
# Usage: bash start-webhook.sh

set -e

PORT=${PORT:-5050}
FLASK_PID=""

cleanup() {
  echo ""
  echo "[TradeEdge] Shutting down..."
  if [ -n "$FLASK_PID" ] && kill -0 "$FLASK_PID" 2>/dev/null; then
    kill "$FLASK_PID" 2>/dev/null
    echo "[TradeEdge] Flask server stopped (PID $FLASK_PID)"
  fi
  exit 0
}
trap cleanup EXIT INT TERM

# ── Dependency checks ────────────────────────────────────────

echo ""
echo "  TradeEdge Webhook Launcher"
echo "  =========================="
echo ""

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Install Python 3: brew install python3"
  exit 1
fi

if ! python3 -c "import flask" 2>/dev/null; then
  echo "ERROR: Flask not installed. Run: pip3 install flask"
  exit 1
fi

if ! command -v ngrok &>/dev/null; then
  echo "WARNING: ngrok not found. Install: brew install ngrok"
  echo "         Flask will still start on localhost:$PORT"
  echo "         You can use a different tunnel (e.g. cloudflared) manually."
  echo ""
fi

# ── Start Flask ──────────────────────────────────────────────

echo "[TradeEdge] Starting Flask on port $PORT..."
python3 webhook_server.py &
FLASK_PID=$!

# Wait for Flask to be ready
sleep 2

if ! kill -0 "$FLASK_PID" 2>/dev/null; then
  echo "ERROR: Flask server failed to start"
  exit 1
fi

echo "[TradeEdge] Flask running (PID $FLASK_PID)"
echo ""

# ── Start ngrok ──────────────────────────────────────────────

if command -v ngrok &>/dev/null; then
  echo "[TradeEdge] Starting ngrok tunnel..."
  echo ""
  echo "  Copy the ngrok Forwarding URL into your TradingView alert webhook URL."
  echo "  Example: https://xxxx-xx-xx-xxx-xx.ngrok-free.app/webhook"
  echo ""
  ngrok http "$PORT"
else
  echo "[TradeEdge] No ngrok — Flask running at http://localhost:$PORT"
  echo "  Test: curl http://localhost:$PORT/health"
  echo ""
  echo "  Press Ctrl+C to stop."
  wait "$FLASK_PID"
fi
