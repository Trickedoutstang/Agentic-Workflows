// TradeEdge — Trading Calendar

function calNav(dir){
  calDate.setMonth(calDate.getMonth()+dir);
  renderCalendar();
}
function renderCalendar(){
  const grid=document.getElementById('cal-grid');
  const title=document.getElementById('cal-title');
  const summary=document.getElementById('cal-summary');
  if(!grid||!calDate)return;

  const year=calDate.getFullYear();
  const month=calDate.getMonth();
  const today=new Date();
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  title.textContent=monthNames[month]+' '+year;

  // Aggregate daily P&L
  const dayMap={};
  S.trades.forEach(t=>{
    if(!t.date)return;
    const d=new Date(t.date);
    if(d.getFullYear()===year&&d.getMonth()===month){
      const day=d.getDate();
      if(!dayMap[day])dayMap[day]={pnl:0,net:0,trades:0,wins:0,losses:0};
      const np=t.netPnl!=null&&t.netPnl!==0?t.netPnl:(t.pnl||0)-(t.fees||0);
      dayMap[day].pnl+=(t.pnl||0);
      dayMap[day].net+=np;
      dayMap[day].trades++;
      if(np>0)dayMap[day].wins++;
      else if(np<0)dayMap[day].losses++;
    }
  });

  // Monthly summary
  const monthTrades=Object.values(dayMap);
  const monthNet=monthTrades.reduce((s,d)=>s+d.net,0);
  const monthGross=monthTrades.reduce((s,d)=>s+d.pnl,0);
  const tradingDays=monthTrades.length;
  const greenDays=monthTrades.filter(d=>d.net>0).length;
  const redDays=monthTrades.filter(d=>d.net<0).length;
  const totalTrades=monthTrades.reduce((s,d)=>s+d.trades,0);
  const bestDay=monthTrades.length?Math.max(...monthTrades.map(d=>d.net)):0;
  const worstDay=monthTrades.length?Math.min(...monthTrades.map(d=>d.net)):0;

  summary.innerHTML=`
    <span>Net: <strong style="color:${monthNet>=0?'var(--green)':'var(--red)'}">${f$(monthNet)}</strong></span>
    <span>Days: <strong style="color:var(--accent)">${tradingDays}</strong> <span style="color:var(--green)">(${greenDays}W</span>/<span style="color:var(--red)">${redDays}L)</span></span>
    <span>Trades: <strong>${totalTrades}</strong></span>
    <span>Best: <strong style="color:var(--green)">${f$(bestDay)}</strong></span>
    <span>Worst: <strong style="color:var(--red)">${f$(worstDay)}</strong></span>
  `;

  // V2.1: Build news event map from ForexFactory data
  const newsMap={};
  if(S._econEvents&&S._econEvents.length){
    S._econEvents.forEach(ev=>{
      if(!ev.date)return;
      const parts=ev.date.split('-');if(parts.length<3)return;
      const eY=parseInt(parts[0],10),eM=parseInt(parts[1],10)-1,eD=parseInt(parts[2],10);
      if(eY===year&&eM===month){
        if(!newsMap[eD])newsMap[eD]=[];
        newsMap[eD].push(ev);
      }
    });
  }

  // Build calendar grid
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const dayNames=['SUN','MON','TUE','WED','THU','FRI','SAT'];

  let html=dayNames.map(d=>`<div class="cal-hdr">${d}</div>`).join('');

  // Empty cells before first day
  for(let i=0;i<firstDay;i++){
    html+=`<div class="cal-day empty"></div>`;
  }

  // Running balance for the month
  let runBal=0;
  for(let d=1;d<=daysInMonth;d++){
    const data=dayMap[d];
    const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===d;
    const dow=new Date(year,month,d).getDay();
    const isWeekend=dow===0||dow===6;
    const dayNews=newsMap[d];
    const newsDot=dayNews?`<span class="cal-news-dot" title="${dayNews.map(e=>escapeHtml(e.time+' '+e.event)).join('&#10;')}">${dayNews.length}</span>`:'';

    if(data){
      runBal+=data.net;
      const cls=data.net>0?'win':data.net<0?'loss':'flat';
      // V2.3: Smooth color interpolation — stronger P&L = deeper color
      var absMax=Math.max(Math.abs(bestDay),Math.abs(worstDay),1);
      var intensity=Math.min(Math.abs(data.net)/absMax,1)*0.15+0.05; // 5%-20% opacity range
      var heatBg=data.net>0?'rgba(0,229,160,'+intensity.toFixed(3)+')':data.net<0?'rgba(255,75,85,'+intensity.toFixed(3)+')':'';
      html+=`<div class="cal-day ${cls}${isToday?' today':''}" style="background:${heatBg}" title="${monthNames[month]} ${d}: ${data.trades} trades, Net ${f$(data.net)}">
        <div class="cal-num">${d}${newsDot}</div>
        <div class="cal-pnl">${f$(data.net)}</div>
        <div class="cal-trades">${data.trades}T · ${data.wins}W/${data.losses}L</div>
      </div>`;
    } else {
      html+=`<div class="cal-day ${isWeekend?'no-trade':'empty'}${isToday?' today':''}">
        <div class="cal-num" style="color:var(--t3)">${d}${newsDot}</div>
        ${isWeekend?'':'<div style="font-size:.55rem;color:var(--t3);margin-top:8px">—</div>'}
      </div>`;
    }
  }

  grid.innerHTML=html;
}

// ══════════════════════════════════════════════════════════
// TRADE LOG
// ══════════════════════════════════════════════════════════
let tradeFilter='all';
