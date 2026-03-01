// TradeEdge — Chip Rendering

function _disposeSpreadChip(sc){
  if(sc.material){
    if(Array.isArray(sc.material))sc.material.forEach(function(m){m.dispose();});
    else sc.material.dispose();
  }
}

/* Fidget animation for a clicked stack */
function _fidgetStack(si){
  var sk=_3d.stacks[si];if(!sk)return;
  // Cancel any existing fidget on this stack first
  for(var i=_3d._fidgets.length-1;i>=0;i--){
    if(_3d._fidgets[i].si===si){
      var old=_3d._fidgets[i];
      // Clean up spread chips if they exist
      if(old._spreadChips){
        old._spreadChips.forEach(function(sc){_disposeSpreadChip(sc);_3d.chipGroup.remove(sc);});
        old.m.visible=true;
      }
      old.m.position.y=old.by;old.m.position.x=old.bx;old.m.position.z=old.bz;
      old.m.rotation.y=old.bry;old.m.rotation.z=old.brz;
      _3d._fidgets.splice(i,1);
    }
  }
  var m=sk.mesh;
  var a={si:si,m:m,by:m.position.y,bx:m.position.x,bz:m.position.z,bry:m.rotation.y,brz:m.rotation.z||0,st:performance.now()};
  // Spread is weighted 2x more likely
  var types=['spread','spread','bounce','spin','hop','launch','tilt','wobble'];
  var tr=types[Math.floor(Math.random()*types.length)];
  if(tr==='spread'){
    // Grab stack, lift, spread chips in air, then drop them one-by-one back down
    var count=sk.sz||3;
    var d=sk.d;
    var singles=[];
    for(var ci=0;ci<count;ci++){
      var chip=_makeSingleChipMesh(d);
      chip.position.copy(m.position);
      chip.rotation.copy(m.rotation);
      _3d.chipGroup.add(chip);
      singles.push(chip);
    }
    a._spreadChips=singles;
    a._slamPlayed={}; // track which chips have played their slam
    m.visible=false;
    var liftH=1.4; // how high the hand lifts the stack
    var spreadGap=0.25; // gap between chips when spread in the air
    var liftPhase=0.10; // 0-10% = quick lift
    var holdPhase=0.25; // 10-25% = spread apart in the air
    var dropPhase=1.0;  // 25-100% = chips fall one by one fast
    a.dur=900+(count*50); // snappy — real chips fall fast
    a.fn=function(a,t){
      var stackH=count*CHIP_H;
      // Base Y for each chip when stacked normally
      function baseY(ci){return a.by-(stackH/2)+CHIP_H/2+ci*CHIP_H;}
      // Spread Y when held in the air
      function spreadY(ci){return a.by+liftH-(count-1)*spreadGap/2+ci*spreadGap;}

      if(t<liftPhase){
        // Phase 1: Lift entire stack up smoothly
        var p=t/liftPhase;
        var ease=1-Math.pow(1-p,3); // ease out
        for(var ci=0;ci<singles.length;ci++){
          singles[ci].position.y=baseY(ci)+liftH*ease;
          singles[ci].position.x=a.bx;
          singles[ci].position.z=a.bz;
          singles[ci].rotation.z=0;
        }
      }else if(t<holdPhase){
        // Phase 2: Spread chips apart in the air (still held)
        var p=(t-liftPhase)/(holdPhase-liftPhase);
        var ease=1-Math.pow(1-p,2);
        for(var ci=0;ci<singles.length;ci++){
          var lifted=baseY(ci)+liftH;
          var target=spreadY(ci);
          singles[ci].position.y=lifted+(target-lifted)*ease;
          singles[ci].position.x=a.bx;
          singles[ci].position.z=a.bz;
          // Slight wobble while held
          singles[ci].rotation.z=Math.sin(p*Math.PI*2+ci)*0.03;
        }
      }else{
        // Phase 3: Release chips one by one from bottom to top
        var dropT=(t-holdPhase)/(dropPhase-holdPhase);
        for(var ci=0;ci<singles.length;ci++){
          var dropDelay=ci*0.12; // stagger — bottom chip drops first
          var chipT=(dropT-dropDelay)/(1-dropDelay*singles.length/(singles.length+1));
          chipT=Math.max(0,Math.min(1,chipT));

          var startY=spreadY(ci);
          var endY=baseY(ci);

          if(chipT<=0){
            // Still held in the air
            singles[ci].position.y=startY;
            singles[ci].rotation.z=Math.sin(ci)*0.02;
          }else if(chipT<1){
            // Falling — bounce easing
            var bt=chipT;
            var e;
            if(bt<1/2.75)e=7.5625*bt*bt;
            else if(bt<2/2.75){bt-=1.5/2.75;e=7.5625*bt*bt+0.75;}
            else if(bt<2.5/2.75){bt-=2.25/2.75;e=7.5625*bt*bt+0.9375;}
            else{bt-=2.625/2.75;e=7.5625*bt*bt+0.984375;}
            singles[ci].position.y=startY+(endY-startY)*e;
            singles[ci].rotation.z=(1-chipT)*Math.sin(ci)*0.02;
            // Play slam sound when chip first lands (e > 0.95)
            if(e>0.95&&!a._slamPlayed[ci]){
              a._slamPlayed[ci]=true;
              if(_userHasInteracted)_playChipSlamSound(ci,singles.length);
            }
          }else{
            // Landed
            singles[ci].position.y=endY;
            singles[ci].rotation.z=0;
            if(!a._slamPlayed[ci]){
              a._slamPlayed[ci]=true;
              if(_userHasInteracted)_playChipSlamSound(ci,singles.length);
            }
          }
          singles[ci].position.x=a.bx;
          singles[ci].position.z=a.bz;
        }
      }
      // Clean up when done
      if(t>=1){
        a._spreadChips.forEach(function(sc){_disposeSpreadChip(sc);_3d.chipGroup.remove(sc);});
        a.m.visible=true;
        a._spreadChips=null;
      }
    };
  }else if(tr==='bounce'){
    // Quick satisfying bounce
    a.dur=500;
    a.fn=function(a,t){a.m.position.y=a.by+Math.sin(t*Math.PI)*.35;};
  }else if(tr==='spin'){
    // Full rotation with slight lift
    a.dur=700;
    a.fn=function(a,t){a.m.rotation.y=a.bry+t*Math.PI*2;a.m.position.y=a.by+Math.sin(t*Math.PI)*.12;};
  }else if(tr==='hop'){
    // Rapid double-hop
    a.dur=450;
    a.fn=function(a,t){
      var phase=t*2%1;var hop=t<0.5?0:1;
      a.m.position.y=a.by+Math.sin(phase*Math.PI)*(hop?0.15:0.28);
    };
  }else if(tr==='launch'){
    // Shoots way up then falls back with realistic bounce
    a.dur=1000;
    a.fn=function(a,t){
      if(t<0.42){
        a.m.position.y=a.by+Math.sin((t/0.42)*Math.PI/2)*1.1;
      }else{
        var ft=(t-0.42)/0.58;
        var e;if(ft<1/2.75)e=7.5625*ft*ft;
        else if(ft<2/2.75){var _f=ft-1.5/2.75;e=7.5625*_f*_f+0.75;}
        else if(ft<2.5/2.75){var _f=ft-2.25/2.75;e=7.5625*_f*_f+0.9375;}
        else{var _f=ft-2.625/2.75;e=7.5625*_f*_f+0.984375;}
        a.m.position.y=a.by+1.1*(1-e);
      }
    };
  }else if(tr==='tilt'){
    // Sways side to side like a tap, with decay
    a.dur=750;
    a.fn=function(a,t){
      var decay=Math.pow(1-t,1.4);
      a.m.rotation.z=a.brz+Math.sin(t*Math.PI*3.5)*decay*0.5;
      a.m.position.y=a.by+Math.abs(Math.sin(t*Math.PI*3.5))*decay*0.06;
    };
  }else{
    // Wobble — lateral nudge with decay
    a.dur=650;
    a.fn=function(a,t){
      var decay=Math.pow(1-t,1.3);
      a.m.position.x=a.bx+Math.sin(t*Math.PI*4.5)*decay*0.22;
      a.m.position.y=a.by+Math.abs(Math.sin(t*Math.PI*4.5))*decay*0.08;
    };
  }
  _3d._fidgets.push(a);
  _playChipFidgetSound(tr);
}

// V3.0: Holographic disc fidget sound — sine chirps + digital glitch
