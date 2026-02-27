# TradeEdge ICT — Complete Project Continuation Brief
## For Claude Code development session

---

## FILES TO PROVIDE WITH THIS PROMPT
1. `tradeedge-ict.html` — Main app (4,827 lines, single-file vanilla JS app)
2. `chip-debug.html` — Latest 3D chip preview (V11 — single-cylinder-per-stack approach)
3. `app-logo.png` — Sacred geometry cross logo (1.1MB, circular, transparent BG)
4. `TRADEEDGE-PROJECT-PROMPT.md` — Original project spec (has CSV parsing details, tick values, SL/TP reconstruction logic)

---

## PROJECT OVERVIEW

**TradeEdge ICT** is a **personal trading journal and live account dashboard** for futures day-traders. It's a real-time performance tracker for a **live funded trading account on AMP Futures**, with trades executed through **TradingView**. The app imports trade data (CSV exports from TradingView + PDF statements from AMP), calculates P&L, tracks risk management (SL/TP), and provides analytics — all in a single offline HTML file.

Built specifically for **ICT methodology** (Inner Circle Trader / Michael Huddleston) traders. Created for **Ricardo Samitier** and the **Intra Circle Trading** group (4 creators).

**The core workflow:** Trader executes futures trades (MNQ, MES, NQ, ES) on TradingView connected to AMP Futures → exports filled/cancelled order CSVs + daily PDF statements → drops them into TradeEdge → app reconstructs complete trade history with SL/TP levels, calculates performance metrics, and displays everything in a professional dashboard with equity curves, killzone analysis, and a poker-chip balance visualization.

**Tech:** Single HTML file (~4,800 lines), vanilla JavaScript, localStorage persistence, no cloud/server. Runs entirely in browser.

**Distribution:** The app will be hosted on **GitHub Pages** and shared with the broader **ICT trading community** — not just the 4 Intra Circle Trading creators. It needs to look professional, polished, and production-ready since it will be public-facing. The GitHub repo will also serve as the backend for the signature collection feature (community members sign a dedication to ICT/Michael Huddleston).

---

## WHAT HAS BEEN COMPLETED

### Core App Features (ALL WORKING)
- **TradingView CSV Import** with SL/TP reconstruction from filled + cancelled order CSVs
- **AMP PDF Statement Parser** extracting fees, balances, and P&L from daily PDFs
- **Smart File Routing** — drop multiple files, auto-detected by filename pattern
- **Trade Log** with sortable columns, expandable detail rows showing SL/TP history
- **Dashboard** with 26 metrics: P&L cards, equity curve, win/loss donut, killzone chart, day-of-week chart
- **Trading Calendar** with daily P&L heatmap
- **Journal** with pre/post session entries
- **Weekly Reports** auto-grouped
- **Import History** tracking
- **Full JSON export/import** for data backup
- **Settings Page** with manual starting balance override
- **Guided Tour** (intro.js style) on first launch

### Balance Architecture (CRITICAL — DO NOT CHANGE)
```
Account Balance = Starting Balance + Net P&L (sum of all trade netPnl)
```
- Starting Balance can be set manually in Settings, or extracted from AMP PDF
- Balance bar shows current balance with color coding (green/yellow/red)
- This was a major bug fix — previously was double-counting

### UI/UX Polish (ALL DONE)
- 18 micro-interactions (hover effects, transitions, loading states)
- Mobile responsive CSS with hamburger menu
- Logo integration: sidebar icon, dashboard watermark, splash screen
- Dark theme throughout with #00f0c0 accent color
- CSS/SVG poker chip visualization as fallback (top-down flat chips, working)

### Self-Destruct "Nuke" Sequence (WORKING)
When balance hits $0:
- 3-second countdown with pulsing red screen
- "ACCOUNT BLOWN" overlay
- Skull emoji replaces chip tray
- Sound effects

### Data Reset (WORKING)
Settings page "Clear All Data" button:
- Resets localStorage
- Clears all trades, journal entries, settings
- Returns to fresh state with tour

