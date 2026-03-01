// TradeEdge — Analytics

function renderAnalytics(){
  const m=calcMetrics(S.trades);
  document.getElementById('perf-stats').innerHTML=[
    ['Net P&L',f$(m.net),m.net>=0?'var(--green)':'var(--red)'],
    ['Gross P&L',f$(m.gross||m.net),'var(--t1)'],
    ['Total Fees',f$(-m.fees),'var(--gold)'],
    ['Win Rate',fpct(m.winRate),'var(--t1)'],
    ['Profit Factor',isFinite(m.pf)?fnum(m.pf):'∞',m.pf>=1?'var(--green)':'var(--red)'],
    ['Expectancy',f$(m.exp),m.exp>=0?'var(--green)':'var(--red)'],
    ['Avg Winner',f$(m.avgWin),'var(--green)'],
    ['Avg Loser',f$(-m.avgLoss),'var(--red)'],
    ['Avg R:R',fnum(m.avgRR),'var(--t1)'],
    ['Total Trades',m.total||0,'var(--t1)'],
    ['Winners / Losers',`${m.wins||0} / ${m.losses||0}`,'var(--t1)'],
    ['Max Drawdown',f$(-m.maxDD),'var(--red)'],
  ].map(([k,v,c])=>`<div class="stat-row"><span class="stat-k">${k}</span><span class="stat-v" style="color:${c}">${v}</span></div>`).join('');

  // By symbol
  const syms={};
  S.trades.forEach(t=>{
    if(!t.symbol)return;
    if(!syms[t.symbol])syms[t.symbol]={pnl:0,cnt:0};
    syms[t.symbol].pnl+=(t.netPnl||t.pnl||0);syms[t.symbol].cnt++;
  });
  const maxSymPnl=Math.max(...Object.values(syms).map(v=>Math.abs(v.pnl)))||1;
  document.getElementById('sym-stats').innerHTML=Object.entries(syms).sort((a,b)=>b[1].pnl-a[1].pnl).map(([s,v])=>`
    <div class="stat-row">
      <span class="stat-k">${escapeHtml(s)} <span style="color:var(--t3)">(${v.cnt})</span></span>
      <span class="stat-v" style="color:${v.pnl>=0?'var(--green)':'var(--red)'}">${f$(v.pnl)}</span>
    </div>
    <div class="prog"><div class="prog-fill" style="width:${Math.min(100,Math.abs(v.pnl/maxSymPnl)*100)}%;background:${v.pnl>=0?'var(--green)':'var(--red)'}"></div></div>
  `).join('');

  // Streaks
  document.getElementById('streak-stats').innerHTML=[
    ['Best Win Streak',m.mW||0,'var(--green)'],
    ['Worst Loss Streak',m.mL||0,'var(--red)'],
    ['Total Winners',m.wins||0,'var(--green)'],
    ['Total Losers',m.losses||0,'var(--red)'],
  ].map(([k,v,c])=>`<div class="stat-row"><span class="stat-k">${k}</span><span class="stat-v" style="color:${c}">${v}</span></div>`).join('');

  // Risk
  document.getElementById('risk-stats').innerHTML=[
    ['Max Drawdown',f$(-m.maxDD),'var(--red)'],
    ['Total Fees Paid',f$(-m.fees),'var(--gold)'],
    ['Avg R:R Achieved',fnum(m.avgRR),'var(--t1)'],
    ['Best Trade',f$(Math.max(...S.trades.map(t=>t.netPnl||t.pnl||0).concat([0]))),'var(--green)'],
    ['Worst Trade',f$(Math.min(...S.trades.map(t=>t.netPnl||t.pnl||0).concat([0]))),'var(--red)'],
  ].map(([k,v,c])=>`<div class="stat-row"><span class="stat-k">${k}</span><span class="stat-v" style="color:${c}">${v}</span></div>`).join('');

  // Mistakes
  const mkCounts={};
  S.trades.forEach(t=>(t.mistakes||[]).forEach(mk=>{mkCounts[mk]=(mkCounts[mk]||0)+1;}));
  const maxMk=Math.max(...Object.values(mkCounts))||1;
  document.getElementById('mistake-stats').innerHTML=Object.entries(mkCounts).sort((a,b)=>b[1]-a[1]).map(([mk,cnt])=>`
    <div class="stat-row">
      <span class="stat-k">${escapeHtml(mk)}</span>
      <span class="stat-v" style="color:var(--red)">${cnt}x</span>
    </div>
    <div class="prog"><div class="prog-fill" style="width:${(cnt/maxMk)*100}%;background:var(--red);opacity:.7"></div></div>
  `).join('')||'<p style="font-size:.72rem;color:var(--t3);padding:8px 0">No mistakes logged yet. Keep it up! 💪</p>';

  // Heatmap
  renderHeatmap();
  // Psych score over time
  drawPsychCurve();
}

// ══════════════════════════════════════════════════════════
// HEATMAP
// ══════════════════════════════════════════════════════════
function renderHeatmap(){
  const el=document.getElementById('heatmap');
  const today=new Date();
  const start=new Date(today);
  start.setDate(start.getDate()-90);
  const dateMap={};
  S.trades.forEach(t=>{
    if(!t.date)return;
    const pnl=t.netPnl||t.pnl||0;
    dateMap[t.date]=(dateMap[t.date]||0)+pnl;
  });
  const cells=[];
  for(let d=new Date(start);d<=today;d.setDate(d.getDate()+1)){
    const ds=d.toISOString().split('T')[0];
    cells.push({date:ds,pnl:dateMap[ds]||0,hasData:!!dateMap[ds]});
  }
  el.innerHTML=cells.map(c=>{
    const intensity=c.hasData?Math.min(1,Math.abs(c.pnl)/200):0;
    const bg=!c.hasData?'var(--b1)':c.pnl>=0?`rgba(0,229,160,${0.15+intensity*0.7})`:`rgba(255,61,90,${0.15+intensity*0.7})`;
    return `<div class="hcell" style="background:${bg}" title="${c.date}: ${c.hasData?f$(c.pnl):'No trades'}"></div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// PSYCH CURVE
// ══════════════════════════════════════════════════════════
function drawPsychCurve(){
  const svg=document.getElementById('psych-svg');
  svg.innerHTML='';
  const entries=[...S.journal].sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(e=>e.date);
  if(entries.length<2){
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','50%');t.setAttribute('y','50%');t.setAttribute('fill','#3d4f6e');
    t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('font-family','IBM Plex Mono');
    t.textContent='Journal more entries to see psychological trend';svg.appendChild(t);return;
  }
  const W=400,H=110,P=15;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const scores=entries.map(e=>calcPsychScore(e,S.trades.filter(t=>t.date===e.date)));
  const maxX=entries.length-1||1;
  const px=x=>P+(x/maxX)*(W-2*P);
  const py=y=>P+(1-(y-1)/9)*(H-2*P);
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('points',scores.map((s,i)=>`${px(i)},${py(s)}`).join(' '));
  line.setAttribute('fill','none');line.setAttribute('stroke','var(--purple)');line.setAttribute('stroke-width','2');
  svg.appendChild(line);
  scores.forEach((s,i)=>{
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',px(i));dot.setAttribute('cy',py(s));dot.setAttribute('r','3');
    dot.setAttribute('fill','var(--purple)');svg.appendChild(dot);
  });
}

// ══════════════════════════════════════════════════════════
// ICT ANALYTICS
// ══════════════════════════════════════════════════════════
