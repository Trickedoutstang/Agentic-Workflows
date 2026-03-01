// TradeEdge — Help System

function previewImg(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    document.getElementById('img-preview').src=ev.target.result;
    document.getElementById('img-preview-link').href=ev.target.result;
    document.getElementById('img-preview-wrap').style.display='block';
  };
  r.readAsDataURL(file);
}
function previewJImg(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    document.getElementById('j-img-preview').src=ev.target.result;
    document.getElementById('j-img-preview-link').href=ev.target.result;
    document.getElementById('j-img-preview-wrap').style.display='block';
  };
  r.readAsDataURL(file);
}

// ══════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){var el=document.getElementById(id);if(el){el.classList.remove('open');el.style.display='none';}}
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('open');o.style.display='none';}});
});

// ══════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════
function toast(msg,type=''){
  const el=document.getElementById('toast');
  el.textContent=msg;el.className='toast '+(type||'');
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
renderTagSuggestions();
renderDash();
updateSidebar();
// Deferred 3D chip init — ensure layout is settled after splash
setTimeout(function(){
  _lastChipBalance=-1;updateSidebar();
  // Demo mode: if no trades and no starting balance, show demo chips ($97.20 = real account NLV)
  // Change 1: Robust retry polling instead of single setTimeout
  if((!S.trades||!S.trades.length)&&!S.startingBalance){
    var _demoRetries=0,_demoMaxRetries=10;
    var _demoInterval=setInterval(function(){
      _demoRetries++;
      if(typeof _3d!=='undefined'&&_3d.inited&&_3d.allChips.length===0){
        clearInterval(_demoInterval);
        _userHasInteracted=true;
        renderChips(97.20);
        var countEl=document.getElementById('chip-tray-count');
        if(countEl)countEl.textContent='DEMO · $97.20';
        console.log('[TradeEdge] Demo mode — showing $97.20 chips (retry '+_demoRetries+')');
      }else if(_demoRetries>=_demoMaxRetries){
        clearInterval(_demoInterval);
        console.warn('[TradeEdge] Demo mode: 3D init failed after '+_demoMaxRetries+' retries — CSS fallback');
        _userHasInteracted=true;
        _showCSSFallback(97.20);
        var countEl=document.getElementById('chip-tray-count');
        if(countEl)countEl.textContent='DEMO · $97.20';
      }
    },500);
  }
},2800);

// Change 17: Fetch ForexFactory economic calendar on load
try{_fetchEconomicCalendar();}catch(e){console.warn('[TradeEdge] Econ calendar init error:',e);}
// Change 19: Start news alert checker (every 60 seconds)
setInterval(function(){try{_checkNewsAlerts();}catch(e){}},60000);
try{_checkNewsAlerts();}catch(e){} // Check immediately on load

// Auto open pre-session between 7:30-9:30am ET on weekdays
(function(){
  const now=new Date();
  const et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
  const h=et.getHours(),m=et.getMinutes(),dow=et.getDay();
  const isWeekday=dow>=1&&dow<=5;
  const isPreSession=(h===7&&m>=30)||(h===8)||(h===9&&m<30);
  if(isWeekday&&isPreSession&&S.journal.findIndex(j=>j.date===et.toISOString().split('T')[0])<0){
    setTimeout(openPreSession,1200);
  }
})();

// ══════════════════════════════════════════════════════════
// HELP & TUTORIAL
// ══════════════════════════════════════════════════════════

function renderHelp() {
  const el = document.getElementById('view-help');
  el.innerHTML = `
    <div class="help-tabs">
      <div class="htab on" onclick="showHelpTab('getting-started',this)">🚀 Getting Started</div>
      <div class="htab" onclick="showHelpTab('tradingview-export',this)">📊 TV Export Guide</div>
      <div class="htab" onclick="showHelpTab('amp-pdf',this)">📄 AMP Statement</div>
      <div class="htab" onclick="showHelpTab('metrics',this)">📈 Metrics Explained</div>
      <div class="htab" onclick="showHelpTab('ict-glossary',this)">⭐ ICT Glossary</div>
      <div class="htab" onclick="showHelpTab('killzones',this)">🕐 Killzones</div>
      <div class="htab" onclick="showHelpTab('session',this)">🎯 Session Companion</div>
      <div class="htab" onclick="showHelpTab('shortcuts',this)">⌨️ Shortcuts</div>
    </div>

    <!-- GETTING STARTED -->
    <div class="help-section on" id="hs-getting-started">
      <div class="hcard">
        <div class="hcard-title">Welcome to TradeEdge ICT</div>
        <p>TradeEdge is your personal trading journal built specifically for <strong>ICT / Smart Money Concepts</strong> traders using <strong>AMP Futures + TradingView</strong> on Mac. Everything stays on your computer — no accounts, no subscriptions, no cloud.</p>
        <div class="tip-box"><strong>💡 First time here?</strong> Click "Start Tour" below for an interactive walkthrough of the entire app, or follow the steps below to get set up in under 5 minutes.</div>
        <button class="btn btn-accent" onclick="startTour()" style="margin-bottom:18px;margin-top:4px">▶ Start Interactive Tour</button>
      </div>
      <div class="hcard">
        <div class="hcard-title">5-Minute Setup Checklist</div>
        <div class="hstep">
          <div class="hstep-n">1</div>
          <div class="hstep-body">
            <div class="hstep-title">Set your fee rates</div>
            <div class="hstep-desc">Go to <strong>Settings</strong> → enter your AMP fee per contract per side. For MNQ: <strong>$0.90/side</strong> (based on your statement: $0.70 exchange + $0.04 NFA + $0.26 clearing + $0.20 CQG + $0.60 commission ÷ 2 sides). The app will auto-calculate fees on every trade.</div>
          </div>
        </div>
        <div class="hstep">
          <div class="hstep-n">2</div>
          <div class="hstep-body">
            <div class="hstep-title">Export your TradingView History CSV</div>
            <div class="hstep-desc">In TradingView → Trading Panel at bottom → click <strong>⋯ menu</strong> → <strong>Export data…</strong> → export the History tab. Then go to <strong>Import Data</strong> and drop the file in.</div>
          </div>
        </div>
        <div class="hstep">
          <div class="hstep-n">3</div>
          <div class="hstep-body">
            <div class="hstep-title">Export your Cancelled orders CSV</div>
            <div class="hstep-desc">Same process — export the <strong>Cancelled tab</strong> from TradingView. This lets the app estimate your stop loss and take profit levels for each trade.</div>
          </div>
        </div>
        <div class="hstep">
          <div class="hstep-n">4</div>
          <div class="hstep-body">
            <div class="hstep-title">Upload your AMP daily PDF</div>
            <div class="hstep-desc">AMP emails you a daily statement PDF. Upload it in <strong>Import Data → AMP Statement</strong>. The app extracts your exact fee breakdown automatically.</div>
          </div>
        </div>
        <div class="hstep">
          <div class="hstep-n">5</div>
          <div class="hstep-body">
            <div class="hstep-title">Click "Start Session" each morning</div>
            <div class="hstep-desc">Every trading morning, hit the <strong>Start Session</strong> button in the top bar. It will prompt you for sleep, energy, coffee, HTF bias, and your plan for the day — before a single trade is placed.</div>
          </div>
        </div>
        <div class="hstep">
          <div class="hstep-n">6</div>
          <div class="hstep-body">
            <div class="hstep-title">Backup weekly</div>
            <div class="hstep-desc">Go to <strong>Settings → Export Backup (JSON)</strong> once a week. Save it to iCloud Drive. This is the only way to protect your data if you clear your browser cache.</div>
          </div>
        </div>
        <div class="warn-box"><strong>⚠️ Important:</strong> Your data lives in this browser only. Never clear Safari/Chrome browser data without exporting a backup first. See the Settings page for backup options.</div>
      </div>
    </div>

    <!-- TRADINGVIEW EXPORT -->
    <div class="help-section" id="hs-tradingview-export">
      <div class="hcard">
        <div class="hcard-title">How to Export from TradingView + AMP</div>
        <p>TradingView lets you export three useful data sets from your AMP broker connection. Do this <strong>daily or at minimum weekly</strong> — the app never overwrites existing data, it only adds new trades.</p>
        <div class="warn-box"><strong>⚠️ Limitation:</strong> TradingView's broker export only covers the last 7 days of history. Export regularly so you don't lose data.</div>
      </div>
      <div class="hcard">
        <div class="hcard-title">Step-by-Step: History CSV (Filled Orders)</div>
        <div class="hstep">
          <div class="hstep-n">1</div>
          <div class="hstep-body"><div class="hstep-title">Open TradingView in your browser</div><div class="hstep-desc">Make sure you're logged in and connected to AMP Futures as your broker.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">2</div>
          <div class="hstep-body"><div class="hstep-title">Open the Trading Panel</div><div class="hstep-desc">At the bottom of TradingView, click on the <strong>Trading Panel tab</strong>. You should see your AMP account, open positions, and order tabs.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">3</div>
          <div class="hstep-body"><div class="hstep-title">Click the History tab</div><div class="hstep-desc">In the Trading Panel, click the <strong>History</strong> tab — this shows all your filled orders.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">4</div>
          <div class="hstep-body"><div class="hstep-title">Export the data</div><div class="hstep-desc">Click the <strong>⋯ (three dots) menu</strong> in the top right of the panel → click <strong>"Export data…"</strong> → save the CSV file to your Downloads folder.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">5</div>
          <div class="hstep-body"><div class="hstep-title">Import into TradeEdge</div><div class="hstep-desc">Go to <strong>Import Data</strong> in this app → drag all CSV files into the drop zone → trades are <strong>auto-imported instantly</strong>.</div></div>
        </div>
        <div class="img-mock">📊 TradingView → Trading Panel → History Tab → ⋯ → Export data…</div>
      </div>
      <div class="hcard">
        <div class="hcard-title">Step-by-Step: Cancelled CSV (SL/TP Reconstruction)</div>
        <p>The Cancelled tab contains your stop loss and take profit orders that were auto-cancelled when the other bracket order filled. This is how TradeEdge reconstructs your planned SL and TP levels.</p>
        <div class="hstep">
          <div class="hstep-n">1</div>
          <div class="hstep-body"><div class="hstep-title">Click the Cancelled tab</div><div class="hstep-desc">In the Trading Panel, find and click the <strong>Cancelled</strong> tab.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">2</div>
          <div class="hstep-body"><div class="hstep-title">Export and import</div><div class="hstep-desc">Same process: <strong>⋯ → Export data…</strong> → in TradeEdge, upload to the <strong>TV Cancelled</strong> card on the Import page.</div></div>
        </div>
        <div class="tip-box"><strong>💡 How SL/TP reconstruction works:</strong> When you place a bracket order (entry + SL + TP), TradingView creates three orders. When price hits your TP, the SL gets auto-cancelled. TradeEdge matches the cancelled SL/TP orders to your fills by timestamp and symbol to estimate your planned levels.</div>
      </div>
    </div>

    <!-- AMP PDF -->
    <div class="help-section" id="hs-amp-pdf">
      <div class="hcard">
        <div class="hcard-title">Your AMP Daily Statement PDF</div>
        <p>AMP Global Clearing emails you a daily statement PDF after every trading day. This PDF contains your <strong>exact fee breakdown</strong> which is more precise than any estimate.</p>
      </div>
      <div class="hcard">
        <div class="hcard-title">What's in Your AMP Statement</div>
        <p>Based on your uploaded statement (Feb 19, 2026 — MNQ trade), here's exactly what the app extracts:</p>
        <div class="metric-explain">
          <div class="me-card"><div class="me-name">Exchange Fee</div><div class="me-def">CME Group exchange fee per contract</div><div class="me-eg">Your rate: $0.70</div></div>
          <div class="me-card"><div class="me-name">NFA Fee</div><div class="me-def">National Futures Association regulatory fee</div><div class="me-eg">Your rate: $0.04</div></div>
          <div class="me-card"><div class="me-name">Clearing Fee</div><div class="me-def">Trade clearing and settlement fee</div><div class="me-eg">Your rate: $0.26</div></div>
          <div class="me-card"><div class="me-name">CQG TRF</div><div class="me-def">CQG platform transaction fee</div><div class="me-eg">Your rate: $0.20</div></div>
          <div class="me-card"><div class="me-name">Commission</div><div class="me-def">AMP broker commission</div><div class="me-eg">Your rate: $0.60</div></div>
          <div class="me-card" style="border-color:rgba(255,61,90,.2)"><div class="me-name" style="color:var(--red)">Total (Round Trip)</div><div class="me-def">All fees for one complete trade</div><div class="me-eg" style="color:var(--red)">Your total: $1.80</div></div>
        </div>
      </div>
      <div class="hcard">
        <div class="hcard-title">How to Get Your Daily PDF</div>
        <div class="hstep">
          <div class="hstep-n">1</div>
          <div class="hstep-body"><div class="hstep-title">Check your email</div><div class="hstep-desc">AMP sends the statement to the email on your account, usually by <strong>6–8am ET</strong> the following morning after each trading day.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">2</div>
          <div class="hstep-body"><div class="hstep-title">Save the PDF</div><div class="hstep-desc">The email subject is usually <strong>"Daily Statement — [Date]"</strong>. Download the attached PDF.</div></div>
        </div>
        <div class="hstep">
          <div class="hstep-n">3</div>
          <div class="hstep-body"><div class="hstep-title">Upload to TradeEdge</div><div class="hstep-desc">Go to <strong>Import Data → AMP Statement</strong> card → click it → select your PDF. The app parses fee rates and account balance automatically.</div></div>
        </div>
        <div class="tip-box"><strong>💡 Tip:</strong> You only need to upload the PDF once unless your AMP fee tier changes. After the first upload, TradeEdge remembers your fee rates and calculates them automatically on every future trade.</div>
      </div>
    </div>

    <!-- METRICS -->
    <div class="help-section" id="hs-metrics">
      <div class="hcard">
        <div class="hcard-title">Every Metric Explained</div>
        <p>These are the same metrics used by professional trading journals like Tradezella. Understanding each one is key to improving as a trader.</p>
      </div>
      <div class="metric-explain">
        <div class="me-card">
          <div class="me-name">NET P&L</div>
          <div class="me-def">Your total profit or loss after all fees and commissions. This is the only number that actually hits your account.</div>
          <div class="me-eg">Formula: Gross P&L − Total Fees</div>
        </div>
        <div class="me-card">
          <div class="me-name">WIN RATE</div>
          <div class="me-def">Percentage of trades that closed profitably. A high win rate alone doesn't mean profitability — it must be paired with good R:R.</div>
          <div class="me-eg">Formula: Winners ÷ Total Trades × 100</div>
        </div>
        <div class="me-card">
          <div class="me-name">PROFIT FACTOR</div>
          <div class="me-def">Ratio of gross profits to gross losses. Above 1.0 means profitable. Above 1.5 is solid. Above 2.0 is excellent. ICT traders typically target 1.5+.</div>
          <div class="me-eg">Formula: Gross Wins ÷ Gross Losses</div>
        </div>
        <div class="me-card">
          <div class="me-name">EXPECTANCY</div>
          <div class="me-def">The average dollar amount you can expect to make (or lose) per trade over time. This is arguably the most important metric — it tells you if your edge is real.</div>
          <div class="me-eg">Formula: (Win% × Avg Win) − (Loss% × Avg Loss)</div>
        </div>
        <div class="me-card">
          <div class="me-name">AVG WINNER</div>
          <div class="me-def">Average dollar profit on winning trades. You want this to be meaningfully larger than your Avg Loser to maintain a positive edge even with a lower win rate.</div>
          <div class="me-eg">Target: At least 1.5× your Avg Loser</div>
        </div>
        <div class="me-card">
          <div class="me-name">AVG LOSER</div>
          <div class="me-def">Average dollar loss on losing trades. If this is growing over time, you may be moving your stop loss — one of the most dangerous habits in trading.</div>
          <div class="me-eg">Watch: Is this consistent or creeping up?</div>
        </div>
        <div class="me-card">
          <div class="me-name">AVG R:R</div>
          <div class="me-def">Average risk-to-reward ratio achieved across all trades. ICT methodology targets minimum 2:1 or 3:1. This is calculated from your SL and TP prices.</div>
          <div class="me-eg">Target: 2.0R or higher per trade</div>
        </div>
        <div class="me-card">
          <div class="me-name">MAX DRAWDOWN</div>
          <div class="me-def">The largest peak-to-trough decline in your account equity. This measures your worst losing streak period. Keep this below 10% of your account.</div>
          <div class="me-eg">Warning: If growing, reduce position size</div>
        </div>
        <div class="me-card">
          <div class="me-name">WIN STREAK</div>
          <div class="me-def">Your longest consecutive winning run. Useful for identifying when your edge is working best — cross-reference with market conditions and killzones.</div>
          <div class="me-eg">Tip: What setup was active during streaks?</div>
        </div>
        <div class="me-card">
          <div class="me-name">LOSS STREAK</div>
          <div class="me-def">Your longest consecutive losing run. If this exceeds 3–4 trades, consider stopping for the day. Revenge trading typically begins at loss streak 2–3.</div>
          <div class="me-eg">Rule: Stop trading after 3 consecutive losses</div>
        </div>
        <div class="me-card">
          <div class="me-name">PSYCHOLOGICAL SCORE</div>
          <div class="me-def">TradeEdge's proprietary score (1–10) calculated from your sleep, energy, emotional state, and mistake patterns. Low scores correlate with losing sessions.</div>
          <div class="me-eg">Formula: Sleep + Energy + Discipline − Mistakes</div>
        </div>
        <div class="me-card">
          <div class="me-name">TOTAL FEES</div>
          <div class="me-def">All commissions and fees paid to AMP, CME, NFA, and CQG. For MNQ: $1.80 per round trip. Track this — it's a real drag on performance at scale.</div>
          <div class="me-eg">MNQ: $1.80 · MES: ~$1.80 · NQ: ~$4.50</div>
        </div>
      </div>
    </div>

    <!-- ICT GLOSSARY -->
    <div class="help-section" id="hs-ict-glossary">
      <div class="hcard">
        <div class="hcard-title">ICT Setup Tags — Glossary</div>
        <p>These are the pre-loaded ICT / Smart Money Concept setup tags in TradeEdge. Tag every trade with the primary concept used so you can track which setups are actually profitable for you.</p>
      </div>
      <div class="ict-grid">
        <div class="ict-card">
          <div class="ict-name">FVG — Fair Value Gap</div>
          <div class="ict-def">A 3-candle imbalance where the high of candle 1 and the low of candle 3 don't overlap, leaving an inefficiency. Price typically returns to fill this gap. ICT's most fundamental concept.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Order Block (OB)</div>
          <div class="ict-def">The last up/down candle before a significant move in the opposite direction. Represents institutional order flow. Used as key support/resistance levels for entries.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Breaker Block</div>
          <div class="ict-def">A failed Order Block that price has broken through. When price returns to this area, the OB "breaks" and flips — bullish OB becomes bearish resistance and vice versa.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Liquidity Sweep</div>
          <div class="ict-def">Price engineered to take out stops (buy-side or sell-side liquidity) before reversing. ICT refers to this as "stop hunts." The sweep itself is often the entry signal.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">OTE — Optimal Trade Entry</div>
          <div class="ict-def">The 62–79% Fibonacci retracement zone of a swing move. ICT's preferred entry zone. Combining OTE with an OB or FVG gives high-probability entries.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">MSS — Market Structure Shift</div>
          <div class="ict-def">When price breaks a key swing high/low on the LTF, signaling a potential change in direction. Used as confirmation that the HTF bias is playing out on the entry timeframe.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Silver Bullet</div>
          <div class="ict-def">ICT's specific strategy using the 10:00–11:00am ET and 2:00–3:00pm ET windows. Looks for a liquidity sweep followed by an FVG entry. One of ICT's most taught setups.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">1st Presented FVG</div>
          <div class="ict-def">The very first Fair Value Gap that forms after a Market Structure Shift. ICT teaches this as the highest-probability FVG to trade, as it represents the initial institutional displacement.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Judas Swing</div>
          <div class="ict-def">A false move at the open (often 8:30–9:30am ET) that sweeps liquidity in the wrong direction before the true move begins. Part of ICT's Power of 3 (PO3) model.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Turtle Soup</div>
          <div class="ict-def">A reversal entry taken when price sweeps a previous day's high/low (turtle traders' stop levels) and immediately reverses. Named after the Turtle Traders strategy ICT fades.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">ORG — Opening Range Gap</div>
          <div class="ict-def">The gap between the previous day's close and the current day's open (or between sessions). Price frequently returns to fill this gap, making it a useful reference level.</div>
        </div>
        <div class="ict-card">
          <div class="ict-name">Liquidity Sweep</div>
          <div class="ict-def">Engineered price movement to trigger stops above swing highs (BSL) or below swing lows (SSL) before reversing. The sweep + reversal is the trade signal.</div>
        </div>
      </div>
    </div>

    <!-- KILLZONES -->
    <div class="help-section" id="hs-killzones">
      <div class="hcard">
        <div class="hcard-title">ICT Killzones & Macro Times</div>
        <p>ICT teaches that institutional order flow is only active during specific windows of the trading day. Trading outside these windows significantly reduces edge. All times are <strong>Eastern Time (ET)</strong>.</p>
      </div>
      <div class="kz-explain">
        <div class="kz-card">
          <div class="kz-time">2:00am – 5:00am ET</div>
          <div><div class="kz-info-name">London Killzone 🇬🇧</div><div class="kz-info-desc">London session open. Major institutional activity. ICT looks for London to take liquidity in one direction, then reverse for the true NY move. Good for early risers.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">8:30am – 11:00am ET</div>
          <div><div class="kz-info-name">NY AM Killzone 🗽 (Primary)</div><div class="kz-info-desc">The most important killzone for most ICT traders. Includes the NY open overlap with London. Judas Swings, Silver Bullets, and the primary daily move typically form here. This is where your edge should be sharpest.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">10:00am – 11:00am ET</div>
          <div><div class="kz-info-name">Silver Bullet Window #1 ⚡</div><div class="kz-info-desc">ICT's first Silver Bullet window. Look for a liquidity sweep into an FVG. One of the highest-probability 60-minute windows of the day.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">11:00am – 1:00pm ET</div>
          <div><div class="kz-info-name">NY Lunch / Dead Zone 😴</div><div class="kz-info-desc">Institutional traders at lunch. Volume drops, spreads widen, price chops. ICT explicitly teaches to avoid trading this window. Low probability, high noise.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">1:30pm – 4:00pm ET</div>
          <div><div class="kz-info-name">NY PM Killzone 🌆</div><div class="kz-info-desc">Afternoon institutional activity resumes. Often completes the daily range or creates a second delivery. Lower probability than AM but still tradeable with the right setup.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">2:00pm – 3:00pm ET</div>
          <div><div class="kz-info-name">Silver Bullet Window #2 ⚡</div><div class="kz-info-desc">ICT's second Silver Bullet window in the PM session. Same concept — look for liquidity sweep + FVG entry. Less reliable than the AM window but valid.</div></div>
        </div>
        <div class="kz-card">
          <div class="kz-time">XX:50 – XX:10 ET</div>
          <div><div class="kz-info-name">Macro Windows ⏰ (Every Hour)</div><div class="kz-info-desc">The last 10 minutes and first 10 minutes of every hour. ICT teaches that algorithms re-price markets during these windows. Key times: 8:50, 9:50, 10:50, 1:50, 2:50, 3:50. These are often where the best LTF entries occur within a killzone.</div></div>
        </div>
        <div class="kz-card" style="border-color:rgba(245,183,49,.15)">
          <div class="kz-time" style="color:var(--gold)">8:30am ET</div>
          <div><div class="kz-info-name" style="color:var(--gold)">High-Impact News Events 📰</div><div class="kz-info-desc">CPI, NFP, FOMC, PPI, GDP releases. ICT teaches to either avoid trading 30 minutes before and after, or to specifically trade the post-news liquidity sweep. Always check the economic calendar before each session.</div></div>
        </div>
      </div>
    </div>

    <!-- SESSION COMPANION -->
    <div class="help-section" id="hs-session">
      <div class="hcard">
        <div class="hcard-title">The Session Companion</div>
        <p>The Session Companion is the most important feature for improving as a trader. It forces structured thinking before and after every trade — the same discipline professional traders use.</p>
      </div>
      <div class="hcard">
        <div class="hcard-title">Pre-Session Check-In (opens automatically at 8am ET)</div>
        <p>Every weekday morning between 8:00–9:30am ET, the app automatically opens the Pre-Session popup if you haven't journaled yet today. It asks:</p>
        <div class="hstep"><div class="hstep-n">💤</div><div class="hstep-body"><div class="hstep-title">Hours Slept</div><div class="hstep-desc">Research shows sleep deprivation severely impacts decision-making. TradeEdge tracks this and correlates it with your P&L over time. If you slept under 6 hours, consider sim trading only.</div></div></div>
        <div class="hstep"><div class="hstep-n">⚡</div><div class="hstep-body"><div class="hstep-title">Energy & Confidence Level (1–10)</div><div class="hstep-desc">Your subjective energy and confidence at session start. Low energy + low confidence = recipe for hesitation entries and early exits.</div></div></div>
        <div class="hstep"><div class="hstep-n">☕</div><div class="hstep-body"><div class="hstep-title">Coffee Before 9:30am?</div><div class="hstep-desc">Caffeine before the open can increase anxiety and FOMO trades. TradeEdge tracks this against your performance so you can see the actual impact on your results.</div></div></div>
        <div class="hstep"><div class="hstep-n">📊</div><div class="hstep-body"><div class="hstep-title">HTF Bias & Pre-Market Plan</div><div class="hstep-desc">Your Daily/4H directional bias and key levels to watch. Write this <strong>before</strong> the market opens. If you can't articulate your edge for the day, don't trade.</div></div></div>
      </div>
      <div class="hcard">
        <div class="hcard-title">Post-Trade Debrief (one click after each trade)</div>
        <p>After each trade closes, click <strong>"📝 Log Post-Trade"</strong> in the Journal section, or use keyboard shortcut <kbd>Cmd</kbd>+<kbd>J</kbd>. The popup asks:</p>
        <div class="hstep"><div class="hstep-n">✅</div><div class="hstep-body"><div class="hstep-title">ICT Checklist</div><div class="hstep-desc">Did you wait for the killzone? Was there an MSS? Did you let it run? Complete this honestly — the ICT Compliance chart in analytics tracks this over time.</div></div></div>
        <div class="hstep"><div class="hstep-n">😤</div><div class="hstep-body"><div class="hstep-title">Emotional State</div><div class="hstep-desc">How did you feel during the trade? Calm and focused, or anxious and chasing? This gets tracked in your Psychological Score over time.</div></div></div>
        <div class="hstep"><div class="hstep-n">❌</div><div class="hstep-body"><div class="hstep-title">Mistakes</div><div class="hstep-desc">Be ruthlessly honest here. Did you move your stop? Did you chase? The Mistake Frequency tracker will show you which habits are costing you the most money.</div></div></div>
        <div class="tip-box"><strong>💡 The 30-second rule:</strong> Log the post-trade debrief within 30 seconds of the trade closing, while everything is fresh. Don't wait until end of day — you'll forget the emotion.</div>
      </div>
    </div>

    <!-- SHORTCUTS -->
    <div class="help-section" id="hs-shortcuts">
      <div class="hcard">
        <div class="hcard-title">Keyboard Shortcuts</div>
        <p>Keep this app in a browser tab next to TradingView. These shortcuts let you log trades without taking your eyes off the chart for long.</p>
        <div class="shortcut-grid">
          <div class="sc-row"><span class="sc-desc">Add new trade manually</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>N</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Open post-trade debrief</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>J</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Start pre-session check-in</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>S</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Dashboard</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>1</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Trade Log</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>2</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Journal</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>3</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Analytics</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>4</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to ICT Analytics</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>5</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Import Data</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>I</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Go to Help</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>?</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Export trades CSV</span><span class="sc-key"><kbd>Cmd</kbd>+<kbd>E</kbd></span></div>
          <div class="sc-row"><span class="sc-desc">Close any popup / modal</span><span class="sc-key"><kbd>Escape</kbd></span></div>
        </div>
        <div class="tip-box" style="margin-top:14px"><strong>💡 Workflow tip:</strong> Keep TradingView on the left half of your screen and TradeEdge on the right half. After each trade closes, hit <kbd>Cmd</kbd>+<kbd>J</kbd> immediately to log the debrief while the emotion is fresh.</div>
      </div>
    </div>
  `;
}

function showHelpTab(tab, el) {
  document.querySelectorAll('.help-section').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.htab').forEach(t => t.classList.remove('on'));
  const sec = document.getElementById('hs-' + tab);
  if (sec) sec.classList.add('on');
  if (el) el.classList.add('on');
}

// ══════════════════════════════════════════════════════════
// ONBOARDING TOUR
// ══════════════════════════════════════════════════════════
const TOUR_STEPS = [
  {
    title: 'Welcome to TradeEdge ICT!',
    desc: "Let's take a 60-second tour of your new trading journal. We'll show you everything you need to get started. Click Next to begin.",
    target: '.logo-wrap',
    pos: 'right'
  },
  {
    title: 'Dashboard',
    desc: 'Your command center. See all key metrics at a glance — Net P&L, Win Rate, Profit Factor, Equity Curve, and more. Everything updates automatically when you import or add trades.',
    target: '[data-view="dashboard"]',
    pos: 'right'
  },
  {
    title: 'Trade Log',
    desc: 'Every trade in one table. Filter by winners, losers, long or short. Click any row to edit the trade, add journal notes, or attach a chart screenshot.',
    target: '[data-view="trades"]',
    pos: 'right'
  },
  {
    title: 'Journal',
    desc: 'Your daily trading journal. Log your pre-market plan, post-session review, and psychological state. The "Log Post-Trade" button opens a quick debrief after each individual trade.',
    target: '[data-view="journal"]',
    pos: 'right'
  },
  {
    title: 'ICT Analytics',
    desc: 'See which ICT setups (FVG, OB, Silver Bullet, etc.) are actually profitable for you. Track your killzone performance, HTF bias accuracy, and ICT checklist compliance.',
    target: '[data-view="ict"]',
    pos: 'right'
  },
  {
    title: 'Start Session Button',
    desc: 'Click this every morning before you trade. It opens your pre-session check-in — sleep, energy, coffee, HTF bias, and daily plan. The app auto-opens this at 8am ET on weekdays.',
    target: '.session-btn',
    pos: 'bottom'
  },
  {
    title: 'Import Data',
    desc: 'Import your TradingView History CSV, Cancelled CSV (for SL/TP), and AMP daily PDF. The app never overwrites existing trades — always accumulates. Export weekly as a backup.',
    target: '[data-view="import"]',
    pos: 'right'
  },
  {
    title: "You're all set! 🎯",
    desc: "Start by clicking 'Import Data' to load your TradingView trades, or hit '+ Add Trade' to log manually. Remember: click 'Start Session' every morning before you trade. Good luck!",
    target: '.btn-accent',
    pos: 'bottom'
  }
];

let tourStep = 0;

