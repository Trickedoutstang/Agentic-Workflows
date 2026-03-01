// TradeEdge — Market Bells & Killzone HUD

function toggleSidebar(){
  const sb = document.querySelector('.sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  sb.classList.toggle('open');
  bd.classList.toggle('open');
}
// Close sidebar on nav click (mobile)
document.querySelectorAll('.ni').forEach(n => {
  n.addEventListener('click', () => {
    if(window.innerWidth <= 768){
      const sb = document.querySelector('.sidebar');
      const bd = document.getElementById('sidebar-backdrop');
      sb.classList.remove('open');
      bd.classList.remove('open');
    }
  });
});
// Close sidebar on resize to desktop
window.addEventListener('resize', () => {
  if(window.innerWidth > 768){
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
  }
});

// ══════════════════════════════════════════════════════════
// PART H: MARKET SESSION AUDIO (Changes 39-40)
// ══════════════════════════════════════════════════════════

// Change 39: NYSE Opening Bell audio synthesis
function _playOpeningBell(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    // Primary bell tone (C6) + overtones
    [1046,2093,3139].forEach(function(freq,i){
      var osc=ctx.createOscillator();var gain=ctx.createGain();
      osc.type='sine';osc.frequency.value=freq;
      gain.gain.setValueAtTime([0.15,0.06,0.03][i],ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+5);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+5);
      // Second ring (ding-ding pattern)
      var osc2=ctx.createOscillator();var gain2=ctx.createGain();
      osc2.type='sine';osc2.frequency.value=freq;
      gain2.gain.setValueAtTime([0.12,0.05,0.02][i],ctx.currentTime+0.6);
      gain2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+5.5);
      osc2.connect(gain2);gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime+0.6);osc2.stop(ctx.currentTime+5.5);
    });
  }catch(e){console.warn('[TradeEdge] Opening bell audio error:',e);}
}

function _playClosingBell(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=880;
    gain.gain.setValueAtTime(0.1,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+3);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+3);
  }catch(e){console.warn('[TradeEdge] Closing bell audio error:',e);}
}

// Change 40: Monitor message flash
function _flashMonitorsMessage(text,color,durationMs){
  if(typeof _3d==='undefined'||!_3d.inited||!_monCanvases.length)return;
  _monCanvases.forEach(function(m,i){
    var ctx=m.ctx,cw=m.w,ch=m.h;
    // Save current state by not clearing — just overdraw
    ctx.fillStyle=color==='#00e5a0'?'#0a2a1a':'#2a0a0a';
    ctx.fillRect(0,0,cw,ch);
    ctx.fillStyle=color;ctx.font='bold '+(cw/10)+'px monospace';ctx.textAlign='center';
    ctx.fillText(text,cw/2,ch/2);
    ctx.textAlign='left';
    if(_monTextures[i])_monTextures[i].needsUpdate=true;
  });
  // Restore charts after duration
  setTimeout(function(){
    _monCanvases.forEach(function(m,i){
      _drawCandlestickChart(m);
      if(_monTextures[i])_monTextures[i].needsUpdate=true;
    });
  },durationMs);
}

// Market bell scheduler
var _bellPlayed=false,_closingBellPlayed=false;
var _bellEnabled=true; // Set from S.rules.bellEnabled
setInterval(function(){
  if(!_bellEnabled)return;
  try{
    var now=new Date();
    var et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
    var h=et.getHours(),m=et.getMinutes(),dow=et.getDay();
    if(dow<1||dow>5)return; // Weekdays only
    if(h===9&&m===30&&!_bellPlayed){
      _bellPlayed=true;_userHasInteracted=true;
      _playOpeningBell();
      _flashMonitorsMessage('MARKET OPEN','#00e5a0',3000);
    }
    if(h===9&&m===31)_bellPlayed=false;
    if(h===16&&m===0&&!_closingBellPlayed){
      _closingBellPlayed=true;_userHasInteracted=true;
      _playClosingBell();
      _flashMonitorsMessage('MARKET CLOSED','#ff3d5a',3000);
    }
    if(h===16&&m===1)_closingBellPlayed=false;
  }catch(e){}
},10000);

// ══════════════════════════════════════════════════════════
// PART I: LIVE DATA INTELLIGENCE (Changes 42, 45)
// ══════════════════════════════════════════════════════════

