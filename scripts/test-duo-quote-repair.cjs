'use strict';
const assert=require('node:assert/strict');
const {reconcile}=require('./reconcile-player-duo-quotes.cjs');
const data=structuredClone(require('../data/normalized/schedina-md08.json'));
const predictions=require('../data/normalized/predictions.json').predictions,odds=require('./sisal/dataset-store.cjs').readJsonFile(require('path').resolve(__dirname,'../data/normalized/odds/sisal/serie-a.json'));
const fatah=data.marketCatalog.matches.flatMap(m=>m.selections).find(s=>s.playerId==='amar-fatah'&&s.suggestionAnalysis.family==='sot');
// Reproduce a previously published individual forecast whose DUO quote was lost.
const e=fatah.betSelection.evaluation;fatah.individualModelProbabilityPct=e.individualReference.modelProbabilityPct;fatah.odds=null;fatah.betSelection.market.bookmakerSemantics=null;fatah.betSelection.quote={decimal:null,availability:'UNAVAILABLE'};
reconcile(data,predictions,odds);
const fixed=data.marketCatalog.matches.flatMap(m=>m.selections).find(s=>s.selectionId===fatah.selectionId);
assert.equal(fixed.odds,1.8);assert.equal(fixed.betSelection.market.bookmakerSemantics.duo,true);assert.equal(fixed.betSelection.evaluation.modelProbabilityPct,null);assert.equal(fixed.betSelection.evaluation.expectedValuePct,null);assert.equal(reconcile(data,predictions,odds).length,0);
console.log('PASS lost Fatah quote repaired as DUO; individual probability isolated; idempotent');
