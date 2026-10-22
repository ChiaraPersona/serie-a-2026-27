import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createPage} from '../js/pages/champions.js';
import {adaptChampionsReading} from '../js/pages/reading-detail/champions-adapter.mjs';
import {loadEvidence, individualPlayers} from '../js/pages/reading-detail/evidence.mjs';
import {formationMarkup, playersMarkup} from '../js/pages/reading-detail/people.mjs';

const require = createRequire(import.meta.url);
const {project, sourcePath, outputPath} = require('./build-champions-md02-browser-data.cjs');
const policy = require('../js/official-starter-policy.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const sourceBytes = fs.readFileSync(path.join(root, sourcePath));
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
const source = JSON.parse(sourceBytes);
const payloadBytes = fs.readFileSync(path.join(root, outputPath));
const payload = JSON.parse(payloadBytes);
assert.deepEqual(payload, project(source), 'Stale browser projection: rebuild the Champions page');
assert.equal(payloadBytes.toString(), JSON.stringify(project(source)) + '\n', 'Non-deterministic serialization');
assert(payloadBytes.length < sourceBytes.length * 0.01, 'Browser payload must be less than 1% of the archive');
assert.throws(() => project({...source, fixtures: source.fixtures.slice(1)}));
assert.throws(() => project({...source, matchday: 3}));
assert.throws(() => project({...source, fixtures: Array(18).fill(source.fixtures[0])}));
assert.deepEqual(Object.keys(payload.fixtures[0]), ['fixtureId', 'lineups', 'availability']);
for (const fixture of source.fixtures) {
  const projected = payload.fixtures.find(f => f.fixtureId === fixture.fixtureId);
  assert.deepEqual(projected.lineups, fixture.lineups);
  assert.deepEqual(projected.availability, fixture.availability);
}

policy.configure(read('data/normalized/official-starter-registry.json'));
const filteredSource = policy.filter(source), filteredPayload = policy.filter(payload);
assert.deepEqual(filteredPayload.fixtures, project({...source, fixtures: filteredSource.fixtures}).fixtures,
  'Official-starter filtering must commute with projection');
const cache = new Map();
const normalized = name => {
  if (!cache.has(name)) cache.set(name, policy.filter(read('data/normalized/' + name)));
  return cache.get(name);
};
const calendar = normalized('champions-league-2026-27.json');
const pilot = normalized('champions-pilot-predictions-md02-2026-27.json');
const squads = normalized('champions-registered-squads-2026-27.json');
const schedina = normalized('schedina-champions-md02.json');
const branding = new Map(calendar.teamBranding.map(team => [team.team, team]));
const app = {innerHTML: ''};
globalThis.CSS = {escape: value => String(value)};
globalThis.document = {querySelector: selector => selector === '#app' ? app : null};
const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// The shirt renderer allocates process-wide SVG clip IDs on each render.
const stableMarkup = html => {
  const ids = new Map();
  return html.replace(/lineup-kit-\d+/g, id => {
    if (!ids.has(id)) ids.set(id, `lineup-kit-${ids.size + 1}`);
    return ids.get(id);
  });
};
const oldFetch = globalThis.fetch;
globalThis.fetch = async url => ({ok: true, json: async () => JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'))});
let legacyComparisons = 0, rosterComparisons = 0;
try {
  for (const fixture of calendar.fixtures.filter(f => f.matchday === 2)) {
    globalThis.location = {search: `?match=${fixture.id}&layout=legacy`};
    const render = async integration => {
      await createPage({esc, load: async name => name === path.basename(outputPath) ? integration : normalized(name)}).render();
      return stableMarkup(app.innerHTML);
    };
    const projectedHtml = await render(filteredPayload), originalHtml = await render(filteredSource);
    if (projectedHtml !== originalHtml) {
      let index = 0;
      while (projectedHtml[index] === originalHtml[index]) index++;
      throw new Error(`${fixture.id}: legacy HTML changed at ${index}: ${JSON.stringify(projectedHtml.slice(index - 50, index + 100))} vs ${JSON.stringify(originalHtml.slice(index - 50, index + 100))}`);
    }
    legacyComparisons++;
    const prediction = pilot.fixtures.find(f => f.fixtureId === fixture.id);
    const makeModel = integration => {
      const entry = integration.fixtures.find(f => f.fixtureId === fixture.id);
      return adaptChampionsReading({fixture: {...prediction, status: fixture.status, score: fixture.score},
        calendarFixture: fixture, branding,
        publishedSelections: schedina.fixtures.find(f => f.fixtureId === fixture.id)?.selections || [],
        analysis: {match: fixture, matches: calendar.fixtures, lineups: entry.lineups, availability: entry.availability, squads}});
    };
    const originalModel = makeModel(filteredSource), projectedModel = makeModel(filteredPayload);
    assert.deepEqual(projectedModel, originalModel, `${fixture.id}: view model changed`);
    const originalEvidence = await loadEvidence(originalModel, {benchForecasts: false});
    const projectedEvidence = await loadEvidence(projectedModel, {benchForecasts: false});
    assert.deepEqual(projectedEvidence, originalEvidence, `${fixture.id}: roster evidence changed`);
    assert.deepEqual(individualPlayers(projectedModel, projectedEvidence), individualPlayers(originalModel, originalEvidence));
    assert.equal(stableMarkup(formationMarkup(projectedEvidence)), stableMarkup(formationMarkup(originalEvidence)));
    assert.equal(playersMarkup(projectedModel, projectedEvidence), playersMarkup(originalModel, originalEvidence));
    rosterComparisons++;
  }
} finally { globalThis.fetch = oldFetch; }
assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, sourcePath))).digest('hex'), sourceHash);
assert.deepEqual(source, JSON.parse(sourceBytes), 'Source mutated in memory');
console.log(JSON.stringify({status: 'PASS', legacyComparisons, rosterComparisons, sourceHash,
  before: {bytes: sourceBytes.length, gzip: gzipSync(sourceBytes).length},
  after: {bytes: payloadBytes.length, gzip: gzipSync(payloadBytes).length}}));
