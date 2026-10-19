import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {individualPlayers} from '../../js/pages/reading-detail/evidence.mjs';
import {starterScenarioContext} from '../../js/pages/reading-detail/bench-contract.mjs';

// Read-only seam: run the existing individual-player branch in a private module.
// No exports, coefficients or files of the shared engine are changed.
const enginePath=fileURLToPath(new URL('../predictions/engine.js',import.meta.url));
const isolated={module:{exports:{}},require:createRequire(enginePath)};
vm.runInNewContext(fs.readFileSync(enginePath,'utf8')+'\nObject.assign(module.exports,{readingScalePlayerVolume:scalePlayerVolume,readingPlayerMatchup:playerMatchup,readingReconcilePlayerVolumes:reconcilePlayerVolumes});',isolated,{filename:enginePath});
const engine=isolated.module.exports;
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=Number.isFinite;

export function currentPlayerEvidence(matches,teamId,target){
 const prior=matches.filter(m=>m.competition==='serie-a'&&m.season==='2026-27'&&m.status==='finished'&&m.matchday<target.matchday&&m.date<target.date&&(m.homeTeam===teamId||m.awayTeam===teamId)).sort((a,b)=>a.date.localeCompare(b.date)||(a.kickoff||'').localeCompare(b.kickoff||'')||a.id.localeCompare(b.id));
 const aggregate={};
 for(const match of prior)for(const p of match.playerStats?.[match.homeTeam===teamId?'home':'away']||[]){
  if(!p.playerId||!finite(p.minutes)||p.minutes<=0)continue;
  const row=aggregate[p.playerId]||(aggregate[p.playerId]={appearances:0,minutes:0,shots:0,shotsCoverage:0,shotsSequence:[],shotsOnTarget:0,shotsOnTargetCoverage:0,shotsOnTargetSequence:[],starterAppearances:0,starterMinutes:0});
  row.appearances++;row.minutes+=p.minutes;
  for(const key of ['shots','shotsOnTarget'])if(finite(p[key])){row[key]+=p[key];row[key+'Coverage']++;row[key+'Sequence'].push(p[key]);}
  if(p.starter){row.starterAppearances++;row.starterMinutes+=p.minutes;}
 }
 for(const [id,row] of Object.entries(aggregate)){
  const recent=prior.slice(-5).map(m=>(m.playerStats?.[m.homeTeam===teamId?'home':'away']||[]).find(p=>p.playerId===id));
  row.recentTeamMatches=recent.length;row.recentAppearances=recent.filter(p=>p?.minutes>0).length;row.recentStarts=recent.filter(p=>p?.starter).length;
  row.recentAverageMinutes=recent.length?recent.reduce((n,p)=>n+(p?.minutes||0),0)/recent.length:null;
  const starts=recent.filter(p=>p?.starter&&finite(p.minutes)&&p.minutes>0);
  row.starterScenarioRecent={recentTeamMatches:starts.length,recentAppearances:starts.length,recentStarts:starts.length,recentAverageMinutes:starts.length?starts.reduce((n,p)=>n+p.minutes,0)/starts.length:null};
 }
 return aggregate;
}

export function reconcileStarterScenarioRows(rows,projection,profile){
 engine.readingReconcilePlayerVolumes(rows,'projectedShots',projection.shotsTotal.central,null,profile);
 engine.readingReconcilePlayerVolumes(rows,'projectedShotsOnTarget',projection.shotsOnTarget.central,'projectedShots',profile);
 return rows;
}

