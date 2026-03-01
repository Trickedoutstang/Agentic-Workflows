// TradeEdge — Scene Setup (Console & Monitors)

function _createConsole(scene){
  var _DS=window.innerWidth<600?2:4;var conC=document.createElement('canvas');conC.width=1024*_DS;conC.height=1024*_DS;
  var cctx=conC.getContext('2d');cctx.scale(_DS,_DS);
  // Dark charcoal base
  var grd=cctx.createRadialGradient(512,512,0,512,512,700);
  grd.addColorStop(0,'#1a1e2e');grd.addColorStop(0.5,'#151928');grd.addColorStop(1,'#0e1220');
  cctx.fillStyle=grd;cctx.fillRect(0,0,1024,1024);
  // Subtle grid pattern
  cctx.strokeStyle='rgba(0,240,192,0.06)';cctx.lineWidth=0.5;
  for(var gx=0;gx<1024;gx+=64){cctx.beginPath();cctx.moveTo(gx,0);cctx.lineTo(gx,1024);cctx.stroke();}
  for(var gy=0;gy<1024;gy+=64){cctx.beginPath();cctx.moveTo(0,gy);cctx.lineTo(1024,gy);cctx.stroke();}
  // Cyan panel lines — LCARS-style rounded panel borders
  cctx.strokeStyle='rgba(0,240,192,0.15)';cctx.lineWidth=2;cctx.lineCap='round';
  // Horizontal panel dividers
  [256,512,768].forEach(function(y){cctx.beginPath();cctx.moveTo(80,y);cctx.lineTo(944,y);cctx.stroke();});
  // LCARS rounded corners at panel intersections
  [[80,200,100,56],[944,200,100,56],[80,768,100,56],[944,768,100,56]].forEach(function(r){
    cctx.beginPath();cctx.arc(r[0],r[1],r[2],0,Math.PI*2);cctx.stroke();
  });
  // Panel accent rectangles
  cctx.fillStyle='rgba(0,240,192,0.04)';
  cctx.fillRect(100,270,380,220);cctx.fillRect(544,270,380,220);
  cctx.fillRect(100,530,824,220);
  var consoleTex=new THREE.CanvasTexture(conC);
  if(_3d.renderer)consoleTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  if(_TEX_CONSOLE_SURFACE)_loadAITexInto(consoleTex,_TEX_CONSOLE_SURFACE);
  // Console surface — thinner, sleeker
  var consoleGeo=new THREE.BoxGeometry(9,0.15,5);
  var consoleMat=new THREE.MeshStandardMaterial({map:consoleTex,roughness:0.3,metalness:0.6,emissive:0x0a1520,emissiveIntensity:0.1});
  var consoleMesh=new THREE.Mesh(consoleGeo,consoleMat);consoleMesh.position.set(0,0.6,0);consoleMesh.receiveShadow=true;consoleMesh.castShadow=true;
  scene.add(consoleMesh);
  _3d._deskMat=consoleMat;
  // Glowing cyan accent strip along front edge
  var trimGeo=new THREE.BoxGeometry(9.1,0.03,0.06);
  var trimMat=new THREE.MeshStandardMaterial({color:0x00f0c0,roughness:0.2,metalness:0.8,emissive:0x00f0c0,emissiveIntensity:0.3});
  var trim=new THREE.Mesh(trimGeo,trimMat);trim.position.set(0,0.6,2.53);scene.add(trim);
  // Bridge deck plate — dark metallic gray with hex-grid etching
  var _FS=window.innerWidth<600?2:4;var floorC=document.createElement('canvas');floorC.width=512*_FS;floorC.height=512*_FS;
  var fctx=floorC.getContext('2d');fctx.scale(_FS,_FS);
  // Dark metallic base
  var fBg=fctx.createLinearGradient(0,0,512,512);fBg.addColorStop(0,'#12161e');fBg.addColorStop(0.5,'#0e1218');fBg.addColorStop(1,'#10141c');
  fctx.fillStyle=fBg;fctx.fillRect(0,0,512,512);
  // Hex grid etching
  fctx.strokeStyle='rgba(200,220,240,0.04)';fctx.lineWidth=0.8;
  var hexR=24,hexH=hexR*Math.sqrt(3);
  for(var hy=0;hy<512+hexH;hy+=hexH){
    for(var hx=0;hx<512+hexR*2;hx+=hexR*3){
      var ox=(Math.floor(hy/hexH)%2===0)?0:hexR*1.5;
      fctx.beginPath();
      for(var hi=0;hi<6;hi++){var a=Math.PI/3*hi-Math.PI/6;fctx[hi===0?'moveTo':'lineTo'](hx+ox+hexR*Math.cos(a),hy+hexR*Math.sin(a));}
      fctx.closePath();fctx.stroke();
    }
  }
  // Panel seam lines
  fctx.strokeStyle='rgba(200,220,240,0.06)';fctx.lineWidth=1;
  [128,256,384].forEach(function(v){fctx.beginPath();fctx.moveTo(v,0);fctx.lineTo(v,512);fctx.stroke();});
  [128,256,384].forEach(function(v){fctx.beginPath();fctx.moveTo(0,v);fctx.lineTo(512,v);fctx.stroke();});
  var floorTex=new THREE.CanvasTexture(floorC);
  if(_3d.renderer)floorTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  if(_TEX_DECK_FLOOR)_loadAITexInto(floorTex,_TEX_DECK_FLOOR);
  floorTex.wrapS=THREE.RepeatWrapping;floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(3,3);
  var floorGeo=new THREE.PlaneGeometry(16,12);
  var floorMat=new THREE.MeshStandardMaterial({map:floorTex,roughness:0.6,metalness:0.4});
  var floor=new THREE.Mesh(floorGeo,floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=0;floor.receiveShadow=true;scene.add(floor);
  // Accent lighting strips at deck edges
  var stripGeo=new THREE.BoxGeometry(16,0.02,0.08);
  var stripMat=new THREE.MeshStandardMaterial({color:0x00f0c0,emissive:0x00f0c0,emissiveIntensity:0.2,transparent:true,opacity:0.6});
  var stripFront=new THREE.Mesh(stripGeo,stripMat);stripFront.position.set(0,0.01,5.9);scene.add(stripFront);
  var stripBack=new THREE.Mesh(stripGeo,stripMat.clone());stripBack.position.set(0,0.01,-5.9);scene.add(stripBack);
}

// Change 9-10: Monitor geometry factory + positioning
var MON_W=2.4,MON_H=1.5,MON_BEZEL=0.06,MON_DEPTH=0.08;
var _monCanvases=[],_monTextures=[];

function _createMonitorMesh(label,chartIdx){
  var group=new THREE.Group();
  // V3.0: No physical frame — holographic floating panel
  // Screen canvas
  var _isMob=window.innerWidth<600;
  var _MQ=_isMob?2:4;var cw=_isMob?256:512,ch=_isMob?160:320;
  var screenC=document.createElement('canvas');screenC.width=cw*_MQ;screenC.height=ch*_MQ;
  var sctx=screenC.getContext('2d');
  sctx.scale(_MQ,_MQ);sctx.fillStyle='#0a1a14';sctx.fillRect(0,0,cw,ch);
  sctx.fillStyle='rgba(0,212,255,0.3)';sctx.font=(cw/16)+'px monospace';sctx.fillText(label,cw*0.05,ch*0.15);
  _drawHoloScanlines(sctx,cw,ch);
  var screenTex=new THREE.CanvasTexture(screenC);
  if(_3d.renderer)screenTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  _monCanvases.push({canvas:screenC,ctx:sctx,label:label,idx:chartIdx,w:cw,h:ch});
  _monTextures.push(screenTex);
  // Screen plane — transparent, emissive, double-sided hologram
  var screenGeo=new THREE.PlaneGeometry(MON_W,MON_H);
  var screenMat=new THREE.MeshStandardMaterial({
    map:screenTex,emissive:0x0a2a3a,emissiveIntensity:0.25,roughness:0.2,
    transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false
  });
  var screen=new THREE.Mesh(screenGeo,screenMat);screen.position.z=0.001;
  group.add(screen);
  // V3.0: 4 thin edge border glow strips (cyan)
  var edgeMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.4});
  var edgeThick=0.015;
  var eTop=new THREE.Mesh(new THREE.BoxGeometry(MON_W,edgeThick,edgeThick),edgeMat);
  eTop.position.set(0,MON_H/2,0.01);group.add(eTop);
  var eBot=new THREE.Mesh(new THREE.BoxGeometry(MON_W,edgeThick,edgeThick),edgeMat);
  eBot.position.set(0,-MON_H/2,0.01);group.add(eBot);
  var eLeft=new THREE.Mesh(new THREE.BoxGeometry(edgeThick,MON_H,edgeThick),edgeMat);
  eLeft.position.set(-MON_W/2,0,0.01);group.add(eLeft);
  var eRight=new THREE.Mesh(new THREE.BoxGeometry(edgeThick,MON_H,edgeThick),edgeMat);
  eRight.position.set(MON_W/2,0,0.01);group.add(eRight);
  // V3.0: Light cone projection from console surface up to panel
  var coneH=1.8;var coneGeo=new THREE.CylinderGeometry(MON_W*0.4,MON_W*0.15,coneH,12,1,true);
  var coneMat=_makeHoloConeMat(0x00d4ff);
  var cone=new THREE.Mesh(coneGeo,coneMat);
  cone.position.set(0,-MON_H/2-coneH/2-0.1,0);
  group.add(cone);
  // Glow plane behind (dimmer)
  var glowGeo=new THREE.PlaneGeometry(MON_W*1.2,MON_H*1.2);
  var glowMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.06,side:THREE.DoubleSide});
  var glow=new THREE.Mesh(glowGeo,glowMat);glow.position.z=-0.05;
  group.add(glow);
  group.userData={type:'monitor',label:label,chartIdx:chartIdx,screenMat:screenMat};
  return group;
}

