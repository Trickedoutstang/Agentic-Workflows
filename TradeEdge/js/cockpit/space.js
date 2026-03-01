// TradeEdge — Space Flight & Viewscreen

function _disposeSceneObjects(){
  if(typeof _3d==='undefined'||!_3d.scene)return;
  var toRemove=[];
  _3d.scene.traverse(function(obj){
    if(obj===_3d.chipGroup)return; // Keep chip group
    if(obj.userData&&(obj.userData.type==='monitor'||obj.userData.type==='journal'||obj.userData.type==='notebook'||obj.userData.type==='phone'||obj.userData.type==='calendar'||obj.userData.type==='moon'||obj.userData.type==='viewscreen'))toRemove.push(obj);
  });
  toRemove.forEach(function(obj){
    obj.traverse(function(child){
      if(child.geometry)child.geometry.dispose();
      if(child.material){
        if(child.material.map)child.material.map.dispose();
        if(child.material.bumpMap)child.material.bumpMap.dispose();
        child.material.dispose();
      }
    });
    if(obj.parent)obj.parent.remove(obj);
  });
  _monCanvases=[];_monTextures=[];
  _3d._monitors=[];_3d._journal=null;_3d._moon=null;_3d._ictLogo=null;_3d._space=null;
}

// ══════════════════════════════════════════════════════════
// V3.2: ICT HOLOGRAPHIC LOGO (replaces wireframe globe)
// ══════════════════════════════════════════════════════════
function _createICTLogo(scene){
  var logoGroup=new THREE.Group();
  // Disc with ICT logo texture
  var discGeo=new THREE.CircleGeometry(0.45,64);
  var discMat;
  if(typeof _TEX_ICT_LOGO_HOLO!=='undefined'&&_TEX_ICT_LOGO_HOLO){
    var logoTex=new THREE.Texture();
    _loadAITexInto(logoTex,_TEX_ICT_LOGO_HOLO);
    discMat=new THREE.MeshStandardMaterial({map:logoTex,emissive:0x00d4ff,emissiveIntensity:0.6,transparent:true,opacity:0.9,side:THREE.DoubleSide});
  }else{
    // Fallback: cyan holographic disc
    discMat=_makeHoloMat(0x00d4ff);
    discMat.opacity=0.5;
  }
  var disc=new THREE.Mesh(discGeo,discMat);
  logoGroup.add(disc);
  // Holographic glow ring
  var ringGeo=new THREE.RingGeometry(0.46,0.50,64);
  var ringMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.4,side:THREE.DoubleSide});
  var ring=new THREE.Mesh(ringGeo,ringMat);
  ring.position.z=0.01;
  logoGroup.add(ring);
  // Soft glow light
  var logoLight=new THREE.PointLight(0x00d4ff,0.15,3);
  logoGroup.add(logoLight);
  logoGroup.position.set(0,1.55,-1.0);
  logoGroup.userData={type:'moon'};
  scene.add(logoGroup);
  _3d._ictLogo=logoGroup;
  _3d._ictLogoBaseY=1.55;
}
// Backwards compat alias
function _createMoon(scene){_createICTLogo(scene);}

// ══════════════════════════════════════════════════════════
// V2.3: VIEWSCREEN + HOLOGRAPHIC MATERIAL HELPERS
// ══════════════════════════════════════════════════════════
// V2.3: Holographic material helpers
function _makeHoloMat(baseColor){
  return new THREE.MeshStandardMaterial({
    color:baseColor,transparent:true,opacity:0.35,
    emissive:baseColor,emissiveIntensity:0.4,
    roughness:0.1,metalness:0.8,side:THREE.DoubleSide
  });
}
function _makeHoloGlowMat(baseColor,op){
  return new THREE.MeshBasicMaterial({
    color:baseColor,transparent:true,opacity:op||0.08,side:THREE.DoubleSide
  });
}
// V3.0: Holographic projection cone material
function _makeHoloConeMat(color){
  return new THREE.MeshBasicMaterial({
    color:color||0x00d4ff,transparent:true,opacity:0.04,
    side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending
  });
}
// V3.0: Draw scanline overlay on a canvas context
function _drawHoloScanlines(ctx,w,h){
  ctx.save();
  ctx.strokeStyle='rgba(0,212,255,0.06)';ctx.lineWidth=1;
  for(var sy=0;sy<h;sy+=4){ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(w,sy);ctx.stroke();}
  ctx.restore();
}

