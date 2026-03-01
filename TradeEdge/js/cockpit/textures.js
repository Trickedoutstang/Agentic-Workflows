// TradeEdge — AI Texture Variables

function _loadAITexInto(tex,dataUrl){
  if(!dataUrl)return;
  var img=new Image();
  img.onload=function(){tex.image=img;tex.needsUpdate=true;};
  img.src=dataUrl;
}

// V3.2: Pre-load new AI textures (panoramas, control panels, ICT logo)
var _aiPanorama1Img=null, _aiPanorama2Img=null;
function _preloadAIPanoramas(){
  if(typeof _TEX_SPACE_PANORAMA_1!=='undefined'&&_TEX_SPACE_PANORAMA_1){_aiPanorama1Img=new Image();_aiPanorama1Img.src=_TEX_SPACE_PANORAMA_1;}
  if(typeof _TEX_SPACE_PANORAMA_2!=='undefined'&&_TEX_SPACE_PANORAMA_2){_aiPanorama2Img=new Image();_aiPanorama2Img.src=_TEX_SPACE_PANORAMA_2;}
}
_preloadAIPanoramas();

// Pre-loaded AI viewscreen background images (for canvas overlay)
var _aiVSImgs={};
function _preloadAIVSImgs(){
  var map={deepspace:_TEX_VS_DEEPSPACE,warp:_TEX_VS_WARP,planet:_TEX_VS_PLANET};
  Object.keys(map).forEach(function(k){
    if(map[k]){var img=new Image();img.src=map[k];_aiVSImgs[k]=img;}
  });
}

// Pre-loaded AI background for notebook/journal canvas overlay
var _aiPaddImg=null,_aiDatapadImg=null;
function _preloadAIPaddImgs(){
  if(_TEX_PADD_SCREEN){_aiPaddImg=new Image();_aiPaddImg.src=_TEX_PADD_SCREEN;}
  if(_TEX_DATAPAD_COVER){_aiDatapadImg=new Image();_aiDatapadImg.src=_TEX_DATAPAD_COVER;}
}
_preloadAIVSImgs();
_preloadAIPaddImgs();

// ══════════════════════════════════════════════════════════
// 3D TRADING DESK SCENE — THREE.JS
// ══════════════════════════════════════════════════════════

// Compact noise utilities for realistic rendering (V2.2)
function _hash(x,y){var n=x*374761393+y*668265263;n=(n^(n>>13))*1274126177;return(n^(n>>16))&0x7fffffff;}
function _noise2d(x,y){var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var a=_hash(ix,iy)/0x7fffffff,b=_hash(ix+1,iy)/0x7fffffff,c=_hash(ix,iy+1)/0x7fffffff,d=_hash(ix+1,iy+1)/0x7fffffff;return a+(b-a)*fx+(c-a)*fy+(d-c-b+a)*fx*fy;}
function _fbm(x,y,oct){var v=0,a=0.5,f=1;for(var i=0;i<oct;i++){v+=a*_noise2d(x*f,y*f);f*=2;a*=0.5;}return v;}

// V2.3: Star Trek Bridge — Command Console + Bridge Deck
