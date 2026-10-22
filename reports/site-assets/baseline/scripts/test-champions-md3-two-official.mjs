import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const hash=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const ids=['ucl-2026-27-md03-01','ucl-2026-27-md03-02'];
const official=read('data/sources/champions-official-formations-md03-2026-27.json');
const individuals=read('data/derived/champions-md03/official-individuals-two-v1-2026-10-20.json');
const catalog=read('data/derived/champions-md03/market-catalog-official-two-v1-2026-10-20.json');
const previous=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
const registry=read('data/normalized/official-starter-registry.json');
const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
const baseline=read('output/champions-md3-two-official-2026-10-20/before-hashes.json');

assert.deepEqual(official.fixtures.map(f=>f.fixtureId),ids);
assert.deepEqual(individuals.fixtures.map(f=>f.fixtureId),ids);
assert.deepEqual(catalog.matches.map(m=>m.matchId),ids);
assert.equal(official.status,'official');
assert.equal(individuals.status,'official');
assert.equal(catalog.status,'PRELIMINARY_NOT_STATISTICALLY_VALIDATED');
assert.equal(individuals.source.sha256,hash(individuals.source.path));
assert.equal(catalog.source.sha256,hash(catalog.source.path));
assert.equal(catalog.individuals.sha256,hash(catalog.individuals.path));
assert.equal(catalog.baseCatalog.sha256,hash(catalog.baseCatalog.path));
for(const [relative,expected] of Object.entries(baseline))assert.equal(hash(relative),expected,`frozen file changed: ${relative}`);

for(const f of official.fixtures){
  const projected=individuals.fixtures.find(x=>x.fixtureId===f.fixtureId);
  const starters=f.home.players.concat(f.away.players);
  assert.equal(starters.length,22);
  assert.equal(new Set(starters.map(p=>p.playerId)).size,22);
  assert.deepEqual(new Set(registry[f.fixtureId].ids),new Set(starters.map(p=>p.playerId)));
  for(const venue of ['home','away']){
    assert.equal(f[venue].players.length,11);
    assert(f[venue].formation);
    assert(Array.isArray(f[venue].bench));
    assert(Array.isArray(f[venue].unavailable));
    const team=projected.teams.find(t=>t.teamId===f[venue].teamId);
    assert.equal(team.status,'official');
    assert.equal(team.benchStatus,'official-verified');
    assert.deepEqual(new Set(team.players.filter(p=>p.projectedRole==='starter').map(p=>p.playerId)),new Set(f[venue].players.map(p=>p.playerId)));
    assert.deepEqual(new Set(team.players.filter(p=>p.projectedRole==='bench').map(p=>p.playerId)),new Set(f[venue].bench.map(p=>p.playerId)));
  }
  const original=preview.fixtures.find(x=>x.fixtureId===f.fixtureId).collective;
  const current=catalog.collective.find(x=>x.fixtureId===f.fixtureId);
  assert.deepEqual(current.teamProjections,original.teamProjections);
  assert.deepEqual(current.matchProjection,original.matchProjection);
  assert.deepEqual(current.expectedGoals,original.expectedGoals);
  assert.deepEqual(current.probabilities,original.probabilities);
}

const fener=individuals.fixtures[0].teams.find(t=>t.teamId==='fenerbahce');
assert.equal(fener.reconciliation.status,'offline-conditional-only');
assert.equal(fener.players.filter(p=>p.projectedRole==='starter'&&Number.isFinite(p.projectedShots)).length,10);
assert(Math.abs(fener.reconciliation.allocatedShots-fener.reconciliation.targetShots)<=0.020000001);
assert(Math.abs(fener.reconciliation.allocatedSOT-fener.reconciliation.targetSOT)<=0.020000001);
for(const team of individuals.fixtures.flatMap(f=>f.teams).filter(t=>t.teamId!=='fenerbahce')){
  assert.equal(team.players.filter(p=>p.projectedRole==='starter'&&Number.isFinite(p.projectedShots)).length,0);
}

const selectedByFixture=[];
for(const match of catalog.matches){
  const source=official.fixtures.find(f=>f.fixtureId===match.matchId);
  const starters=new Set(source.home.players.concat(source.away.players).map(p=>p.playerId));
  const selected=match.selections.filter(leg=>leg.suggestionAnalysis?.suggested);
  selectedByFixture.push(selected.length);
  for(const leg of selected){
    assert.equal(leg.selectionStatus,'PRELIMINARY');
    assert.equal(leg.qualifiedSelection,false);
    assert.equal(leg.suggestionAnalysis.conservativeExpectedValuePct,null);
    assert.notEqual(leg.selection,'12');
    assert(Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct));
    assert(Number.isFinite(leg.odds));
    if(leg.marketScope==='player')assert(starters.has(leg.playerId));
  }
}
assert.deepEqual(selectedByFixture,[6,0]);
const load=name=>Promise.resolve(read(path.normalize(`data/normalized/${name}`)));
const workspace=await loadChampionsWorkspaceMd3Derived(load,3);
assert.equal(workspace.marketCatalog.matches.length,18);
for(const old of previous.matches){
  const current=workspace.marketCatalog.matches.find(m=>m.matchId===old.matchId);
  assert.deepEqual(current,ids.includes(old.matchId)?catalog.matches.find(m=>m.matchId===old.matchId):old,
    `fixture unexpectedly changed: ${old.matchId}`);
}
console.log(`PASS Champions MD3 official two: 44 starters, ${official.fixtures.reduce((n,f)=>n+f.home.bench.length+f.away.bench.length,0)} bench, 10 Fener outfield projections, selections ${selectedByFixture.join('/')}, 16 unchanged fixtures, ${Object.keys(baseline).length} frozen hashes`);
