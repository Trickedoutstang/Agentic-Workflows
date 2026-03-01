# TradeEdge ICT — Agent Context

## Project
Personal trading journal and live account dashboard for AMP Futures day traders.
Single-file vanilla JS app. No build system. Edit directly.

## Main File
`tradeedge-ict.html` (~7,800 lines) — in this folder

Open this file to make changes. Refresh in browser to test.

## Current State (as of Feb 28, 2026)
- **V3.0 Star Citizen Cockpit Revamp** — complete visual overhaul
- 6 trades loaded (MNQ, Feb 16/19/20/24 2026)
- Starting balance: $223.00 | Current NLV: $97.20 | Net P&L: -$125.80
- Balance auto-computes via `_recomputeStartingBalance()` on every page load
- Duplicate PDF trade dedup runs on load (removes PDF synthetic trades when CSV covers same date+symbol)

## V3.0 Changes (Star Citizen Cockpit Revamp)
- **Lighting**: Darker ambient (0.3), stronger console uplight (0.8 cyan from below), deeper blue rims (0.5), under-console uplights, canopy rim spotlight
- **Cockpit Frame**: Vertical pillars, top canopy bar, diagonal braces with blue LED accent strips
- **Holographic Monitors**: No physical bezels, transparent emissive screens (0.85 opacity), cyan edge glow strips, light cone projections from console
- **Holographic Chips**: Thin energy discs (CHIP_H=0.02, CHIP_MAX_STACK=15), luminous denomination colors, transparent materials (0.6 opacity), circuit-trace textures, concentric glow rings
- **Audio**: Ceramic sounds → sine chirps + bass hum pulses + digital glitch
- **Interactive Feedback**: All objects get hover glow + click scale bounce + holo chirp. Viewscreen + moon now clickable
- **Ambient Particles**: 200 cyan dots (80 mobile) drifting upward with sine wobble, opacity pulsing
- **Viewscreen**: Edge glow strips instead of physical frame, transparent emissive screen
- **Texture Prompts**: All 10 rewritten for Star Citizen aesthetic (cockpit console, asteroid fields, quantum travel, holographic displays)

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

## AI Textures (V3.0)
- Generated via **Google Gemini** (Nano Banana / `gemini-2.0-flash-exp`)
- 10 textures: console, floor, hull wall, ceiling, 3 viewscreen modes, PADD, datapad, skybox
- Prompts defined in `generate-textures.js` TEXTURES array
- To regenerate:
  ```bash
  GEMINI_API_KEY=xxx node generate-textures.js && node embed-textures.js
  ```
- Then paste `textures/embedded-textures.js` content into the `_TEX_*` variables in HTML (~line 4707)
- **Fallback:** All procedural canvas textures still work if AI textures are empty strings
- **API key:** Free from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Size budget:** ~500-800KB total base64 (WebP quality 70-85)

## Support Files
- `chip-debug.html` — standalone 3D chip prototype (Three.js r128)
- `app-logo.png` — sacred geometry logo (embedded as base64 in app)
- `generate-textures.js` — Gemini API texture generation script (V2.4)
- `embed-textures.js` — PNG→WebP→base64 embedding script (V2.4)
- `data/amp-order-history-filled-*.csv` — sample filled orders
- `data/amp-order-history-cancelled-*.csv` — sample cancelled/bracket orders
- `data/Custom reports_ clients*.PDF` — AMP statement PDFs
