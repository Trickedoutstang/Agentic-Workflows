// TradeEdge — ICT Analytics

function renderICT(){
  // Setup win rates
  const setups={};
  S.trades.forEach(t=>{
    (t.tags||[]).forEach(tag=>{
      if(!setups[tag])setups[tag]={wins:0,total:0,pnl:0};
      setups[tag].total++;setups[tag].pnl+=(t.netPnl||t.pnl||0);
      if((t.netPnl||t.pnl||0)>0)setups[tag].wins++;
    });
  });
  document.getElementById('ict-setups').innerHTML=Object.keys(setups).length?
    Object.entries(setups).sort((a,b)=>b[1].pnl-a[1].pnl).map(([s,v])=>`
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="font-family:var(--mono);font-size:.72rem;color:var(--gold)">${escapeHtml(s)}</span>
          <span style="font-family:var(--mono);font-size:.7rem">
            <span style="color:${v.pnl>=0?'var(--green)':'var(--red)'}">${f$(v.pnl)}</span>
            <span style="color:var(--t3);margin-left:8px">${fpct(v.wins/v.total)} WR · ${v.total}T</span>
          </span>
        </div>
        <div class="prog"><div class="prog-fill" style="width:${(v.wins/v.total)*100}%;background:${v.wins/v.total>=0.5?'var(--green)':'var(--red)'}"></div></div>
      </div>`).join('')
    :'<p style="font-size:.72rem;color:var(--t3)">Add ICT setup tags to your trades to see win rates by concept.</p>';

  // Killzone perf
  const kzPerf={};
  S.trades.forEach(t=>{
    const kz=t.killzone||'Unknown';
    if(!kzPerf[kz])kzPerf[kz]={wins:0,total:0,pnl:0};
    kzPerf[kz].total++;kzPerf[kz].pnl+=(t.netPnl||t.pnl||0);
    if((t.netPnl||t.pnl||0)>0)kzPerf[kz].wins++;
  });
  document.getElementById('kz-perf').innerHTML=Object.entries(kzPerf).sort((a,b)=>b[1].pnl-a[1].pnl).map(([kz,v])=>`
    <div class="stat-row">
      <span class="stat-k" style="color:var(--accent2)">${escapeHtml(kz)}</span>
      <span class="stat-v">
        <span style="color:${v.pnl>=0?'var(--green)':'var(--red)'}">${f$(v.pnl)}</span>
        <span style="color:var(--t3);font-size:.65rem;margin-left:6px">${fpct(v.wins/v.total)} WR</span>
      </span>
    </div>`).join('')||'<p style="font-size:.72rem;color:var(--t3)">No killzone data yet.</p>';

  // Checklist compliance
  const cklTotals={};const cklChecked={};
  S.trades.forEach(t=>{
    Object.entries(t.checklist||{}).forEach(([k,v])=>{
      cklTotals[k]=(cklTotals[k]||0)+1;
      if(v)cklChecked[k]=(cklChecked[k]||0)+1;
    });
  });
  document.getElementById('ckl-compliance').innerHTML=Object.keys(cklTotals).length?
    CKL_ITEMS.filter(k=>cklTotals[k]).map(k=>{
      const rate=(cklChecked[k]||0)/(cklTotals[k]||1);
      return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:.68rem;color:var(--t2)">${k.substring(0,35)}${k.length>35?'…':''}</span>
          <span style="font-family:var(--mono);font-size:.68rem;color:${rate>=0.7?'var(--green)':'var(--red)'}">${fpct(rate)}</span>
        </div>
        <div class="prog"><div class="prog-fill" style="width:${rate*100}%;background:${rate>=0.7?'var(--green)':'var(--red)'}"></div></div>
      </div>`;}).join('')
    :'<p style="font-size:.72rem;color:var(--t3)">Complete the ICT checklist on trades to see compliance.</p>';

  // Bias accuracy
  const biasCorrect=S.trades.filter(t=>t.bias&&((t.bias==='Bullish'&&(t.netPnl||t.pnl||0)>0)||(t.bias==='Bearish'&&(t.netPnl||t.pnl||0)<0))).length;
  const biasTotal=S.trades.filter(t=>t.bias&&t.bias!=='Neutral').length;
  document.getElementById('bias-stats').innerHTML=`
    <div class="stat-row"><span class="stat-k">HTF Bias Accuracy</span><span class="stat-v" style="color:${biasTotal?fpct(biasCorrect/biasTotal):'—'}">${biasTotal?fpct(biasCorrect/biasTotal):'—'}</span></div>
    <div class="stat-row"><span class="stat-k">Bullish Bias Trades</span><span class="stat-v">${S.trades.filter(t=>t.bias==='Bullish').length}</span></div>
    <div class="stat-row"><span class="stat-k">Bearish Bias Trades</span><span class="stat-v">${S.trades.filter(t=>t.bias==='Bearish').length}</span></div>
    <div class="stat-row"><span class="stat-k">Traded Against Bias</span><span class="stat-v" style="color:var(--red)">${biasTotal-biasCorrect}</span></div>`;

  // Change 30: ICT-specific additional metrics
  // Silver Bullet Win Rate (10-11 AM ET window)
  var sbTrades=S.trades.filter(function(t){
    if(!t.time)return false;
    var parts=t.time.split(':');var h=parseInt(parts[0],10),m=parseInt(parts[1],10);
    return h===10; // 10:00-10:59 AM
  });
  var sbWins=sbTrades.filter(function(t){return(t.netPnl||t.pnl||0)>0;}).length;
  // Kill Zone Expectancy per zone
  var kzExp={};
  Object.entries(kzPerf).forEach(function(pair){
    var kz=pair[0],v=pair[1];
    var wr=v.total>0?v.wins/v.total:0;
    var zoneWins=S.trades.filter(function(t){return(t.killzone||'Unknown')===kz&&(t.netPnl||t.pnl||0)>0;});
    var zoneLoss=S.trades.filter(function(t){return(t.killzone||'Unknown')===kz&&(t.netPnl||t.pnl||0)<0;});
    var avgW=zoneWins.length?zoneWins.reduce(function(a,t){return a+(t.netPnl||t.pnl||0);},0)/zoneWins.length:0;
    var avgL=zoneLoss.length?Math.abs(zoneLoss.reduce(function(a,t){return a+(t.netPnl||t.pnl||0);},0)/zoneLoss.length):0;
    kzExp[kz]=(wr*avgW)-((1-wr)*avgL);
  });
  // Revenge trade rate
  var revengeCount=S.trades.filter(function(t){return(t.mistakes||[]).includes('Revenge Trade');}).length;
  var revengePct=S.trades.length>0?revengeCount/S.trades.length:0;
  // Execution rating avg
  var ratedTrades=S.trades.filter(function(t){return t.rating>0;});
  var avgRating=ratedTrades.length>0?ratedTrades.reduce(function(a,t){return a+t.rating;},0)/ratedTrades.length:0;

  // Append ICT metrics to bias-stats area
  var ictExtra='<div style="margin-top:12px;border-top:1px solid var(--b1);padding-top:10px">';
  ictExtra+='<div class="stat-row"><span class="stat-k">Silver Bullet WR (10-11am)</span><span class="stat-v" style="color:var(--accent)">'+(sbTrades.length>0?fpct(sbWins/sbTrades.length):'—')+' ('+sbTrades.length+'T)</span></div>';
  // KZ Expectancy
  Object.entries(kzExp).forEach(function(pair){
    ictExtra+='<div class="stat-row"><span class="stat-k">'+pair[0]+' Expectancy</span><span class="stat-v" style="color:'+(pair[1]>=0?'var(--green)':'var(--red)')+'">'+f$(pair[1])+'</span></div>';
  });
  ictExtra+='<div class="stat-row"><span class="stat-k">Revenge Trade Rate</span><span class="stat-v" style="color:'+(revengePct>0?'var(--red)':'var(--green)')+'">'+fpct(revengePct)+'</span></div>';
  ictExtra+='<div class="stat-row"><span class="stat-k">Avg Execution Rating</span><span class="stat-v">'+fnum(avgRating,1)+'/5</span></div>';
  ictExtra+='</div>';
  document.getElementById('bias-stats').innerHTML+=ictExtra;

  // V2.1: Hold Time by Killzone
  var kzHold={};
  S.trades.forEach(function(t){
    var kz=t.killzone||'Unknown';
    var holdMin=null;
    if(t.entryPlacingTime&&t.exitPlacingTime){
      var e1=new Date(t.entryPlacingTime.replace(' ','T'));
      var x1=new Date(t.exitPlacingTime.replace(' ','T'));
      if(!isNaN(e1)&&!isNaN(x1))holdMin=Math.round((x1-e1)/60000);
    } else if(t.date&&t.time&&t.exitTime){
      var e2=new Date(t.date+'T'+t.time);
      var x2=new Date(t.date+'T'+t.exitTime);
      if(!isNaN(e2)&&!isNaN(x2))holdMin=Math.round((x2-e2)/60000);
    }
    if(holdMin!=null&&holdMin>=0){
      if(!kzHold[kz])kzHold[kz]={total:0,count:0};
      kzHold[kz].total+=holdMin;kzHold[kz].count++;
    }
  });
  var kzHoldEl=document.getElementById('kz-hold-times');
  if(kzHoldEl){
    var entries=Object.entries(kzHold);
    if(entries.length){
      kzHoldEl.innerHTML=entries.sort(function(a,b){return(b[1].total/b[1].count)-(a[1].total/a[1].count);}).map(function(pair){
        var kz=pair[0],v=pair[1],avg=v.total/v.count;
        return '<div class="stat-row"><span class="stat-k" style="color:var(--accent2)">'+escapeHtml(kz)+'</span><span class="stat-v">'+fhold(avg)+' <span style="color:var(--t3);font-size:.65rem;margin-left:6px">'+v.count+' trades</span></span></div>';
      }).join('');
    } else {
      kzHoldEl.innerHTML='<p style="font-size:.72rem;color:var(--t3)">No hold time data available. Trades need entry/exit timestamps.</p>';
    }
  }
}

// ══════════════════════════════════════════════════════════
// WEEKLY REPORT
// ══════════════════════════════════════════════════════════
