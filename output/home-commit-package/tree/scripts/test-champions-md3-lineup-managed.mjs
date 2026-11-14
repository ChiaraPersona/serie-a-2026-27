import { readJsonFile as storageReadJson } from './sisal/dataset-store.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {sharedForecastsForMatch,isCanonicalModelForecast,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const require=createRequire(import.meta.url);
const {buildSharedIndividualCatalog,predictionRows}=require('./champions/md3-shared-forecast-integration.cjs');
const {evaluateCandidate,candidatePool}=require('./md06-player-forecast-integration');
const read=p=>storageReadJson(p);
const data=read('data/normalized/schedina-champions-md03.json'),individuals=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const source=read(data.lineupInput.path),raw=read(source.source.rawFile),db=read('data/normalized/champions-md03-player-database-2026-27.json');
const odds=read('data/normalized/odds/sisal/champions-league.json');
const workspace=await loadChampionsWorkspace(async name=>read('data/normalized/'+name),3);
assert(workspace.lineupManaged);assert.equal(source.status,'probable');assert.equal(source.teams.length,36);
assert.equal(source.teams.flatMap(t=>t.starters).length,396);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(data.lineupInput.path)).digest('hex'),individuals.source.sha256);
const selected=workspace.fixtures.flatMap(f=>sharedForecastsForMatch(workspace.marketCatalog,f.id,f));
assert.equal(selected.length,data.marketCatalog.totals.suggestions);
assert(selected.every(l=>l.suggestionAnalysis.suggested));
assert.deepEqual(data.slips,read('output/champions-md3-lineup-management-20261020/schedina-champions-md03.json.before').slips);
for(const t of source.teams){
 const observed=raw.teams.find(r=>r.teamId===t.teamId&&r.fixtureId===t.fixtureId);
 assert.deepEqual(t.starters.map(p=>[p.playerId,p.sourceName,p.shirtNumber]),observed.players.map(p=>[p.playerId,p.sourceName,p.shirtNumber]));
}
const playerLegs=selected.filter(l=>l.marketScope==='player');assert(playerLegs.length>0);
for(const f of individuals.fixtures){
 const prediction=predictionRows(f,db);
 for(const l of playerLegs.filter(l=>l.matchId===f.fixtureId)){
  const t=f.teams.find(t=>t.teamId===l.teamId),p=t.players.find(p=>p.playerId===l.playerId);
  assert(p&&p.projectedRole==='starter'&&p.availability==='probable-starter');assert.equal(p.blockers.length,0);
  const candidate=candidatePool(prediction.shooters).find(c=>c.player.playerId===l.playerId);
  assert(candidate);const metric=l.suggestionAnalysis.family;
  const assessment=evaluateCandidate(candidate.player,metric,candidate.sources,l.lineupEligibility);
  assert(assessment.eligible);assert.equal(l.threshold,assessment.threshold.count-.5);
  assert.equal(l.betSelection.evaluation.individualReference.modelProbabilityPct,Number((assessment.threshold.probability*100).toFixed(2)));
  const q=l.betSelection.quote,e=l.betSelection.evaluation;
  if(q.decimal===null){assert(isCanonicalModelForecast(l));assert.equal(e.expectedValuePct,null);assert.equal(q.source,null);}
  else{
   assert(hasVerifiedPlayableQuote(l));
   const event=odds.events.find(e=>e.canonicalMatchId===l.matchId),m=event.markets.find(m=>m.providerMarketId===l.providerMarketId),s=m.selections.find(s=>s.providerSelectionId===l.providerSelectionId);
   assert.equal(s.odds,q.decimal);assert.equal(s.status,'open');assert.equal(m.status,'open');assert.equal(Number(m.threshold),l.threshold);
   assert.deepEqual(m.providerPlayerIds,[l.betSelection.market.bookmakerSemantics.providerPlayerId]);
   for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(e[key],null);
   assert.equal(e.individualReference.appliedToDuo,false);
   assert(q.source.snapshotPath.includes('champions-league'));
  }
 }
}
assert(workspace.all.every(l=>l.selection!=='UNDER'));
assert(workspace.all.every(l=>!(/DOPPIA CHANCE/.test(l.market)&&l.selection==='12')));
// A player moved to the bench must not keep their former forecast or donate it
// to a replacement. This exercises the actual shared integration, not a mock.
const target=playerLegs[0],modified=structuredClone(individuals);
const old=modified.fixtures.find(f=>f.fixtureId===target.matchId).teams.find(t=>t.teamId===target.teamId).players.find(p=>p.playerId===target.playerId);
old.projectedRole='bench';old.availability='predicted-bench';
const rebuilt=buildSharedIndividualCatalog({baseMatches:workspace.marketCatalog.matches.map(m=>({...m,selections:m.selections.filter(l=>l.marketScope!=='player')})),individuals:modified,database:db,odds,identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
assert(!rebuilt.matches.flatMap(m=>m.selections).some(l=>l.matchId===target.matchId&&l.playerId===target.playerId));
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const store=createPersonalBetslipStore({storage}),context={competition:'champions',season:'2026-27',matchday:3,forecastPolicy:'SERIE_A_CURRENT'};
store.setContext(context);
const quoted=playerLegs.find(l=>hasVerifiedPlayableQuote(l)),unquoted=playerLegs.find(isCanonicalModelForecast);
assert.equal(store.add(quoted).status,'ADDED');assert.equal(store.add(quoted).status,'DUPLICATE');
assert.equal(store.add(unquoted).status,'ADDED');assert(store.getSnapshot().assessment.pendingModelQuote);assert.equal(store.getSnapshot().assessment.theoreticalCombinedOdds,null);
const restored=createPersonalBetslipStore({storage});restored.setContext(context);assert.equal(restored.getSnapshot().selections.length,2);
restored.reconcile(workspace.all);assert(restored.getSnapshot().selections.every(l=>l.dataStatus==='CURRENT'));
restored.reconcile(workspace.all.filter(l=>l.selectionId!==quoted.selectionId));assert(restored.getSnapshot().assessment.issues.some(i=>i.type==='MISSING_FROM_CURRENT_DATA'));
restored.setContext({competition:'champions',season:'2026-27',matchday:2});assert.equal(restored.getSnapshot().selections.length,0);
const reg=read('data/normalized/official-starter-registry.json');assert(!Object.keys(reg).some(k=>k.startsWith('ucl-2026-27-md03-')),'Probable must not activate official policy');
for(const [file,hash] of Object.entries(read('output/champions-md3-lineup-management-20261020/protected.json'))){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);}
console.log(JSON.stringify({status:'PASS',...data.marketCatalog.totals,rawLineupCoverage:36,probableStarters:396,unresolved:individuals.summary.unresolvedStarters,foreignDataUnchanged:true,benchDemotion:'PASS',storeReload:'PASS',duoProbabilityIsolation:'PASS'}));
