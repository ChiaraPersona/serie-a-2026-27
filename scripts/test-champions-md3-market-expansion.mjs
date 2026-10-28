import { readJsonFile as storageReadJson } from './sisal/dataset-store.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {md3IndividualMarkets,md3IndividualCandidates} from '../js/pages/champions-md3-individual-markets.mjs';
import {createPage} from '../js/pages/betting.js';
import {createPersonalBetslipStore,assessSelections} from '../js/pages/personal-betslip-store.mjs';
const read=p=>storageReadJson(p),dir='output/champions-block3a';
const stage=process.argv.includes('--live')?'data/normalized':dir+'/stage';
const catalog=read(stage+'/champions-md03-preliminary-2026-27.json'),before=read(dir+'/catalog-before.json');
const load=async name=>name==='champions-md03-preliminary-2026-27.json'?catalog:read('data/normalized/'+name);
const individuals=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const shortlist=md3IndividualMarkets(individuals),candidates=md3IndividualCandidates(individuals);
assert.equal(shortlist.length,48);assert.equal(shortlist.filter(s=>s.marketFamily==='SOT').length,3);
assert.equal(shortlist.filter(s=>s.marketFamily==='Tiri'&&s.threshold===1).length,39);
assert.equal(shortlist.filter(s=>s.marketFamily==='Tiri'&&s.threshold===2).length,6);
assert(candidates.some(s=>s.marketFamily==='Tiri'&&s.threshold===3));assert(candidates.some(s=>s.marketFamily==='SOT'&&s.threshold===2));
for(const fixture of individuals.fixtures)for(const team of fixture.teams)for(const player of team.players){
 const rows=candidates.filter(c=>c.matchId===fixture.fixtureId&&c.playerId===player.playerId);
 if(rows.length){assert.equal(player.projectedRole,'starter');assert.equal(player.availability,'probable-starter');assert.equal(player.blockers.length,0);assert(Number.isFinite(player.expectedMinutes));
  for(const family of ['Tiri','SOT']){const ordered=rows.filter(r=>r.marketFamily===family).sort((a,b)=>a.threshold-b.threshold);ordered.forEach((r,i)=>{assert(r.modelProbability>=0&&r.modelProbability<=1);if(i)assert(ordered[i-1].modelProbability>=r.modelProbability);});}
 }else if(!Number.isFinite(player.projectedShots)||player.projectedRole==='bench')assert.equal(rows.length,0);
}
const rawOdds=read('data/normalized/odds/sisal/champions-league.json');
for(const f of catalog.fixtures){
 const original=before.fixtures.find(x=>x.fixtureId===f.fixtureId);assert.deepEqual(f.forecast,original.forecast);
 const event=rawOdds.events.find(e=>e.canonicalMatchId===f.fixtureId);assert.equal(event.canonicalDate,f.date);
 for(const team of f.forecast.teamProjections)for(const lines of Object.values(team.lines||{})){
  const sorted=[...lines].sort((a,b)=>a.threshold-b.threshold);sorted.forEach((line,i)=>{assert(Math.abs(line.overPct+line.underPct-100)<0.11);if(i)assert(sorted[i-1].overPct>=line.overPct);});
 }

 for(const m of f.oddsEvent.playerMarkets){const raw=event.markets.find(x=>x.providerMarketId===m.providerMarketId);assert(raw);assert.equal(m.marketName,raw.marketName);assert.equal(m.threshold,raw.threshold);
 for(const s of m.selections){const price=raw.selections.find(x=>x.providerSelectionId===s.providerSelectionId);assert.equal(price.odds,s.odds);assert.equal(price.name,s.name);
 if(m.family==='double-chance'&&s.name!==f.forecast.verdict.outcome){const keys={'1X':['home','draw'],'X2':['draw','away'],'12':['home','away']}[s.name];assert.equal(s.modelProbabilityPct,Number(keys.reduce((n,k)=>n+f.forecast.probabilities[k],0).toFixed(1)));}
 if(m.subject){const team=f.forecast.teamProjections.find(t=>t.teamId===m.subject.id),metric={'team-shots':'shotsTotal','team-sot':'shotsOnTarget','team-corners':'corners'}[m.family];const line=team.lines[metric].find(x=>x.threshold===Number(m.threshold));assert.equal(s.modelProbabilityPct,line?.[s.name==='OVER'?'overPct':'underPct']??null);}
 }
 }
 for(const old of original.oddsEvent.playerMarkets)for(const s of old.selections){const now=f.oddsEvent.playerMarkets.find(x=>x.providerMarketId===old.providerMarketId).selections.find(x=>x.selectionId===s.selectionId);assert(now);assert.equal(now.odds,s.odds);if(s.modelProbability!==null)assert.equal(now.modelProbability,s.modelProbability);}
}
const workspace=await loadChampionsWorkspace(load,3);assert.equal(new Set(workspace.all.map(l=>l.selectionId)).size,workspace.all.length);
const approved=read('data/normalized/schedina-champions-md03.json').slips.flatMap(s=>s.legs);
assert.equal(workspace.all.filter(l=>l.approvedPreliminary).length,7);for(const a of approved){const b=workspace.all.find(l=>l.selectionId===a.selectionId);assert.equal(a.odds,b.odds);assert.equal(a.modelProbability,b.modelProbability);}
const app={innerHTML:''};globalThis.document={querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[]};globalThis.location={search:'?competizione=champions&giornata=3'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=createPage({esc,load,dateOnly:v=>String(v||'').slice(0,10),hero:()=>''});await page.render();const html=app.innerHTML;
const admitted=workspace.all.filter(l=>Number.isFinite(l.betSelection.evaluation.modelProbabilityPct));
assert.equal((html.match(/data-selection-row/g)||[]).length,admitted.length);assert.equal((html.match(/Singola preliminare approvata/g)||[]).length,7);
assert.equal((html.match(/data-selected-forecast="true"/g)||[]).length,55);
for(const fixture of workspace.fixtures){const single=page.championsWorkspaceMarkup(workspace,fixture.id);for(const leg of admitted.filter(l=>l.matchId===fixture.id)){assert(single.includes(esc(leg.label)));}}
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3});
for(const family of ['team-shots','team-sot','team-corners','double-chance','goals']){const leg=admitted.find(l=>l.suggestionAnalysis.family===family&&!l.approvedPreliminary);assert(leg,family);assert(html.includes(`data-personal-pick="${esc(leg.selectionId)}"`));assert.equal(store.add(leg).status,'ADDED');store.remove(leg.selectionId);}
const chance12=admitted.find(l=>l.suggestionAnalysis.family==='double-chance'&&l.selection==='12');assert(chance12);assert.equal(store.add(chance12).status,'ADDED');store.remove(chance12.selectionId);
for(const [p,h] of Object.entries(read(dir+'/protected.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p);
const group=l=>l.catalogOrigin==='champions-md03-individual-model'?(l.marketFamily==='SOT'?'individual-sot':'individual-shots'):l.suggestionAnalysis.family;
const counts=rows=>rows.reduce((a,l)=>(a[group(l)]=(a[group(l)]||0)+1,a),{});
const summary={catalogBefore:before.summary,catalogAfter:catalog.summary,individualCandidatesBefore:48,individualCandidatesAfter:candidates.length,preliminaryIndividualsBefore:48,preliminaryIndividualsAfter:shortlist.length,approvedBefore:7,approvedAfter:7,providerSelections:workspace.all.filter(l=>l.betSelection.quote.decimal!==null).length,visible:admitted.length,visibleWithQuote:admitted.filter(l=>l.betSelection.quote.decimal!==null).length,fixturesWithVisibleSelections:new Set(admitted.map(l=>l.matchId)).size,visibleByFamily:counts(admitted),catalogByFamily:counts(workspace.all)};
fs.writeFileSync(dir+'/result.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