---

## CURRENT ACTIVE TASK: 3D POKER CHIP VISUALIZATION

### What We Want
A 3D WebGL (Three.js r128) visualization that shows the account balance as **stacked casino chips on a green felt table**. This goes in the dashboard's chip-tray area.

### Requirements
- Chips stack vertically like real casino chips
- Denomination breakdown: greedy from highest to lowest
- Max 10 chips per stack, overflow creates new stacks
- Chips drop in with bounce animation + cascade sound
- Click on stacks to fidget (shuffle/flip/spread/bounce animations)
- Mouse orbit: slight parallax camera movement following cursor
- Chips should **re-drop on every dashboard visit** with sound
- Web Audio API sound synthesis (ceramic clinks, settle thud)

### Standard US Casino Chip Colors (RESEARCHED & CONFIRMED)
```
$1    = White   (#E8E8E8)
$5    = Red     (#CC0000)
$10   = Blue    (#1565C0)
$25   = Green   (#006B3F)
$50   = Blue    (#0055AA)
$100  = Black   (#1A1A1A) with gold text (#D4A017)
$250  = Pink    (#D4688B)
$500  = Purple  (#6B2D8B)
$1000 = Orange  (#CF6500)
$5000 = Gray    (not yet needed)
```

### Edge Pattern (THE CLASSIC LOOK)
Each chip has 8 stripe sections alternating with 8 body-color sections around the edge.
Each stripe section = spot_color_1 | WHITE | spot_color_2 (three sub-stripes).
This creates the trademark alternating white-line edge pattern visible on all real casino chips.
The top face shows matching colored wedges around the outer ring.

### CRITICAL BUG — Z-FIGHTING / RENDERING ARTIFACTS
**This is the #1 blocker.** We went through 11 iterations trying to fix rendering artifacts on the user's machine. The user recently enabled hardware acceleration in Chrome — their GPU may have low depth buffer precision.

