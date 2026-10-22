// Restore shared object references from the compact presentation artifact.
// All contract fields remain present; no forecast or quote is recalculated.
export function restoreMd3Workspace(data){
  if(data.schemaVersion!==1||data.matchday!==3||data.fixtures?.length!==18||data.marketCatalog?.matches?.length!==18)throw Error('Payload Schedina Champions MD3 non valido');
  const ids=new Set(data.fixtures.map(f=>f.id));
  if(ids.size!==18||data.marketCatalog.matches.some(m=>!ids.has(m.matchId))||new Set(data.marketCatalog.matches.map(m=>m.matchId)).size!==18)throw Error('Fixture del payload Champions MD3 non coerenti');
  const all=data.marketCatalog.matches.flatMap(m=>m.selections);
  if(all.some(leg=>!ids.has(leg.matchId)))throw Error('Selezione Champions MD3 fuori giornata');
  return {...data,all,marketCatalog:{...data.marketCatalog,totals:{
    approved:all.filter(leg=>leg.suggestionAnalysis?.suggested&&leg.qualifiedSelection).length,
    preliminary:all.filter(leg=>leg.suggestionAnalysis?.suggested&&!leg.qualifiedSelection).length
  }}};
}