// Change 42: Killzone countdown timer + active session indicator
function _updateKillzoneHUD(){
  var hud=document.getElementById('kz-timer-hud');
  if(!hud)return;
  try{
    var now=new Date();
    var et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
    var h=et.getHours(),m=et.getMinutes(),dow=et.getDay();
    if(dow<1||dow>5){hud.style.display='none';return;}
    var nowMin=h*60+m;
    // Killzone schedule (ET)
    var zones=[
      {name:'Asian',start:20*60,end:24*60,color:'#a855f7'},
      {name:'London',start:2*60,end:5*60,color:'#0ea5e9'},
      {name:'NY AM',start:9*60+30,end:12*60,color:'#00e5a0'},
      {name:'NY Lunch',start:12*60,end:13*60+30,color:'#4d6890'},
      {name:'NY PM',start:13*60+30,end:16*60,color:'#f5b731'}
    ];
    // Special windows
    var specials=[
      {name:'Silver Bullet',start:10*60,end:11*60},
      {name:'Macro',start:9*60+50,end:10*60+10},
      {name:'Macro',start:10*60+50,end:11*60+10},
      {name:'Macro',start:13*60+50,end:14*60+10}
    ];
    var activeZone=null;
    zones.forEach(function(z){
      if(nowMin>=z.start&&nowMin<z.end)activeZone=z;
    });
    var activeSB=null;
    specials.forEach(function(s){if(nowMin>=s.start&&nowMin<s.end)activeSB=s;});
    if(activeZone){
      hud.style.display='flex';
      var timeInKZ=nowMin-activeZone.start;
      var totalKZ=activeZone.end-activeZone.start;
      var timeLeft=activeZone.end-nowMin;
      var pct=timeInKZ/totalKZ*100;
      var label=activeZone.name+(activeZone.name==='NY Lunch'?' (AVOID)':' KZ');
      var statusText=activeZone.name==='NY Lunch'?'LUNCH — avoid trading':'ACTIVE';
      var sbNote=activeSB?(' | '+activeSB.name+' WINDOW'):'';
      hud.innerHTML='<div style="display:flex;align-items:center;gap:6px;width:100%">'+
        '<div style="width:6px;height:6px;border-radius:50%;background:'+activeZone.color+';flex-shrink:0"></div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="display:flex;justify-content:space-between;font-size:.6rem;margin-bottom:2px">'+
            '<span style="color:'+activeZone.color+'">'+label+' ● '+statusText+sbNote+'</span>'+
            '<span style="color:var(--t3)">'+timeLeft+'m left</span>'+
          '</div>'+
          '<div style="height:3px;background:var(--b1);border-radius:2px;overflow:hidden">'+
            '<div style="height:100%;width:'+pct+'%;background:'+activeZone.color+';border-radius:2px;transition:width 1s linear"></div>'+
          '</div>'+
        '</div>'+
      '</div>';
    }else{
      // Show next killzone
      var nextZone=null,nextIn=Infinity;
      zones.forEach(function(z){
        var diff=z.start-nowMin;
        if(diff>0&&diff<nextIn){nextIn=diff;nextZone=z;}
      });
      if(nextZone&&nextIn<=60){
        hud.style.display='flex';
        hud.innerHTML='<div style="font-size:.6rem;color:var(--t3)">Next: '+nextZone.name+' in '+nextIn+'m</div>';
      }else{
        hud.style.display='none';
      }
    }
  }catch(e){hud.style.display='none';}
}
setInterval(_updateKillzoneHUD,10000);
try{_updateKillzoneHUD();}catch(e){}

// Change 45: Session performance auto-summary at 4 PM ET
var _sessionSummaryShown=false;
setInterval(function(){
  try{
    var now=new Date();
    var et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
    var h=et.getHours(),m=et.getMinutes(),dow=et.getDay();
    if(dow<1||dow>5)return;
    if(h===16&&m===0&&!_sessionSummaryShown){
      _sessionSummaryShown=true;
      _showSessionSummary();
    }
    if(h===16&&m===1)_sessionSummaryShown=false;
  }catch(e){}
},15000);

function _showSessionSummary(){
  var now=new Date();
  var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var todayTrades=S.trades.filter(function(t){return t.date===todayStr;});
  if(!todayTrades.length)return;
  var net=todayTrades.reduce(function(a,t){return a+(t.netPnl||t.pnl||0);},0);
  var wins=todayTrades.filter(function(t){return(t.netPnl||t.pnl||0)>0;}).length;
  var best=Math.max.apply(null,todayTrades.map(function(t){return t.netPnl||t.pnl||0;}));
  var worst=Math.min.apply(null,todayTrades.map(function(t){return t.netPnl||t.pnl||0;}));
  var ov=document.getElementById('session-summary-overlay');
  if(!ov)return;
  var body=document.getElementById('session-summary-body');
  if(body){
    body.innerHTML=
      '<div style="text-align:center;margin-bottom:12px">'+
        '<div style="font-size:.7rem;color:var(--t3)">Trades: '+todayTrades.length+' | Wins: '+wins+'/'+ todayTrades.length+'</div>'+
        '<div style="font-size:1.5rem;font-family:var(--mono);color:'+(net>=0?'var(--green)':'var(--red)')+'">'+f$(net)+'</div>'+
        '<div style="font-size:.65rem;color:var(--t3);margin-top:4px">Best: '+f$(best)+' | Worst: '+f$(worst)+'</div>'+
      '</div>';
  }
  ov.style.display='flex';
}

// ══════════════════════════════════════════════════════════
// V3.1: WEAPON TARGETING SYSTEM
// ══════════════════════════════════════════════════════════
