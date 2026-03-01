// TradeEdge — Chart Data & Rendering

function _initChartData(){
  _chartData=[];
  // V3.1: 16 chart configs for 16 monitors
  var configs=[
    {sym:'NQ',tf:'1m',vol:8,tint:[0,40,20],tickInterval:120},
    {sym:'NQ',tf:'15m',vol:20,tint:[0,40,20],tickInterval:180},
    {sym:'ES',tf:'5m',vol:5,tint:[10,20,40],tickInterval:150},
    {sym:'NQ',tf:'Daily',vol:60,tint:[0,40,20],tickInterval:240},
    {sym:'MNQ',tf:'1m',vol:8,tint:[0,35,25],tickInterval:110},
    {sym:'MNQ',tf:'5m',vol:12,tint:[0,35,25],tickInterval:140},
    {sym:'ES',tf:'1m',vol:4,tint:[10,20,40],tickInterval:100},
    {sym:'ES',tf:'15m',vol:10,tint:[10,20,40],tickInterval:170},
    {sym:'MES',tf:'5m',vol:4,tint:[10,15,35],tickInterval:145},
    {sym:'NQ',tf:'3m',vol:10,tint:[0,40,20],tickInterval:130},
    {sym:'NQ',tf:'1h',vol:35,tint:[0,40,20],tickInterval:200},
    {sym:'ES',tf:'Daily',vol:30,tint:[10,20,40],tickInterval:250},
    {sym:'MNQ',tf:'15m',vol:18,tint:[0,35,25],tickInterval:175},
    {sym:'MES',tf:'1m',vol:3,tint:[10,15,35],tickInterval:105},
    {sym:'NQ',tf:'4h',vol:50,tint:[0,40,20],tickInterval:220},
    {sym:'ES',tf:'4h',vol:25,tint:[10,20,40],tickInterval:230}
  ];
  configs.forEach(function(cfg){
    var candles=[];
    var price=cfg.sym==='ES'?5200:21400;
    var bias=0.02,momentum=0;
    for(var i=0;i<80;i++){
      // V2.3: Trend/pullback model — bias shifts every 10-20 candles
      if(i%Math.floor(10+Math.random()*10)===0)bias=(Math.random()-0.5)*0.1;
      // Volatility clustering
      var volMult=0.8+Math.random()*0.4;
      momentum=momentum*0.7+(Math.random()-0.5+bias)*cfg.vol*volMult;
      var change=momentum;
      var o=price,c=o+change;
      var h=Math.max(o,c)+(Math.random()*cfg.vol*0.5*volMult);
      var l=Math.min(o,c)-(Math.random()*cfg.vol*0.5*volMult);
      // FVGs — 3% chance
      if(i>1&&Math.random()<0.03){
        if(change>0){l=candles[i-1].h+cfg.vol*0.3;c=l+(Math.random()*cfg.vol*0.5);h=c+(Math.random()*cfg.vol*0.3);o=l;}
        else{h=candles[i-1].l-cfg.vol*0.3;o=h;c=h-(Math.random()*cfg.vol*0.5);l=c-(Math.random()*cfg.vol*0.3);}
      }
      var v=(Math.random()*80+20)*(1+Math.abs(change)/cfg.vol);
      candles.push({o:o,h:h,l:l,c:c,v:v});
      price=c;
    }
    // Tick state
    var tick={currentPrice:price,targetPrice:price,tickSpeed:0.3,
      forming:{o:price,h:price,l:price,c:price,v:Math.random()*50+10},
      candleTimer:0,candleInterval:cfg.tickInterval,
      momentum:0,meanLevel:price,vol:cfg.vol};
    _chartData.push({sym:cfg.sym,tf:cfg.tf,candles:candles,tint:cfg.tint,price:price,tick:tick});
  });
}

// V2.3: Ornstein-Uhlenbeck tick simulation
function _tickSimulation(){
  _chartData.forEach(function(data){
    var t=data.tick;if(!t)return;
    // Mean-reverting process
    var meanRevert=(t.meanLevel-t.currentPrice)*0.001;
    var noise=(Math.random()-0.5)*t.vol*0.15;
    t.momentum=t.momentum*0.95+meanRevert+noise;
    t.currentPrice+=t.momentum;
    // Update forming candle
    t.forming.c=t.currentPrice;
    if(t.currentPrice>t.forming.h)t.forming.h=t.currentPrice;
    if(t.currentPrice<t.forming.l)t.forming.l=t.currentPrice;
    t.forming.v+=Math.abs(t.momentum)*0.5;
    t.candleTimer++;
    // Close candle at interval
    if(t.candleTimer>=t.candleInterval){
      data.candles.push({o:t.forming.o,h:t.forming.h,l:t.forming.l,c:t.forming.c,v:t.forming.v});
      if(data.candles.length>120)data.candles.shift();
      data.price=t.currentPrice;
      // Start new forming candle
      t.forming={o:t.currentPrice,h:t.currentPrice,l:t.currentPrice,c:t.currentPrice,v:Math.random()*10+5};
      t.candleTimer=0;
      // Occasional bias shift
      if(Math.random()<0.15)t.meanLevel+=(Math.random()-0.5)*t.vol*2;
    }
  });
}

