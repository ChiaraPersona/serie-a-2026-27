'use strict';
const fs = require('node:fs'), assert = require('node:assert/strict');
const { scoreMatrix } = require('./predictions/engine');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
async function main() {
  const dir = 'output/current-team-md11-2026-11-06';
  const before = read(`${dir}/predictions-before.json`), now = read('data/normalized/predictions.json');
  const oldCatalog = read(`${dir}/schedina-before.json`).marketCatalog;
  const catalog = read('data/normalized/schedina-md11.json').marketCatalog;
  assert.deepEqual(catalog, read('data/normalized/reading-md11-market-catalog.json').marketCatalog);
  assert.deepEqual(now.predictions.filter(p => !p.matchId.endsWith('-md-11')), before.predictions.filter(p => !p.matchId.endsWith('-md-11')));
  const table = [], scores = [];
  for (const p of now.predictions.filter(p => p.matchId.endsWith('-md-11'))) {
    const old = before.predictions.find(q => q.matchId === p.matchId);
    const matrix = scoreMatrix(p.expectedGoals.home, p.expectedGoals.away, 7);
    const total = array => array.reduce((s, q) => s + q.probability, 0);
    const outcomes = { '1': total(matrix.filter(q => q.home > q.away)), X: total(matrix.filter(q => q.home === q.away)), '2': total(matrix.filter(q => q.home < q.away)) };
    for (const key of Object.keys(outcomes)) assert(Math.abs(p.probabilities.final[key] - outcomes[key] * 100) <= .11);
    const meanHome = matrix.reduce((s, q) => s + q.home * q.probability, 0), meanAway = matrix.reduce((s, q) => s + q.away * q.probability, 0);
    assert.equal(p.scoreForecast.primary.score, `${Math.round(meanHome)}-${Math.round(meanAway)}`);
    for (const exact of p.exactScores) {
      const [h, a] = exact.score.split('-').map(Number);
      assert(Math.abs(exact.probabilityPct - matrix.find(q => q.home === h && q.away === a).probability * 100) <= .051);
    }
    assert.equal(p.expectedGoals.components.currentGoalBaselines.home.sampleSize, 10);
    assert.equal(p.expectedGoals.components.currentGoalBaselines.away.sampleSize, 10);
    assert.equal(p.modelValidation.currentTeamAdaptation.statisticallyValidated, false);
    scores.push({ matchId: p.matchId, before: { home: old.expectedGoals.home, away: old.expectedGoals.away, central: old.scoreForecast.primary.score }, after: { home: p.expectedGoals.home, away: p.expectedGoals.away, central: p.scoreForecast.primary.score }, probabilities: p.probabilities.final });
    for (const t of p.teamProjections) {
      const previous = old.teamProjections.find(q => q.teamId === t.teamId);
      const metrics = ['shotsTotal', 'shotsOnTarget', 'corners', 'fouls', 'cards'];
      for (const field of metrics) {
        const value = t[field];
        assert(Number.isFinite(value.central));
        assert(value.min <= value.central && value.central <= value.max);
        assert.equal(value.currentSeasonBaseline.ownMatches, 10);
      }
      assert.equal(t.ownOffensiveInteraction.shotsAdjustmentPct, 0);
      assert.equal(t.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, 0);
      assert.equal(t.ownOffensiveInteraction.cornersAdjustmentPct, 0);
      assert.equal(t.opponentMatchupInteraction.shotsAdjustmentPct, 0);
      assert.equal(t.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0);
      const players = p.shooters.allPlayers.filter(q => q.teamId === t.teamId);
      for (const [playerKey, teamKey] of [['projectedShots', 'shotsTotal'], ['projectedShotsOnTarget', 'shotsOnTarget']]) assert(Math.abs(players.reduce((s, q) => s + q[playerKey], 0) - t[teamKey].central) <= .11);
      for (const player of players) assert(player.projectedShotsOnTarget <= player.projectedShots + .011);
      assert(t.shotsOnTarget.central <= t.shotsTotal.central);
      table.push({ matchId: p.matchId, teamId: t.teamId, before: Object.fromEntries(metrics.map(key => [key, previous[key]?.central ?? null])), after: Object.fromEntries(metrics.map(key => [key, t[key].central])) });
    }
    assert.deepEqual(read(`data/generated/readings/matches/${p.matchId}.json`).predictionDataset.predictions[0].teamProjections, p.teamProjections);
  }
  let commonContractsVerified = 0;
  for (const match of catalog.matches) for (const selection of match.selections) {
    const old = oldCatalog.matches.find(m => m.matchId === match.matchId).selections.find(s => s.selectionId === selection.selectionId);
    if (old) {
      assert.deepEqual(selection.betSelection.identity, old.betSelection.identity);
      assert.deepEqual(selection.betSelection.quote, old.betSelection.quote);
      commonContractsVerified++;
    }
    if (/TIRI.*GIOCATORE/.test(selection.market)) for (const field of ['modelProbabilityPct', 'fairOdds', 'expectedValuePct']) assert.equal(selection.betSelection.evaluation[field], null);
  }
  const { sharedForecastsForMatch } = await import('../js/pages/shared-forecast-contract.mjs');
  const selections = catalog.matches.map(match => {
    const old = sharedForecastsForMatch(oldCatalog, match.matchId), current = sharedForecastsForMatch(catalog, match.matchId);
    return { matchId: match.matchId, before: old.length, after: current.length, added: current.filter(s => !old.some(o => o.selectionId === s.selectionId)).map(s => ({ selectionId: s.selectionId, label: s.label })), removed: old.filter(s => !current.some(o => o.selectionId === s.selectionId)).map(s => ({ selectionId: s.selectionId, label: s.label })) };
  });
  const result = { engineVersion: now.engine.version, table, scores, commonContractsVerified, selections, selectionTotals: { before: selections.reduce((s, m) => s + m.before, 0), after: selections.reduce((s, m) => s + m.after, 0) }, checks: ['All five count metrics updated for 20 teams', 'Current goals and xG for both sides', 'Same Poisson matrix for 1X2, goals and exact scores', 'Player/team volume conservation and SOT <= shots', 'No residual own/opponent volume double count', 'Past fixtures unchanged', 'Quote and identity preserved for common contracts', 'DUO probabilities, fair odds and EV remain null', 'Reading/Schedina/browser synchronized'] };
  fs.mkdirSync('data/analysis/current-team-baseline-2026-11-06', { recursive: true });
  fs.writeFileSync('data/analysis/current-team-baseline-2026-11-06/operational-refresh.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ teams: table.length, fixtures: scores.length, commonContractsVerified, selectionTotals: result.selectionTotals, checks: result.checks }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
