// TradeEdge — Audio System

function _playChipFidgetSound(type){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.connect(ctx.destination);
    var n=type==='launch'?5:type==='spin'?3:2;
    for(var i=0;i<n;i++){(function(idx){
      var t=idx*0.02+Math.random()*0.01;
      var pv=0.9+Math.random()*0.2;
      // Short sine chirp (high freq, no noise)
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(1800*pv,ctx.currentTime+t);
      o.frequency.exponentialRampToValueAtTime(2400*pv,ctx.currentTime+t+0.06);
      g.gain.setValueAtTime(0.1,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.08);
      o.connect(g);g.connect(comp);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.1);
      // Bass hum pulse
      var o2=ctx.createOscillator(),g2=ctx.createGain();
      o2.type='sine';
      o2.frequency.setValueAtTime(120*pv,ctx.currentTime+t);
      o2.frequency.exponentialRampToValueAtTime(80*pv,ctx.currentTime+t+0.04);
      g2.gain.setValueAtTime(0.06,ctx.currentTime+t);
      g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.06);
      o2.connect(g2);g2.connect(comp);o2.start(ctx.currentTime+t);o2.stop(ctx.currentTime+t+0.08);
    })(i);}
    // For launch, add a digital glitch landing
    if(type==='launch'){
      setTimeout(function(){
        try{
          var ctx2=new(window.AudioContext||window.webkitAudioContext)();
          var o=ctx2.createOscillator(),g=ctx2.createGain();
          o.type='square';o.frequency.setValueAtTime(2200,ctx2.currentTime);
          o.frequency.exponentialRampToValueAtTime(440,ctx2.currentTime+0.05);
          g.gain.setValueAtTime(0.08,ctx2.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx2.currentTime+0.08);
          o.connect(g);g.connect(ctx2.destination);o.start();o.stop(ctx2.currentTime+0.1);
        }catch(e){}
      },430);
    }
  }catch(e){}
}

// V3.0: Per-stack holographic disc slam — bass hum + sine chirp when each stack materializes
function _playChipSlamSound(idx,total){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var t=ctx.currentTime;
    var pitchVar=0.9+Math.random()*0.2;
    var isLast=(idx===total-1);
    var vol=isLast?1.2:0.8+Math.random()*0.3;

    var master=ctx.createGain();master.gain.value=vol*0.4;
    master.connect(ctx.destination);

    // LAYER 1: Deep bass hum pulse — holographic materialization
    var hum=ctx.createOscillator(),hg=ctx.createGain();
    hum.type='sine';
    hum.frequency.setValueAtTime(80*pitchVar,t);
    hum.frequency.exponentialRampToValueAtTime(40,t+0.2);
    hg.gain.setValueAtTime(0.12*vol,t);
    hg.gain.exponentialRampToValueAtTime(0.001,t+0.25);
    hum.connect(hg);hg.connect(master);
    hum.start(t);hum.stop(t+0.3);

    // LAYER 2: Rising sine chirp — energy disc activation
    var chirp=ctx.createOscillator(),cg=ctx.createGain();
    chirp.type='sine';
    chirp.frequency.setValueAtTime(1600*pitchVar,t);
    chirp.frequency.exponentialRampToValueAtTime(2800*pitchVar,t+0.06);
    cg.gain.setValueAtTime(0.06*vol,t);
    cg.gain.exponentialRampToValueAtTime(0.001,t+0.08);
    chirp.connect(cg);cg.connect(master);
    chirp.start(t);chirp.stop(t+0.1);

    // LAYER 3: Subtle digital shimmer
    var shim=ctx.createOscillator(),sg=ctx.createGain();
    shim.type='sine';
    shim.frequency.setValueAtTime(4400*pitchVar,t+0.01);
    shim.frequency.exponentialRampToValueAtTime(3200*pitchVar,t+0.05);
    sg.gain.setValueAtTime(0.02*vol,t+0.01);
    sg.gain.exponentialRampToValueAtTime(0.001,t+0.06);
    shim.connect(sg);sg.connect(master);
    shim.start(t+0.01);shim.stop(t+0.07);

    setTimeout(function(){ctx.close();},500);
  }catch(e){console.warn('[TradeEdge] Slam audio error:',e);}
}