// ══════════════════════════════════════════════════════════
// V3.0: INTERACTIVE FEEDBACK SYSTEM
// ══════════════════════════════════════════════════════════
// Click feedback: scale 1.0→1.1→1.0 in 200ms + emissive flash
function _clickFeedback(obj){
  if(!obj)return;
  var orig={x:obj.scale.x,y:obj.scale.y,z:obj.scale.z};
  var s=1.1;
  obj.scale.set(orig.x*s,orig.y*s,orig.z*s);
  // Emissive flash on any child with material
  obj.traverse(function(child){
    if(child.material&&child.material.emissive){
      var origEI=child.material.emissiveIntensity;
      child.material.emissiveIntensity=1.0;
      setTimeout(function(){child.material.emissiveIntensity=origEI;},200);
    }
  });
  setTimeout(function(){obj.scale.set(orig.x,orig.y,orig.z);},200);
}
// Holographic click chirp — 1800→2400Hz sine, 80ms
function _playHoloClick(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(1800,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(2400,ctx.currentTime+0.06);
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.1);
    setTimeout(function(){ctx.close();},200);
  }catch(e){}
}
// Holographic hover hum — subtle 440Hz, 150ms, very quiet
var _lastHoverSound=0;
function _playHoloHover(){
  var now=performance.now();
  if(now-_lastHoverSound<300)return; // debounce
  _lastHoverSound=now;
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=440;
    g.gain.setValueAtTime(0.02,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.15);
    setTimeout(function(){ctx.close();},300);
  }catch(e){}
}

