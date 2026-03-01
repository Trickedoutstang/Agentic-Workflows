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

// Normalize symbol: F.US.MNQH26→MNQ, CME_MINI:MESH2025→MES, NQ1!→NQ, 6EH26→6E
function nsym(s){
  if(!s)return'';s=s.toUpperCase().trim();
  // Strip exchange prefixes: "CME_MINI:", "F.US.", "COMEX:", etc.
  s=s.replace(/^[A-Z_]+:/,'');
  s=s.replace(/^F\.[A-Z]+\./,''); // F.US.MNQH26 → MNQH26
  s=s.replace(/^[A-Z]+\./,'');    // CME.ESH26 → ESH26
  // Standard symbols: MNQH26→MNQ, ESM2025→ES, CLZ24→CL, M2KZ26→M2K, E6H26→E6
  const m=s.match(/^([A-Z][A-Z0-9]{1,3}?)[FGHJKMNQUVXZ]\d{2,4}$/);
  if(m)return m[1];
  // Digit-prefixed currency symbols: 6EH26→6E, 6BM2025→6B, 6JZ24→6J
  const mc=s.match(/^(\d[A-Z])[FGHJKMNQUVXZ]\d{2,4}$/);
  if(mc)return mc[1];
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

// Dollar-per-point multiplier for P&L calculation
// Formula: (priceA - priceB) * getTickValue(sym) * qty = dollar P&L
function getTickValue(sym){
  var tv={
    // ── Equity Index ────────────────────────────────
    MNQ:2, NQ:20,             // Nasdaq-100  (tick 0.25, $0.50/$5)
    MES:5, ES:50,             // S&P 500     (tick 0.25, $1.25/$12.50)
    MYM:0.5, YM:5,            // Dow Jones   (tick 1, $0.50/$5)
    M2K:5, RTY:50,            // Russell 2000 (tick 0.10, $0.50/$5)
    EMD:100,                  // S&P MidCap 400
    NKD:5,                    // Nikkei 225 (USD)
    // ── Energy ──────────────────────────────────────
    CL:1000, MCL:100,         // Crude Oil    (tick 0.01, $10/$1)
    QM:500,                   // E-mini Crude (tick 0.025, $12.50)
    NG:10000,                 // Natural Gas  (tick 0.001, $10)
    QG:2500,                  // E-mini Nat Gas (tick 0.005, $12.50)
    RB:42000,                 // RBOB Gasoline (tick 0.0001, $4.20)
    HO:42000,                 // Heating Oil  (tick 0.0001, $4.20)
    // ── Metals ──────────────────────────────────────
    GC:100, MGC:10,           // Gold         (tick 0.10, $10/$1)
    SI:5000, SIL:1000,        // Silver       (tick 0.005, $25/$5)
    HG:25000,                 // Copper       (tick 0.0005, $12.50)
    PL:50,                    // Platinum     (tick 0.10, $5)
    PA:100,                   // Palladium    (tick 0.10, $10)
    // ── Treasury / Interest Rate ────────────────────
    ZB:1000, UB:1000,         // 30-Year Bond / Ultra Bond
    ZN:1000, TN:1000,         // 10-Year Note / Ultra 10-Year
    ZF:1000,                  // 5-Year Note
    ZT:2000,                  // 2-Year Note
    // ── Agriculture ─────────────────────────────────
    ZC:50, ZS:50, ZW:50,      // Corn, Soybeans, Wheat (cents/bu)
    ZM:100,                   // Soybean Meal ($/ton)
    ZL:600,                   // Soybean Oil  (cents/lb)
    CT:500,                   // Cotton       (cents/lb)
    KC:375,                   // Coffee       (cents/lb)
    SB:1120,                  // Sugar        (cents/lb)
    CC:10,                    // Cocoa        ($/ton)
    // ── Livestock ───────────────────────────────────
    HE:400,                   // Lean Hogs    (cents/lb)
    LE:400,                   // Live Cattle  (cents/lb)
    GF:500,                   // Feeder Cattle (cents/lb)
    // ── Currency ────────────────────────────────────
    '6E':125000,              // Euro FX
    '6B':62500,               // British Pound
    '6J':12500000,            // Japanese Yen
    '6A':100000,              // Australian Dollar
    '6C':100000,              // Canadian Dollar
    '6S':125000,              // Swiss Franc
    '6N':100000,              // New Zealand Dollar
    '6M':500000,              // Mexican Peso
    E6:125000,E7:125000,      // Alt Euro codes (CQG/Rithmic)
    J6:12500000,              // Alt Yen code
    // ── Crypto ──────────────────────────────────────
    BTC:5, MBT:0.1,           // Bitcoin / Micro Bitcoin
    ETH:50, MET:0.1           // Ether / Micro Ether
  };
  return tv[sym]||1;
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
