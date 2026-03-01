// TradeEdge — Helpers & Utilities

// ══════════════════════════════════════════════════════════
// FORMAT
// ══════════════════════════════════════════════════════════
function f$(n,show=true){
  if(n==null||isNaN(n))return'—';
  const s=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const sign=n<0?'-':show?'+':'';
  return sign+'$'+s;
}
function fpct(n){return n==null?'—':(n*100).toFixed(1)+'%'}
function fnum(n,d=2){return n==null||isNaN(n)?'—':n.toFixed(d)}
function fhold(mins){if(mins==null||isNaN(mins))return'—';if(mins>=60){var h=Math.floor(mins/60);return h+'h '+Math.round(mins%60)+'m';}return Math.round(mins)+'m';}
