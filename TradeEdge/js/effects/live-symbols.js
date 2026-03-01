// TradeEdge — Live Monitor Symbols

function _setMonitorSymbol(monIdx,symbol){
  if(monIdx>=0&&monIdx<_chartData.length){
    symbol=symbol.toUpperCase().trim();
    var tickMap={'MNQ':8,'NQ':8,'ES':5,'MES':4,'YM':3,'MYM':3,'RTY':5,'M2K':5};
    var priceMap={'MNQ':21400,'NQ':21400,'ES':5200,'MES':5200,'YM':40000,'MYM':40000,'RTY':2200,'M2K':2200};
    var parts=symbol.split(' ');
    var sym=parts[0]||'NQ';
    var tf=parts[1]||_chartData[monIdx].tf;
    _chartData[monIdx].sym=sym;
    _chartData[monIdx].tf=tf;
    _chartData[monIdx].tick.vol=tickMap[sym]||8;
    if(priceMap[sym]){
      _chartData[monIdx].price=priceMap[sym];
      _chartData[monIdx].tick.currentPrice=priceMap[sym];
      _chartData[monIdx].tick.meanLevel=priceMap[sym];
    }
    _liveSymbols[monIdx]=symbol;
  }
}

