const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {buildCompetitionContext,validationCoverage}=require('./predictions/competition-context.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const dataset=read('data/generated/serie-a-team-history.json'),fixtures=read('data/normalized/matches.json');
const target=fixtures.find(m=>m.id==='inter-como-2026-27-md-11'),context=buildCompetitionContext(dataset,target);
assert.equal(context.probabilityAdjustment.applied,false);
for(const t of context.teams){assert(t.matchIds.every(id=>dataset.teams[t.teamId].find(r=>r.id===id).date<target.date));assert(t.samples.some(s=>s.competition==='champions-league'&&s.matches>0));}
const inter=context.teams.find(t=>t.teamId==='inter');assert.equal(inter.lastMatch.competition,'champions-league');
assert.equal(inter.daysSinceLastMatch,(Date.parse(target.date)-Date.parse(inter.lastMatch.date))/86400000);
const modified=structuredClone(dataset);for(const r of modified.teams.inter.filter(r=>r.date>=target.date)){r.goalsFor=99;r.stats.shots=99;}
modified.teams.inter.push({...modified.teams.inter[0],id:'future',date:'2099-01-01'});
assert.deepEqual(buildCompetitionContext(modified,target),context,'Future match leaked');
const old={...target,date:'2026-01-01'};assert.equal(buildCompetitionContext(dataset,old).teams[0].lastMatch,null);
const unknown={...target,date:null};assert.equal(buildCompetitionContext(dataset,unknown).teams[0].daysSinceLastMatch,null);
const coverage=validationCoverage(dataset,fixtures);assert.equal(coverage.eligibleClusters,25);assert.equal(coverage.status,'INSUFFICIENT_TEMPORAL_SAMPLE');
const before=JSON.parse(zlib.gunzipSync(fs.readFileSync('output/champions-reading-context/before.json.gz')));
const strip=p=>{const copy=structuredClone(p);for(const row of copy.predictions)delete row.competitionContext;return copy;};
assert.deepEqual(strip(read('data/normalized/predictions.json')),strip(JSON.parse(before['data/normalized/predictions.json'])),'Numeric forecasts changed');
assert.equal(fs.readFileSync('data/normalized/schedina-md11.json','utf8'),before['data/normalized/schedina-md11.json'],'Selections changed');
const predictions=read('data/normalized/predictions.json');
for(const m of fixtures.filter(m=>m.matchday===11&&m.competition==='serie-a')){
 const p=predictions.predictions.find(p=>p.matchId===m.id);assert.deepEqual(p.competitionContext,buildCompetitionContext(dataset,m));
 const projected=read(`data/generated/readings/matches/${m.id}.json`);assert.deepEqual(projected.predictionDataset.predictions[0].competitionContext,p.competitionContext);
 assert(projected.readings[0].sections.form.signals.some(s=>s.includes('giorni tra le date delle gare')));
}
console.log('OK contesto: cutoff, carico calendario, campioni distinti, gate, proiezioni; probabilità e Schedina invariate.');

