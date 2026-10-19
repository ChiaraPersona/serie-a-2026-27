// Display-only hydration; these historical contracts never become operational picks.
export function championsAuditDisplay(operational,archive){
  if(archive?.kind!=='READ_ONLY_AUDITED_ARCHIVE')throw new Error('Archivio audit Champions non valido');
  return {...operational,isAuditArchive:true,auditSource:archive.source,auditSummary:archive.summary,filteredAuditSummary:archive.filteredSummary,
    summary:{...operational.summary,...archive.summary,fixtures:archive.fixtures.length,predictions:archive.summary.total,clickableSelections:0},
    fixtures:archive.fixtures.map(f=>({...f,selections:f.contractIds.map(id=>{
      const record=archive.contracts[id];
      if(!record||record.forecast.selectionId!==id||record.forecast.matchId!==f.fixtureId)throw new Error(`Contratto audit mancante: ${id}`);
      return {...record.forecast,settlement:record.settlement,auditDisplayOnly:true};
    })})),
    settlementPolicy:'Archivio originario prepartita: 117 pronostici, inclusi 4 contratti di non titolari partecipanti, conservati solo per consultazione. Rendimento parziale: 1 € per selezione verificata, grigi esclusi. Verifica statistica dell’audit del 15 ottobre; liquidazione Sisal non certificata.'};
}
