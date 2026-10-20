'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),Module=require('module'),path=require('path'),{execFileSync}=require('child_process');
const dir='output/champions-fenerbahce-preliminary-md7/',file='data/normalized/schedina-champions-md03.json';
const before=JSON.parse(fs.readFileSync(dir+'before.json')),after=JSON.parse(fs.readFileSync(file));
const {TARGET,selectPreliminaryMatch,selectorView,assessPreliminary}=require('./champions/md3-preliminary-pilot.cjs');
const structuralHash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const [id,h] of Object.entries(before.foreignMatches))assert.equal(structuralHash(after.marketCatalog.matches.find(m=>m.matchId===id)),h,id);
assert.equal(structuralHash(after.marketCatalog.myCombo),before.myComboHash);assert.equal(structuralHash(after.slips),before.slipsHash);
const current=after.marketCatalog.matches.find(m=>m.matchId===TARGET),previous=before.target;
assert.deepEqual(selectPreliminaryMatch(current),current,'idempotent pilot');
for(const l of current.selections){const p=previous.selections.find(x=>x.selectionId===l.selectionId);assert.deepEqual(l.betSelection.evaluation,p.betSelection.evaluation);assert.deepEqual(l.betSelection.quote,p.betSelection.quote);assert.deepEqual(l.scenarioAnalysis,p.scenarioAnalysis);assert.equal(l.qualifiedSelection,false);if(l.suggestionAnalysis.suggested){assert.equal(l.publication.status,'PRELIMINARY');assert.equal(l.betSelection.evaluation.prudentProbabilityPct,null);assert.notEqual(l.selection,'12');}}
const hashes=JSON.parse(fs.readFileSync(dir+'protected-hashes.json'));for(const [p,h] of Object.entries(hashes)){if(p===file)continue;assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p);}
// Compare default shared selection numerically with the pre-change module on all MD7 candidates.
const source=execFileSync('git',['show','HEAD:scripts/md06-suggested-forecasts.js'],{encoding:'utf8'}),old=new Module(path.resolve('scripts/original-selector.js'),module);old.filename=path.resolve('scripts/original-selector.js');old.paths=module.paths;old._compile(source,old.filename);
const shared=require('./md06-suggested-forecasts');const serie=JSON.parse(fs.readFileSync('data/normalized/schedina-md07.json'));
for(const m of serie.marketCatalog.matches)assert.deepEqual(shared.selectMatchSuggestions(m),old.exports.selectMatchSuggestions(m),'MD7 selector parity '+m.matchId);
const selected=current.selections.filter(l=>l.suggestionAnalysis.suggested);assert.equal(selected.length,6);
const dc=current.selections.find(l=>l.selection==='1X');assert(dc.suggestionAnalysis.reasons.includes('LOGICAL_IMPLICATION_WITH_HIGHER_RANKED_SELECTION')||dc.suggestionAnalysis.reasons.includes('RESULT_THESIS_ALREADY_SELECTED'));
const missing=structuredClone(current.selections[0]);missing.betSelection.evaluation.modelProbabilityPct=null;assert(!assessPreliminary(selectorView(missing)).eligible);
const noQuote=structuredClone(current.selections[0]);noQuote.betSelection.quote.decimal=null;assert(!assessPreliminary(selectorView(noQuote)).eligible);
console.log('PASS: 17 fixture, MyCombo, Serie A, registry, snapshots and all protected inputs unchanged; six preliminary selections; central P/quotes/validation preserved; MD7 selector parity; missing-data gates; idempotence.');
