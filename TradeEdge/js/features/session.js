// TradeEdge — Session Workflow

function openPreSession(){
  const now=new Date();
  document.getElementById('sesh-time-label').textContent=`PRE-SESSION CHECK-IN · ${now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} ET`;
  document.getElementById('ps-sleep').value=7;document.getElementById('ps-sleep-val').textContent='7';
  document.getElementById('ps-energy').value=7;document.getElementById('ps-energy-val').textContent='7';
  document.getElementById('ps-conf').value=7;document.getElementById('ps-conf-val').textContent='7';
  document.getElementById('ps-coffee').classList.remove('on');
  document.getElementById('ps-cal').classList.remove('on');
  document.getElementById('ps-htf').classList.remove('on');
  document.getElementById('ps-bias').value='';
  document.getElementById('ps-notes').value='';
  document.getElementById('pre-sesh-overlay').classList.add('open');
}
function savePreSession(){
  const entry={
    date:new Date().toISOString().split('T')[0],
    sleep:document.getElementById('ps-sleep').value,
    energy:document.getElementById('ps-energy').value,
    confidence:document.getElementById('ps-conf').value,
    coffee:document.getElementById('ps-coffee').classList.contains('on')?'yes':'no',
    checkedCal:document.getElementById('ps-cal').classList.contains('on'),
    reviewedHTF:document.getElementById('ps-htf').classList.contains('on'),
    bias:document.getElementById('ps-bias').value,
    pre:document.getElementById('ps-notes').value,
    createdAt:new Date().toISOString(),
  };
  // Merge with existing journal entry for today if exists
  const existing=S.journal.findIndex(j=>j.date===entry.date);
  if(existing>=0)S.journal[existing]={...S.journal[existing],...entry};
  else S.journal.push(entry);
  save();closeSession();toast('Session started — good luck! 🎯','ok');
}
function logTradeJournal(){
  renderChecklist();
  document.getElementById('pt-sym').value='MNQ';
  document.getElementById('pt-result').value='win';
  document.getElementById('pt-pnl').value='';
  document.getElementById('pt-setup').value='';
  document.getElementById('pt-notes').value='';
  document.getElementById('pt-chart').value='';
  document.querySelectorAll('#pt-emo .emo').forEach(e=>e.classList.remove('sel'));
  document.querySelectorAll('#pt-mistakes .mk').forEach(e=>e.classList.remove('sel'));
  document.getElementById('post-trade-overlay').classList.add('open');
}
function savePostTrade(){
  const checklist={};
  document.querySelectorAll('#pt-checklist .ck-item').forEach(el=>{
    checklist[el.dataset.key]=el.classList.contains('checked');
  });
  const emotion=document.querySelector('#pt-emo .emo.sel')?.textContent.trim()||'';
  const mistakes=[...document.querySelectorAll('#pt-mistakes .mk.sel')].map(e=>e.textContent.trim());
  const sym=document.getElementById('pt-sym').value;
  const pnl=parseFloat(document.getElementById('pt-pnl').value)||0;
  const fees=feeForSymbol(sym);
  const trade={
    date:new Date().toISOString().split('T')[0],
    time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}),
    symbol:sym,side:'Long',qty:1,
    pnl,fees,netPnl:pnl-fees,
    tags:[document.getElementById('pt-setup').value].filter(Boolean),
    checklist,emotion,mistakes,
    notes:document.getElementById('pt-notes').value,
    chartUrl:document.getElementById('pt-chart').value,
    importedAt:new Date().toISOString(),
  };
  S.trades.push(trade);save();
  closeSession('post-trade-overlay');toast('Trade logged ✓','ok');
  updateSidebar();
}
function closeSession(id='pre-sesh-overlay'){document.getElementById(id).classList.remove('open');}

// ══════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════
