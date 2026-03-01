// TradeEdge — Dashboard

// ══════════════════════════════════════════════════════════
// METRICS CALCULATION
// ══════════════════════════════════════════════════════════
function calcMetrics(trades){
  if(!trades.length)return{};
  // Get the net P&L for each trade: prefer netPnl, else compute pnl - fees
  function np(t){
    if(t.netPnl!=null && t.netPnl!==0) return t.netPnl;
    return (t.pnl||0) - (t.fees||0);
  }
  const pnls=trades.map(np);
  const wins=trades.filter(t=>np(t)>0);
  const losses=trades.filter(t=>np(t)<0);
  // Change 28: Breakeven trade count — exclude from win rate denominator
  const breakeven=trades.filter(t=>np(t)===0).length;
  const net=pnls.reduce((a,b)=>a+b,0);
  const gross=trades.reduce((a,t)=>a+(t.pnl||0),0);
  const fees=trades.reduce((a,t)=>a+(t.fees||0),0);
  // Change 28: Win rate excludes breakeven trades
  const winLossDenom=wins.length+losses.length;
  const winRate=winLossDenom>0?wins.length/winLossDenom:0;
  const lossRate=winLossDenom>0?losses.length/winLossDenom:0;
  const avgWin=wins.length?wins.reduce((a,t)=>a+np(t),0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((a,t)=>a+np(t),0)/losses.length):0;
  const grossWins=wins.reduce((a,t)=>a+np(t),0);
  const grossLoss=Math.abs(losses.reduce((a,t)=>a+np(t),0));
  // Change 28: Cap profit factor at 99.9 when no losses
  const pfRaw=grossLoss?grossWins/grossLoss:99.9;
  const pf=pfRaw>99?99.9:pfRaw;
  const exp=(winRate*avgWin)-((1-winRate)*avgLoss);
  let eq=0,peak=0,maxDD=0;
  for(const t of trades){eq+=np(t);if(eq>peak)peak=eq;const dd=peak-eq;if(dd>maxDD)maxDD=dd;}
  // Change 28: Max DD as percentage
  const ddBase=peak>0?peak:(S.startingBalance||1);
  const maxDDPct=maxDD>0?(maxDD/ddBase*100):0;
  // Change 28: Streak calc — skip breakeven trades
  let cW=0,cL=0,mW=0,mL=0;
  for(const t of trades){
    if(np(t)===0)continue; // Skip breakeven
    if(np(t)>0){cW++;cL=0}else{cL++;cW=0}
    mW=Math.max(mW,cW);mL=Math.max(mL,cL);
  }
  const rrVals=trades.filter(t=>t.rr).map(t=>t.rr);
  const avgRR=rrVals.length?rrVals.reduce((a,b)=>a+b,0)/rrVals.length:0;
  // SL/TP metrics
  const withSL=trades.filter(t=>t.slDollar);
  const withTP=trades.filter(t=>t.tpDollar);
  const avgRisk=withSL.length?withSL.reduce((a,t)=>a+Math.abs(t.slDollar),0)/withSL.length:0;
  const avgTarget=withTP.length?withTP.reduce((a,t)=>a+Math.abs(t.tpDollar),0)/withTP.length:0;
  const slHits=trades.filter(t=>t.exitReason==='SL Hit').length;
  const tpHits=trades.filter(t=>t.exitReason==='TP Hit').length;
  const manualExits=trades.filter(t=>t.exitReason==='Manual Exit').length;
  // Change 28: Avg actual R from actual trade data (exit-entry)/(entry-sl) when available
  const actualRVals=trades.filter(t=>t.actualR!=null).map(t=>t.actualR);
  const avgActualR=actualRVals.length?actualRVals.reduce((a,b)=>a+b,0)/actualRVals.length:0;
  // TopStep-inspired metrics
  const bestTrade=trades.length?Math.max(...pnls):0;
  const worstTrade=trades.length?Math.min(...pnls):0;
  const totalContracts=trades.reduce((s,t)=>s+(t.qty||1),0);
  const longs=trades.filter(t=>t.side==='Long'||t.side==='Buy').length;
  const shorts=trades.filter(t=>t.side==='Short'||t.side==='Sell').length;
  const longPct=trades.length?longs/trades.length:0;
  // Equity high/low
  let eqHigh=0,eqLow=0,eqCur=0;
  const sorted=[...trades].sort((a,b)=>new Date(a.date+' '+(a.time||'00:00'))-new Date(b.date+' '+(b.time||'00:00')));
  sorted.forEach(t=>{eqCur+=np(t);if(eqCur>eqHigh)eqHigh=eqCur;if(eqCur<eqLow)eqLow=eqCur;});
  // Best day % of total profit — Change 28: guard against zero grossWins
  const dayPnl={};trades.forEach(t=>{if(!t.date)return;const d=t.date;if(!dayPnl[d])dayPnl[d]=0;dayPnl[d]+=np(t);});
  const dayVals=Object.values(dayPnl);
  const bestDayPnl=dayVals.length?Math.max(...dayVals):0;
  const bestDayPct=(grossWins>0&&bestDayPnl>0)?bestDayPnl/grossWins:0;
  // ═══ Change 29: New professional metrics ═══
  // Recovery Factor
  const recoveryFactor=maxDD>0?net/maxDD:0;
  // Edge Ratio — your mathematical edge (must be >1.0 to be profitable)
  const edgeRatio=(avgLoss>0)?(avgWin*winRate)/(avgLoss*lossRate):0;
  // Plan Adherence % — trades with checklist 80%+ complete
  var planAdherenceCount=0;
  trades.forEach(function(t){
    if(t.checklist){
      var keys=Object.keys(t.checklist);
      if(keys.length){
        var checked=keys.filter(function(k){return t.checklist[k];}).length;
        if(checked/keys.length>=0.8)planAdherenceCount++;
      }
    }
  });
  const planAdherence=trades.length>0?planAdherenceCount/trades.length:0;
  // Risk Per Trade % — avg(abs(slDollar) / accountBalance) × 100
  var acctBal=S.startingBalance||0;
  const riskPerTradePct=(withSL.length>0&&acctBal>0)?(avgRisk/acctBal*100):0;
  // V2.1: Hold time metrics
  var holdTimes=[];
  trades.forEach(function(t){
    if(t.entryPlacingTime&&t.exitPlacingTime){
      var entry=new Date(t.entryPlacingTime.replace(' ','T'));
      var exit=new Date(t.exitPlacingTime.replace(' ','T'));
      if(!isNaN(entry)&&!isNaN(exit)){
        var mins=Math.round((exit-entry)/60000);
        if(mins>=0)holdTimes.push(mins);
      }
    } else if(t.date&&t.time&&t.exitTime){
      var entry2=new Date(t.date+'T'+t.time);
      var exit2=new Date(t.date+'T'+t.exitTime);
      if(!isNaN(entry2)&&!isNaN(exit2)){
        var mins2=Math.round((exit2-entry2)/60000);
        if(mins2>=0)holdTimes.push(mins2);
      }
    }
  });
  var avgHoldTime=holdTimes.length?holdTimes.reduce(function(a,b){return a+b;},0)/holdTimes.length:null;
  var minHoldTime=holdTimes.length?Math.min.apply(null,holdTimes):null;
  var maxHoldTime=holdTimes.length?Math.max.apply(null,holdTimes):null;
  var medianHoldTime=null;
  if(holdTimes.length){
    var sorted2=[].concat(holdTimes).sort(function(a,b){return a-b;});
    var mid=Math.floor(sorted2.length/2);
    medianHoldTime=sorted2.length%2?sorted2[mid]:(sorted2[mid-1]+sorted2[mid])/2;
  }
  return{gross,fees,net,winRate,avgWin,avgLoss,pf,exp,maxDD,maxDDPct,mW,mL,
    total:trades.length,wins:wins.length,losses:losses.length,breakeven,avgRR,
    avgRisk,avgTarget,slHits,tpHits,manualExits,avgActualR,
    withSL:withSL.length,withTP:withTP.length,
    bestTrade,worstTrade,totalContracts,longPct,longs,shorts,
    eqHigh,eqLow,bestDayPnl,bestDayPct,
    recoveryFactor,edgeRatio,planAdherence,riskPerTradePct,
    avgHoldTime,minHoldTime,maxHoldTime,medianHoldTime,
    accountGrowthPct:S.startingBalance>0?(net/S.startingBalance)*100:0};
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function renderDash(){
  try{
  const m=calcMetrics(S.trades);
  console.log('[TradeEdge] renderDash called. Trades:', S.trades.length, 'Metrics:', JSON.stringify(m));
  
  // Debug banner if trades exist but metrics empty
  const debugEl=document.getElementById('dash-debug');
  if(debugEl){
    if(S.trades.length){
      var balStr=S.startingBalance?(' · Start: '+f$(S.startingBalance,false)+' + P&L: '+f$(m.net,true)+' = '+f$(S.startingBalance+(m.net||0),false)):'';
      debugEl.innerHTML=`<span style="color:var(--accent)">${S.trades.length} trades</span> · Gross: ${f$(m.gross)} · Net: <b>${f$(m.net)}</b>${balStr}`;
      debugEl.style.display='block';
    } else {
      debugEl.innerHTML='<span style="color:var(--t3)">No trades — import data to see metrics</span>';
      debugEl.style.display='block';
    }
  }
  
  // Change 31: Reorganized dashboard metrics — critical first, noise removed
  const cards=[
    // Top row: Critical
    {l:'Net P&L',v:f$(m.net),c:(m.net||0)>=0?'up':'dn',line:(m.net||0)>=0?'var(--green)':'var(--red)',glow:'rgba(0,229,160,.05)'},
    {l:'Win Rate',v:fpct(m.winRate),c:'nu',line:'var(--accent)',glow:'rgba(0,240,192,.05)'},
    {l:'Edge Ratio',v:fnum(m.edgeRatio),c:(m.edgeRatio||0)>=1?'up':'dn',line:(m.edgeRatio||0)>=1?'var(--green)':'var(--red)'},
    {l:'Account Growth',v:(m.accountGrowthPct>=0?'+':'')+fnum(m.accountGrowthPct)+'%',c:(m.accountGrowthPct||0)>=0?'up':'dn',line:(m.accountGrowthPct||0)>=0?'var(--green)':'var(--red)',glow:(m.accountGrowthPct||0)>=0?'rgba(0,229,160,.05)':'rgba(255,61,90,.05)'},
    {l:'Max DD %',v:fnum(m.maxDDPct)+'%',c:'dn',line:'var(--red)'},
    // Second row: Key performance
    {l:'Profit Factor',v:fnum(m.pf),c:(m.pf||0)>=1?'up':'dn',line:'var(--accent2)'},
    {l:'Expectancy',v:f$(m.exp),c:(m.exp||0)>=0?'up':'dn',line:'var(--gold)'},
    {l:'Avg Winner / Loser',v:f$(m.avgWin,false)+' / '+f$(m.avgLoss,false),c:'nu',line:'var(--green)'},
    {l:'Plan Adherence',v:fpct(m.planAdherence),c:(m.planAdherence||0)>=0.8?'up':'dn',line:'var(--accent)'},
    // Third row: Risk management
    {l:'Recovery Factor',v:fnum(m.recoveryFactor),c:(m.recoveryFactor||0)>=1?'up':'dn',line:'var(--accent2)'},
    {l:'Risk Per Trade %',v:fnum(m.riskPerTradePct)+'%',c:(m.riskPerTradePct||0)<=2?'up':'dn',line:'var(--gold)'},
    {l:'Avg Actual R',v:m.avgActualR?fnum(m.avgActualR)+'R':'—',c:m.avgActualR>=0?'up':'dn',line:'var(--purple)'},
    {l:'Total Fees',v:f$(-(m.fees||0)),c:'dn',line:'var(--gold)'},
    // Fourth row: Secondary
    {l:'Avg Hold Time',v:fhold(m.avgHoldTime),c:'nu',line:'var(--accent2)'},
    {l:'Best / Worst Streak',v:(m.mW||0)+'W / '+(m.mL||0)+'L',c:'nu',line:'var(--green)'},
    {l:'SL / TP Hits',v:(m.slHits||0)+'SL / '+(m.tpHits||0)+'TP',c:'nu',line:'var(--accent)'},
    {l:'Total Trades',v:(m.total||0)+' ('+(m.breakeven||0)+' BE)',c:'nu',line:'var(--accent)'},
  ];
  document.getElementById('mgrid').innerHTML=cards.map(function(c,i){return `
    <div class="mc" style="--mc-line:${c.line||'var(--accent)'};--mc-glow:${c.glow||'rgba(0,240,192,.05)'};animation-delay:${i*50}ms">
      <button class="share-btn" onclick="event.stopPropagation();shareMetric(this)">&#x2934;</button>
      <div class="mc-label">${c.l}</div>
      <div class="mc-val ${c.c}" data-target="${c.v}">${c.v}</div>
    </div>`;}).join('');
  // V2.3: Animated counter tween — numeric values count up from 0
  document.querySelectorAll('.mc-val[data-target]').forEach(function(el){
    var raw=el.getAttribute('data-target');
    if(raw.indexOf('/')!==-1||raw==='—')return; // skip compound values like "3W / 5L"
    var numMatch=raw.match(/([+-]?\$?)([\d,.]+)(.*)/);
    if(!numMatch)return;
    var prefix=numMatch[1],targetNum=parseFloat(numMatch[2].replace(/,/g,'')),suffix=numMatch[3];
    if(isNaN(targetNum)||targetNum===0)return;
    var start=performance.now(),duration=600;
    el.textContent=prefix+'0'+suffix;
    function tick(now){
      var t=Math.min((now-start)/duration,1);
      var eased=1-Math.pow(1-t,3); // ease-out cubic
      var cur=targetNum*eased;
      var formatted=Math.abs(cur)<10?cur.toFixed(2):Math.abs(cur)<100?cur.toFixed(1):Math.round(cur).toLocaleString();
      el.textContent=prefix+formatted+suffix;
      if(t<1)requestAnimationFrame(tick);
      else el.textContent=raw; // snap to exact final value
    }
    requestAnimationFrame(tick);
  });
  drawEquity();drawDonut();drawDOW();drawKZChart();renderCalendar();
  }catch(err){
    console.error('[TradeEdge] Dashboard render error:',err);
    document.getElementById('mgrid').innerHTML=`<div style="color:var(--red);padding:20px;font-family:var(--mono);font-size:.8rem">Dashboard error: ${escapeHtml(err.message)}<br>Trades in memory: ${S.trades.length}</div>`;
  }
}

function updateSidebar(){
  const m=calcMetrics(S.trades);
  const el=document.getElementById('sb-bal');
  // Update account name everywhere
  const name=S.accountName||'Trader';
  const nameEl=document.getElementById('acct-name');if(nameEl)nameEl.textContent=name;
  const bbName=document.getElementById('bb-name');if(bbName)bbName.textContent=name;
  const greet=document.getElementById('sesh-greeting');
  if(greet){const h=new Date().getHours();const tod=h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening';greet.textContent=tod+', '+(S.accountName?S.accountName.split(' ')[0]:'Trader')+' 👋';}
  // Update balance bar
  const bbBal=document.getElementById('bb-balance');
  const bbPnl=document.getElementById('bb-pnl');
  // Always prefer startingBalance + net P&L (includes all trades, not just those in AMP statements)
  var currentBal=S.startingBalance?(S.startingBalance+(m.net||0)):0;
  if(!currentBal&&S.ampStatements&&S.ampStatements.length){
    currentBal=S.ampStatements[S.ampStatements.length-1].balance||0;
  }
  console.log('[TradeEdge] Balance breakdown: startingBal=$'+S.startingBalance+', tradeCount='+S.trades.length+', netPnl=$'+(m.net||0).toFixed(2)+', currentBal=$'+currentBal.toFixed(2));
  // Sidebar balance
  el.textContent=f$(currentBal,false);
  el.style.color=currentBal>=0?'var(--green)':'var(--red)';
  // Dashboard balance bar
  if(bbBal){bbBal.textContent=f$(currentBal,false);bbBal.style.color=currentBal>=0?'var(--green)':'var(--red)';}
  if(bbPnl){bbPnl.textContent=f$(m.net||0,false);bbPnl.style.color=(!m.net||m.net>=0)?'var(--green)':'var(--red)';}
  // Balance breakdown (starting + P&L)
  var bbBreak=document.getElementById('bb-breakdown');
  if(bbBreak&&S.startingBalance){
    bbBreak.textContent='start '+f$(S.startingBalance,false)+' + p&l '+f$(m.net||0,true);
  }else if(bbBreak){bbBreak.textContent='';}
  // Trade count next to P&L label
  var bbTC=document.getElementById('bb-trade-count');
  if(bbTC){bbTC.textContent=S.trades.length?'('+S.trades.length+' trades)':'';}
  // Poker chips
  renderChips(currentBal);
  // Self-destruct check
  if(S.trades.length>0&&S.startingBalance>0&&currentBal<=0&&!_nukeTriggered){triggerSelfDestruct();}
  const tb=document.getElementById('trade-count-badge');
  if(S.trades.length){tb.style.display='';tb.textContent=S.trades.length}else{tb.style.display='none'}
}

// ══════════════════════════════════════════════════════════
// EQUITY CURVE
// ══════════════════════════════════════════════════════════
function drawEquity(){
  const svg=document.getElementById('eq-svg');
  svg.innerHTML='';
  const trades=[...S.trades].sort((a,b)=>new Date(a.date+' '+(a.time||'00:00'))-new Date(b.date+' '+(b.time||'00:00')));
  if(!trades.length){
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','50%');t.setAttribute('y','50%');t.setAttribute('fill','#3d4f6e');
    t.setAttribute('text-anchor','middle');t.setAttribute('font-size','12');t.setAttribute('font-family','IBM Plex Mono');
    t.textContent='Import trades to see equity curve';svg.appendChild(t);return;
  }
  let cum=0;
  const pts=[{x:0,y:0,date:'Start'}];
  trades.forEach(t=>{const np=t.netPnl!=null&&t.netPnl!==0?t.netPnl:(t.pnl||0)-(t.fees||0);cum+=np;pts.push({x:pts.length,y:cum,date:t.date||''})});
  const W=600,H=160,P=20;
  const ys=pts.map(p=>p.y);
  const minY=Math.min(...ys),maxY=Math.max(...ys);
  const rng=maxY-minY||1;
  const maxX=pts.length-1||1;
  const px=x=>P+(x/maxX)*(W-2*P);
  const py=y=>P+(1-(y-minY)/rng)*(H-2*P);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  // V2.3: Defs — gradient fill + glow filter
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  const isUp=cum>=0;
  const color=isUp?'#00e5a0':'#ff3d5a';
  const gradId='eq-grad-'+(isUp?'up':'dn');
  const grad=document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
  grad.setAttribute('id',gradId);grad.setAttribute('x1','0');grad.setAttribute('y1','0');grad.setAttribute('x2','0');grad.setAttribute('y2','1');
  var s1=document.createElementNS('http://www.w3.org/2000/svg','stop');
  s1.setAttribute('offset','0%');s1.setAttribute('stop-color',color);s1.setAttribute('stop-opacity','0.25');grad.appendChild(s1);
  var s2=document.createElementNS('http://www.w3.org/2000/svg','stop');
  s2.setAttribute('offset','100%');s2.setAttribute('stop-color',color);s2.setAttribute('stop-opacity','0.02');grad.appendChild(s2);
  defs.appendChild(grad);svg.appendChild(defs);
  // Grid lines with value labels
  for(let i=0;i<=4;i++){
    const gl=document.createElementNS('http://www.w3.org/2000/svg','line');
    const y=P+i*(H-2*P)/4;
    const val=maxY-(i/4)*rng;
    gl.setAttribute('x1',P);gl.setAttribute('x2',W-P);gl.setAttribute('y1',y);gl.setAttribute('y2',y);
    gl.setAttribute('stroke','rgba(255,255,255,0.05)');gl.setAttribute('stroke-width','1');svg.appendChild(gl);
    const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',W-P+4);lbl.setAttribute('y',y+3);lbl.setAttribute('fill','#4d6890');
    lbl.setAttribute('font-size','8');lbl.setAttribute('font-family','IBM Plex Mono');lbl.textContent=f$(val,false);svg.appendChild(lbl);
  }
  // Zero line
  const z=py(0);
  if(z>P&&z<H-P){
    const zl=document.createElementNS('http://www.w3.org/2000/svg','line');
    zl.setAttribute('x1',P);zl.setAttribute('x2',W-P);zl.setAttribute('y1',z);zl.setAttribute('y2',z);
    zl.setAttribute('stroke','#2d3f5e');zl.setAttribute('stroke-dasharray','4,4');zl.setAttribute('stroke-width','1');
    svg.appendChild(zl);
  }
  // V2.3: Gradient-filled area
  const areaPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  var d='M'+px(0)+','+py(0);
  pts.forEach(function(p){d+=' L'+px(p.x)+','+py(p.y);});
  d+=' L'+px(maxX)+','+(H-P)+' L'+px(0)+','+(H-P)+' Z';
  areaPath.setAttribute('d',d);areaPath.setAttribute('fill','url(#'+gradId+')');svg.appendChild(areaPath);
  // V2.3: Animated line with stroke-dashoffset
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  const linePoints=pts.map(p=>px(p.x)+','+py(p.y)).join(' ');
  line.setAttribute('points',linePoints);
  line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','2.5');
  line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');
  line.setAttribute('filter','drop-shadow(0 0 3px '+color+')');
  svg.appendChild(line);
  // Animate stroke drawing
  var totalLen=0;for(var pi=1;pi<pts.length;pi++){var dx=px(pts[pi].x)-px(pts[pi-1].x),dy=py(pts[pi].y)-py(pts[pi-1].y);totalLen+=Math.sqrt(dx*dx+dy*dy);}
  line.setAttribute('stroke-dasharray',totalLen);line.setAttribute('stroke-dashoffset',totalLen);
  line.style.transition='stroke-dashoffset 1.2s ease-out';
  requestAnimationFrame(function(){line.setAttribute('stroke-dashoffset','0');});
  // V2.3: Hover tooltip overlay
  pts.forEach(function(p,i){
    if(i===0)return;
    var circ=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circ.setAttribute('cx',px(p.x));circ.setAttribute('cy',py(p.y));circ.setAttribute('r','6');
    circ.setAttribute('fill','transparent');circ.setAttribute('stroke','none');circ.style.cursor='pointer';
    var title=document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent=(p.date||'Trade #'+i)+': '+f$(p.y);
    circ.appendChild(title);svg.appendChild(circ);
  });
  // End dot with glow
  const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
  dot.setAttribute('cx',px(maxX));dot.setAttribute('cy',py(cum));dot.setAttribute('r','4');
  dot.setAttribute('fill',color);dot.setAttribute('filter','drop-shadow(0 0 6px '+color+')');
  dot.style.opacity='0';dot.style.transition='opacity .6s ease .8s';
  svg.appendChild(dot);
  requestAnimationFrame(function(){dot.style.opacity='1';});
  document.getElementById('eq-total').textContent=f$(cum);
}

// ══════════════════════════════════════════════════════════
// DONUT CHART
// ══════════════════════════════════════════════════════════
function drawDonut(){
  const c=document.getElementById('donut-c');
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,170,170);
  const wins=S.trades.filter(t=>(t.netPnl||t.pnl||0)>0).length;
  const losses=S.trades.filter(t=>(t.netPnl||t.pnl||0)<0).length;
  const total=wins+losses;
  const cx=85,cy=85,r=65,ir=42;
  if(!total){
    ctx.fillStyle='#3d4f6e';ctx.font='11px IBM Plex Mono';ctx.textAlign='center';ctx.fillText('No data',cx,cy+4);return;
  }
  const wa=(wins/total)*Math.PI*2;
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+wa);ctx.fillStyle='#00e5a0';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,-Math.PI/2+wa,-Math.PI/2+Math.PI*2);ctx.fillStyle='#ff3d5a';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);ctx.fillStyle='#0c0f17';ctx.fill();
  ctx.fillStyle='#e8edf8';ctx.font='bold 16px IBM Plex Mono';ctx.textAlign='center';ctx.fillText(fpct(wins/total),cx,cy+4);
  ctx.fillStyle='#3d4f6e';ctx.font='9px IBM Plex Mono';ctx.fillText('WIN RATE',cx,cy+18);
  ctx.fillStyle='#00e5a0';ctx.fillRect(14,155,8,8);ctx.fillStyle='#7b8db0';ctx.font='10px Manrope';ctx.textAlign='left';ctx.fillText(`${wins} Wins`,26,163);
  ctx.fillStyle='#ff3d5a';ctx.fillRect(90,155,8,8);ctx.fillStyle='#7b8db0';ctx.fillText(`${losses} Losses`,102,163);
}

