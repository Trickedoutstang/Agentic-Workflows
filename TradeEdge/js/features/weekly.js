// TradeEdge — Weekly Report

function renderWeekly(){
  const el=document.getElementById('weekly-list');
  const empty=document.getElementById('weekly-empty');
  if(!S.trades.length){el.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  // Group by week
  const weeks={};
  S.trades.forEach(t=>{
    if(!t.date)return;
    const d=new Date(t.date+'T12:00:00');
    const dow=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-(dow===0?6:dow-1));
    const wk=mon.toISOString().split('T')[0];
    if(!weeks[wk])weeks[wk]={trades:[],start:mon};
    weeks[wk].trades.push(t);
  });
  el.innerHTML=Object.entries(weeks).sort((a,b)=>new Date(b[0])-new Date(a[0])).map(([wk,{trades,start}])=>{
    const end=new Date(start);end.setDate(start.getDate()+4);
    const m=calcMetrics(trades);
    const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    return `<div class="week-card">
      <div class="week-hdr">
        <div class="week-title">Week of ${fmt(start)} — ${fmt(end)}</div>
        <div class="week-pnl" style="color:${m.net>=0?'var(--green)':'var(--red)'}">${f$(m.net)}</div>
      </div>
      <div class="week-stats">
        <div class="ws"><div class="ws-label">Trades</div><div class="ws-val">${m.total}</div></div>
        <div class="ws"><div class="ws-label">Win Rate</div><div class="ws-val" style="color:${m.winRate>=.5?'var(--green)':'var(--red)'}">${fpct(m.winRate)}</div></div>
        <div class="ws"><div class="ws-label">Profit Factor</div><div class="ws-val" style="color:${m.pf>=1?'var(--green)':'var(--red)'}">${isFinite(m.pf)?fnum(m.pf):'∞'}</div></div>
        <div class="ws"><div class="ws-label">Fees Paid</div><div class="ws-val" style="color:var(--gold)">${f$(-m.fees)}</div></div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// IMPORT ENGINE (Complete Rewrite)
// ══════════════════════════════════════════════════════════
let pendingRows=[];
let pendingTrades=[];
let importMode='';
let lastImportFileName='';

