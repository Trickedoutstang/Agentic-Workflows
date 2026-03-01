// TradeEdge — 3D Chip Initialization & Animation

function init3DChips(){
  if(typeof _3d==='undefined'||_3d.inited)return;
  if(typeof THREE==='undefined'){console.warn('[TradeEdge] Three.js not loaded');return;}
  var canvas=document.getElementById('chip-canvas');
  if(!canvas){console.warn('[TradeEdge] chip-canvas not found');return;}
  var container=document.getElementById('chip-tray');
  if(!container){console.warn('[TradeEdge] chip-tray not found');return;}
  
  // Force layout calc
  var w=container.offsetWidth, h=container.offsetHeight;
  if(w<10||h<10){
    console.log('[TradeEdge] chip-tray too small:',w,'x',h,'retrying...');
    setTimeout(function(){
      init3DChips();
      // If init succeeded on retry, create chip meshes immediately
      if(_3d&&_3d.inited){_lastChipBalance=-1;if(typeof updateSidebar==='function')updateSidebar();}
    },500);
    return;
  }
  console.log('[TradeEdge] init3DChips:',w,'x',h);
  
  // Explicitly size canvas — 4K: higher DPR cap
  canvas.width=w*Math.min(window.devicePixelRatio,3);
  canvas.height=h*Math.min(window.devicePixelRatio,3);
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';

  _3d.scene=new THREE.Scene();
  if(_TEX_SPACE_SKYBOX){
    var _skyImg=new Image();
    _skyImg.onload=function(){var skyTex=new THREE.Texture(_skyImg);skyTex.needsUpdate=true;_3d.scene.background=skyTex;};
    _skyImg.src=_TEX_SPACE_SKYBOX;
  }
  if(!_TEX_SPACE_SKYBOX)_3d.scene.background=new THREE.Color(0x020610);
  _3d.scene.fog=new THREE.FogExp2(0x020610,0.025); // V2.3: tighter fog for bridge interior

  // Camera — wider FOV for full desk view (V2.1 fix: bottom cutoff)
  var _isMobile=w<600;
  _3d.camera=new THREE.PerspectiveCamera(_isMobile?48:42,w/h,0.5,30);
  _3d.camera.position.set(0,_isMobile?4.5:3.8,_isMobile?9.0:8.0);
  _3d.camera.lookAt(0,2.4,-1.5);

  try{
    // Change 5: iOS WebGL powerPreference for battery efficiency
    var _isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
    _3d.renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!_isIOS,alpha:false,powerPreference:_isIOS?'low-power':'high-performance'});
  }catch(e){
    console.error('[TradeEdge] WebGL renderer creation failed:',e);
    window._threeJsFailed=true;
    return;
  }
  _3d.renderer.setSize(w,h);
  _3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio,3));
  _3d.renderer.shadowMap.enabled=true;
  _3d.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  _3d.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  _3d.renderer.toneMappingExposure=1.1;
  _3d.renderer.outputEncoding=THREE.sRGBEncoding;

  // V3.0: Star Citizen Cockpit lighting
  var _shadowRes=_isMobile?1024:4096;
  // 1. Key overhead — cooler, dimmer for cockpit mood
  var key=new THREE.SpotLight(0xa0b8d0,1.2,25,Math.PI*0.25,0.6,1.2);
  key.position.set(0,10,2);key.target.position.set(0,0,-1);
  key.castShadow=true;key.shadow.mapSize.set(_shadowRes,_shadowRes);
  key.shadow.camera.near=1;key.shadow.camera.far=20;
  key.shadow.bias=-0.001;key.shadow.radius=4;
  _3d.scene.add(key);_3d.scene.add(key.target);
  // 2. Console glow — stronger cyan from below for "projection from below" feel
  var consoleGlow=new THREE.PointLight(0x00d4ff,0.8,10);
  consoleGlow.position.set(0,0.7,0);_3d.scene.add(consoleGlow);
  // 3. Viewscreen backlight — blue wash from behind
  var vsLight=new THREE.SpotLight(0x1a3a5a,0.8,15,Math.PI*0.5,0.8,1.5);
  vsLight.position.set(0,5,-3);vsLight.target.position.set(0,3,-4);
  _3d.scene.add(vsLight);_3d.scene.add(vsLight.target);
  // 4. Ambient — much darker base for higher contrast
  _3d.scene.add(new THREE.AmbientLight(0x0a1020,0.3));
  // 5. Hemisphere — subtle sky/ground
  _3d.scene.add(new THREE.HemisphereLight(0x1a2a3a,0x050810,0.3));
  // 6. Rim accents — stronger, deeper blue
  var rimL=new THREE.PointLight(0x0088cc,0.5,12);rimL.position.set(-5,3,0);_3d.scene.add(rimL);
  var rimR=new THREE.PointLight(0x0088cc,0.5,12);rimR.position.set(5,3,0);_3d.scene.add(rimR);
  // 7. Under-console uplights — cyan glow from below left/right
  var upL=new THREE.PointLight(0x00d4ff,0.3,6);upL.position.set(-2,0.3,0.5);_3d.scene.add(upL);
  var upR=new THREE.PointLight(0x00d4ff,0.3,6);upR.position.set(2,0.3,0.5);_3d.scene.add(upR);
  // 8. Cockpit canopy rim — spotlight from behind/above camera
  var canopyRim=new THREE.SpotLight(0x0a1a30,0.4,20,Math.PI*0.6,0.9,1.5);
  canopyRim.position.set(0,6,10);canopyRim.target.position.set(0,2,0);
  _3d.scene.add(canopyRim);_3d.scene.add(canopyRim.target);

  // V3.0: Star Citizen Cockpit — Command Console
  _createConsole(_3d.scene);
  // V3.0: Cockpit frame pillars + canopy bar
  _createCockpitFrame(_3d.scene);
  // V3.1: Steampunk control centers + joystick
  _createControlCenters(_3d.scene);
  _createJoystick(_3d.scene);

  // V3.0: Hull panels — cockpit interior walls
  // Back hull — dark gray with subtle panel lines
  var _hullDS=window.innerWidth<600?2:4;
  var hullC=document.createElement('canvas');hullC.width=512*_hullDS;hullC.height=256*_hullDS;
  var hctx=hullC.getContext('2d');hctx.scale(_hullDS,_hullDS);
  hctx.fillStyle='#0d1117';hctx.fillRect(0,0,512,256);
  hctx.strokeStyle='rgba(200,220,240,0.05)';hctx.lineWidth=1;
  for(var hp=0;hp<8;hp++){var hpx=hp*64+32;hctx.beginPath();hctx.moveTo(hpx,0);hctx.lineTo(hpx,256);hctx.stroke();}
  for(var hp2=0;hp2<4;hp2++){var hpy=hp2*64+32;hctx.beginPath();hctx.moveTo(0,hpy);hctx.lineTo(512,hpy);hctx.stroke();}
  var hullTex=new THREE.CanvasTexture(hullC);
  if(_TEX_HULL_WALL)_loadAITexInto(hullTex,_TEX_HULL_WALL);
  var wallGeo=new THREE.PlaneGeometry(16,8);
  var wallMat=new THREE.MeshStandardMaterial({map:hullTex,color:0x0d1117,roughness:0.8,metalness:0.3});
  var wall=new THREE.Mesh(wallGeo,wallMat);wall.position.set(0,3,-4.5);_3d.scene.add(wall);
  // V3.1: Side walls with windows (space visible through them)
  // Windowed walls created after viewscreen init (needs space textures)
  // Ceiling — dark, nearly black with faint panel grid
  var ceilGeo=new THREE.PlaneGeometry(16,10);
  var ceilTex=null;
  if(_TEX_CEILING_PANEL){ceilTex=new THREE.Texture();_loadAITexInto(ceilTex,_TEX_CEILING_PANEL);}
  var ceilMat=new THREE.MeshStandardMaterial({color:0x080a10,roughness:0.9,metalness:0.2});
  if(ceilTex)ceilMat.map=ceilTex;
  var ceiling=new THREE.Mesh(ceilGeo,ceilMat);ceiling.rotation.x=Math.PI/2;ceiling.position.y=7;_3d.scene.add(ceiling);

  // Change 9-10: Create monitors (4 desktop, 2 mobile)
  _createMonitors(_3d.scene);
  // Change 11: Init procedural chart data
  _initChartData();
  // Change 12: ICT leather journal
  _createJournal(_3d.scene);
  // Change 20: Phone on right side of desk
  _createPhone(_3d.scene);
  // Change 21: Spiral notebook on left side of desk
  _createSpiralNotebook(_3d.scene);
  // V2.3: Holographic wireframe globe (replaces moon)
  _createMoon(_3d.scene);
  // V3.1: Main viewscreen + continuous space flight
  _createViewscreen(_3d.scene);
  // V3.1: Side windows (use space textures from viewscreen)
  if(_3d._space){
    _createWindowedWall(_3d.scene,'left',hullTex,_3d._space.leftTex);
    _createWindowedWall(_3d.scene,'right',hullTex,_3d._space.rightTex);
  }
  // V3.0: Ambient holographic particles
  _createAmbientParticles(_3d.scene);

  // Chip group — repositioned to z=1.0 (front of desk, closer to camera)
  _3d.chipGroup=new THREE.Group();
  _3d.chipGroup.position.set(-3.2,0.75,1.0);
  _3d.scene.add(_3d.chipGroup);
  _3d.inited=true;

  // Show 3D canvas, hide CSS fallback
  canvas.style.display='block';
  var _fb=document.getElementById('chip-css-fallback');if(_fb)_fb.style.display='none';

  // Change 13: Unified interaction system — orbit + raycaster with priority
  _3d._targetX=0;_3d._targetY=0;_3d._curX=0;_3d._curY=0;_3d._fidgets=[];
  _3d._hoveredObj=null;
  var _ray=new THREE.Raycaster(),_mouse=new THREE.Vector2();

  // Helper: get all interactive scene objects for raycasting
  function _getInteractiveObjects(){
    var objs=[];
    // Journal
    if(_3d._journal)objs.push.apply(objs,_3d._journal.children);
    // Monitors
    if(_3d._monitors)_3d._monitors.forEach(function(m){objs.push.apply(objs,m.children);});
    // Chips
    if(_3d.chipGroup)objs.push.apply(objs,_3d.chipGroup.children);
    // V3.0: Viewscreen + Moon
    if(_3d._vsGroup)objs.push.apply(objs,_3d._vsGroup.children);
    if(_3d._ictLogo)objs.push.apply(objs,_3d._ictLogo.children);
    else if(_3d._moon)objs.push.apply(objs,_3d._moon.children);
    return objs;
  }

  // Helper: traverse up to find userData.type
  function _findInteractiveParent(obj){
    var cur=obj;
    while(cur){
      if(cur.userData&&cur.userData.type)return cur;
      cur=cur.parent;
    }
    return null;
  }

  // Mouse orbit + hover detection
  container.addEventListener('mousemove',function(e){
    var rect=container.getBoundingClientRect();
    var mx=(e.clientX-rect.left)/rect.width-0.5;
    var my=(e.clientY-rect.top)/rect.height-0.5;
    _3d._targetX=mx*1.5;_3d._targetY=my*0.4;
    // Hover detection
    _mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    _mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    _ray.setFromCamera(_mouse,_3d.camera);
    var allObjs=_getInteractiveObjects();
    var hits=_ray.intersectObjects(allObjs,true);
    var newHover=null;
    if(hits.length>0){
      var interactive=_findInteractiveParent(hits[0].object);
      if(interactive&&(interactive.userData.type==='journal'||interactive.userData.type==='monitor'||interactive.userData.type==='notebook'||interactive.userData.type==='phone'||interactive.userData.type==='viewscreen'||interactive.userData.type==='moon')){
        newHover=interactive;
      }
    }
    if(newHover!==_3d._hoveredObj){
      // Reset old hover glow
      if(_3d._hoveredObj&&_3d._hoveredObj.userData&&_3d._hoveredObj.userData.screenMat){
        _3d._hoveredObj.userData.screenMat.emissiveIntensity=0.3;
      }
      _3d._hoveredObj=newHover;
      container.style.cursor=newHover?'pointer':'default';
      // V3.0: Hover sound
      if(newHover&&_userHasInteracted)_playHoloHover();
    }
  });
  container.addEventListener('mouseleave',function(){
    _3d._targetX=0;_3d._targetY=0;
    if(_3d._hoveredObj){
      if(_3d._hoveredObj.userData&&_3d._hoveredObj.userData.screenMat)_3d._hoveredObj.userData.screenMat.emissiveIntensity=0.3;
      _3d._hoveredObj=null;
    }
    container.style.cursor='default';
  });

  // Unified click handler — priority: journal → notebook → calendar → monitors → phone → chips
  function _handleSceneClick(e){
    var rect=container.getBoundingClientRect();
    var cx,cy;
    if(e.changedTouches){cx=e.changedTouches[0].clientX;cy=e.changedTouches[0].clientY;}
    else{cx=e.clientX;cy=e.clientY;}
    _mouse.x=((cx-rect.left)/rect.width)*2-1;
    _mouse.y=-((cy-rect.top)/rect.height)*2+1;
    _ray.setFromCamera(_mouse,_3d.camera);

    // Check all scene objects
    var allObjs=_getInteractiveObjects();
    var hits=_ray.intersectObjects(allObjs,true);
    if(hits.length>0){
      var interactive=_findInteractiveParent(hits[0].object);
      if(interactive){
        var t=interactive.userData.type;
        // V3.0: Click feedback + holo chirp for all interactive objects
        _clickFeedback(interactive);
        if(_userHasInteracted)_playHoloClick();
        if(t==='journal'){go('journal');return;}
        if(t==='notebook'){if(typeof openKeyLevels==='function')openKeyLevels();return;}
        if(t==='phone'){go('trades');return;}
        if(t==='viewscreen'){go('analytics');return;}
        if(t==='moon'){go('settings');return;}
        if(t==='monitor'){
          go('analytics');return;
        }
      }
    }
    // Fallback: check chip clicks
    var chipHits=_ray.intersectObjects(_3d.chipGroup.children,true);
    if(chipHits.length>0){
      var hitObj=chipHits[0].object;
      while(hitObj.parent&&hitObj.parent!==_3d.chipGroup)hitObj=hitObj.parent;
      for(var i=0;i<_3d.stacks.length;i++){
        if(_3d.stacks[i].mesh===hitObj){_fidgetStack(i);break;}
      }
    }
  }
  container.addEventListener('click',_handleSceneClick);
  // Mobile touch → synthetic click for tap parity
  container.addEventListener('touchend',function(e){
    if(e.changedTouches&&e.changedTouches.length===1){
      e.preventDefault();
      _handleSceneClick(e);
    }
  },{passive:false});

  // Start render loop
  function animate3D(){
    _3d.animId=requestAnimationFrame(animate3D);
    var _frameNow=performance.now(),_frameSec=_frameNow*0.001;
    // Animate drops — dramatic slam from above
    if(_3d.dropStart>0){
      var now=_frameNow,allDone=true;
      _3d.allChips.forEach(function(c){
        if(c.done)return;
        var elapsed=now-_3d.dropStart-c.delay;
        if(elapsed<0){allDone=false;return;}
        var t=Math.min(elapsed/280,1); // 280ms — fast realistic gravity slam
        // Bounce easing
        var e;
        if(t<1/2.75)e=7.5625*t*t;
        else if(t<2/2.75)e=7.5625*(t-=1.5/2.75)*t+0.75;
        else if(t<2.5/2.75)e=7.5625*(t-=2.25/2.75)*t+0.9375;
        else e=7.5625*(t-=2.625/2.75)*t+0.984375;
        c.mesh.position.y=c.startY+(c.targetY-c.startY)*e;
        // Animate X/Z convergence and rotation correction
        if(c.startX!==undefined){c.mesh.position.x=c.startX+(c.targetX-c.startX)*e;}
        if(c.startZ!==undefined){c.mesh.position.z=c.startZ+(c.targetZ-c.startZ)*e;}
        if(c.startRX!==undefined){c.mesh.rotation.x=c.startRX*(1-e);}
        if(c.startRZ!==undefined){c.mesh.rotation.z=c.startRZ*(1-e);}
        if(t>=1){c.mesh.position.y=c.targetY;c.mesh.position.x=c.targetX||c.mesh.position.x;c.mesh.position.z=c.targetZ||c.mesh.position.z;c.mesh.rotation.x=0;c.mesh.rotation.z=0;c.done=true;}else allDone=false;
      });
      if(allDone)_3d.dropStart=-1;
    }
    // Fidget animations
    if(_3d._fidgets&&_3d._fidgets.length>0){
      var now2=_frameNow;
      for(var fi=_3d._fidgets.length-1;fi>=0;fi--){
        var fa=_3d._fidgets[fi],fel=now2-fa.st;
        if(fel>=fa.dur){
          if(fa._spreadChips){fa._spreadChips.forEach(function(sc){_disposeSpreadChip(sc);_3d.chipGroup.remove(sc);});fa.m.visible=true;fa._spreadChips=null;}
          fa.m.position.y=fa.by;fa.m.position.x=fa.bx||fa.m.position.x;fa.m.position.z=fa.bz||fa.m.position.z;fa.m.rotation.y=fa.bry;fa.m.rotation.z=fa.brz||0;_3d._fidgets.splice(fi,1);continue;
        }
        fa.fn(fa,fel/fa.dur);
      }
    }
    // Smooth camera orbit — Change 7 updated targets
    _3d._curX+=(_3d._targetX-_3d._curX)*0.05;
    _3d._curY+=(_3d._targetY-_3d._curY)*0.05;
    var _camBaseY=_isMobile?4.5:3.8;
    var _camBaseZ=_isMobile?9.0:8.0;
    _3d.camera.position.x=_3d._curX;
    _3d.camera.position.y=_camBaseY-_3d._curY;
    _3d.camera.position.z=_camBaseZ;
    _3d.camera.lookAt(0,2.4,-1.5);
    // Change 14: Skip heavy work when paused (navigated away from dashboard)
    if(_3d._paused){_3d.renderer.render(_3d.scene,_3d.camera);return;}
    // Change 13: Hover glow pulsing on interactive objects
    if(_3d._hoveredObj&&_3d._hoveredObj.userData&&_3d._hoveredObj.userData.screenMat){
      _3d._hoveredObj.userData.screenMat.emissiveIntensity=0.15+Math.sin(_frameNow*0.005)*0.08;
    }
    // V3.2: ICT Logo float + slow spin
    if(_3d._ictLogo){
      var t=_frameSec;
      _3d._ictLogo.position.y=(_3d._ictLogoBaseY||1.55)+Math.sin(t*Math.PI/2)*0.15;
      _3d._ictLogo.children[0].rotation.z+=0.008;
    }
    // V2.1: Legacy moon compat
    if(_3d._moon&&!_3d._ictLogo){
      _3d._moon.position.y=(_3d._moonBaseY||1.55)+Math.sin(_frameSec*Math.PI/2)*0.15;
      _3d._moon.children[0].rotation.y+=0.005;
    }
    // V3.1: Continuous space flight update
    if(_3d._space){
      _3d._space.frame++;
      var _vsThrottle=_isMobile?8:4;
      if(_3d._space.frame%_vsThrottle===0){
        _drawSpaceFlight();
        _3d._space.tex.needsUpdate=true;
        if(_3d._space.leftTex)_3d._space.leftTex.needsUpdate=true;
        if(_3d._space.rightTex)_3d._space.rightTex.needsUpdate=true;
      }
    }
    // V2.3: Holographic levitation
    var ht=_frameSec;
    if(_3d._journal)_3d._journal.position.y=0.82+Math.sin(ht*1.2)*0.03;
    if(_3d._notebook)_3d._notebook.position.y=0.81+Math.sin(ht*1.0+1)*0.04;
    if(_3d._phone)_3d._phone.position.y=0.83+Math.sin(ht*1.4+2)*0.03;
    // V3.2: ICT logo ring glow pulse (or legacy moon wireframe)
    if(_3d._ictLogo&&_3d._ictLogo.children[1])_3d._ictLogo.children[1].material.opacity=0.3+0.15*Math.sin(ht*2);
    else if(_3d._moonWireMat)_3d._moonWireMat.opacity=0.3+0.1*Math.sin(ht*2);
    // Change 11: Update chart textures (frame-throttled)
    _updateChartTextures();
    // V3.2: Sci-fi control panel LED strip pulse
    if(_3d._controlLights){
      _3d._controlLights.forEach(function(cl){
        cl.mesh.material.opacity=0.6+0.4*Math.sin(_frameSec*cl.rate*1.5);
      });
    }
    // V3.1: Joystick tracks mouse position
    if(_3d._joystick){
      _3d._joystick.rotation.x=_3d._curY*-0.2;
      _3d._joystick.rotation.z=_3d._curX*0.2;
    }
    // V3.0: Ambient particle drift
    _updateAmbientParticles(_frameNow);
    _3d.renderer.render(_3d.scene,_3d.camera);
  }
  animate3D();

  // Handle resize
  var resizeObs=new ResizeObserver(function(entries){
    var e=entries[0];if(!e)return;
    var w2=e.contentRect.width,h2=e.contentRect.height;
    if(w2<10||h2<10)return;
    _3d.camera.aspect=w2/h2;_3d.camera.updateProjectionMatrix();
    _3d.renderer.setSize(w2,h2);
  });
  resizeObs.observe(container);
}

