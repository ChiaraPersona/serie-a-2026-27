// Unquoted model-only thresholds from the frozen MD3 probable-XI dataset.
export function md3IndividualMarkets(data){
 const rows=[];
 for(const fixture of data.fixtures)for(const team of fixture.teams)for(const player of team.players){
  if(player.projectedRole!=='starter'||player.availability!=='probable-starter'||!player.playerId||!Number.isFinite(player.projectedShots)||!Number.isFinite(player.projectedSOT))continue;
  for(const [key,family,threshold,label] of [['shotsOver05','shots',1,'1+ tiro'],['shotsOver15','shots',2,'2+ tiri'],['sotOver05','sot',1,'1+ tiro in porta']]){
   const p=player.eventProbabilities?.[key];
   if(!Number.isFinite(p)||p<0||p>1)continue;
   const id=`champions:md03:model:${fixture.fixtureId}:${player.playerId}:${key}`;
   rows.push({selectionId:id,matchId:fixture.fixtureId,fixture:fixture.fixtureId,context:{competition:'champions',season:'2026-27',matchday:3},label:`${player.sourceName} · ${label}`,selection:label,market:family==='shots'?'Tiri giocatore':'SOT giocatore',marketScope:'player',marketFamily:family==='shots'?'Tiri':'SOT',playerId:player.playerId,playerName:player.sourceName,teamId:team.teamId,threshold,odds:null,modelProbability:p,catalogOrigin:'champions-md03-individual-model',suggestionAnalysis:{suggested:true,rank:2,family},
    betSelection:{selectionId:id,identity:{status:'MODEL_ONLY_CL3',matchId:fixture.fixtureId,playerId:player.playerId},market:{name:family==='shots'?'Tiri giocatore':'SOT giocatore',family,threshold,selection:label,subject:{type:'player',id:player.playerId,name:player.sourceName,teamId:team.teamId}},quote:{decimal:null,availability:'UNAVAILABLE',verifiedAt:null,source:null},evaluation:{status:'PROBABLE_LINEUP_MODEL',modelProbabilityPct:p*100,fairOdds:p>0?1/p:null,expectedValuePct:null},compatibility:{status:'MODEL_ONLY',bookmakerCombinability:'UNKNOWN'},operational:{classification:'PRELIMINARE',playability:{status:'PLAYABLE'}},overlap:{overlapKey:`${fixture.fixtureId}:${player.playerId}:${family}`,semanticKeys:[]}}});
  }
 }
 // Curated preliminary shortlist: no EV ranking is possible without verified odds.
 const shortlisted=[];
 const byFixture=new Map();
 for(const row of rows){
  const list=byFixture.get(row.matchId)||[];
  list.push(row);
  byFixture.set(row.matchId,list);
 }
 for(const candidates of byFixture.values()){
  const eligible=candidates.filter(row=>{
   const p=row.modelProbability;
   return row.threshold===2?p>=0.45:row.marketFamily==='SOT'?p>=0.35:p>=0.65;
  });
  const score=row=>row.modelProbability+(row.marketFamily==='SOT'?0.20:row.threshold===2?0.12:0);
  eligible.sort((a,b)=>score(b)-score(a)||a.selectionId.localeCompare(b.selectionId));
  const chosen=[],players=new Set(),teamCounts=new Map();
  for(const row of eligible){
   if(chosen.length>=4)break;
   if(players.has(row.playerId)||(teamCounts.get(row.teamId)||0)>=2)continue;
   chosen.push(row);players.add(row.playerId);teamCounts.set(row.teamId,(teamCounts.get(row.teamId)||0)+1);
  }
  shortlisted.push(...chosen.map((row,index)=>({...row,suggestionAnalysis:{...row.suggestionAnalysis,rank:index+2},betSelection:{...row.betSelection,operational:{...row.betSelection.operational,classification:'PRELIMINARE_SELEZIONATO'}}})));
 }
 return shortlisted;
}
