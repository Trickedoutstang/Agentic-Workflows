# TradeEdge CDP Fill Capture

Captures live trade fills, orders, and brackets from TradingView Desktop via Chrome DevTools Protocol (CDP) and forwards them to your TradeEdge webhook server for automatic journaling.

## Prerequisites

- **Python 3.8+** (macOS ships with it)
- **aiohttp**: `pip3 install aiohttp`
- **TradingView Desktop** (Electron app): [tradingview.com/desktop](https://www.tradingview.com/desktop/)
- **TradeEdge webhook server** running (optional — events queue if server is down)

## Quick Start

```bash
cd cdp-capture

# 1. Install dependency
pip3 install aiohttp

# 2. Discovery mode — see all WebSocket traffic (use first to verify CDP works)
bash start-capture.sh --mode discovery

# 3. Capture mode — intercept fills and forward to webhook
bash start-capture.sh --mode capture
```

The script will:
1. Launch TradingView with `--remote-debugging-port=9222` (if not already running)
2. Connect to CDP and listen for WebSocket frames
3. Parse trade events and POST them to your webhook server

## Launch Agent Setup (Auto-Start on Login)

Instead of manually launching TradingView with the CDP flag every time, install the macOS Launch Agent to do it automatically on login.

### Automatic Install

```bash
bash install-launchagent.sh
```

This copies the plist to `~/Library/LaunchAgents/` and loads it. TradingView will now start with CDP enabled every time you log in.

### Manual Install

```bash
cp com.tradeedge.tradingview-cdp.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.tradeedge.tradingview-cdp.plist
```

### Uninstall

```bash
bash install-launchagent.sh --uninstall
```

### Verify

After installing (or rebooting), confirm CDP is active:

```bash
curl http://localhost:9222/json
```

You should see a JSON array with TradingView page targets.

## Configuration

Edit `config.json` in this directory:

```json
{
  "webhookUrl": "http://localhost:5050",
  "passphrase": "slickrick_tradeedge",
  "activeAccount": "amp_live",
  "accounts": [
    { "name": "amp_live", "label": "AMP Live" },
    { "name": "amp_demo", "label": "AMP Demo" }
  ],
  "mode": "discovery",
  "cdpPort": 9222
}
```

| Field | Description |
|-------|-------------|
| `webhookUrl` | URL of your TradeEdge webhook server (default `http://localhost:5050`) |
| `passphrase` | Must match the passphrase in TradeEdge settings |
| `activeAccount` | Which account name to tag events with |
| `accounts` | List of accounts (name is the key, label is display text) |
| `mode` | Default mode: `discovery` or `capture` |
| `cdpPort` | Chrome DevTools Protocol port (default `9222`) |

CLI flags override config values: `--mode capture --port 9333 --account amp_demo`

## Modes

### Discovery Mode

```bash
bash start-capture.sh --mode discovery
```

Logs all WebSocket traffic from TradingView. Use this to:
- Verify CDP is connected and receiving data
- See what broker messages look like on your setup
- Debug event parsing issues

Output is saved to `cdp-discovery.json` every 50 frames.

### Capture Mode

```bash
bash start-capture.sh --mode capture
```

Actively parses WebSocket frames for trade events (fills, order placements, bracket updates, modifications) and POSTs them to your webhook server. Events are deduplicated within 30-second windows.

If the webhook server is unreachable, events are queued in `pending-fills.json` and retried every 30 seconds.

## Troubleshooting

### CDP port not responding

```
curl: (7) Failed to connect to localhost port 9222
```

**Cause**: TradingView wasn't launched with `--remote-debugging-port=9222`.

**Fix**: Quit TradingView completely, then either:
- Run `bash start-capture.sh` (launches TV with the flag)
- Install the Launch Agent: `bash install-launchagent.sh`

### TradingView already running without CDP flag

The CDP flag only works if set at launch time. If TV is already running:

1. Quit TradingView (`Cmd+Q`)
2. Wait 2-3 seconds for the process to fully exit
3. Run `bash start-capture.sh`

### aiohttp not installed

```
ERROR: aiohttp is required. Install with: pip3 install aiohttp
```

**Fix**: `pip3 install aiohttp`

### Webhook server down (events queuing)

Events queue in `pending-fills.json` and retry every 30 seconds. Start your webhook server and they'll flush automatically. Max queue size: 50 events.

### No page target found

```
No page target found. Is TradingView open?
```

TradingView may still be loading. Wait a few seconds and the script will auto-reconnect.

### No trade events in capture mode

- Use **discovery mode** first to verify you're seeing WebSocket traffic
- Make sure you're logged into your broker inside TradingView
- Place a test trade — fills appear when orders execute, not when placed
