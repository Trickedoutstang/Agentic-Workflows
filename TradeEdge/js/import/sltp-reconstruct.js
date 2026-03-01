// TradeEdge — SL/TP Reconstruction

function reconstructSLTP(){
  if(!S.trades.length){console.log('[TradeEdge] SL/TP: No trades');return;}

  // Parse cancelled orders if available
  let orders=[];
  const cancelled=S.pendingCancelled;
  if(cancelled&&cancelled.length){
    orders=cancelled.map(row=>{
      const dtStr=gv(row,'Status Time','Closing Time','Close Time');
      const{date,time}=pdt(dtStr);
      const placingStr=gv(row,'Placing Time');
      const{date:pDate,time:pTime}=pdt(placingStr);
      const sym=nsym(gv(row,'Symbol','Instrument','Contract','Market','Ticker'));
      const side=gv(row,'Side','Direction').toLowerCase();
      const type=gv(row,'Type','Order Type').toLowerCase();
      const qty=Math.abs(gn(row,'Qty','Quantity'))||1;
      const limitPrice=gn(row,'Limit Price');
      const stopPrice=gn(row,'Stop Price');
      const price=limitPrice||stopPrice||0;
      const orderId=gv(row,'Order ID','OrderID');
      const cancelTime=date+' '+(time||'00:00');
      const placingTime=pDate?pDate+' '+(pTime||'00:00'):'';
      const isBuy=side.includes('buy');
      const isStop=type.includes('stop')&&!type.includes('take');
      const isLimit=type.includes('limit');
      const isTP=type.includes('take profit')||type.includes('tp');
      return{date,time,sym,side,type,qty,limitPrice,stopPrice,price,orderId,cancelTime,placingTime,isBuy,isStop,isLimit,isTP};
    }).filter(o=>o.sym&&o.price);
    console.log('[TradeEdge] SL/TP: Parsed',orders.length,'cancelled orders');
  }

  function toMs(t){try{return new Date(t.replace(' ','T')).getTime();}catch(e){return NaN;}}

  S.trades.forEach(trade=>{
    if(!trade.entry||!trade.date)return;
    const tv=getTickValue(trade.symbol);
    const isLong=trade.side==='Long';

    // ═══ STEP 1: SL from exit order's stop price (the SL that actually got hit) ═══
    if(trade.exitStopPrice){
      const et=(trade.exitOrderType||'').toLowerCase();
      if(et.includes('stop')){
        const slPrice=trade.exitStopPrice;
        const slDollar=isLong?(slPrice-trade.entry)*tv*trade.qty:(trade.entry-slPrice)*tv*trade.qty;
        trade.slPrice=slPrice;
        trade.slDollar=slDollar;
        if(!trade.slHistory||!trade.slHistory.length){
          trade.slHistory=[{price:slPrice,dollar:slDollar,time:trade.exitPlacingTime||'',source:'filled'}];
        }
      }
    }

    // ═══ STEP 2: Exit reason from order type ═══
    if(trade.exitOrderType){
      const et=trade.exitOrderType.toLowerCase();
      if(et.includes('stop')&&!et.includes('take')) trade.exitReason='SL Hit';
      else if(et.includes('limit')||et.includes('take profit')||et.includes('tp')) trade.exitReason='TP Hit';
      else if(et.includes('market')) trade.exitReason='Manual Exit';
      else trade.exitReason='Unknown';
    }

    // ═══ STEP 3: TP + SL adjustments from cancelled orders ═══
    if(!orders.length){
      if(trade.slDollar) trade.actualR=Math.abs((trade.pnl||0)/Math.abs(trade.slDollar))*(trade.pnl>=0?1:-1);
      return;
    }

    const entryTime=trade.entryPlacingTime||trade.date+' '+(trade.time||'00:00');
    const exitTime=trade.exitPlacingTime||trade.date+' 23:59';
    const entryMs=toMs(entryTime);
    const exitMs=toMs(exitTime);

    // Only match cancelled orders placed between entry-5min and exit
    const candidates=orders.filter(o=>{
      if(o.sym!==trade.symbol||o.date!==trade.date)return false;
      const pMs=toMs(o.placingTime||o.cancelTime);
      if(isNaN(pMs)||isNaN(entryMs))return true;
      return pMs>=(entryMs-300000)&&pMs<=exitMs;
    });

    // Find TP orders
    const tpCandidates=[];
    candidates.forEach(o=>{
      if(isLong){
        if(!o.isBuy&&(o.isLimit||o.isTP)&&o.price>trade.entry)tpCandidates.push(o);
      }else{
        if(o.isBuy&&(o.isLimit||o.isTP)&&o.price<trade.entry)tpCandidates.push(o);
      }
    });

    // Find SL adjustment orders (cancelled SL = SL was moved)
    const slAdjCandidates=[];
    candidates.forEach(o=>{
      if(isLong){
        if(!o.isBuy&&o.isStop&&o.price<trade.entry)slAdjCandidates.push(o);
      }else{
        if(o.isBuy&&o.isStop&&o.price>trade.entry)slAdjCandidates.push(o);
      }
    });

    // Build SL history (adjustments + final hit)
    if(slAdjCandidates.length){
      const slHist=[];
      const seen=new Set();
      slAdjCandidates.sort((a,b)=>(a.placingTime||a.cancelTime).localeCompare(b.placingTime||b.cancelTime));
      slAdjCandidates.forEach(o=>{
        if(seen.has(o.price))return;
        seen.add(o.price);
        const d=isLong?(o.price-trade.entry)*tv*trade.qty:(trade.entry-o.price)*tv*trade.qty;
        slHist.push({price:o.price,dollar:d,time:o.placingTime||o.cancelTime,orderId:o.orderId,source:'cancelled'});
      });
      // Add the final SL (the one that hit) at end if not already there
      if(trade.slPrice&&!seen.has(trade.slPrice)){
        slHist.push({price:trade.slPrice,dollar:trade.slDollar,time:trade.exitPlacingTime||'',source:'filled'});
      }
      if(slHist.length)trade.slHistory=slHist;
      // If no exit SL yet, use first cancelled as initial
      if(!trade.slPrice&&slHist.length){trade.slPrice=slHist[0].price;trade.slDollar=slHist[0].dollar;}
    }

    // Build TP history
    const tpHist=[];
    const seenTP=new Set();
    tpCandidates.sort((a,b)=>(a.placingTime||a.cancelTime).localeCompare(b.placingTime||b.cancelTime));
    tpCandidates.forEach(o=>{
      if(seenTP.has(o.price))return;
      seenTP.add(o.price);
      const d=isLong?(o.price-trade.entry)*tv*trade.qty:(trade.entry-o.price)*tv*trade.qty;
      tpHist.push({price:o.price,dollar:Math.abs(d),time:o.placingTime||o.cancelTime,orderId:o.orderId});
    });
    if(tpHist.length){
      trade.tpPrice=tpHist[0].price;
      trade.tpDollar=tpHist[0].dollar;
      trade.tpHistory=tpHist;
    }

    // R:R from SL and TP
    if(trade.slDollar&&trade.tpDollar)trade.rr=Math.abs(trade.tpDollar/Math.abs(trade.slDollar));

    // Actual R multiple
    if(trade.slDollar)trade.actualR=Math.abs((trade.pnl||0)/Math.abs(trade.slDollar))*(trade.pnl>=0?1:-1);

    console.log('[TradeEdge] SL/TP:',trade.date,trade.time,trade.side,
      '| SL:',trade.slPrice,'('+f$(trade.slDollar)+')',
      '| TP:',trade.tpPrice,'('+f$(trade.tpDollar)+')',
      '| R:R:',trade.rr?fnum(trade.rr):'—',
      '| Exit:',trade.exitReason||'—',
      '| ActualR:',trade.actualR?fnum(trade.actualR):'—');
  });

  save();
  console.log('[TradeEdge] SL/TP reconstruction complete');
}

