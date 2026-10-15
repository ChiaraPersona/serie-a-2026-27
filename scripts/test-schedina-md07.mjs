import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sharedForecastsForMatch,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/normalized/schedina-md07.json');
const source=read('data/sources/probable-lineups-md7-2026-27.json');
const predictions=read('data/normalized/predictions.json');
const fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===7);
const odds=read('data/normalized/odds/sisal/serie-a.json');
const sourceByTeam=new Map(source.teams.map(t=>[t.teamId,t]));
const previous=JSON.parse(execFileSync('git',['show','HEAD:data/normalized/predictions.json'],{encoding:'utf8',maxBuffer:100*1024*1024}));
assert.deepEqual(predictions.predictions.filter(p=>!p.matchId.endsWith('-md-07')),previous.predictions.filter(p=>!p.matchId.endsWith('-md-07')),'Previsioni delle altre giornate modificate');
assert.equal(fixtures.length,10);
assert.equal(new Set(fixtures.flatMap(m=>[m.homeTeam,m.awayTeam])).size,20);
assert.equal(data.marketCatalog.matches.length,10);
const allIds=new Set(), rows=[];
for(const fixture of fixtures){
  const selections=sharedForecastsForMatch(data.marketCatalog,fixture.id);
  const prediction=predictions.predictions.find(p=>p.matchId===fixture.id);
  assert(prediction);
  const eligible=new Set([fixture.homeTeam,fixture.awayTeam].flatMap(id=>sourceByTeam.get(id).players.filter(p=>p.lineupStatus==='starter').map(p=>p.playerId)));
  const event=odds.events.find(e=>e.canonicalMatchId===fixture.id);
  assert(event);
  assert(selections.length>0,fixture.id);
  const store=createPersonalBetslipStore({storage:{getItem:()=>null,setItem:()=>{}}});
  const context={competition:'serie-a',season:'2026-27',matchday:7,label:'Serie A · 7ª giornata'};
  store.setContext(context);
  for(const leg of selections){
    assert(!allIds.has(leg.selectionId),'Duplicato');allIds.add(leg.selectionId);
    assert(hasVerifiedPlayableQuote(leg),leg.selectionId);
    if(leg.playerId) assert(eligible.has(leg.playerId),leg.playerId);
    const contract=leg.betSelection,quote=event.markets.flatMap(m=>m.selections).find(s=>String(s.providerSelectionId)===String(contract.identity.providerSelectionId));
    assert(quote,leg.selectionId);assert.equal(quote.odds,contract.quote.decimal);
    if(contract.market.bookmakerSemantics?.duo){assert.equal(contract.evaluation.modelProbabilityPct,null);assert.equal(contract.evaluation.expectedValuePct,null)}
    else {assert(Number.isFinite(contract.evaluation.modelProbabilityPct));assert(Number.isFinite(contract.evaluation.expectedValuePct))}
    const added=store.add({selectionId:leg.selectionId,context,fixture:leg.fixture,label:leg.label,market:leg.market,betSelection:contract});
    assert(store.getSnapshot().selections.some(s=>s.selectionId===leg.selectionId),JSON.stringify(added));
    store.remove(leg.selectionId);
  }
  const count=family=>selections.filter(s=>s.suggestionAnalysis.family===family).length;
  rows.push({matchId:fixture.id,partita:`${fixture.homeTeam}–${fixture.awayTeam}`,tiri:count('shots'),sot:count('sot'),altri:selections.length-count('shots')-count('sot'),totale:selections.length,quote:selections.filter(hasVerifiedPlayableQuote).length});
}
const report={status:'PASS',rows,total:allIds.size,quoted:rows.reduce((n,r)=>n+r.quote,0),unquoted:0,technicalUnquoted:data.marketCatalog.playerForecastIntegration.unquoted,
  tests:['10 fixture / 20 squadre','quote provider e contratto esatti','titolari probabili e identita canoniche','selezionabilita store per ogni pronostico','nessun duplicato','DUO senza probabilita o EV inventati','pronostici altre giornate identici a HEAD']};
fs.writeFileSync('output/reports/serie-a-md07-final-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
