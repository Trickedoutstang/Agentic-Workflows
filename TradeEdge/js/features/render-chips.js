// TradeEdge — renderChips Main Entry

function _showCSSFallback(balance){
  var cv=document.getElementById('chip-canvas');if(cv)cv.style.display='none';
  var fb=document.getElementById('chip-css-fallback');if(!fb)return;
  fb.style.display='flex';
  // Change 15: Enhanced CSS fallback — dark wood gradient + monitor labels
  fb.style.background='radial-gradient(ellipse at 50% 30%, #2a1a0e 0%, #120a04 60%, #060302 100%)';
  // Add monitor placeholder labels at top if not already present
  if(!fb.querySelector('.css-monitor-labels')){
    var monLabels=document.createElement('div');monLabels.className='css-monitor-labels';
    monLabels.style.cssText='display:flex;justify-content:center;gap:8px;margin-bottom:8px;width:100%;';
    var labels=['NQ 1m','NQ 15m','ES 5m','NQ Daily'];
    labels.forEach(function(lbl){
      var m=document.createElement('div');
      m.style.cssText='background:#0a1a14;border:1px solid #1a3a2a;border-radius:4px;padding:4px 10px;font-family:var(--mono);font-size:0.6rem;color:#00f0c066;letter-spacing:1px;';
      m.textContent=lbl;
      monLabels.appendChild(m);
    });
    fb.insertBefore(monLabels,fb.firstChild);
  }
  _renderCSSChips(balance,fb);
}

