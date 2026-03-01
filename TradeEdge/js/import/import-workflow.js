// TradeEdge — Import Workflow

let pendingRows=[];
let pendingTrades=[];
let importMode='';
let lastImportFileName='';

function importHistory(e){
  const file=e.target.files[0];if(!file)return;
  lastImportFileName=file.name;
  // Reset file input so same file can be re-imported
  if(e.target.value) e.target.value='';
  const reader=new FileReader();
  reader.onload=ev=>{
    const text=ev.target.result;
    const rows=parseCSV(text);
    if(!rows.length){toast('Could not parse CSV — check format','err');return;}
    pendingRows=rows;
    const headers=Object.keys(rows[0]);
    const hl=headers.map(h=>h.toLowerCase());
    console.log('[TradeEdge] CSV Headers:', headers);
    console.log('[TradeEdge] First row:', JSON.stringify(rows[0]));

    // Detect format by checking which columns exist
    const hasFillPrice=hl.some(h=>h.includes('fill price'));
    const hasPnL=hl.some(h=>h.match(/p[&\/]?l|profit|result/i));
    const hasEntryExit=hl.some(h=>h.includes('entry'));
    const hasClosingTime=hl.some(h=>h.includes('closing time')||h.includes('status time'));

    if(hasEntryExit){
      importMode='account_history';
      pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);
    } else if(hasFillPrice||hasClosingTime){
      importMode='history_fills';
      pendingTrades=pairFills(rows);
    } else if(hasPnL){
      importMode='generic_pnl';
      pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);
    } else {
      importMode='generic';
      pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);
    }

    console.log('[TradeEdge] Mode:', importMode, '| Trades:', pendingTrades.length);
    if(pendingTrades.length) console.log('[TradeEdge] Sample:', JSON.stringify(pendingTrades[0]));

    showPreview(rows);
    showTradePreview(pendingTrades);
    document.getElementById('ic-history-status').textContent=`✓ ${rows.length} rows → ${pendingTrades.length} trades`;
    document.getElementById('ic-history-status').style.color='var(--green)';
    document.getElementById('ic-history').classList.add('has-data');
    toast(`${pendingTrades.length} trades parsed`,'ok');
  };
  reader.readAsText(file);
}

// Robust CSV parser — handles quotes, commas inside quotes, tabs

function showPreview(rows){
  if(!rows.length)return;
  document.getElementById('import-preview').style.display='block';
  const k=Object.keys(rows[0]);
  document.getElementById('prev-head').innerHTML='<th>#</th>'+k.map(h=>`<th>${escapeHtml(h)}</th>`).join('');
  document.getElementById('prev-body').innerHTML=rows.slice(0,8).map((r,i)=>
    `<tr><td class="mono" style="color:var(--t3)">${i+1}</td>${k.map(h=>`<td>${escapeHtml(r[h]||'')}</td>`).join('')}</tr>`
  ).join('');
}