// ══════════════════════════════════════════════════════════
// DOW CHART
// ══════════════════════════════════════════════════════════
function drawDOW(){
  const c=document.getElementById('dow-c');
  c.width=c.parentElement.clientWidth||400;
  const ctx=c.getContext('2d');
  const W=c.width,H=120;
  ctx.clearRect(0,0,W,H);
  const days=['Mon','Tue','Wed','Thu','Fri'];
  const byDay=[0,0,0,0,0];
  S.trades.forEach(t=>{
    const d=new Date((t.date||'2000-01-01')+'T12:00:00').getDay();
    const idx=[1,2,3,4,5].indexOf(d);
    if(idx>=0)byDay[idx]+=(t.netPnl||t.pnl||0);
  });
  const max=Math.max(...byDay.map(Math.abs))||1;
  const bw=(W-40)/5,pad=6,barH=H-30;
  days.forEach((d,i)=>{
    const x=20+i*bw+pad/2,bwi=bw-pad,v=byDay[i];
    const h=Math.abs(v/max)*barH*.75;
    const y=v>=0?H-20-h:H-20;
    ctx.fillStyle=v>=0?'rgba(0,229,160,0.7)':'rgba(255,61,90,0.7)';
    if(h>0)ctx.fillRect(x,y,bwi,h);
    ctx.fillStyle='#3d4f6e';ctx.font='9px IBM Plex Mono';ctx.textAlign='center';
    ctx.fillText(d,x+bwi/2,H-5);
    if(Math.abs(v)>0){
      ctx.fillStyle=v>=0?'#00e5a0':'#ff3d5a';
      ctx.font='8px IBM Plex Mono';
      ctx.fillText((v>=0?'+':'')+v.toFixed(0),x+bwi/2,v>=0?y-3:y+h+10);
    }
  });
}

