import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {createPage} from '../js/pages/betting.js';
const require=createRequire(import.meta.url);
const {evaluateRequirements,selectRequirements}=require('./champions/md3-selection-requirements.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const directory='output/champions-selection';
const catalog=read(directory+'/stage/champions-md03-preliminary-2026-27.json');
const before=read(directory+'/before.json');
const load=async name=>name==='champions-md03-preliminary-2026-27.json'?catalog:read('data/normalized/'+name);
// Serialization may add only selection requirements, never prices, forecasts or identities.
const stripped=structuredClone(catalog);delete stripped.selectionPolicy;
for(const f of stripped.fixtures){f.individualForecasts=null;for(const m of f.oddsEvent.playerMarkets)for(const s of m.selections)delete s.selectionRequirements;}
assert.deepEqual(stripped,before);
const workspace=await loadChampionsWorkspace(load,3);
const visible=workspace.all.filter(l=>Number.isFinite(l.betSelection.evaluation.modelProbabilityPct));
assert.equal(visible.length,1721);
assert.equal(visible.filter(l=>l.suggestionAnalysis.suggested).length,55);
assert.equal(visible.filter(l=>l.selectionStatus==='APPROVED').length,7);
assert.equal(visible.filter(l=>l.qualifiedSelection).length,0);
const raw=read('data/normalized/odds/sisal/champions-league.json');
for(const f of catalog.fixtures){
 const e=raw.events.find(e=>e.canonicalMatchId===f.fixtureId);
 assert.equal(e.canonicalDate,f.date);
 for(const m of f.oddsEvent.playerMarkets)for(const s of m.selections){
  const rm=e.markets.find(x=>x.providerMarketId===m.providerMarketId);
  const rs=rm.selections.find(x=>x.providerSelectionId===s.providerSelectionId);
  assert.equal(rs.odds,s.odds);assert.equal(rs.name,s.name);assert.equal(rm.threshold,m.threshold);
  assert.equal(rm.marketCode,m.marketCode);assert.equal(rm.variantName,m.variantName);
 }
}
for(const leg of workspace.all){
 const e=leg.betSelection.evaluation;
 assert.equal(e.prudentProbabilityPct,null);assert.equal(e.conservativeExpectedValuePct,null);
 assert.equal(e.validation.approvable,false);
 const s=e.uncertainty.sensitivity;
 if(s){assert(s.minimumPct<=e.modelProbabilityPct);assert(s.minimumPct>=0);assert(s.probabilitiesPct.every(p=>p>=0&&p<=100));assert.equal(s.validated,false);}
 assert(!['Alta','Media'].includes(leg.betSelection.operational.reliability.level));
 if(leg.marketScope==='player'){
  assert.equal(leg.betSelection.operational.reliability.evidence.startingProbability,null);
  assert.equal(leg.scenarioAnalysis.status,'UNVERIFIABLE');
  assert.equal(leg.betSelection.evaluation.probabilitySemantics,'CONDITIONAL_ON_PROBABLE_START');
 }
 if(!leg.approvedPreliminary)assert(leg.suggestionAnalysis.reasons.includes('CHAMPIONS_EVENT_MODEL_NOT_VALIDATED'));
}
const individuals=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const playerLeg=visible.find(l=>l.marketScope==='player');
const f=catalog.fixtures.find(f=>f.fixtureId===playerLeg.matchId);
const inf=structuredClone(individuals.fixtures.find(f=>f.fixtureId===playerLeg.matchId));
const p=inf.teams.flatMap(t=>t.players).find(p=>p.playerId===playerLeg.playerId);
p.projectedSOT=p.projectedShots+1;
const evidence={preview:read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json'),pilot:read('data/normalized/champions-pilot-volume-backtest.json')};
const bad=evaluateRequirements([playerLeg],f,inf,evidence)[0];
assert.equal(bad.scenarioAnalysis.status,'CONTRADICTORY');
assert(bad.scenarioAnalysis.checks.contradictions.includes('PLAYER_SOT_EXCEED_SHOTS'));
assert.equal(bad.betSelection.operational.reliability.level,'Non valutabile');
// Positive control exercises the real selector and consumer, never writes synthetic data.
const candidate=structuredClone(visible.find(l=>!l.approvedPreliminary&&l.suggestionAnalysis.family==='goals'&&l.betSelection.evaluation.modelProbabilityPct>70&&l.scenarioAnalysis.status==='VERIFIED'));
candidate.betSelection.evaluation.prudentProbabilityPct=65;
candidate.betSelection.evaluation.validation.approvable=true;
candidate.betSelection.operational.reliability.level='Media';
const selected=selectRequirements([candidate])[0];
assert.equal(selected.selectionStatus,'SELECTED');assert.equal(selected.qualifiedSelection,true);
assert.equal(selected.betSelection.evaluation.modelProbabilityPct,candidate.betSelection.evaluation.modelProbabilityPct);
assert.equal(selectRequirements([bad])[0].qualifiedSelection,false);
assert.deepEqual(selectRequirements([candidate]),selectRequirements([candidate]));
const duplicate=structuredClone(candidate);duplicate.selectionId+=':duplicate';duplicate.betSelection.selectionId=duplicate.selectionId;
assert.equal(selectRequirements([candidate,duplicate]).filter(l=>l.qualifiedSelection).length,1);
const locked=structuredClone(candidate);locked.approvedPreliminary=true;
assert.equal(selectRequirements([locked,duplicate]).filter(l=>l.qualifiedSelection).length,0);
const app={innerHTML:''};
globalThis.document={querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[]};
globalThis.location={search:'?competizione=champions&giornata=3'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=createPage({esc,load,dateOnly:v=>String(v||'').slice(0,10),hero:()=>''});
await page.render();assert.equal((app.innerHTML.match(/data-selected-forecast="true"/g)||[]).length,55);
const injected=structuredClone(workspace);
injected.all=injected.all.map(l=>l.selectionId===selected.selectionId?selected:l);
for(const match of injected.marketCatalog.matches)match.selections=match.selections.map(l=>l.selectionId===selected.selectionId?selected:l);
const html=page.championsWorkspaceMarkup(injected);
assert.equal((html.match(/data-selected-forecast="true"/g)||[]).length,56);
assert.equal((html.match(/Singola preliminare approvata/g)||[]).length,7);
for(const [file,hash] of Object.entries(read('output/champions-block3a/protected.json'))){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
}
const counts=key=>visible.reduce((acc,l)=>{const k=key(l);acc[k]=(acc[k]||0)+1;return acc;},{});
const reasons={};for(const l of visible.filter(l=>!l.approvedPreliminary))for(const r of l.suggestionAnalysis.reasons)reasons[r]=(reasons[r]||0)+1;
const result={visible:visible.length,main:55,approved:7,newSelected:0,newApproved:0,scenario:counts(l=>l.scenarioAnalysis.status),reliability:counts(l=>l.betSelection.operational.reliability.level),sensitivity:visible.filter(l=>l.betSelection.evaluation.uncertainty.sensitivity).length,validatedPrudent:0,exactQuoted:visible.filter(l=>l.betSelection.quote.decimal!==null).length,byFamily:counts(l=>l.suggestionAnalysis.family),exclusions:reasons,positiveSelectorAndRendererControl:'PASS',integrity:'PASS'};
fs.writeFileSync(directory+'/result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