function showTradePreview(trades){
  const container=document.getElementById('import-preview');
  let tp=document.getElementById('trade-preview');
  if(!tp){tp=document.createElement('div');tp.id='trade-preview';container.appendChild(tp);}
  if(!trades.length){
    tp.innerHTML=`<div class="cc" style="margin-top:12px;border-color:var(--red)">
      <div class="cc-title" style="color:var(--red)">⚠ NO TRADES PARSED</div>
      <p style="font-size:.76rem;color:var(--t2);line-height:1.6">Could not match fills into trades. Open browser console (Cmd+Option+J) for debug info.<br>
      Expected columns: <strong>Side, Qty, Fill Price, Closing Time, Symbol</strong> (History tab) or <strong>Symbol, Side, Entry Price, Close Price, P&L</strong> (Account History).</p>
      <p style="font-size:.68rem;color:var(--t3);margin-top:8px;font-family:var(--mono)">Mode: ${importMode} | Raw rows: ${pendingRows.length} | Headers: ${pendingRows.length?Object.keys(pendingRows[0]).join(', '):'none'}</p>
    </div>`;return;
  }
  const totalPnl=trades.reduce((s,t)=>s+(t.pnl||0),0);
  const totalNet=trades.reduce((s,t)=>s+(t.netPnl||0),0);
  const totalFees=trades.reduce((s,t)=>s+(t.fees||0),0);
  tp.innerHTML=`
    <div class="cc" style="margin-top:12px;border-color:rgba(0,240,192,.3)">
      <div class="cc-title">✓ PARSED TRADES (${trades.length})
        <span style="font-size:.68rem;color:var(--accent);text-transform:none;letter-spacing:0">Mode: ${importMode}</span>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:10px;font-size:.72rem;font-family:var(--mono)">
        <span>Gross: <strong style="color:${totalPnl>=0?'var(--green)':'var(--red)'}">${f$(totalPnl)}</strong></span>
        <span>Fees: <strong style="color:var(--gold)">${f$(-totalFees)}</strong></span>
        <span>Net: <strong style="color:${totalNet>=0?'var(--green)':'var(--red)'}">${f$(totalNet)}</strong></span>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Date</th><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Gross P&L</th><th>Fees</th><th>Net P&L</th><th>KZ</th></tr></thead>
        <tbody>${trades.slice(0,10).map(t=>`<tr>
          <td class="mono">${t.date||'—'}</td>
          <td class="mono" style="color:var(--t3)">${t.time||'—'}</td>
          <td class="sym">${escapeHtml(t.symbol)||'—'}</td>
          <td><span class="bdg ${t.side==='Long'?'bdg-long':'bdg-short'}">${t.side}</span></td>
          <td class="mono">${t.qty}</td>
          <td class="mono">${t.entry||'—'}</td>
          <td class="mono">${t.exit||'—'}</td>
          <td class="mono" style="color:${(t.pnl||0)>=0?'var(--green)':'var(--red)'}">${f$(t.pnl)}</td>
          <td class="mono" style="color:var(--gold)">${f$(-t.fees)}</td>
          <td class="mono" style="color:${(t.netPnl||0)>=0?'var(--green)':'var(--red)'}; font-weight:600">${f$(t.netPnl)}</td>
          <td style="font-size:.6rem">${t.killzone?t.killzone.split('(')[0].trim():'—'}</td>
        </tr>`).join('')}
        ${trades.length>10?`<tr><td colspan="11" style="text-align:center;color:var(--t3)">… +${trades.length-10} more</td></tr>`:''}
        </tbody></table></div>
    </div>`;
}

// Called after EITHER trades or PDF are imported — always gives the right starting balance
// Show/hide the import order warning banner
function updateImportStatus(){
  var warn=document.getElementById('import-order-warn');
  var warnText=document.getElementById('import-order-warn-text');
  if(!warn||!warnText)return;
  var hasTrades=S.trades&&S.trades.length>0;
  var hasPDF=S.ampStatements&&S.ampStatements.length>0;
  if(hasPDF&&!hasTrades){
    warnText.textContent='PDF loaded but no filled orders CSV yet — drop your filled orders CSV to compute starting balance.';
    warn.style.display='flex';
  } else if(hasTrades&&!hasPDF){
    warnText.textContent='Trades loaded but no AMP PDF yet — drop your AMP daily statement PDF to auto-set your starting balance ($'+S.startingBalance+' currently manual).';
    warn.style.display='flex';
  } else if(hasTrades&&hasPDF&&S.startingBalance>0){
    warn.style.display='none'; // All good
  } else {
    warn.style.display='none';
  }
}

function _recomputeStartingBalance(){
  if(!S.ampStatements||!S.ampStatements.length||!S.trades||!S.trades.length)return;
  var latestStmt=null,latestDate='';
  S.ampStatements.forEach(function(st){if(!latestDate||st.tradeDate>latestDate){latestDate=st.tradeDate;latestStmt=st;}});
  var nlv=latestStmt?(latestStmt.netLiq||latestStmt.balance||0):0;
  if(!nlv)return;
  var totalNetPnl=S.trades.reduce(function(sum,t){return sum+(t.netPnl||t.pnl||0);},0);
  var implied=Math.round((nlv-totalNetPnl)*100)/100;
  if(implied>0){
    S.startingBalance=implied;
    console.log('[TradeEdge] Starting balance recomputed: NLV $'+nlv+' − net P&L $'+totalNetPnl.toFixed(2)+' = $'+implied);
    // Update settings input if visible
    var bi=document.getElementById('set-balance');if(bi&&bi!==document.activeElement)bi.value=implied;
    renderDash();updateSidebar();
    updateImportStatus();
  }
}

