// TradeEdge — PDF Import

function importPDFs(e){
  const files=[...e.target.files];if(!files.length)return;
  let processed=0,totalNew=0;
  if(!S.ampStatements)S.ampStatements=[];
  if(!S.importLog)S.importLog=[];

  files.forEach(function(file){
    extractPDFText(file).then(function(text){
      if(!text||text.length<50){
        // Fallback: try raw text read if pdf.js failed
        var reader=new FileReader();
        reader.onload=function(ev){processAMPText(ev.target.result,file);};
        reader.readAsText(file);
      } else {
        processAMPText(text,file);
      }
    }).catch(function(err){
      console.error('[TradeEdge] PDF extraction error:', err);
      // Fallback to raw read
      var reader=new FileReader();
      reader.onload=function(ev){processAMPText(ev.target.result,file);};
      reader.readAsText(file);
    });
  });

  function processAMPText(text,file){
    var result=parseAMPStatement(text,file.name);
    if(result){
      var alreadyExists=S.ampStatements.some(function(s){return s.tradeDate===result.tradeDate&&s.fileName===result.fileName;});
      if(!alreadyExists){
        S.ampStatements.push(result);
        if(result.accountName)S.accountName=result.accountName;
        totalNew++;
        if(result.trades&&result.trades.length){
          result.trades.forEach(function(t){
            // Skip PDF synthetic trade if CSV already covers this date+symbol
            var hasCSVTrade=S.trades.some(function(et){
              return et.date===t.date&&et.symbol===t.symbol&&
                     et.source&&!et.source.includes('AMP Statement');
            });
            if(!hasCSVTrade){S.trades.push(t);}
          });
        }
        S.importLog.push({type:'AMP PDF',fileName:file.name,tradeDate:result.tradeDate,
          realizedPnl:result.realizedPnl,totalFees:result.fees.total,balance:result.balance,
          tradesExtracted:result.trades?result.trades.length:0,date:new Date().toISOString()});
      }
    }
    processed++;
    if(processed===files.length){
      S.ampStatements.sort(function(a,b){return new Date(a.tradeDate)-new Date(b.tradeDate);});
      if(S.ampStatements.length){S.ampFees=S.ampStatements[S.ampStatements.length-1].fees;}
      // Try to compute starting balance (needs both trades + NLV)
      _recomputeStartingBalance();
      save();
      document.getElementById('ic-pdf-status').textContent='✓ '+S.ampStatements.length+' statements ('+totalNew+' new)';
      document.getElementById('ic-pdf-status').style.color='var(--green)';
      document.getElementById('ic-pdf').classList.add('has-data');
      // Warn if trades not yet imported
      if(!S.trades.length){
        toast('✓ PDF loaded — now drop your filled orders CSV to complete setup','warn');
      } else {
        toast('✓ '+files.length+' PDF'+(files.length>1?'s':'')+' processed · Starting balance: $'+S.startingBalance,'ok');
      }
      if(typeof renderAMPStatements==='function')renderAMPStatements();
      if(typeof renderImportLog==='function')renderImportLog();
      renderDash();
      updateSidebar();
      updateImportStatus();
    }
  }
}