function renderChips(balance){
  if(typeof _3d==='undefined')return; // Script still initializing — deferred call will handle it
  var tray=document.getElementById('chip-tray');
  if(!tray)return;

  // Only render when dashboard is actually visible
  var dashView=document.getElementById('view-dashboard');
  if(!dashView||!dashView.classList.contains('active')){return;}

  console.log('[TradeEdge] renderChips: bal='+balance+', THREE='+(typeof THREE)+', failed='+window._threeJsFailed+', inited='+(typeof _3d!=='undefined'?_3d.inited:'n/a')+', tray='+tray.style.display);

  // Change 2: Only hide tray when user has real trades AND balance=0 (liquidated).
  // Keep visible with no data so TEST ALL button works and desk scene is always shown.
  if(balance<=0&&S.trades&&S.trades.length>0){
    tray.style.display='none';
    _lastChipBalance=balance;
    return;
  }
  tray.style.display='';

  // THREE.js unavailable — show CSS chips; if CDN still loading, poll and upgrade to 3D
  if(typeof THREE==='undefined'||window._threeJsFailed){
    console.warn('[TradeEdge] renderChips: Using CSS fallback (THREE='+(typeof THREE)+', failed='+window._threeJsFailed+')');
    if(balance!==_lastChipBalance){_lastChipBalance=balance;_showCSSFallback(balance);}
    // If THREE is still loading (not failed, just slow), poll every 300ms and upgrade to 3D
    if(typeof THREE==='undefined'&&!window._threeJsFailed&&!window._threeRetryPending){
      window._threeRetryPending=true;
      var _bal=balance;
      var _threeCheck=setInterval(function(){
        if(typeof THREE!=='undefined'){
          clearInterval(_threeCheck);window._threeRetryPending=false;
          console.log('[TradeEdge] THREE.js now available — upgrading to 3D chips');
          _lastChipBalance=-1;renderChips(_bal);
        }
        if(window._threeJsFailed){clearInterval(_threeCheck);window._threeRetryPending=false;}
      },300);
    }
    return;
  }
  if(!_3d.inited){
    try{init3DChips();}catch(e){console.error('[TradeEdge] init3DChips threw:',e);window._threeJsFailed=true;}
    if(!_3d.inited){
      _chipInitRetries++;
      console.log('[TradeEdge] renderChips: THREE.js loaded but init pending (retry '+_chipInitRetries+', tray w='+tray.offsetWidth+' h='+tray.offsetHeight+')');
      if(_chipInitRetries<6){
        setTimeout(function(){_lastChipBalance=-1;renderChips(balance);},600);
      }else{
        console.warn('[TradeEdge] renderChips: init failed after '+_chipInitRetries+' retries — CSS fallback');
        window._threeJsFailed=true;
        _showCSSFallback(balance);
      }
      return;
    }
    _chipInitRetries=0;
  }
  if(balance===_lastChipBalance&&_3d.allChips.length>0)return;
  _lastChipBalance=balance;

  // Clear existing chips — dispose materials on child meshes inside each stack Group
  while(_3d.chipGroup.children.length>0){
    var obj=_3d.chipGroup.children[0];
    if(obj.isGroup){obj.children.forEach(function(c){if(c.material){if(Array.isArray(c.material))c.material.forEach(function(m){m.dispose();});else c.material.dispose();}});}
    else if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(function(m){m.dispose();});else obj.material.dispose();}
    _3d.chipGroup.remove(obj);
  }
  _3d.allChips=[];_3d.stacks=[];_3d._fidgets=[];

  var countEl=document.getElementById('chip-tray-count');
  if(!balance||balance<=0){
    if(countEl)countEl.textContent=balance<=0&&S.trades.length>0?'LIQUIDATED':'No balance set';
    return;
  }

  // Break into groups
  var groups=[],rem=Math.floor(balance);
  for(var i=0;i<CHIP_DENOMS.length;i++){
    var ct=0;while(rem>=CHIP_DENOMS[i].v){ct++;rem-=CHIP_DENOMS[i].v;}
    if(ct>0)groups.push({denom:CHIP_DENOMS[i],count:ct});
  }

  // Build stacks
  var stacks=[];
  groups.forEach(function(g){
    var remaining=g.count;
    while(remaining>0){var sz=Math.min(remaining,CHIP_MAX_STACK);remaining-=sz;stacks.push({denom:g.denom,size:sz});}
  });
  stacks.sort(function(a,b){return b.size-a.size;});

  // Grid layout — CHIP_R=0.42, diameter=0.84. spacing=1.1 guarantees no cylinder overlap.
  var positions=[],totalStacks=stacks.length;
  var _numRows=totalStacks<=4?1:totalStacks<=9?2:3;
  var _perRow=Math.ceil(totalStacks/_numRows);
  var _xSp=0.55,_zSp=0.60; // V2.3: tighter spacing, natural scatter
  for(var _si=0;_si<totalStacks;_si++){
    var _row=Math.floor(_si/_perRow),_col=_si%_perRow;
    var _rowLen=Math.min(_perRow,totalStacks-_row*_perRow);
    positions.push({
      x:(_col-(_rowLen-1)/2)*_xSp+(Math.random()-.5)*.06,
      z:(_row-(_numRows-1)/2)*_zSp+(Math.random()-.5)*.06
    });
  }
  // V2.3: Boundary clamp — keep chips on console surface
  var CONSOLE_HALF_W=4.0,CONSOLE_HALF_Z=2.2;
  for(var _ci=0;_ci<positions.length;_ci++){
    positions[_ci].x=Math.max(-CONSOLE_HALF_W,Math.min(CONSOLE_HALF_W,positions[_ci].x));
    positions[_ci].z=Math.max(-CONSOLE_HALF_Z,Math.min(CONSOLE_HALF_Z,positions[_ci].z));
  }

  // Change 4: Depth-sort — push tall stacks backward (behind shorter ones)
  for(var _ds=0;_ds<totalStacks;_ds++){
    positions[_ds].z-=stacks[_ds].size*0.022;
  }

  // Create meshes — individual chip Groups per stack (V12: realistic imperfections)
  _3d.stacks=[];
  try{
  stacks.forEach(function(stack,si){
    var pos=positions[si]||{x:(si-totalStacks/2)*1.1,z:0};
    var mesh=_makeStackMesh(stack.denom,stack.size);
    var totalH=stack.size*CHIP_H;
    var targetY=totalH/2+0.005; // slightly above felt, no z-fight
    mesh.rotation.y=(Math.random()-.5)*0.15;
    var dropH=4+Math.random()*2; // 4-6 units — realistic toss height
    var spreadX=pos.x+(Math.random()-.5)*1.8;
    var spreadZ=pos.z+(Math.random()-.5)*1.4;
    mesh.position.set(spreadX,targetY+dropH,spreadZ);
    mesh.rotation.x=(Math.random()-.5)*0.4;
    mesh.rotation.z=(Math.random()-.5)*0.4;
    _3d.chipGroup.add(mesh);
    _3d.allChips.push({mesh:mesh,targetY:targetY,startY:targetY+dropH,delay:si*120,done:false,
      startX:spreadX,targetX:pos.x,startZ:spreadZ,targetZ:pos.z,
      startRX:mesh.rotation.x,startRZ:mesh.rotation.z});
    _3d.stacks.push({mesh:mesh,pos:pos,d:stack.denom,sz:stack.size});
  });
  }catch(e){
    console.error('[TradeEdge] Error creating chip meshes:',e);
    window._threeJsFailed=true;_3d.inited=false;
    _showCSSFallback(balance);return;
  }

  // Update HUD
  if(countEl){
    var total=groups.reduce(function(a,g){return a+g.count;},0);
    var parts=groups.map(function(g){return g.count+'× $'+g.denom.label;});
    countEl.textContent=total+' chips  ·  '+parts.join('  ·  ');
  }

  // Trigger drop animation + per-stack slam sounds
  console.log('[TradeEdge] renderChips: created '+stacks.length+' stacks, '+_3d.allChips.length+' meshes, balance=$'+balance.toFixed(2));
  _3d.dropStart=performance.now();
  // Schedule a slam sound for each stack landing (delay + 600ms fall duration)
  _3d.allChips.forEach(function(c,idx){
    var landTime=c.delay+280; // delay + drop duration
    setTimeout(function(){if(_userHasInteracted)_playChipSlamSound(idx,_3d.allChips.length);},landTime);
  });
}

