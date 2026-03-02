#!/usr/bin/env python3
"""TradeEdge — CDP WebSocket Event Interceptor

Connects to TradingView Desktop (Electron) via Chrome DevTools Protocol
to capture live trade fills, order placements, brackets, and modifications,
then POSTs them to the TradeEdge webhook server.

Usage:
    python3 capture.py                          # default: discovery mode
    python3 capture.py --mode capture            # capture all events
    python3 capture.py --mode discovery          # log all WS traffic
    python3 capture.py --port 9222               # custom CDP port
    python3 capture.py --account amp_demo        # override account

Requires: pip3 install aiohttp
"""

import argparse
import asyncio
import json
import math
import os
import re
import sys
import time
from datetime import datetime, timezone

try:
    import aiohttp
except ImportError:
    print("ERROR: aiohttp is required. Install with: pip3 install aiohttp")
    sys.exit(1)


# ── Colors ────────────────────────────────────────────────────

class C:
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def log(msg, color=C.DIM):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{C.DIM}{ts}{C.RESET} {color}{msg}{C.RESET}")


def log_event(evt):
    etype = evt.get("eventType", "unknown")
    symbol = evt.get("symbol", "?")

    if etype == "fill":
        side_color = C.GREEN if evt.get("action") == "buy" else C.RED
        side = (evt.get("action") or "?").upper()
        print(
            f"\n{C.BOLD}{C.CYAN}{'='*50}{C.RESET}\n"
            f"  {C.BOLD}FILL CAPTURED{C.RESET}\n"
            f"  {side_color}{side}{C.RESET} {evt.get('qty', 1)}x "
            f"{C.BOLD}{symbol}{C.RESET} @ "
            f"{C.CYAN}{evt.get('price', 0)}{C.RESET}\n"
            f"{C.BOLD}{C.CYAN}{'='*50}{C.RESET}\n"
        )
    elif etype == "order_placed":
        side_color = C.GREEN if evt.get("action") == "buy" else C.RED
        side = (evt.get("action") or "?").upper()
        print(
            f"\n{C.BOLD}{C.MAGENTA}{'─'*50}{C.RESET}\n"
            f"  {C.BOLD}ORDER PLACED{C.RESET}\n"
            f"  {side_color}{side}{C.RESET} {evt.get('qty', 1)}x "
            f"{C.BOLD}{symbol}{C.RESET} @ "
            f"{C.CYAN}{evt.get('price', 0)}{C.RESET}"
            f"  SL={evt.get('sl') or '-'} TP={evt.get('tp') or '-'}\n"
            f"{C.BOLD}{C.MAGENTA}{'─'*50}{C.RESET}\n"
        )
    elif etype == "bracket":
        print(
            f"\n{C.BOLD}{C.YELLOW}{'─'*50}{C.RESET}\n"
            f"  {C.BOLD}BRACKET UPDATE{C.RESET}  ({evt.get('bracketType', '?')})\n"
            f"  {C.BOLD}{symbol}{C.RESET}"
            f"  SL={evt.get('sl') or '-'} TP={evt.get('tp') or '-'}\n"
            f"{C.BOLD}{C.YELLOW}{'─'*50}{C.RESET}\n"
        )
    elif etype == "order_modified":
        print(
            f"\n{C.BOLD}{C.YELLOW}{'─'*50}{C.RESET}\n"
            f"  {C.BOLD}ORDER MODIFIED{C.RESET}\n"
            f"  {C.BOLD}{symbol}{C.RESET}"
            f"  price={evt.get('price') or '-'}"
            f"  SL={evt.get('sl') or '-'} TP={evt.get('tp') or '-'}\n"
            f"{C.BOLD}{C.YELLOW}{'─'*50}{C.RESET}\n"
        )


# ── Config ────────────────────────────────────────────────────

def load_config():
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
    defaults = {
        "webhookUrl": "http://localhost:5050",
        "passphrase": os.environ.get("WEBHOOK_PASSPHRASE", ""),
        "activeAccount": "amp_live",
        "accounts": [
            {"name": "amp_live", "label": "AMP Live"},
            {"name": "amp_demo", "label": "AMP Demo"},
        ],
        "mode": "discovery",
        "cdpPort": 9222,
    }
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            try:
                user = json.load(f)
                defaults.update(user)
            except json.JSONDecodeError:
                log("Warning: config.json is malformed, using defaults", C.YELLOW)
    return defaults


