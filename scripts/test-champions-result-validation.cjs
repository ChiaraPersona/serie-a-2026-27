'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {applyResultValidationPolicy}=require('./champions/result-validation-policy.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const original=read('data/normalized/schedina-champions-md04.json');
const catalog=structuredClone(original),target='ucl-2026-27-md04-10';
const match=catalog.marketCatalog.matches.find(m=>m.matchId===target);
const aek=match.selections.find(l=>l.suggestionAnalysis?.family==='result'&&l.selection==='1');
assert(aek&&!aek.betSelection.evaluation.validation.approvable);
// Reproduce both initial candidate publication and a draw-policy replacement.
aek.suggestionAnalysis.suggested=true;
delete aek.publication.userAuthorizedResultModel;
const replacement=match.selections.find(l=>l.suggestionAnalysis?.family==='double-chance');
assert(replacement);replacement.suggestionAnalysis.suggested=true;
delete replacement.publication.userAuthorizedResultModel;
const quote=structuredClone(aek.betSelection.quote),evaluation=structuredClone(aek.betSelection.evaluation);
applyResultValidationPolicy(catalog,new Set([target]));
assert.equal(aek.suggestionAnalysis.suggested,false);assert.equal(replacement.suggestionAnalysis.suggested,false);
assert.deepEqual(aek.betSelection.quote,quote);assert.deepEqual(aek.betSelection.evaluation,evaluation);
assert.deepEqual(catalog.marketCatalog.matches.filter(m=>m.matchId!==target),original.marketCatalog.matches.filter(m=>m.matchId!==target));
assert.deepEqual(match.selections.filter(l=>!['result','double-chance'].includes(l.suggestionAnalysis?.family)),original.marketCatalog.matches.find(m=>m.matchId===target).selections.filter(l=>!['result','double-chance'].includes(l.suggestionAnalysis?.family)).map(l=>{const v=structuredClone(l);if(v.suggestionAnalysis.suggested)v.suggestionAnalysis.rank=match.selections.find(x=>x.selectionId===v.selectionId).suggestionAnalysis.rank;return v;}));
const once=structuredClone(catalog);applyResultValidationPolicy(catalog,new Set([target]));assert.deepEqual(catalog,once);
// A genuine approved result survives; a validation flag alone does not admit it.
aek.betSelection.evaluation.validation.approvable=true;aek.qualifiedSelection=true;aek.publication.status='APPROVED';aek.suggestionAnalysis.suggested=true;
applyResultValidationPolicy(catalog,new Set([target]));assert(aek.suggestionAnalysis.suggested);
console.log('OK: unvalidated result and replacement excluded; approved result, other fixtures, contracts and probabilities preserved; idempotent.');
