'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { toKickoffUtc } = require('./predictions/snapshot-core');
const root = path.resolve(__dirname, '..'), { readJsonFile } = require('./sisal/dataset-store.cjs');
const read = f => readJsonFile(path.join(root, f));
function write(f, d) { const p = path.join(root, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p + '.budget.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(p + '.budget.tmp', p); }
const now = new Date(), matches = read('data/normalized/matches.json'), round = matches.filter(m => m.matchday === 13 && m.competition === 'serie-a');
assert.equal(round.length, 10);
const targetIds = round.filter(m => m.status === 'scheduled' && toKickoffUtc(m) > now.getTime()).map(m => m.id), targets = new Set(targetIds);
assert(targets.size, 'Nessuna fixture futura da ricalcolare');
const predictionsBefore = read('data/normalized/predictions.json'), readingBefore = read('data/normalized/reading-md13-market-catalog.json'), schedinaBefore = read('data/normalized/schedina-md13.json');
const out = 'output/md13-starter-substitute-budget';
if (!fs.existsSync(path.join(root, out + '/before.json'))) write(out + '/before.json', { predictions: predictionsBefore, reading: readingBefore, schedina: schedinaBefore });
const protectedFiles = ['data/normalized/odds/sisal/serie-a.json', 'data/sources/official-lineups-2026-27.json'];
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const beforeHash = Object.fromEntries(protectedFiles.map(f => [f, hash(f)]));
write('data/sources/serie-a-starter-substitute-budget-policy.json', { schemaVersion: 1, enabled: true, competition: 'serie-a', matchday: 13,
  fixtureIds: targetIds, version: 'starter-substitute-joint-budget-v1', authorizedAt: now.toISOString(),
  authorization: 'User requested application of tested conditional-start joint shot budget to the entire current round.',
  status: 'PRELIMINARY_USER_AUTHORIZED', statisticallyValidated: false, unchanged: ['match-result-engine', 'SOT-model', 'DUO-probability', 'odds', 'approval-thresholds'],
  missingPolicy: 'Unknown minute or individual rate budgets abstain; no inferred identities or invented quotes.' });
cp.execFileSync(process.execPath, ['--experimental-require-module', 'scripts/build-predictions.js'], { cwd: root, stdio: 'inherit', env: { ...process.env,
  SPATIAL_CAPTURE_DISABLED: '1', SERIE_A_PREDICTION_PREVIEW_MATCHDAY: '13', SERIE_A_PREDICTION_MATCH_IDS: targetIds.join(','), SERIE_A_PREDICTION_OUTPUT: out + '/candidate.json' } });
const candidate = read(out + '/candidate.json'); assert.equal(candidate.predictions.length, targets.size);
assert(candidate.predictions.every(p => p.shooters?.starterSubstituteBudget));
const predictions = { ...predictionsBefore, generatedAt: candidate.generatedAt, predictions: predictionsBefore.predictions.map(p => candidate.predictions.find(q => q.matchId === p.matchId) || p) };
assert.deepEqual(predictions.predictions.filter(p => !targets.has(p.matchId)), predictionsBefore.predictions.filter(p => !targets.has(p.matchId)));
write('data/normalized/predictions.json', predictions);
const odds = read('data/normalized/odds/sisal/serie-a.json'), probable = read('data/sources/probable-lineups-md13-2026-27.json'), official = read('data/sources/official-lineups-2026-27.json');
const generated = require('./md06-market-catalog').buildMd06MarketCatalog({ predictionsData: { ...predictions, predictions: candidate.predictions },
  odds: { ...odds, events: odds.events.filter(e => targets.has(e.canonicalMatchId)) }, matches: matches.filter(m => targets.has(m.id)), schedinaSlips: [],
  probableLineups: probable, officialLineups: official, statisticalModels: read('data/analysis/serie-a-md13-statistical-models.json'), matchday: 13 });
generated.matches = require('./preserve-official-duo-contracts.cjs')({ matches: generated.matches,
  previousMatches: readingBefore.marketCatalog.matches.filter(m => targets.has(m.matchId)), predictions: candidate.predictions, odds, probableLineups: probable, officialLineups: official });
require('./apply-official-starter-policy').buildRegistry(); const starterPolicy = require('../js/official-starter-policy');
for (const m of generated.matches) {
  const priorIds = new Set(readingBefore.marketCatalog.matches.find(p => p.matchId === m.matchId).selections.map(s => s.selectionId));
  m.selections = m.selections.filter(s => starterPolicy.eligible(s, m.matchId) && (!(s.marketScope === 'player') || priorIds.has(s.selectionId) || s.betSelection?.quote?.availability === 'AVAILABLE_AT_SNAPSHOT'));
  for (const s of m.selections) { delete s.isPreferred; s.isOutsider = s.betSelection?.operational?.classification === 'OUTSIDER'; }
}
const catalog = { ...readingBefore, generatedAt: candidate.generatedAt, marketCatalog: { ...readingBefore.marketCatalog,
  matches: readingBefore.marketCatalog.matches.map(m => generated.matches.find(g => g.matchId === m.matchId) || m) } };
write('data/normalized/reading-md13-market-catalog.json', catalog);
write('data/normalized/schedina-md13.json', { ...schedinaBefore, generatedAt: candidate.generatedAt, marketCatalog: catalog.marketCatalog });
const published = require('./publish-md07-unquoted').build({ matchday: 13, targetMatchIds: targetIds });
for (const m of readingBefore.marketCatalog.matches.filter(m => !targets.has(m.matchId))) assert.deepEqual(published.marketCatalog.matches.find(p => p.matchId === m.matchId), m);
write('data/normalized/schedina-md13.json', published);
write('data/normalized/reading-md13-market-catalog.json', { ...catalog, marketCatalog: published.marketCatalog });
for (const [f, h] of Object.entries(beforeHash)) assert.equal(hash(f), h);
write(out + '/audit.json', { generatedAt: candidate.generatedAt, targets: targetIds, preserved: round.filter(m => !targets.has(m.id)).map(m => m.id),
  teams: candidate.predictions.flatMap(p => p.shooters.starterSubstituteBudget.teams.map(t => ({ matchId: p.matchId, teamId: t.teamId, status: t.status, reason: t.reason,
    starterMinutes: t.minutes?.starterMinutes, substituteMinutes: t.minutes?.substituteMinutes, starterShots: t.budget?.starterShots, substituteShots: t.budget?.substituteShots }))),
  protectedHashes: beforeHash, statisticallyValidated: false });
console.log(JSON.stringify({ targets: targetIds, audit: out + '/audit.json' }));
