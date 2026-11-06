'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const dir = 'output/sot-current-md11-2026-11-06';
const before = read(`${dir}/predictions-before.json`), now = read('data/normalized/predictions.json');
const oldCatalog = read(`${dir}/schedina-before.json`).marketCatalog;
const catalog = read('data/normalized/schedina-md11.json').marketCatalog;
assert.deepEqual(catalog, read('data/normalized/reading-md11-market-catalog.json').marketCatalog);
assert.deepEqual(now.predictions.filter(p => !p.matchId.endsWith('-md-11')), before.predictions.filter(p => !p.matchId.endsWith('-md-11')), 'Past or unrelated predictions changed');
const table = [];
for (const p of now.predictions.filter(p => p.matchId.endsWith('-md-11'))) {
  const old = before.predictions.find(q => q.matchId === p.matchId);
  assert.deepEqual(p.expectedGoals, old.expectedGoals);
  assert.deepEqual(p.probabilities, old.probabilities);
  for (const t of p.teamProjections) {
    const previous = old.teamProjections.find(q => q.teamId === t.teamId);
    for (const field of ['shotsTotal', 'corners', 'fouls', 'cards']) assert.deepEqual(t[field], previous[field], `${t.teamId}: unrelated ${field} changed`);
    assert.equal(t.shotsOnTarget.currentSeasonBaseline.ownMatches, 10);
    assert.equal(t.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, 0);
    assert.equal(t.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0);
    const players = p.shooters.allPlayers.filter(q => q.teamId === t.teamId);
    const total = players.reduce((s, q) => s + q.projectedShotsOnTarget, 0);
    assert(Math.abs(total - t.shotsOnTarget.central) <= .11, `${t.teamId}: individual SOT sum differs from team`);
    for (const player of players) assert(player.projectedShotsOnTarget <= player.projectedShots + .011);
    assert(t.shotsOnTarget.central <= t.shotsTotal.central);
    table.push({ matchId: p.matchId, teamId: t.teamId, before: previous.shotsOnTarget.central, after: t.shotsOnTarget.central, playerSum: Number(total.toFixed(3)) });
  }
  const projection = read(`data/generated/readings/matches/${p.matchId}.json`).predictionDataset.predictions[0];
  assert.deepEqual(projection.teamProjections, p.teamProjections, 'Browser projection out of sync');
}
let verifiedPreserved = 0;
const changes = [];
for (const match of catalog.matches) {
  const previous = oldCatalog.matches.find(m => m.matchId === match.matchId);
  const oldById = new Map(previous.selections.map(s => [s.selectionId, s]));
  const newById = new Map(match.selections.map(s => [s.selectionId, s]));
  for (const selection of match.selections) {
    const old = oldById.get(selection.selectionId);
    if (old) {
      assert.deepEqual(selection.betSelection?.identity, old.betSelection?.identity, 'Provider contract identity changed');
      assert.deepEqual(selection.betSelection?.quote, old.betSelection?.quote, 'Verified quote changed');
      verifiedPreserved++;
    }
    const bet = selection.betSelection;
    if (bet?.identity?.duo) for (const field of ['modelProbabilityPct', 'fairOdds', 'expectedValuePct']) assert.equal(bet.evaluation[field], null);
  }
  changes.push({ matchId: match.matchId, before: previous.selections.length, after: match.selections.length, added: [...newById.keys()].filter(id => !oldById.has(id)), removed: [...oldById.keys()].filter(id => !newById.has(id)) });
}
const output = { engineVersion: now.engine.version, table, catalog: { before: oldCatalog.matches.reduce((s, m) => s + m.selections.length, 0), after: catalog.matches.reduce((s, m) => s + m.selections.length, 0), verifiedPreserved, changes }, checks: ['All unrelated predictions preserved', '1X2 and xG unchanged', 'Shots, corners, fouls and cards unchanged', 'SOT player volume conservation', 'No second own or opponent SOT correction', 'Reading/Schedina/browser synchronization', 'Existing quote and contract identities preserved'] };
fs.writeFileSync('data/analysis/team-sot-baseline-audit-2026-11-06/operational-refresh.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ teams: table.length, catalog: { before: output.catalog.before, after: output.catalog.after, verifiedPreserved }, checks: output.checks }));
