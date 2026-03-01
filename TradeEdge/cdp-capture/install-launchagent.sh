#!/bin/bash
# TradeEdge — Install/Uninstall macOS Launch Agent for TradingView CDP
#
# Usage:
#   bash install-launchagent.sh              # install + load
#   bash install-launchagent.sh --uninstall  # unload + remove

PLIST_NAME="com.tradeedge.tradingview-cdp.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/$PLIST_NAME"
DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo ""
echo "  TradeEdge — TradingView CDP Launch Agent"
echo ""

# ── Uninstall ──
if [ "$1" = "--uninstall" ]; then
    if [ -f "$DEST" ]; then
        launchctl unload "$DEST" 2>/dev/null
        rm -f "$DEST"
        echo "  ✓ Unloaded and removed $PLIST_NAME"
    else
        echo "  Launch Agent not installed (nothing to remove)"
    fi
    echo ""
    exit 0
fi

# ── Install ──
if [ ! -f "$SRC" ]; then
    echo "  ERROR: $PLIST_NAME not found in $SCRIPT_DIR"
    echo "  Make sure you're running this from the cdp-capture directory."
    exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

# Unload first if already installed (prevents duplicate)
if [ -f "$DEST" ]; then
    launchctl unload "$DEST" 2>/dev/null
fi

cp "$SRC" "$DEST"
launchctl load "$DEST"

echo "  ✓ Installed to ~/Library/LaunchAgents/$PLIST_NAME"
echo "  ✓ Loaded — TradingView will start with CDP on next login"
echo ""
echo "  Verify now:  curl http://localhost:9222/json"
echo "  Uninstall:   bash install-launchagent.sh --uninstall"
echo ""