function parseAMPStatement(text,fileName){
  if(!text||text.length<50)return null;
  console.log('[TradeEdge] Parsing AMP PDF:', fileName, '| Length:', text.length);
  
  // Month name map for DD-MON-YY format
  const MON={JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  function ampDate(s){
    if(!s)return'';
    const m=s.match(/(\d{1,2})-([A-Z]{3})-(\d{2,4})/i);
    if(m){let y=m[3];if(y.length===2)y=(parseInt(y)>50?'19':'20')+y;return`${y}-${MON[m[2].toUpperCase()]||'01'}-${m[1].padStart(2,'0')}`;}
    const m2=s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m2){let y=m2[3];if(y.length===2)y=(parseInt(y)>50?'19':'20')+y;return`${y}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;}
    return s;
  }
  
  // Extract account name - with pdf.js we now have actual text
  let accountName='';
  console.log('[TradeEdge] Parsing text (first 300):', text.substring(0,300));
  
  // Pattern 1: Name right before date (e.g. "Ricardo Samitier 19-FEB-26")
  // Pattern 1: Name before date - but skip if it starts with common doc words
  var nm1raw=text.match(/([A-Za-z]{2,}\s+[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)\s+\d{1,2}-[A-Z]{3}-\d{2,4}/);
  var nm1=nm1raw;
  if(nm1&&/(statement|daily|report|account|summary|page)/i.test(nm1[1].split(/\s+/)[0])){
    // First word is junk, try dropping it
    var parts=nm1[1].trim().split(/\s+/);
    if(parts.length>=3){nm1=[null,parts.slice(1).join(' ')];}
    else{nm1=null;}
  }
  // Pattern 2: Name field
  const nm2=text.match(/(?:Name|Client|Account\s*Holder)[:\s]+([A-Za-z]{2,}\s+[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)/i);
  // Pattern 3: Standalone name-like text in first 200 chars (2-3 words, only letters)
  const first200=text.substring(0,200);
  const words=first200.split(/\s+/);
  let nm3=null;
  for(var wi=0;wi<words.length-1;wi++){
    if(/^[A-Za-z]{2,}$/.test(words[wi])&&/^[A-Za-z]{2,}$/.test(words[wi+1])){
      var candidate=words[wi]+' '+words[wi+1];
      if(words[wi+2]&&/^[A-Za-z]{2,}$/.test(words[wi+2]))candidate+=' '+words[wi+2];
      // Skip common non-name words
      var low=candidate.toLowerCase();
      if(!/(daily|account|summary|trade|report|custom|futures|clearing|commission|exchange|purchase|commodity|federal|national|statement|page|processed|balance|profit|equity|margin|option|market|value|initial|maintenance|debit|credit|introduced|riviera|gables|florida)/i.test(low)){
        nm3=candidate;break;
      }
    }
  }
  
  var rawName=nm1?nm1[1]:nm2?nm2[1]:nm3;
  console.log('[TradeEdge] Name patterns:', {p1:nm1?nm1[1]:'none',p2:nm2?nm2[1]:'none',p3:nm3||'none',chosen:rawName||'none'});
  if(rawName){
    accountName=rawName.trim().replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  console.log('[TradeEdge] Account name:', accountName);
  const dm=text.match(/(\d{1,2}-[A-Z]{3}-\d{2,4})/i)||text.match(/Account Summary as of\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  let tradeDate=dm?ampDate(dm[1]):'';
  
  // Parse amounts with DR/CR sign convention (DR=negative, CR=positive)
  function drcr(re){
    const m=text.match(re);if(!m)return 0;
    const v=parseFloat(m[1].replace(/,/g,''))||0;
    return m[2]&&m[2].toUpperCase()==='DR'?-v:v;
  }
  function posVal(re){const m=text.match(re);return m?parseFloat(m[1].replace(/,/g,''))||0:0;}
  
  // Fees
  const fees={exchange:0,nfa:0,clearing:0,cqg:0,commission:0,total:0};
  fees.exchange=posVal(/EXCHANGE\s+(?:USD\s+)?([\d,.]+)\s+DR/i);
  fees.nfa=posVal(/NFA\s+(?:USD\s+)?([\d,.]+)\s+DR/i);
  fees.clearing=posVal(/CLEARING[.\s]+(?:USD\s+)?([\d,.]+)\s+DR/i);
  fees.cqg=posVal(/CQG\s*(?:TRF)?\s+(?:USD\s+)?([\d,.]+)\s+DR/i);
  fees.commission=posVal(/COMMISSION\s+(?:USD\s+)?([\d,.]+)\s+DR/i);
  fees.total=posVal(/TOTAL\s+COMMISSION\s*(?:&|AND)\s*FEES\s+([\d,.]+)\s+DR/i);
  if(!fees.total)fees.total=fees.exchange+fees.nfa+fees.clearing+fees.cqg+fees.commission;
  
  // P&L: "REALIZED PROFIT/LOSS 53.50 DR" → -53.50 (loss)
  const realizedPnl=drcr(/REALIZED\s+PROFIT\/LOSS\s+([\d,.]+)\s+(DR|CR)/i);
  const balance=drcr(/NEW\s+CASH\s+BALANCE\s+([\d,.]+)\s+(DR|CR)/i);
  const netLiq=drcr(/NET\s+LIQUIDATING\s+VALUE\s+([\d,.]+)\s+(DR|CR)/i);
  const cashBalance=drcr(/ACCOUNT\s+CASH\s+BALANCE\s+([\d,.]+)\s+(DR|CR)/i);
  
  // Try to extract oldest balance from "Last 5 values" history
  var oldestBalance=0;
  // Find the Last 5 values section and grab all CR values from it
  var last5Idx=text.search(/Last\s+5\s+values/i);
  if(last5Idx>=0){
    var last5Text=text.substring(last5Idx,last5Idx+500);
    console.log('[TradeEdge] Last 5 values section:', last5Text.substring(0,200));
    var crValues=[];
    var crRe=/([\d,.]+)\s+CR/g;
    var crm;
    while((crm=crRe.exec(last5Text))!==null){
      crValues.push(parseFloat(crm[1].replace(/,/g,''))||0);
    }
    console.log('[TradeEdge] Last 5 CR values:', crValues);
    // First entry = oldest NLV in the window (the pre-period balance for this statement's range)
    if(crValues.length){oldestBalance=crValues[0];}
    console.log('[TradeEdge] Oldest NLV from Last 5:', oldestBalance);
  }
  
  // P&S total: "P&S USD 53.50 DR"
  const psm=text.match(/P\s*&\s*S\s+(?:USD\s+)?([\d,.]+)\s+(DR|CR)/i);
  const psPnl=psm?((psm[2].toUpperCase()==='DR'?-1:1)*parseFloat(psm[1].replace(/,/g,''))):0;
  
  // Average prices
  const avgLongM=text.match(/AVERAGE\s+LONG\s+([\d,.]+)/i);
  const avgShortM=text.match(/AVERAGE\s+SHORT\s+([\d,.]+)/i);
  const avgLong=avgLongM?parseFloat(avgLongM[1].replace(/,/g,'')):0;
  const avgShort=avgShortM?parseFloat(avgShortM[1].replace(/,/g,'')):0;
  
  // Extract symbol from trade lines
  let tradeSym='';
  const symMatch=text.match(/(?:CME|CBOT|NYMEX|COMEX)\s+\d*\s*\d*\s*(\w+)\s+Future/i);
  if(symMatch) tradeSym=nsym(symMatch[1]);
  
  // Build round-trip trade from avg prices + P&S
  const trades=[];
  const usePnl=psPnl||realizedPnl;
  if(avgLong&&avgShort&&tradeSym){
    // Determine trade direction from the P&S result
    // If AVERAGE LONG > AVERAGE SHORT, bought high sold low = short that profited? No.
    // Actually: AVERAGE LONG is the avg buy price, AVERAGE SHORT is the avg sell price
    // If you buy at 24834.50 (LONG) and sell at 24807.75 (SHORT), that's a LONG trade at a loss
    // P&S = (sell - buy) * tick * qty = (24807.75 - 24834.50) * 2 * 1 = -53.50 ✓ matches the PDF
    
    // So: entry = AVERAGE LONG (buy price), exit = AVERAGE SHORT (sell price) for a long
    // But we need to check: who bought first?
    // Look at trade order in the PDF to determine
    
    // For the general case: if P&S is negative and avgLong > avgShort → long trade that lost
    // If P&S is positive and avgShort > avgLong → long trade that won
    // Just use the prices directly
    
    const qty=1; // Default, or extract from TOTAL line
    const qtyMatch=text.match(/TOTAL\s+(\d+)\s+(\d+)/i);
    const totalQty=qtyMatch?Math.max(parseInt(qtyMatch[1])||0,parseInt(qtyMatch[2])||0):1;
    
    // entry=buy price, exit=sell price → side is Long
    trades.push({
      date:tradeDate,time:'',symbol:tradeSym,side:'Long',qty:totalQty,
      entry:avgLong,exit:avgShort,sl:null,tp:null,
      pnl:usePnl,fees:fees.total,netPnl:usePnl-fees.total,
      rr:null,tags:[],checklist:{},mistakes:[],rating:0,
      killzone:'',emotion:'',bias:'',notes:'From AMP statement',chartUrl:'',chartImg:null,
      importedAt:new Date().toISOString(),source:'AMP Statement: '+fileName
    });
  }
  
  console.log('[TradeEdge] AMP PDF result:', {tradeDate,realizedPnl,balance,netLiq,fees,psPnl,avgLong,avgShort,tradeSym,trades:trades.length});
  
  // Store the Last 5 NLV values for balance history memory
  var balanceHistory=[];
  var last5Idx2=text.search(/Last\s+5\s+values/i);
  if(last5Idx2>=0){
    var l5=text.substring(last5Idx2,last5Idx2+500);
    var l5re=/([\d,.]+)\s+CR\s+([\d,.]+|0\.00)\s*(today)?/gi,l5m;
    while((l5m=l5re.exec(l5))!==null){
      balanceHistory.push({nlv:parseFloat(l5m[1].replace(/,/g,''))||0,change:parseFloat(l5m[2].replace(/,/g,''))||0,isToday:!!l5m[3]});
    }
  }
  return{tradeDate,fileName,fees,realizedPnl,balance,netLiq,cashBalance,oldestBalance,balanceHistory,trades,accountName,importedAt:new Date().toISOString()};
}

// ══════════════════════════════════════════════════════════
// AMP STATEMENTS PANEL & IMPORT HISTORY LOG
// ══════════════════════════════════════════════════════════
function renderAMPStatements(){
  const panel=document.getElementById('amp-statements-panel');
  if(!panel)return;
  if(!S.ampStatements||!S.ampStatements.length){panel.style.display='none';return;}
  panel.style.display='block';
  document.getElementById('amp-stmt-count').textContent=`${S.ampStatements.length} statement${S.ampStatements.length>1?'s':''}`;
  const stmts=[...S.ampStatements].sort((a,b)=>new Date(b.tradeDate)-new Date(a.tradeDate));
  const totalPnl=stmts.reduce((a,s)=>a+s.realizedPnl,0);
  const totalFees=stmts.reduce((a,s)=>a+s.fees.total,0);
  const latestBal=stmts[0]?.balance||0;
  const list=document.getElementById('amp-statements-list');
  list.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      <div style="background:var(--s2);border-radius:7px;padding:10px;text-align:center">
        <div style="font-family:var(--mono);font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:3px">Total P&L</div>
        <div style="font-family:var(--mono);font-size:.9rem;font-weight:600;color:${totalPnl>=0?'var(--green)':'var(--red)'}">${f$(totalPnl)}</div>
      </div>
      <div style="background:var(--s2);border-radius:7px;padding:10px;text-align:center">
        <div style="font-family:var(--mono);font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:3px">Total Fees</div>
        <div style="font-family:var(--mono);font-size:.9rem;font-weight:600;color:var(--gold)">${f$(-totalFees)}</div>
      </div>
      <div style="background:var(--s2);border-radius:7px;padding:10px;text-align:center">
        <div style="font-family:var(--mono);font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:3px">Balance</div>
        <div style="font-family:var(--mono);font-size:.9rem;font-weight:600;color:var(--green)">${f$(latestBal,false)}</div>
      </div>
      <div style="background:var(--s2);border-radius:7px;padding:10px;text-align:center">
        <div style="font-family:var(--mono);font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:3px">Statements</div>
        <div style="font-family:var(--mono);font-size:.9rem;font-weight:600;color:var(--t1)">${stmts.length}</div>
      </div>
    </div>
    <div style="overflow-x:auto"><table><thead><tr>
      <th>Date</th><th>File</th><th>P&L</th><th>Fees</th><th>Balance</th><th>Trades</th>
    </tr></thead><tbody>${stmts.map(s=>`<tr>
      <td class="mono">${s.tradeDate||'—'}</td>
      <td style="font-size:.7rem;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(s.fileName)}">${escapeHtml(s.fileName)}</td>
      <td class="mono" style="color:${s.realizedPnl>=0?'var(--green)':'var(--red)'}">${f$(s.realizedPnl)}</td>
      <td class="mono" style="color:var(--gold)">${f$(-s.fees.total)}</td>
      <td class="mono">${s.balance?f$(s.balance,false):'—'}</td>
      <td class="mono">${s.trades?.length||0}</td>
    </tr>`).join('')}</tbody></table></div>`;
  // Update Settings AMP display
  const latest=stmts[0];
  const ampEl=document.getElementById('amp-fees-display');
  if(ampEl&&latest) ampEl.innerHTML=`
    <p style="font-size:.7rem;color:var(--accent);margin-bottom:8px;font-family:var(--mono)">Latest: ${latest.tradeDate}</p>
    <div class="stat-row"><span class="stat-k">Exchange</span><span class="stat-v" style="color:var(--gold)">$${latest.fees.exchange.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k">NFA</span><span class="stat-v" style="color:var(--gold)">$${latest.fees.nfa.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k">Clearing</span><span class="stat-v" style="color:var(--gold)">$${latest.fees.clearing.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k">CQG</span><span class="stat-v" style="color:var(--gold)">$${latest.fees.cqg.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k">Commission</span><span class="stat-v" style="color:var(--gold)">$${latest.fees.commission.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k"><strong>Total RT</strong></span><span class="stat-v" style="color:var(--red);font-weight:600">$${latest.fees.total.toFixed(2)}</span></div>
    <div class="stat-row"><span class="stat-k">Balance</span><span class="stat-v" style="color:var(--green)">$${(latest.balance||0).toFixed(2)}</span></div>
    <div style="margin-top:8px;font-size:.68rem;color:var(--t3)">${S.ampStatements.length} statements on file</div>`;
}

function renderImportLog(){
  const logEl=document.getElementById('import-log-list');
  const countEl=document.getElementById('import-log-count');
  if(!logEl)return;
  if(!S.importLog||!S.importLog.length){
    logEl.innerHTML='<p style="font-size:.72rem;color:var(--t3);padding:8px 0">No imports yet.</p>';
    if(countEl)countEl.textContent='';return;
  }
  if(countEl)countEl.textContent=`${S.importLog.length} file${S.importLog.length>1?'s':''}`;
  const logs=[...S.importLog].reverse();
  logEl.innerHTML=`<div style="overflow-x:auto"><table>
    <thead><tr><th>When</th><th>Type</th><th>File</th><th>Details</th></tr></thead>
    <tbody>${logs.map(l=>{
      const d=new Date(l.date);
      const ds=d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
      let det='';
      if(l.type==='CSV') det=`${l.tradesAdded||0} added, ${l.tradesSkipped||0} skipped`;
      else if(l.type==='AMP PDF') det=`P&L: ${f$(l.realizedPnl||0)} · Fees: ${f$(-(l.totalFees||0))}`;
      else if(l.type==='Cancelled CSV') det=`${l.ordersLoaded||0} orders`;
      return`<tr>
        <td class="mono" style="font-size:.7rem">${ds}</td>
        <td><span class="bdg ${l.type==='AMP PDF'?'bdg-neutral':'bdg-long'}" style="font-size:.58rem">${l.type}</span></td>
        <td style="font-size:.72rem;max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(l.fileName)}">${escapeHtml(l.fileName)||'—'}</td>
        <td style="font-size:.7rem">${det}</td>
      </tr>`;}).join('')}
    </tbody></table></div>`;
}

// Cancelled CSV for SL/TP
