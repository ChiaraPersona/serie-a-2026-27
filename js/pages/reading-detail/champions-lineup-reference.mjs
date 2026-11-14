export function latestReferenceLineups(model,history,lineups){
 if(model.competition!=='champions'||model.fixture.status!=='scheduled')return lineups;
 return lineups.map((lineup,i)=>{
  if(['official','probable'].includes(lineup.status)&&lineup.players.length===11)return lineup;
  const teamId=model.prediction?.teamProjections?.[i]?.teamId||lineup.side.id||lineup.side.slug;
  const previous=(history?.records||[]).filter(r=>r.teamId===teamId&&r.fixtureId!==model.fixture.id&&r.date<model.fixture.date&&r.players.length===11)
   .sort((a,b)=>b.date.localeCompare(a.date)||Number(b.status==='official')-Number(a.status==='official'))[0];
  if(!previous)return lineup;
  return {...lineup,status:'reference',formation:previous.formation,coach:previous.coach||lineup.coach,
   reference:{fixtureId:previous.fixtureId,date:previous.date,status:previous.status},
   players:previous.players.map(p=>({...p,source:{playerId:p.id,canonicalName:p.name}})),bench:[],benchPlayers:[],benchPlayerIds:[]};
 });
}
