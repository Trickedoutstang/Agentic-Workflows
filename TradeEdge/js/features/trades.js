// TradeEdge — Trade Log

function setF(f,el){
  tradeFilter=f;
  document.querySelectorAll('.fchip').forEach(e=>e.classList.remove('on'));
  el.classList.add('on');renderTrades();
}
function renderTrades(){
  const q=(document.getElementById('srch')||{}).value?.toLowerCase()||'';
  let trades=[...S.trades].sort((a,b)=>new Date(b.date+' '+(b.time||'00:00'))-new Date(a.date+' '+(a.time||'00:00')));
  if(q)trades=trades.filter(t=>t.symbol?.toLowerCase().includes(q)||(t.tags||[]).some(g=>g.toLowerCase().includes(q))||t.setup?.toLowerCase().includes(q));
  if(tradeFilter==='win')trades=trades.filter(t=>(t.netPnl||t.pnl||0)>0);
  if(tradeFilter==='loss')trades=trades.filter(t=>(t.netPnl||t.pnl||0)<0);
  if(tradeFilter==='long')trades=trades.filter(t=>t.side?.toLowerCase()==='long'||t.side==='Buy');
  if(tradeFilter==='short')trades=trades.filter(t=>t.side?.toLowerCase()==='short'||t.side==='Sell');
  const tbody=document.getElementById('trade-tbody');
  const empty=document.getElementById('trade-empty');
  document.getElementById('tlog-count').textContent=`${trades.length} trades`;
  empty.style.display=trades.length?'none':'block';
  tbody.innerHTML=trades.map(t=>{
    const idx=S.trades.indexOf(t);
    const pnl=t.netPnl||t.pnl||0;
    const isLong=t.side?.toLowerCase()==='long'||t.side==='Buy';
    const rr=t.rr?fnum(t.rr)+'R':'—';
    const tags=(t.tags||[]).map(g=>{
      const isICT=['FVG','Order Block','Breaker Block','Liquidity Sweep','OTE','Turtle Soup','Judas Swing','MSS','Silver Bullet','1st Presented FVG','ORG'].includes(g);
      return `<span class="tag ${isICT?'ict-tag':''}">${escapeHtml(g)}</span>`;
    }).join('');
    return `<tr onclick="editTrade(${idx})">
      <td class="mono">${t.date||'—'}</td>
      <td class="mono" style="color:var(--t3)">${t.time||'—'}</td>
      <td class="sym">${escapeHtml(t.symbol)||'—'}</td>
      <td><span class="bdg ${isLong?'bdg-long':'bdg-short'}">${isLong?'LONG':'SHORT'}</span></td>
      <td class="mono">${t.qty||1}</td>
      <td class="mono">${t.entry||'—'}</td>
      <td class="mono">${t.exit||'—'}</td>
      <td class="mono" style="color:var(--red)">${t.slPrice||t.sl||'—'}${t.slDollar?'<br><span style="font-size:.65rem;opacity:.7">'+f$(t.slDollar)+'</span>':''}${(t.slHistory||[]).length>1?'<br><span style="font-size:.6rem;color:var(--gold)">'+t.slHistory.length+' adj</span>':''}</td>
      <td class="mono" style="color:var(--green)">${t.tpPrice||t.tp||'—'}${t.tpDollar?'<br><span style="font-size:.65rem;opacity:.7">'+f$(t.tpDollar)+'</span>':''}${(t.tpHistory||[]).length>1?'<br><span style="font-size:.6rem;color:var(--gold)">'+t.tpHistory.length+' adj</span>':''}</td>
      <td class="mono" style="color:${pnl>=0?'var(--green)':'var(--red)'}">${f$(t.pnl)}</td>
      <td class="mono" style="color:var(--t3)">${t.fees?f$(-t.fees):'—'}</td>
      <td class="mono" style="color:${pnl>=0?'var(--green)':'var(--red)'};font-weight:600">${f$(pnl)}</td>
      <td class="mono">${t.rr?fnum(t.rr)+'R':'—'}</td>
      <td class="mono" style="font-size:.68rem;color:${t.exitReason==='TP Hit'?'var(--green)':t.exitReason==='SL Hit'?'var(--red)':'var(--t3)'}">${escapeHtml(t.exitReason)||'—'}</td>
      <td>${tags||'<span style="color:var(--t3)">—</span>'}</td>
      <td><span class="tag kz-tag" style="display:${t.killzone?'inline-flex':'none'}">${escapeHtml(t.killzone)}</span></td>
      <td style="font-size:.85rem">${escapeHtml(t.emotion)||'—'}</td>
      <td style="color:var(--gold)">${'★'.repeat(t.rating||0)}</td>
      <td><span class="bdg ${pnl>=0?'bdg-win':'bdg-loss'}">${pnl>=0?'WIN':'LOSS'}</span></td>
      <td>${t.chartImg?`<a href="${escapeHtml(t.chartImg)}" target="_blank" onclick="event.stopPropagation()" title="View screenshot" style="color:var(--accent);font-size:.85rem;text-decoration:none">📷</a>`:t.chartUrl?`<a href="${escapeHtml(t.chartUrl)}" target="_blank" onclick="event.stopPropagation()" title="View chart" style="color:var(--accent2);font-size:.85rem;text-decoration:none">📊</a>`:'<span style="color:var(--t3);font-size:.75rem">—</span>'}</td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// ADD / EDIT TRADE
// ══════════════════════════════════════════════════════════
const ICT_TAGS=[
  {t:'FVG',type:'ict'},{t:'Order Block',type:'ict'},{t:'Breaker Block',type:'ict'},
  {t:'Liquidity Sweep',type:'ict'},{t:'OTE',type:'ict'},{t:'Turtle Soup',type:'ict'},
  {t:'Judas Swing',type:'ict'},{t:'MSS',type:'ict'},{t:'Silver Bullet',type:'ict'},
  {t:'1st Presented FVG',type:'ict'},{t:'ORG',type:'ict'},
  {t:'London KZ',type:'kz'},{t:'NY AM KZ',type:'kz'},{t:'NY PM KZ',type:'kz'},
  {t:'Macro Window',type:'kz'},{t:'News Event',type:'kz'},
];
const CKL_ITEMS=[
  'HTF Bias correct? (Daily/4H aligned)',
  'Did I wait for Killzone?',
  'Did I identify liquidity target first?',
  'Was there a MSS/ChoCH before entry?',
  'Did I enter on LTF confirmation?',
  'Did I take partials at 50% of range?',
  'Did I let it run to the target?',
  'Was there a news event I ignored?',
  'Did I trade during a Macro window?',
];

function openTrade(){
  S.editIdx=null;S.curTags=[];S.curRating=0;
  document.getElementById('trade-modal-title').textContent='Add Trade';
  document.getElementById('del-btn').style.display='none';
  document.getElementById('f-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('f-time').value='';
  document.getElementById('f-sym').value='MNQ';
  document.getElementById('f-side').value='Long';
  document.getElementById('f-qty').value=1;
  document.getElementById('f-kz').value='';
  document.getElementById('f-entry').value='';
  document.getElementById('f-exit').value='';
  document.getElementById('f-sl').value='';
  document.getElementById('f-tp').value='';
  document.getElementById('f-pnl').value='';
  document.getElementById('f-fees').value=feeForSymbol('MNQ');
  document.getElementById('f-bias').value='';
  document.getElementById('f-notes').value='';
  document.getElementById('f-chart-url').value='';
  document.getElementById('img-preview-wrap').style.display='none';
  document.querySelectorAll('#emo-grid .emo').forEach(e=>e.classList.remove('sel'));
  document.querySelectorAll('#mistake-grid .mk').forEach(e=>e.classList.remove('sel'));
  renderTagWrap();renderTagSuggestions();renderChecklist();renderStars();
  openModal('trade-overlay');
}
function editTrade(idx){
  const t=S.trades[idx];S.editIdx=idx;S.curTags=[...(t.tags||[])];S.curRating=t.rating||0;
  document.getElementById('trade-modal-title').textContent='Edit Trade';
  document.getElementById('del-btn').style.display='';
  document.getElementById('f-date').value=t.date||'';
  document.getElementById('f-time').value=t.time||'';
  document.getElementById('f-sym').value=t.symbol||'MNQ';
  document.getElementById('f-side').value=t.side||'Long';
  document.getElementById('f-qty').value=t.qty||1;
  document.getElementById('f-kz').value=t.killzone||'';
  document.getElementById('f-entry').value=t.entry||'';
  document.getElementById('f-exit').value=t.exit||'';
  document.getElementById('f-sl').value=t.slPrice||t.sl||'';
  document.getElementById('f-tp').value=t.tpPrice||t.tp||'';
  document.getElementById('f-pnl').value=t.pnl||'';
  document.getElementById('f-fees').value=t.fees||0;
  document.getElementById('f-bias').value=t.bias||'';
  document.getElementById('f-notes').value=t.notes||'';
  document.getElementById('f-chart-url').value=t.chartUrl||'';
  document.querySelectorAll('#emo-grid .emo').forEach(e=>{e.classList.toggle('sel',e.textContent.trim()===t.emotion)});
  document.querySelectorAll('#mistake-grid .mk').forEach(e=>{e.classList.toggle('sel',(t.mistakes||[]).includes(e.textContent.trim()))});
  if(t.chartImg){document.getElementById('img-preview').src=t.chartImg;document.getElementById('img-preview-link').href=t.chartImg;document.getElementById('img-preview-wrap').style.display='block';}
  else document.getElementById('img-preview-wrap').style.display='none';
  // Render SL/TP reconstruction info
  const sltpEl=document.getElementById('sltp-info');
  if(sltpEl){
    const hasSLTP=(t.slPrice||t.tpPrice||t.exitReason);
    if(hasSLTP){
      let html=`<div style="font-size:.72rem;font-family:var(--mono);padding:10px;background:var(--s2);border-radius:8px;margin-bottom:12px">`;
      html+=`<div style="font-weight:600;color:var(--accent);margin-bottom:6px">📊 AUTO-DETECTED FROM CANCELLED ORDERS</div>`;
      if(t.exitReason) html+=`<div style="margin-bottom:4px">Exit: <strong style="color:${t.exitReason==='TP Hit'?'var(--green)':t.exitReason==='SL Hit'?'var(--red)':'var(--gold)'}">${t.exitReason}</strong>${t.actualR!=null?' ('+fnum(t.actualR)+'R)':''}</div>`;
      if(t.slPrice) html+=`<div style="margin-bottom:4px">SL: <strong style="color:var(--red)">${t.slPrice}</strong> <span style="color:var(--t3)">(${f$(t.slDollar)} risk)</span></div>`;
      if(t.tpPrice) html+=`<div style="margin-bottom:4px">TP: <strong style="color:var(--green)">${t.tpPrice}</strong> <span style="color:var(--t3)">(${f$(t.tpDollar)} target)</span></div>`;
      if(t.rr) html+=`<div style="margin-bottom:4px">Planned R:R: <strong style="color:var(--accent)">${fnum(t.rr)}</strong></div>`;
      // Show adjustment history
      if((t.slHistory||[]).length>1){
        html+=`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--s3)"><strong style="color:var(--gold)">SL Adjustments (${t.slHistory.length}):</strong></div>`;
        t.slHistory.forEach((h,i)=>{
          html+=`<div style="color:var(--t2);padding-left:8px">${i+1}. ${h.price} (${f$(h.dollar)}) — ${h.time||''}</div>`;
        });
      }
      if((t.tpHistory||[]).length>1){
        html+=`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--s3)"><strong style="color:var(--gold)">TP Adjustments (${t.tpHistory.length}):</strong></div>`;
        t.tpHistory.forEach((h,i)=>{
          html+=`<div style="color:var(--t2);padding-left:8px">${i+1}. ${h.price} (${f$(h.dollar)}) — ${h.time||''}</div>`;
        });
      }
      html+=`</div>`;
      sltpEl.innerHTML=html;
      sltpEl.style.display='block';
    } else {
      sltpEl.innerHTML='';
      sltpEl.style.display='none';
    }
  }
  renderTagWrap();renderTagSuggestions();
  renderChecklist(t.checklist||{});
  renderStars();openModal('trade-overlay');
}
function saveTrade(){
  const sym=document.getElementById('f-sym').value;
  const pnl=parseFloat(document.getElementById('f-pnl').value)||0;
  const fees=parseFloat(document.getElementById('f-fees').value)||feeForSymbol(sym);
  const _pf=id=>{const v=parseFloat(document.getElementById(id).value);return isNaN(v)?null:v;};
  const entry=_pf('f-entry');
  const exit=_pf('f-exit');
  const sl=_pf('f-sl');
  const tp=_pf('f-tp');
  const side=document.getElementById('f-side').value;
  let rr=null;
  if(entry&&sl&&tp){
    const risk=Math.abs(entry-sl);const reward=Math.abs(tp-entry);
    if(risk>0)rr=reward/risk;
  }
  const checklist={};
  document.querySelectorAll('#checklist .ck-item').forEach(el=>{
    checklist[el.dataset.key]=el.classList.contains('checked');
  });
  const emotion=document.querySelector('#emo-grid .emo.sel')?.textContent.trim()||'';
  const mistakes=[...document.querySelectorAll('#mistake-grid .mk.sel')].map(e=>e.textContent.trim());
  // Preserve reconstructed SL/TP data from existing trade
  const existing=S.editIdx!=null?S.trades[S.editIdx]:{};
  const trade={
    date:document.getElementById('f-date').value,
    time:document.getElementById('f-time').value,
    symbol:sym,side,qty:parseInt(document.getElementById('f-qty').value)||1,
    killzone:document.getElementById('f-kz').value,
    entry,exit,sl,tp,
    slPrice:sl||existing.slPrice||null,
    tpPrice:tp||existing.tpPrice||null,
    slDollar:existing.slDollar||null,
    tpDollar:existing.tpDollar||null,
    slHistory:existing.slHistory||[],
    tpHistory:existing.tpHistory||[],
    entryOrderId:existing.entryOrderId||null,
    exitOrderId:existing.exitOrderId||null,
    entryPlacingTime:existing.entryPlacingTime||null,
    exitPlacingTime:existing.exitPlacingTime||null,
    entryOrderType:existing.entryOrderType||null,
    exitOrderType:existing.exitOrderType||null,
    exitReason:existing.exitReason||null,
    actualR:existing.actualR||null,
    pnl,fees,netPnl:pnl-fees,rr:rr||existing.rr||null,
    tags:[...S.curTags],checklist,
    bias:document.getElementById('f-bias').value,
    emotion,mistakes,rating:S.curRating,
    notes:document.getElementById('f-notes').value,
    chartUrl:document.getElementById('f-chart-url').value,
    chartImg:document.getElementById('img-preview').src&&document.getElementById('img-preview-wrap').style.display!=='none'?document.getElementById('img-preview').src:null,
    importedAt:existing.importedAt||new Date().toISOString(),
    source:existing.source||'Manual'
  };
  if(S.editIdx!=null)S.trades[S.editIdx]=trade;
  else S.trades.push(trade);
  save();closeModal('trade-overlay');toast('Trade saved ✓','ok');
  renderTrades();updateSidebar();
  // Change 24: Check trading rules after save
  var violations=_checkTradeRules(trade);
  if(violations.length)setTimeout(function(){triggerNuclearAlarm(violations);},300);
}
function deleteTrade(){
  if(!confirm('Delete this trade?'))return;
  S.trades.splice(S.editIdx,1);save();closeModal('trade-overlay');toast('Trade deleted','ok');
  renderTrades();updateSidebar();
}
function feeForSymbol(sym){
  return S.feeRates[sym]||2.25;
}
function escapeHtml(s){
  if(!s)return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ══════════════════════════════════════════════════════════
// TAGS
