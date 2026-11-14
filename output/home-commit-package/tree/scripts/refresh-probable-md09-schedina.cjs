'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Publish the existing MD9 reading forecasts using the MD7 shared-catalog structure.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=f=>storageReadJson(f),write=(f,d)=>{const temp=f+'.md09.tmp';fs.writeFileSync(temp,JSON.stringify(d,null,2)+'\n');for(let i=0;;i++){try{fs.renameSync(temp,f);return}catch(e){if(i===5)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300)}}};
const fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===9&&m.status==='scheduled');
assert.equal(fixtures.length,7);assert(fixtures.every(m=>m.status==='scheduled'),'Non rigenerare gare iniziate');
const source=read('data/normalized/reading-md09-market-catalog.json'),odds=read('data/normalized/odds/sisal/serie-a.json');
const predictions=read('data/normalized/predictions.json');
const data={schemaVersion:1,competition:'serie-a',season:'2026-27',matchday:9,generatedAt:source.generatedAt,title:'Schedine Serie A · 9ª giornata',description:'Pronostici condivisi con le letture delle dieci partite.',provider:odds.provider,sourceUrl:odds.sourceUrl,oddsRetrievedAt:odds.retrievedAt,modelVersion:predictions.engine.version,selectionRule:'Nessun numero fisso per partita. Tutti gli esiti sostenuti dai criteri esistenti; EV informativo, contratti distinti dalle stime individuali. Nessun profilo o preferito.',coverage:{profilesEvaluated:10,qualifiedProfiles:0,unavailableProfiles:0},slips:[],marketCatalog:structuredClone(source.marketCatalog)};
write('data/normalized/schedina-md09.json',data);
const published=require('./publish-md07-unquoted').build({matchday:9,targetMatchIds:fixtures.map(m=>m.id)});
for(const match of published.marketCatalog.matches)for(const leg of match.selections){
 delete leg.isPreferred;
 const evaluation=leg.betSelection?.evaluation;
 if(Number.isFinite(evaluation?.modelProbabilityPct)&&evaluation.modelProbabilityPct>0){
  evaluation.fairOdds=Number((100/evaluation.modelProbabilityPct).toFixed(4));leg.fairOdds=evaluation.fairOdds;
 }
 if(evaluation?.provenance?.source==='data/analysis/serie-a-md07-statistical-models.json')evaluation.provenance.source='data/analysis/serie-a-md09-statistical-models.json';
}
write('data/normalized/schedina-md09.json',published);
// The two views share the final catalog, including model forecasts without a quote.
write('data/normalized/reading-md09-market-catalog.json',{...source,marketCatalog:published.marketCatalog});
console.log(`MD9: ${published.marketCatalog.totals.suggestions} pronostici, senza limiti numerici o profili.`);
