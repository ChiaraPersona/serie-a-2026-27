const fs=require('fs'),assert=require('assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/normalized/schedina-md09.json').marketCatalog;
const odds=read('data/normalized/odds/sisal/serie-a.json');
let quotes=0,duo=0;
for(const match of catalog.matches){const event=odds.events.find(e=>e.canonicalMatchId===match.matchId);assert(event);for(const leg of match.selections){
 const b=leg.betSelection;if(b?.quote?.availability==='AVAILABLE_AT_SNAPSHOT'){
 const market=event.markets.find(m=>String(m.providerMarketId)===String(b.identity.providerMarketId));assert(market,leg.selectionId);
 const selection=market.selections.find(s=>String(s.providerSelectionId)===String(b.identity.providerSelectionId));assert(selection,leg.selectionId);assert.equal(selection.odds,b.quote.decimal,leg.selectionId);quotes++;
 }
 if(/DUO/.test(leg.market||'')){duo++;assert.equal(b.evaluation.modelProbabilityPct,null);assert.equal(b.evaluation.fairOdds,null);assert.equal(b.evaluation.expectedValuePct,null);}
}}
const predictions=read('data/normalized/predictions.json').predictions.filter(p=>p.matchId.endsWith('md-09'));
for(const p of predictions)for(const c of p.combinations||[])for(const leg of c.legs||[])if(/DUO/.test(leg.market||'')){
 assert.equal(leg.betSelection.evaluation.modelProbabilityPct,null);assert.equal(leg.betSelection.evaluation.fairOdds,null);assert.equal(leg.betSelection.evaluation.expectedValuePct,null);
}
const report={fixtures:10,suggested:catalog.totals.suggestions,quotedCatalogContractsVerified:quotes,duoContractsWithoutUnvalidatedEconomics:duo,desktopMobile:read('reports/md09-schedina/browser-audit.json').results,readingsChecks:read('reports/md09-reading-refresh/browser-audit.json').results.length};
fs.writeFileSync('output/md09-calculation-2026-10-26/final-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({quotes,duo,readingChecks:report.readingsChecks}));
