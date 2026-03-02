# TradeEdge V3.0 Code Review Report

**File:** `tradeedge-ict.html` (~8,100 lines)
**Date:** March 2, 2026
**Reviewed by:** 3 parallel agents (Security, Logic, Performance)

---

## CRITICAL (5 findings — fix these first)

### L1: `np()` treats `netPnl===0` as absent (Line 1623)
```javascript
// BROKEN:
if(t.netPnl!=null && t.netPnl!==0) return t.netPnl;
return (t.pnl||0) - (t.fees||0);

// FIX:
if(t.netPnl != null) return t.netPnl;
return (t.pnl||0) - (t.fees||0);
```
Breakeven trades with `netPnl: 0` fall through to recalculation. Same issue at lines 1893 and 2081.

### L2: `gn()` makes zero commission indistinguishable from missing (Line 2999-3003, 3116)
```javascript
// BROKEN at line 3116:
const fees=f.comm||feeForSymbol(sym)*f.qty*2;
// When f.comm is 0 (broker charged nothing), 0||feeForSymbol() charges the default fee.

// FIX gn() to return null for missing:
function gn(row,...names){
  let v=gv(row,...names);if(v==='')return null;
  v=String(v).replace(/[$,\s]/g,'');
  if(v.startsWith('(')&&v.endsWith(')'))v='-'+v.slice(1,-1);
  const n=parseFloat(v);return isNaN(n)?null:n;
}
// FIX callers:
const fees = f.comm != null ? f.comm : feeForSymbol(sym)*f.qty*2;
```

### P1: Parser-blocking scripts delay first paint 2-4s (Lines 6-7)
```html
<!-- BROKEN: -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" onerror="..."></script>

<!-- FIX: add defer -->
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" onerror="..."></script>
```
Both pdf.js (~400KB) and three.js (~600KB) block rendering. On 15 Mbps hotspot = 2-4s blank screen. The pdfjsLib.workerSrc setup (line 10) needs to move into a deferred handler.

### P2: 450KB base64 textures parsed synchronously (Lines 4691-4700)
10 AI textures totaling ~406KB of base64 strings are inlined as JS variables. The parser must process all of them on every page load even if the user never visits the dashboard.
**Fix:** Move textures to separate `.webp` files and load via `fetch()` only when the 3D scene initializes. Or lazy-load the `_TEX_*` variables on first dashboard visit.

### P3: 3D render loop runs when dashboard not visible (Line 6470, 6518)
```javascript
// BROKEN: still renders when paused
if(_3d._paused){_3d.renderer.render(_3d.scene,_3d.camera);return;}

// FIX: stop the loop entirely when not on dashboard
if(_3d._paused){ cancelAnimationFrame(_3d.animId); _3d.animId=null; return; }
// Resume in go('dashboard'): if(!_3d.animId) _3d.animId=requestAnimationFrame(animate3D);
```

---

## HIGH (11 findings)

### L4: `pairFills` drops partial fill remainders (Lines 3137-3178)
When buy qty=3 and sell qty=1, `Math.min(3,1)=1` creates a 1-contract trade, then BOTH fills are shifted off the queue. The remaining 2 buy contracts are silently lost.
```javascript
// FIX: push remainder back
bCopy.shift(); sCopy.shift();
const mq = Math.min(b.qty, s.qty);
if(b.qty > mq) bCopy.unshift({...b, qty: b.qty - mq});
if(s.qty > mq) sCopy.unshift({...s, qty: s.qty - mq});
```

### L5: `startingBalance` of 0 treated as falsy (Line 1851)
```javascript
// BROKEN:
var currentBal=S.startingBalance?(S.startingBalance+(m.net||0)):0;
// FIX:
var currentBal=(S.startingBalance||0)+(m.net||0);
```

### L6: CSV vs PDF dedup keys differ
CSV dedup key: `date|time|symbol|side|entry|pnl` (line 3931)
PDF dedup check: `date+symbol` only (line 3510-3514)
Risk: re-importing CSVs with slightly different time formatting creates duplicates.
**Fix:** Use a consistent dedup key across both: `date|symbol|side|Math.round(netPnl*100)`

