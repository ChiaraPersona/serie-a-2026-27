import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {sharedForecastsForMatch,hasVerifiedPlayableQuote,isCanonicalModelForecast} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
import {createPage} from '../js/pages/betting.js';
const require=createRequire(import.meta.url),{publicationIdentity,buildPublication}=require('./champions/md3-publication-policy.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),load=async name=>read('data/normalized/'+name);
const current=read('data/normalized/schedina-champions-md03.json'),before=read('output/champions-md3-md7-policy/schedina-champions-md03.json.before');
const workspace=await loadChampionsWorkspace(load,3),all=workspace.all,selected=workspace.fixtures.flatMap(f=>sharedForecastsForMatch(workspace.marketCatalog,f.id,f));
assert.equal(workspace.fixtures.length,18);assert.equal(current.summary.approvedSelections,0);assert.equal(current.marketCatalog.myCombo.length,18);
assert.deepEqual(current.slips,before.slips);
const old=new Map(before.marketCatalog.matches.flatMap(m=>m.selections).map(l=>[l.selectionId,l]));
for(const leg of all){
 const prior=old.get(leg.selectionId);assert(prior,'Unexpected contract '+leg.selectionId);
 assert.deepEqual(leg.betSelection.quote,prior.betSelection.quote);
 assert.deepEqual(leg.betSelection.identity,prior.betSelection.identity);
 for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[key],prior.betSelection.evaluation[key]);
}
for(const fixture of workspace.fixtures){
 const rows=sharedForecastsForMatch(workspace.marketCatalog,fixture.id,fixture);
 assert.equal(new Set(rows.map(publicationIdentity)).size,rows.length);
 for(const leg of rows){
  assert(leg.suggestionAnalysis.suggested);assert(!leg.approvedPreliminary);
  assert(['APPROVED','PRELIMINARY'].includes(leg.publication.status));
  assert(hasVerifiedPlayableQuote(leg)||isCanonicalModelForecast(leg));
  assert.equal(leg.qualifiedSelection,leg.publication.status==='APPROVED');
  if(leg.qualifiedSelection){assert(leg.betSelection.evaluation.validation.approvable);assert(leg.suggestionAnalysis.sharedAdmission.suggested);}
  else assert(leg.publication.reasons.includes('CHAMPIONS_EVENT_MODEL_NOT_VALIDATED'));
  if(leg.marketScope==='player'){
   const inputs=read('data/normalized/champions-md03-probable-individuals-2026-27.json').fixtures.find(f=>f.fixtureId===fixture.id);
   const p=inputs.teams.flatMap(t=>t.players).find(p=>p.playerId===leg.playerId);
   assert.equal(p.projectedRole,'starter');assert.equal(p.blockers.length,0);
  }
  if(leg.betSelection.market.bookmakerSemantics?.duo)for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[key],null);
  assert(!(/DOPPIA CHANCE/.test(leg.market)&&leg.selection==='12'));
 }
}
for(const combo of current.marketCatalog.myCombo){assert.equal(combo.status,'N/D');assert.equal(combo.legs.length,0);assert.equal(combo.probabilityPct,null);assert.equal(combo.expectedValuePct,null);}
const page=createPage({load,esc:v=>String(v??''),dateOnly:v=>String(v||'').slice(0,10),hero:()=>''});
const html=page.championsWorkspaceMarkup(workspace);
assert.equal((html.match(/data-selection-row/g)||[]).length,selected.length);
for(const forbidden of ['Altri mercati disponibili','Previsioni della partita','betting-market-family-heading','Singola preliminare approvata'])assert(!html.includes(forbidden),forbidden);
const target=selected.find(l=>l.marketScope==='player'),fixtureData=read('data/normalized/champions-md03-preliminary-2026-27.json'),individuals=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const mutation=await buildPublication({matches:workspace.marketCatalog.matches,fixtures:fixtureData.fixtures,individuals,evidence:{officialRegistry:{[target.matchId]:{ids:[]}},preview:read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json'),pilot:read('data/normalized/champions-pilot-volume-backtest.json'),calibration:read('data/analysis/champions/model-calibration-audit-2026-10-11.json')}});
assert(!mutation.matches.find(m=>m.matchId===target.matchId).selections.some(l=>l.playerId===target.playerId&&l.suggestionAnalysis.suggested));
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3,forecastPolicy:'SERIE_A_CURRENT'});assert.equal(store.add(target).status,'ADDED');store.reconcile(selected.filter(l=>l.selectionId!==target.selectionId));assert(store.getSnapshot().assessment.issues.some(i=>i.type==='MISSING_FROM_CURRENT_DATA'));
for(const [file,hash] of Object.entries(read('output/champions-md3-md7-policy/protected.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
const report={status:'PASS',fixtures:18,evaluated:all.length,selected:selected.length,approved:selected.filter(l=>l.qualifiedSelection).length,preliminary:selected.filter(l=>!l.qualifiedSelection).length,comboUnavailable:18,quotesAndProbabilitiesUnchanged:true,serieAUnchanged:true};fs.writeFileSync('output/champions-md3-md7-policy/test-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
