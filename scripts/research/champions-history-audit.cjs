'use strict';
// Internal inventory only: no model fitting, production regeneration or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {readJsonFile}=require('../sisal/dataset-store.cjs');
const {VALIDATION_CRITERIA}=require('../md06-statistical-models');
const {profileRows}=require('../champions/shared-scenario.cjs');
const {loadRegistry,readFrozen}=require('../champions/validation-data.cjs');
const {verify}=require('../champions/market-prospective.cjs');
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots');
const root=path.resolve(__dirname,'../..');
const validScore=s=>s&&['home','away'].every(k=>Number.isInteger(s[k])&&s[k]>=0);
function resultInventory(matches){
 const seen=new Map(),invalid=[],duplicates=[],conflicts=new Set();
 for(const m of matches){
  const key=String(m.competitionCode)+':'+String(m.id);
  if(!m.id||!m.homeTeam?.id||!m.awayTeam?.id||m.homeTeam.id===m.awayTeam.id||!Number.isFinite(Date.parse(m.kickoffUtc))||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||m.status!=='finished'||!validScore(m.score90)){invalid.push(key);continue;}
  if(seen.has(key)){const old=seen.get(key);if(JSON.stringify([old.homeTeam.id,old.awayTeam.id,old.score90,old.kickoffUtc])!==JSON.stringify([m.homeTeam.id,m.awayTeam.id,m.score90,m.kickoffUtc]))conflicts.add(key);else duplicates.push(key);}
  else seen.set(key,m);
 }
 const rows=[...seen].filter(([k])=>!conflicts.has(k)).map(([,m])=>m);
 const seasons=[...new Set(rows.map(m=>m.season))].sort().map(season=>({season,competitions:[...new Set(rows.filter(m=>m.season===season).map(m=>m.competitionCode))].sort().map(competition=>{const rr=rows.filter(m=>m.season===season&&m.competitionCode===competition);return {competition,fixtures:rr.length,outcomes:Object.fromEntries(['1','X','2'].map(o=>[o,rr.filter(m=>(m.score90.home>m.score90.away?'1':m.score90.home<m.score90.away?'2':'X')===o).length]))};})}));
 return {rows,summary:{input:matches.length,uniqueUsable:rows.length,invalid,duplicates,conflicts:[...conflicts],seasons}};
}
function oddsInventory(events,calendar,historical){
 const result=[],rejected=[];
 for(const e of events){
  const f=calendar.fixtures.find(f=>f.id===e.canonicalMatchId);
  const market=e.markets.find(m=>String(m.marketCode)==='3'&&m.marketName==='1X2 ESITO FINALE'&&m.variantName==='ESITO FINALE 1X2'&&m.threshold===null&&m.status==='open'&&(!m.periodScope||m.periodScope==='full-match'));
  const selections=['1','X','2'].map(n=>market?.selections.find(s=>s.name===n&&s.status==='open'&&s.providerSelectionId));
  const exact=e.providerEventId&&market?.providerMarketId&&selections.every(s=>Number.isFinite(s?.odds)&&s.odds>1);
  const canonicalKickoff=f?Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome')):NaN;
  const prematch=Date.parse(e.startsAt)===canonicalKickoff&&Date.parse(e.retrievedAt)<canonicalKickoff;
  if(!f||!exact||!prematch){rejected.push({matchId:e.canonicalMatchId,reason:!f?'CANONICAL_FIXTURE_MISSING':!exact?'EXACT_1X2_QUOTE_MISSING':'PREMATCH_RECEIPT_MISSING'});continue;}
  result.push({fixtureId:f.id,season:'2026-27',matchday:f.matchday,at:e.retrievedAt});
 }
 return {events:events.length,verifiedPrematch1x2:result.length,byMatchday:Object.fromEntries([...new Set(result.map(r=>r.matchday))].sort().map(d=>[d,result.filter(r=>r.matchday===d).length])),historical2023to2026ExactMatches:historical.filter(h=>result.some(r=>r.fixtureId===h.id)).length,rejected,limitation:'Only the inspected normalized provider archive is counted; raw files and unlinked odds are not presumed verified historical contracts.'};
}
function run(){
 const read=p=>readJsonFile(path.join(root,p));
 const paths=['data/normalized/uefa-europe-history-2023-26.json','data/sources/champions-pilot-match-stats-2025-27.json','data/sources/champions-team-history-map-2026-27.json','data/normalized/odds/sisal/champions-league.json','data/normalized/champions-league-2026-27.json','data/analysis/champions/event-validation/registry.json','data/generated/uefa-1x2-backtest.json'];
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 const before=Object.fromEntries(paths.map(p=>[p,hash(p)]));
 const [history,source,map,odds,calendar,,backtest]=paths.map(read),registry=loadRegistry();
 const inventory=resultInventory(history.matches),test=inventory.rows.filter(m=>m.season==='2025-26'&&m.competitionCode==='ucl');
 for(const season of inventory.summary.seasons)for(const competition of season.competitions){
  competition.resultSampleGates=Object.fromEntries(Object.entries(competition.outcomes).map(([outcome,positives])=>{
   const negatives=competition.fixtures-positives,reasons=[];
   if(competition.fixtures<VALIDATION_CRITERIA.clusters)reasons.push('INSUFFICIENT_INDEPENDENT_FIXTURES');
   if(positives<VALIDATION_CRITERIA.oneXTwoPositives||negatives<VALIDATION_CRITERIA.oneXTwoNegatives)reasons.push('EXACT_EVENT_CLASS_COUNTS_INSUFFICIENT');
   return [outcome,{positives,negatives,sampleSufficient:!reasons.length,reasons,approval:false}];
  }));
 }
 const byUefa=new Map(map.teams.map(t=>[String(t.uefaTeamId),source.teams.find(s=>s.name===t.team)]));
 const coverage=test.map(f=>{
  const teams=[byUefa.get(String(f.homeTeam.id)),byUefa.get(String(f.awayTeam.id))];
  const samples=teams.map(t=>t?profileRows(source,t,f.date):[]);
  const covered=samples.every(rr=>rr.length>=6&&['home','away'].every(v=>rr.filter(r=>r.venue===v&&Number.isFinite(r.for.goals)&&Number.isFinite(r.against.goals)).length>=2));
  return {fixtureId:f.id,date:f.date,canonicalTeamsResolved:teams.every(Boolean),samples:samples.map(r=>r.length),sharedProfileCovered:covered};
 });
 const oldSnapshots=readFrozen(path.join(root,'data/predictions/champions-event-snapshots'));
 const marketDir=path.join(root,'data/predictions/champions-market-prospective');
 const marketFiles=fs.readdirSync(marketDir,{recursive:true}).filter(p=>p.endsWith('.json'));
 const marketCaptures=marketFiles.map(p=>readJsonFile(path.join(marketDir,p))),valid=marketCaptures.filter(verify);
 const modelIds=[...new Set(valid.flatMap(s=>s.events.filter(e=>e.target.metric==='result').map(e=>e.modelId)))];
 const report={schemaVersion:1,asOf:new Date().toISOString(),status:'AUDIT_ONLY_NO_APPROVAL',criteria:{...VALIDATION_CRITERIA},inputHashes:before,resultHistory:inventory.summary,domesticInputs:{matches:source.matches.length,leagues:[...new Set(source.matches.map(m=>m.league))].length,earliestReceipt:source.matches.map(m=>m.source?.retrievedAt).filter(Boolean).sort()[0],latestReceipt:source.matches.map(m=>m.source?.retrievedAt).filter(Boolean).sort().at(-1),historicalUclTestFixtures:test.length,bothTeamsMapped:coverage.filter(r=>r.canonicalTeamsResolved).length,fixturesWithAsOfProfiles:coverage.filter(r=>r.sharedProfileCovered).length,coverage,rule:'Exact current UEFA-to-canonical map only; use production profileRows with each historical date cutoff and the existing 6-match / 2-per-venue coverage rule.'},odds:oddsInventory(odds.events,calendar,inventory.rows),evidence:{registryAt:registry.generatedAt,eligibleObservations:registry.eligible,approvals:registry.events.filter(e=>e.approvable).length,families:registry.families.map(f=>({modelId:JSON.parse(f.key)[0],metric:f.metric,metrics:f.metrics,reasons:f.reasons})),events:registry.events.map(e=>({modelId:e.modelId,metric:e.target.metric,direction:e.target.direction,fixtures:e.metrics.matchClusters,positives:e.positives,negatives:e.negatives,reasons:e.reasons})),legacySnapshots:oldSnapshots.snapshots.length,legacyQuarantined:oldSnapshots.exclusions.length,md04:{captureFiles:marketCaptures.length,validCaptureFiles:valid.length,independentFixtures:new Set(valid.map(s=>s.fixtureId)).size,resultModels:modelIds.map(id=>({modelId:id,independentFixtures:new Set(valid.filter(s=>s.events.some(e=>e.modelId===id&&e.target.metric==='result')).map(s=>s.fixtureId)).size})),rule:'Revisions are not independent fixtures and are not pooled into legacy model evidence.'}},existingElo:{protocol:backtest.holdoutProtocol,championsTest:backtest.holdout.model.byCompetition.ucl,baseline:backtest.holdout.baseline.byCompetition.ucl,limitation:'Existing historical Elo experiment only. Its reported 2025-26 test has already been inspected; tuning a new model against these scores cannot be called a new untouched holdout.'},decision:{historicalResultResearch:'READY_FOR_DIAGNOSTIC_EUROPEAN_RATING_RESEARCH',productionSharedHistoricalReplay:coverage.some(r=>r.sharedProfileCovered)?'PARTIAL_AS_OF_COVERAGE':'BLOCKED_NO_AS_OF_DOMESTIC_PROFILES_IN_INSPECTED_INPUT',historicalProviderComparison:'NO_VERIFIED_2023_26_CONTRACTS_IN_INSPECTED_NORMALIZED_ARCHIVE',newModelOperationalApproval:'NOT_AVAILABLE',next:['Use European scores for an isolated retrospective rating comparison, labelled diagnostic; keep 2025-26 historical test separate from new validation claims.','To replay the current domestic adapter historically, acquire date-versioned domestic profiles and exact team mappings; never move receipt timestamps backward.','Freeze the new model, input policy, baseline and abstention rules before collecting a new independent holdout.','Keep operational result suggestions blocked until the unchanged exact-model/event gates pass.']}};
 const output=path.join(root,'output/champions-result-validation/history-audit.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 for(const p of paths)assert.equal(hash(p),before[p],p+' was modified');
 console.log(JSON.stringify({output:output,resultHistory:report.resultHistory,domestic:{historicalUclTestFixtures:test.length,bothTeamsMapped:report.domesticInputs.bothTeamsMapped,fixturesWithAsOfProfiles:report.domesticInputs.fixturesWithAsOfProfiles,earliestReceipt:report.domesticInputs.earliestReceipt},odds:report.odds,evidence:{eligible:registry.eligible,families:report.evidence.families.map(f=>({metric:f.metric,fixtures:f.metrics.matchClusters})),approvals:report.evidence.approvals},decision:report.decision}));
 return report;
}
if(require.main===module)run();
module.exports={resultInventory,oddsInventory,run};
