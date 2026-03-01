// TradeEdge — Tag Management

function renderTagWrap(){
  const wrap=document.getElementById('tag-wrap');
  const inp=document.getElementById('tag-input');
  [...wrap.querySelectorAll('.tpill')].forEach(e=>e.remove());
  S.curTags.forEach((t,i)=>{
    const isICT=ICT_TAGS.some(x=>x.t===t&&x.type==='ict');
    const isKZ=ICT_TAGS.some(x=>x.t===t&&x.type==='kz');
    const pill=document.createElement('div');
    pill.className=`tpill ${isICT?'tpill-ict':isKZ?'tpill-kz':'tpill-custom'}`;
    pill.innerHTML=`${escapeHtml(t)}<span class="x" onclick="removeTag(${i})">✕</span>`;
    wrap.insertBefore(pill,inp);
  });
}
function removeTag(i){S.curTags.splice(i,1);renderTagWrap();}
function renderTagSuggestions(q=''){
  const sug=document.getElementById('tag-sug');
  const filtered=ICT_TAGS.filter(t=>!S.curTags.includes(t.t)&&(q?t.t.toLowerCase().includes(q.toLowerCase()):true));
  sug.innerHTML=filtered.map(t=>`<div class="sug ${t.type==='ict'?'tpill-ict':'tpill-kz'}" onclick="addTag('${escapeHtml(t.t)}')">${escapeHtml(t.t)}</div>`).join('');
}
function filterTags(){renderTagSuggestions(document.getElementById('tag-input').value);}
function addTag(t){
  if(!S.curTags.includes(t))S.curTags.push(t);
  document.getElementById('tag-input').value='';
  renderTagWrap();renderTagSuggestions();
}
function tagKey(e){
  if(e.key==='Enter'||e.key===','){
    const v=document.getElementById('tag-input').value.trim();
    if(v){addTag(v);}e.preventDefault();
  }
}

// ══════════════════════════════════════════════════════════
// CHECKLIST
// ══════════════════════════════════════════════════════════
