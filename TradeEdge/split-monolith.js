// split-monolith.js — Extract JS functions from tradeedge-ict.html into module files
// Usage: node split-monolith.js

import fs from 'fs';
import path from 'path';

const SRC = './tradeedge-ict.html';
const lines = fs.readFileSync(SRC, 'utf-8').split('\n');

// Extract lines (1-indexed, inclusive)
function extract(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

// File definitions: [outputPath, header, [[startLine, endLine], ...]]
const FILES = [
  // ── CORE ──
  ['js/core/state.js', '// TradeEdge — State Management', [
    [1462, 1542] // SK, S, flags, load(), save(), load() call
  ]],
  ['js/core/nav.js', '// TradeEdge — Navigation', [
    [1544, 1567] // pageTitles, go()
  ]],
  ['js/core/helpers.js', '// TradeEdge — Helpers & Utilities', [
    [1699, 1710], // FORMAT section: f$, fpct, fnum, fhold
  ]],

  // ── FEATURES ──
  ['js/features/dashboard.js', '// TradeEdge — Dashboard', [
    [1569, 1697], // calcMetrics
    [1712, 2009], // renderDash, updateSidebar, drawEquity, drawDonut, drawDOW, drawKZChart
  ]],
  ['js/features/calendar.js', '// TradeEdge — Trading Calendar', [
    [2010, 2124] // calNav, renderCalendar
  ]],
  ['js/features/trades.js', '// TradeEdge — Trade Log', [
    [2125, 2358] // setF, renderTrades, openTrade, editTrade, saveTrade, deleteTrade, feeForSymbol, escapeHtml
  ]],
  ['js/features/tags.js', '// TradeEdge — Tag Management', [
    [2360, 2394] // renderTagWrap, removeTag, renderTagSuggestions, filterTags, addTag, tagKey
  ]],
  ['js/features/journal.js', '// TradeEdge — Journal', [
    [2395, 2529] // renderChecklist, setStar, renderStars, toggleEmo, toggleMk, openJournal, saveJournal, renderJournal, deleteJournal, calcPsychScore
  ]],
  ['js/features/session.js', '// TradeEdge — Session Workflow', [
    [2530, 2603] // openPreSession, savePreSession, logTradeJournal, savePostTrade, closeSession
  ]],
  ['js/features/analytics.js', '// TradeEdge — Analytics', [
    [2604, 2730] // renderAnalytics, renderHeatmap, drawPsychCurve
  ]],
  ['js/features/ict-analytics.js', '// TradeEdge — ICT Analytics', [
    [2731, 2874] // renderICT
  ]],
  ['js/features/weekly.js', '// TradeEdge — Weekly Report', [
    [2875, 2916] // renderWeekly
  ]],

  // ── IMPORT ──
  ['js/import/csv-parser.js', '// TradeEdge — CSV Parser', [
    [2967, 3083] // parseCSV, gv, gn, pdt, nsym, dkz, isbuy, getTickValue, mapRow
  ]],
  ['js/import/fill-pairing.js', '// TradeEdge — Fill Pairing', [
    [3084, 3207] // pairFills
  ]],
  ['js/import/sltp-reconstruct.js', '// TradeEdge — SL/TP Reconstruction', [
    [3208, 3361] // reconstructSLTP
  ]],
  ['js/import/import-workflow.js', '// TradeEdge — Import Workflow', [
    [2912, 2966], // pendingRows, pendingTrades, importMode, lastImportFileName, importHistory
    [3362, 3457], // showPreview, showTradePreview, updateImportStatus, _recomputeStartingBalance
    [3456, 3509], // confirmImport, extractPDFText
    [3832, 3933], // importCancelled, doDrag, doDragLeave, doDrop, smartImport, classifyFile, routeFiles
    [3934, 4029], // processRouted
  ]],
  ['js/import/pdf-import.js', '// TradeEdge — PDF Import', [
    [3510, 3831] // importPDFs, parseAMPStatement, renderAMPStatements, renderImportLog
  ]],
  ['js/import/import-ui.js', '// TradeEdge — Import UI', [
    // Drag/drop handlers are in import-workflow already
  ]],

  // ── SETTINGS ──
  ['js/settings/settings.js', '// TradeEdge — Settings', [
    [4030, 4143] // renderSettings, saveFees, exportCSV, exportAllCSV, exportJSON, importJSON, clearAll, dl
  ]],

  // ── HELP ──
  ['js/help/help.js', '// TradeEdge — Help System', [
    [4144, 4674] // previewImg, previewJImg, openModal, closeModal, toast, renderHelp, showHelpTab
  ]],
  ['js/help/tour.js', '// TradeEdge — Guided Tour', [
    [4675, 4753] // startTour, showTourStep, tourNext, endTour
  ]],

  // ── COCKPIT ──
  ['js/cockpit/textures.js', '// TradeEdge — AI Texture Variables', [
    [4754, 4788] // _TEX_* variables, _loadAITexInto, _preloadAIVSImgs, _preloadAIPaddImgs, _hash, _noise2d, _fbm
  ]],
  ['js/cockpit/noise.js', '// TradeEdge — Noise Functions', [
    // Already included in textures.js (lines 4784-4786)
  ]],
  ['js/cockpit/scene-setup.js', '// TradeEdge — Scene Setup (Console & Monitors)', [
    [4789, 4958] // _createConsole, _createMonitorMesh, _createMonitors
  ]],
  ['js/cockpit/charts.js', '// TradeEdge — Chart Data & Rendering', [
    [4959, 5217] // _initChartData, _tickSimulation, _drawCandlestickChart, _updateChartTextures, _tryLiveData
  ]],
  ['js/cockpit/scene-objects.js', '// TradeEdge — Scene Objects (Journal, Calendar, Phone, Notebook)', [
    [5218, 5681] // _createJournal, _fetchEconomicCalendar, _createWallCalendar, _drawWallCalendar, _checkNewsAlerts, _createPhone, _drawPhoneScreen, _createSpiralNotebook, _drawNotebookCover, openKeyLevels, saveKeyLevels
  ]],
  ['js/cockpit/rules-alarm.js', '// TradeEdge — Trade Rules & Nuclear Alarm', [
    [5682, 5796] // _checkTradeRules, triggerNuclearAlarm, dismissAlarm, _playNuclearSiren, _disposeSceneObjects
  ]],
  ['js/cockpit/space.js', '// TradeEdge — Space Flight & Viewscreen', [
    [5797, 6159] // _createMoon, _makeHoloMat, _makeHoloGlowMat, _makeHoloConeMat, _drawHoloScanlines, _clickFeedback, _playHoloClick, _playHoloHover, _createViewscreen, _drawSpaceFlight, _drawInterestObject, _drawSpaceTargets, _drawSpaceLasers, _drawSpaceExplosions
  ]],
  ['js/cockpit/cockpit-frame.js', '// TradeEdge — Cockpit Frame & Control Centers', [
    [6160, 6383] // _createWindowedWall, _createCockpitFrame, _buildControlCenter, _createControlCenters, _createJoystick, _createAmbientParticles, _updateAmbientParticles
  ]],
  ['js/cockpit/chips-init.js', '// TradeEdge — 3D Chip Initialization & Animation', [
    [6384, 6776] // init3DChips (including animate3D closure)
  ]],
  ['js/cockpit/chips-materials.js', '// TradeEdge — Chip Textures & Materials', [
    [6768, 6940] // _ac, _chipSideTex, _chipTopTex, _chipBotTex, _makeChipMats, _makeStackMesh, _makeSingleChipMesh, _disposeSpreadChip
  ]],
  ['js/cockpit/chips-render.js', '// TradeEdge — Chip Rendering', [
    [6939, 7120] // _fidgetStack (closure within init3DChips)
  ]],
  ['js/cockpit/audio.js', '// TradeEdge — Audio System', [
    [7121, 7411] // All _play*Sound functions + _showCSSFallback
  ]],

  // ── EFFECTS ──
  ['js/effects/share.js', '// TradeEdge — Share System', [
    [7653, 7824] // _renderCSSChips, shareMetric, shareDashboard, _makeShareCanvas, _brandShareCanvas, _renderShareCard, _renderShareCardMulti, _roundRect, _showShareModal, closeShareModal, shareClipboard, shareDownload, shareNative
  ]],
  ['js/effects/nuke.js', '// TradeEdge — Self-Destruct Sequence', [
    [7824, 7912] // nukeImpact, playSadTrombone, dismissNuke
  ]],
  ['js/effects/weapons.js', '// TradeEdge — Weapon System', [
    [8141, 8259] // _toggleWeaponMode, _weaponMouseMove, _initSelfDestruct
  ]],
  ['js/effects/market-bells.js', '// TradeEdge — Market Bells & Killzone HUD', [
    [7913, 8140] // toggleSidebar, _playOpeningBell, _playClosingBell, _flashMonitorsMessage, _updateKillzoneHUD, _showSessionSummary
  ]],
  ['js/effects/live-symbols.js', '// TradeEdge — Live Monitor Symbols', [
    [8259, 8278] // _setMonitorSymbol
  ]],

  // ── MAIN RENDERING ──
  ['js/features/render-chips.js', '// TradeEdge — renderChips Main Entry', [
    [7411, 7652] // renderChips function
  ]],

  // ── INIT ──
  ['js/init.js', '// TradeEdge — Bootstrap (load last)', [
    // This will be manually created with the init code
  ]],
];

// ── Execute extraction ──
let created = 0;
let skipped = 0;

for (const [filePath, header, ranges] of FILES) {
  if (!ranges || ranges.length === 0) {
    skipped++;
    continue;
  }

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  let content = header + '\n';
  for (const [start, end] of ranges) {
    content += '\n' + extract(start, end) + '\n';
  }

  fs.writeFileSync(filePath, content);
  const lineCount = content.split('\n').length;
  console.log(`  ${filePath} (${lineCount} lines)`);
  created++;
}

console.log(`\nDone: ${created} files created, ${skipped} skipped (empty).`);
