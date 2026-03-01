// TradeEdge — Cockpit Frame & Control Centers

function _createWindowedWall(scene,side,hullTex,spaceTex){
  var wallGroup=new THREE.Group();
  var hullMat=new THREE.MeshStandardMaterial({map:hullTex,color:0x111520,roughness:0.8,metalness:0.3});
  var xPos=side==='left'?-7:7;
  var rotY=side==='left'?Math.PI/2:-Math.PI/2;
  // Top hull strip (above window)
  var topStrip=new THREE.Mesh(new THREE.PlaneGeometry(10,2),hullMat);
  topStrip.position.set(0,6,0);wallGroup.add(topStrip);
  // Bottom hull strip (below window)
  var botStrip=new THREE.Mesh(new THREE.PlaneGeometry(10,1.5),hullMat);
  botStrip.position.set(0,0.75,0);wallGroup.add(botStrip);
  // Left/right edge strips
  var edgeStrip1=new THREE.Mesh(new THREE.PlaneGeometry(1.2,8),hullMat);
  edgeStrip1.position.set(-4.4,3,0);wallGroup.add(edgeStrip1);
  var edgeStrip2=new THREE.Mesh(new THREE.PlaneGeometry(1.2,8),hullMat);
  edgeStrip2.position.set(4.4,3,0);wallGroup.add(edgeStrip2);
  // Window pane showing space
  var winMat=new THREE.MeshStandardMaterial({map:spaceTex,emissive:0x0a1a2a,emissiveIntensity:0.15,roughness:0.1,transparent:true,opacity:0.85,side:THREE.DoubleSide});
  var winPane=new THREE.Mesh(new THREE.PlaneGeometry(7.6,3.5),winMat);
  winPane.position.set(0,3.25,0.01);wallGroup.add(winPane);
  // Cyan glow frame around window
  var frameMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.3});
  var ft=0.03;
  var fT=new THREE.Mesh(new THREE.BoxGeometry(7.7,ft,ft),frameMat);fT.position.set(0,5.0,0.02);wallGroup.add(fT);
  var fB=new THREE.Mesh(new THREE.BoxGeometry(7.7,ft,ft),frameMat);fB.position.set(0,1.5,0.02);wallGroup.add(fB);
  var fL=new THREE.Mesh(new THREE.BoxGeometry(ft,3.6,ft),frameMat);fL.position.set(-3.8,3.25,0.02);wallGroup.add(fL);
  var fR=new THREE.Mesh(new THREE.BoxGeometry(ft,3.6,ft),frameMat);fR.position.set(3.8,3.25,0.02);wallGroup.add(fR);
  wallGroup.position.set(xPos,0,0);wallGroup.rotation.y=rotY;
  scene.add(wallGroup);
  return wallGroup;
}

// ══════════════════════════════════════════════════════════
// DELETED: _drawReefSceneBase, _drawReefScene, _drawSpaceSceneBase, _drawSpaceScene
// Replaced by viewscreen modes above (V2.3 Star Trek Bridge)
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// V3.0: COCKPIT FRAME GEOMETRY
// ══════════════════════════════════════════════════════════
function _createCockpitFrame(scene){
  var frameMat=new THREE.MeshStandardMaterial({color:0x0a0e14,metalness:0.7,roughness:0.4});
  var accentMat=new THREE.MeshBasicMaterial({color:0x0088cc,transparent:true,opacity:0.4});
  // Left pillar — slight inward lean
  var pillarGeo=new THREE.CylinderGeometry(0.06,0.08,7,8);
  var leftPillar=new THREE.Mesh(pillarGeo,frameMat);
  leftPillar.position.set(-6.5,3.5,3);leftPillar.rotation.z=0.04;
  scene.add(leftPillar);
  // Right pillar
  var rightPillar=new THREE.Mesh(pillarGeo,frameMat);
  rightPillar.position.set(6.5,3.5,3);rightPillar.rotation.z=-0.04;
  scene.add(rightPillar);
  // Top canopy bar
  var topBarGeo=new THREE.CylinderGeometry(0.05,0.05,13.5,8);
  var topBar=new THREE.Mesh(topBarGeo,frameMat);
  topBar.position.set(0,6.8,3);topBar.rotation.z=Math.PI/2;
  scene.add(topBar);
  // Diagonal braces — left pillar to top bar
  var braceGeo=new THREE.CylinderGeometry(0.03,0.03,4,6);
  var leftBrace=new THREE.Mesh(braceGeo,frameMat);
  leftBrace.position.set(-4.5,5.8,3);leftBrace.rotation.z=0.45;
  scene.add(leftBrace);
  var rightBrace=new THREE.Mesh(braceGeo,frameMat);
  rightBrace.position.set(4.5,5.8,3);rightBrace.rotation.z=-0.45;
  scene.add(rightBrace);
  // Blue accent strips along pillars
  var stripGeo=new THREE.BoxGeometry(0.02,6.5,0.02);
  var leftStrip=new THREE.Mesh(stripGeo,accentMat);
  leftStrip.position.set(-6.42,3.5,3.07);scene.add(leftStrip);
  var rightStrip=new THREE.Mesh(stripGeo,accentMat);
  rightStrip.position.set(6.42,3.5,3.07);scene.add(rightStrip);
  // Top bar accent strip
  var topStripGeo=new THREE.BoxGeometry(13,0.02,0.02);
  var topStrip=new THREE.Mesh(topStripGeo,accentMat);
  topStrip.position.set(0,6.87,3.05);scene.add(topStrip);
}

