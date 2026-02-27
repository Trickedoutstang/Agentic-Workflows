# ICT Trading Bot — Agent Context

## Status
**Future project — not yet started.**
Architecture is planned. Begin here when ready to build.

## Goal
Build an automated trading bot that:
1. Pulls live market data from TradingView
2. Applies ICT trading strategies (learned from Research/ project)
3. Executes trades through AMP Futures

## Planned Architecture
```
TradingView WebSocket
        ↓
Python script (local on Mac)
        ↓
Claude API — strategy decision engine
        ↓
AMP Futures API — order execution
```

## Tech Stack
- **Language:** Python
- **TradingView data:** `tvdatafeed` or `tradingview-api` (reverse-engineered WS)
- **AMP Futures:** AMP REST/WebSocket API (need to get API credentials from AMP)
- **Claude:** Anthropic Python SDK — streaming mode for real-time analysis
- **Retry logic:** Required — mobile hotspot can drop; never let a dropped connection crash the bot

## ICT Strategy Source
Strategy knowledge comes from `Research/` folder — see ICT video analysis notes there.
Start with 2022 ICT mentorship series concepts before adding more.

## Key Concepts to Implement
- Market structure (HH/HL/LH/LL)
- Order blocks (OB) — supply and demand zones
- Fair Value Gaps (FVG)
- Liquidity sweeps (BSL/SSL)
- Killzone timing: London (2-5am ET), NY AM (7-10am ET), NY PM (1:30-4pm ET)
- Silver bullet windows: 3-4am, 10-11am, 3-4pm ET
- Bias determination before entry

## AMP Futures Details
- Account: SlickRick's AMP account
- Instrument: Start with MNQ (Micro Nasdaq) — lowest risk for testing
- Tick size: 0.25 | Tick value: $0.50/point
- Risk per trade: Define max risk before building execution logic

## Mobile/Connection Handling
- Bot runs locally on MacBook — continues running without internet
- API calls (TradingView WS, Claude API, AMP API) need try/except + retry
- Log all failures to file — review when reconnected
- Never auto-execute a trade without confirmation during testing phase

## Development Phases
1. **Phase 1:** TradingView data feed working locally (no trading yet)
2. **Phase 2:** Claude analyzes live data and outputs trade signals (paper trading)
3. **Phase 3:** Connect AMP Futures API (manual confirmation required)
4. **Phase 4:** Full automation with risk controls

## Budget Note
Claude API costs for live bot analysis: monitor carefully.
Use streaming + caching where possible to minimize token usage.
Bot analysis budget separate from Research/ video analysis budget.