function _createMonitors(scene){
  var _isMob=window.innerWidth<600;
  _monCanvases=[];_monTextures=[];
  _3d._monitors=[];
  // V3.1: 16 monitors — 4 center + 5 left arc + 5 right arc + 2 overhead
  var monData=_isMob?[
    {label:'NQ 1m',idx:0,pos:[-1.4,3.9,-2.5],ry:0.15,s:0.7},
    {label:'NQ 15m',idx:1,pos:[-1.4,2.35,-2.5],ry:0.15,s:0.7},
    {label:'ES 5m',idx:2,pos:[1.4,3.9,-2.5],ry:-0.15,s:0.7},
    {label:'NQ Daily',idx:3,pos:[1.4,2.35,-2.5],ry:-0.15,s:0.7}
  ]:[
    // Center 4
    {label:'NQ 1m',idx:0,pos:[-1.4,3.9,-2.5],ry:0.15,s:0.85},
    {label:'NQ 15m',idx:1,pos:[-1.4,2.35,-2.5],ry:0.15,s:0.85},
    {label:'ES 5m',idx:2,pos:[1.4,3.9,-2.5],ry:-0.15,s:0.85},
    {label:'NQ Daily',idx:3,pos:[1.4,2.35,-2.5],ry:-0.15,s:0.85},
    // Left arc (5)
    {label:'MNQ 1m',idx:4,pos:[-3.0,3.5,-2.0],ry:0.35,s:0.65},
    {label:'MNQ 5m',idx:5,pos:[-3.0,2.2,-2.0],ry:0.35,s:0.65},
    {label:'ES 1m',idx:6,pos:[-4.2,3.8,-1.0],ry:0.65,s:0.60},
    {label:'ES 15m',idx:7,pos:[-4.2,2.5,-1.0],ry:0.65,s:0.60},
    {label:'MES 5m',idx:8,pos:[-5.0,3.2,0.0],ry:0.90,s:0.55},
    // Right arc (5)
    {label:'NQ 3m',idx:9,pos:[3.0,3.5,-2.0],ry:-0.35,s:0.65},
    {label:'NQ 1h',idx:10,pos:[3.0,2.2,-2.0],ry:-0.35,s:0.65},
    {label:'ES Daily',idx:11,pos:[4.2,3.8,-1.0],ry:-0.65,s:0.60},
    {label:'MNQ 15m',idx:12,pos:[4.2,2.5,-1.0],ry:-0.65,s:0.60},
    {label:'MES 1m',idx:13,pos:[5.0,3.2,0.0],ry:-0.90,s:0.55},
    // Overhead (2)
    {label:'NQ 4h',idx:14,pos:[-1.2,5.8,-3.8],ry:0.1,rx:-0.3,s:0.70},
    {label:'ES 4h',idx:15,pos:[1.2,5.8,-3.8],ry:-0.1,rx:-0.3,s:0.70}
  ];
  monData.forEach(function(m){
    var mon=_createMonitorMesh(m.label,m.idx);
    mon.position.set(m.pos[0],m.pos[1],m.pos[2]);
    mon.rotation.y=m.ry;
    if(m.rx)mon.rotation.x=m.rx;
    if(m.s!==1){mon.scale.set(m.s,m.s,m.s);}
    scene.add(mon);
    _3d._monitors.push(mon);
  });
}

// Change 11: Animated candlestick chart system
// V2.3: Chart data with tick simulation
var _chartData=[];