# ── Symbol Normalization ──────────────────────────────────────

SYMBOL_MAP = {
    # ── Equity Index ──
    "MNQH": "MNQ", "MNQM": "MNQ", "MNQU": "MNQ", "MNQZ": "MNQ",
    "MESH": "MES", "MESM": "MES", "MESU": "MES", "MESZ": "MES",
    "NQH": "NQ", "NQM": "NQ", "NQU": "NQ", "NQZ": "NQ",
    "ESH": "ES", "ESM": "ES", "ESU": "ES", "ESZ": "ES",
    "YMH": "YM", "YMM": "YM", "YMU": "YM", "YMZ": "YM",
    "MYMH": "MYM", "MYMM": "MYM", "MYMU": "MYM", "MYMZ": "MYM",
    "RTYH": "RTY", "RTYM": "RTY", "RTYU": "RTY", "RTYZ": "RTY",
    "M2KH": "M2K", "M2KM": "M2K", "M2KU": "M2K", "M2KZ": "M2K",
    # ── Energy (all 12 months for CL) ──
    "CLF": "CL", "CLG": "CL", "CLH": "CL", "CLJ": "CL", "CLK": "CL", "CLM": "CL",
    "CLN": "CL", "CLQ": "CL", "CLU": "CL", "CLV": "CL", "CLX": "CL", "CLZ": "CL",
    "MCLF": "MCL", "MCLG": "MCL", "MCLH": "MCL", "MCLJ": "MCL", "MCLK": "MCL", "MCLM": "MCL",
    "MCLN": "MCL", "MCLQ": "MCL", "MCLU": "MCL", "MCLV": "MCL", "MCLX": "MCL", "MCLZ": "MCL",
    "NGF": "NG", "NGG": "NG", "NGH": "NG", "NGJ": "NG", "NGK": "NG", "NGM": "NG",
    "NGN": "NG", "NGQ": "NG", "NGU": "NG", "NGV": "NG", "NGX": "NG", "NGZ": "NG",
    # ── Metals (all 12 months for GC) ──
    "GCF": "GC", "GCG": "GC", "GCH": "GC", "GCJ": "GC", "GCK": "GC", "GCM": "GC",
    "GCN": "GC", "GCQ": "GC", "GCU": "GC", "GCV": "GC", "GCX": "GC", "GCZ": "GC",
    "MGCF": "MGC", "MGCG": "MGC", "MGCH": "MGC", "MGCJ": "MGC", "MGCK": "MGC", "MGCM": "MGC",
    "MGCN": "MGC", "MGCQ": "MGC", "MGCU": "MGC", "MGCV": "MGC", "MGCX": "MGC", "MGCZ": "MGC",
    "SIH": "SI", "SIK": "SI", "SIN": "SI", "SIU": "SI", "SIZ": "SI",
    "SILH": "SIL", "SILK": "SIL", "SILN": "SIL", "SILU": "SIL", "SILZ": "SIL",
    "HGH": "HG", "HGK": "HG", "HGN": "HG", "HGU": "HG", "HGZ": "HG",
    "PLF": "PL", "PLJ": "PL", "PLN": "PL", "PLV": "PL",
    # ── Treasury ──
    "ZBH": "ZB", "ZBM": "ZB", "ZBU": "ZB", "ZBZ": "ZB",
    "ZNH": "ZN", "ZNM": "ZN", "ZNU": "ZN", "ZNZ": "ZN",
    "ZFH": "ZF", "ZFM": "ZF", "ZFU": "ZF", "ZFZ": "ZF",
    "ZTH": "ZT", "ZTM": "ZT", "ZTU": "ZT", "ZTZ": "ZT",
    # ── Agriculture ──
    "ZCH": "ZC", "ZCK": "ZC", "ZCN": "ZC", "ZCU": "ZC", "ZCZ": "ZC",
    "ZSF": "ZS", "ZSH": "ZS", "ZSK": "ZS", "ZSN": "ZS", "ZSQ": "ZS", "ZSU": "ZS", "ZSX": "ZS",
    "ZWH": "ZW", "ZWK": "ZW", "ZWN": "ZW", "ZWU": "ZW", "ZWZ": "ZW",
    # ── Currency (digit-prefixed) ──
    "6EH": "6E", "6EM": "6E", "6EU": "6E", "6EZ": "6E",
    "6BH": "6B", "6BM": "6B", "6BU": "6B", "6BZ": "6B",
    "6JH": "6J", "6JM": "6J", "6JU": "6J", "6JZ": "6J",
    "6AH": "6A", "6AM": "6A", "6AU": "6A", "6AZ": "6A",
    "6CH": "6C", "6CM": "6C", "6CU": "6C", "6CZ": "6C",
    "6SH": "6S", "6SM": "6S", "6SU": "6S", "6SZ": "6S",
    # ── Livestock ──
    "HEG": "HE", "HEJ": "HE", "HEM": "HE", "HEN": "HE", "HEQ": "HE", "HEV": "HE", "HEZ": "HE",
    "LEG": "LE", "LEJ": "LE", "LEM": "LE", "LEQ": "LE", "LEV": "LE", "LEZ": "LE",
    # ── Crypto ──
    "BTCF": "BTC", "BTCG": "BTC", "BTCH": "BTC", "BTCJ": "BTC", "BTCK": "BTC", "BTCM": "BTC",
    "MBTH": "MBT", "MBTM": "MBT", "MBTU": "MBT", "MBTZ": "MBT",
}

