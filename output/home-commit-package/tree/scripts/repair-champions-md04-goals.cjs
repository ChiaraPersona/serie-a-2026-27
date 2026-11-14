'use strict';
// Repair serialized probabilities only. No lineup/model/selection regeneration.
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { buildTeamCatalog } = require('./build-champions-md04.cjs');
const { readJsonFile } = require('./sisal/dataset-store.cjs');
const { scoreMatrix, sensitivityMatrices, matrixProbability } = require('./predictions/engine');
const { scorePredicateForLeg } = require('./md06-scenario-coherence');
const { zonedLocalToUtc } = require('./champions/complete-forecast-snapshots');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
async function repair() {
  const now = new Date().toISOString();
  const file = 'data/normalized/schedina-champions-md04.json';
  const catalog = read(file), calendar = read('data/normalized/champions-league-2026-27.json'), scenarios = read('data/generated/champions-shared-scenarios.json');
  const odds = readJsonFile('data/normalized/odds/sisal/champions-league.json');
  const futureIds = new Set(calendar.fixtures.filter(f => f.matchday === 4 && f.status === 'scheduled' && Date.parse(zonedLocalToUtc(f.date, f.kickoff, 'Europe/Rome')) > Date.parse(now)).map(f => f.id));
  const targetScenarios = scenarios.fixtures.filter(f => futureIds.has(f.fixtureId));
  const rebuilt = await buildTeamCatalog({ fixtures: targetScenarios }, odds);
  const original = structuredClone(catalog), changed = [];
  for (const match of catalog.marketCatalog.matches.filter(m => futureIds.has(m.matchId))) {
    const fixture = targetScenarios.find(f => f.fixtureId === match.matchId);
    const candidates = new Map((rebuilt.find(m => m.matchId === match.matchId)?.selections || []).filter(l => l.suggestionAnalysis.family === 'goals').map(l => [l.selectionId, l]));
    for (const leg of match.selections.filter(l => l.suggestionAnalysis?.family === 'goals' && l.catalogOrigin === 'champions-md04-shared-scenario')) {
      const replacement = candidates.get(leg.selectionId);
      assert(replacement, `Exact quoted contract missing: ${leg.selectionId}`);
      assert.equal(replacement.odds, leg.odds, 'Quote changed; refusing implicit odds refresh');
      assert.equal(Number(replacement.threshold), Number(leg.threshold));
      const before = structuredClone(leg), evaluation = leg.betSelection.evaluation;
      const p = replacement.modelProbabilityPct;
      const predicate = scorePredicateForLeg(leg);
      assert(predicate, 'Existing scenario predicate required');
      const matrices = sensitivityMatrices(fixture.expectedGoals, scoreMatrix(fixture.expectedGoals.home, fixture.expectedGoals.away, 7, null), null);
      const values = matrices.map(matrix => matrixProbability(matrix, predicate.predicate) * 100);
      assert(Math.abs(values[0] - p) < 1e-9, 'Central probability and existing sensitivity must agree');
      leg.modelProbabilityPct = p; leg.modelProbability = p / 100;
      evaluation.modelProbabilityPct = p;
      evaluation.fairOdds = p > 0 ? 100 / p : null;
      evaluation.expectedValuePct = (p / 100 * leg.odds - 1) * 100;
      evaluation.provenance.adapterVersion = 'MD04_GOALS_SCORE_OBJECT_V1';
      if ('fairOdds' in leg) leg.fairOdds = evaluation.fairOdds;
      if (leg.expectedValue != null) leg.expectedValue = evaluation.expectedValuePct / 100;
      if (leg.expectedValuePct != null) leg.expectedValuePct = evaluation.expectedValuePct;
      if (evaluation.uncertainty?.sensitivity) evaluation.uncertainty.sensitivity = { ...evaluation.uncertainty.sensitivity, probabilitiesPct: values.map(v => Number(v.toFixed(4))), minimumPct: Number(Math.min(p, ...values).toFixed(4)), centralModelDifferencePct: Number((values[0] - p).toFixed(4)) };
      assert.deepEqual(leg.betSelection.quote, before.betSelection.quote);
      assert.deepEqual(leg.betSelection.identity, before.betSelection.identity);
      assert.deepEqual(leg.betSelection.market, before.betSelection.market);
      assert.deepEqual(leg.suggestionAnalysis, before.suggestionAnalysis);
      assert.equal(leg.qualifiedSelection, before.qualifiedSelection);
      if (hash(before) !== hash(leg)) changed.push({ fixtureId: match.matchId, selectionId: leg.selectionId, selected: leg.suggestionAnalysis.suggested, before, after: structuredClone(leg) });
    }
  }
  for (const match of original.marketCatalog.matches) {
    const after = catalog.marketCatalog.matches.find(m => m.matchId === match.matchId);
    if (!futureIds.has(match.matchId)) assert.deepEqual(after, match, 'Past or unrelated fixture changed');
    else {
      assert.deepEqual(after.selections.filter(l => l.suggestionAnalysis?.family !== 'goals'), match.selections.filter(l => l.suggestionAnalysis?.family !== 'goals'));
      assert.deepEqual(after.suggestions, match.suggestions);
    }
  }
  assert.deepEqual(catalog.slips, original.slips);
  assert.deepEqual(catalog.marketCatalog.myCombo, original.marketCatalog.myCombo);
  const report = { generatedAt: now, cause: 'matrixProbability supplies a score object; the goals predicate incorrectly expected two numeric arguments', correction: 'MD04_GOALS_SCORE_OBJECT_V1', changed: changed.length, fixtureIds: [...new Set(changed.map(r => r.fixtureId))], selectedRowsChanged: changed.filter(r => r.selected).length, beforeHash: hash(original), afterHash: hash(catalog), snapshotsModified: false, changes: changed };
  if (changed.length) {
    catalog.probabilityCorrections = [...(catalog.probabilityCorrections || []), { appliedAt: now, adapterVersion: report.correction, fixtureIds: report.fixtureIds, rows: changed.length, originalGeneratedAt: catalog.generatedAt }];
    fs.mkdirSync('data/technical-archive/champions-md04/goal-probability-repairs', { recursive: true });
    const reportPath = `data/technical-archive/champions-md04/goal-probability-repairs/${now.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  }
  console.log(JSON.stringify({ changed: report.changed, selectedRowsChanged: report.selectedRowsChanged, fixtureIds: report.fixtureIds }));
  return report;
}
if (require.main === module) repair().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { repair };
