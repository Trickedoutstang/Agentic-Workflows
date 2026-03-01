// TradeEdge — Settings

function renderSettings(){
  const syms=['MNQ','MES','NQ','ES','YM','MYM','RTY','M2K','CL','MCL','GC','MGC','SI','SIL','NG','HG','ZB','ZN','ZC','ZS','ZW'];
  document.getElementById('fee-settings').innerHTML=syms.map(s=>`
    <div class="fg" style="margin-bottom:10px;display:inline-block;width:48%;margin-right:1%">
      <label>${s} — Fee/contract/side ($)</label>
      <input type="number" id="fee-${s}" step=".01" value="${S.feeRates[s]||2.25}" placeholder="e.g. 0.90">
    </div>`).join('');
  if(S.ampStatements&&S.ampStatements.length){renderAMPStatements();}
  else if(S.ampFees&&S.ampFees.total){
    document.getElementById('amp-fees-display').innerHTML=`
      <div class="stat-row"><span class="stat-k">Total RT</span><span class="stat-v" style="color:var(--red)">$${S.ampFees.total.toFixed(2)}</span></div>`;
  }
  // Change 23: Populate trading rules
  var rules=S.rules||{maxTradesPerDay:3,maxContractsPerTrade:1,maxDailyLoss:50,alarmEnabled:true};
  var rmt=document.getElementById('rule-max-trades');if(rmt)rmt.value=rules.maxTradesPerDay||3;
  var rmc=document.getElementById('rule-max-contracts');if(rmc)rmc.value=rules.maxContractsPerTrade||1;
  var rml=document.getElementById('rule-max-loss');if(rml)rml.value=rules.maxDailyLoss||50;
  var rae=document.getElementById('rule-alarm-enabled');if(rae)rae.checked=rules.alarmEnabled!==false;
  // V2.1: Populate live data URL
  var liveUrlEl=document.getElementById('set-live-url');if(liveUrlEl)liveUrlEl.value=S.liveDataUrl||'';
  // Webhook settings
  var whUrl=document.getElementById('set-webhook-url');if(whUrl)whUrl.value=S.webhookUrl||'http://localhost:5050';
  var whAuto=document.getElementById('set-webhook-auto');if(whAuto)whAuto.checked=S.webhookAutoImport===true;
  // Change 27: Render violation history
  var vhEl=document.getElementById('violation-history');
  if(vhEl&&S.violations&&S.violations.length){
    var vhtml='<div style="font-family:var(--mono);font-size:.7rem;color:var(--t3);letter-spacing:1px;margin-bottom:6px">VIOLATION HISTORY ('+S.violations.length+')</div>';
    S.violations.slice(-10).reverse().forEach(function(v){
      vhtml+='<div style="font-size:.72rem;color:var(--red);margin-bottom:4px;padding:4px 8px;background:rgba(255,61,90,0.05);border-radius:4px">'+v.date+' '+v.time+' — '+v.msg+'</div>';
    });
    vhEl.innerHTML=vhtml;
  }
}
function saveFees(){
  ['MNQ','MES','NQ','ES','YM','MYM','RTY','M2K','CL','MCL','GC','MGC','SI','SIL','NG','HG','ZB','ZN','ZC','ZS','ZW'].forEach(s=>{
    const el=document.getElementById('fee-'+s);
    if(el){const v=parseFloat(el.value);if(!isNaN(v))S.feeRates[s]=v;}
  });
  save();toast('Fee rates saved ✓','ok');
}

