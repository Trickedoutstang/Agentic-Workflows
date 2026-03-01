// TradeEdge — Share System

function _renderCSSChips(balance,container){
  container.innerHTML='';
  var rem=Math.floor(balance);
  var hasChips=false;
  CHIP_DENOMS.forEach(function(d){
    var ct=0;while(rem>=d.v){ct++;rem-=d.v;}
    if(!ct)return;
    hasChips=true;
    var wrap=document.createElement('div');
    wrap.className='css-chip-stack';
    var show=Math.min(ct,CHIP_MAX_STACK);
    for(var i=0;i<show;i++){
      var disc=document.createElement('div');
      disc.className='css-chip-disc';
      disc.style.background=d.c;
      disc.style.border='2px solid rgba(255,255,255,0.2)';
      disc.style.boxShadow='0 3px 8px rgba(0,0,0,0.6),inset 0 1px rgba(255,255,255,0.12)';
      wrap.appendChild(disc);
    }
    var lbl=document.createElement('div');
    lbl.className='css-chip-count';
    lbl.textContent=ct+'×$'+d.label;
    wrap.appendChild(lbl);
    container.appendChild(wrap);
  });
  if(!hasChips){
    var msg=document.createElement('div');
    msg.style.cssText='color:rgba(255,255,255,.2);font-family:var(--mono);font-size:.6rem;letter-spacing:2px';
    msg.textContent='NO BALANCE';
    container.appendChild(msg);
  }
}

