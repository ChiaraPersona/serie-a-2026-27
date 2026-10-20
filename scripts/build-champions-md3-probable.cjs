'use strict';
// MD3 overlay only: no collective engine execution, odds mutation or approximate identity lookup.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {collectRosterEvidence,estimateExpectedMinutes,chronologicalEvidence,POLICY}=require('./champions/substitute-minutes');
const {canonicalTeam,TEAM_ONLY,projectDocumentedTeam}=require('./champions/current-season-offline');
const {scaleShotProjections}=require('./champions/player-volume-utils');
const {derivePredictedBench,projectMd3Team,allocateMinuteBudget,starterThresholds}=require('./champions/md3-lineup-policy');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const outputIndex=process.argv.indexOf('--output-file');
const outputFile=outputIndex<0?'data/normalized/champions-md03-probable-individuals-2026-27.json':process.argv[outputIndex+1];
if(outputIndex>=0&&(!outputFile||path.isAbsolute(outputFile)||outputFile.includes('..')||!/^data\/derived\/champions-md03\/[a-z0-9-]+\.json$/.test(outputFile)))throw Error('Versioned MD3 output required under data/derived/champions-md03/');
const officialMode=process.argv.includes('--official-two-fixtures');
if(officialMode&&outputIndex<0)throw Error('Official MD3 requires a versioned output');
const sourcePath=officialMode?'data/sources/champions-official-formations-md03-2026-27.json':'data/sources/champions-probable-formations-md03-2026-27.json';
const originalSource=read(sourcePath),source=officialMode?{status:'official',source:{consultedAt:originalSource.fixtures[0].source.capturedAt},teams:originalSource.fixtures.flatMap(f=>['home','away'].map(venue=>({fixtureId:f.fixtureId,venue,...f[venue],status:'official',starters:f[venue].players,unavailable:f[venue].unavailable||[],suspended:[],doubtful:[]})))}:originalSource;
const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
const current=read('data/normalized/champions-player-stats-2026-27.json'),registered=read('data/normalized/champions-registered-squads-2026-27.json');
const md3Database=read('data/normalized/champions-md03-player-database-2026-27.json');
// Scope additions to MD3 in memory, preserving frozen global and MD1/MD2 snapshots.
for(const team of md3Database.teams){
 const ct=current.teams.find(t=>t.team===team.team),rt=registered.teams.find(t=>t.team===team.team);
 for(const p of team.players){
  const existing=ct.players.find(x=>x.id===p.playerId);
  if(!existing)ct.players.push({...p});else if(!existing.providerPlayerId&&p.providerPlayerId)existing.providerPlayerId=p.providerPlayerId;
  const member=rt.players.find(x=>x.id===p.playerId);
  if(!member)rt.players.push({...p,id:p.playerId,providerIds:{espn:p.providerPlayerId}});
  else if(!member.providerIds?.espn&&p.providerPlayerId)member.providerIds={...member.providerIds,espn:p.providerPlayerId};
 }
}
const cal=read('data/normalized/champions-league-2026-27.json');
const callupData=read('data/sources/champions-callups-md03-2026-27.json');
assert.equal(source.status,officialMode?'official':'probable');assert.equal(source.teams.length,officialMode?4:36);
const ids=new Set(source.teams.filter(t=>!TEAM_ONLY.has(t.teamId)).flatMap(t=>{
 const callups=callupData.teams.find(c=>c.teamId===t.teamId);
 const reserves=officialMode?t.bench:callups?.status==='documented'?callups.players:md3Database.teams.find(s=>s.teamId===t.teamId).players;
 return [...t.starters,...reserves].map(p=>p.providerPlayerId);
}).filter(Boolean).map(String));
const evidence=collectRosterEvidence(root,ids);
const targetFixtureIds=new Set(officialMode?originalSource.fixtures.map(f=>f.fixtureId):preview.fixtures.map(f=>f.fixtureId));
if(officialMode)assert.deepEqual([...targetFixtureIds].sort(),['ucl-2026-27-md03-01','ucl-2026-27-md03-02']);
const fixtures=preview.fixtures.filter(f=>targetFixtureIds.has(f.fixtureId)).map(f=>{
 const c=cal.fixtures.find(c=>c.id===f.fixtureId),kickoffAt=`${f.date}T${c.kickoff||f.collective.kickoff}:00+02:00`;
 assert(Number.isFinite(Date.parse(kickoffAt)),kickoffAt);
 const teams=['home','away'].map(venue=>{
  const t=source.teams.find(t=>t.fixtureId===f.fixtureId&&t.venue===venue);assert(t);assert.equal(t.status,officialMode?'official':'probable');assert.equal(t.starters.length,11);assert.equal(t.team,c[venue+'Team']);
  const callups=callupData.teams.find(c=>c.fixtureId===t.fixtureId&&c.teamId===t.teamId);
  const predicted=officialMode?{bench:t.bench,documented:true,source:{publishedAt:f.date,consultedAt:originalSource.fixtures.find(x=>x.fixtureId===f.fixtureId).source.capturedAt},mode:'official'}:derivePredictedBench(t,callups,md3Database.teams.find(x=>x.teamId===t.teamId));
  if(predicted.documented){assert(predicted.source.publishedAt<=f.date);assert(Date.parse(predicted.source.consultedAt)<Date.parse(kickoffAt));}
  const currentTeam=current.teams.find(p=>canonicalTeam(p.id)===t.teamId),reg=registered.teams.find(p=>canonicalTeam(p.id)===t.teamId);assert(currentTeam&&reg);
  for(const p of (officialMode?t.starters:[...t.starters,...t.unavailable,...t.suspended,...t.doubtful]))if(p.playerId){
   const member=currentTeam.players.find(x=>x.id===p.playerId),r=reg.players.find(x=>x.id===p.registeredPlayerId);assert(member&&r,`stale alias ${t.teamId}/${p.sourceName}`);
   assert.equal(String(member.providerPlayerId),String(p.providerPlayerId));if(r.providerIds?.espn)assert.equal(String(r.providerIds.espn),String(p.providerPlayerId));else assert.equal(r.id,p.playerId);
  }
  const isIn=(p,category)=>t[category].some(x=>(p.playerId&&x.playerId===p.playerId)||x.sourceName===p.sourceName);
  const oldTeam=f.teams.find(x=>canonicalTeam(x.teamId)===t.teamId),target=oldTeam.teamProjection;
  const players=[...t.starters.map(p=>({...p,projectedRole:'starter',roleCertainty:officialMode?'official':'probable',source:officialMode?originalSource.fixtures.find(x=>x.fixtureId===f.fixtureId).source:source.source})),...(predicted.bench||[]).map(p=>officialMode?{...p,projectedRole:'bench',roleCertainty:'official'}:p)].map(p=>{
   const previous=p.playerId?oldTeam.individuals.find(x=>x.playerId===p.playerId||(p.providerPlayerId&&String(x.providerPlayerId)===String(p.providerPlayerId))):null;
   const recovered=md3Database.teams.find(x=>x.teamId===t.teamId).players.find(x=>x.playerId===p.playerId);
   const old=previous?.primary?.candidate?previous:recovered;
   const member=p.playerId?currentTeam.players.find(x=>x.id===p.playerId):null;
   const availability=isIn(p,'suspended')?'suspended':isIn(p,'unavailable')?'unavailable':isIn(p,'doubtful')?'doubtful':p.projectedRole==='bench'?(officialMode?'official-bench':'predicted-bench'):(officialMode?'official-starter':'probable-starter');
   const blockers=[];
   if(TEAM_ONLY.has(t.teamId))blockers.push('COLLECTIVE_ONLY_TEAM');
   if(!p.playerId||!p.registeredPlayerId)blockers.push('IDENTITY_UNRESOLVED');
   if(['unavailable','suspended','doubtful'].includes(availability))blockers.push(availability.toUpperCase());
   // Doubtful players keep explicit uncertainty; no invented availability probability or discount.
   const records=chronologicalEvidence(evidence.get(String(p.providerPlayerId))||[],kickoffAt);
   const estimate=blockers.length?{status:'not-evaluable',expectedMinutes:null,reason:blockers[0]}:estimateExpectedMinutes(records,p.projectedRole==='bench'?'potential-substitute':'starter',kickoffAt);
   if(!Number.isFinite(estimate.expectedMinutes))blockers.push('EXPECTED_MINUTES_UNAVAILABLE');
   else if(estimate.expectedMinutes<=0)blockers.push('NO_EXPECTED_PLAYING_TIME');
   if(!Number.isFinite(target.shotsTotal?.central)||!Number.isFinite(target.shotsOnTarget?.central))blockers.push('TEAM_VOLUMES_UNAVAILABLE');
   if(member?.position==='goalkeeper')blockers.push('GOALKEEPER_SHOT_METRIC_INELIGIBLE');
   if(!old?.primary?.candidate||old.primary.status!=='diagnostic-rate-only'||old.sample?.overlap)blockers.push('BASELINE_UNAVAILABLE_OR_UNSAFE');
   return {...p,lineupStatus:officialMode?'official':'probable',availability,startingProbability:officialMode&&p.projectedRole==='starter'?1:null,startingProbabilityStatus:officialMode&&p.projectedRole==='starter'?'OFFICIAL_STARTER':'NOT_ESTIMATED_BY_EXISTING_MODEL',uncertainty:officialMode?'official-lineup-minutes-estimated':availability==='doubtful'?'participation-unconfirmed-no-probability-assigned':'conditional-on-probable-start',role:member?.position||null,expectedMinutes:estimate.expectedMinutes,minutesEstimate:{...estimate,conditionalOnStarting:!officialMode&&p.projectedRole==='starter',evidenceType:'existing-roster-and-substitution-clock-method',evidence:records.filter(r=>(p.projectedRole==='bench'?r.namedBench:r.starter)&&estimate.sample?.matchIds?.includes(r.matchId)&&estimate.sample.competitionCodes.includes(r.competitionCode)&&estimate.sample.seasons.includes(r.season))},baselineStatus:old?.primary?.status||null,baseline:old?.primary||null,historicalMinutes:old?.historicalMinutes??null,projectedShots:null,projectedSOT:null,eventProbabilities:null,blockers};
  });
  const minuteBudget=allocateMinuteBudget(players);
  const eligible=players.filter(p=>!p.blockers.length).map(p=>({playerId:p.playerId,roleKey:p.role,expectedMinutes:p.expectedMinutes,per90:{shots:p.baseline.candidate.shots,shotsOnTarget:p.baseline.candidate.sot}}));
  const completeStarters=players.filter(p=>p.projectedRole==='starter'&&p.role!=='goalkeeper').every(p=>!p.blockers.length);
  const reconciliation=officialMode&&!completeStarters&&!TEAM_ONLY.has(t.teamId)?{status:'blocked-incomplete-official-starter-evidence',players:[]}:projectMd3Team({mode:officialMode?'official':'probable',documentation:officialMode?{officialXI:true,officialBench:true}:{probableXI:true,matchCallups:predicted.documented,predictedBench:predicted.documented},teamId:t.teamId,players:eligible,targetShots:target.shotsTotal?.central,targetSOT:target.shotsOnTarget?.central});
  let diagnosticSubset=null;
  if(eligible.length&&!TEAM_ONLY.has(t.teamId)&&Number.isFinite(target.shotsTotal?.central)&&Number.isFinite(target.shotsOnTarget?.central)){
   const shots=scaleShotProjections(eligible,'shots',target.shotsTotal?.central),sot=scaleShotProjections(eligible,'shotsOnTarget',target.shotsOnTarget?.central);
   const sum=items=>Number(items.reduce((n,x)=>n+x.projection,0).toFixed(2));
   diagnosticSubset={status:'NOT_AN_OPERATIONAL_FORECAST_INCOMPLETE_STARTER_SUBSET',eligibleOutfieldPlayers:eligible.length,benchDocumented:predicted.documented,shots:sum(shots),sot:sum(sot),shotsDifference:Number((sum(shots)-target.shotsTotal.central).toFixed(2)),sotDifference:Number((sum(sot)-target.shotsOnTarget.central).toFixed(2)),sotExceedsShots:shots.filter((p,i)=>sot[i].projection>p.projection).length};
  }
  // Probable mode accepts only the bench derived from complete documented match call-ups.
  for(const p of players){
   const projection=reconciliation.players.find(x=>x.playerId===p.playerId);
   if(!p.blockers.length&&projection){p.projectedShots=projection.shots;p.projectedSOT=projection.sot;p.eventProbabilities=p.projectedRole==='starter'?starterThresholds(projection.shots,projection.sot):null;if(officialMode&&p.eventProbabilities)p.eventProbabilities.status='PRELIMINARY_OFFICIAL_STARTER_EXISTING_POISSON';p.eventProbabilityBlocker=p.projectedRole==='bench'?'BENCH_THRESHOLD_PROBABILITY_NOT_VALIDATED':null;}
   else if(!p.blockers.length)p.blockers.push('TEAM_RECONCILIATION_NOT_PASSED',reconciliation.status);
  }
  const squad=md3Database.teams.find(x=>x.teamId===t.teamId);
  const occupied=new Set(players.map(p=>p.playerId));
  const potentialBench=squad.potentialBench.filter(p=>!occupied.has(p.playerId));
  const units=officialMode?[1,...t.formation.split('-').map(Number)]:t.rawLine.split('|')[0].split(';').map(line=>line.split(',').length);
  assert.equal(units.reduce((n,v)=>n+v,0),11);
  return {teamId:t.teamId,team:t.team,venue,status:officialMode?'official':'probable',formation:units.slice(1).join('-'),eligibleSquadPlayers:squad.players.length,potentialBench,collectiveOnly:TEAM_ONLY.has(t.teamId),bench:predicted.bench,benchStatus:officialMode?'official-verified':predicted.documented?'predicted-from-documented-callups':predicted.rosterFallback?'full-squad-pending-callups':'not-provided',callupDocumentation:predicted,minuteBudget,unavailable:t.unavailable,suspended:t.suspended,doubtful:t.doubtful,players,diagnosticSubset,reconciliation:{...reconciliation,targetShots:target.shotsTotal?.central??null,targetSOT:target.shotsOnTarget?.central??null,allocatedShots:players.some(p=>p.projectedShots!==null)?players.reduce((n,p)=>n+(p.projectedShots??0),0):null,allocatedSOT:players.some(p=>p.projectedSOT!==null)?players.reduce((n,p)=>n+(p.projectedSOT??0),0):null,expectedMinutes:players.reduce((n,p)=>n+(p.expectedMinutes??0),0)}};
 });
 return {fixtureId:f.fixtureId,date:f.date,kickoffAt,status:officialMode?'official':'probable',teams};
});
const players=fixtures.flatMap(f=>f.teams.flatMap(t=>t.players));
const output={schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:officialMode?'official':'probable',source:{...source.source,path:sourcePath,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,sourcePath))).digest('hex')},policy:{collectiveForecast:officialMode?'frozen-unchanged-lineup-independent':'frozen-unchanged',individuals:officialMode?'official-XI-and-bench-existing-team-reconciliation-gate':'probable-XI-with-match-callups-or-full-squad-fallback-and-existing-team-reconciliation-gate',probableIsNotOfficial:!officialMode,expectedMinutes:POLICY,benchInvented:false,currentEstimatedMinutesUsedInPrimary:false},summary:{fixtures:fixtures.length,teams:fixtures.length*2,probableStarters:players.filter(p=>p.projectedRole==='starter').length,predictedBench:players.filter(p=>p.projectedRole==='bench').length,teamsWithDocumentedCallups:fixtures.flatMap(f=>f.teams).filter(t=>t.callupDocumentation.documented).length,operationalPlayers:players.filter(p=>p.projectedShots!==null).length,nonOperationalPlayers:players.filter(p=>p.projectedShots===null).length,resolvedStarters:players.filter(p=>p.projectedRole==='starter'&&p.playerId&&p.registeredPlayerId).length,resolvedBench:players.filter(p=>p.projectedRole==='bench'&&p.playerId&&p.registeredPlayerId).length,unresolvedStarters:players.filter(p=>p.projectedRole==='starter'&&(!p.playerId||!p.registeredPlayerId)).length,unresolvedBench:players.filter(p=>p.projectedRole==='bench'&&(!p.playerId||!p.registeredPlayerId)).length,minuteEstimates:players.filter(p=>Number.isFinite(p.expectedMinutes)).length,generatedForecasts:players.filter(p=>p.projectedShots!==null).length,doubtfulStarters:players.filter(p=>p.availability==='doubtful').length,collectiveOnlyStarters:players.filter(p=>p.blockers.includes('COLLECTIVE_ONLY_TEAM')).length,blockedStarters:players.filter(p=>p.projectedRole==='starter'&&p.projectedShots===null).length},fixtures};
fs.mkdirSync(path.dirname(path.join(root,outputFile)),{recursive:true});
if(outputIndex>=0&&fs.existsSync(path.join(root,outputFile)))throw Error('Versioned MD3 output already exists');
fs.writeFileSync(path.join(root,outputFile),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));
