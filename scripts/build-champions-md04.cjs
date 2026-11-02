'use strict';
// Fixture-scoped MD4 adapter. All statistical estimators and publication gates
// are shared with the existing engines; no historical catalog is regenerated.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {readJsonFile}=require('./sisal/dataset-store.cjs');
const {buildSharedScenarios,eligible}=require('./champions/shared-scenario.cjs');
const {canonicalTeam,TEAM_ONLY,rateCandidate,exactPlayer}=require('./champions/current-season-offline');
const {projectMd3Team,allocateMinuteBudget,starterThresholds}=require('./champions/md3-lineup-policy');
const {collectRosterEvidence,chronologicalEvidence,estimateExpectedMinutes}=require('./champions/substitute-minutes');
const {loadObservedShooting}=require('./champions/md3-observed-shooting.cjs');
const {predictionRows,exactProviderMap}=require('./champions/md3-shared-forecast-integration.cjs');
const {integratePlayerForecasts}=require('./md06-player-forecast-integration');
const {buildPublication}=require('./champions/md3-publication-policy.cjs');
const {loadRegistry}=require('./champions/validation-data.cjs');
const {scoreMatrix,matrixProbability}=require('./predictions/engine');
const {zonedLocalToUtc}=require('./champions/complete-forecast-snapshots');
const root=path.resolve(__dirname,'..'),read=p=>readJsonFile(path.join(root,p));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');};
const lineupPath='data/sources/champions-probable-formations-md04-2026-27.json';
const oddsPath='data/normalized/odds/sisal/champions-league.json';
const individualPath='data/normalized/champions-md04-probable-individuals-2026-27.json';
const databasePath='data/normalized/champions-md04-player-database-2026-27.json';
const catalogPath='data/normalized/schedina-champions-md04.json';
async function applyPublicOddsMinimum(matches){
 const {meetsMinimumPublicOdds}=await import('../js/pages/shared-forecast-contract.mjs');
 for(const m of matches){
  for(const l of m.selections){
   l.context={...l.context,competition:'champions',season:'2026-27',matchday:4,forecastPolicy:'SERIE_A_CURRENT'};
   if(!meetsMinimumPublicOdds(l)){
   l.suggestionAnalysis={...l.suggestionAnalysis,suggested:false,rank:null,reasons:[...new Set([...(l.suggestionAnalysis.reasons||[]),'ODDS_BELOW_PUBLIC_MINIMUM'])]};
   l.selectionStatus='NOT_SELECTED';l.qualifiedSelection=false;
   l.publication={...l.publication,status:'NOT_SELECTED',reasons:[...new Set([...(l.publication?.reasons||[]),'ODDS_BELOW_PUBLIC_MINIMUM'])]};
   }
  }
  m.suggestions=m.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
 }
}
async function refreshPublicOddsMinimum(){
 const out=read(catalogPath);await applyPublicOddsMinimum(out.marketCatalog.matches);
 const selected=out.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
 Object.assign(out.summary,{selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length});
 out.minimumSelectionOdds=1.08;write(catalogPath,out);
 const report=read('output/champions-md04/build-report.json');report.summary=out.summary;write('output/champions-md04/build-report.json',report);
 console.log(JSON.stringify(out.summary));
}

