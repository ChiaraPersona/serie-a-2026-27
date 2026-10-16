import {shirtNumberAt} from './shirt-numbers.mjs';
// Read existing public artifacts only; no builder, importer, or model dependency.
export async function readArtifact(path){
 const response=await fetch(new URL('../../../'+path,import.meta.url));
 if(!response.ok)throw new Error(`Dati non disponibili: ${path}`);
 return response.json();
}
export async function loadEvidence(model){
 const analysis=model.analysis||{},directory=analysis.teamDirectory||await readArtifact('data/teams/index.json');
 const sides=[model.home,model.away];
 const squadFiles=await Promise.all(sides.map(async(side,i)=>{
  const id=side.id||model.prediction?.teamProjections?.[i]?.teamId;
  if(!directory.teams.some(t=>t.id===id))return null;
  return readArtifact(`data/teams/${encodeURIComponent(id)}.json`);
 }));
 const official=model.competition==='serie-a'?(await readArtifact('data/sources/official-lineups-2026-27.json')).fixtures.find(f=>f.matchId===model.fixture.id):null;
 const probable=model.competition==='serie-a'&&Number(model.fixture.matchday)===7?await readArtifact('data/sources/probable-lineups-md7-2026-27.json'):null;
 const numbering=model.competition==='serie-a'?await readArtifact('data/sources/team-pages/shirt-numbers-2026-27.json'):null;
 const lineups=sides.map((side,i)=>{
  const raw=model.competition==='serie-a'?analysis.lineups?.[i]?.lineup:analysis.lineups?.[i?'away':'home']||(()=>{const formation=analysis.match?.probableFormation,side=formation?.[i?'away':'home'];return side?{...side,status:formation.status,source:formation.source,updatedAt:formation.updatedAt}:null})();
  const canonical=official?.teams?.find(t=>t.teamId===side.id);
  const registered=analysis.squads?.teams?.find(t=>t.team===side.name);
  const roster=squadFiles[i]?.squad||registered?.players||[];
  const players=(raw?.players||[]).map((p,index)=>{
   const name=typeof p==='string'?p:p.canonicalName||p.currentName||p.suppliedName||p.name;
   const mapped=canonical?.players?.find(q=>q.currentName===name)||probable?.teams?.find(t=>t.teamId===side.id)?.players?.find(q=>q.lineupStatus==='starter'&&(q.sourceName===name||q.currentName===name));
   const id=typeof p==='object'?(p.canonicalPlayerId||p.playerId||null):mapped?.playerId||null;
   const member=id?roster.find(q=>q.id===id):null;
   const shirtNumber=numbering?shirtNumberAt(numbering,side.id,id,model.fixture.date):member?.shirtNumber??null;
   return {id,name:mapped?.currentName||name,index,shirtNumber,source:p,member};
  });
  const bench=raw?.bench||raw?.substitutes||canonical?.substitutes||[];
  const benchPlayerIds=[...bench,...(canonical?.substitutes||[])].map(p=>typeof p==='object'?(p.canonicalPlayerId||p.playerId||null):null).filter(Boolean);
  if(raw?.status==='probable')benchPlayerIds.push(...(probable?.teams?.find(t=>t.teamId===side.id)?.players||[]).filter(p=>p.lineupStatus==='reserve').map(p=>p.playerId).filter(Boolean));
  return {side,formation:raw?.formation??null,status:raw?.status??null,coach:raw?.coach||canonical?.coach||squadFiles[i]?.coach||registered?.coach||null,players,bench,benchPlayerIds,source:raw?.source??null,updatedAt:raw?.updatedAt??null};
 });
 return {analysis,directory,squadFiles,lineups};
}
export function playerLineupStatus(id,lineups){
 if(!id)return 'unknown';
 const relevant=lineups.filter(l=>['official','probable'].includes(l.status));
 const starter=relevant.some(l=>l.players.some(p=>p.id===id)),bench=relevant.some(l=>(l.benchPlayerIds||[]).includes(id));
 return starter===bench?'unknown':starter?'starter':'bench';
}
export function individualPlayers(model,evidence){
 const source=model.prediction?.shooters?.allPlayers;
 const projections=source?.length?source:evidence.lineups.flatMap(l=>[
  ...l.players.map(p=>({...((p.source&&typeof p.source==='object')?p.source:{}),name:p.name,canonicalPlayerId:p.id,team:l.side.name,readingLineupStatus:['official','probable'].includes(l.status)?'starter':'unknown'})),
  ...l.bench.map(p=>({...((p&&typeof p==='object')?p:{}),name:typeof p==='string'?p:p.canonicalName||p.currentName||p.suppliedName||p.name,team:l.side.name,readingLineupStatus:['official','probable'].includes(l.status)?'bench':'unknown'}))
 ]);
 return projections.map(p=>{
  const id=p.playerId||p.canonicalPlayerId||null;
  const lineup=evidence.lineups.find(l=>l.players.some(q=>q.id&&q.id===id));
  const lineupPlayer=lineup?.players.find(q=>q.id===id),member=lineupPlayer?.member;
  const outsider=(model.prediction?.shooters?.outsiders||[]).some(q=>q.playerId===id&&q.qualifiedOutsider===true)||(model.prediction?.shooters?.sotOutsiders||[]).some(q=>q.playerId===id&&q.qualifiedSotOutsider===true)||model.forecasts.some(l=>l.player?.canonicalPlayerId===id&&l.isOutsider===true);
  return {id,name:p.name||p.canonicalName||p.suppliedName||'Identità non risolta',team:p.team||lineup?.side.name||'',role:p.detailedRole||p.role||member?.role||null,number:lineupPlayer?.shirtNumber??null,lineupStatus:p.readingLineupStatus||playerLineupStatus(id,evidence.lineups),available:!!id&&p.dataStatus!=='role-baseline',outsider,source:p,member};
 });
}