function confirmImport(){
  if(!pendingTrades.length){toast('No trades to import — upload a CSV first','err');return;}
  let added=0,skipped=0;
  pendingTrades.forEach(t=>{
    if(!t)return;
    const k=`${t.date}|${t.time}|${t.symbol}|${t.side}|${t.entry||''}|${t.pnl||''}`;
    if(S.trades.some(e=>`${e.date}|${e.time}|${e.symbol}|${e.side}|${e.entry||''}|${e.pnl||''}`===k)){skipped++;return;}
    S.trades.push(t);added++;
  });
  console.log('[TradeEdge] Import confirmed:', added, 'added,', skipped, 'skipped. Total trades:', S.trades.length);
  if(S.trades.length) console.log('[TradeEdge] Last trade:', JSON.stringify(S.trades[S.trades.length-1]));
  if(!S.importLog) S.importLog=[];
  S.importLog.push({type:'CSV',mode:importMode,fileName:lastImportFileName||'Unknown',tradesAdded:added,tradesSkipped:skipped,date:new Date().toISOString()});
  // Reconstruct SL/TP from cancelled orders if available
  if(S.pendingCancelled&&S.pendingCancelled.length){
    reconstructSLTP();
  }
  // Recompute starting balance now that trades exist — works even if PDF was imported first
  _recomputeStartingBalance();
  save();
  // Change 24: Check trading rules for each imported trade
  var allViolations=[];
  pendingTrades.forEach(function(t){if(t){var v=_checkTradeRules(t);if(v.length)allViolations=allViolations.concat(v);}});
  pendingRows=[];pendingTrades=[];
  document.getElementById('import-preview').style.display='none';
  const tp=document.getElementById('trade-preview');if(tp)tp.remove();
  toast(`✓ Imported ${added} trades (${skipped} duplicates skipped)`,'ok');
  if(typeof renderImportLog==='function')renderImportLog();
  updateSidebar();
  go('dashboard');
  // Trigger alarm if violations found (after navigation so user sees it)
  if(allViolations.length)setTimeout(function(){triggerNuclearAlarm(allViolations);},500);
}

// ══════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION (using pdf.js)
// ══════════════════════════════════════════════════════════
async function extractPDFText(file){
  if(!window.pdfjsLib){console.error('[TradeEdge] pdf.js not loaded');return '';}
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let text='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    text+=content.items.map(function(item){return item.str;}).join(' ')+'\n';
  }
  console.log('[TradeEdge] PDF extracted text (first 500):', text.substring(0,500));
  return text;
}

// ══════════════════════════════════════════════════════════
// AMP PDF IMPORT — supports MULTIPLE files at once
// ══════════════════════════════════════════════════════════

function importCancelled(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const rows=parseCSV(ev.target.result);
    S.pendingCancelled=rows;
    document.getElementById('ic-cancelled-status').textContent=`✓ ${rows.length} cancelled orders`;
    document.getElementById('ic-cancelled-status').style.color='var(--green)';
    document.getElementById('ic-cancelled').classList.add('has-data');
    if(!S.importLog)S.importLog=[];
    S.importLog.push({type:'Cancelled CSV',fileName:file.name,ordersLoaded:rows.length,date:new Date().toISOString()});
    save();if(typeof renderImportLog==='function')renderImportLog();
    toast(`${rows.length} cancelled orders loaded`,'ok');
  };reader.readAsText(file);
}