function buildDatabase(lineups,current,registered,history,oldDatabase,preview){
 const teams=[...new Set(lineups.teams.map(t=>t.teamId))].map(teamId=>{
  const rt=registered.teams.find(t=>canonicalTeam(t.id)===teamId),ct=current.teams.find(t=>canonicalTeam(t.id)===teamId);
  const ht=history.teams.find(t=>canonicalTeam(t.id)===teamId),old=oldDatabase.teams.find(t=>t.teamId===teamId);
  assert(rt&&ct&&ht&&old,teamId);
  const players=rt.players.map(p=>{
   const archived=old.players.find(x=>x.playerId===p.id);
   const member=ct.players.find(x=>x.id===p.id);
   const providerPlayerId=p.providerIds?.espn||member?.providerPlayerId||null;
   // Canonical ID and provider must agree; a conflicting legacy row is not evidence.
   const safeArchive=archived&&(!providerPlayerId||!archived.providerPlayerId||String(providerPlayerId)===String(archived.providerPlayerId))?archived:null;
   const joined=exactPlayer(ht.players,{id:p.id,providerPlayerId});
   const historical=safeArchive?.previousSeason?safeArchive:joined.player?.previousSeason?joined.player:p.previousSeason?p:null;
   const contextEvidence=preview.fixtures.flatMap(f=>f.teams).find(t=>t.teamId===teamId)?.individuals.find(x=>x.playerId===p.id&&(!providerPlayerId||String(x.providerPlayerId)===String(providerPlayerId)));
   return {...safeArchive,id:p.id,playerId:p.id,registeredPlayerId:p.id,canonicalName:p.name,name:p.name,providerPlayerId:providerPlayerId?String(providerPlayerId):null,position:p.position||member?.position||null,previousSeason:historical?.previousSeason||null,historicalMinutes:historical?.previousSeason?.totals?.minutes??null,domesticContextFactor:safeArchive?.identityCorrection?1:contextEvidence?.primary?.contextFactor??1,domesticContextStatus:contextEvidence?.primary?.contextFactor!==undefined?'existing-observed-opponent-context':'neutral-missing-context',identityJoin:safeArchive?'existing-canonical-database':joined.method};
  });
  return {teamId,team:rt.team,players};
 });
 return {schemaVersion:1,competition:'champions',season:'2026-27',matchday:4,teams};
}
function buildIndividuals({lineups,database,scenarios,evidence,observed,asOf}){
 const fixtures=scenarios.fixtures.map(f=>{
  const kickoffAt=zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome');
  const teams=['home','away'].map((venue,i)=>{
   const t=lineups.teams.find(t=>t.fixtureId===f.fixtureId&&t.venue===venue),db=database.teams.find(x=>x.teamId===t.teamId),target=f.teamProjections[i];assert(t);
   const players=[...t.starters.map(p=>({...p,projectedRole:'starter'})),...t.bench.map(p=>({...p,projectedRole:'bench'}))].map(p=>{
    const member=db.players.find(x=>x.playerId===p.playerId);assert(member);
    const blockers=[];
    if(TEAM_ONLY.has(t.teamId))blockers.push('COLLECTIVE_ONLY_TEAM');
    const records=chronologicalEvidence(evidence.get(String(p.providerPlayerId))||[],asOf);
    const estimate=estimateExpectedMinutes(records,p.projectedRole==='starter'?'starter':'potential-substitute',kickoffAt);
    const rows=(observed.byPlayer.get(t.teamId+':'+p.playerId)||[]).filter(r=>r.date<asOf.slice(0,10)&&r.retrievedAt<=asOf);
    const primary=rateCandidate({historical:member,role:member.position,rows,contextFactor:member.domesticContextFactor});
    if(!p.playerId||!p.registeredPlayerId)blockers.push('IDENTITY_UNRESOLVED');
    if(!Number.isFinite(estimate.expectedMinutes))blockers.push('EXPECTED_MINUTES_UNAVAILABLE');
    else if(estimate.expectedMinutes<=0)blockers.push('NO_EXPECTED_PLAYING_TIME');
    if(member.position==='goalkeeper')blockers.push('GOALKEEPER_SHOT_METRIC_INELIGIBLE');
    if(!primary.candidate||primary.status!=='diagnostic-rate-only')blockers.push('BASELINE_UNAVAILABLE_OR_UNSAFE');
    if(!Number.isFinite(target.shotsTotal?.central)||!Number.isFinite(target.shotsOnTarget?.central))blockers.push('TEAM_VOLUMES_UNAVAILABLE');
    return {...p,role:member.position,lineupStatus:'probable',availability:p.projectedRole==='starter'?'probable-starter':'predicted-bench',startingProbability:null,expectedMinutes:estimate.expectedMinutes,minutesEstimate:{...estimate,conditionalOnStarting:p.projectedRole==='starter'},baselineStatus:primary.status,baseline:primary,historicalMinutes:member.historicalMinutes,projectedShots:null,projectedSOT:null,eventProbabilities:null,blockers};
   });
   const minuteBudget=allocateMinuteBudget(players);
   const projection=projectMd3Team({mode:'probable',documentation:{probableXI:true},teamId:t.teamId,players:players.filter(p=>!p.blockers.length).map(p=>({playerId:p.playerId,roleKey:p.role,expectedMinutes:p.expectedMinutes,per90:{shots:p.baseline.candidate.shots,shotsOnTarget:p.baseline.candidate.sot}})),targetShots:target.shotsTotal?.central,targetSOT:target.shotsOnTarget?.central});
   for(const p of players){const result=projection.players.find(x=>x.playerId===p.playerId);if(!p.blockers.length&&result){p.projectedShots=result.shots;p.projectedSOT=result.sot;p.eventProbabilities=p.projectedRole==='starter'?starterThresholds(result.shots,result.sot):null;}else if(!p.blockers.length)p.blockers.push('TEAM_RECONCILIATION_NOT_PASSED');}
   const units=t.rawLine.slice(t.rawLine.indexOf(':')+1).split(';').map(s=>s.split(',').length);assert.equal(units.reduce((n,x)=>n+x,0),11);
   return {...t,formation:units.slice(1).join('-'),players,collectiveOnly:TEAM_ONLY.has(t.teamId),benchStatus:'full-squad-pending-callups',callupDocumentation:{documented:false,rosterFallback:true,reason:'FULL_SQUAD_PENDING_MATCH_CALLUPS'},potentialBench:[],minuteBudget,reconciliation:{...projection,targetShots:target.shotsTotal?.central??null,targetSOT:target.shotsOnTarget?.central??null}};
  });
  return {fixtureId:f.fixtureId,date:f.date,kickoffAt,status:'probable',teams};
 });
 const players=fixtures.flatMap(f=>f.teams.flatMap(t=>t.players));
 return {schemaVersion:1,competition:'champions',season:'2026-27',matchday:4,status:'probable',source:{...lineups.source,path:lineupPath,sha256:hash(lineupPath)},summary:{fixtures:fixtures.length,teams:fixtures.length*2,probableStarters:players.filter(p=>p.projectedRole==='starter').length,predictedBench:players.filter(p=>p.projectedRole==='bench').length,operationalStarters:players.filter(p=>p.projectedRole==='starter'&&p.projectedShots!==null).length,blockedStarters:players.filter(p=>p.projectedRole==='starter'&&p.projectedShots===null).length},fixtures};
}
async function buildTeamCatalog(scenarios,odds){
 const {createChampionsSelection}=await import('../js/pages/champions-market-ui.mjs');
 return scenarios.fixtures.map(f=>{
  const event=odds.events.find(e=>e.canonicalMatchId===f.fixtureId);assert(event&&event.canonicalDate===f.date);
  const matrix=scoreMatrix(f.expectedGoals.home,f.expectedGoals.away,7,null),legs=[];
  for(const market of event.markets){
   // Only exact, ordinary regulation-time contracts. No extra-time, half,
   // substitute, woodwork or compound markets can inherit a marginal forecast.
   if(market.status!=='open'||market.marketScope!=='match'||market.providerPlayerIds.length||(market.periodScope&&market.periodScope!=='full-match'))continue;
   let family,predicate,target;
   if(String(market.marketCode)==='3'&&market.marketName==='1X2 ESITO FINALE'&&market.variantName==='ESITO FINALE 1X2'&&market.threshold===null){family='result';}
   else if(String(market.marketCode)==='28319'&&market.marketName==='DOPPIA CHANCE'&&market.variantName==='DOPPIA CHANCE MULTIESITI'&&market.threshold===null){family='double-chance';}
   else if(String(market.marketCode)==='7989'&&market.marketName==='UNDER/OVER'&&/^U\/O (\d+(?:\.\d+)?)$/.test(market.variantName)&&Number(market.variantName.slice(4))===Number(market.threshold)){family='goals';}
   else continue;
   for(const selection of market.selections){
    if(selection.status!=='open'||!Number.isFinite(selection.odds)||selection.odds<=1||!selection.providerSelectionId)continue;
    const name=selection.name;
    if(family==='result'){if(!['1','X','2'].includes(name))continue;predicate=(h,a)=>name==='1'?h>a:name==='2'?a>h:h===a;target='1x2:'+name;}
    else if(family==='double-chance'){if(!['1X','X2','12'].includes(name))continue;predicate=(h,a)=>name==='1X'?h>=a:name==='X2'?a>=h:h!==a;target='double-chance:'+name;}
    else{if(!['OVER','UNDER'].includes(name)||market.threshold===null||!Number.isFinite(Number(market.threshold)))continue;predicate=(h,a)=>name==='OVER'?h+a>Number(market.threshold):h+a<Number(market.threshold);target='goals:'+name.toLowerCase()+':'+market.threshold;}
    const p=family==='result'?f.probabilities[{1:'home',X:'draw',2:'away'}[name]]:family==='double-chance'?({ '1X':f.probabilities.home+f.probabilities.draw,'X2':f.probabilities.draw+f.probabilities.away,'12':f.probabilities.home+f.probabilities.away })[name]:matrixProbability(matrix,predicate)*100;
    const selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
    const m={...market,canonicalPlayerIds:[],forecastCompatibility:'EXACT_SHARED_SCENARIO_CONTRACT',modifiers:{periodScope:'full-match',replacementIncluded:false,woodworkIncluded:false}};
    const leg=createChampionsSelection({...f,oddsEvent:{providerEventId:event.providerEventId,retrievedAt:event.retrievedAt||odds.retrievedAt}},m,{...selection,selectionId,quoteAvailability:'AVAILABLE_AT_SNAPSHOT'});
    Object.assign(leg,{selection:name,odds:selection.odds,threshold:market.threshold,marketScope:'match',marketFamily:{result:'Risultato','double-chance':'Doppia chance',goals:'Gol'}[family],modelProbabilityPct:p,modelProbability:p/100,providerMarketId:market.providerMarketId,providerSelectionId:selection.providerSelectionId,catalogOrigin:'champions-md04-shared-scenario',suggestionAnalysis:{suggested:family==='result'&&name===f.scoreForecast.primary.outcome,family,rank:null},context:{competition:'champions',season:'2026-27',matchday:4,forecastPolicy:'SERIE_A_CURRENT'}});
    leg.betSelection.market.selection=name;
    leg.betSelection.compatibility.modelTarget=target;
    leg.betSelection.evaluation={status:'PRELIMINARY',modelProbabilityPct:p,fairOdds:100/p,expectedValuePct:(p/100*selection.odds-1)*100,provenance:{source:'data/generated/champions-shared-scenarios.json#'+f.fixtureId,modelTarget:target,modelVersion:f.engineVersion}};
    legs.push(leg);
   }
  }
  return {matchId:f.fixtureId,homeTeam:f.homeTeam,awayTeam:f.awayTeam,selections:legs,suggestions:legs.filter(l=>l.suggestionAnalysis.suggested).map(l=>l.selectionId)};
 });
}
async function build(){
 const asOf=new Date().toISOString(),calendar=read('data/normalized/champions-league-2026-27.json'),lineups=read(lineupPath),odds=read(oddsPath);
 assert.equal(lineups.status,'probable');assert.equal(lineups.matchday,4);
 const ids=new Set(lineups.teams.map(t=>t.fixtureId));
 const targets=calendar.fixtures.filter(f=>ids.has(f.id)&&f.matchday===4&&eligible(f,asOf));
 assert.equal(targets.length,ids.size,'Refuse to recompute started/finished or foreign fixtures');
 for(const f of targets)assert.deepEqual(lineups.teams.filter(t=>t.fixtureId===f.id).map(t=>t.venue).sort(),['away','home']);
 const protectedPaths=[lineupPath,oddsPath,'data/normalized/schedina-champions-md03.json','data/normalized/champions-md03-player-database-2026-27.json','data/normalized/champions-registered-squads-2026-27.json','data/normalized/official-starter-registry.json'];
 const protectedBefore=Object.fromEntries(protectedPaths.map(p=>[p,hash(p)]));
 const current=read('data/normalized/champions-player-stats-2026-27.json'),registered=read('data/normalized/champions-registered-squads-2026-27.json'),oldDatabase=read('data/normalized/champions-md03-player-database-2026-27.json');
 require('./champions/md3-identity-corrections.cjs').applyIdentityCorrections(root,oldDatabase);
 const database=buildDatabase(lineups,current,registered,read('data/normalized/champions-player-stats-2025-26.json'),oldDatabase,read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json'));
 const scenarios=buildSharedScenarios({calendar:{...calendar,fixtures:targets},source:read('data/sources/champions-pilot-match-stats-2025-27.json'),styles:read('data/normalized/team-style-profiles.json'),odds,asOf,matchday:4,canonicalLineups:lineups,playerDatabase:database});
 assert(scenarios.fixtures.every(f=>f.status==='preliminary'&&f.provenance.lineupsApplied),'Incomplete team or canonical XI evidence');
 const evidence=collectRosterEvidence(root,lineups.teams.flatMap(t=>[...t.starters,...t.bench].map(p=>p.providerPlayerId)));
 const observed=loadObservedShooting(root,lineups.teams.map(t=>({...t,players:[...t.starters,...t.bench]})));
 for(const [id,rows] of observed.minutes){const keys=new Set(rows.map(r=>r.date+'|'+r.competitionCode));evidence.set(id,(evidence.get(id)||[]).filter(r=>r.season!=='2026-27'||!keys.has(r.date+'|'+r.competitionCode)).concat(rows).sort((a,b)=>a.date.localeCompare(b.date)));}
 const individuals=buildIndividuals({lineups,database,scenarios,evidence,observed,asOf});
 individuals.currentShootingEvidence={asOf:observed.asOf,audit:observed.audit,source:'data/sources/champions-player-shooting-evidence-2026-10-20.json',policy:'Existing reconciled observed-minute evidence only; missing or conflicting rows excluded. No freshness inferred from build time.'};
 individuals.policy={probableIsNotOfficial:true,formulasChanged:false,benchUsedForAllocation:true,benchEligibleForStarterMarkets:false,minuteEstimator:'champions/substitute-minutes.estimateExpectedMinutes',baseline:'champions/current-season-offline.rateCandidate',domesticContext:'existing exact team/player opponent-context evidence; neutral when unavailable',reconciliation:'champions/md3-lineup-policy.projectMd3Team',duoProbability:'UNVALIDATED_NULL'};
 const baseMatches=await buildTeamCatalog(scenarios,odds);
 const predictions=individuals.fixtures.map(f=>predictionRows(f,database));
 const identities=exactProviderMap(individuals,odds,read('data/normalized/champions-md02-integration-2026-27.json'));
 const integration=integratePlayerForecasts({catalogMatches:baseMatches,predictions,odds,verifiedProviderPlayerMap:identities.map,officialLineups:{fixtures:[]},probableLineups:{provider:'internal-probable-lineup',importedAt:lineups.source.consultedAt,teams:individuals.fixtures.flatMap(f=>f.teams.map(t=>({teamId:t.teamId,players:t.players.map(p=>({playerId:p.playerId,lineupStatus:p.projectedRole==='starter'?'starter':'reserve'}))})))}});
 const excludedQuotes=[];
 for(const m of integration.matches)m.selections=m.selections.filter(l=>{
  l.context={...l.context,competition:'champions',season:'2026-27',matchday:4,forecastPolicy:'SERIE_A_CURRENT'};
  if(l.marketScope!=='player')return true;
  if(l.odds===null){excludedQuotes.push(l);return false;}
  const raw=odds.events.find(e=>e.canonicalMatchId===m.matchId).markets.find(r=>r.providerMarketId===l.betSelection.identity.providerMarketId);assert(raw);
  // Preserve the full provider semantics, including extra time and woodwork.
  l.betSelection.identity.canonicalPlayerIds=[l.playerId];
  l.betSelection.market.bookmakerSemantics.extraTimeIncluded=/INC\.?\s*T\.?S\.?|INCL\.?\s*T\.?S\.?/i.test(raw.marketName+' '+raw.variantName);
  l.forecastEvidence.lineupInput=lineupPath;
  l.evidenceLabel='Stima preliminare condizionata alla partenza da titolare';
  return true;
 });
 const fixtureEvidence=scenarios.fixtures.map(f=>({fixtureId:f.fixtureId,date:f.date,kickoff:f.kickoff,forecast:f}));
 const publication=await buildPublication({matches:integration.matches,fixtures:fixtureEvidence,individuals,evidence:{validationRegistry:loadRegistry(),modelIds:{collective:'champions-shared:'+hash('scripts/champions/shared-scenario.cjs'),player:'champions-md04:'+hash('scripts/build-champions-md04.cjs')},officialRegistry:{},preview:{calibrationStatus:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED'},pilot:read('data/normalized/champions-pilot-volume-backtest.json'),calibration:read('data/analysis/champions/model-calibration-audit-2026-10-11.json')}});
 await applyPublicOddsMinimum(publication.matches);
 const all=publication.matches.flatMap(m=>m.selections),selected=all.filter(l=>l.suggestionAnalysis.suggested);
 // The generic publication checker describes single-player conditional models;
 // it must never relabel or evaluate the probability of a DUO contract.
 for(const l of all.filter(l=>l.betSelection.market.bookmakerSemantics?.duo)){
  const e=l.betSelection.evaluation;
  for(const k of ['modelProbabilityPct','prudentProbabilityPct','fairOdds','expectedValuePct','conservativeExpectedValuePct'])e[k]=null;
  e.status='DUO_PROBABILITY_UNAVAILABLE';e.probabilitySemantics='DUO_CONTRACT_UNAVAILABLE';
  assert.equal(l.modelProbabilityPct,null);assert.equal(l.fairOdds,null);assert.equal(l.expectedValuePct,null);
 }
 // Expose the recalculated team counts through the existing Schedina coverage
 // renderer. A point estimate never becomes an invented threshold probability.
 for(const match of publication.matches){
  const f=scenarios.fixtures.find(f=>f.fixtureId===match.matchId),individual=individuals.fixtures.find(f=>f.fixtureId===match.matchId);
  match.forecastCoverage={lineupStatus:'probable',teamProjections:f.teamProjections.map((t,i)=>({...t,team:[f.homeTeam,f.awayTeam][i]})),matchProjection:f.matchProjection,cards:f.cards,result:f.probabilities,doubleChance:{'1X':f.probabilities.home+f.probabilities.draw,'X2':f.probabilities.draw+f.probabilities.away},generatedIndividualMarkets:individual.teams.flatMap(t=>t.players).filter(p=>p.projectedRole==='starter'&&p.eventProbabilities).length*5,marginalVolumeProbabilitiesAvailable:false,missing:['Probabilità delle soglie di corner, tiri e SOT di squadra non collegate a una distribuzione validata per questo modello.'],teamSampleDates:f.dataQuality.latestMatchDates};
 }
 const out={schemaVersion:4,competition:'champions',season:'2026-27',matchday:4,status:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED',generatedAt:asOf,oddsRetrievedAt:odds.retrievedAt,scope:[...ids],lineupInput:{path:lineupPath,sha256:hash(lineupPath)},individualInput:{path:individualPath},selectionRule:'Stime preliminari sulle sole partite con entrambi gli undici probabili. Criteri e modelli condivisi invariati. Contratti DUO conservati; probabilità, quota equa ed EV DUO: N/D.',summary:{fixtures:targets.length,selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length},slips:[],marketCatalog:{schemaVersion:4,policy:'SHARED_SERIE_A_LINEUP_FORECASTS',matchday:4,matches:publication.matches,myCombo:publication.myCombo},coverage:individuals.summary};
 out.minimumSelectionOdds=1.08;
 const sharedPath='data/generated/champions-shared-scenarios.json',previous=read(sharedPath);
 const forecastInputs=Object.fromEntries([lineupPath,oddsPath,'data/sources/champions-pilot-match-stats-2025-27.json','data/normalized/team-style-profiles.json'].map(p=>[p,hash(p)]));
 for(const f of scenarios.fixtures)f.inputSnapshot={asOf,sha256:forecastInputs};
 const shared={...previous,generatedAt:asOf,fixtures:previous.fixtures.map(f=>scenarios.fixtures.find(n=>n.fixtureId===f.fixtureId)||f)};
 for(const f of scenarios.fixtures)if(!shared.fixtures.some(p=>p.fixtureId===f.fixtureId))shared.fixtures.push(f);
 for(const [p,h] of Object.entries(protectedBefore))assert.equal(hash(p),h,'Concurrent input change: '+p);
 write(databasePath,database);write(individualPath,individuals);out.individualInput.sha256=hash(individualPath);
 write(catalogPath,out);write(sharedPath,shared);
 write('data/technical-archive/champions-md04/excluded-player-quotes.json',{excludedQuotes,candidateExclusions:integration.summary.excluded,identityConflicts:identities.conflicts});
 write('output/champions-md04/build-report.json',{generatedAt:asOf,protectedBefore,summary:out.summary,coverage:out.coverage,unquotedExcluded:excludedQuotes.length,fixtureIds:[...ids],untouchedSharedFixtures:previous.fixtures.filter(f=>!ids.has(f.fixtureId)).map(f=>({fixtureId:f.fixtureId,sha256:crypto.createHash('sha256').update(JSON.stringify(f)).digest('hex')}))});
 console.log(JSON.stringify({summary:out.summary,coverage:out.coverage,unquotedExcluded:excludedQuotes.length}));
 return out;
}
if(require.main===module)(process.argv.includes('--public-odds-only')?refreshPublicOddsMinimum():build()).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build,buildDatabase,buildIndividuals,buildTeamCatalog};
