'use strict';
// Individual opportunity allocation only. No provider contract, odds, DUO or EV.
const {currentReport}=require('../spatial-backtest/model.cjs');
const {selectHistoryPolicy}=require('../../shot-events/technical-context.cjs');
const {zones}=require('../../shot-events/matchup.cjs');
const sum=a=>a.reduce((n,x)=>n+x,0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const POLICY=Object.freeze({version:'player-spatial-opportunity-v1',historyVariant:'coach-cycle',halfLifeMatches:3,
 minimumTeamMatches:5,minimumPlayerMatches:3,minimumPlayerShots:10,minimumPlayerCoverage:.8,
 playerPriorShots:10,defencePriorShots:20,maximumLogSignal:Math.log(1.25),maximumIndividualChange:.10,
 coefficientMinimum:-1,coefficientMaximum:1,coefficientSteps:80,ridge:.05,developmentMatchdays:[6,7],testMatchdays:[8,9]});
function playerRows(prediction){
 if(prediction.shooters?.allPlayers)return prediction.shooters.allPlayers.map(p=>({playerId:p.playerId,teamId:p.teamId,name:p.name,
  role:p.teamProfileRole||p.role||null,expectedMinutes:p.expectedMinutes,shots:p.projectedShots,sot:p.projectedShotsOnTarget}));
 return (prediction.players||[]).filter(p=>p.expectedStarter===true).map(p=>({playerId:p.playerId,teamId:p.team,name:p.player,
  role:p.teamProfileRole||p.role||null,expectedMinutes:p.expectedMinutes,shots:p.predictedShots,sot:p.predictedSOT}));
}
function featureVector(fixture,fixtures,shots,technical,players,asOfDate,policy=POLICY){
 const keys=players.filter(p=>p.playerId).map(p=>p.teamId+':'+p.playerId);
 if(new Set(keys).size!==keys.length)throw Error('DUPLICATE_CANONICAL_PLAYER_ID');
 const firstDate=fixtures.filter(f=>f.matchday===fixture.matchday).map(f=>f.date).filter(Boolean).sort()[0];
 const cutoff=[firstDate,asOfDate].filter(Boolean).sort()[0];
 if(!cutoff)throw Error('MISSING_CUTOFF');
 const history=fixtures.filter(f=>f.competition==='serie-a'&&f.season==='2026-27'&&f.status==='finished'&&f.matchday<fixture.matchday&&f.date<cutoff&&f.id!==fixture.id);
 const byId=new Map(shots.matches.map(m=>[m.fixtureId,m]));
 const reports=history.filter(f=>currentReport(byId.get(f.id),f)).map(f=>byId.get(f.id));
 const leagueEvents=reports.flatMap(r=>r.events).filter(e=>e.usable&&!e.ownGoal&&!e.penalty),leagueCount=leagueEvents.length;
 const league=zones.map(([key])=>({key,share:leagueCount?leagueEvents.filter(e=>e.zone===key).length/leagueCount:0}));
 const teams=[fixture.homeTeam,fixture.awayTeam].map(teamId=>{
  const own=reports.filter(r=>r.homeTeam===teamId||r.awayTeam===teamId);
  const selected=selectHistoryPolicy(teamId,own,cutoff,technical,'coach-cycle',{matchdayExclusive:fixture.matchday});
  const chronological=selected.selected.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const weights=new Map(chronological.map((m,i)=>[m.fixtureId,2**(-i/policy.halfLifeMatches)]));
  const events=chronological.flatMap(m=>m.events.filter(e=>e.usable&&!e.ownGoal&&!e.penalty).map(e=>({...e,weight:weights.get(m.fixtureId)})));
  return {teamId,available:selected.available&&chronological.length>=policy.minimumTeamMatches&&selected.context.status!=='transition',
   reason:!selected.available?'UNKNOWN_TECHNICAL_CYCLE':selected.context.status==='transition'?'TECHNICAL_TRANSITION':chronological.length<policy.minimumTeamMatches?'INSUFFICIENT_TEAM_HISTORY':null,
   context:selected.context,fixtureIds:chronological.map(m=>m.fixtureId),weights:[...weights].map(([fixtureId,weight])=>({fixtureId,weight})),events};
 });
 const rows=players.map(p=>{
  const own=teams.find(t=>t.teamId===p.teamId),opponent=teams.find(t=>t.teamId!==p.teamId);
  const base={...p,status:'ABSTAIN',reason:null,signal:null};
  if(!p.playerId||!own||!opponent)return {...base,reason:'UNRESOLVED_CANONICAL_ID'};
  if(![p.shots,p.sot,p.expectedMinutes].every(Number.isFinite)||p.shots<0||p.sot<0||p.sot>p.shots||p.expectedMinutes<=0)return {...base,reason:'INVALID_BASELINE_OR_MINUTES'};
  if(!own.available||!opponent.available)return {...base,reason:own.reason||opponent.reason};
  const playerEvents=own.events.filter(e=>e.teamId===p.teamId&&e.playerId===p.playerId);
  const observed=history.filter(m=>own.fixtureIds.includes(m.id)).flatMap(m=>{
   const side=m.homeTeam===p.teamId?'home':'away';return (m.playerStats?.[side]||[]).filter(q=>q.playerId===p.playerId&&Number.isFinite(q.shots)&&q.minutes>0);
  });
  // Full player totals include penalties; remove known penalty attempts for paired coverage.
  const knownPenalties=own.fixtureIds.flatMap(id=>byId.get(id).events).filter(e=>e.teamId===p.teamId&&e.playerId===p.playerId&&e.penalty&&!e.ownGoal).length;
  const expectedShots=sum(observed.map(p=>p.shots))-knownPenalties;
  const coverage=expectedShots>0?playerEvents.length/expectedShots:null;
  const evidence={matches:observed.length,mappedShots:playerEvents.length,expectedNonPenaltyShots:expectedShots,coverage};
  if(observed.length<policy.minimumPlayerMatches||playerEvents.length<policy.minimumPlayerShots||coverage===null||coverage<policy.minimumPlayerCoverage||coverage>1.000001)return {...base,reason:'INSUFFICIENT_PLAYER_COORDINATES',evidence};
  const ownShots=own.events.filter(e=>e.teamId===p.teamId),defence=opponent.events.filter(e=>e.teamId!==opponent.teamId);
  const nOwn=sum(ownShots.map(e=>e.weight)),nPlayer=sum(playerEvents.map(e=>e.weight)),nDefence=sum(defence.map(e=>e.weight));
  if(!(nOwn>0&&nPlayer>0&&nDefence>0))return {...base,reason:'EMPTY_SPATIAL_SAMPLE',evidence};
  const profile=league.filter(z=>z.share>0).map(z=>{
   const ownShare=sum(ownShots.filter(e=>e.zone===z.key).map(e=>e.weight))/nOwn;
   const playerShare=(sum(playerEvents.filter(e=>e.zone===z.key).map(e=>e.weight))+policy.playerPriorShots*ownShare)/(nPlayer+policy.playerPriorShots);
   const defensiveShare=(sum(defence.filter(e=>e.zone===z.key).map(e=>e.weight))+policy.defencePriorShots*z.share)/(nDefence+policy.defencePriorShots);
   return {zone:z.key,playerShare,ownShare,defensiveShare,leagueShare:z.share,relativeAllowance:defensiveShare/z.share};
  });
  const playerExposure=sum(profile.map(z=>z.playerShare*z.relativeAllowance)),teamExposure=sum(profile.map(z=>z.ownShare*z.relativeAllowance));
  if(!(playerExposure>0&&teamExposure>0))return {...base,reason:'NO_POSITIVE_EXPOSURE',evidence};
  return {...base,status:'AVAILABLE',reason:null,signal:clamp(Math.log(playerExposure/teamExposure),-policy.maximumLogSignal,policy.maximumLogSignal),evidence,profile,
   opponentTeamId:opponent.teamId,ownFixtureIds:own.fixtureIds,opponentFixtureIds:opponent.fixtureIds};
 });
 return {version:policy.version,fixtureId:fixture.id,cutoffExclusive:cutoff,matchdayExclusive:fixture.matchday,targetMatchIdExcluded:fixture.id,
  leagueFixtureIds:reports.map(m=>m.fixtureId),teams:teams.map(({events,...t})=>t),rows,
  semantics:'Individual non-penalty shot-location preference versus opponent concession shape, relative to own-team shape; not a new team-volume boost',
  onTargetEventLocations:null,shotQualityXg:null};
}
function boundedAllocate(weights,lower,upper,target){
 if(target<sum(lower)-1e-9||target>sum(upper)+1e-9)throw Error('INFEASIBLE_ALLOCATION');
 if(target===0)return weights.map(()=>0);
 const total=k=>sum(weights.map((w,i)=>clamp(w*k,lower[i],upper[i])));
 let lo=0,hi=1;while(total(hi)<target-1e-12&&hi<1e12)hi*=2;
 for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(total(mid)<target)lo=mid;else hi=mid;}
 return weights.map((w,i)=>clamp(w*(lo+hi)/2,lower[i],upper[i]));
}
function apply(vector,beta,policy=POLICY){
 if(!Number.isFinite(beta)||beta<policy.coefficientMinimum||beta>policy.coefficientMaximum)throw Error('INVALID_COEFFICIENT');
 const rows=vector.rows.map(p=>({...p,baseShots:p.shots,baseSot:p.sot,adjustedShots:p.shots,adjustedSot:p.sot,applied:false,
  contract:'STATISTICAL_SINGLE_PLAYER_PROJECTION',duoProbability:null,fairOdds:null,ev:null}));
 const conservation=[];
 for(const team of vector.teams){
  const roster=rows.filter(p=>p.teamId===team.teamId),active=roster.filter(p=>p.status==='AVAILABLE'&&p.shots>0);
  const complete=roster.every(p=>Number.isFinite(p.shots)&&p.shots>=0&&Number.isFinite(p.sot)&&p.sot>=0&&p.sot<=p.shots);
  if(complete&&active.length>=2&&beta!==0){
   const low=active.map(p=>Math.max(p.shots*(1-policy.maximumIndividualChange),p.sot)),high=active.map(p=>p.shots*(1+policy.maximumIndividualChange));
   const shots=boundedAllocate(active.map(p=>p.shots*Math.exp(beta*p.signal)),low,high,sum(active.map(p=>p.shots)));
   const sot=boundedAllocate(active.map((p,i)=>p.sot*(shots[i]/p.shots)),active.map(p=>p.sot*(1-policy.maximumIndividualChange)),
    active.map((p,i)=>Math.min(shots[i],p.sot*(1+policy.maximumIndividualChange))),sum(active.map(p=>p.sot)));
   active.forEach((p,i)=>{p.adjustedShots=shots[i];p.adjustedSot=sot[i];p.applied=true;});
  }
  conservation.push({teamId:team.teamId,activePlayers:active.length,complete,baselineShots:complete?sum(roster.map(p=>p.baseShots)):null,adjustedShots:complete?sum(roster.map(p=>p.adjustedShots)):null,
   baselineSot:complete?sum(roster.map(p=>p.baseSot)):null,adjustedSot:complete?sum(roster.map(p=>p.adjustedSot)):null});
 }
 return {version:policy.version,beta,fixtureId:vector.fixtureId,rows,conservation,state:'SHADOW_RESEARCH_ONLY',production:false};
}
function poissonLoss(lambda,y){
 if(!Number.isFinite(lambda)||lambda<0||!Number.isInteger(y)||y<0)throw Error('INVALID_COUNT');
 if(lambda===0)return y===0?0:-Math.log(1e-15);
 let logF=0;for(let k=2;k<=y;k++)logF+=Math.log(k);return Math.min(-Math.log(1e-15),lambda-y*Math.log(lambda)+logF);
}
function outcomeRows(fixture,players){
 return players.map(p=>{
  const side=fixture.homeTeam===p.teamId?'home':fixture.awayTeam===p.teamId?'away':null;if(!side||!p.playerId)return {...p,actual:null,actualReason:'UNRESOLVED_ID'};
  const observed=(fixture.playerStats?.[side]||[]).filter(q=>q.playerId===p.playerId);
  if(observed.length===1&&Number.isInteger(observed[0].shots)&&observed[0].shots>=0&&Number.isInteger(observed[0].shotsOnTarget)&&observed[0].shotsOnTarget>=0&&observed[0].shotsOnTarget<=observed[0].shots)
   return {...p,actual:{shots:observed[0].shots,sot:observed[0].shotsOnTarget,starter:observed[0].starter===true,participation:'PLAYED'}};
  if((fixture.didNotPlay?.[side]||[]).some(q=>q.playerId===p.playerId))return {...p,actual:{shots:0,sot:0,starter:false,participation:'EXPLICIT_DNP'}};
  return {...p,actual:null,actualReason:'UNVERIFIED_PARTICIPATION'};
 });
}
function metrics(prediction,actuals){
 const observed=prediction.rows.flatMap(p=>{const a=actuals.find(a=>a.playerId===p.playerId&&a.teamId===p.teamId)?.actual;return a&&Number.isFinite(p.adjustedShots)&&Number.isFinite(p.adjustedSot)?[{...p,actual:a}]:[]});
 const average=values=>values.length?sum(values)/values.length:null;
 return {players:observed.length,adjustedPlayers:observed.filter(p=>p.applied).length,
  shotsLogLoss:average(observed.map(p=>poissonLoss(p.adjustedShots,p.actual.shots))),sotLogLoss:average(observed.map(p=>poissonLoss(p.adjustedSot,p.actual.sot))),
  shotsMae:average(observed.map(p=>Math.abs(p.adjustedShots-p.actual.shots))),sotMae:average(observed.map(p=>Math.abs(p.adjustedSot-p.actual.sot)))};
}
function fit(training,policy=POLICY){
 if(training.length<5)return null;
 let best=null;
 for(let i=0;i<=policy.coefficientSteps;i++){
  const beta=policy.coefficientMinimum+(policy.coefficientMaximum-policy.coefficientMinimum)*i/policy.coefficientSteps;
  const objective=sum(training.map(r=>metrics(apply(r.vector,beta,policy),r.actuals).shotsLogLoss))/training.length+policy.ridge*beta*beta;
  if(!best||objective<best.objective-1e-12||Math.abs(objective-best.objective)<1e-12&&Math.abs(beta)<Math.abs(best.beta))best={beta,objective};
 }
 return {...best,trainingFixtureIds:training.map(r=>r.fixtureId),trainingMatchdays:[...new Set(training.map(r=>r.matchday))],policyVersion:policy.version};
}
module.exports={POLICY,playerRows,featureVector,boundedAllocate,apply,poissonLoss,outcomeRows,metrics,fit};