// V2.3: Chart style constants
var _chartStyle={
  bg:'#131722',gridColor:'rgba(255,255,255,0.07)',textColor:'rgba(200,210,230,0.6)',
  bullColor:'#26a69a',bearColor:'#f23645',wickWidth:3,
  fvgBullColor:'rgba(38,166,154,0.12)',fvgBearColor:'rgba(242,54,69,0.12)',
  annotFont:function(cw){return 'bold '+(cw/28)+'px monospace';},
  symFont:function(cw){return 'bold '+(cw/18)+'px monospace';},
  ohlcFont:function(cw){return (cw/28)+'px monospace';},
  axisFont:function(cw){return (cw/32)+'px monospace';}
};
function _drawCandlestickChart(monInfo){
  var c=monInfo.canvas,ctx=monInfo.ctx,cw=monInfo.w,ch=monInfo.h;
  var _MQ=c.width/cw;ctx.setTransform(_MQ,0,0,_MQ,0,0);
  var idx=monInfo.idx;
  if(idx>=_chartData.length)return;
  var data=_chartData[idx];
  // V2.3: Dark TradingView background
  ctx.fillStyle=_chartStyle.bg;ctx.fillRect(0,0,cw,ch);
  // Grid
  ctx.strokeStyle=_chartStyle.gridColor;ctx.lineWidth=1;
  for(var gy=0;gy<6;gy++){var yy=ch*0.06+gy*(ch*0.72/5);ctx.beginPath();ctx.moveTo(cw*0.02,yy);ctx.lineTo(cw*0.88,yy);ctx.stroke();}
  for(var gx=0;gx<6;gx++){var xx=cw*0.05+gx*(cw*0.83/5);ctx.beginPath();ctx.moveTo(xx,ch*0.04);ctx.lineTo(xx,ch*0.82);ctx.stroke();}
  // Candle data
  var candles=data.candles;var len=candles.length;
  var vis=Math.min(len,40);var start=len-vis;
  var pMin=Infinity,pMax=-Infinity;for(var i=start;i<len;i++){if(candles[i].h>pMax)pMax=candles[i].h;if(candles[i].l<pMin)pMin=candles[i].l;}
  var pRange=pMax-pMin||1;
  var chartH=ch*0.72;var chartT=ch*0.06;var chartL=cw*0.05;
  var barW=(cw*0.83)/vis;
  var _p2y=function(p){return chartT+chartH*(1-(p-pMin)/pRange);};
  // === ICT Annotations ===
  // Sellside Liquidity
  var swingLow=pMin+pRange*0.15;
  ctx.strokeStyle='#f23645';ctx.lineWidth=1.5;ctx.setLineDash([8,6]);
  ctx.beginPath();ctx.moveTo(chartL,_p2y(swingLow));ctx.lineTo(cw*0.88,_p2y(swingLow));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#f23645';ctx.font=_chartStyle.annotFont(cw);ctx.textAlign='right';
  ctx.fillText('SSL',cw*0.87,_p2y(swingLow)-4);ctx.textAlign='left';
  // Buyside Liquidity
  var swingHigh=pMin+pRange*0.88;
  ctx.strokeStyle='#26a69a';ctx.lineWidth=1.5;ctx.setLineDash([8,6]);
  ctx.beginPath();ctx.moveTo(chartL,_p2y(swingHigh));ctx.lineTo(cw*0.88,_p2y(swingHigh));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#26a69a';ctx.font=_chartStyle.annotFont(cw);ctx.textAlign='right';
  ctx.fillText('BSL',cw*0.87,_p2y(swingHigh)-4);ctx.textAlign='left';
  // FVGs — up to 3 per chart
  var _fvgCount=0;
  for(var i=2;i<vis-1&&_fvgCount<3;i++){
    var prev=candles[start+i-1],next=candles[start+i+1];
    if(prev.h<next.l){
      var fy1=_p2y(next.l),fy2=_p2y(prev.h);var fx=chartL+(i-1)*barW;
      ctx.fillStyle=_chartStyle.fvgBullColor;ctx.fillRect(fx,fy1,cw*0.88-fx,fy2-fy1);
      ctx.strokeStyle='rgba(38,166,154,0.5)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.strokeRect(fx,fy1,cw*0.88-fx,fy2-fy1);ctx.setLineDash([]);
      ctx.fillStyle='#26a69a';ctx.font=(cw/36)+'px monospace';ctx.fillText('+FVG',fx+3,fy2-2);
      _fvgCount++;
    }
    if(prev.l>next.h&&_fvgCount<3){
      var fy1b=_p2y(prev.l),fy2b=_p2y(next.h);var fxb=chartL+(i-1)*barW;
      ctx.fillStyle=_chartStyle.fvgBearColor;ctx.fillRect(fxb,fy1b,cw*0.88-fxb,fy2b-fy1b);
      ctx.strokeStyle='rgba(242,54,69,0.5)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.strokeRect(fxb,fy1b,cw*0.88-fxb,fy2b-fy1b);ctx.setLineDash([]);
      ctx.fillStyle='#f23645';ctx.font=(cw/36)+'px monospace';ctx.fillText('-FVG',fxb+3,fy1b-2);
      _fvgCount++;
    }
  }
  // Order Block — gradient fill
  var obIdx=Math.floor(vis*0.7);
  if(obIdx>2&&obIdx<vis){
    var obCandle=candles[start+obIdx];
    var oby1=_p2y(obCandle.h),oby2=_p2y(obCandle.l);var obx=chartL+obIdx*barW;
    var obGrad=ctx.createLinearGradient(obx,oby1,cw*0.88,oby1);
    obGrad.addColorStop(0,'rgba(255,165,0,0.2)');obGrad.addColorStop(1,'rgba(255,165,0,0.02)');
    ctx.fillStyle=obGrad;ctx.fillRect(obx,oby1,cw*0.88-obx,oby2-oby1);
    ctx.strokeStyle='rgba(255,165,0,0.6)';ctx.lineWidth=1.5;ctx.strokeRect(obx,oby1,cw*0.88-obx,oby2-oby1);
    ctx.fillStyle='#f5a623';ctx.font='bold '+(cw/36)+'px monospace';ctx.fillText('OB',obx+3,oby1-4);
  }
  // PDL/PWL
  ctx.fillStyle='#f23645';ctx.font='bold '+(cw/34)+'px monospace';ctx.textAlign='right';
  ctx.fillText('PDL',cw*0.87,_p2y(pMin+pRange*0.05)+4);ctx.textAlign='left';
  // Draw candles — teal/red
  for(var i=0;i<vis;i++){
    var cd=candles[start+i];var x=chartL+i*barW+barW*0.15;var bw=barW*0.7;
    var isUp=cd.c>=cd.o;
    // Wicks
    ctx.strokeStyle=isUp?_chartStyle.bullColor:_chartStyle.bearColor;ctx.lineWidth=_chartStyle.wickWidth;
    ctx.beginPath();ctx.moveTo(x+bw/2,_p2y(cd.h));ctx.lineTo(x+bw/2,_p2y(cd.l));ctx.stroke();
    // Body
    ctx.fillStyle=isUp?_chartStyle.bullColor:_chartStyle.bearColor;
    var by=_p2y(Math.max(cd.o,cd.c));var bh=Math.max(1,Math.abs(cd.c-cd.o)/pRange*chartH);
    ctx.fillRect(x,by,bw,bh);
  }
  // V2.3: Volume histogram at bottom 14%
  var volTop=ch*0.82,volH=ch*0.14;
  var maxVol=0;for(var i=start;i<len;i++){if(candles[i].v>maxVol)maxVol=candles[i].v;}
  for(var i=0;i<vis;i++){
    var cd=candles[start+i];var x=chartL+i*barW+barW*0.1;var bw=barW*0.8;
    var vh=(cd.v/maxVol)*volH;var isUp=cd.c>=cd.o;
    ctx.fillStyle=isUp?'rgba(38,166,154,0.3)':'rgba(242,54,69,0.3)';
    ctx.fillRect(x,volTop+volH-vh,bw,vh);
  }
  // Price axis
  ctx.fillStyle=_chartStyle.textColor;ctx.font=_chartStyle.axisFont(cw);ctx.textAlign='right';
  for(var pi=0;pi<=4;pi++){var pp=pMin+pi*(pRange/4);ctx.fillText(pp.toFixed(2),cw*0.97,_p2y(pp)+3);}
  ctx.textAlign='left';
  // Last price badge + dashed line
  var lastC=candles[len-1];var lastP=lastC.c;var lastUp=lastC.c>=lastC.o;var lpY=_p2y(lastP);
  ctx.strokeStyle=lastUp?_chartStyle.bullColor:_chartStyle.bearColor;ctx.lineWidth=1;ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(chartL,lpY);ctx.lineTo(cw*0.88,lpY);ctx.stroke();ctx.setLineDash([]);
  // Pulsing price badge
  var pulse=0.8+0.2*Math.sin(performance.now()*0.005);
  ctx.globalAlpha=pulse;
  ctx.fillStyle=lastUp?_chartStyle.bullColor:_chartStyle.bearColor;
  ctx.fillRect(cw*0.89,lpY-7,cw*0.1,14);
  ctx.fillStyle='#fff';ctx.font='bold '+(cw/38)+'px monospace';ctx.textAlign='center';
  ctx.fillText(lastP.toFixed(2),cw*0.94,lpY+4);ctx.textAlign='left';
  ctx.globalAlpha=1;
  // Symbol/TF label
  ctx.fillStyle='rgba(200,210,230,0.8)';ctx.font=_chartStyle.symFont(cw);
  ctx.fillText(data.sym+' '+data.tf,cw*0.03,ch*0.045);
  // OHLC
  var lc=candles[len-1];ctx.fillStyle=_chartStyle.textColor;ctx.font=_chartStyle.ohlcFont(cw);
  ctx.fillText('O'+lc.o.toFixed(0)+' H'+lc.h.toFixed(0)+' L'+lc.l.toFixed(0)+' C'+lc.c.toFixed(0),cw*0.03,ch*0.08);
  // V2.3: Scanlines + vignette
  ctx.globalAlpha=0.04;ctx.fillStyle='#000';
  for(var sl=0;sl<ch;sl+=3){ctx.fillRect(0,sl,cw,1);}
  ctx.globalAlpha=1;
  var vig=ctx.createRadialGradient(cw/2,ch/2,cw*0.3,cw/2,ch/2,cw*0.7);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.3)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,cw,ch);
  // V2.3: Time display (ET)
  var now=new Date();var et=now.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  ctx.fillStyle='rgba(200,210,230,0.4)';ctx.font=(cw/36)+'px monospace';ctx.textAlign='right';
  ctx.fillText(et+' ET',cw*0.87,ch*0.97);ctx.textAlign='left';
}