export function buildStarterScenarioFixture({model,evidence},{squads,styles,volumes,matchupProfiles,matches}){
 const snapshot=()=>JSON.stringify({model,evidence,squads:[...squads],styles:[...styles],volumes:[...volumes],matchupProfiles:[...matchupProfiles]});
 const original=snapshot();
 const players=individualPlayers(model,evidence),rows=[];
 const sideData=evidence.lineups.map(l=>{
  const squad=clone(squads.get(l.side.id)||{players:[]});
  // Explicit fixture roles belong to scratch inputs, never the roster on disk.
  for(const p of l.players){const member=squad.players.find(q=>q.id===p.id);if(member){member.role=p.source?.role||member.role;member.detailedRole=p.source?.detailedRole||member.detailedRole;}}
  return {lineup:l,squad,team:{id:l.side.id,name:l.side.name,probableLineup:{formation:l.formation,players:l.players.map(p=>squad.players.find(q=>q.id===p.id)?.name||p.name)}},current:currentPlayerEvidence(matches,l.side.id,model.fixture)};
 });
 for(let side=0;side<2;side++)for(const p of players.filter(p=>p.lineupStatus==='bench'&&p.team===evidence.lineups[side]?.side.name)){
  const row={playerId:p.id,team:p.team,name:p.name,kind:'if-starting',projectedShots:null,projectedShotsOnTarget:null,assumedStarterMinutes:null,reason:null};rows.push(row);
  const input=sideData[side],member=input.squad.players.find(q=>p.id&&q.id===p.id),history=member?.previousSeason?.totals,current=input.current[p.id];
  if(!member){row.reason='canonical-player-or-roster-data-unavailable';continue;}
  if(member.role==='Portiere'){row.reason='goalkeeper-shot-projection-not-modelled';continue;}
  if(!['Difensore','Centrocampista','Attaccante'].includes(member.role)){row.reason='player-role-unresolved';continue;}
  const historical=history?.minutes>=700&&finite(history.per90?.shots)&&finite(history.per90?.shotsOnTarget);
  const observedCurrent=current?.minutes>=270&&current.shotsCoverage>0&&current.shotsOnTargetCoverage>0;
  if(!historical&&!observedCurrent){row.reason='insufficient-observed-shot-sample';continue;}
  if(!(history?.starts>0)&&!(current?.starterAppearances>0)){row.reason='starter-minute-history-unavailable';continue;}
  const projection=model.prediction?.teamProjections?.find(t=>t.teamId===input.team.id);
  const originals=(model.prediction?.shooters?.allPlayers||[]).filter(q=>q.teamId===input.team.id&&q.role!=='Portiere');
  if(!finite(projection?.shotsTotal?.central)||!finite(projection?.shotsOnTarget?.central)||originals.length!==10||originals.some(q=>!finite(q.playerBaselineStability?.value)||!finite(q.playerSotBaselineStability?.value)||!finite(q.minutesFactor)||!finite(q.shotsMatchupFactor)||!finite(q.shotsOnTargetMatchupFactor))){row.reason='incomplete-original-fixture-context';continue;}
  const compatible=originals.filter(q=>q.role===member.role);
  const slot=compatible.find(q=>member.detailedRole&&q.detailedRole===member.detailedRole)||compatible[0];
  if(!slot){row.reason='compatible-starter-role-unavailable';continue;}
  const currentIfStarting={...(current||{}),...(current?.starterScenarioRecent||{recentTeamMatches:0,recentAppearances:0,recentStarts:0,recentAverageMinutes:null})};
  const candidate={name:member.name,teamId:input.team.id,role:member.role,detailedRole:member.detailedRole,player:clone(member)};
  const shot=engine.readingScalePlayerVolume([candidate],'shots',null)[0],sot=engine.readingScalePlayerVolume([candidate],'shotsOnTarget',null)[0];
  const includePersistence=Boolean(matchupProfiles.get(input.team.id)?.modelPolicy?.playerPersistenceDiagnostics);
  const shotStability=engine.playerBaselineStability({historicalBaseline:shot.value,historicalObserved:shot.observed,historicalMinutes:shot.minutes,current,key:'shots',includePersistence});
  const sotStability=engine.playerBaselineStability({historicalBaseline:sot.value,historicalObserved:sot.observed,historicalMinutes:sot.minutes,current,key:'shotsOnTarget',includePersistence});
  const minutes=engine.expectedMinutes(candidate,currentIfStarting),shotBase=shotStability.value,sotBase=Math.min(shotBase,sotStability.value);
  const matchup=engine.readingPlayerMatchup(candidate,styles.get(input.team.id),styles.get(sideData[1-side].team.id),volumes.get(sideData[1-side].team.id),side?'away':'home',shotBase,sotBase,matchupProfiles.get(sideData[1-side].team.id),projection);
  const q={name:member.name,playerId:p.id,teamId:input.team.id,role:member.role,detailedRole:member.detailedRole,baselineShots90:Number(shot.value.toFixed(2)),baselineShotsOnTarget90:Number(sot.value.toFixed(2)),stabilizedShots90:Number(shotBase.toFixed(2)),stabilizedShotsOnTarget90:Number(sotBase.toFixed(2)),...matchup,teamProfileRole:matchup.teamProfileRole,expectedMinutes:minutes.expectedMinutes,minutesFactor:minutes.minutesFactor,expectedMinutesEvidence:minutes.evidence,playerBaselineStability:shotStability,playerSotBaselineStability:sotStability,projectedShots:shotBase*matchup.shotsMatchupFactor*minutes.minutesFactor,projectedShotsOnTarget:sotBase*matchup.shotsOnTargetMatchupFactor*minutes.minutesFactor};
  const scratch=originals.map(original=>original===slot?q:{...clone(original),projectedShots:original.playerBaselineStability.value*original.shotsMatchupFactor*original.minutesFactor,projectedShotsOnTarget:Math.min(original.playerBaselineStability.value,original.playerSotBaselineStability.value)*original.shotsOnTargetMatchupFactor*original.minutesFactor});
  reconcileStarterScenarioRows(scratch,projection,matchupProfiles.get(input.team.id));
  if(!finite(q.projectedShots)||!finite(q.projectedShotsOnTarget)||!(q.expectedMinutes>0)){row.reason='individual-engine-output-unavailable';continue;}
  Object.assign(row,{projectedShots:q.projectedShots,projectedShotsOnTarget:q.projectedShotsOnTarget,assumedStarterMinutes:q.expectedMinutes,role:q.role,detailedRole:q.detailedRole,replacedSlotPlayerId:slot.playerId,
   evidence:{historicalMinutes:history?.minutes??null,currentMinutes:current?.minutes??null,baselineShots90:q.baselineShots90,baselineSot90:q.baselineShotsOnTarget90,stabilizedShots90:q.stabilizedShots90,stabilizedSot90:q.stabilizedShotsOnTarget90,shotsMatchupFactor:q.shotsMatchupFactor,sotMatchupFactor:q.shotsOnTargetMatchupFactor,teamScaling:q.teamScaling,minutes:q.expectedMinutesEvidence,matchup:q.matchupEvidence,allocationClass:q.allocationClass}});
 }
 if(snapshot()!==original)throw new Error('Starter scenario changed original inputs');
 return {fixtureId:model.fixture.id,competition:'serie-a',context:starterScenarioContext(model,evidence),players:rows,engineVersion:engine.ENGINE_VERSION};
}