# Sorted longest-first to avoid partial matches (MNQ before NQ, MCL before CL)
BASES = [
    "MNQ", "MES", "MYM", "M2K", "MCL", "MGC",      # Micros first (longer)
    "NQ", "ES", "YM", "RTY", "EMD", "NKD",           # Equity index
    "CL", "NG", "QM", "QG", "RB", "HO",              # Energy
    "GC", "SI", "SIL", "HG", "PL", "PA",             # Metals
    "ZB", "ZN", "ZF", "ZT", "UB", "TN",              # Treasury
    "ZC", "ZS", "ZW", "ZM", "ZL", "CT", "KC", "SB", "CC",  # Agriculture
    "HE", "LE", "GF",                                 # Livestock
    "6E", "6B", "6J", "6A", "6C", "6S", "6N", "6M",  # Currency
    "BTC", "MBT", "ETH", "MET",                       # Crypto
]


def normalize_symbol(raw):
    if not raw:
        return ""
    s = re.sub(r"^[A-Z_]+:", "", raw)  # strip exchange prefix
    s = re.sub(r"\d{1,4}$", "", s)     # strip contract year digits
    s = s.upper()
    if s in SYMBOL_MAP:
        return SYMBOL_MAP[s]
    for base in BASES:
        if s.startswith(base):
            return base
    return s


# ── TradingView Frame Parser ─────────────────────────────────

def parse_tv_frames(data):
    """Parse TradingView ~m~<len>~m~<payload> framing."""
    if not isinstance(data, str):
        return []
    frames = []
    pos = 0
    pattern = re.compile(r"~m~(\d+)~m~")
    while pos < len(data):
        m = pattern.match(data, pos)
        if not m:
            break
        header_len = len(m.group(0))
        payload_len = int(m.group(1))
        payload = data[pos + header_len : pos + header_len + payload_len]
        frames.append(payload)
        pos += header_len + payload_len
    if not frames and data:
        frames.append(data)
    return frames


# ── SL/TP Extraction Helpers ─────────────────────────────────

def _extract_sl(item):
    """Extract stop-loss from various field names brokers use."""
    for key in ("sl", "stopLoss", "stopPrice", "newStopLoss", "stop_loss"):
        val = item.get(key)
        if val is not None:
            try:
                f = float(val)
                if f != 0:
                    return f
            except (ValueError, TypeError):
                pass
    return None


def _extract_tp(item):
    """Extract take-profit from various field names brokers use."""
    for key in ("tp", "takeProfit", "limitPrice", "newTakeProfit", "take_profit"):
        val = item.get(key)
        if val is not None:
            try:
                f = float(val)
                if f != 0:
                    return f
            except (ValueError, TypeError):
                pass
    return None


def _parse_side(item):
    """Parse buy/sell action from various field names."""
    side = (item.get("side") or item.get("action") or item.get("type") or "").lower()
    if side in ("buy", "long", "1"):
        return "buy"
    if side in ("sell", "short", "2"):
        return "sell"
    return ""


# ── Event Detection ──────────────────────────────────────────

