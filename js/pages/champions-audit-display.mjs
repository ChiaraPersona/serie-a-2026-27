import '../official-starter-policy.js';
// Display-only hydration; the complete historical contracts stay in the archive.
function economics(selections){
  const won=selections.filter(s=>s.settlement?.status==='won'),lost=selections.filter(s=>s.settlement?.status==='lost');
  const voidCount=selections.filter(s=>s.settlement?.status==='void').length,stakeEuro=won.length+lost.length;
  const grossReturnEuro=Number(won.reduce((sum,s)=>sum+Number(s.odds),0).toFixed(2));
  return {total:selections.length,won:won.length,lost:lost.length,void:voidCount,pending:selections.length-stakeEuro-voidCount,stakeEuro,grossReturnEuro,
    profitLossEuro:Number((grossReturnEuro-stakeEuro).toFixed(2)),roiPct:stakeEuro?(grossReturnEuro-stakeEuro)/stakeEuro*100:null};
}
export function championsAuditDisplay(operational,archive){
  if(archive?.kind!=='READ_ONLY_AUDITED_ARCHIVE')throw new Error('Archivio audit Champions non valido');
  const fixtures=archive.fixtures.map(f=>{
    const selections=f.contractIds.map(id=>{
      const record=archive.contracts[id];
      if(!record||record.forecast.selectionId!==id||record.forecast.matchId!==f.fixtureId)throw new Error(`Contratto audit mancante: ${id}`);
      return {...record.forecast,settlement:record.settlement,auditDisplayOnly:true};
    }).filter(leg=>globalThis.officialStarterPolicy.eligible(leg,f.fixtureId));
    return {...f,selections,auditSummary:economics(selections)};
  });
  const selections=fixtures.flatMap(f=>f.selections),summary=economics(selections);
  return {...operational,isAuditArchive:true,auditSource:archive.source,auditSummary:summary,filteredAuditSummary:null,
    summary:{...operational.summary,...summary,fixtures:fixtures.length,predictions:selections.length,clickableSelections:0},fixtures,
    settlementPolicy:'Archivio filtrato sugli undici ufficiali. Rendimento parziale: 1 € per selezione verificata; annullate e non verificate escluse dal puntato e dal ROI. Verifica statistica; liquidazione non certificata.'};
}
