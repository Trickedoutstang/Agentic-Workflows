// TradeEdge — Bootstrap (must load last)
// All modules are loaded via <script> tags before this file.
// This file triggers the initial render after all modules are ready.

// Initial render
renderDash();
updateSidebar();
renderSettings();

// Show welcome tour for first-time users
if (!S._welcomed) {
  S._welcomed = true;
  save();
  setTimeout(function(){ startTour(); }, 2500);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open, .session-overlay.open').forEach(function(el) { el.classList.remove('open'); });
    endTour();
    return;
  }
  if (!e.metaKey) return;
  switch (e.key) {
    case 'n': case 'N': e.preventDefault(); openTrade(); break;
    case 'j': case 'J': e.preventDefault(); logTradeJournal(); break;
    case 's': case 'S': e.preventDefault(); openPreSession(); break;
    case '1': e.preventDefault(); go('dashboard'); break;
    case '2': e.preventDefault(); go('trades'); break;
    case '3': e.preventDefault(); go('journal'); break;
    case '4': e.preventDefault(); go('analytics'); break;
    case '5': e.preventDefault(); go('ict'); break;
    case 'i': case 'I': e.preventDefault(); go('import'); break;
    case 'e': case 'E': e.preventDefault(); exportCSV(); break;
    case '?': e.preventDefault(); go('help'); break;
  }
});

// Start killzone HUD updater
setInterval(_updateKillzoneHUD, 30000);
_updateKillzoneHUD();

// Auto-start webhook polling if enabled
if(S.webhookAutoImport&&S.webhookUrl){webhookStartPolling();}