// ══════════════════════════════════════════════════════════
// SELF-DESTRUCT SEQUENCE — triggered when balance <= 0
// ══════════════════════════════════════════════════════════
// _nukeTriggered declared early at ~line 1406
function triggerSelfDestruct(){
  if(_nukeTriggered)return;
  _nukeTriggered=true;
  var overlay=document.getElementById('nuke-overlay');
  var countEl=document.getElementById('nuke-countdown');
  overlay.classList.add('active');
  var count=5;
  countEl.textContent=count;
  var iv=setInterval(function(){
    count--;
    if(count>0){
      countEl.textContent=count;
    }else{
      clearInterval(iv);
      countEl.textContent='0';
      setTimeout(nukeImpact,300);
    }
  },1000);
}
// ══════════════════════════════════════════════════════════
// V2.3: SCREENSHOT / SHARE SYSTEM
// ══════════════════════════════════════════════════════════
var _shareBlob=null;
function shareMetric(btn){
  var card=btn.closest('.mc')||btn.closest('.jcard')||btn.closest('.cc');
  if(!card)return;
  var label=card.querySelector('.mc-label,.cc-title');
  var val=card.querySelector('.mc-val,.mc-sub');
  var labelText=label?label.textContent.trim():'Metric';
  var valText=val?val.textContent.trim():'—';
  _renderShareCard(labelText,valText,val&&val.classList.contains('up')?'#00e5a0':val&&val.classList.contains('dn')?'#ff3d5a':'#e8edf8');
}
function shareDashboard(){
  var m=calcMetrics(S.trades);
  var bal=S.startingBalance?(S.startingBalance+(m.net||0)):0;
  var lines=[
    {l:'Balance',v:f$(bal,false),c:'#e8edf8'},
    {l:'Net P&L',v:f$(m.net),c:(m.net||0)>=0?'#00e5a0':'#ff3d5a'},
    {l:'Win Rate',v:fpct(m.winRate),c:'#00f0c0'},
    {l:'Account Growth',v:((m.accountGrowthPct||0)>=0?'+':'')+fnum(m.accountGrowthPct)+'%',c:(m.accountGrowthPct||0)>=0?'#00e5a0':'#ff3d5a'},
    {l:'Edge Ratio',v:fnum(m.edgeRatio),c:(m.edgeRatio||0)>=1?'#00e5a0':'#ff3d5a'}
  ];
  _renderShareCardMulti(lines);
}
function _makeShareCanvas(){
  var cv=document.createElement('canvas');cv.width=1080;cv.height=1080;
  var ctx=cv.getContext('2d');
  ctx.fillStyle='#07090e';ctx.fillRect(0,0,1080,1080);
  var g=ctx.createLinearGradient(0,0,1080,0);
  g.addColorStop(0,'#00f0c0');g.addColorStop(0.5,'#0ea5e9');g.addColorStop(1,'#a855f7');
  ctx.fillStyle=g;ctx.fillRect(0,0,1080,4);
  return{cv:cv,ctx:ctx};
}
function _brandShareCanvas(ctx){
  ctx.fillStyle='#2d3f5e';ctx.font='700 24px "Bebas Neue",sans-serif';ctx.textAlign='center';
  ctx.fillText('TRADEEDGE ICT',540,1000);
  ctx.fillStyle='#1a2035';ctx.font='400 16px "IBM Plex Mono",monospace';
  ctx.fillText('tradeedge-ict.html',540,1035);
}
function _renderShareCard(label,value,color){
  var sc=_makeShareCanvas(),cv=sc.cv,ctx=sc.ctx;
  ctx.fillStyle='#0c0f17';_roundRect(ctx,80,280,920,440,16);ctx.fill();
  ctx.strokeStyle='#1a2035';ctx.lineWidth=1;_roundRect(ctx,80,280,920,440,16);ctx.stroke();
  ctx.fillStyle='#4d6890';ctx.font='600 28px "IBM Plex Mono",monospace';ctx.textAlign='center';
  ctx.fillText(label.toUpperCase(),540,380);
  ctx.fillStyle=color;ctx.font='700 96px "IBM Plex Mono",monospace';
  ctx.fillText(value,540,520);
  ctx.fillStyle='#4d6890';ctx.font='400 22px "IBM Plex Mono",monospace';
  ctx.fillText(new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),540,620);
  _brandShareCanvas(ctx);_showShareModal(cv);
}
function _renderShareCardMulti(lines){
  var sc=_makeShareCanvas(),cv=sc.cv,ctx=sc.ctx;
  ctx.fillStyle='#e8edf8';ctx.font='700 42px "Bebas Neue",sans-serif';ctx.textAlign='center';
  ctx.fillText('DASHBOARD SUMMARY',540,120);
  ctx.fillStyle='#4d6890';ctx.font='400 22px "IBM Plex Mono",monospace';
  ctx.fillText(new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}),540,160);
  var startY=240,rowH=130;
  lines.forEach(function(ln,i){
    var y=startY+i*rowH;
    ctx.fillStyle='#0c0f17';_roundRect(ctx,100,y,880,100,12);ctx.fill();
    ctx.strokeStyle='#1a2035';ctx.lineWidth=1;_roundRect(ctx,100,y,880,100,12);ctx.stroke();
    ctx.fillStyle='#4d6890';ctx.font='600 22px "IBM Plex Mono",monospace';ctx.textAlign='left';
    ctx.fillText(ln.l.toUpperCase(),140,y+55);
    ctx.fillStyle=ln.c;ctx.font='700 36px "IBM Plex Mono",monospace';ctx.textAlign='right';
    ctx.fillText(ln.v,940,y+60);
  });
  _brandShareCanvas(ctx);_showShareModal(cv);
}
function _roundRect(ctx,x,y,w,h,r){
  if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();return;}
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function _showShareModal(cv){
  cv.toBlob(function(blob){
    _shareBlob=blob;
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('share-preview');img.src=url;
    // Show native share button if available
    var nBtn=document.getElementById('share-native-btn');
    if(navigator.share&&navigator.canShare)nBtn.style.display='inline-flex';
    else nBtn.style.display='none';
    document.getElementById('share-overlay').classList.add('active');
  },'image/png');
}
function closeShareModal(){
  document.getElementById('share-overlay').classList.remove('active');
  var img=document.getElementById('share-preview');
  if(img.src)URL.revokeObjectURL(img.src);
  _shareBlob=null;
}
function shareClipboard(){
  if(!_shareBlob)return;
  try{
    navigator.clipboard.write([new ClipboardItem({'image/png':_shareBlob})]).then(function(){
      var btn=document.querySelector('.share-modal-actions .btn-accent');
      if(btn){btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy to Clipboard';},2000);}
    }).catch(function(){shareDownload();});
  }catch(e){shareDownload();}
}
function shareDownload(){
  if(!_shareBlob)return;
  var a=document.createElement('a');var url=URL.createObjectURL(_shareBlob);
  a.href=url;a.download='tradeedge-'+Date.now()+'.png';a.click();
  setTimeout(function(){URL.revokeObjectURL(url);},200);
}
function shareNative(){
  if(!_shareBlob||!navigator.share)return;
  var file=new File([_shareBlob],'tradeedge.png',{type:'image/png'});
  navigator.share({files:[file],title:'TradeEdge ICT',text:'My trading stats'}).catch(function(){});
}