### L7: `_recomputeStartingBalance` uses different P&L formula than `calcMetrics` (Line 3442)
```javascript
// BROKEN (line 3442): treats netPnl=0 as falsy, falls through to gross pnl
var totalNetPnl=S.trades.reduce(function(sum,t){return sum+(t.netPnl||t.pnl||0);},0);

// FIX: use canonical function
function tradeNet(t) { return t.netPnl != null ? t.netPnl : (t.pnl||0) - (t.fees||0); }
var totalNetPnl=S.trades.reduce(function(sum,t){return sum+tradeNet(t);},0);
```
Replace ALL `t.netPnl||t.pnl||0` patterns throughout the file with `tradeNet(t)`.

### L8: `reconstructSLTP` mutates trades in-place (Lines 3239-3356)
If it throws partway through, some trades have SL/TP and others don't.
**Fix:** Build new trades array with `S.trades = S.trades.map(trade => { const updated = {...trade}; /* modify updated */ return updated; });`

### P4: `save()` + full dashboard redraw on every keystroke (Lines 1062-1126)
```html
<!-- BROKEN: -->
<input id="set-balance" oninput="S.startingBalance=parseFloat(this.value)||0;save();renderDash();updateSidebar();">

<!-- FIX: debounce 300ms -->
```
Typing "223.00" fires 6 full dashboard redraws. Same issue on search input (line 842).

### P5: `calcMetrics()` called redundantly (Lines 1764, 1839)
`renderDash()` calls `calcMetrics(S.trades)`, then `updateSidebar()` calls it again with same data.
**Fix:** Compute once, pass result to both functions.

### P6: Chips destroyed/rebuilt every dashboard visit (Line 1602)
`go('dashboard')` sets `_lastChipBalance = -1`, forcing full chip rebuild even when balance hasn't changed.
**Fix:** Remove `_lastChipBalance = -1` from `go('dashboard')`. The existing guard at line 7222 handles caching.

### P7: Chip geometry never disposed — GPU memory leak (Lines 7228-7229)
Materials are disposed but `c.geometry.dispose()` is never called.
**Fix:** Add `if(c.geometry) c.geometry.dispose();` in the cleanup loop.

### S1: CDN scripts loaded without Subresource Integrity (Lines 6-9)
No `integrity` attributes. unpkg uses `@4` version range (could resolve to compromised release).
**Fix:** Add `integrity="sha384-<hash>" crossorigin="anonymous"` to all CDN scripts. Pin unpkg to exact version.

### S2: No Content Security Policy
No CSP meta tag. Any XSS = full script execution.
**Fix:** Add `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://unpkg.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: blob:;">`

### S3: Stored XSS via `javascript:` protocol in chartUrl href (Lines 2218, 2530)
`escapeHtml()` doesn't block `javascript:` URLs.
```javascript
// FIX: add safeHref()
function safeHref(url) {
  if (!url) return '#';
  try { var u = new URL(url, location.href);
    if (u.protocol==='https:'||u.protocol==='http:'||u.protocol==='data:') return url;
  } catch(e) {}
  return '#';
}
```

---

## MEDIUM (13 findings)

### L10: Edge ratio shows 0 for perfect win streaks (Line 1691)
When `avgLoss===0`, returns 0 instead of capped max.
**Fix:** Return `99.9` when wins>0 and losses===0.

### L11: `pendingCancelled` not saved to localStorage (Line 1587)
SL/TP reconstruction data lost on reload.
**Fix:** Add `pendingCancelled:S.pendingCancelled||[]` to `save()`.

### L12: Calendar date parsed as UTC — off-by-one day (Line 2077)
```javascript
// BROKEN:
const d=new Date(t.date);
// FIX:
const d=new Date(t.date+'T12:00:00');
```

### L13: Can't "unset" starting balance to re-trigger auto-detection
`parseFloat(this.value)||0` always sets to 0, but `_recomputeStartingBalance` only sets if `implied > 0`.
**Fix:** Add a "Reset to auto-detect" button.

### L14: `_recomputeStartingBalance` rejects implied===0 or negative (Line 3444)
```javascript
// BROKEN:
if(implied>0){ S.startingBalance=implied; }
// FIX:
if(implied>=0){ S.startingBalance=implied; }
else { console.warn('[TradeEdge] Negative implied balance: $'+implied); S.startingBalance=0; }
```

### L15: Donut/DOW charts use `netPnl||pnl||0` — breakeven treated as gross P&L (Lines 1979, 2010)
Same falsy-zero bug. **Fix:** Use `tradeNet(t)` everywhere.

