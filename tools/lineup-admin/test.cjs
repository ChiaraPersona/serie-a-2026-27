'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {root, catalog, fixtureData, validate, digest} = require('./model.cjs');
const {start} = require('./server.cjs');
const now = new Date('2026-11-25T10:00:00Z');
const fixtures = catalog(now);
assert(fixtures.some(f => f.competition === 'serie-a'));
assert(fixtures.some(f => f.competition === 'champions'));
assert(fixtures.every(f => Date.parse(f.kickoffAt) > now.getTime()));
const domestic = fixtureData(fixtures.find(f => f.competition === 'serie-a').id, now);
assert(domestic.teams.every(t => t.starters.length === 11 && t.formation));
assert(domestic.teams.every(t => t.prefill.kind === 'reference' && t.status === 'probable'));
assert(domestic.teams.every(t => t.starters.every(id => t.players.some(p => p.id === id))));
assert(domestic.teams.every(t => t.bench.length === 0), 'Do not carry historical benches into future fixtures');
const fixture = fixtures.find(f => f.canRecalculate);
const current = fixtureData(fixture.id, now);
const input = {fixtureId: fixture.id, revision: current.revision, status: 'official', teams: current.teams.map(t => ({teamId: t.id,
  starters: t.players.slice(0, 11).map(p => p.id), bench: t.players.slice(11, 15).map(p => p.id), formation: '4-3-3', benchConfirmed: true}))};
assert.equal(validate(input, now).teams.length, 2);
const bad = mutate => {const value = structuredClone(input); mutate(value); assert.throws(() => validate(value, now));};
bad(v => v.revision = 'stale');
bad(v => v.teams[0].starters.pop());
bad(v => v.teams[0].starters[0] = v.teams[0].starters[1]);
bad(v => v.teams[0].bench.push(v.teams[0].starters[0]));
bad(v => v.teams[0].starters[0] = '../unknown');
bad(v => v.teams[1].teamId = v.teams[0].teamId);
bad(v => v.teams[0].formation = '9-9-9');
assert.throws(() => fixtureData(fixture.id, new Date('2027-01-01T00:00:00Z')));
const canonical = 'data/sources/champions-official-formations-md05-2026-27.json';
const before = digest(fs.readFileSync(path.join(root, canonical), 'utf8'));
const server = start({port: 18787});
(async () => {
  await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
  try {
    const base = 'http://127.0.0.1:18787';
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + '/../../AGENTS.md')).status, 404);
    const catalog = await (await fetch(base + '/api/catalog')).json(); assert(catalog.token);
    for (const endpoint of ['/api/draft', '/api/recalculate']) {
      const forbidden = await fetch(base + endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input)});
      assert.equal(forbidden.status, 403);
      const crossOrigin = await fetch(base + endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'Origin': 'https://example.com', 'X-Lineup-Token': catalog.token}, body: JSON.stringify(input)});
      assert.equal(crossOrigin.status, 403);
    }
    const rejected = await fetch(base + '/api/draft', {method: 'POST', headers: {'Content-Type': 'application/json', 'Origin': base, 'X-Lineup-Token': catalog.token}, body: JSON.stringify({...input, revision: 'stale'})});
    assert.equal(rejected.status, 400);
    assert.equal(digest(fs.readFileSync(path.join(root, canonical), 'utf8')), before);
    console.log('PASS: canonical IDs, XI validation, duplicates, bench overlap, stale revisions, kickoff lock, CSRF, traversal, canonical integrity');
  } finally {server.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
