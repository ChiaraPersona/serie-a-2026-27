import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {sharedForecastsForMatch,isCanonicalModelForecast} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
import {createPage} from '../js/pages/betting.js';
const require=createRequire(import.meta.url),{eligible}=require('./build-champions-upcoming-forecasts.cjs');
const load=async n=>JSON.parse(fs.readFileSync('data/normalized/'+n));
const overlay=JSON.parse(fs.readFileSync('data/derived/champions-md03/upcoming-forecasts.json'));
const base=await loadChampionsWorkspaceMd3Derived(load,3,{upcoming:false}),current=await loadChampionsWorkspaceMd3Derived(load,3);
let generated=0,published=0;
for(const fixture of current.fixtures){
 const old=base.marketCatalog.matches.find(m=>m.matchId===fixture.id),match=current.marketCatalog.matches.find(m=>m.matchId===fixture.id);
 const addition=overlay.matches.find(m=>m.matchId===fixture.id);
 if(!addition){assert.deepEqual(match,old);continue;}
 assert(eligible(fixture,Date.parse(overlay.generatedAt)));
 assert.deepEqual(match.selections.slice(0,old.selections.length),old.selections,'Original forecasts preserved');
 const players=match.forecastCoverage.distributions;
 assert.equal(players.length,22);
 for(const p of players)for(const metric of ['shots','sot'])if(p[metric]){
  assert.equal(p[metric].length,metric==='shots'?4:3);
  p[metric].forEach((v,i)=>{assert(v.probability>=0&&v.probability<=1);if(i)assert(v.probability<=p[metric][i-1].probability);generated++;});
 }
 const shown=sharedForecastsForMatch(current.marketCatalog,fixture.id,fixture);
 assert.equal(shown.length,old.suggestions.length+addition.suggestions.length);
 for(const leg of addition.selections){
  assert(isCanonicalModelForecast(leg));assert.equal(leg.qualifiedSelection,false);
  assert.equal(leg.odds,null);assert.equal(leg.betSelection.evaluation.expectedValuePct,null);
  assert.equal(leg.betSelection.market.bookmakerSemantics,null);
  const p=players.find(p=>p.playerId===leg.playerId);assert(p&&!p.blockers.length);
  assert(p.expectedMinutes>=55);assert.equal(leg.betSelection.evaluation.probabilitySemantics,'CONDITIONAL_ON_PROBABLE_START');
  if(leg.suggestionAnalysis.suggested){assert(shown.some(l=>l.selectionId===leg.selectionId));published++;}
 }
 assert(!shown.some(l=>l.selection==='12'));
}
assert(generated>0&&published>0);
assert(overlay.matches.flatMap(m=>m.selections).some(l=>l.suggestionAnalysis.suggested&&l.suggestionAnalysis.family==='shots'&&l.threshold===3.5),'Statistically supported 4+ shots retained');
assert.equal(new Set(current.all.map(l=>l.selectionId)).size,current.all.length);
const html=createPage({load,esc:String,dateOnly:String,hero:()=>''}).championsWorkspaceMarkup(current);
assert.equal((html.match(/data-selection-row/g)||[]).length,current.marketCatalog.matches.reduce((n,m)=>n+m.suggestions.length,0));
assert.equal((html.match(/data-champions-forecast-coverage/g)||[]).length,overlay.matches.length);
const leg=overlay.matches.flatMap(m=>m.selections).find(l=>l.suggestionAnalysis.suggested);
globalThis.officialStarterPolicy={eligible:item=>item.playerId!==leg.playerId};
assert(!sharedForecastsForMatch(current.marketCatalog,leg.matchId,current.fixtures.find(f=>f.id===leg.matchId)).some(item=>item.playerId===leg.playerId));
delete globalThis.officialStarterPolicy;
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3,forecastPolicy:'SERIE_A_CURRENT'});
assert.equal(store.add(leg).status,'ADDED');
store.reconcile(current.all.filter(l=>l.selectionId!==leg.selectionId));
assert(store.getSnapshot().assessment.issues.some(i=>i.type==='MISSING_FROM_CURRENT_DATA'));
assert(!eligible({status:'scheduled',date:'2026-10-20',kickoff:'18:45'},Date.parse('2026-10-20T16:54:01Z')));
assert(!eligible({status:'finished',date:'2026-10-21',kickoff:'21:00'},Date.parse(overlay.generatedAt)));
// Baseline at task start: data, original projections, Serie A engines and historic forecasts stay byte-identical.
const changed=execFileSync('git',['diff','--name-only','eb7cdee6','--','data','scripts/predictions','scripts/md06-player-forecast-integration.js','scripts/md06-suggested-forecasts.js'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.deepEqual(changed,['data/derived/champions-md03/upcoming-forecasts.json']);
const result={status:'PASS',generated,published,originalForecastsPreserved:true,startedFixturesPreserved:true,serieAAndStatisticsUnchanged:true};
fs.writeFileSync('output/champions-upcoming-forecasts/tests.json',JSON.stringify(result,null,2));console.log(result);
