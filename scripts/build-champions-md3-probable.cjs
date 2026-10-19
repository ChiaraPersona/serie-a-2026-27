'use strict';
// MD3 overlay only: no collective engine execution, odds mutation or approximate identity lookup.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {collectRosterEvidence,estimateExpectedMinutes,chronologicalEvidence,POLICY}=require('./champions/substitute-minutes');
const {canonicalTeam,TEAM_ONLY,projectDocumentedTeam}=require('./champions/current-season-offline');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sourcePath='data/sources/champions-probable-formations-md03-2026-27.json';
const source=read(sourcePath),preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
const current=read('data/normalized/champions-player-stats-2026-27.json'),registered=read('data/normalized/champions-registered-squads-2026-27.json');
const cal=read('data/normalized/champions-league-2026-27.json');
assert.equal(source.status,'probable');assert.equal(source.teams.length,36);
const ids=new Set(source.teams.filter(t=>!TEAM_ONLY.has(t.teamId)).flatMap(t=>t.starters.map(p=>p.providerPlayerId)).filter(Boolean).map(String));
const evidence=collectRosterEvidence(root,ids);
const fixtures=preview.fixtures.map(f=>{
 const c=cal.fixtures.find(c=>c.id===f.fixtureId),kickoffAt=`${f.date}T${c.kickoff||f.collective.kickoff}:00+02:00`;
 assert(Number.isFinite(Date.parse(kickoffAt)),kickoffAt);
 const teams=['home','away'].map(venue=>{
  const t=source.teams.find(t=>t.fixtureId===f.fixtureId&&t.venue===venue);assert(t);assert.equal(t.status,'probable');assert.equal(t.starters.length,11);assert.equal(t.team,c[venue+'Team']);
  const currentTeam=current.teams.find(p=>canonicalTeam(p.id)===t.teamId),reg=registered.teams.find(p=>canonicalTeam(p.id)===t.teamId);assert(currentTeam&&reg);
  for(const p of [...t.starters,...t.unavailable,...t.suspended,...t.doubtful])if(p.playerId){
   const member=currentTeam.players.find(x=>x.id===p.playerId),r=reg.players.find(x=>x.id===p.registeredPlayerId);assert(member&&r,`stale alias ${t.teamId}/${p.sourceName}`);
   assert.equal(String(member.providerPlayerId),String(p.providerPlayerId));if(r.providerIds?.espn)assert.equal(String(r.providerIds.espn),String(p.providerPlayerId));else assert.equal(r.id,p.playerId);
  }
  const isIn=(p,category)=>t[category].some(x=>(p.playerId&&x.playerId===p.playerId)||x.sourceName===p.sourceName);
  const oldTeam=f.teams.find(x=>canonicalTeam(x.teamId)===t.teamId),target=oldTeam.teamProjection;
  const players=t.starters.map(p=>{
   const old=p.playerId?oldTeam.individuals.find(x=>x.playerId===p.playerId||(p.providerPlayerId&&String(x.providerPlayerId)===String(p.providerPlayerId))):null;
   const member=p.playerId?currentTeam.players.find(x=>x.id===p.playerId):null;
   const availability=isIn(p,'suspended')?'suspended':isIn(p,'unavailable')?'unavailable':isIn(p,'doubtful')?'doubtful':'probable-starter';
   const blockers=[];
   if(TEAM_ONLY.has(t.teamId))blockers.push('COLLECTIVE_ONLY_TEAM');
   if(!p.playerId||!p.registeredPlayerId)blockers.push('IDENTITY_UNRESOLVED');
   if(['unavailable','suspended','doubtful'].includes(availability))blockers.push(availability.toUpperCase());
   // Doubtful players keep explicit uncertainty; no invented availability probability or discount.
   const records=chronologicalEvidence(evidence.get(String(p.providerPlayerId))||[],kickoffAt);
   const estimate=blockers.length?{status:'not-evaluable',expectedMinutes:null,reason:blockers[0]}:estimateExpectedMinutes(records,'starter',kickoffAt);
   if(!Number.isFinite(estimate.expectedMinutes))blockers.push('EXPECTED_MINUTES_UNAVAILABLE');
   if(member?.position==='goalkeeper')blockers.push('GOALKEEPER_SHOT_METRIC_INELIGIBLE');
   if(!old?.primary?.candidate||old.primary.status!=='diagnostic-rate-only'||old.sample?.overlap)blockers.push('BASELINE_UNAVAILABLE_OR_UNSAFE');
   return {...p,lineupStatus:'probable',availability,uncertainty:availability==='doubtful'?'participation-unconfirmed-no-probability-assigned':'conditional-on-probable-start',role:member?.position||null,expectedMinutes:estimate.expectedMinutes,minutesEstimate:{...estimate,conditionalOnStarting:true,policy:POLICY,evidenceType:'existing-roster-and-substitution-clock-method',evidence:records},baselineStatus:old?.primary?.status||null,baseline:old?.primary||null,historicalMinutes:old?.historicalMinutes??null,projectedShots:null,projectedSOT:null,eventProbabilities:null,blockers};
  });
  const eligible=players.filter(p=>!p.blockers.length).map(p=>({playerId:p.playerId,roleKey:p.role,expectedMinutes:p.expectedMinutes,per90:{shots:p.baseline.candidate.shots,shotsOnTarget:p.baseline.candidate.sot}}));
  const reconciliation=projectDocumentedTeam({teamId:t.teamId,players:eligible,lineupVerified:true,benchVerified:false,targetShots:target.shotsTotal?.central,targetSOT:target.shotsOnTarget?.central});
  // Never mark an undocumented bench as verified to force projections through the existing gate.
  for(const p of players){
   const projection=reconciliation.players.find(x=>x.playerId===p.playerId);
   if(!p.blockers.length&&projection){p.projectedShots=projection.shots;p.projectedSOT=projection.sot;}
   else if(!p.blockers.length)p.blockers.push('BENCH_UNDOCUMENTED',reconciliation.status);
  }
  return {teamId:t.teamId,team:t.team,venue,status:'probable',collectiveOnly:TEAM_ONLY.has(t.teamId),bench:null,benchStatus:'not-provided',unavailable:t.unavailable,suspended:t.suspended,doubtful:t.doubtful,players,reconciliation:{...reconciliation,targetShots:target.shotsTotal?.central??null,targetSOT:target.shotsOnTarget?.central??null,allocatedShots:players.some(p=>p.projectedShots!==null)?players.reduce((n,p)=>n+(p.projectedShots??0),0):null,allocatedSOT:players.some(p=>p.projectedSOT!==null)?players.reduce((n,p)=>n+(p.projectedSOT??0),0):null,expectedMinutes:players.reduce((n,p)=>n+(p.expectedMinutes??0),0)}};
 });
 return {fixtureId:f.fixtureId,date:f.date,kickoffAt,status:'probable',teams};
});
const players=fixtures.flatMap(f=>f.teams.flatMap(t=>t.players));
const output={schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:'probable',source:{...source.source,path:sourcePath,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,sourcePath))).digest('hex')},policy:{collectiveForecast:'frozen-unchanged',individuals:'existing-documentation-and-team-reconciliation-gate',probableIsNotOfficial:true,benchInvented:false,currentEstimatedMinutesUsedInPrimary:false},summary:{fixtures:18,teams:36,probableStarters:players.length,resolvedStarters:players.filter(p=>p.playerId&&p.registeredPlayerId).length,unresolvedStarters:players.filter(p=>!p.playerId||!p.registeredPlayerId).length,minuteEstimates:players.filter(p=>Number.isFinite(p.expectedMinutes)).length,generatedForecasts:players.filter(p=>p.projectedShots!==null).length,doubtfulStarters:players.filter(p=>p.availability==='doubtful').length,collectiveOnlyStarters:players.filter(p=>p.blockers.includes('COLLECTIVE_ONLY_TEAM')).length,blockedStarters:players.filter(p=>p.projectedShots===null).length},fixtures};
fs.writeFileSync(path.join(root,'data/normalized/champions-md03-probable-individuals-2026-27.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));