### P8: 4 always-running setInterval timers (Lines 4170, 7736, 7830, 7835)
Bell, killzone, news, session summary timers fire every 10-15s even on weekends.
**Fix:** Consolidate into one 30s timer. Disable on weekends.

### P9: Full trade table rebuild on every search keystroke (Line 842)
**Fix:** Debounce 250ms.

### P10: O(n²) dedup filter in load() (Lines 1568-1580)
```javascript
// FIX: build Set first
const csvKeys = new Set(S.trades.filter(t=>t.source&&!t.source.includes('AMP Statement')).map(t=>t.date+'|'+t.symbol));
S.trades = S.trades.filter(t => {
  if(!t.source || !t.source.includes('AMP Statement')) return true;
  return !csvKeys.has(t.date+'|'+t.symbol);
});
```

### P11: 14 `backdrop-filter: blur()` elements visible simultaneously
**Fix:** Remove blur from frequently visible elements (`.mc`, `.cc`, `.jcard`). Keep only on modal overlays.

### S4: Unescaped trade data in innerHTML (Lines 3398-3408)
Trade date, time, side, killzone, and CSV headers rendered without `escapeHtml()`.
**Fix:** Wrap all user-derived values in `escapeHtml()`.

### S5: JSON import merges arbitrary keys into state (Line 4036-4041)
**Fix:** Whitelist accepted keys:
```javascript
const ALLOWED=['trades','journal','feeRates','ampStatements','importLog','accountName','startingBalance','keyLevels','rules'];
```

### S6: localStorage loaded without schema validation (Line 1533)
**Fix:** Add `validateTrade()` filter after deserialization.

---

## LOW (10 findings)

| ID | Issue | Fix |
|----|-------|-----|
| L16 | `startingBalance\|\|0` in save() loses negative values | Use nullish coalescing or ternary |
| L17 | Cross-midnight trades excluded from hold time | Add 1440 mins when negative |
| L18 | `renderDash()` called during `load()` before DOM ready | Guard with `document.readyState` check |
| L19 | PDF import hardcodes all trades as "Long" | Infer direction from prices |
| P12 | Google Fonts render-blocking (14 variants) | Preload or reduce to 3 weights |
| P13 | 5 synchronous chart renders in `renderDash()` | Stagger with `requestAnimationFrame` |
| P14 | Chart textures redrawn 15x/sec | Only redraw when tick data changes |
| P15 | AudioContext created per sound effect | Reuse single persistent AudioContext |
| S7 | `target="_blank"` without `rel="noopener"` | Add `rel="noopener noreferrer"` |
| S8 | WebSocket URL / CDP port from untrusted state | Validate protocol and port range |

---

## Root Cause: The `||` Falsy-Zero Sweep

The #1 systemic issue across the entire codebase. JavaScript's `||` operator treats `0` as falsy, causing silent data corruption when legitimate zero values exist (breakeven trades, zero commission, zero starting balance).

**Affected bugs:** L1, L2, L5, L7, L15, L16

**One-pass fix:**
1. Create canonical `tradeNet(t)` function
2. Find-replace all `t.netPnl||t.pnl||0` → `tradeNet(t)`
3. Find-replace all `x||defaultValue` on numeric fields → `x!=null?x:defaultValue` or `x??defaultValue`
4. Find-replace all `parseFloat(x)||0` → `isNaN(parseFloat(x))?0:parseFloat(x)` (only where 0 is valid)

---

## Recommended Fix Order

1. **The `||` falsy-zero sweep** — L1, L2, L5, L7, L15, L16 (6 bugs, one pass)
2. **Partial fills** (L4) — money silently disappearing
3. **Performance trio** (P1, P2, P3) — defer scripts, externalize textures, pause animation
4. **Security hardening** (S1, S3, S4) — SRI hashes, safeHref(), escapeHtml()
5. **Save pendingCancelled** (L11) — SL/TP data preservation
6. **Calendar UTC fix** (L12) — one-liner

---

## What the App Does Well

- `escapeHtml()` function is correctly implemented with all 5 critical characters
- Used consistently in trade log table for symbol, exitReason, killzone, emotion, tags
- Journal text fields all escaped
- No `eval()`, `new Function()`, or dynamic script creation
- No hardcoded API keys or credentials
- Local offline app significantly limits remote attack surface
- CSS fallback for Three.js is well-implemented
- Dedup logic exists (just needs consistency)
- Balance auto-compute from AMP statements is a good design
