# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SlickRick's Agentic Workspace

## Who I Am
- **Name:** SlickRick (Ricardo)
- **Location:** Miami, FL — courier within Miami-Dade County
- **Setup:** MacBook Pro 13" | Visible Pro (Verizon network, 15 Mbps hotspot)
- **Trading:** AMP Futures account, day trading MNQ (Micro Nasdaq futures)
- **Strategy:** ICT (Inner Circle Trading) concepts
- **Claude Plan:** Max ($100/month) — allocate ~20-30% to video analysis tasks

## Projects

| Project | Folder | Status | Description |
|---------|--------|--------|-------------|
| TradeEdge ICT | `TradeEdge/` | Active | Personal trading journal + dashboard app |
| ICT Trading Bot | `TradingBot/` | Future | Automated bot using ICT strategies |
| ICT Research | `Research/` | Future | Extract ICT strategies from YouTube videos |

## How to Use This Workspace
Each project has its own folder with a `CLAUDE.md`. Launch Claude from inside that folder to get full project context automatically:

```bash
# TradeEdge work
cd "/Users/slickrick/Agentic Workflows/TradeEdge"
claude

# Trading bot work
cd "/Users/slickrick/Agentic Workflows/TradingBot"
claude

# ICT video research
cd "/Users/slickrick/Agentic Workflows/Research"
claude
```

Then use `/rc` to connect from your phone.

## Mobile Coding Notes
- Local processes run without internet — only API calls need connection
- If connection drops mid-API call: add retry logic, don't let it crash
- Use `/rc` in any claude session for phone access
- Keep Terminal open on Mac while working from phone

## AMP Futures Context
- Symbol: MNQ (Micro Nasdaq) — tick value $0.50/point, 0.25 tick size
- Starting balance: $223.00 (confirmed from Feb 19 AMP statement)
- Current NLV: ~$97.20 (as of Feb 24, 2026)
- Net P&L: -$125.80 across 6 trades (Feb 16, 19, 20, 24)
- Fees: ~$1.80/trade (AMP commission structure)

## Agent Strategy Preference
**Goal: Claude Code Agent Teams — NOT parallel independent agents**

| | Parallel Agents | Agent Teams (preferred) |
|---|---|---|
| **What it is** | Multiple Claude terminals running separate tasks independently | One orchestrator Claude assigns tasks to specialized sub-agents |
| **Communication** | No communication between agents | Orchestrator reads sub-agent output and coordinates next steps |
| **Best for** | Unrelated tasks that don't need each other | Complex projects where agents depend on each other's results |
| **Example** | 3 Claudes each fixing a different bug alone | 1 lead Claude delegates: researcher → builder → reviewer in sequence |
| **Like** | 3 freelancers working in separate rooms | A team with a project manager |

Reference: [Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
Reference: [IndyDevDan multi-agent observability](https://github.com/disler/claude-code-hooks-multi-agent-observability)

## Data Flow Between Projects
```
Research/ (ICT video analysis)
    ↓ structured strategy notes
TradingBot/ (automated trading)
    ↓ executes trades via AMP Futures
TradeEdge/ (journal + dashboard)
    ↑ imports trades via CSV/PDF or TradingView webhooks
```
- Research outputs feed TradingBot strategy logic
- TradingBot and manual trades both flow into TradeEdge for journaling
- See `TradeEdge/WEBHOOK-PLAN.md` for the TradingView → TradeEdge live pipeline

## Environment
- **Node.js:** installed globally (required for Claude Code CLI)
- **Python 3:** available as `python3` (required for webhook server, whisper, future bot)
- **TradeEdge:** Main monolith is `tradeedge-ict.html` (~8,100 lines). A modular split (`index.html` + `js/` + `css/`) also exists but the monolith is the active dev file. Edit and refresh in browser.
- **ngrok:** for TradingView webhook tunneling (install via `brew install ngrok`)

## Installed Tooling (`.claude/` directory)
- **14 agents** — planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, e2e-runner, refactor-cleaner, doc-updater, go-reviewer, go-build-resolver, python-reviewer, database-reviewer, chief-of-staff
- **33 commands** — including /multi-plan, /multi-execute, /orchestrate, /tdd, /code-review
- **50 skills** — backend-patterns, frontend-patterns, security-review, python-patterns, tdd-workflow, etc.
- **Global rules** — `~/.claude/rules/` (common, typescript, python)
- Source: [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

## API Budget Guidelines
- Total: $100/month (Max plan)
- TradeEdge development: ~50-60%
- ICT video analysis: ~20-30% ($20-30/month)
- Trading bot development: remaining ~10-20%
- Video analysis throughput: ~10-15 hours of video per month at budget