BROKER_METHODS = {
    "execution_report", "trade_completed", "order_event",
    "order_placed", "order_modified", "order_cancelled",
    "bracket_update", "position_update",
}


def try_parse_event(frame):
    """Attempt to extract a trade event from a WS frame payload.

    Returns dict with 'eventType' key (fill|order_placed|bracket|order_modified)
    or None if not a recognized event.
    """
    try:
        obj = json.loads(frame)
    except (json.JSONDecodeError, TypeError):
        return None

    # Pattern 1: TradingView broker messages {"m":"...", "p":[...]}
    if obj.get("m") in BROKER_METHODS:
        p = obj.get("p", [])
        if not isinstance(p, list):
            return None
        for item in p:
            if not isinstance(item, dict):
                continue
            result = _classify_broker_item(item, obj.get("m", ""))
            if result is not None:
                return result

    # Pattern 2: CQG/AMP nested {d: {...}} structure
    d = obj.get("d")
    if isinstance(d, dict):
        result = _classify_broker_item(d, "")
        if result is not None:
            return result

    return None


def _classify_broker_item(item, method):
    """Classify a single broker data item into an event type."""
    symbol = normalize_symbol(
        item.get("symbol") or item.get("instrument")
        or item.get("ticker") or item.get("contractSymbol") or ""
    )
    if not symbol:
        return None

    status = (
        item.get("status") or item.get("state")
        or item.get("execType") or item.get("orderStatus") or ""
    ).lower()
    order_type = (item.get("orderType") or item.get("type") or item.get("ordType") or "").lower()
    action = _parse_side(item)
    ts = item.get("time") or item.get("timestamp") or datetime.now(timezone.utc).isoformat()
    order_id = item.get("orderId") or item.get("id") or item.get("execId") or ""

    # ── Fill
    if status in ("filled", "fill", "trade"):
        if not action:
            return None
        return {
            "eventType": "fill",
            "symbol": symbol,
            "action": action,
            "qty": _safe_int(item.get("qty") or item.get("quantity") or item.get("filledQty") or item.get("amount"), 1),
            "price": _safe_float(item.get("price") or item.get("avgPrice") or item.get("fillPrice") or item.get("avgFillPrice"), 0),
            "sl": _extract_sl(item),
            "tp": _extract_tp(item),
            "orderType": order_type,
            "timestamp": ts,
            "orderId": order_id,
        }

    # ── Order placed (working, not yet filled)
    if status in ("working", "pending", "new", "accepted"):
        if not action:
            return None
        limit_price = _safe_float(item.get("limitPrice") or item.get("price") or item.get("orderPrice"), 0)
        if not limit_price:
            return None
        return {
            "eventType": "order_placed",
            "symbol": symbol,
            "action": action,
            "orderType": order_type or "limit",
            "qty": _safe_int(item.get("qty") or item.get("quantity"), 1),
            "price": limit_price,
            "sl": _extract_sl(item),
            "tp": _extract_tp(item),
            "timestamp": ts,
            "orderId": order_id,
        }

    # ── SL/TP bracket
    if order_type in ("stop", "stoploss", "stop_loss", "take_profit", "takeprofit", "bracket", "oco", "oso"):
        bracket_type = ""
        if "stop" in order_type:
            bracket_type = "sl"
        elif "take" in order_type or "profit" in order_type:
            bracket_type = "tp"
        else:
            bracket_type = "bracket"

        sl = _extract_sl(item)
        tp = _extract_tp(item)
        # If this is a SL bracket and no sl field, use price as sl
        if bracket_type == "sl" and sl is None:
            sl = _safe_float(item.get("price"), None)
        # If this is a TP bracket and no tp field, use price as tp
        if bracket_type == "tp" and tp is None:
            tp = _safe_float(item.get("price"), None)

        return {
            "eventType": "bracket",
            "bracketType": bracket_type,
            "symbol": symbol,
            "action": action,
            "sl": sl,
            "tp": tp,
            "timestamp": ts,
            "orderId": item.get("orderId") or item.get("id") or item.get("parentId") or "",
        }

    # ── Order modified
    if status in ("modified", "replaced") or method == "order_modified":
        return {
            "eventType": "order_modified",
            "symbol": symbol,
            "action": action,
            "orderType": order_type,
            "price": _safe_float(item.get("price") or item.get("newPrice"), None),
            "sl": _extract_sl(item),
            "tp": _extract_tp(item),
            "timestamp": ts,
            "orderId": order_id,
        }

    return None


