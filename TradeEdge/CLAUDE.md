# TradeEdge ICT — Agent Context

## Project
Personal trading journal and live account dashboard for AMP Futures day traders.
Single-file vanilla JS app. No build system. Edit directly.

## Main File
`tradeedge-ict.html` (~4,800 lines) — in this folder

Open this file to make changes. Refresh in browser to test.

## Current State (as of Feb 27, 2026)
- 6 trades loaded (MNQ, Feb 16/19/20/24 2026)
- Starting balance: $223.00 | Current NLV: $97.20 | Net P&L: -$125.80
- Balance auto-computes via `_recomputeStartingBalance()` on every page load
- Duplicate PDF trade dedup runs on load (removes PDF synthetic trades when CSV covers same date+symbol)

## Architecture
- **State:** `S` object — all data lives here, persisted via `localStorage`
- **Save/Load:** `save()` / `load()` — called on every change and page load
- **Views:** `go(v)` navigates between dashboard / trades / journal / analytics / import / settings
- **Import flow:** `smartImport()` → `classifyFile()` → `routeFiles()` → CSV or PDF handlers
- **Balance formula:** `startingBalance = latestNLV - totalNetPnL`

## Key Functions
| Function | Purpose |
|----------|---------|
| `_recomputeStartingBalance()` | Computes starting balance from AMP statements + trades |
| `pairFills(rows)` | Pairs buy/sell fills into round-trip trades |
| `reconstructSLTP()` | Rebuilds SL/TP from cancelled orders CSV |
| `calcMetrics(trades)` | All dashboard stats (win rate, P&L, R:R, etc.) |
| `renderDash()` | Redraws entire dashboard |
| `renderChips(balance)` | 3D poker chip visualization (Three.js or CSS fallback) |
| `parseAMPStatement(text)` | Parses AMP Futures PDF statement |
| `importPDFs(e)` | Handles PDF file imports |
| `confirmImport()` | Confirms pending CSV trade import |

## ICT Concepts Used
- **Killzones:** London (2-5am ET), NY AM (7-10am ET), NY PM (1:30-4pm ET)
- **Order blocks, FVG, liquidity sweeps** — used in trade tagging
- **Silver bullet:** 3-4am / 10-11am / 3-4pm ET windows
- **Bias:** bullish / bearish / neutral per session

## AMP Futures Data Format
- **Filled CSV:** Symbol, Side, Type, Qty, Fill Qty, Avg Fill Price, Placing/Status Time
- **Cancelled CSV:** Same format — used to reconstruct SL/TP from bracket orders
- **PDF statements:** "Last 5 values" section shows NLV history; P&S section shows avg prices

## Tick Values
| Symbol | Tick Size | Tick Value |
|--------|-----------|------------|
| MNQ | 0.25 | $0.50 |
| NQ | 0.25 | $5.00 |
| ES | 0.25 | $12.50 |
| MES | 0.25 | $1.25 |

## Known Issues / Watch For
- `parseFloat(x) || null` pattern is WRONG for zero prices — use `isNaN()` check instead (already fixed in saveTrade)
- PDF trades are "Long" synthetic records — CSV trades are actual side — never mix them
- `_recomputeStartingBalance()` must be called after both CSV and PDF imports, and on page load

## Support Files
- `chip-debug.html` — standalone 3D chip prototype (Three.js r128)
- `app-logo.png` — sacred geometry logo (embedded as base64 in app)
- `data/amp-order-history-filled-*.csv` — sample filled orders
- `data/amp-order-history-cancelled-*.csv` — sample cancelled/bracket orders
- `data/Custom reports_ clients*.PDF` — AMP statement PDFs