// ══════════════════════════════════════════════════════════
// EXPORT / BACKUP
// ══════════════════════════════════════════════════════════
function exportCSV(){
  if(!S.trades.length){toast('No trades to export','err');return;}
  const keys=['date','time','symbol','side','qty','entry','exit','sl','tp','pnl','fees','netPnl','rr','killzone','emotion','rating','notes','chartUrl'];
  const csv=[keys.join(','),...S.trades.map(t=>keys.map(k=>JSON.stringify(t[k]??'')).join(','))].join('\n');
  dl(csv,'tradeedge-trades.csv','text/csv');
}
function exportAllCSV(){exportCSV();}
function exportJSON(){
  dl(JSON.stringify({trades:S.trades,journal:S.journal,feeRates:S.feeRates,ampStatements:S.ampStatements||[],importLog:S.importLog||[]},null,2),'tradeedge-backup.json','application/json');
}
function importJSON(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.trades)S.trades=[...S.trades,...data.trades];
        if(data.journal)S.journal=[...S.journal,...data.journal];
        if(data.feeRates)S.feeRates={...S.feeRates,...data.feeRates};
        if(data.ampStatements){if(!S.ampStatements)S.ampStatements=[];S.ampStatements.push(...data.ampStatements);}
        if(data.importLog){if(!S.importLog)S.importLog=[];S.importLog.push(...data.importLog);}
        save();toast(`✓ Restored ${data.trades?.length||0} trades`,'ok');
        updateSidebar();go('dashboard');
      }catch(err){toast('Invalid backup file','err');}
    };r.readAsText(f);
  };inp.click();
}
let clearPending=false;
function clearAll(e){
  var btn=e&&e.target?e.target:null;
  if(!clearPending){
    clearPending=true;
    if(btn){btn.textContent='⚠ Click Again to Confirm Delete';btn.style.background='var(--red)';btn.style.color='#fff';}
    setTimeout(()=>{clearPending=false;if(btn){btn.textContent='Clear All Data';btn.style.background='';btn.style.color='';}},4000);
    return;
  }
  clearPending=false;
  // Nuclear clear — wipe everything
  S.trades=[];S.journal=[];S.ampStatements=[];S.importLog=[];S.ampFees=null;
  S.accountName='';S.startingBalance=0;S._ampMigrated=true;S._ampMigV2=true;
  S.feeRates={ MNQ:0.90, MES:0.90, NQ:2.25, ES:2.25, YM:2.25, MYM:0.90, RTY:2.25, M2K:0.90, CL:2.25, MCL:0.90, GC:2.25, MGC:0.90, SI:2.25, SIL:0.90, NG:2.25, HG:2.25, ZB:1.52, ZN:1.52, ZC:2.25, ZS:2.25, ZW:2.25 };
  S.pendingCancelled=[];
  S.webhookSeenIds=[];S.webhookLastFetch=null;
  _lastChipBalance=-1; // Force 3D chip re-render
  try{localStorage.removeItem(SK);}catch(e){}
  save();
  // Reset file input
  var fi=document.getElementById('fi-smart');if(fi)fi.value='';
  // Reset import card statuses
  var hs=document.getElementById('ic-history-status');if(hs){hs.textContent='No file loaded';hs.style.color='var(--t3)';}
  var cs=document.getElementById('ic-cancelled-status');if(cs){cs.textContent='No file loaded';cs.style.color='var(--t3)';}
  var ps=document.getElementById('ic-pdf-status');if(ps){ps.textContent='No files loaded';ps.style.color='var(--t3)';}
  var ws=document.getElementById('ic-webhook-status');if(ws){ws.textContent='Not connected';ws.style.color='var(--t3)';}
  // Reset import preview & AMP panel
  var ip=document.getElementById('import-preview');if(ip)ip.style.display='none';
  var ap=document.getElementById('amp-statements-panel');if(ap)ap.style.display='none';
  var rl=document.getElementById('import-route-log');if(rl)rl.style.display='none';
  // Reset AMP fees display
  var af=document.getElementById('amp-fees-display');if(af)af.innerHTML='<p style="font-size:.74rem;color:var(--t3)">Import an AMP PDF statement to see your exact fee breakdown here.</p>';
  // Re-render current active view (covers settings, trades, journal, analytics, etc.)
  var activeNav=document.querySelector('.ni.active');
  var curView=activeNav?activeNav.dataset.view:'dashboard';
  go(curView);
  toast('✓ All data cleared successfully','ok');
  // Reset the button
  if(btn){btn.textContent='Clear All Data';btn.style.background='';btn.style.color='';}
}
function dl(content,name,type){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();
}

// ══════════════════════════════════════════════════════════
// IMAGE PREVIEW
// ══════════════════════════════════════════════════════════
