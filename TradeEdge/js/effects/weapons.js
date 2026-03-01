// TradeEdge — Weapon System

function _toggleWeaponMode(){
  if(!_3d._space)return;
  _3d._space.weaponMode=!_3d._space.weaponMode;
  var ch=document.getElementById('weapon-crosshair');
  var btn=document.getElementById('btn-weapons');
  if(_3d._space.weaponMode){
    ch.classList.add('active');
    btn.style.background='rgba(255,68,68,0.15)';
    btn.style.borderColor='rgba(255,68,68,0.4)';
    document.body.style.cursor='none';
    // Track crosshair to mouse
    document.addEventListener('mousemove',_weaponMouseMove);
  }else{
    ch.classList.remove('active');
    btn.style.background='';btn.style.borderColor='';
    document.body.style.cursor='';
    document.removeEventListener('mousemove',_weaponMouseMove);
  }
}
function _weaponMouseMove(e){
  var ch=document.getElementById('weapon-crosshair');
  ch.style.left=e.clientX+'px';ch.style.top=e.clientY+'px';
}

// Shooting: click on 3D canvas in weapon mode
document.addEventListener('click',function(e){
  if(!_3d._space||!_3d._space.weaponMode)return;
  var container=document.getElementById('chip-canvas');
  if(!container)return;
  var rect=container.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;
  // Map click to canvas coordinates
  var sp=_3d._space;
  var normX=(e.clientX-rect.left)/rect.width;
  var normY=(e.clientY-rect.top)/rect.height;
  // Approximate mapping to viewscreen canvas coordinates
  var cx=normX*sp.cw,cy=normY*sp.ch;
  // Play laser sound
  _playLaserFire();
  // Add laser visual
  sp.lasers.push({sx:sp.cw/2,sy:sp.ch,ex:cx,ey:cy,life:0});
  // Check target hits
  var hit=false;
  for(var ti=sp.targets.length-1;ti>=0;ti--){
    var t=sp.targets[ti];
    var dx=t.x-cx,dy=t.y-cy;
    if(Math.sqrt(dx*dx+dy*dy)<t.r+15){
      // Hit! Create explosion
      var particles=[];
      for(var pi=0;pi<16;pi++){
        var angle=Math.random()*Math.PI*2;
        var speed=1+Math.random()*3;
        particles.push({vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
          r:1+Math.random()*3,c:Math.random()>0.5?'rgba(255,150,50,0.9)':'rgba(255,255,200,0.8)'});
      }
      sp.explosions.push({x:t.x,y:t.y,particles:particles,life:0});
      sp.targets.splice(ti,1);
      sp.score++;
      _playExplosion();
      hit=true;
      break;
    }
  }
});

// ══════════════════════════════════════════════════════════
// V3.1: SELF-DESTRUCT SEQUENCE
// ══════════════════════════════════════════════════════════
var _sdActive=false;
function _initSelfDestruct(){
  if(_sdActive)return;
  if(!confirm('INITIATE SELF-DESTRUCT SEQUENCE?\n\nThis will destroy the cockpit for dramatic effect.\nThe page will auto-reload after 5 seconds.'))return;
  _sdActive=true;
  _playSelfDestruct();
  var overlay=document.getElementById('sd-overlay');
  var container=document.getElementById('chip-canvas');
  // Phase 1: Red alarm flashing (0-3s)
  var flashCount=0;
  var flashInterval=setInterval(function(){
    flashCount++;
    if(container)container.style.filter=flashCount%2===0?'brightness(1) hue-rotate(0deg)':'brightness(2) hue-rotate(30deg)';
    if(flashCount>20){clearInterval(flashInterval);}
  },150);
  // Phase 2: Screen shake (1-3s)
  setTimeout(function(){
    var shakeCount=0;
    var shakeInterval=setInterval(function(){
      shakeCount++;
      if(container){
        var sx=(Math.random()-0.5)*20,sy=(Math.random()-0.5)*20;
        container.style.transform='translate('+sx+'px,'+sy+'px)';
      }
      if(shakeCount>30){
        clearInterval(shakeInterval);
        if(container)container.style.transform='';
      }
    },50);
  },1000);
  // Phase 3: Explosion overlay (2.5s)
  setTimeout(function(){
    overlay.classList.add('active');
    overlay.innerHTML='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:white;font-family:var(--display);font-size:3rem;letter-spacing:4px;text-shadow:0 0 40px rgba(255,100,0,0.8)">HULL BREACH</div>';
  },2500);
  // Phase 4: White flash + fade (3.5s)
  setTimeout(function(){
    overlay.style.background='white';
    overlay.innerHTML='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#333;font-family:var(--mono);font-size:1rem">SIGNAL LOST</div>';
  },3500);
  // Phase 5: Auto-reload (5s)
  setTimeout(function(){
    location.reload();
  },5000);
}