// V3.1: Main Viewscreen + Continuous Space Flight System
function _createViewscreen(scene){
  var vsGroup=new THREE.Group();
  var _isMob=window.innerWidth<600;
  var _cw=_isMob?1024:2048,_ch=_isMob?256:512;
  var _DS=_isMob?2:4;
  var vsC=document.createElement('canvas');vsC.width=_cw;vsC.height=_ch;
  var vsctx=vsC.getContext('2d');
  vsctx.fillStyle='#000';vsctx.fillRect(0,0,_cw,_ch);
  var vsTex=new THREE.CanvasTexture(vsC);
  if(_3d.renderer)vsTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  // Screen plane
  var scrGeo=new THREE.PlaneGeometry(11.5,5.0);
  var scrMat=new THREE.MeshStandardMaterial({map:vsTex,emissive:0x0a2a3a,emissiveIntensity:0.2,roughness:0.2,transparent:true,opacity:0.9,side:THREE.DoubleSide});
  var scr=new THREE.Mesh(scrGeo,scrMat);
  vsGroup.add(scr);
  // Edge glow strips
  var vsEdgeMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.35});
  var vsEdge=0.02;
  var vsET=new THREE.Mesh(new THREE.BoxGeometry(11.8,vsEdge,vsEdge),vsEdgeMat);
  vsET.position.set(0,2.56,0.02);vsGroup.add(vsET);
  var vsEB=new THREE.Mesh(new THREE.BoxGeometry(11.8,vsEdge,vsEdge),vsEdgeMat);
  vsEB.position.set(0,-2.56,0.02);vsGroup.add(vsEB);
  var vsEL=new THREE.Mesh(new THREE.BoxGeometry(vsEdge,5.24,vsEdge),vsEdgeMat);
  vsEL.position.set(-5.81,0,0.02);vsGroup.add(vsEL);
  var vsER=new THREE.Mesh(new THREE.BoxGeometry(vsEdge,5.24,vsEdge),vsEdgeMat);
  vsER.position.set(5.81,0,0.02);vsGroup.add(vsER);
  // Glow plane behind
  var glowGeo=new THREE.PlaneGeometry(12.5,6.0);
  var glowMat=new THREE.MeshBasicMaterial({color:0x0088cc,transparent:true,opacity:0.06,side:THREE.DoubleSide});
  var glow=new THREE.Mesh(glowGeo,glowMat);glow.position.z=-0.05;
  vsGroup.add(glow);
  vsGroup.position.set(0,3.5,-4.25);
  vsGroup.userData={type:'viewscreen'};
  scene.add(vsGroup);
  _3d._vsGroup=vsGroup;
  // Init continuous space flight layers
  var deepStars=[];for(var si=0;si<200;si++){deepStars.push({x:Math.random()*_cw,y:Math.random()*_ch,r:0.3+Math.random()*1.8,phase:Math.random()*Math.PI*2});}
  var nearStars=[];for(var ni=0;ni<100;ni++){nearStars.push({x:Math.random()*_cw,y:Math.random()*_ch,r:1.0+Math.random()*2.5,phase:Math.random()*Math.PI*2});}
  var dust=[];for(var di=0;di<300;di++){dust.push({x:Math.random()*_cw,y:Math.random()*_ch});}
  var nebulae=[
    {x:0.3*_cw,y:0.4*_ch,r:_cw*0.18,c:'80,40,160',a:0.08},
    {x:0.65*_cw,y:0.25*_ch,r:_cw*0.15,c:'20,80,160',a:0.07},
    {x:0.5*_cw,y:0.7*_ch,r:_cw*0.2,c:'0,120,140',a:0.06},
    {x:0.15*_cw,y:0.6*_ch,r:_cw*0.12,c:'100,20,120',a:0.05}
  ];
  // Interest objects system
  var interestTypes=['nebula_pocket','asteroid_cluster','station_flyby','planet_limb','debris_field'];
  // Side window textures (share main canvas via offset/repeat)
  var leftTex=vsTex.clone();leftTex.offset.set(0,0);leftTex.repeat.set(0.3,1);leftTex.needsUpdate=true;
  var rightTex=vsTex.clone();rightTex.offset.set(0.7,0);rightTex.repeat.set(0.3,1);rightTex.needsUpdate=true;
  _3d._space={canvas:vsC,ctx:vsctx,tex:vsTex,leftTex:leftTex,rightTex:rightTex,
    cw:_cw,ch:_ch,frame:0,
    deepStars:deepStars,nearStars:nearStars,dust:dust,nebulae:nebulae,
    interestObjects:[],interestTypes:interestTypes,nextSpawn:Math.floor(400+Math.random()*500),
    targets:[],lasers:[],explosions:[],weaponMode:false,score:0};
}