// ══════════════════════════════════════════════════════════
// KILLZONE CHART
// ══════════════════════════════════════════════════════════
function drawKZChart(){
  const kzMap={};
  S.trades.forEach(t=>{
    const kz=t.killzone||'Unknown';
    if(!kzMap[kz])kzMap[kz]={pnl:0,cnt:0,wins:0};
    kzMap[kz].pnl+=(t.netPnl||t.pnl||0);
    kzMap[kz].cnt++;
    if((t.netPnl||t.pnl||0)>0)kzMap[kz].wins++;
  });
  const el=document.getElementById('kz-chart');
  if(!Object.keys(kzMap).length){el.innerHTML='<p style="font-size:.72rem;color:var(--t3);padding:10px 0">No killzone data yet.</p>';return;}
  const maxPnl=Math.max(...Object.values(kzMap).map(v=>Math.abs(v.pnl)))||1;
  el.innerHTML=Object.entries(kzMap).sort((a,b)=>b[1].pnl-a[1].pnl).map(([kz,v])=>`
    <div class="kz-row">
      <span class="kz-name">${kz.split(' ')[0]}</span>
      <div class="kz-bar"><div class="kz-fill" style="width:${Math.abs(v.pnl/maxPnl)*100}%;background:${v.pnl>=0?'linear-gradient(90deg,var(--green),var(--accent))':'linear-gradient(90deg,var(--red),#ff7090)'}"></div></div>
      <span class="kz-val" style="color:${v.pnl>=0?'var(--green)':'var(--red)'}">${f$(v.pnl)} <span style="color:var(--t3)">${v.cnt}T</span></span>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// TRADING CALENDAR
// ══════════════════════════════════════════════════════════
var calDate=new Date();