var _chartFrame=0;
function _updateChartTextures(){
  var _isMob=window.innerWidth<600;
  var throttle=_isMob?8:4;
  _chartFrame++;
  if(_chartFrame%throttle!==0)return;
  // Tick simulation at visual rate (matches chart redraw cadence)
  _tickSimulation();
  // Redraw each monitor canvas (V3.1: wing monitors idx 4-13 throttled to every-other cycle)
  _monCanvases.forEach(function(m,i){
    if(i>=4&&i<=13&&_chartFrame%(throttle*2)!==0)return;
    _drawCandlestickChart(m);
    if(_monTextures[i])_monTextures[i].needsUpdate=true;
  });
  // V2.1: Update phone screen (X/Twitter Spaces animation)
  if(_chartFrame%6===0)_drawPhoneScreen();
}

// V2.1: Live data WebSocket stub
var _liveWS=null;
function _tryLiveData(){
  var url=S.liveDataUrl;
  var statusEl=document.getElementById('live-status');
  if(!url){if(statusEl)statusEl.textContent='No URL configured';return;}
  if(_liveWS){try{_liveWS.close();}catch(e){}_liveWS=null;}
  if(statusEl)statusEl.textContent='Connecting...';statusEl.style.color='var(--gold)';
  try{
    _liveWS=new WebSocket(url);
    _liveWS.onopen=function(){if(statusEl){statusEl.textContent='Connected';statusEl.style.color='var(--green)';}};
    _liveWS.onmessage=function(ev){
      try{
        var msg=JSON.parse(ev.data);
        if(msg.price&&_chartData&&_chartData[0]){_chartData[0].livePrice=msg.price;}
      }catch(e){console.warn('[TradeEdge] WebSocket message parse error');}
    };
    _liveWS.onerror=function(){if(statusEl){statusEl.textContent='Connection failed — using procedural charts';statusEl.style.color='var(--red)';}};
    _liveWS.onclose=function(){if(statusEl&&statusEl.textContent==='Connected'){statusEl.textContent='Disconnected';statusEl.style.color='var(--t3)';}};
  }catch(e){
    if(statusEl){statusEl.textContent='Error: '+e.message;statusEl.style.color='var(--red)';}
  }
}

// V2.3: Holographic PADD (replaces leather journal)
