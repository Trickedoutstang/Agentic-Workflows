// TradeEdge — Navigation

// ══════════════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════════════
const pageTitles={dashboard:'Dashboard',trades:'Trade Log',journal:'Journal',analytics:'Performance Analytics',ict:'ICT Analytics',weekly:'Weekly Report',import:'Import Data',settings:'Settings',help:'Help & Tutorial'};
function go(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.querySelectorAll('.ni').forEach(el=>el.classList.toggle('active',el.dataset.view===v));
  document.getElementById('page-title').textContent=pageTitles[v]||v;
  // Change 14: Pause/unpause 3D scene based on active view
  if(typeof _3d!=='undefined')_3d._paused=(v!=='dashboard');
  if(v==='dashboard'){renderDash();_lastChipBalance=-1;_chipInitRetries=0;if(typeof _3d!=='undefined'){if(!_3d.inited){try{init3DChips();}catch(e){console.error('[TradeEdge] go(dashboard) init3DChips error:',e);}}if(_3d.chipGroup){while(_3d.chipGroup.children.length>0)_3d.chipGroup.remove(_3d.chipGroup.children[0]);_3d.allChips=[];_3d.stacks=[];_3d._fidgets=[];}_drawPhoneScreen();_drawNotebookCover();}updateSidebar();return;} // Force chip slam from above every time
    if(v==='settings'){var ni=document.getElementById('set-name');if(ni)ni.value=S.accountName||'';var bi=document.getElementById('set-balance');if(bi)bi.value=S.startingBalance||'';}
  if(v==='trades')renderTrades();
  if(v==='journal')renderJournal();
  if(v==='analytics')renderAnalytics();
  if(v==='ict')renderICT();
  if(v==='weekly')renderWeekly();
  if(v==='import')updateImportStatus();
  if(v==='settings')renderSettings();
  if(v==='import'){if(typeof renderImportLog==='function')renderImportLog();if(typeof renderAMPStatements==='function')renderAMPStatements();}
  if(v==='help'){renderHelp();}
  updateSidebar();
}