// TEST: Render chips at any balance — call from console: testChips(50000)
window.testChips=function(bal){
  _lastChipBalance=-1;
  _userHasInteracted=true;
  if(_3d._fidgets){_3d._fidgets.forEach(function(f){if(f._spreadChips)f._spreadChips.forEach(function(sc){_disposeSpreadChip(sc);_3d.chipGroup.remove(sc);});});_3d._fidgets=[];}
  renderChips(bal||50000);
  console.log('[TradeEdge] testChips: rendering $'+(bal||50000).toLocaleString());
};

// Showcase: one stack per denomination with random heights — shows all color variations
window.testChipShowcase=function(){
  // Change 3: Try init3DChips() if not ready (mobile resilience)
  if(typeof _3d==='undefined')return;
  if(!_3d.inited){try{init3DChips();}catch(e){console.error('[TradeEdge] testChipShowcase init error:',e);}}
  if(!_3d.inited){console.warn('[TradeEdge] testChipShowcase: 3D not ready');return;}
  _userHasInteracted=true;
  _lastChipBalance=-1;
  // Clear
  if(_3d._fidgets){_3d._fidgets.forEach(function(f){if(f._spreadChips)f._spreadChips.forEach(function(sc){_disposeSpreadChip(sc);_3d.chipGroup.remove(sc);});});_3d._fidgets=[];}
  while(_3d.chipGroup.children.length>0){
    var obj=_3d.chipGroup.children[0];
    if(obj.isGroup){obj.children.forEach(function(c){if(c.material){if(Array.isArray(c.material))c.material.forEach(function(m){m.dispose();});else c.material.dispose();}});}
    else if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(function(m){m.dispose();});else obj.material.dispose();}
    _3d.chipGroup.remove(obj);
  }
  _3d.allChips=[];_3d.stacks=[];_3d._fidgets=[];
  // One stack per denom, random 3-10 chips
  var stacks=[];
  CHIP_DENOMS.forEach(function(d){stacks.push({denom:d,size:3+Math.floor(Math.random()*8)});});
  var total=stacks.length;
  var _numRows=total<=4?1:total<=9?2:3;
  var _perRow=Math.ceil(total/_numRows);
  var _xSp=1.05,_zSp=1.05;
  stacks.forEach(function(stack,si){
    var _row=Math.floor(si/_perRow),_col=si%_perRow;
    var _rowLen=Math.min(_perRow,total-_row*_perRow);
    var pos={x:(_col-(_rowLen-1)/2)*_xSp,z:(_row-(_numRows-1)/2)*_zSp};
    var mesh=_makeStackMesh(stack.denom,stack.size);
    var totalH=stack.size*CHIP_H;
    var targetY=totalH/2+0.005;
    mesh.rotation.y=(Math.random()-.5)*0.15;
    var dropH=4+Math.random()*2;
    var spreadX=pos.x+(Math.random()-.5)*1.8;
    var spreadZ=pos.z+(Math.random()-.5)*1.4;
    mesh.position.set(spreadX,targetY+dropH,spreadZ);
    mesh.rotation.x=(Math.random()-.5)*0.4;
    mesh.rotation.z=(Math.random()-.5)*0.4;
    _3d.chipGroup.add(mesh);
    _3d.allChips.push({mesh:mesh,targetY:targetY,startY:targetY+dropH,delay:si*120,done:false,
      startX:spreadX,targetX:pos.x,startZ:spreadZ,targetZ:pos.z,
      startRX:mesh.rotation.x,startRZ:mesh.rotation.z});
    _3d.stacks.push({mesh:mesh,pos:pos,d:stack.denom,sz:stack.size});
  });
  _3d.dropStart=performance.now();
  _3d.allChips.forEach(function(c,idx){
    setTimeout(function(){if(_userHasInteracted)_playChipSlamSound(idx,_3d.allChips.length);},c.delay+280);
  });
  var countEl=document.getElementById('chip-tray-count');
  if(countEl)countEl.textContent='SHOWCASE · '+stacks.map(function(s){return s.size+'× $'+s.denom.label;}).join('  ·  ');
  console.log('[TradeEdge] testChipShowcase: '+stacks.length+' denoms displayed');
};

// CSS poker chip fallback — shown when WebGL/THREE.js is unavailable
