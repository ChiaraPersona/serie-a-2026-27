'use strict';
const assert=require('assert/strict');
const {projectDocumentedTeam,TEAM_ONLY,canonicalTeam}=require('./current-season-offline');
function derivePredictedBench(probable,callups,squad){
 const missing={mode:'probable',documented:false,bench:null,excluded:[],doubtful:[],reason:'MATCH_CALLUPS_UNDOCUMENTED'};
 if(!callups||callups.status!=='documented'){
  if(!squad)return missing;
  assert.equal(squad.teamId,probable.teamId);
  const excludedIds=new Set([...probable.starters,...probable.unavailable,...probable.suspended,...probable.doubtful].map(p=>p.playerId).filter(Boolean));
  const bench=squad.players.filter(p=>p.playerId&&!excludedIds.has(p.playerId)).map(p=>({...p,registeredPlayerId:p.registeredPlayerId||p.playerId,sourceName:p.sourceName||p.canonicalName,projectedRole:'bench',lineupStatus:'probable',roleCertainty:'probable',callupStatus:'unconfirmed'}));
  return {...missing,bench,rosterFallback:true,reason:'FULL_SQUAD_PENDING_MATCH_CALLUPS'};
 }
 assert.equal(callups.fixtureId,probable.fixtureId);assert.equal(callups.teamId,probable.teamId);
 assert.equal(callups.source?.scope,'match-specific-callups');assert.equal(callups.source.complete,true);assert(callups.source.url);
 assert(Array.isArray(callups.players));
 const same=(a,b)=>(a.playerId&&b.playerId&&a.playerId===b.playerId)||(a.probableSourceName&&a.probableSourceName===b.sourceName)||a.sourceName===b.sourceName;
 const seen=new Set(),bench=[],excluded=[],doubtful=[];
 for(const p of callups.players){
  const key=p.playerId||p.sourceName;assert(!seen.has(key),'duplicate call-up');seen.add(key);
  if(p.eligibilityStatus==='not-reconciled-with-md3-eligible-squad'){excluded.push({...p,exclusionReason:'MD3_ELIGIBILITY_UNCONFIRMED'});continue;}
  if(probable.unavailable.some(x=>same(p,x))||probable.suspended.some(x=>same(p,x))){excluded.push(p);continue;}
  if(probable.doubtful.some(x=>same(p,x))){doubtful.push(p);continue;}
  if(probable.starters.some(x=>same(p,x)))continue;
  bench.push({...p,projectedRole:'bench',lineupStatus:'probable',roleCertainty:'probable'});
 }
 const missingStarters=probable.starters.filter(p=>!callups.players.some(x=>same(x,p)));
 return {mode:'probable',documented:missingStarters.length===0,bench,excluded,doubtful,source:callups.source,missingStarters:missingStarters.map(p=>p.playerId||p.sourceName),reason:missingStarters.length?'PROBABLE_STARTER_NOT_CALLED_UP':null};
}
function projectMd3Team({mode,documentation,...args}){
 if(TEAM_ONLY.has(canonicalTeam(args.teamId)))return {status:'blocked-collective-only',players:[]};
 const accepted=mode==='official'?documentation?.officialXI===true&&documentation?.officialBench===true:mode==='probable'?documentation?.probableXI===true:false;
 if(!accepted)return {status:mode==='probable'?'blocked-match-callups-undocumented':'blocked-official-documentation',players:[]};
 if(!Number.isFinite(args.targetShots)||!Number.isFinite(args.targetSOT))return {status:'blocked-team-volumes',players:[]};
 // The underlying flag means documented coverage here, not an assertion of official bench status.
 return {...projectDocumentedTeam({...args,lineupVerified:true,benchVerified:true}),lineupMode:mode};
}
function allocateMinuteBudget(players){
 // Existing Champions substitute-minutes.js team budget policy, unchanged constants and rounding.
 const round=v=>Number(v.toFixed(1)),universe=players.filter(p=>Number.isFinite(p.expectedMinutes));
 const rawTotal=universe.reduce((n,p)=>n+p.expectedMinutes,0),budgetFactor=rawTotal>990?990/rawTotal:1;
 for(const p of universe)p.expectedMinutes=round(p.expectedMinutes*budgetFactor);
 let allocated=round(universe.reduce((n,p)=>n+p.expectedMinutes,0));
 if(allocated>990&&universe.length){const largest=universe.reduce((best,p)=>p.expectedMinutes>best.expectedMinutes?p:best,universe[0]);largest.expectedMinutes=round(largest.expectedMinutes-(allocated-990));allocated=round(universe.reduce((n,p)=>n+p.expectedMinutes,0));}
 return {rawExpectedMinutes:round(rawTotal),budgetFactor,allocatedExpectedMinutes:allocated,unallocatedOrUnknownMinutes:round(990-allocated),exceededBudget:allocated>990.1};
}
// Exact Poisson threshold expression already used by build-champions-player-markets.js.
const poissonAtLeast=(lambda,threshold)=>{let term=Math.exp(-lambda),cumulative=term;for(let k=1;k<threshold;k+=1){term*=lambda/k;cumulative+=term;}return Math.max(0,Math.min(1,1-cumulative));};
function starterThresholds(shots,sot){
 if(!Number.isFinite(shots)||!Number.isFinite(sot))return null;
 return {shotsOver05:poissonAtLeast(shots,1),shotsOver15:poissonAtLeast(shots,2),shotsOver25:poissonAtLeast(shots,3),sotOver05:poissonAtLeast(sot,1),sotOver15:poissonAtLeast(sot,2),status:'PRELIMINARY_CONDITIONAL_ON_STARTING_EXISTING_POISSON'};
}
module.exports={derivePredictedBench,projectMd3Team,allocateMinuteBudget,starterThresholds,poissonAtLeast};
