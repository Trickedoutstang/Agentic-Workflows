// TradeEdge — State Management

const SK = 'tradeedge_ict_v2';
let S = {
  trades: [],
  journal: [],
  ampFees: null,
  ampStatements: [],
  importLog: [],
  feeRates: { MNQ:0.90, MES:0.90, NQ:2.25, ES:2.25 },
  pendingImport: [],
  pendingCancelled: [],
  editIdx: null,
  curTags: [],
  curRating: 0,
  tradeFilter: 'all',
  accountName: '',
  startingBalance: 0,
  violations: [],
  rules: {maxTradesPerDay:3,maxContractsPerTrade:1,maxDailyLoss:50,alarmEnabled:true},
  keyLevels: null,
  webhookUrl: 'http://localhost:5050',
  webhookAutoImport: false,
  webhookSeenIds: [],
  webhookLastFetch: null,
};
// Hoist critical flags before any function calls (Bug fix: prevents undefined check at updateSidebar)
var _nukeTriggered=false;
var _lastChipBalance=-1;

function load(){
  try{
    const d=localStorage.getItem(SK);
    if(d){
      const p=JSON.parse(d);
      // Merge with defaults, ensuring arrays exist
      S={...S,...p};
      if(!Array.isArray(S.trades))S.trades=[];
      if(!Array.isArray(S.journal))S.journal=[];
      if(!Array.isArray(S.ampStatements))S.ampStatements=[];
      if(!Array.isArray(S.importLog))S.importLog=[];
      if(!S.feeRates)S.feeRates={MNQ:0.90,MES:0.90,NQ:2.25,ES:2.25};
      // Restore V2 data: key levels, trading rules, violations
      if(!S.keyLevels)S.keyLevels=null;
      if(!S.rules)S.rules={maxTradesPerDay:3,maxContractsPerTrade:1,maxDailyLoss:50,alarmEnabled:true};
      if(!Array.isArray(S.violations))S.violations=[];
      if(!Array.isArray(S.webhookSeenIds))S.webhookSeenIds=[];
      // Migration: clear AMP statements parsed from raw binary (they have no valid balance)
      if(S.ampStatements&&S.ampStatements.length&&!S._ampMigrated){
        var hasBadData=S.ampStatements.every(function(s){return !s.balance&&!s.netLiq;});
        if(hasBadData){
          console.log('[TradeEdge] Clearing '+S.ampStatements.length+' AMP statements parsed from raw PDF binary — please re-import');
          S.ampStatements=[];S.accountName='';S.startingBalance=0;S._ampMigrated=true;
        }
      }
      // Migration v2: if startingBalance doesn't match any known NLV, reset it so AMP re-import fixes it
      if(S._ampMigrated&&!S._ampMigV2&&S.startingBalance&&S.ampStatements&&!S.ampStatements.length){
        console.log('[TradeEdge] Resetting stale startingBalance: $'+S.startingBalance+' — re-import AMP PDF');
        S.startingBalance=0;S._ampMigV2=true;
      }
      // Try to recover accountName from existing statements if not set
      if(!S.accountName&&S.ampStatements&&S.ampStatements.length){
        for(var si=S.ampStatements.length-1;si>=0;si--){if(S.ampStatements[si].accountName){S.accountName=S.ampStatements[si].accountName;break;}}
      }
      console.log('[TradeEdge] Loaded state: trades='+S.trades.length+', journal='+S.journal.length+', statements='+S.ampStatements.length+', name='+S.accountName);
      // Remove stale PDF synthetic trades when CSV already covers same date+symbol
      if(S.trades&&S.trades.length){
        var before=S.trades.length;
        S.trades=S.trades.filter(function(t){
          var isPDFTrade=!t.source||t.source.includes('AMP Statement');
          if(!isPDFTrade)return true;
          var csvCovers=S.trades.some(function(et){
            return et!==t&&et.date===t.date&&et.symbol===t.symbol&&
                   et.source&&!et.source.includes('AMP Statement');
          });
          return !csvCovers;
        });
        if(S.trades.length<before)console.log('[TradeEdge] Removed '+(before-S.trades.length)+' duplicate PDF trade(s)');
      }
      // Always recompute starting balance on load — fixes stale values saved before this fix
      _recomputeStartingBalance();
    }
  }catch(e){console.error('[TradeEdge] Load error:',e);}
}
function save(){
  try{localStorage.setItem(SK,JSON.stringify({trades:S.trades,journal:S.journal,ampFees:S.ampFees,ampStatements:S.ampStatements||[],importLog:S.importLog||[],feeRates:S.feeRates,accountName:S.accountName||'',startingBalance:S.startingBalance||0,_welcomed:S._welcomed||false,_ampMigrated:true,_ampMigV2:true,keyLevels:S.keyLevels||null,rules:S.rules||null,violations:S.violations||[],webhookUrl:S.webhookUrl||'http://localhost:5050',webhookAutoImport:S.webhookAutoImport||false,webhookSeenIds:(S.webhookSeenIds||[]).slice(-500),webhookLastFetch:S.webhookLastFetch||null}))}catch(e){console.error('[TradeEdge] Save failed:',e);try{toast('Save failed — storage may be full','err')}catch(_){}}
}
load();
