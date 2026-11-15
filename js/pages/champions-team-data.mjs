const datasets=new Set(['champions-registered-squads-2026-27.json','champions-md03-player-database-2026-27.json','champions-player-history-context-2025-26.json']);
export function teamDataLoader(load,loadGenerated,teamId){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(teamId||''))return load;
 const generated=path=>loadGenerated?loadGenerated(path):load('../generated/'+path);
 // Start immediately; unrelated page dependencies continue loading in parallel.
 const pending=(async()=>{
  const index=await generated('champions-teams/index.json');
  if(index.schemaVersion!==1||!Array.isArray(index.teamIds))throw Error('Indice squadre Champions non coerente');
  if(!index.teamIds.includes(teamId))return null;
  const projection=await generated(`champions-teams/${teamId}.json`);
  if(projection.schemaVersion!==1||projection.teamId!==teamId||!projection.datasets)throw Error('Scheda squadra Champions non coerente');
  return projection.datasets;
 })();
 return async name=>{
  if(!datasets.has(name))return load(name);
  const data=await pending;
  if(!data)return load(name);
  if(!Object.hasOwn(data,name))throw Error('Dati della squadra Champions incompleti');
  return globalThis.officialStarterPolicy?globalThis.officialStarterPolicy.filter(data[name]):structuredClone(data[name]);
 };
}
