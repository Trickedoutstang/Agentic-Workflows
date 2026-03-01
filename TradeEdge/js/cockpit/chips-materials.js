// TradeEdge — Chip Textures & Materials

function _ac(r,a){return 'rgb('+Math.max(0,Math.min(255,r[0]+a))+','+Math.max(0,Math.min(255,r[1]+a))+','+Math.max(0,Math.min(255,r[2]+a))+')';}

// Texture cache (top/bottom cached per denom; side created fresh per stack)
var _chipTexCache={};

/* Side texture — one canvas encodes ALL chip layers for a stack of `count` chips.
   Each layer is 256px tall. Alternating stripe sections give the classic edge pattern.
   Zero overlapping geometry means zero z-fighting. */
// V3.0: Holographic energy disc side texture — nearly transparent with glow lines per layer
function _chipSideTex(d,count){
  var key=d.label+'_side_'+count;
  if(_chipTexCache[key])return _chipTexCache[key];
  var _CS=window.innerWidth<600?2:4,W=512,H=128*count;
  var cv=document.createElement('canvas');cv.width=W*_CS;cv.height=H*_CS;var ctx=cv.getContext('2d');ctx.scale(_CS,_CS);
  // Nearly transparent base
  ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,W,H);
  for(var layer=0;layer<count;layer++){
    var ly=H-(layer+1)*128,lh=128;
    // Horizontal glow line per layer
    var glowY=ly+lh/2;
    var grd=ctx.createLinearGradient(0,glowY-8,0,glowY+8);
    grd.addColorStop(0,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0)');
    grd.addColorStop(0.5,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.6)');
    grd.addColorStop(1,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0)');
    ctx.fillStyle=grd;ctx.fillRect(0,glowY-8,W,16);
    // Thin bright center line
    ctx.fillStyle='rgba('+Math.min(255,d.r[0]+80)+','+Math.min(255,d.r[1]+80)+','+Math.min(255,d.r[2]+80)+',0.8)';
    ctx.fillRect(0,glowY-1,W,2);
    // Edge separator glow
    if(layer>0){
      ctx.fillStyle='rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.15)';
      ctx.fillRect(0,ly+lh-1,W,2);
    }
  }
  var t=new THREE.CanvasTexture(cv);t.wrapS=THREE.RepeatWrapping;
  if(_3d.renderer)t.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  _chipTexCache[key]=t;return t;
}

/* V3.0: Holographic energy disc top face — dark transparent center, concentric glowing rings,
   circuit-trace radial lines, denomination text with glow */
function _chipTopTex(d){
  if(_chipTexCache[d.label+'_top'])return _chipTexCache[d.label+'_top'];
  var _TS=window.innerWidth<600?1:2,Z=1024;var cv=document.createElement('canvas');cv.width=Z*_TS;cv.height=Z*_TS;var ctx=cv.getContext('2d');ctx.scale(_TS,_TS);
  var cx=Z/2,cy=Z/2,R=Z/2-6;

  // 1. Dark transparent base
  ctx.clearRect(0,0,Z,Z);
  var bg=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
  bg.addColorStop(0,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.08)');
  bg.addColorStop(0.7,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.04)');
  bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();

  // 2. Concentric glowing rings (V3.1: thicker)
  var ringRadii=[0.95,0.8,0.6,0.4];
  ringRadii.forEach(function(rr,ri){
    var ringR=R*rr;
    ctx.beginPath();ctx.arc(cx,cy,ringR,0,Math.PI*2);
    ctx.strokeStyle='rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+','+(0.6-ri*0.1)+')';
    ctx.lineWidth=ri===0?5:3;ctx.stroke();
  });

  // 3. Outer rim glow — bright edge ring (V3.1: thicker)
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=d.c;ctx.lineWidth=7;ctx.globalAlpha=0.7;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,R+3,0,Math.PI*2);
  ctx.strokeStyle=d.c;ctx.lineWidth=3;ctx.globalAlpha=0.3;ctx.stroke();
  ctx.globalAlpha=1;

  // 4. Circuit-trace radial lines (12 lines from center outward) (V3.1: brighter)
  var numRadials=12;
  ctx.strokeStyle='rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.5)';ctx.lineWidth=1;
  for(var ri2=0;ri2<numRadials;ri2++){
    var ang=ri2*(Math.PI*2/numRadials);
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(ang)*R*0.25,cy+Math.sin(ang)*R*0.25);
    ctx.lineTo(cx+Math.cos(ang)*R*0.9,cy+Math.sin(ang)*R*0.9);
    ctx.stroke();
  }

  // 5. Denomination text with glow (V3.1: larger, brighter)
  ctx.fillStyle=d.tx;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor=d.c;ctx.shadowBlur=40;
  ctx.font='900 '+(Z*.08)+'px "Arial Black",Arial,sans-serif';
  ctx.globalAlpha=0.8;ctx.fillText('$',cx,cy-Z*.03);
  var valSize=d.label.length>2?Z*.10:Z*.12;
  ctx.font='900 '+valSize+'px "Arial Black",Arial,sans-serif';
  ctx.globalAlpha=0.9;ctx.fillText(d.label,cx,cy+Z*.03);
  ctx.shadowBlur=0;ctx.globalAlpha=1;

  var tex=new THREE.CanvasTexture(cv);
  tex.anisotropy=_3d.renderer?_3d.renderer.capabilities.getMaxAnisotropy():4;
  tex.minFilter=THREE.LinearFilter;
  tex.magFilter=THREE.LinearFilter;
  _chipTexCache[d.label+'_top']=tex;
  return tex;
}

