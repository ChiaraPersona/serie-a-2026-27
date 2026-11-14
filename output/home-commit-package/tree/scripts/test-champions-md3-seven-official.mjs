import { readJsonFile as storageReadJson } from './sisal/dataset-store.cjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {sharedForecastsForMatch,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
import {md3ProbableMarkup} from '../js/pages/champions-md3-probable.mjs';
import {createPage} from '../js/pages/betting.js';
const read=p=>storageReadJson(p),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const folder='data/analysis/champions/official-seven-2026-10-20',before=read(folder+'/before.json');
const source=read('data/sources/champions-official-formations-md03-2026-27.json'),individual=read('data/derived/champions-md03/official-individuals-seven-v2-2026-10-20.json'),artifact=read('data/derived/champions-md03/market-catalog-official-seven-v2-2026-10-20.json');
const registry=read('data/normalized/official-starter-registry.json'),ids=new Set(artifact.matches.map(m=>m.matchId));globalThis.officialStarterPolicy.configure(registry);
for(const file of ['data/normalized/champions-league-2026-27.json','data/normalized/odds/sisal/champions-league.json','data/normalized/schedina-champions-md03.json','data/derived/champions-md03/upcoming-forecasts.json'])assert.equal(hash(file),before[file].sha256,file+' changed');
for(const f of before['data/sources/champions-official-formations-md03-2026-27.json'].data.fixtures)assert.deepEqual(source.fixtures.find(x=>x.fixtureId===f.fixtureId),f);
for(const [id,row]of Object.entries(before['data/normalized/official-starter-registry.json'].data))if(!ids.has(id))assert.deepEqual(registry[id],row);
const workspace=await loadChampionsWorkspaceMd3Derived(async n=>read('data/normalized/'+n),3);
const base=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json'),two=read('data/derived/champions-md03/market-catalog-official-two-v1-2026-10-20.json'),sabah=read('data/derived/champions-md03/market-catalog-sabah-dortmund-v1-2026-10-20.json');
const overrides=new Map([...two.matches,...sabah.matches].map(m=>[m.matchId,m])),oldUpcoming=before['data/derived/champions-md03/upcoming-forecasts.json'].data;
for(const m of workspace.marketCatalog.matches.filter(m=>!ids.has(m.matchId))){
 const old=structuredClone(overrides.get(m.matchId)||base.matches.find(x=>x.matchId===m.matchId)),extra=oldUpcoming.matches.find(x=>x.matchId===m.matchId);
 assert.deepEqual(m,extra?{...old,selections:old.selections.concat(extra.selections),suggestions:old.suggestions.concat(extra.suggestions),forecastCoverage:extra.forecastCoverage}:old,'Foreign fixture changed: '+m.matchId);
}
let chosen=0,duo=0;
for(const f of individual.fixtures){
 const starters=f.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter'));assert.equal(starters.length,22);assert.equal(new Set(starters.map(p=>p.playerId)).size,22);
 assert.deepEqual([...registry[f.fixtureId].ids].sort(),starters.map(p=>p.playerId).sort());assert(md3ProbableMarkup(f).includes('Formazioni ufficiali'));
 for(const t of f.teams)for(const p of t.players){if(p.projectedRole==='bench')assert.equal(p.eventProbabilities,null);if(p.baseline?.channels)for(const c of Object.values(p.baseline.channels))assert.equal(c.estimatedMinutes,0);if(p.projectedShots!==null){assert(p.projectedSOT<=p.projectedShots);assert(Number.isFinite(p.expectedMinutes));}}
 const match=artifact.matches.find(m=>m.matchId===f.fixtureId),shown=sharedForecastsForMatch(workspace.marketCatalog,f.fixtureId,workspace.fixtures.find(x=>x.id===f.fixtureId));assert.equal(shown.length,match.suggestions.length);chosen+=shown.length;
 for(const leg of shown){assert(hasVerifiedPlayableQuote(leg));assert.equal(leg.qualifiedSelection,false);assert.notEqual(leg.selection,'12');if(leg.marketScope==='player'){
  assert(starters.some(p=>p.playerId===leg.playerId));assert.equal(leg.lineupEligibility.status,'official-starter');assert(leg.betSelection.market.bookmakerSemantics.duo);duo++;
  for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[key],null);
  assert.equal(leg.betSelection.evaluation.individualReference.appliedToDuo,false);assert(Number.isFinite(leg.betSelection.evaluation.individualReference.modelProbabilityPct));assert.equal(leg.betSelection.market.bookmakerSemantics.postsAndCrossbarIncluded,leg.suggestionAnalysis.family==='sot');
 }}
}
assert.equal(chosen,85);assert.equal(duo,40);assert.equal(new Set(workspace.all.map(l=>l.selectionId)).size,workspace.all.length);
const html=createPage({load:async n=>read('data/normalized/'+n),esc:String,dateOnly:String,hero:()=>''}).championsWorkspaceMarkup(workspace);assert(!html.includes('undefined soglie'));assert(html.includes('formazioni ufficiali'));
const stale=oldUpcoming.matches.flatMap(m=>m.selections).find(l=>l.playerId==='florian-wirtz'&&l.suggestionAnalysis.suggested);assert(stale);
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};globalThis.officialStarterPolicy.configure({});
const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3});assert.equal(store.add(stale).status,'ADDED');
globalThis.officialStarterPolicy.configure(registry);store.reconcile(workspace.all);assert.equal(store.getSnapshot().selections.length,0);
const valid=artifact.matches.flatMap(m=>m.selections).find(l=>l.marketScope==='player'&&l.suggestionAnalysis.suggested);assert.equal(store.add(valid).status,'ADDED');store.reconcile(workspace.all);assert.equal(store.getSnapshot().selections[0].selectionId,valid.selectionId);
const samu=individual.fixtures.find(f=>f.fixtureId.endsWith('04')).teams[0].players.find(p=>p.playerId==='samu');assert.equal(samu.providerPlayerId,'364815');assert.equal(samu.role,'forward');assert.equal(samu.historicalMinutes,1881);
const result={status:'PASS',fixtures:7,officialStarters:154,selected:chosen,verifiedDuo:duo,foreignFixturesPreserved:11,oddsAndArchiveUnchanged:true,savedNonstarterPurged:true,savedStarterRetained:true,duoProbabilityAndEVNull:true};fs.writeFileSync(folder+'/tests.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
