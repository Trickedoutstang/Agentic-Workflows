// TradeEdge — Journal

function renderChecklist(state={}){
  document.getElementById('checklist').innerHTML=CKL_ITEMS.map(item=>`
    <div class="ck-item ${state[item]?'checked':''}" data-key="${item}" onclick="this.classList.toggle('checked')">
      <div class="ck-box"><svg viewBox="0 0 12 12"><polyline points="1,6 4,10 11,2"/></svg></div>
      <span class="ck-label">${item}</span>
    </div>`).join('');
  // Post-trade checklist
  const ptCkl=document.getElementById('pt-checklist');
  if(ptCkl)ptCkl.innerHTML=CKL_ITEMS.slice(0,6).map(item=>`
    <div class="ck-item" data-key="${item}" onclick="this.classList.toggle('checked')">
      <div class="ck-box"><svg viewBox="0 0 12 12"><polyline points="1,6 4,10 11,2"/></svg></div>
      <span class="ck-label">${item}</span>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// STARS / EMOTIONS / MISTAKES
// ══════════════════════════════════════════════════════════
function setStar(n){S.curRating=n;renderStars();}
function renderStars(){
  document.querySelectorAll('#star-row .star').forEach((s,i)=>s.classList.toggle('on',i<S.curRating));
}
function toggleEmo(el){
  el.parentElement.querySelectorAll('.emo').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
}
function toggleMk(el){el.classList.toggle('sel');}

// ══════════════════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════════════════
function openJournal(){
  document.getElementById('j-date').value=new Date().toISOString().split('T')[0];
  ['j-bias','j-pre','j-post','j-mental','j-improve','j-chart-url'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('j-sleep').value='';
  document.getElementById('j-energy').value='';
  document.getElementById('j-coffee').value='';
  document.getElementById('j-confidence').value='';
  document.getElementById('j-img-preview-wrap').style.display='none';
  openModal('journal-overlay');
}
function saveJournal(){
  const entry={
    date:document.getElementById('j-date').value,
    bias:document.getElementById('j-bias').value,
    pre:document.getElementById('j-pre').value,
    post:document.getElementById('j-post').value,
    mental:document.getElementById('j-mental').value,
    improve:document.getElementById('j-improve').value,
    chartUrl:document.getElementById('j-chart-url').value,
    chartImg:document.getElementById('j-img-preview-wrap').style.display!=='none'?document.getElementById('j-img-preview').src||null:null,
    sleep:document.getElementById('j-sleep').value,
    energy:document.getElementById('j-energy').value,
    coffee:document.getElementById('j-coffee').value,
    confidence:document.getElementById('j-confidence').value,
    createdAt:new Date().toISOString(),
  };
  S.journal.push(entry);save();closeModal('journal-overlay');
  toast('Journal entry saved ✓','ok');renderJournal();
}
function renderJournal(){
  const list=document.getElementById('journal-list');
  const entries=[...S.journal].sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById('journal-empty').style.display=entries.length?'none':'block';
  list.innerHTML=entries.map((e,i)=>{
    const dayTrades=S.trades.filter(t=>t.date===e.date);
    const dayPnl=dayTrades.reduce((a,t)=>a+(t.netPnl||t.pnl||0),0);
    const psychScore=calcPsychScore(e,dayTrades);
    return `<div class="jcard">
      <div class="jcard-hdr">
        <div>
          <div class="jcard-date">${new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
          <div class="jcard-meta">${dayTrades.length} trades · ${e.bias||'No bias set'} · Sleep: ${e.sleep||'?'}h · Energy: ${e.energy||'?'}/10</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="score-pill">Psych <span class="val">${psychScore}/10</span></div>
          <div class="jcard-pnl" style="color:${dayPnl>=0?'var(--green)':'var(--red)'}">${f$(dayPnl)}</div>
          <button class="btn btn-ghost btn-sm" onclick="deleteJournal(${i})" style="padding:3px 8px">✕</button>
        </div>
      </div>
      <div class="jcard-body">
        ${e.pre?`<div class="jsec"><div class="jsec-label">Pre-Market Plan</div><div class="jsec-text">${escapeHtml(e.pre)}</div></div>`:''}
        ${e.post?`<div class="jsec"><div class="jsec-label">Post-Session Review</div><div class="jsec-text">${escapeHtml(e.post)}</div></div>`:''}
        ${e.mental?`<div class="jsec"><div class="jsec-label">Mental Notes</div><div class="jsec-text">${escapeHtml(e.mental)}</div></div>`:''}
        ${e.improve?`<div class="jsec"><div class="jsec-label">Focus for Tomorrow</div><div class="jsec-text">${escapeHtml(e.improve)}</div></div>`:''}
        ${e.chartUrl||e.chartImg?`<div style="margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          ${e.chartUrl?`<a href="${escapeHtml(e.chartUrl)}" target="_blank" style="color:var(--accent);font-size:.75rem;font-family:var(--mono);text-decoration:none">📊 View Chart →</a>`:''}
          ${e.chartImg?`<a href="${escapeHtml(e.chartImg)}" target="_blank" style="display:inline-block;position:relative" title="Click to open screenshot"><img src="${escapeHtml(e.chartImg)}" style="max-width:180px;max-height:90px;border-radius:6px;border:1px solid var(--b2);cursor:pointer;vertical-align:middle"><span style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:var(--accent);font-family:var(--mono);font-size:.52rem;padding:1px 5px;border-radius:3px">↗</span></a>`:''}
        </div>`:''}
      </div>
    </div>`;
  }).join('');
}
function deleteJournal(i){
  if(!confirm('Delete this journal entry?'))return;
  const entries=[...S.journal].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const target=entries[i];
  const realIdx=S.journal.indexOf(target);
  if(realIdx>-1)S.journal.splice(realIdx,1);
  save();renderJournal();
}
// Change 33: Psychology score v2 — enhanced scoring
function calcPsychScore(entry,trades){
  var score=5;
  // Sleep: +2 for 8+h, +1 for 7+h, -1 for <6h, -2 for <5h
  if(entry.sleep>=8)score+=2;
  else if(entry.sleep>=7)score+=1;
  if(entry.sleep<5)score-=2;
  else if(entry.sleep<6)score-=1;
  // Energy/confidence
  if(entry.energy>=7)score+=1;if(entry.energy<4)score-=1;
  if(entry.confidence>=7)score+=1;if(entry.confidence<4)score-=1;
  // Mistakes
  var mistakes=trades.flatMap(function(t){return t.mistakes||[];});
  if(mistakes.includes('Revenge Trade'))score-=2;
  if(mistakes.includes('Moved SL'))score-=1;
  if(mistakes.includes('Off-Plan Entry'))score-=1;
  if(mistakes.includes('Sized Too Big'))score-=1;
  if(mistakes.includes('Chased Move'))score-=1;
  // Plan adherence bonus — if 80%+ of today's trades had complete checklists
  var withChecklist=trades.filter(function(t){
    if(!t.checklist)return false;
    var keys=Object.keys(t.checklist);if(!keys.length)return false;
    var checked=keys.filter(function(k){return t.checklist[k];}).length;
    return checked/keys.length>=0.8;
  });
  if(trades.length>0&&withChecklist.length/trades.length>=0.8)score+=1;
  return Math.max(1,Math.min(10,score));
}

// ══════════════════════════════════════════════════════════
// SESSION COMPANION
// ══════════════════════════════════════════════════════════