/* V3.0: Holographic energy disc bottom — matching glow ring underneath */
function _chipBotTex(d){
  if(_chipTexCache[d.label+'_bot'])return _chipTexCache[d.label+'_bot'];
  var _BS=window.innerWidth<600?2:4,Z=256;var cv=document.createElement('canvas');cv.width=Z*_BS;cv.height=Z*_BS;var ctx=cv.getContext('2d');ctx.scale(_BS,_BS);
  var cx=Z/2,R=Z/2;
  // Dark transparent base
  ctx.clearRect(0,0,Z,Z);
  var bg=ctx.createRadialGradient(cx,cx,0,cx,cx,R);
  bg.addColorStop(0,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.06)');
  bg.addColorStop(0.7,'rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.03)');
  bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();ctx.arc(cx,cx,R,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();
  // Outer glow ring
  ctx.beginPath();ctx.arc(cx,cx,R*0.95,0,Math.PI*2);
  ctx.strokeStyle='rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.5)';ctx.lineWidth=3;ctx.stroke();
  // Inner ring
  ctx.beginPath();ctx.arc(cx,cx,R*0.6,0,Math.PI*2);
  ctx.strokeStyle='rgba('+d.r[0]+','+d.r[1]+','+d.r[2]+',0.2)';ctx.lineWidth=1;ctx.stroke();
  var _btex=new THREE.CanvasTexture(cv);
  if(_3d.renderer)_btex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  _chipTexCache[d.label+'_bot']=_btex;
  return _chipTexCache[d.label+'_bot'];
}

/* V3.0: Holographic energy disc material factory — transparent with strong emissive glow */
function _makeChipMats(d){
  var glow=d._threeColor||(d._threeColor=new THREE.Color(d.c));
  return[
    new THREE.MeshStandardMaterial({map:_chipSideTex(d,1),roughness:.3,metalness:.1,emissive:glow,emissiveIntensity:1.2,transparent:true,opacity:0.85,depthWrite:false}),
    new THREE.MeshStandardMaterial({map:_chipTopTex(d),roughness:.2,metalness:.1,emissive:glow,emissiveIntensity:1.2,transparent:true,opacity:0.85,depthWrite:false,side:THREE.DoubleSide}),
    new THREE.MeshStandardMaterial({map:_chipBotTex(d),roughness:.3,metalness:.1,emissive:glow,emissiveIntensity:1.2,transparent:true,opacity:0.85,depthWrite:false,side:THREE.DoubleSide})
  ];
}

/* Individual chip meshes per stack — realistic imperfections (misaligned stripes, jitter, tilt) */
function _makeStackMesh(d,count){
  var group=new THREE.Group();
  var totalH=count*CHIP_H;
  var mats=_makeChipMats(d);var sideMat=mats[0],topMat=mats[1],botMat=mats[2];
  var geo=new THREE.CylinderGeometry(CHIP_R,CHIP_R,CHIP_H,64);
  for(var i=0;i<count;i++){
    var chip=new THREE.Mesh(geo,[sideMat,topMat,botMat]);
    chip.position.y=(i*CHIP_H)-(totalH/2)+CHIP_H/2+(i*0.001);
    chip.rotation.y=(Math.random()-.5)*0.5;
    chip.position.x=(Math.random()-.5)*0.017;
    chip.position.z=(Math.random()-.5)*0.017;
    chip.rotation.x=(Math.random()-.5)*0.011;
    chip.rotation.z=(Math.random()-.5)*0.011;
    chip.castShadow=true;chip.receiveShadow=false;
    group.add(chip);
  }
  // V3.1: Glow decal below stack (additive blending, no PointLight needed)
  var glowDecalGeo=new THREE.CircleGeometry(CHIP_R*2.5,32);
  var glowDecalMat=new THREE.MeshBasicMaterial({color:new THREE.Color(d.c),transparent:true,opacity:0.18,blending:THREE.AdditiveBlending,depthWrite:false});
  var glowDecal=new THREE.Mesh(glowDecalGeo,glowDecalMat);
  glowDecal.rotation.x=-Math.PI/2;
  glowDecal.position.y=-(totalH/2)-0.005;
  group.add(glowDecal);
  return group;
}

/* Single chip disc for spread fidget — shared geometry, random rotation for realistic look */
var _singleChipGeo=null; // V3.1: null forces rebuild with updated CHIP_R
function _makeSingleChipMesh(d){
  if(!_singleChipGeo)_singleChipGeo=new THREE.CylinderGeometry(CHIP_R,CHIP_R,CHIP_H,64);
  var mesh=new THREE.Mesh(_singleChipGeo,_makeChipMats(d));
  mesh.castShadow=true;mesh.receiveShadow=false;
  mesh.rotation.y=(Math.random()-.5)*0.7; // stripe misalignment
  return mesh;
}