// Drag & drop
function doDrag(e){e.preventDefault();document.getElementById('drop-zone').classList.add('drag');}
function doDragLeave(){document.getElementById('drop-zone').classList.remove('drag');}
function doDrop(e){
  e.preventDefault();document.getElementById('drop-zone').classList.remove('drag');
  const files=[...e.dataTransfer.files];
  if(files.length) routeFiles(files);
}

// Smart import — auto-detect file type from name/extension/content
function smartImport(e){
  const files=[...e.target.files];
  if(!files.length)return;
  // Reset input so same files can be re-imported
  e.target.value='';
  routeFiles(files);
}

function classifyFile(file){
  const name=file.name.toLowerCase();
  const ext=name.split('.').pop();
  
  // PDFs → always AMP statements
  if(ext==='pdf') return 'amp_pdf';
  
  // CSVs → check filename patterns
  if(ext==='csv'||ext==='txt'){
    if(name.includes('cancelled')||name.includes('cancel')) return 'cancelled';
    if(name.includes('filled')||name.includes('history')||name.includes('order')) return 'filled';
    // If no clear pattern, we'll peek at content to decide
    return 'csv_unknown';
  }
  
  return 'unknown';
}

function routeFiles(files){
  const routed={filled:[],cancelled:[],amp_pdf:[],unknown:[]};
  const routeLog=[];
  
  // First pass: classify by filename
  const csvUnknown=[];
  files.forEach(f=>{
    const type=classifyFile(f);
    if(type==='csv_unknown'){
      csvUnknown.push(f);
    } else if(type==='amp_pdf'){
      routed.amp_pdf.push(f);
      routeLog.push({name:f.name,type:'AMP Statement',icon:'📄',color:'var(--gold)'});
    } else if(type==='cancelled'){
      routed.cancelled.push(f);
      routeLog.push({name:f.name,type:'SL/TP Data (cancelled orders)',icon:'🎯',color:'var(--accent2)'});
    } else if(type==='filled'){
      routed.filled.push(f);
      routeLog.push({name:f.name,type:'Filled Orders',icon:'📊',color:'var(--green)'});
    } else {
      routed.unknown.push(f);
      routeLog.push({name:f.name,type:'Unknown (skipped)',icon:'❓',color:'var(--t3)'});
    }
  });
  
  // Second pass: peek at CSV headers to classify unknowns
  let pendingCSV=csvUnknown.length;
  if(!pendingCSV) processRouted(routed,routeLog);
  
  csvUnknown.forEach(f=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const firstLine=(ev.target.result||'').split('\n')[0].toLowerCase();
      if(firstLine.includes('cancel')){
        routed.cancelled.push(f);
        routeLog.push({name:f.name,type:'Cancelled Orders (auto-detected)',icon:'❌',color:'var(--red)'});
      } else if(firstLine.includes('fill')||firstLine.includes('side')||firstLine.includes('price')){
        routed.filled.push(f);
        routeLog.push({name:f.name,type:'Filled Orders (auto-detected)',icon:'📊',color:'var(--green)'});
      } else {
        routed.filled.push(f); // Default to filled
        routeLog.push({name:f.name,type:'Filled Orders (default)',icon:'📊',color:'var(--accent)'});
      }
      pendingCSV--;
      if(!pendingCSV) processRouted(routed,routeLog);
    };
    reader.readAsText(f.slice(0,500)); // Only read first 500 bytes for header peek
  });
}


