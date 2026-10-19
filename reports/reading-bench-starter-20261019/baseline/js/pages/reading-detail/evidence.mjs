import {shirtNumberAt} from './shirt-numbers.mjs';
import {connectBenchForecasts} from './bench-contract.mjs?v=20261018-bench-forecasts-v1';
// Read existing public artifacts only; no builder, importer, or model dependency.
export async function readArtifact(path){
 const response=await fetch(new URL('../../../'+path,import.meta.url));
 if(!response.ok)throw new Error(`Dati non disponibili: ${path}`);
 return response.json();
}
export async function loadEvidence(model,{benchForecasts=true}={}){
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
  const listedBench=raw?.bench||raw?.substitutes||canonical?.substitutes||[];
  const bench=listedBench.length?listedBench:raw?.status==='probable'?(probable?.teams?.find(t=>t.teamId===side.id)?.players||[]).filter(p=>p.lineupStatus==='reserve'):listedBench;
  // Presentation join only: exact identifiers or explicit source-name associations.
  const benchPlayers=bench.map((p,index)=>{
   const rawName=typeof p==='string'?p:p.canonicalName||p.currentName||p.suppliedName||p.name;
   const associated=[...(canonical?.substitutes||[]),...(probable?.teams?.find(t=>t.teamId===side.id)?.players||[])].filter(q=>[q.currentName,q.sourceName,q.name,q.suppliedName].includes(rawName));
   const linked=associated.length===1?associated[0]:null;
   const id=typeof p==='object'?(p.canonicalPlayerId||p.playerId||p.id||linked?.playerId||null):linked?.playerId||null;
   const exactMember=id?roster.find(q=>q.id===id):roster.filter(q=>[q.name,q.canonicalName,q.currentName].includes(rawName)).length===1?roster.find(q=>[q.name,q.canonicalName,q.currentName].includes(rawName)):null;
   const canonicalId=id||exactMember?.id||null;
   const shirtNumber=numbering?shirtNumberAt(numbering,side.id,canonicalId,model.fixture.date):(typeof p==='object'?p.shirtNumber:null)??exactMember?.shirtNumber??null;
   return {id:canonicalId,name:linked?.currentName||rawName,index,shirtNumber,source:p,member:exactMember};
  });
  const benchPlayerIds=[...bench,...(canonical?.substitutes||[])].map(p=>typeof p==='object'?(p.canonicalPlayerId||p.playerId||null):null).filter(Boolean);
  if(raw?.status==='probable')benchPlayerIds.push(...(probable?.teams?.find(t=>t.teamId===side.id)?.players||[]).filter(p=>p.lineupStatus==='reserve').map(p=>p.playerId).filter(Boolean));
  return {side,formation:raw?.formation??null,status:raw?.status??null,coach:raw?.coach||canonical?.coach||squadFiles[i]?.coach||registered?.coach||null,players,bench,benchPlayers,benchPlayerIds,source:raw?.source??null,updatedAt:raw?.updatedAt??null};
 });
 const benchData=benchForecasts?await readArtifact('data/normalized/reading-bench-forecasts.json').catch(()=>null):null;
 return {analysis,directory,squadFiles,lineups,benchForecasts:benchData};
}
export function playerLineupStatus(id,lineups){
 if(!id)return 'unknown';
 const relevant=lineups.filter(l=>['official','probable'].includes(l.status));
 const starter=relevant.some(l=>l.players.some(p=>p.id===id)),bench=relevant.some(l=>(l.benchPlayerIds||[]).includes(id));
 return starter===bench?'unknown':starter?'starter':'bench';
}
export function individualPlayers(model,evidence){
 const projections=model.prediction?.shooters?.allPlayers||[],rows=[];
 const sideMatches=(row,side)=>row.team===side.name||!!side.id&&(row.team===side.id||row.source.teamId===side.id);
 const aliases=p=>[p.name,p.lineupName,p.canonicalName,p.currentName,p.suppliedName,p.sourceName].filter(v=>typeof v==='string'&&v.length);
 const isOutsider=id=>!!id&&((model.prediction?.shooters?.outsiders||[]).some(q=>q.playerId===id&&q.qualifiedOutsider===true)||(model.prediction?.shooters?.sotOutsiders||[]).some(q=>q.playerId===id&&q.qualifiedSotOutsider===true)||(model.forecasts||[]).some(l=>l.player?.canonicalPlayerId===id&&l.isOutsider===true));
 // Preserve every existing projection object and its order, including non-lineup rows.
 for(const p of projections){
  const id=p.playerId||p.canonicalPlayerId||null;
  const side=[model.home,model.away].find(t=>t.id===p.teamId);
  const existing=id?rows.find(r=>r.id===id&&(!p.teamId||r.source.teamId===p.teamId)):null;
  if(existing)continue;
  rows.push({id,name:p.name||p.canonicalName||p.suppliedName||'Identità non risolta',team:p.team||side?.name||'',role:p.detailedRole||p.role||null,number:null,lineupStatus:p.readingLineupStatus||playerLineupStatus(id,evidence.lineups),available:!!id&&p.dataStatus!=='role-baseline',outsider:isOutsider(id),source:p,member:null});
 }
 const assignedStarters=new Set();
 for(const l of evidence.lineups){
  const bench=l.benchPlayers||(l.bench||[]).map(p=>({id:typeof p==='object'?(p.canonicalPlayerId||p.playerId||p.id||null):null,name:typeof p==='string'?p:p.canonicalName||p.currentName||p.suppliedName||p.name,shirtNumber:typeof p==='object'?p.shirtNumber:null,source:p}));
  for(const [group,status] of [[l.players,'starter'],[bench,'bench']])for(const p of group){
   const source=p.source&&typeof p.source==='object'?p.source:{};
   const candidates=rows.filter(r=>sideMatches(r,l.side)&&((p.id&&r.id===p.id)||((!p.id||!r.id)&&aliases(source).concat(p.name).some(n=>aliases(r.source).concat(r.name).includes(n)))));
   let row=candidates.length===1?candidates[0]:null;
   if(!row){row={id:p.id||null,name:p.name||'Identità non risolta',team:l.side.name,role:source.detailedRole||source.role||p.member?.role||null,number:null,lineupStatus:'unknown',available:!!p.id&&source.dataStatus!=='role-baseline'&&['projectedShots','projectedShotsOnTarget','expectedMinutes'].some(k=>typeof source[k]==='number'),outsider:isOutsider(p.id),source,member:null};rows.push(row);}
   // An official/probable sheet labels the view; it never modifies a selection or forecast.
   row.id=row.id||p.id||null;row.team=l.side.name;
   row.number=p.shirtNumber??row.number;row.member=p.member||row.member;
   row.role=row.role||p.member?.role||null;
   if(status==='starter')assignedStarters.add(row);
   if(status==='starter'||!assignedStarters.has(row))row.lineupStatus=['official','probable'].includes(l.status)?status:'unknown';
  }
 }
 return connectBenchForecasts(model,evidence,rows);
}