// ══════════════════════════════════════════════════════════
// V3.2: SCI-FI FUTURISTIC CONTROL PANELS
// ══════════════════════════════════════════════════════════
function _buildSciFiPanel(scene,xSign){
  var group=new THREE.Group();
  var carbonMat=new THREE.MeshStandardMaterial({color:0x0a0e14,metalness:0.4,roughness:0.6});
  // Apply AI texture if available
  if(typeof _TEX_CONTROL_PANEL_SURFACE!=='undefined'&&_TEX_CONTROL_PANEL_SURFACE){
    var panelTex=new THREE.Texture();_loadAITexInto(panelTex,_TEX_CONTROL_PANEL_SURFACE);
    carbonMat.map=panelTex;
  }
  // Main panel body — dark carbon fiber
  var body=new THREE.Mesh(new THREE.BoxGeometry(4.5,3.0,0.12),carbonMat);
  body.position.set(0,2.0,0);body.receiveShadow=true;group.add(body);
  // 3 mini holographic displays
  var displayMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.7});
  if(typeof _TEX_CONTROL_PANEL_DISPLAY!=='undefined'&&_TEX_CONTROL_PANEL_DISPLAY){
    var dispTex=new THREE.Texture();_loadAITexInto(dispTex,_TEX_CONTROL_PANEL_DISPLAY);
    displayMat=new THREE.MeshStandardMaterial({map:dispTex,emissive:0x00d4ff,emissiveIntensity:0.5,transparent:true,opacity:0.85});
  }
  var displayPositions=[[-1.2,2.6],[0,2.6],[1.2,2.6]];
  displayPositions.forEach(function(dp){
    var disp=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.5),displayMat);
    disp.position.set(dp[0],dp[1],0.07);group.add(disp);
    // Cyan edge glow around each display
    var edgeMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.4});
    var eT=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.02,0.01),edgeMat);eT.position.set(dp[0],dp[1]+0.26,0.08);group.add(eT);
    var eB=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.02,0.01),edgeMat);eB.position.set(dp[0],dp[1]-0.26,0.08);group.add(eB);
    var eL=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.54,0.01),edgeMat);eL.position.set(dp[0]-0.47,dp[1],0.08);group.add(eL);
    var eR=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.54,0.01),edgeMat);eR.position.set(dp[0]+0.47,dp[1],0.08);group.add(eR);
  });
  // 4 LED strip accents (cyan, animated via _controlLights)
  _3d._controlLights=_3d._controlLights||[];
  var ledPositions=[[-1.8,1.5],[-0.6,1.5],[0.6,1.5],[1.8,1.5]];
  ledPositions.forEach(function(lp){
    var led=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.04,0.02),
      new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.6}));
    led.position.set(lp[0],lp[1],0.07);group.add(led);
    _3d._controlLights.push({mesh:led,rate:1.0+Math.random()*1.0});
  });
  // 6 toggle switches (alternating cyan/amber tips)
  var switchColors=[0x00d4ff,0xff8800,0x00d4ff,0xff8800,0x00d4ff,0xff8800];
  for(var si=0;si<6;si++){
    var sBase=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.06,8),
      new THREE.MeshStandardMaterial({color:0x222233,metalness:0.6,roughness:0.3}));
    sBase.position.set(-1.5+si*0.6,1.0,0.07);group.add(sBase);
    var sTip=new THREE.Mesh(new THREE.SphereGeometry(0.02,8,8),
      new THREE.MeshBasicMaterial({color:switchColors[si],transparent:true,opacity:0.8}));
    sTip.position.set(-1.5+si*0.6,1.06,0.07);group.add(sTip);
  }
  // Cyan PointLight per panel
  var panelLight=new THREE.PointLight(0x00d4ff,0.6,6);
  panelLight.position.set(0,2.5,0.5);group.add(panelLight);
  group.position.set(5.5*xSign,0,0.5);
  scene.add(group);
  return group;
}

function _createControlCenters(scene){
  _3d._controlLights=[];
  _3d._leftControl=_buildSciFiPanel(scene,-1);
  _3d._rightControl=_buildSciFiPanel(scene,1);
}