// V3.2: Continuous space flight drawing — AI panorama background + procedural overlay
function _drawSpaceFlight(){
  if(!_3d._space)return;
  var sp=_3d._space;
  var ctx=sp.ctx,cw=sp.cw,ch=sp.ch;
  var frame=sp.frame;
  // Layer 0: Base fill
  ctx.fillStyle='#020610';ctx.fillRect(0,0,cw,ch);
  // V3.2: AI Panorama background layer (parallax scroll + crossfade)
  var hasP1=typeof _aiPanorama1Img!=='undefined'&&_aiPanorama1Img&&_aiPanorama1Img.complete&&_aiPanorama1Img.naturalWidth>0;
  var hasP2=typeof _aiPanorama2Img!=='undefined'&&_aiPanorama2Img&&_aiPanorama2Img.complete&&_aiPanorama2Img.naturalWidth>0;
  if(hasP1||hasP2){
    // Initialize panorama state
    if(!sp._panoOffset)sp._panoOffset=0;
    if(!sp._panoCycle)sp._panoCycle=0;
    sp._panoOffset+=0.15; // slow parallax scroll
    sp._panoCycle+=1/60; // ~60-second cycle between panoramas
    var cycleT=(Math.sin(sp._panoCycle*Math.PI/30)+1)/2; // 0→1→0 over ~60s
    var pImg1=hasP1?_aiPanorama1Img:null;
    var pImg2=hasP2?_aiPanorama2Img:null;
    // Draw panorama 1 (wrapping scroll)
    if(pImg1){
      var ox1=sp._panoOffset%pImg1.naturalWidth;
      ctx.globalAlpha=hasP2?(1-cycleT):1;
      ctx.drawImage(pImg1,ox1,0,pImg1.naturalWidth-ox1,pImg1.naturalHeight,0,0,(cw*(pImg1.naturalWidth-ox1)/pImg1.naturalWidth),ch);
      if(ox1>0)ctx.drawImage(pImg1,0,0,ox1,pImg1.naturalHeight,cw-cw*ox1/pImg1.naturalWidth,0,cw*ox1/pImg1.naturalWidth,ch);
    }
    // Draw panorama 2 (opposite scroll for variety)
    if(pImg2){
      var ox2=(sp._panoOffset*0.7)%pImg2.naturalWidth;
      ctx.globalAlpha=hasP1?cycleT:1;
      ctx.drawImage(pImg2,ox2,0,pImg2.naturalWidth-ox2,pImg2.naturalHeight,0,0,(cw*(pImg2.naturalWidth-ox2)/pImg2.naturalWidth),ch);
      if(ox2>0)ctx.drawImage(pImg2,0,0,ox2,pImg2.naturalHeight,cw-cw*ox2/pImg2.naturalWidth,0,cw*ox2/pImg2.naturalWidth,ch);
    }
    ctx.globalAlpha=1;
    // Reduced procedural overlays when AI panorama present
    // Bright accent stars only (80 deep, skip near stars)
    ctx.fillStyle='#fff';
    for(var dsi=0;dsi<80&&dsi<sp.deepStars.length;dsi++){
      var s=sp.deepStars[dsi];
      s.x-=0.3;if(s.x<0)s.x=cw;
      ctx.globalAlpha=0.4+0.4*Math.abs(Math.sin(frame*0.015+s.phase));
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*1.2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Reduced dust (opacity 0.12)
    ctx.fillStyle='rgba(180,200,220,0.12)';
    for(var dui=0;dui<sp.dust.length;dui++){
      sp.dust[dui].x-=0.8;if(sp.dust[dui].x<0)sp.dust[dui].x=cw;
      ctx.fillRect(sp.dust[dui].x,sp.dust[dui].y,1,1);
    }
  } else {
    // Fallback: full procedural background (no AI textures)
    sp.nebulae.forEach(function(n){
      n.x-=0.1;if(n.x<-n.r)n.x=cw+n.r;
      var ng=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
      ng.addColorStop(0,'rgba('+n.c+','+n.a+')');ng.addColorStop(1,'rgba('+n.c+',0)');
      ctx.fillStyle=ng;ctx.fillRect(0,0,cw,ch);
    });
    ctx.fillStyle='#fff';
    sp.deepStars.forEach(function(s){
      s.x-=0.3;if(s.x<0)s.x=cw;
      var twinkle=0.3+0.5*Math.abs(Math.sin(frame*0.015+s.phase));
      ctx.globalAlpha=twinkle;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    });
    sp.nearStars.forEach(function(s){
      s.x-=1.5;if(s.x<0)s.x=cw;
      var twinkle=0.5+0.5*Math.abs(Math.sin(frame*0.03+s.phase));
      ctx.globalAlpha=twinkle;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(180,200,220,0.25)';
    sp.dust.forEach(function(d){
      d.x-=0.8;if(d.x<0)d.x=cw;
      ctx.fillRect(d.x,d.y,1,1);
    });
  }
  // Layer 5: Interest objects
  sp.nextSpawn--;
  if(sp.nextSpawn<=0&&sp.interestObjects.length<2){
    var type=sp.interestTypes[Math.floor(Math.random()*sp.interestTypes.length)];
    sp.interestObjects.push({type:type,x:cw+100,y:ch*0.15+Math.random()*ch*0.7,alpha:0,phase:'fadein',life:0,maxLife:Math.floor(30*15+Math.random()*30*15),size:40+Math.random()*80});
    sp.nextSpawn=Math.floor(400+Math.random()*500);
  }
  for(var io=sp.interestObjects.length-1;io>=0;io--){
    var obj=sp.interestObjects[io];
    obj.x-=0.6;obj.life++;
    if(obj.life<30)obj.alpha=obj.life/30;
    else if(obj.life>obj.maxLife-30)obj.alpha=(obj.maxLife-obj.life)/30;
    else obj.alpha=1;
    if(obj.life>=obj.maxLife||obj.x<-300){sp.interestObjects.splice(io,1);continue;}
    ctx.globalAlpha=obj.alpha*0.7;
    _drawInterestObject(ctx,obj,frame);
    ctx.globalAlpha=1;
  }
  // V3.1: Target objects (weapon system)
  _drawSpaceTargets(ctx,sp,frame);
  // V3.1: Laser shots
  _drawSpaceLasers(ctx,sp);
  // V3.1: Explosions
  _drawSpaceExplosions(ctx,sp);
  // V3.1: Score HUD
  if(sp.weaponMode){
    ctx.fillStyle='rgba(0,212,255,0.9)';ctx.font='bold 16px monospace';ctx.textAlign='right';
    ctx.fillText('TARGETS: '+sp.score,cw-20,24);ctx.textAlign='left';
  }
}

// V3.1: Interest object renderers
function _drawInterestObject(ctx,obj,frame){
  var x=obj.x,y=obj.y,sz=obj.size;
  if(obj.type==='nebula_pocket'){
    var ng=ctx.createRadialGradient(x,y,0,x,y,sz);
    ng.addColorStop(0,'rgba(120,60,200,0.15)');ng.addColorStop(0.5,'rgba(60,30,140,0.08)');ng.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ng;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
    var ng2=ctx.createRadialGradient(x+sz*0.3,y-sz*0.2,0,x+sz*0.3,y-sz*0.2,sz*0.5);
    ng2.addColorStop(0,'rgba(200,100,255,0.1)');ng2.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ng2;ctx.beginPath();ctx.arc(x+sz*0.3,y-sz*0.2,sz*0.5,0,Math.PI*2);ctx.fill();
  }else if(obj.type==='asteroid_cluster'){
    for(var ai=0;ai<6;ai++){
      var ax=x+Math.sin(ai*1.1+frame*0.003)*sz*0.5;
      var ay=y+Math.cos(ai*1.4+frame*0.002)*sz*0.4;
      var ar=sz*0.08+ai*sz*0.03;
      ctx.fillStyle='rgba(100,90,80,'+(0.4+ai*0.05)+')';ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(140,130,110,0.3)';ctx.lineWidth=1;ctx.stroke();
    }
  }else if(obj.type==='station_flyby'){
    ctx.strokeStyle='rgba(180,200,220,0.5)';ctx.lineWidth=2;
    ctx.strokeRect(x-sz*0.3,y-sz*0.15,sz*0.6,sz*0.3);
    ctx.strokeRect(x-sz*0.5,y-sz*0.05,sz,sz*0.1);
    ctx.fillStyle='rgba(0,212,255,0.6)';
    ctx.fillRect(x-sz*0.2,y-sz*0.1,sz*0.05,sz*0.05);
    ctx.fillRect(x+sz*0.1,y-sz*0.1,sz*0.05,sz*0.05);
    ctx.fillStyle='rgba(255,100,50,0.4)';ctx.beginPath();ctx.arc(x+sz*0.4,y,3,0,Math.PI*2);ctx.fill();
  }else if(obj.type==='planet_limb'){
    var pr=sz*1.5;var px2=x,py2=y+pr*0.6;
    var pg=ctx.createRadialGradient(px2-pr*0.15,py2-pr*0.15,0,px2,py2,pr);
    pg.addColorStop(0,'rgba(30,100,80,0.3)');pg.addColorStop(0.5,'rgba(20,60,80,0.2)');pg.addColorStop(1,'rgba(5,15,30,0)');
    ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px2,py2,pr,0,Math.PI*2);ctx.fill();
    var ag=ctx.createRadialGradient(px2,py2,pr*0.95,px2,py2,pr*1.08);
    ag.addColorStop(0,'rgba(60,160,220,0.15)');ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ag;ctx.beginPath();ctx.arc(px2,py2,pr*1.08,0,Math.PI*2);ctx.fill();
  }else if(obj.type==='debris_field'){
    for(var di=0;di<12;di++){
      var dx=x+Math.sin(di*2.3+frame*0.005)*sz*0.6;
      var dy=y+Math.cos(di*1.7+frame*0.004)*sz*0.5;
      ctx.fillStyle='rgba(120,110,100,'+(0.2+Math.random()*0.2)+')';
      ctx.fillRect(dx,dy,2+Math.random()*3,1+Math.random()*2);
    }
  }
}

// V3.1: Target drawing for weapon system
function _drawSpaceTargets(ctx,sp,frame){
  for(var ti=sp.targets.length-1;ti>=0;ti--){
    var t=sp.targets[ti];
    t.x-=0.8;t.life++;
    if(t.x<-50){sp.targets.splice(ti,1);continue;}
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(frame*0.02);
    ctx.strokeStyle='rgba(255,80,80,0.8)';ctx.lineWidth=2;
    ctx.beginPath();
    for(var p=0;p<6;p++){
      var a=p*Math.PI/3,r=t.r;
      if(p===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.closePath();ctx.stroke();
    ctx.fillStyle='rgba(255,50,50,0.15)';ctx.fill();
    ctx.restore();
    // Targeting reticle when weapon mode active
    if(sp.weaponMode){
      ctx.strokeStyle='rgba(255,100,100,0.3)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(t.x,t.y,t.r+8+Math.sin(frame*0.1)*3,0,Math.PI*2);ctx.stroke();
    }
  }
  // Spawn targets
  if(sp.weaponMode&&sp.targets.length<3){
    if(Math.random()<0.005){
      sp.targets.push({x:sp.cw+30,y:sp.ch*0.1+Math.random()*sp.ch*0.8,r:12+Math.random()*8,life:0});
    }
  }
}

// V3.1: Laser drawing
function _drawSpaceLasers(ctx,sp){
  for(var li=sp.lasers.length-1;li>=0;li--){
    var l=sp.lasers[li];l.life++;
    if(l.life>10){sp.lasers.splice(li,1);continue;}
    var alpha=1-l.life/10;
    ctx.strokeStyle='rgba(0,212,255,'+alpha+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(l.sx,l.sy);ctx.lineTo(l.ex,l.ey);ctx.stroke();
    ctx.fillStyle='rgba(200,240,255,'+alpha+')';ctx.beginPath();ctx.arc(l.ex,l.ey,3,0,Math.PI*2);ctx.fill();
  }
}

// V3.1: Explosion drawing
function _drawSpaceExplosions(ctx,sp){
  for(var ei=sp.explosions.length-1;ei>=0;ei--){
    var ex=sp.explosions[ei];ex.life++;
    if(ex.life>30){sp.explosions.splice(ei,1);continue;}
    var prog=ex.life/30;
    ctx.globalAlpha=(1-prog)*0.8;
    for(var pi=0;pi<ex.particles.length;pi++){
      var p=ex.particles[pi];
      var px=ex.x+p.vx*ex.life;
      var py=ex.y+p.vy*ex.life;
      ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(px,py,p.r*(1-prog*0.5),0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
}

// V3.1: Side windows — replace solid walls with windowed walls
