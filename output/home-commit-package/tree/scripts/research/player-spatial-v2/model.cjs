'use strict';
const {currentReport}=require('../spatial-backtest/model.cjs');
const {technicalContext,observationsFor}=require('../../shot-events/technical-context.cjs');
const {zones}=require('../../shot-events/matchup.cjs');
const {playerRows:baseRows,boundedAllocate,outcomeRows,metrics}=require('../player-spatial/model.cjs');
// Declared before evaluating v2. These constants are not selected on the historical test.
const POLICY=Object.freeze({version:'player-spatial-context-v2',halfLifeMatches:3,minimumTeamMatches:3,minimumEffectiveTeamMatches:2,
 minimumPlayerMatches:2,minimumPlayerShots:5,minimumPlayerCoverage:.8,playerPriorShots:20,defencePriorShots:30,
 oldCoachWeight:.35,minimumContextWeight:.25,roleMismatchWeight:.5,sideMismatchWeight:.75,unknownRoleWeight:.75,
 maximumSignal:Math.log(1.25),maximumIndividualChange:.10,maximumVolumeChange:.05,ridge:.05,
 minimumTrainingFixtures:5,minimumTrainingMatchdays:2,coefficientSteps:80,firstEvaluationMatchday:6});
const sum=a=>a.reduce((n,x)=>n+x,0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),effective=a=>sum(a)**2/sum(a.map(x=>x*x));
function playerRows(prediction){const rows=baseRows(prediction);return rows.map(p=>{const original=prediction.shooters?.allPlayers?.find(q=>q.playerId===p.playerId&&q.teamId===p.teamId);return {...p,side:original?.side||null};});}
function position(role){return ({GK:'goalkeeper',CB:'defender',FB:'defender',WB:'defender',DM:'midfielder',CM:'midfielder',AM:'midfielder',W:'forward',LW:'forward',RW:'forward',ST:'forward',CF:'forward',Difensore:'defender',Centrocampista:'midfielder',Attaccante:'forward'})[role]||null;}
function contextWeight(observation,targetIds,context,policy=POLICY){
 if(!observation?.lineupComplete||!context.coachId||!observation.headCoachId)return null;
 const overlap=targetIds.filter(id=>observation.starterIds.includes(id)).length/11;
 const sameCycle=observation.headCoachId===context.coachId&&observation.date>=context.cycleStart;
 return {weight:Math.max(policy.minimumContextWeight,overlap)*(sameCycle?1:policy.oldCoachWeight),overlap,sameCycle};
}
function featureVector(fixture,fixtures,shots,technical,players,asOfDate,policy=POLICY){
 const ids=players.filter(p=>p.playerId).map(p=>p.teamId+':'+p.playerId);if(new Set(ids).size!==ids.length)throw Error('DUPLICATE_CANONICAL_PLAYER_ID');
 const first=fixtures.filter(f=>f.competition==='serie-a'&&f.season==='2026-27'&&f.matchday===fixture.matchday).map(f=>f.date).sort()[0];
 const cutoff=[first,asOfDate].filter(Boolean).sort()[0];if(!cutoff)throw Error('MISSING_CUTOFF');
 const history=fixtures.filter(f=>f.competition==='serie-a'&&f.season==='2026-27'&&f.status==='finished'&&f.matchday<fixture.matchday&&f.date<cutoff&&f.id!==fixture.id);
 const index=new Map(shots.matches.map(m=>[m.fixtureId,m])),reports=history.filter(f=>currentReport(index.get(f.id),f)).map(f=>index.get(f.id));
 const valid=e=>e.usable&&!e.ownGoal&&!e.penalty&&zones.some(([z])=>z===e.zone);
 const leagueEvents=reports.flatMap(r=>r.events).filter(valid),league=zones.map(([zone])=>({zone,share:leagueEvents.filter(e=>e.zone===zone).length/leagueEvents.length})).filter(z=>z.share>0);
 const teams=[fixture.homeTeam,fixture.awayTeam].map(teamId=>{
  const context=technicalContext(teamId,cutoff,technical,{matchdayExclusive:fixture.matchday}),targetIds=players.filter(p=>p.teamId===teamId).map(p=>p.playerId).filter(Boolean);
  const observations=observationsFor(teamId,cutoff,technical,fixture.matchday);
  const own=reports.filter(r=>[r.homeTeam,r.awayTeam].includes(teamId)).sort((a,b)=>b.date.localeCompare(a.date)||a.fixtureId.localeCompare(b.fixtureId));
  const weights=own.flatMap((r,i)=>{const observed=observations.find(o=>o.fixtureId===r.fixtureId),c=contextWeight(observed,targetIds,context,policy);return c?[{fixtureId:r.fixtureId,...c,weight:c.weight*2**(-i/policy.halfLifeMatches)}]:[];});
  const events=weights.flatMap(w=>index.get(w.fixtureId).events.filter(valid).map(e=>({...e,weight:w.weight})));
  const neff=weights.length?effective(weights.map(w=>w.weight)):0;
  const available=!context.stale&&!!context.coachId&&targetIds.length===10&&weights.length>=policy.minimumTeamMatches&&neff>=policy.minimumEffectiveTeamMatches;
  // Expected shooter roster is ten outfield starters; never fill identities from a future XI.
  return {teamId,available,reason:available?null:targetIds.length!==10?'INCOMPLETE_EXPECTED_OUTFIELD_XI':'INSUFFICIENT_CONTEXT_HISTORY',context,weights,effectiveMatches:neff,events};
 });
 const rows=players.map(p=>{
  const own=teams.find(t=>t.teamId===p.teamId),opponent=teams.find(t=>t.teamId!==p.teamId),base={...p,status:'ABSTAIN',reason:null,signal:null};
  if(!p.playerId||!own||!opponent)return {...base,reason:'UNRESOLVED_CANONICAL_ID'};
  if(![p.shots,p.sot,p.expectedMinutes].every(Number.isFinite)||p.shots<0||p.sot<0||p.sot>p.shots||p.expectedMinutes<=0)return {...base,reason:'INVALID_BASELINE_OR_MINUTES'};
  if(!own.available||!opponent.available)return {...base,reason:own.reason||opponent.reason};
  const historicalIds=new Set(own.weights.map(w=>w.fixtureId));
  const observed=history.filter(f=>historicalIds.has(f.id)).flatMap(f=>(f.playerStats?.[f.homeTeam===p.teamId?'home':'away']||[]).filter(q=>q.playerId===p.playerId&&q.minutes>0&&Number.isFinite(q.shots)));
  const allMapped=own.events.filter(e=>e.teamId===p.teamId&&e.playerId===p.playerId);
  const penalties=[...historicalIds].flatMap(id=>index.get(id).events).filter(e=>e.teamId===p.teamId&&e.playerId===p.playerId&&e.penalty&&!e.ownGoal).length;
  const expected=sum(observed.map(q=>q.shots))-penalties,coverage=expected>0?allMapped.length/expected:null;
  const evidence={matches:observed.length,mappedShots:allMapped.length,expectedNonPenaltyShots:expected,coverage,targetRole:position(p.role),targetSide:p.side,roleScope:'STARTING_FORMATION_ONLY'};
  if(observed.length<policy.minimumPlayerMatches||allMapped.length<policy.minimumPlayerShots||coverage===null||coverage<policy.minimumPlayerCoverage||coverage>1.000001)return {...base,reason:'INSUFFICIENT_PLAYER_COORDINATES',evidence};
  const playerEvents=allMapped.map(e=>{const targetRole=position(p.role),known=targetRole&&e.startingPosition;
   const rw=known?(targetRole===e.startingPosition?1:policy.roleMismatchWeight):policy.unknownRoleWeight;
   const targetSide=p.side==='central'?'center':p.side,sw=targetSide&&e.startingAlignment?(targetSide===e.startingAlignment?1:policy.sideMismatchWeight):1;
   return {...e,weight:e.weight*rw*sw};});
  const ownEvents=own.events.filter(e=>e.teamId===p.teamId),defence=opponent.events.filter(e=>e.teamId!==opponent.teamId);
  const nOwn=sum(ownEvents.map(e=>e.weight)),nPlayer=sum(playerEvents.map(e=>e.weight)),nDefence=sum(defence.map(e=>e.weight));
  if(!(nOwn>0&&nPlayer>0&&nDefence>0))return {...base,reason:'EMPTY_SPATIAL_SAMPLE',evidence};
  const profile=league.map(z=>{const ownShare=sum(ownEvents.filter(e=>e.zone===z.zone).map(e=>e.weight))/nOwn;
   const playerShare=(sum(playerEvents.filter(e=>e.zone===z.zone).map(e=>e.weight))+policy.playerPriorShots*ownShare)/(nPlayer+policy.playerPriorShots);
   const defensiveShare=(sum(defence.filter(e=>e.zone===z.zone).map(e=>e.weight))+policy.defencePriorShots*z.share)/(nDefence+policy.defencePriorShots);
   return {...z,ownShare,playerShare,defensiveShare,relativeAllowance:defensiveShare/z.share};});
  const exposure=sum(profile.map(z=>z.playerShare*z.relativeAllowance)),teamExposure=sum(profile.map(z=>z.ownShare*z.relativeAllowance));
  return {...base,status:'AVAILABLE',reason:null,signal:clamp(Math.log(exposure/teamExposure),-policy.maximumSignal,policy.maximumSignal),
   evidence:{...evidence,effectiveWeightedShots:nPlayer,knownStartingRoleShots:allMapped.filter(e=>e.startingPosition).length},profile};
 });
 return {version:policy.version,fixtureId:fixture.id,cutoffExclusive:cutoff,matchdayExclusive:fixture.matchday,targetMatchIdExcluded:fixture.id,
  leagueFixtureIds:reports.map(m=>m.fixtureId),rows,teams:teams.map(({events,...t})=>{const r=rows.filter(p=>p.teamId===t.teamId&&p.status==='AVAILABLE');
   const total=sum(r.map(p=>p.shots)),exposure=total>0?sum(r.map(p=>p.shots*sum(p.profile.map(z=>z.playerShare*z.relativeAllowance))))/total:null;
   return {...t,volumeSignal:r.length>=2&&exposure>0?clamp(Math.log(exposure),-policy.maximumSignal,policy.maximumSignal):null,volumeScope:'ELIGIBLE_FORECAST_PLAYER_POOL_NOT_FULL_TEAM'};}),
  openPlayVersusSetPiece:null,onTargetLocations:null,inPlayRoles:null,production:false};
}
function apply(vector,beta,mode='allocation',policy=POLICY){
 if(!Number.isFinite(beta)||Math.abs(beta)>1||!['allocation','volume'].includes(mode))throw Error('INVALID_PARAMETERS');
 const rows=vector.rows.map(p=>({...p,baseShots:p.shots,baseSot:p.sot,adjustedShots:p.shots,adjustedSot:p.sot,applied:false,duoProbability:null,fairOdds:null,ev:null}));
 const conservation=[];
 for(const team of vector.teams){
  const roster=rows.filter(p=>p.teamId===team.teamId),active=roster.filter(p=>p.status==='AVAILABLE'&&p.shots>0),complete=roster.every(p=>Number.isFinite(p.shots)&&p.shots>=0&&Number.isFinite(p.sot)&&p.sot>=0&&p.sot<=p.shots);
  if(complete&&active.length>=2&&beta!==0){
   if(mode==='allocation'){
    const shots=boundedAllocate(active.map(p=>p.shots*Math.exp(beta*p.signal)),active.map(p=>Math.max(.9*p.shots,p.sot)),active.map(p=>1.1*p.shots),sum(active.map(p=>p.shots)));
    const sot=boundedAllocate(active.map((p,i)=>p.sot*shots[i]/p.shots),active.map(p=>.9*p.sot),active.map((p,i)=>Math.min(shots[i],1.1*p.sot)),sum(active.map(p=>p.sot)));
    active.forEach((p,i)=>{p.adjustedShots=shots[i];p.adjustedSot=sot[i];p.applied=true;});
   }else if(Number.isFinite(team.volumeSignal)){
    const factor=clamp(Math.exp(beta*team.volumeSignal),1-policy.maximumVolumeChange,1+policy.maximumVolumeChange);
    active.forEach(p=>{p.adjustedShots=p.shots*factor;p.adjustedSot=p.sot*factor;p.applied=true;});
   }
  }
  conservation.push({teamId:team.teamId,baselineShots:complete?sum(roster.map(p=>p.baseShots)):null,adjustedShots:complete?sum(roster.map(p=>p.adjustedShots)):null,
   baselineSot:complete?sum(roster.map(p=>p.baseSot)):null,adjustedSot:complete?sum(roster.map(p=>p.adjustedSot)):null});
 }
 return {version:policy.version,beta,mode,fixtureId:vector.fixtureId,rows,conservation,production:false,state:'SHADOW_RESEARCH_ONLY'};
}
function fit(training,mode,policy=POLICY){
 if(training.length<policy.minimumTrainingFixtures||new Set(training.map(r=>r.matchday)).size<policy.minimumTrainingMatchdays)return {beta:0,status:'INSUFFICIENT_PRIOR_TRAINING',trainingFixtures:training.length};
 let best=null;for(let i=0;i<=policy.coefficientSteps;i++){const beta=-1+2*i/policy.coefficientSteps;
  const losses=training.map(r=>metrics(apply(r.vector,beta,mode,policy),r.actuals).shotsLogLoss);if(losses.some(x=>x===null))throw Error('MISSING_TRAINING_OUTCOME');
  const objective=sum(losses)/losses.length+policy.ridge*beta*beta;
  if(!best||objective<best.objective-1e-12||Math.abs(objective-best.objective)<1e-12&&Math.abs(beta)<Math.abs(best.beta))best={beta,objective};
 }return {...best,status:'FITTED_PRIOR_MATCHDAYS_ONLY',trainingFixtures:training.length,trainingFixtureIds:training.map(r=>r.fixtureId),trainingMatchdays:[...new Set(training.map(r=>r.matchday))]};
}
module.exports={POLICY,playerRows,position,contextWeight,featureVector,apply,fit,outcomeRows,metrics};