def _safe_int(val, default=1):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=None):
    if val is None:
        return default
    try:
        f = float(val)
        return f if f != 0 else default
    except (ValueError, TypeError):
        return default


# ── WebSocket URL Classification ─────────────────────────────

def classify_ws_url(url):
    """Classify a WebSocket URL to skip market data (high volume, no fills)."""
    if not url:
        return "unknown"
    u = url.lower()
    # Market data streams — skip
    if "data.tradingview.com" in u:
        return "market_data"
    if "widgetdata" in u:
        return "market_data"
    if "quotes" in u:
        return "market_data"
    # Broker connections
    if "broker" in u:
        return "tv_broker"
    if "trading" in u:
        return "tv_broker"
    if "order" in u:
        return "tv_broker"
    if "cqg" in u:
        return "external_broker"
    if "amp" in u:
        return "external_broker"
    return "other"


# ── Dedup ─────────────────────────────────────────────────────

class EventDedup:
    def __init__(self, max_entries=200):
        self._seen = {}
        self._max = max_entries

    def is_duplicate(self, evt):
        bucket = math.floor(time.time() / 30)  # 30s buckets
        etype = evt.get("eventType", "unknown")
        symbol = evt.get("symbol", "")

        if etype == "fill":
            fp = f"fill|{symbol}|{evt.get('action')}|{evt.get('qty')}|{evt.get('price')}|{bucket}"
        elif etype == "bracket":
            fp = f"bracket|{symbol}|{evt.get('sl')}|{evt.get('tp')}|{evt.get('bracketType')}|{bucket}"
        elif etype == "order_modified":
            fp = f"modified|{symbol}|{evt.get('sl')}|{evt.get('tp')}|{evt.get('price')}|{bucket}"
        elif etype == "order_placed":
            fp = f"placed|{symbol}|{evt.get('action')}|{evt.get('qty')}|{evt.get('price')}|{bucket}"
        else:
            fp = f"{etype}|{symbol}|{bucket}"

        if fp in self._seen:
            return True
        self._seen[fp] = time.time()
        self._prune()
        return False

    def _prune(self):
        if len(self._seen) > self._max:
            oldest = sorted(self._seen, key=self._seen.get)[: len(self._seen) - self._max]
            for k in oldest:
                del self._seen[k]


# ── Retry Queue Persistence ──────────────────────────────────

PENDING_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pending-fills.json")
PENDING_MAX = 50


