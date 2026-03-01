// TradeEdge — Fill Pairing

function pairFills(rows){
  const fills=rows.map(row=>{
    const dtStr=gv(row,'Status Time','Closing Time','Close Time','Fill Time','Date','Time','Timestamp','Trade Date','Placing Time');
    const{date,time}=pdt(dtStr);
    const placingStr=gv(row,'Placing Time');
    const{date:pDate,time:pTime}=pdt(placingStr);
    const sym=nsym(gv(row,'Symbol','Instrument','Contract','Market','Ticker'));
    const buy=isbuy(gv(row,'Side','Direction','Type','Action','Buy/Sell'));
    const qty=Math.abs(gn(row,'Fill Qty','Filled Qty','Qty','Quantity','Size','Contracts'))||1;
    const price=gn(row,'Avg Fill Price','Fill Price','Price','Avg Price','Exec Price','Trade Price');
    const comm=gn(row,'Commission','Comm','Fees','Fee');
    const pnl=gn(row,'P&L','PnL','Profit','Net P&L','P/L');
    const orderId=gv(row,'Order ID','OrderID','Order Id');
    const orderType=gv(row,'Type','Order Type');
    const stopPrice=gn(row,'Stop Price');
    const limitPrice=gn(row,'Limit Price');
    if(!sym&&!price)return null;
    const sortKey=(date||'9999')+' '+(time||'00:00');
    const placingKey=pDate?pDate+' '+(pTime||'00:00'):'';
    return{date,time,sym:sym||'UNKNOWN',buy,qty,price,comm,pnl,sortKey,
      placingTime:placingKey,orderId,orderType,stopPrice,limitPrice};
  }).filter(Boolean);

  console.log('[TradeEdge] Fills parsed:', fills.length);
  if(fills.length) console.log('[TradeEdge] Sample fill:', JSON.stringify(fills[0]));
  fills.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));

  const trades=[];
  const bySymbol={};
  fills.forEach(f=>{if(!bySymbol[f.sym])bySymbol[f.sym]=[];bySymbol[f.sym].push(f);});

  Object.entries(bySymbol).forEach(([sym,sf])=>{
    if(sf.length>0 && sf.every(f=>f.pnl)){
      sf.forEach(f=>{
        const fees=f.comm||feeForSymbol(sym)*f.qty*2;
        trades.push({
          date:f.date,time:f.time,symbol:sym,side:f.buy?'Long':'Short',qty:f.qty,
          entry:f.price,exit:null,sl:null,tp:null,slPrice:null,tpPrice:null,
          slDollar:null,tpDollar:null,slHistory:[],tpHistory:[],
          entryOrderId:f.orderId,exitOrderId:null,
          entryPlacingTime:f.placingTime,exitPlacingTime:null,
          entryOrderType:f.orderType,exitOrderType:null,
          pnl:f.pnl,fees,netPnl:f.pnl-fees,
          rr:null,tags:[],checklist:{},mistakes:[],rating:0,
          killzone:dkz(f.time),emotion:'',bias:'',notes:'',chartUrl:'',chartImg:null,
          importedAt:new Date().toISOString(),source:'TV History (with P&L)'
        });
      });
      return;
    }

    const buyQ=sf.filter(f=>f.buy);
    const sellQ=sf.filter(f=>!f.buy);
    const bCopy=[...buyQ], sCopy=[...sellQ];

    while(bCopy.length && sCopy.length){
      const b=bCopy[0], s=sCopy[0];
      if(b.sortKey<=s.sortKey){
        bCopy.shift(); sCopy.shift();
        const mq=Math.min(b.qty,s.qty);
        const calcPnl=(s.price-b.price)*getTickValue(sym)*mq;
        const tc=(b.comm||0)+(s.comm||0);
        const fees=tc||feeForSymbol(sym)*mq*2;
        trades.push({
          date:b.date,time:b.time,symbol:sym,side:'Long',qty:mq,
          entry:b.price,exit:s.price,sl:null,tp:null,slPrice:null,tpPrice:null,
          slDollar:null,tpDollar:null,slHistory:[],tpHistory:[],
          entryOrderId:b.orderId,exitOrderId:s.orderId,
          entryPlacingTime:b.placingTime,exitPlacingTime:s.placingTime,
          entryOrderType:b.orderType,exitOrderType:s.orderType,
          exitStopPrice:s.stopPrice||null,exitLimitPrice:s.limitPrice||null,
          pnl:calcPnl,fees,netPnl:calcPnl-fees,
          rr:null,tags:[],checklist:{},mistakes:[],rating:0,
          killzone:dkz(b.time),emotion:'',bias:'',notes:'',chartUrl:'',chartImg:null,
          importedAt:new Date().toISOString(),source:'TV History (paired)'
        });
      } else {
        sCopy.shift(); bCopy.shift();
        const mq=Math.min(b.qty,s.qty);
        const calcPnl=(s.price-b.price)*getTickValue(sym)*mq;
        const tc=(b.comm||0)+(s.comm||0);
        const fees=tc||feeForSymbol(sym)*mq*2;
        trades.push({
          date:s.date,time:s.time,symbol:sym,side:'Short',qty:mq,
          entry:s.price,exit:b.price,sl:null,tp:null,slPrice:null,tpPrice:null,
          slDollar:null,tpDollar:null,slHistory:[],tpHistory:[],
          entryOrderId:s.orderId,exitOrderId:b.orderId,
          entryPlacingTime:s.placingTime,exitPlacingTime:b.placingTime,
          entryOrderType:s.orderType,exitOrderType:b.orderType,
          exitStopPrice:b.stopPrice||null,exitLimitPrice:b.limitPrice||null,
          pnl:calcPnl,fees,netPnl:calcPnl-fees,
          rr:null,tags:[],checklist:{},mistakes:[],rating:0,
          killzone:dkz(s.time),emotion:'',bias:'',notes:'',chartUrl:'',chartImg:null,
          importedAt:new Date().toISOString(),source:'TV History (paired)'
        });
      }
    }

    [...bCopy,...sCopy].forEach(f=>{
      const fees=f.comm||feeForSymbol(sym)*f.qty;
      trades.push({
        date:f.date,time:f.time,symbol:sym,side:f.buy?'Long':'Short',qty:f.qty,
        entry:f.price,exit:null,sl:null,tp:null,slPrice:null,tpPrice:null,
        slDollar:null,tpDollar:null,slHistory:[],tpHistory:[],
        entryOrderId:f.orderId,exitOrderId:null,
        entryPlacingTime:f.placingTime,exitPlacingTime:null,
        entryOrderType:f.orderType,exitOrderType:null,
        pnl:f.pnl||0,fees,netPnl:(f.pnl||0)-fees,
        rr:null,tags:[],checklist:{},mistakes:[],rating:0,
        killzone:dkz(f.time),emotion:'',bias:'',notes:'Unmatched fill',chartUrl:'',chartImg:null,
        importedAt:new Date().toISOString(),source:'TV History (unmatched)'
      });
    });
  });

  console.log('[TradeEdge] Paired trades:', trades.length);
  if(trades.length) console.log('[TradeEdge] First trade:', JSON.stringify(trades[0]));
  return trades;
}

// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// SL/TP RECONSTRUCTION FROM CANCELLED ORDERS + FILLED EXITS
// ══════════════════════════════════════════════════════════
