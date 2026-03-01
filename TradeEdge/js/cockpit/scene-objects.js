// TradeEdge — Scene Objects (Journal, Calendar, Phone, Notebook)

function _createJournal(scene){
  var jGroup=new THREE.Group();
  // PADD body — thin tablet
  var jGeo=new THREE.BoxGeometry(0.8,0.02,1.1);
  var jMat=_makeHoloMat(0x00f0c0);
  var jBody=new THREE.Mesh(jGeo,jMat);
  jGroup.add(jBody);
  // Screen canvas — dark translucent with cyan text
  var _JS=window.innerWidth<600?2:4;var jC=document.createElement('canvas');jC.width=512*_JS;jC.height=512*_JS;
  var jctx=jC.getContext('2d');jctx.scale(_JS,_JS);
  jctx.fillStyle='rgba(0,20,30,0.8)';jctx.fillRect(0,0,512,512);
  jctx.strokeStyle='rgba(0,240,192,0.3)';jctx.lineWidth=2;jctx.strokeRect(10,10,492,492);
  jctx.fillStyle='#00f0c0';jctx.font='bold 28px monospace';jctx.textAlign='center';
  jctx.fillText('ICT JOURNAL',256,60);
  jctx.font='14px monospace';jctx.fillStyle='rgba(0,240,192,0.6)';
  jctx.fillText('PADD // TRADING LOG',256,90);
  // Grid lines
  jctx.strokeStyle='rgba(0,240,192,0.1)';jctx.lineWidth=0.5;
  for(var gy=110;gy<500;gy+=24){jctx.beginPath();jctx.moveTo(30,gy);jctx.lineTo(482,gy);jctx.stroke();}
  var jTex=new THREE.CanvasTexture(jC);
  if(_3d.renderer)jTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  if(_TEX_PADD_SCREEN)_loadAITexInto(jTex,_TEX_PADD_SCREEN);
  var scrGeo=new THREE.PlaneGeometry(0.72,0.98);
  var scrMat=new THREE.MeshStandardMaterial({map:jTex,transparent:true,opacity:0.9,emissive:0x00f0c0,emissiveIntensity:0.1});
  var scr=new THREE.Mesh(scrGeo,scrMat);scr.rotation.x=-Math.PI/2;scr.position.y=0.011;
  jGroup.add(scr);
  // Hover glow border
  var glowGeo=new THREE.PlaneGeometry(0.9,1.2);
  var glowMat=_makeHoloGlowMat(0x00f0c0);
  var glow=new THREE.Mesh(glowGeo,glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=-0.02;
  jGroup.add(glow);
  jGroup.position.set(1.5,0.82,1.8);jGroup.rotation.y=-0.15;
  jGroup.userData={type:'journal'};
  scene.add(jGroup);
  _3d._journal=jGroup;
}

// ══════════════════════════════════════════════════════════
// PART C: WALL CALENDAR + FOREXFACTORY NEWS (Changes 16-19)
// ══════════════════════════════════════════════════════════

// Change 17: ForexFactory economic calendar data fetching
var _econFetchPromise=null;
function _fetchEconomicCalendar(){
  if(!S)return;
  // Rate limit: max once per 30 minutes
  var now=Date.now();
  if(S._econLastFetch&&(now-S._econLastFetch)<1800000&&S._econEvents&&S._econEvents.length>0)return;
  if(_econFetchPromise)return;
  var urls=[
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://api.allorigins.win/raw?url='+encodeURIComponent('https://nfs.faireconomy.media/ff_calendar_thisweek.json')
  ];
  function tryFetch(idx){
    if(idx>=urls.length){
      _econFetchPromise=null;
      // Fallback: use cached data from localStorage
      var cached=localStorage.getItem('SK_econ_calendar');
      if(cached){try{S._econEvents=JSON.parse(cached);}catch(e){S._econEvents=[];}}
      else S._econEvents=[];
      console.log('[TradeEdge] Econ calendar: using cached data ('+S._econEvents.length+' events)');
      return;
    }
    _econFetchPromise=fetch(urls[idx]).then(function(resp){
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      return resp.json();
    }).then(function(data){
      _econFetchPromise=null;
      // Filter: USD only, High impact only
      var events=[];
      if(Array.isArray(data)){
        data.forEach(function(ev){
          if(ev.country==='USD'&&ev.impact==='High'){
            events.push({date:ev.date||'',time:ev.time||'',event:ev.title||ev.event||'',impact:'High'});
          }
        });
      }
      S._econEvents=events;
      S._econLastFetch=now;
      // Cache in localStorage
      try{localStorage.setItem('SK_econ_calendar',JSON.stringify(events));}catch(e){}
      console.log('[TradeEdge] Econ calendar fetched: '+events.length+' USD red folder events');
      // V2.1: 3D wall calendar removed — HTML calendar uses S._econEvents directly
    }).catch(function(e){
      console.warn('[TradeEdge] Econ calendar fetch failed ('+urls[idx]+'): '+e.message);
      _econFetchPromise=null;
      tryFetch(idx+1);
    });
  }
  tryFetch(0);
}

// Change 16+18: 3D Wall Calendar object with trade P&L coloring + news dots
function _createWallCalendar(scene){
  var calGroup=new THREE.Group();
  // Frame
  var frameGeo=new THREE.BoxGeometry(2.0,2.2,0.04);
  var frameMat=new THREE.MeshStandardMaterial({color:0x1a1208,roughness:0.7,metalness:0.1});
  var frame=new THREE.Mesh(frameGeo,frameMat);frame.castShadow=true;
  calGroup.add(frame);
  // Calendar face canvas
  var calC=document.createElement('canvas');calC.width=512;calC.height=576;
  _3d._calCanvas=calC;_3d._calCtx=calC.getContext('2d');
  _drawWallCalendar();
  var calTex=new THREE.CanvasTexture(calC);
  _3d._calTex=calTex;
  var faceGeo=new THREE.PlaneGeometry(1.9,2.1);
  var faceMat=new THREE.MeshStandardMaterial({map:calTex,emissive:0x060a08,emissiveIntensity:0.08,roughness:0.9});
  var face=new THREE.Mesh(faceGeo,faceMat);face.position.z=0.021;
  calGroup.add(face);
  calGroup.position.set(0,3.5,-3.8);
  calGroup.userData={type:'calendar'};
  scene.add(calGroup);
  _3d._calendar=calGroup;
}

function _drawWallCalendar(){
  if(!_3d||!_3d._calCanvas)return;
  var c=_3d._calCanvas,ctx=_3d._calCtx;
  var cw=512,ch=576;
  // Background
  ctx.fillStyle='#0a0e0c';ctx.fillRect(0,0,cw,ch);
  // Title: month + year
  var now=new Date();
  var months=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  ctx.fillStyle='#e8edf8';ctx.font='bold 24px monospace';ctx.textAlign='center';
  ctx.fillText(months[now.getMonth()]+' '+now.getFullYear(),cw/2,32);
  // Day headers
  var days=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var cellW=cw/7,cellH=60,startY=50;
  ctx.font='bold 11px monospace';ctx.fillStyle='#4d6890';
  days.forEach(function(d,i){ctx.fillText(d,i*cellW+cellW/2,startY);});
  // Build day grid
  var firstDay=new Date(now.getFullYear(),now.getMonth(),1).getDay();
  var daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  var today=now.getDate();
  // Build trade P&L map for this month
  var tradeDayMap={};
  if(S&&S.trades){
    S.trades.forEach(function(t){
      var d=t.date;if(!d)return;
      var parts=d.split('-');if(parts.length<3)return;
      var tMonth=parseInt(parts[1],10)-1,tYear=parseInt(parts[0],10),tDay=parseInt(parts[2],10);
      if(tMonth===now.getMonth()&&tYear===now.getFullYear()){
        if(!tradeDayMap[tDay])tradeDayMap[tDay]=0;
        tradeDayMap[tDay]+=(t.netPnl||t.pnl||0);
      }
    });
  }
  // Build news event day map
  var newsDayMap={};
  if(S&&S._econEvents){
    S._econEvents.forEach(function(ev){
      if(!ev.date)return;
      var parts=ev.date.split('-');if(parts.length<3)return;
      var eMonth=parseInt(parts[1],10)-1,eYear=parseInt(parts[0],10),eDay=parseInt(parts[2],10);
      if(eMonth===now.getMonth()&&eYear===now.getFullYear()){
        if(!newsDayMap[eDay])newsDayMap[eDay]=[];
        newsDayMap[eDay].push(ev);
      }
    });
  }
  // Draw day cells
  ctx.font='14px monospace';ctx.textAlign='center';
  var row=0;
  for(var d=1;d<=daysInMonth;d++){
    var col=(firstDay+d-1)%7;
    if(d>1&&col===0)row++;
    var cx2=col*cellW+cellW/2,cy2=startY+16+row*cellH+cellH/2;
    // Cell background
    var pnl=tradeDayMap[d];
    if(pnl!==undefined){
      ctx.fillStyle=pnl>0?'rgba(0,229,160,0.15)':pnl<0?'rgba(255,61,90,0.15)':'rgba(255,255,255,0.05)';
      ctx.fillRect(col*cellW+2,startY+16+row*cellH+4,cellW-4,cellH-8);
    }
    // Today highlight
    if(d===today){
      ctx.strokeStyle='#00f0c0';ctx.lineWidth=1.5;
      ctx.strokeRect(col*cellW+2,startY+16+row*cellH+4,cellW-4,cellH-8);
    }
    // Day number
    ctx.fillStyle=d===today?'#00f0c0':pnl!==undefined?(pnl>0?'#00e5a0':'#ff3d5a'):'#7b8db0';
    ctx.fillText(''+d,cx2,cy2-6);
    // P&L amount
    if(pnl!==undefined){
      ctx.font='9px monospace';
      ctx.fillStyle=pnl>0?'#00e5a080':'#ff3d5a80';
      ctx.fillText((pnl>0?'+':'')+pnl.toFixed(0),cx2,cy2+10);
      ctx.font='14px monospace';
    }
    // Red news dot
    if(newsDayMap[d]){
      ctx.fillStyle='#ff3d5a';
      ctx.beginPath();ctx.arc(col*cellW+cellW-8,startY+16+row*cellH+10,4,0,Math.PI*2);ctx.fill();
      ctx.font='7px monospace';ctx.fillStyle='#ff3d5a';
      ctx.fillText(''+newsDayMap[d].length,col*cellW+cellW-8,startY+16+row*cellH+22);
      ctx.font='14px monospace';
    }
  }
  // Change 18: Today's news section at bottom
  var newsY=startY+16+(row+1)*cellH+20;
  ctx.fillStyle='#4d6890';ctx.font='bold 11px monospace';ctx.textAlign='center';
  var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var todayNews=[];
  if(S&&S._econEvents){
    S._econEvents.forEach(function(ev){if(ev.date===todayStr)todayNews.push(ev);});
  }
  if(todayNews.length>0){
    ctx.fillText('\u2501\u2501 TODAY\'S NEWS \u2501\u2501',cw/2,newsY);
    ctx.textAlign='left';ctx.font='10px monospace';
    todayNews.forEach(function(ev,i){
      if(i>3)return; // Max 4 events displayed
      ctx.fillStyle='#ff3d5a';ctx.fillText('\ud83d\udd34 '+ev.time+'  '+ev.event.substring(0,30),20,newsY+16+i*14);
    });
  }else{
    ctx.fillStyle='#4d689060';
    ctx.fillText('No high-impact USD news today',cw/2,newsY);
  }
  // Mark texture for update
  if(_3d._calTex)_3d._calTex.needsUpdate=true;
}

// Change 19: Upcoming news alert HUD + checker
function _checkNewsAlerts(){
  var hud=document.getElementById('news-alert-hud');
  if(!hud)return;
  if(!S||!S._econEvents||S._econEvents.length===0){hud.style.display='none';return;}
  var now=new Date();
  var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var etNow=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
  var closest=null,closestMin=Infinity;
  S._econEvents.forEach(function(ev){
    if(ev.date!==todayStr)return;
    // Parse time like "8:30 AM"
    var tp=ev.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if(!tp)return;
    var h=parseInt(tp[1],10),m=parseInt(tp[2],10);
    if(tp[3].toUpperCase()==='PM'&&h!==12)h+=12;
    if(tp[3].toUpperCase()==='AM'&&h===12)h=0;
    var evMin=h*60+m;
    var nowMin=etNow.getHours()*60+etNow.getMinutes();
    var diff=evMin-nowMin;
    if(diff>=-5&&diff<closestMin){closestMin=diff;closest=ev;}
  });
  if(closest&&closestMin<=30&&closestMin>=-5){
    hud.style.display='flex';
    var icon=hud.querySelector('.news-alert-icon');
    var text=hud.querySelector('.news-alert-text');
    if(closestMin>0&&closestMin<=30){
      if(icon)icon.textContent='\ud83d\udd34';
      if(text)text.textContent=closest.event.substring(0,25)+' in '+closestMin+' min ('+closest.time+' ET)';
      hud.className='news-alert-hud news-pulse';
    }else{
      if(icon)icon.textContent='\u26a1';
      if(text)text.textContent=closest.event.substring(0,25)+' \u2014 LIVE NOW';
      hud.className='news-alert-hud news-pulse-intense';
    }
  }else{
    hud.style.display='none';
  }
}

// ══════════════════════════════════════════════════════════
// PART D: PHONE + ICT KEY LEVELS NOTEBOOK (Changes 20-22)
// ══════════════════════════════════════════════════════════

// V2.3: Holographic Comms Panel (replaces phone)
function _createPhone(scene){
  var phGroup=new THREE.Group();
  // Body — thinner holographic slab
  var phGeo=new THREE.BoxGeometry(0.5,0.015,0.85);
  var phMat=_makeHoloMat(0xa855f7);
  var phBody=new THREE.Mesh(phGeo,phMat);
  phGroup.add(phBody);
  // Screen canvas — dark translucent with purple waveform
  var _PS=window.innerWidth<600?2:4;var phC=document.createElement('canvas');phC.width=256*_PS;phC.height=420*_PS;
  _3d._phoneCanvas=phC;_3d._phoneCtx=phC.getContext('2d');
  _drawPhoneScreen();
  var phTex=new THREE.CanvasTexture(phC);
  if(_3d.renderer)phTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  _3d._phoneTex=phTex;
  var scrGeo=new THREE.PlaneGeometry(0.45,0.78);
  var scrMat=new THREE.MeshStandardMaterial({map:phTex,transparent:true,opacity:0.9,emissive:0xa855f7,emissiveIntensity:0.1});
  var screen=new THREE.Mesh(scrGeo,scrMat);screen.rotation.x=-Math.PI/2;screen.position.y=0.009;
  phGroup.add(screen);
  // Glow beneath
  var glowGeo=new THREE.PlaneGeometry(0.6,0.95);
  var glowMat=_makeHoloGlowMat(0xa855f7);
  var glow=new THREE.Mesh(glowGeo,glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=-0.02;
  phGroup.add(glow);
  phGroup.position.set(3.0,0.83,1.3);phGroup.rotation.y=-0.15;
  phGroup.userData={type:'phone',screenMat:scrMat};
  scene.add(phGroup);
  _3d._phone=phGroup;
}

var _phoneFrame=0;
function _drawPhoneScreen(){
  if(!_3d||!_3d._phoneCanvas)return;
  var c=_3d._phoneCanvas,ctx=_3d._phoneCtx;
  var _PS=c.width/256;ctx.setTransform(_PS,0,0,_PS,0,0);var cw=256,ch=420;
  _phoneFrame++;
  // Dark translucent background
  ctx.fillStyle='rgba(10,5,20,0.85)';ctx.fillRect(0,0,cw,ch);
  // Border
  ctx.strokeStyle='rgba(168,85,247,0.3)';ctx.lineWidth=2;ctx.strokeRect(8,8,cw-16,ch-16);
  // X logo — purple tint
  ctx.strokeStyle='#a855f7';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(cw/2-22,80);ctx.lineTo(cw/2+22,126);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cw/2+22,80);ctx.lineTo(cw/2-22,126);ctx.stroke();
  // "SPACES" text
  ctx.fillStyle='#c084fc';ctx.font='bold 20px sans-serif';ctx.textAlign='center';
  ctx.fillText('SPACES',cw/2,158);
  // Pulsing LIVE dot
  var livePulse=0.5+0.5*Math.sin(_phoneFrame*0.1);
  ctx.fillStyle='rgba(255,50,50,'+livePulse+')';
  ctx.beginPath();ctx.arc(cw/2-35,180,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff5050';ctx.font='bold 9px sans-serif';
  ctx.fillText('LIVE',cw/2-14,184);
  // Speaker avatars — 3 colored dots
  var avatarColors=['#00f0c0','#0ea5e9','#a855f7'];
  var initials=['R','M','J'];
  for(var ai=0;ai<3;ai++){
    var ax=cw/2-30+ai*30;
    ctx.fillStyle=avatarColors[ai];ctx.beginPath();ctx.arc(ax,215,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 10px sans-serif';ctx.fillText(initials[ai],ax,219);
  }
  // Topic
  ctx.fillStyle='#c084fc';ctx.font='11px sans-serif';
  ctx.fillText('ICT Traders Lounge',cw/2,248);
  // Incrementing listener count
  var listeners=3200+Math.floor(_phoneFrame*0.3)%800;
  ctx.fillStyle='rgba(168,85,247,0.5)';ctx.font='10px sans-serif';
  ctx.fillText(listeners.toLocaleString()+' listening',cw/2,268);
  // 48 animated waveform bars — purple-tinted
  var barCount=48,barWidth=3.5,barGap=1.5,totalW=barCount*(barWidth+barGap);
  var startX=(cw-totalW)/2;
  for(var i=0;i<barCount;i++){
    var h=6+Math.abs(Math.sin(_phoneFrame*0.08+i*0.4))*30;
    var x=startX+i*(barWidth+barGap);
    var y=360-h/2;
    ctx.fillStyle='rgba(168,85,247,'+(0.4+Math.sin(_phoneFrame*0.06+i*0.3)*0.3)+')';
    ctx.fillRect(x,y,barWidth,h);
  }
  if(_3d._phoneTex)_3d._phoneTex.needsUpdate=true;
}

// V2.3: Floating Data Pad (replaces spiral notebook)
function _createSpiralNotebook(scene){
  var nbGroup=new THREE.Group();
  // Body — flat transparent panel
  var nbGeo=new THREE.BoxGeometry(1.0,0.02,1.3);
  var nbMat=_makeHoloMat(0x0ea5e9);
  var body=new THREE.Mesh(nbGeo,nbMat);
  nbGroup.add(body);
  // Canvas — dark translucent base with blue key levels
  var _NS=window.innerWidth<600?2:4;var nbC=document.createElement('canvas');nbC.width=512*_NS;nbC.height=640*_NS;
  _3d._nbCanvas=nbC;_3d._nbCtx=nbC.getContext('2d');
  _drawNotebookCover();
  var nbTex=new THREE.CanvasTexture(nbC);
  if(_3d.renderer)nbTex.anisotropy=_3d.renderer.capabilities.getMaxAnisotropy();
  _3d._nbTex=nbTex;
  // Cover plane
  var coverGeo=new THREE.PlaneGeometry(0.92,1.22);
  var coverMat=new THREE.MeshStandardMaterial({map:nbTex,transparent:true,opacity:0.9,emissive:0x0ea5e9,emissiveIntensity:0.1});
  var cover=new THREE.Mesh(coverGeo,coverMat);cover.rotation.x=-Math.PI/2;cover.position.y=0.011;
  nbGroup.add(cover);
  // Glow plane beneath
  var glowGeo=new THREE.PlaneGeometry(1.1,1.4);
  var glowMat=_makeHoloGlowMat(0x0ea5e9);
  var glow=new THREE.Mesh(glowGeo,glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=-0.02;
  nbGroup.add(glow);
  nbGroup.position.set(-1.2,0.81,1.8);nbGroup.rotation.y=0.12;
  nbGroup.userData={type:'notebook'};
  scene.add(nbGroup);
  _3d._notebook=nbGroup;
}

function _drawNotebookCover(){
  if(!_3d||!_3d._nbCanvas)return;
  var c=_3d._nbCanvas,ctx=_3d._nbCtx;
  var _NS=c.width/512;ctx.setTransform(_NS,0,0,_NS,0,0);var cw=512,ch=640;
  // AI texture background or procedural fallback
  if(_aiDatapadImg&&_aiDatapadImg.complete&&_aiDatapadImg.naturalWidth>0){
    ctx.drawImage(_aiDatapadImg,0,0,cw,ch);
  }else{
    // Dark translucent base
    ctx.fillStyle='rgba(5,15,25,0.85)';ctx.fillRect(0,0,cw,ch);
    // Grid overlay
    ctx.strokeStyle='rgba(14,165,233,0.08)';ctx.lineWidth=0.5;
    for(var y=80;y<ch;y+=28){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(cw-30,y);ctx.stroke();}
    for(var x=30;x<cw;x+=80){ctx.beginPath();ctx.moveTo(x,40);ctx.lineTo(x,ch-20);ctx.stroke();}
    // Border
    ctx.strokeStyle='rgba(14,165,233,0.3)';ctx.lineWidth=2;ctx.strokeRect(10,10,cw-20,ch-20);
  }
  // Title (always drawn — readable on both AI and procedural bg)
  ctx.fillStyle='#0ea5e9';ctx.font='bold 28px monospace';ctx.textAlign='center';
  ctx.fillText('KEY LEVELS',cw/2,50);
  // Key levels data
  if(S&&S.keyLevels){
    var kl=S.keyLevels;
    ctx.font='14px monospace';ctx.textAlign='left';ctx.fillStyle='rgba(14,165,233,0.8)';
    var lines=[];
    if(kl.orgH||kl.orgL)lines.push('ORG H/L: '+(kl.orgH||'—')+' / '+(kl.orgL||'—'));
    if(kl.ndogH||kl.ndogL)lines.push('NDOG H/L: '+(kl.ndogH||'—')+' / '+(kl.ndogL||'—'));
    if(kl.nwogH||kl.nwogL)lines.push('NWOG H/L: '+(kl.nwogH||'—')+' / '+(kl.nwogL||'—'));
    if(kl.pdh||kl.pdl)lines.push('PDH/PDL: '+(kl.pdh||'—')+' / '+(kl.pdl||'—'));
    if(kl.pwh||kl.pwl)lines.push('PWH/PWL: '+(kl.pwh||'—')+' / '+(kl.pwl||'—'));
    if(kl.custom){
      var customLines=kl.custom.split('\n');
      customLines.forEach(function(cl){if(cl.trim())lines.push(cl.trim());});
    }
    lines.forEach(function(line,i){
      ctx.fillText(line,50,96+i*28);
    });
    if(lines.length===0){
      ctx.fillStyle='rgba(14,165,233,0.3)';ctx.font='italic 13px monospace';ctx.textAlign='center';
      ctx.fillText('Tap to add key levels',cw/2,150);
    }
  }else{
    ctx.fillStyle='rgba(14,165,233,0.3)';ctx.font='italic 13px monospace';ctx.textAlign='center';
    ctx.fillText('Tap to add key levels',cw/2,150);
  }
  if(_3d._nbTex)_3d._nbTex.needsUpdate=true;
}

// Change 22: Key Levels modal + data persistence
function openKeyLevels(){
  var ov=document.getElementById('keylevel-overlay');
  if(!ov)return;
  // Populate from saved data
  var kl=S.keyLevels||{};
  var fields=['org-h','org-l','ndog-h','ndog-l','nwog-h','nwog-l','pdh','pdl','pwh','pwl'];
  var keys=['orgH','orgL','ndogH','ndogL','nwogH','nwogL','pdh','pdl','pwh','pwl'];
  fields.forEach(function(f,i){
    var el=document.getElementById('kl-'+f);if(el)el.value=kl[keys[i]]||'';
  });
  var custom=document.getElementById('kl-custom');if(custom)custom.value=kl.custom||'';
  ov.style.display='flex';
}

function saveKeyLevels(){
  var kl={};
  var fields=['org-h','org-l','ndog-h','ndog-l','nwog-h','nwog-l','pdh','pdl','pwh','pwl'];
  var keys=['orgH','orgL','ndogH','ndogL','nwogH','nwogL','pdh','pdl','pwh','pwl'];
  fields.forEach(function(f,i){
    var el=document.getElementById('kl-'+f);
    if(el&&el.value)kl[keys[i]]=parseFloat(el.value);
  });
  var custom=document.getElementById('kl-custom');if(custom&&custom.value.trim())kl.custom=custom.value.trim();
  S.keyLevels=kl;
  save();
  // Update notebook texture
  _drawNotebookCover();
  // Close modal
  closeModal('keylevel-overlay');
  toast('Key levels saved','ok');
}

// ══════════════════════════════════════════════════════════
// PART E: NUCLEAR FALLOUT ALARM SYSTEM (Changes 23-27)
// ══════════════════════════════════════════════════════════

// Change 24: Rule violation detection engine