def load_pending():
    if os.path.exists(PENDING_PATH):
        try:
            with open(PENDING_PATH, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data[:PENDING_MAX]
        except (json.JSONDecodeError, OSError):
            pass
    return []


def save_pending(pending):
    try:
        with open(PENDING_PATH, "w") as f:
            json.dump(pending[:PENDING_MAX], f, indent=2)
    except OSError as e:
        log(f"Failed to save pending queue: {e}", C.RED)


# ── CDP Capture ───────────────────────────────────────────────

class CDPCapture:
    def __init__(self, config, args):
        self.config = config
        self.mode = args.mode or config.get("mode", "discovery")
        self.port = args.port or config.get("cdpPort", 9222)
        self.account = args.account or config.get("activeAccount", "amp_live")
        self.webhook_url = config.get("webhookUrl", "http://localhost:5050")
        self.passphrase = os.environ.get("WEBHOOK_PASSPHRASE") or config.get("passphrase", "")
        self.dedup = EventDedup()
        self.discovery_log = []
        self.stats = {"captured": 0, "sent": 0, "errors": 0}
        self._pending = load_pending()
        self._session = None
        # WebSocket classification: requestId → ws_type
        self._ws_types = {}

        if self._pending:
            log(f"Loaded {len(self._pending)} pending webhook(s) from disk", C.YELLOW)

    def _get_account_label(self):
        for acc in self.config.get("accounts", []):
            if acc["name"] == self.account:
                return acc["label"]
        return self.account

    async def start(self):
        log(f"TradeEdge CDP Event Capture", C.BOLD)
        log(f"Mode: {self.mode.upper()}", C.CYAN)
        log(f"Account: {self._get_account_label()}", C.CYAN)
        log(f"CDP port: {self.port}", C.CYAN)
        log(f"Webhook: {self.webhook_url}", C.CYAN)
        print()

        while True:
            try:
                await self._connect_and_listen()
            except aiohttp.ClientError as e:
                log(f"CDP connection error: {e}", C.RED)
            except asyncio.CancelledError:
                break
            except Exception as e:
                log(f"Unexpected error: {e}", C.RED)

            log("Reconnecting in 3s...", C.YELLOW)
            await asyncio.sleep(3)

    async def _connect_and_listen(self):
        targets_url = f"http://localhost:{self.port}/json"
        log(f"Connecting to {targets_url}...", C.DIM)

        async with aiohttp.ClientSession() as session:
            self._session = session

            async with session.get(targets_url) as resp:
                if resp.status != 200:
                    log(f"Failed to list targets: HTTP {resp.status}", C.RED)
                    return
                targets = await resp.json()

            page_target = None
            for t in targets:
                if t.get("type") == "page":
                    page_target = t
                    break

            if not page_target:
                log("No page target found. Is TradingView open?", C.RED)
                return

            ws_url = page_target.get("webSocketDebuggerUrl")
            if not ws_url:
                log("No webSocketDebuggerUrl for page target", C.RED)
                return

            log(f"Target: {page_target.get('title', 'unknown')[:60]}", C.GREEN)
            log(f"CDP WS: {ws_url[:80]}", C.DIM)

            async with session.ws_connect(ws_url) as ws:
                # Enable Network domain
                await ws.send_json({"id": 1, "method": "Network.enable"})
                log("Network.enable sent, listening for WS frames...", C.GREEN)
                print()

                # Start retry loop alongside the CDP listener
                retry_task = asyncio.ensure_future(self._retry_loop())

                try:
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            await self._handle_cdp_message(msg.data)
                        elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                            log("CDP WebSocket closed", C.YELLOW)
                            break
                finally:
                    retry_task.cancel()
                    try:
                        await retry_task
                    except asyncio.CancelledError:
                        pass

    async def _handle_cdp_message(self, raw):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return

        method = data.get("method", "")

        # Track WebSocket creation for URL classification
        if method == "Network.webSocketCreated":
            params = data.get("params", {})
            req_id = params.get("requestId", "")
            url = params.get("url", "")
            if req_id:
                ws_type = classify_ws_url(url)
                self._ws_types[req_id] = ws_type
                if ws_type != "market_data":
                    log(f"[WS open] {ws_type}: {url[:80]}", C.DIM)
            return

        # Clean up closed WebSockets
        if method == "Network.webSocketClosed":
            req_id = data.get("params", {}).get("requestId", "")
            self._ws_types.pop(req_id, None)
            return

        # Filter WebSocket frames
        if method != "Network.webSocketFrameReceived":
            return

        params = data.get("params", {})
        req_id = params.get("requestId", "")

        # Skip market data WebSockets (high volume, no fills)
        ws_type = self._ws_types.get(req_id, "unknown")
        if ws_type == "market_data":
            return

        response = params.get("response", {})
        payload = response.get("payloadData", "")

        if not payload:
            return

        if self.mode == "discovery":
            await self._handle_discovery(payload, params, ws_type)
        elif self.mode == "capture":
            await self._handle_capture(payload)

    async def _handle_discovery(self, payload, params, ws_type):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "requestId": params.get("requestId", ""),
            "wsType": ws_type,
            "payload": payload[:2000],
        }
        self.discovery_log.append(entry)
        if len(self.discovery_log) > 500:
            self.discovery_log = self.discovery_log[-500:]

        preview = payload[:120].replace("\n", " ")
        log(f"[WS:{ws_type}] {preview}...", C.DIM)

        if len(self.discovery_log) % 50 == 0:
            self._save_discovery_log()
            log(f"Discovery log saved ({len(self.discovery_log)} frames)", C.CYAN)

    async def _handle_capture(self, payload):
        frames = parse_tv_frames(payload)
        for frame in frames:
            evt = try_parse_event(frame)
            if not evt:
                continue

            if self.dedup.is_duplicate(evt):
                log(f"Duplicate {evt['eventType']} skipped: {evt['symbol']}", C.DIM)
                continue

            self.stats["captured"] += 1
            log_event(evt)

            webhook_payload = self._build_webhook_payload(evt)
            sent = await self._post_webhook(webhook_payload)

            if sent:
                self.stats["sent"] += 1
                log(f"Sent {evt['eventType']} to webhook", C.GREEN)
            else:
                self.stats["errors"] += 1
                self._pending.append(webhook_payload)
                save_pending(self._pending)
                log("Queued for retry", C.YELLOW)

    def _build_webhook_payload(self, evt):
        """Build webhook payload from parsed event, matching Chrome extension format."""
        etype = evt["eventType"]
        account_label = self._get_account_label()

        base = {
            "passphrase": self.passphrase,
            "symbol": evt["symbol"],
            "action": (evt.get("action") or "").lower(),
            "account": account_label,
        }

        if etype == "fill":
            base["type"] = "trade"
            base["qty"] = evt.get("qty", 1)
            base["entry"] = evt.get("price", 0)
            base["sl"] = evt.get("sl")
            base["tp"] = evt.get("tp")
            base["orderType"] = evt.get("orderType", "")
            base["orderId"] = evt.get("orderId", "")
            base["comment"] = "TV auto-capture [cdp]"

        elif etype == "order_placed":
            base["type"] = "order_placed"
            base["orderType"] = evt.get("orderType", "limit")
            base["qty"] = evt.get("qty", 1)
            base["entry"] = evt.get("price", 0)
            base["sl"] = evt.get("sl")
            base["tp"] = evt.get("tp")
            base["comment"] = "TV auto-capture: limit order [cdp]"

        elif etype == "bracket":
            base["type"] = "bracket"
            base["sl"] = evt.get("sl")
            base["tp"] = evt.get("tp")
            base["bracketType"] = evt.get("bracketType", "")
            base["comment"] = f"TV auto-capture: bracket {evt.get('bracketType', '')} [cdp]"

        elif etype == "order_modified":
            base["type"] = "order_modified"
            base["entry"] = evt.get("price")
            base["sl"] = evt.get("sl")
            base["tp"] = evt.get("tp")
            base["orderType"] = evt.get("orderType", "")
            base["comment"] = "TV auto-capture: order modified [cdp]"

        if evt.get("orderId"):
            base["orderId"] = evt["orderId"]

        return base

    async def _post_webhook(self, payload):
        try:
            if not self._session:
                return False
            async with self._session.post(
                f"{self.webhook_url}/webhook",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                return resp.status == 200
        except Exception as e:
            log(f"Webhook POST failed: {e}", C.RED)
            return False

    async def _retry_loop(self):
        """Retry pending webhooks every 30s (matches Chrome extension)."""
        while True:
            await asyncio.sleep(30)
            if not self._pending:
                continue

            log(f"Retrying {len(self._pending)} pending webhook(s)...", C.YELLOW)
            still_pending = []
            for payload in self._pending:
                sent = await self._post_webhook(payload)
                if not sent:
                    still_pending.append(payload)
                else:
                    self.stats["sent"] += 1
                    log(f"Retry succeeded: {payload.get('symbol', '?')} ({payload.get('type', '?')})", C.GREEN)

            self._pending = still_pending
            save_pending(self._pending)

            if still_pending:
                log(f"{len(still_pending)} webhook(s) still pending", C.YELLOW)

    def _save_discovery_log(self):
        out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cdp-discovery.json")
        with open(out_path, "w") as f:
            json.dump(self.discovery_log, f, indent=2)


# ── Main ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="TradeEdge CDP Event Capture")
    parser.add_argument("--mode", choices=["discovery", "capture"], help="Capture mode")
    parser.add_argument("--port", type=int, help="CDP debugging port (default: 9222)")
    parser.add_argument("--account", help="Active account name (e.g. amp_live, amp_demo)")
    args = parser.parse_args()

    config = load_config()
    capture = CDPCapture(config, args)

    try:
        asyncio.run(capture.start())
    except KeyboardInterrupt:
        print()
        log("Shutting down...", C.YELLOW)
        if capture._pending:
            save_pending(capture._pending)
            log(f"Saved {len(capture._pending)} pending webhook(s) to disk", C.GREEN)
        if capture.mode == "discovery" and capture.discovery_log:
            capture._save_discovery_log()
            log(f"Discovery log saved: {len(capture.discovery_log)} frames", C.GREEN)
        log(
            f"Stats: captured={capture.stats['captured']} "
            f"sent={capture.stats['sent']} "
            f"errors={capture.stats['errors']}",
            C.CYAN,
        )


if __name__ == "__main__":
    main()