function processRouted(routed,routeLog){
  // Show routing log
  const logEl=document.getElementById('import-route-log');
  const listEl=document.getElementById('import-route-list');
  if(routeLog.length>1||routed.amp_pdf.length||routed.cancelled.length){
    logEl.style.display='block';
    listEl.innerHTML=routeLog.map(r=>
      `<div style="padding:4px 0;display:flex;align-items:center;gap:8px">
        <span>${r.icon}</span>
        <span style="color:var(--t2);flex:1;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</span>
        <span style="color:${r.color};font-size:.65rem;white-space:nowrap">${r.type}</span>
      </div>`).join('');
  }
  
  // Process each category
  if(routed.filled.length){
    // Use the first filled CSV for trade import
    const synth={target:{files:routed.filled}};
    lastImportFileName=routed.filled.map(f=>f.name).join(', ');
    const file=routed.filled[0];
    const reader=new FileReader();
    reader.onload=ev=>{
      const text=ev.target.result;
      const rows=parseCSV(text);
      if(!rows.length){toast('Could not parse CSV','err');return;}
      pendingRows=rows;
      const headers=Object.keys(rows[0]);
      const hl=headers.map(h=>h.toLowerCase());
      console.log('[TradeEdge] CSV Headers:',headers);
      
      const hasFillPrice=hl.some(h=>h.includes('fill price'));
      const hasPnL=hl.some(h=>h.match(/p[&\/]?l|profit|result/i));
      const hasEntryExit=hl.some(h=>h.includes('entry'));
      const hasClosingTime=hl.some(h=>h.includes('closing time')||h.includes('status time'));
      
      if(hasEntryExit){importMode='account_history';pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);}
      else if(hasFillPrice||hasClosingTime){importMode='history_fills';pendingTrades=pairFills(rows);}
      else if(hasPnL){importMode='generic_pnl';pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);}
      else{importMode='generic';pendingTrades=rows.map(r=>mapRow(r)).filter(Boolean);}
      
      console.log('[TradeEdge] Mode:',importMode,'| Trades:',pendingTrades.length);
      document.getElementById('ic-history-status').textContent=`✓ ${rows.length} rows → ${pendingTrades.length} trades`;
      document.getElementById('ic-history-status').style.color='var(--green)';
      document.getElementById('ic-history').classList.add('has-data');
      // AUTO-CONFIRM: import immediately without requiring manual confirm
      if(pendingTrades.length){
        let added=0,skipped=0;
        pendingTrades.forEach(t=>{
          if(!t)return;
          const k=`${t.date}|${t.time}|${t.symbol}|${t.side}|${t.entry||''}|${t.pnl||''}`;
          if(S.trades.some(e=>`${e.date}|${e.time}|${e.symbol}|${e.side}|${e.entry||''}|${e.pnl||''}`===k)){skipped++;return;}
          S.trades.push(t);added++;
        });
        if(!S.importLog)S.importLog=[];
        S.importLog.push({type:'CSV',mode:importMode,fileName:lastImportFileName||'Unknown',tradesAdded:added,tradesSkipped:skipped,date:new Date().toISOString()});
        if(S.pendingCancelled&&S.pendingCancelled.length) reconstructSLTP();
        save();
        if(typeof renderImportLog==='function')renderImportLog();
        updateSidebar();
        toast(`✓ Auto-imported ${added} trades (${skipped} duplicates skipped)`,'ok');
        console.log('[TradeEdge] Auto-import:',added,'added,',skipped,'skipped');
      } else {
        toast('No trades found in CSV','err');
      }
    };
    reader.readAsText(file);
  }
  
  if(routed.cancelled.length){
    const file=routed.cancelled[0];
    const reader=new FileReader();
    reader.onload=ev=>{
      const rows=parseCSV(ev.target.result);
      S.pendingCancelled=rows;
      document.getElementById('ic-cancelled-status').textContent=`✓ ${rows.length} cancelled orders`;
      document.getElementById('ic-cancelled-status').style.color='var(--green)';
      document.getElementById('ic-cancelled').classList.add('has-data');
      if(!S.importLog)S.importLog=[];
      S.importLog.push({type:'Cancelled CSV',fileName:file.name,ordersLoaded:rows.length,date:new Date().toISOString()});
      // Reconstruct SL/TP — delay slightly to ensure filled trades are processed first
      setTimeout(()=>{
        if(S.trades.length) reconstructSLTP();
        save();if(typeof renderImportLog==='function')renderImportLog();
      },500);
      toast(`${rows.length} cancelled orders loaded → SL/TP reconstruction`,'ok');
    };
    reader.readAsText(file);
  }
  
  if(routed.amp_pdf.length){
    importPDFs({target:{files:routed.amp_pdf}});
  }
}
