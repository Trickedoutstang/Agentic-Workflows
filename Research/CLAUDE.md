# ICT Research — Agent Context

## Status
**Future project — not yet started.**
Begin here when ready to analyze ICT YouTube content.

## Goal
Extract ICT (Inner Circle Trading) trading strategies from YouTube videos.
Output structured strategy notes to feed into the TradingBot project.

## Source Material
- **Channel:** ICT (Michael J. Huddleston) — YouTube
- **Start with:** 2022 ICT Mentorship Series (highest priority, core concepts)
- **Then:** 2023 Mentorship Series
- **Later:** Older content as needed

## Budget
- ~$20-30/month (20-30% of $100 Max plan)
- ~10-15 hours of video analysis per month at this budget
- Process in batches — don't try to do everything at once

## Workflow
1. Download ICT YouTube videos (use `yt-dlp` CLI tool)
2. Extract frames at key intervals (every 30s or on scene change)
3. Transcribe audio (use `whisper` locally — free, runs on Mac)
4. Feed transcript + frames to Claude for strategy extraction
5. Save structured output as markdown notes in this folder

## Tools Needed
```bash
# Install yt-dlp for downloading YouTube videos
brew install yt-dlp

# Install whisper for local transcription (free)
pip install openai-whisper

# Download a video
yt-dlp "https://youtube.com/watch?v=..." -o "videos/%(title)s.%(ext)s"

# Transcribe
whisper videos/video.mp4 --output_format txt
```

## Claude Analysis Instructions
When analyzing a video, ask Claude to extract:
- **Concept name** (e.g. "Order Block", "FVG", "Liquidity Sweep")
- **Definition** — what it is
- **Identification rules** — how to spot it on a chart
- **Entry criteria** — when to trade it
- **Stop loss placement**
- **Target levels**
- **Timeframe context** — HTF bias vs LTF entry
- **Killzone relevance** — which sessions this applies to

## Output Format
Save each concept as a markdown file:
```
Research/
├── concepts/
│   ├── order-blocks.md
│   ├── fair-value-gaps.md
│   ├── liquidity-sweeps.md
│   ├── market-structure.md
│   └── ...
├── sessions/
│   ├── 2022-mentorship-notes.md
│   └── ...
└── CLAUDE.md (this file)
```

## Key ICT Concepts to Find
- Order Blocks (OB) — bullish and bearish
- Fair Value Gaps (FVG) / Imbalances
- Liquidity (BSL/SSL — buyside/sellside)
- Market Structure Shift (MSS) / Break of Structure (BOS)
- Premium / Discount arrays
- Optimal Trade Entry (OTE) — 61.8-79% Fibonacci
- Power of 3 (PO3) — accumulation, manipulation, distribution
- Killzone timing and bias
- Silver Bullet strategy (10-11am ET)
- NWOG / NDOG — New Week/Day Opening Gaps

## Notes
- Claude has vision — it can read TradingView charts in video frames
- Focus on what ICT draws on the chart, not just what he says
- Cross-reference concepts across multiple videos before finalizing notes
- Feed finalized concept notes to TradingBot/ when ready