**What we tried (V1-V11):**
1. V1-V4: Standard closed cylinders with gaps — z-fighting between stacked chips
2. V5: Separate meshes (open cylinder + top disc, no bottom) — black ring visible through hollow bottom during drop
3. V6: Closed cylinder with polygonOffset on bottom face — still fighting
4. V7: Three separate meshes with inset bottom disc — still artifacts + shadow issues
5. V8: Back to closed cylinder, tight near/far camera, 0.01 gap — still mixing
6. V9: Open cylinder + top disc, DoubleSide sides, no shadows received — still mixing
7. V10: Closed cylinder, same texture on top AND bottom (same-color z-fight = invisible), zero gap — still mixing colors
8. V10+: Disabled shadows entirely — NO DIFFERENCE (proves it's not shadow maps)
9. V11 (CURRENT): Each stack = ONE tall cylinder with painted side texture showing chip layers — UNTESTED on user's machine but should be artifact-free since zero overlapping geometry

**Screen recording analysis:** The "distortion" visible in the recording was identified as:
- Dark ring outlines from seeing through hollow chip bottoms (in open-cylinder versions)
- Horizontal dark lines between stacked chips from gaps/interior visibility
- Shadow map artifacts from chips casting shadows onto each other

**Recommended approach going forward:**
- OPTION A: The V11 single-cylinder-per-stack approach eliminates ALL geometry overlap. Test this first.
- OPTION B: If 3D continues to have issues on this GPU, fall back to **CSS 3D transforms** (transform: rotateX with perspective) or **2D canvas** rendering which doesn't use WebGL at all.
- OPTION C: The original CSS/SVG flat chip visualization (top-down view) already works perfectly — could use that with a subtle CSS perspective transform for pseudo-3D feel.

### Three.js Scene Configuration (for reference)
```javascript
Camera: PerspectiveCamera(32°, aspect, 2, 15)
Position: (0, 2.6, 5.5) looking at (0, 0.2, 0)
Renderer: WebGLRenderer with antialias, PCFSoftShadowMap, ACESFilmicToneMapping
Lighting: Warm key spotlight + cool fill + subtle rim + ambient + hemisphere
Table: Canvas-generated green felt with noise grain
Three.js CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

---

## FEATURES NOT YET IMPLEMENTED (USER REQUESTED)

### 1. Silver Bullet Animation
A "silver bullet" that flies across the start/splash screen. ICT concept — the Silver Bullet is a specific trading setup.

### 2. ICT Dedication Section
A section in the app dedicated to ICT (Michael Huddleston) with:
- Mouse-drawn signature pad (HTML5 canvas)
- User can sign their name as a "dedication"
- One-time prompt on first app launch

### 3. Signature Collection via GitHub
- Collect signatures from all users
- Store via GitHub (shared storage / GitHub Pages / raw file)
- Display gallery of all signatures from the Intra Circle Trading community

### 4. Chips Re-Drop on Dashboard Visit
Every time the user navigates to the dashboard tab, the chips should re-render with the drop animation and cascade sound. Currently the chip visualization is a standalone debug page — needs to be integrated into the main app.

---

## BUGS FIXED (DO NOT REINTRODUCE)
1. **Fills not sorted before pairing** → Wrong trade directions. Fix: sort by Status Time before pairing
2. **Symbol prefix not stripped** → `F.US.MNQH26` → strip `F.US.` prefix
3. **P&L showing as 0** → Wrong column names. Use `gv()` helper with multiple variants
4. **Gross vs Net P&L confusion** → Dashboard shows both clearly
5. **Import duplicates** → Dedup by hash of `date|time|symbol|side|entry|pnl`
6. **SL dollar risk formula inverted** → For shorts: `(slPrice - entry)` not `(entry - slPrice)`
7. **Tour blocking interaction** → Tour was preventing clicks on underlying elements
8. **Clear All not resetting everything** → Now properly clears all localStorage keys
9. **Balance double-counting** → Fixed to: Starting Balance + sum(netPnl)
10. **Name extraction from AMP PDF** → Regex patterns for various PDF formats

---

## TECHNICAL REFERENCE

### Tick Values & Fees (AMP Futures)
```
MNQ: tickValue = $2.00/point, fees ~$1.09/side/contract
MES: tickValue = $5.00/point
NQ:  tickValue = $20.00/point
ES:  tickValue = $50.00/point
```

### SL/TP Reconstruction (Already Implemented — see TRADEEDGE-PROJECT-PROMPT.md for full details)
- Cancelled orders CSV provides SL/TP prices
- Matching by symbol + date + time window (1 hour of entry)
- Tracks adjustment history with timestamps
- Exit reason detection: "SL Hit", "TP Hit", "Manual Exit"

### ICT Killzones (Auto-detected from trade time, Eastern Time)
- London: 2:00-5:00 AM ET
- NY AM: 8:30-11:00 AM ET
- NY Lunch: 11:00 AM-1:00 PM ET
- NY PM: 1:00-4:00 PM ET
- Asia: 7:00-10:00 PM ET

---

## LOGO DESIGN (FINALIZED)
Sacred geometry cross: 4 ICT logos arranged N/S/E/W, circular crop, transparent background.
File: `app-logo.png` (already base64 embedded in main app for sidebar + watermark + splash)

---

## USER'S ENVIRONMENT
- Chrome browser on desktop
- Hardware acceleration was recently enabled (was previously disabled)
- GPU may have limited depth buffer precision
- WebGL 1 and WebGL 2 confirmed working
- Located in Miami, FL

---

## PRIORITY ORDER
1. **Fix 3D chip rendering** — get clean artifact-free stacked chips (try V11 single-cylinder approach first, fall back to CSS 3D or 2D canvas if needed)
2. **Integrate chips into main app** — replace/augment the existing CSS chip-tray in the dashboard
3. **Silver bullet animation** on splash screen
4. **ICT dedication + signature pad**
5. **Signature collection** via GitHub
