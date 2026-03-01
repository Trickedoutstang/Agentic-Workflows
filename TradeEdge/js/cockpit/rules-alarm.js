// TradeEdge — Trade Rules & Nuclear Alarm

function _checkTradeRules(trade){
  if(!S.rules||!S.rules.alarmEnabled)return [];
  var violations=[];
  // Max contracts per trade
  if(trade.qty>S.rules.maxContractsPerTrade){
    violations.push({rule:'MAX_CONTRACTS',msg:'OVERSIZED POSITION: '+trade.qty+' contracts (max '+S.rules.maxContractsPerTrade+')',severity:'critical'});
  }
  // Max trades per day
  var dayTrades=S.trades.filter(function(t){return t.date===trade.date;});
  if(dayTrades.length>S.rules.maxTradesPerDay){
    violations.push({rule:'MAX_TRADES',msg:'OVERTRADING: '+dayTrades.length+' trades today (max '+S.rules.maxTradesPerDay+')',severity:'critical'});
  }
  // Max daily loss
  var dayNet=dayTrades.reduce(function(a,t){return a+(t.netPnl||t.pnl||0);},0);
  if(dayNet<0&&Math.abs(dayNet)>S.rules.maxDailyLoss){
    violations.push({rule:'MAX_LOSS',msg:'DAILY LOSS LIMIT BREACHED: $'+Math.abs(dayNet).toFixed(2)+' (max $'+S.rules.maxDailyLoss+')',severity:'critical'});
  }
  return violations;
}

// Change 25+26: Nuclear alarm trigger — 3D effects + audio
var _alarmActive=false;
function triggerNuclearAlarm(violations){
  if(_alarmActive)return;
  _alarmActive=true;
  // Log violations
  var now=new Date();
  var dateStr=now.toISOString().split('T')[0];
  var timeStr=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  violations.forEach(function(v){
    S.violations.push({date:dateStr,time:timeStr,rule:v.rule,msg:v.msg});
  });
  save();
  // Show HTML overlay
  var alarmEl=document.getElementById('nuclear-alarm');
  var detailsEl=document.getElementById('alarm-details');
  if(alarmEl&&detailsEl){
    detailsEl.innerHTML=violations.map(function(v){return '<div style="margin-bottom:6px">'+v.msg+'</div>';}).join('');
    alarmEl.style.display='flex';
  }
  // Play nuclear siren
  _playNuclearSiren();
  // 3D scene effects (if available)
  if(typeof _3d!=='undefined'&&_3d.inited){
    // Monitor flash red
    if(_3d._monitors){
      _3d._monitors.forEach(function(mon){
        if(mon.userData&&mon.userData.screenMat){
          mon.userData.screenMat.emissive=new THREE.Color(0x660000);
          mon.userData.screenMat.emissiveIntensity=0.8;
        }
      });
    }
    // Desk glow red
    if(_3d._deskMat){
      _3d._deskMat.emissive=new THREE.Color(0x660000);
      _3d._deskMat.emissiveIntensity=0.3;
    }
    // Camera shake for 3 seconds
    var _shakeStart=performance.now();
    var _origCamX=_3d.camera.position.x;
    function _shakeLoop(){
      var el=performance.now()-_shakeStart;
      if(el<3000){
        _3d.camera.position.x=_origCamX+Math.sin(el*0.025)*0.1*(1-el/3000);
        requestAnimationFrame(_shakeLoop);
      }else{
        _3d.camera.position.x=_origCamX;
      }
    }
    _shakeLoop();
    // Reset 3D effects after 6 seconds
    setTimeout(function(){
      if(_3d._monitors){
        _3d._monitors.forEach(function(mon){
          if(mon.userData&&mon.userData.screenMat){
            mon.userData.screenMat.emissive=new THREE.Color(0xffffff);
            mon.userData.screenMat.emissiveIntensity=0.3;
          }
        });
      }
      if(_3d._deskMat){
        _3d._deskMat.emissive=new THREE.Color(0x000000);
        _3d._deskMat.emissiveIntensity=0;
      }
      _alarmActive=false; // Allow future alarms after effects clear
    },6000);
  }
}

function dismissAlarm(){
  _alarmActive=false;
  var alarmEl=document.getElementById('nuclear-alarm');
  if(alarmEl)alarmEl.style.display='none';
}

// Change 26: Nuclear siren audio synthesis
function _playNuclearSiren(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();
    var gain=ctx.createGain();
    osc.type='sawtooth';
    gain.gain.setValueAtTime(0.25,ctx.currentTime);
    // Two-tone siren: alternate 600Hz and 800Hz every 0.5s for 4 seconds
    for(var i=0;i<8;i++){
      osc.frequency.setValueAtTime(i%2===0?600:800,ctx.currentTime+i*0.5);
    }
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+4.5);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+4.5);
  }catch(e){console.warn('[TradeEdge] Nuclear siren audio failed:',e);}
}

// Change 14: Clean disposal of desk scene objects on re-init
