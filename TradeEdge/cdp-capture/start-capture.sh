#!/bin/bash
# TradeEdge — Launch TradingView Desktop with CDP + Start Capture
#
# Usage:
#   bash start-capture.sh                     # discovery mode (default)
#   bash start-capture.sh --mode capture      # capture fills
#   bash start-capture.sh --mode discovery    # log WS traffic
#   CDP_PORT=9333 bash start-capture.sh       # custom port

CDP_PORT=${CDP_PORT:-9222}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TV_APP="/Applications/TradingView.app/Contents/MacOS/TradingView"

echo ""
echo "  TradeEdge CDP Fill Capture"
echo "  CDP Port: $CDP_PORT"
echo ""

# Check if TradingView is already running
if pgrep -f "TradingView" > /dev/null 2>&1; then
    echo "  TradingView is already running."
    echo "  If it wasn't started with --remote-debugging-port=$CDP_PORT,"
    echo "  quit it and re-run this script."
    echo ""
else
    if [ ! -f "$TV_APP" ]; then
        echo "  ERROR: TradingView not found at $TV_APP"
        echo "  Update TV_APP path in this script if installed elsewhere."
        exit 1
    fi

    echo "  Starting TradingView with CDP on port $CDP_PORT..."
    "$TV_APP" --remote-debugging-port=$CDP_PORT &
    TV_PID=$!
    echo "  TradingView PID: $TV_PID"
    echo "  Waiting 5s for app to start..."
    sleep 5
fi

# Start capture script
echo "  Starting capture script..."
echo ""
python3 "$SCRIPT_DIR/capture.py" --port "$CDP_PORT" "$@"

# Cleanup: only kill TV if we started it
if [ -n "$TV_PID" ]; then
    echo ""
    echo "  Stopping TradingView (PID $TV_PID)..."
    kill "$TV_PID" 2>/dev/null
fi
