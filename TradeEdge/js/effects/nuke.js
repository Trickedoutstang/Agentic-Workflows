// TradeEdge — Self-Destruct Sequence

function nukeImpact(){
  // Hide countdown
  document.getElementById('nuke-overlay').classList.remove('active');
  // Drop the nuke emoji
  var emoji=document.getElementById('nuke-emoji');
  emoji.style.display='block';
  emoji.style.animation='nukeDrop .8s cubic-bezier(.6,.04,.98,.34) forwards';
  setTimeout(function(){
    emoji.style.display='none';
    // Flash
    var flash=document.getElementById('nuke-flash');
    flash.style.display='block';
    flash.style.animation='nukeFlash .6s ease-out forwards';
    // Screen shake
    document.body.style.animation='screenShake .5s ease';
    setTimeout(function(){document.body.style.animation='';},500);
    // App falls apart
    setTimeout(function(){
      flash.style.display='none';
      var dashboard=document.getElementById('view-dashboard');
      if(dashboard)dashboard.classList.add('falling');
    },400);
    // Blackout
    setTimeout(function(){
      document.getElementById('nuke-blackout').classList.add('active');
      playSadTrombone();
    },2500);
  },800);
}
function playSadTrombone(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    // Sad trombone: Bb4 → A4 → Ab4 → G4 (descending, each slightly longer)
    var notes=[
      {freq:466.16,start:0,dur:.4},
      {freq:440.00,start:.45,dur:.4},
      {freq:415.30,start:.9,dur:.5},
      {freq:392.00,start:1.5,dur:1.2}
    ];
    notes.forEach(function(n){
      var osc=ctx.createOscillator();
      var gain=ctx.createGain();
      osc.type='sawtooth';
      osc.frequency.setValueAtTime(n.freq,ctx.currentTime+n.start);
      // Slight pitch drop on last note for extra sadness
      if(n.dur>1)osc.frequency.linearRampToValueAtTime(n.freq*.94,ctx.currentTime+n.start+n.dur);
      gain.gain.setValueAtTime(.15,ctx.currentTime+n.start);
      gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+n.start+n.dur);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(ctx.currentTime+n.start);
      osc.stop(ctx.currentTime+n.start+n.dur+.1);
    });
  }catch(e){console.log('[TradeEdge] Audio not supported');}
}
function dismissNuke(){
  document.getElementById('nuke-blackout').classList.remove('active');
  var dashboard=document.getElementById('view-dashboard');
  if(dashboard)dashboard.classList.remove('falling');
  _nukeTriggered=false;
}
