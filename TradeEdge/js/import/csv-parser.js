// TradeEdge — CSV Parser

function parseCSV(text){
  const lines=text.trim().split(/\r?\n/);
  if(lines.length<2)return[];
  const d=lines[0].includes('\t')?'\t':',';
  function split(line){
    const r=[];let c='';let q=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){q=!q;continue;}
      if(line[i]===d&&!q){r.push(c.trim());c='';continue;}
      c+=line[i];
    }
    r.push(c.trim());return r;
  }
  const hdrs=split(lines[0]);
  return lines.slice(1).filter(l=>l.trim()).map(line=>{
    const v=split(line);
    const o={};hdrs.forEach((h,i)=>o[h]=v[i]!==undefined?v[i]:'');
    return o;
  });
}

// --- Column value helpers (case-insensitive, partial match) ---
function gv(row,...names){
  const keys=Object.keys(row);
  for(const n of names){
    const e=keys.find(k=>k.toLowerCase()===n.toLowerCase());
    if(e&&row[e]!=='')return row[e];
  }
  for(const n of names){
    const p=keys.find(k=>k.toLowerCase().includes(n.toLowerCase()));
    if(p&&row[p]!=='')return row[p];
  }
  return '';
}
function gn(row,...names){
  let v=gv(row,...names);if(!v)return 0;
  v=String(v).replace(/[$,\s]/g,'');
  if(v.startsWith('(')&&v.endsWith(')'))v='-'+v.slice(1,-1);
  return parseFloat(v)||0;
}

// Parse date+time from various formats
function pdt(str){
  if(!str)return{date:'',time:''};
  str=str.trim();
  if(str.includes('T')){const[d,t]=str.split('T');return{date:d,time:t.substring(0,5)};}
  const p=str.split(/[\s]+/);
  let dp=p[0]||'',tp=p.slice(1).join(' ')||'';
  const m=dp.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m)dp=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  dp=dp.replace(/\//g,'-');
  if(tp){
    const a=tp.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if(a){let h=parseInt(a[1]);
      if(a[4]&&a[4].toUpperCase()==='PM'&&h!==12)h+=12;
      if(a[4]&&a[4].toUpperCase()==='AM'&&h===12)h=0;
      tp=`${String(h).padStart(2,'0')}:${a[2]}`;}
  }
  return{date:dp,time:tp};
}

// Normalize symbol: F.US.MNQH26→MNQ, CME_MINI:MESH2025→MES, NQ1!→NQ
function nsym(s){
  if(!s)return'';s=s.toUpperCase().trim();
  // Strip exchange prefixes: "CME_MINI:", "F.US.", "COMEX:", etc.
  s=s.replace(/^[A-Z_]+:/,'');
  s=s.replace(/^F\.[A-Z]+\./,''); // F.US.MNQH26 → MNQH26
  s=s.replace(/^[A-Z]+\./,'');    // CME.ESH26 → ESH26
  const m=s.match(/^([A-Z]{2,4}?)[FGHJKMNQUVXZ]\d{2,4}$/);
  if(m)return m[1];
  return s.replace(/\d*!$/,'');
}

// Detect ICT killzone from time (ET assumed)
function dkz(time){
  if(!time)return'';
  const m=time.match(/(\d{1,2}):(\d{2})/);if(!m)return'';
  const mins=parseInt(m[1])*60+parseInt(m[2]);
  if(mins>=120&&mins<=300)return'London (2–5am ET)';
  if(mins>=510&&mins<=660)return'NY AM (8:30–11am ET)';
  if(mins>=660&&mins<=780)return'NY Lunch (11am–1pm ET)';
  if(mins>=810&&mins<=960)return'NY PM (1:30–4pm ET)';
  if(mins%60>=50||mins%60<=10)return'Macro Window';
  return'Outside Killzone';
}

function isbuy(v){if(!v)return true;const l=v.toLowerCase();return l.includes('buy')||l==='long'||l==='b';}

// Tick value per point for P&L calculation
function getTickValue(sym){
  return{MNQ:2,MES:5,NQ:20,ES:50,CL:1000,MCL:100,GC:100,MGC:10,YM:5,MYM:0.5,RTY:50,M2K:5}[sym]||1;
}

// Map a single row to a complete trade (account history / generic with P&L)
function mapRow(row){
  const dtStr=gv(row,'Status Time','Closing Time','Close Time','Close Date','Date','Time','Timestamp','Trade Date','Fill Time','Placing Time');
  const{date,time}=pdt(dtStr);
  const sym=nsym(gv(row,'Symbol','Instrument','Contract','Market','Ticker'));
  const side=isbuy(gv(row,'Side','Direction','Type','Action','Buy/Sell'))?'Long':'Short';
  const qty=Math.abs(gn(row,'Fill Qty','Filled Qty','Qty','Quantity','Size','Contracts','Volume'))||1;
  const entry=gn(row,'Entry Price','Avg Entry','Open Price','Entry','Avg Fill Price','Fill Price','Price');
  const exit=gn(row,'Exit Price','Close Price','Avg Close','Exit');
  const pnl=gn(row,'P&L','PnL','Profit','Net P&L','Realized P&L','P/L','Gross P/L','Result');
  const comm=gn(row,'Commission','Comm','Fees','Fee');
  if(!sym&&!date&&!pnl)return null;
  let calcPnl=pnl;
  if(!pnl&&entry&&exit){
    calcPnl=(side==='Long'?(exit-entry):(entry-exit))*getTickValue(sym)*qty;
  }
  const fees=comm||feeForSymbol(sym)*qty*2;
  return{date,time,symbol:sym,side,qty,entry:entry||null,exit:exit||null,sl:null,tp:null,
    pnl:calcPnl,fees,netPnl:calcPnl-fees,rr:null,tags:[],checklist:{},mistakes:[],rating:0,
    killzone:dkz(time),emotion:'',bias:'',notes:'',chartUrl:'',chartImg:null,
    importedAt:new Date().toISOString(),source:'CSV ('+importMode+')'};
}

// Pair individual fills (Buy row + Sell row) into round-trip trades