// V3.0: Holographic disc drop cascade — rising chirps + bass hum crescendo
function _playChipDropSound(count){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var n=Math.min(count||8,25);

    var comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=12;comp.ratio.value=4;
    comp.attack.value=0.002;comp.release.value=0.05;
    comp.connect(ctx.destination);

    var dryGain=ctx.createGain();dryGain.gain.value=0.8;dryGain.connect(comp);

    for(var i=0;i<n;i++){(function(idx){
      var t=idx<5?idx*0.03:0.15+(idx-5)*0.05+(Math.random()*0.01);
      var pv=0.9+Math.random()*0.2;

      // Rising sine chirp per disc
      var chirp=ctx.createOscillator(),cg=ctx.createGain();
      chirp.type='sine';
      chirp.frequency.setValueAtTime(1400*pv,ctx.currentTime+t);
      chirp.frequency.exponentialRampToValueAtTime(2600*pv,ctx.currentTime+t+0.06);
      cg.gain.setValueAtTime(0.05,ctx.currentTime+t);
      cg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.08);
      chirp.connect(cg);cg.connect(dryGain);
      chirp.start(ctx.currentTime+t);chirp.stop(ctx.currentTime+t+0.1);

      // Sub bass hum per disc
      var bass=ctx.createOscillator(),bg=ctx.createGain();
      bass.type='sine';
      bass.frequency.setValueAtTime(100*pv,ctx.currentTime+t);
      bass.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+t+0.08);
      bg.gain.setValueAtTime(0.03,ctx.currentTime+t);
      bg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.1);
      bass.connect(bg);bg.connect(dryGain);
      bass.start(ctx.currentTime+t);bass.stop(ctx.currentTime+t+0.12);

      // Every 3rd disc: digital glitch blip
      if(idx%3===2){
        var glitch=ctx.createOscillator(),gg=ctx.createGain();
        glitch.type='square';
        glitch.frequency.setValueAtTime(3200*pv,ctx.currentTime+t+0.01);
        glitch.frequency.exponentialRampToValueAtTime(1600,ctx.currentTime+t+0.03);
        gg.gain.setValueAtTime(0.015,ctx.currentTime+t+0.01);
        gg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.04);
        glitch.connect(gg);gg.connect(dryGain);
        glitch.start(ctx.currentTime+t+0.01);glitch.stop(ctx.currentTime+t+0.05);
      }
    })(i);}

    // Settle: deep hum resolution
    var st=n<5?n*0.03+0.04:0.15+(n-5)*0.05+0.06;
    var resolve=ctx.createOscillator(),rg=ctx.createGain();
    resolve.type='sine';
    resolve.frequency.setValueAtTime(60,ctx.currentTime+st);
    resolve.frequency.exponentialRampToValueAtTime(30,ctx.currentTime+st+0.3);
    rg.gain.setValueAtTime(0.04,ctx.currentTime+st);
    rg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+st+0.35);
    resolve.connect(rg);rg.connect(dryGain);
    resolve.start(ctx.currentTime+st);resolve.stop(ctx.currentTime+st+0.4);
  }catch(e){console.warn('[TradeEdge] Audio error:',e);}
}

// _lastChipBalance and _nukeTriggered declared early at ~line 1407
var _chipInitRetries=0;
var _userHasInteracted=false;
document.addEventListener('click',function(){_userHasInteracted=true;},{once:true});
document.addEventListener('keydown',function(){_userHasInteracted=true;},{once:true});

// V3.1: Global UI Audio System
function _playUIHover(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=440;
    g.gain.setValueAtTime(0.015,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.08);
    setTimeout(function(){ctx.close();},200);
  }catch(e){}
}
function _playUIClick(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(1200,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1800,ctx.currentTime+0.04);
    g.gain.setValueAtTime(0.06,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.06);
    setTimeout(function(){ctx.close();},150);
  }catch(e){}
}
function _playUINav(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(800,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200,ctx.currentTime+0.08);
    g.gain.setValueAtTime(0.04,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.1);
    setTimeout(function(){ctx.close();},200);
  }catch(e){}
}
function _playUIToggle(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=600;
    g.gain.setValueAtTime(0.04,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.04);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.04);
    setTimeout(function(){ctx.close();},100);
  }catch(e){}
}
function _playLaserFire(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.setValueAtTime(2000,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(4000,ctx.currentTime+0.03);
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.05);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.05);
    setTimeout(function(){ctx.close();},150);
  }catch(e){}
}
function _playExplosion(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain(),n=ctx.createBufferSource();
    o.type='sine';o.frequency.setValueAtTime(80,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(30,ctx.currentTime+0.2);
    g.gain.setValueAtTime(0.12,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.2);
    // Noise burst
    var bufSize=ctx.sampleRate*0.1;var buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
    var data=buf.getChannelData(0);for(var i=0;i<bufSize;i++)data[i]=(Math.random()*2-1)*0.3;
    n.buffer=buf;var ng=ctx.createGain();ng.gain.setValueAtTime(0.08,ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    n.connect(ng);ng.connect(ctx.destination);n.start();
    setTimeout(function(){ctx.close();},400);
  }catch(e){}
}
function _playSelfDestruct(){
  if(!_userHasInteracted)return;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    // Alarm siren
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(400,ctx.currentTime);
    o.frequency.linearRampToValueAtTime(800,ctx.currentTime+0.5);
    o.frequency.linearRampToValueAtTime(400,ctx.currentTime+1.0);
    g.gain.setValueAtTime(0.15,ctx.currentTime);
    g.gain.setValueAtTime(0.15,ctx.currentTime+2.5);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+3.0);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+3.0);
    // Deep explosion at the end
    setTimeout(function(){
      var o2=ctx.createOscillator(),g2=ctx.createGain();
      o2.type='sine';o2.frequency.setValueAtTime(60,ctx.currentTime);
      o2.frequency.exponentialRampToValueAtTime(15,ctx.currentTime+1.5);
      g2.gain.setValueAtTime(0.2,ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.5);
      o2.connect(g2);g2.connect(ctx.destination);o2.start();o2.stop(ctx.currentTime+1.5);
    },2500);
    setTimeout(function(){ctx.close();},5000);
  }catch(e){}
}

// V3.1: Event delegation for hover/click audio
var _lastUIHover=0;
document.body.addEventListener('mouseover',function(e){
  if(!_userHasInteracted)return;
  var now=performance.now();if(now-_lastUIHover<150)return;
  var t=e.target;
  if(t.matches&&t.matches('.ni,.btn,.mc,.cal-day,.jcard,.fchip,.tag,.ict-tag,.kz-tag,tbody tr,.share-btn')){
    _lastUIHover=now;_playUIHover();
  }
},true);
document.body.addEventListener('click',function(e){
  if(!_userHasInteracted)return;
  var t=e.target;
  if(t.matches&&t.matches('.ni,.ni *'))_playUINav();
  else if(t.matches&&t.matches('.btn,.btn *'))_playUIClick();
  else if(t.matches&&t.matches('.mc,.mc *,.cal-day,.cal-day *,.jcard,.jcard *'))_playUIClick();
},true);