// V3.1: JOYSTICK (weapon control stick)
function _createJoystick(scene){
  var jGroup=new THREE.Group();
  var stickMat=new THREE.MeshStandardMaterial({color:0x1a1a2a,metalness:0.6,roughness:0.3});
  var gripMat=new THREE.MeshStandardMaterial({color:0x222244,metalness:0.5,roughness:0.4});
  // Base mount
  var base=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.06,12),stickMat);
  jGroup.add(base);
  // Stick
  var stick=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,8),stickMat);
  stick.position.y=0.23;jGroup.add(stick);
  // Grip ball
  var grip=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,12),gripMat);
  grip.position.y=0.45;jGroup.add(grip);
  // Trigger button (red)
  var trigger=new THREE.Mesh(new THREE.SphereGeometry(0.015,8,8),new THREE.MeshBasicMaterial({color:0xff2222}));
  trigger.position.set(0,0.42,0.05);jGroup.add(trigger);
  jGroup.position.set(1.5,0.8,2.0);
  scene.add(jGroup);
  _3d._joystick=jGroup;
}


// ══════════════════════════════════════════════════════════
// V3.0: AMBIENT HOLOGRAPHIC PARTICLES
// ══════════════════════════════════════════════════════════
function _createAmbientParticles(scene){
  var _isMob=window.innerWidth<600;
  var count=_isMob?80:200;
  var positions=new Float32Array(count*3);
  var speeds=new Float32Array(count);
  var phases=new Float32Array(count);
  for(var i=0;i<count;i++){
    positions[i*3]=(Math.random()-0.5)*14;   // x: spread across scene
    positions[i*3+1]=Math.random()*7;         // y: 0 to ceiling
    positions[i*3+2]=(Math.random()-0.5)*12;  // z: depth spread
    speeds[i]=0.003+Math.random()*0.005;      // upward drift speed
    phases[i]=Math.random()*Math.PI*2;        // sine wobble phase
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  var mat=new THREE.PointsMaterial({
    color:0x00d4ff,size:0.03,transparent:true,opacity:0.35,
    sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  var points=new THREE.Points(geo,mat);
  scene.add(points);
  _3d._particles={points:points,positions:positions,speeds:speeds,phases:phases,count:count};
}
function _updateAmbientParticles(time){
  if(!_3d._particles)return;
  var p=_3d._particles,pos=p.positions;
  for(var i=0;i<p.count;i++){
    pos[i*3+1]+=p.speeds[i]; // drift upward
    pos[i*3]+=Math.sin(time*0.001+p.phases[i])*0.002; // horizontal sine wobble
    if(pos[i*3+1]>7){pos[i*3+1]=0;pos[i*3]=(Math.random()-0.5)*14;} // wrap at ceiling
  }
  p.points.geometry.attributes.position.needsUpdate=true;
  // Opacity pulse
  p.points.material.opacity=0.3+0.15*Math.sin(time*0.002);
}

// ══════════════════════════════════════════════════════════
// 3D POKER CHIPS — THREE.JS RENDERER
// ══════════════════════════════════════════════════════════
// V3.0: Holographic energy disc denomination colors (luminous tones)
var CHIP_DENOMS=[
  {v:1000,label:'1K',  c:'#ff8800',r:[255,136,0],   s1:'#ffcc00',s2:'#ff6600',tx:'#fff'},
  {v:500, label:'500', c:'#cc44ff',r:[204,68,255],  s1:'#ee88ff',s2:'#9922cc',tx:'#fff'},
  {v:250, label:'250', c:'#ff44aa',r:[255,68,170],  s1:'#ff88cc',s2:'#cc2266',tx:'#fff'},
  {v:100, label:'100', c:'#44eeff',r:[68,238,255],  s1:'#88ffff',s2:'#0099cc',tx:'#fff'},
  {v:50,  label:'50',  c:'#0088ff',r:[0,136,255],   s1:'#44aaff',s2:'#0055cc',tx:'#fff'},
  {v:25,  label:'25',  c:'#00ff88',r:[0,255,136],   s1:'#44ffaa',s2:'#009955',tx:'#fff'},
  {v:10,  label:'10',  c:'#4488ff',r:[68,136,255],  s1:'#88aaff',s2:'#2255cc',tx:'#fff'},
  {v:5,   label:'5',   c:'#ff4444',r:[255,68,68],   s1:'#ff8888',s2:'#cc0000',tx:'#fff'}
];
var CHIP_R=0.22, CHIP_H=0.02, CHIP_MAX_STACK=15; // V3.1: bigger brighter energy discs
var _3d={scene:null,camera:null,renderer:null,chipGroup:null,allChips:[],stacks:[],_fidgets:[],dropStart:-1,animId:null,inited:false};

