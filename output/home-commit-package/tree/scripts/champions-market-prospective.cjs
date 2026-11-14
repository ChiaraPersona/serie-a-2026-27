'use strict';
const fs = require('node:fs'), path = require('node:path');
const { ROOT, read, hash, collectActuals, baselineFor, actualFor } = require('./champions/validation-data.cjs');
const { baselineForTarget, captureFixture, freeze, evaluate, digest } = require('./champions/market-prospective.cjs');
const snapshotRoot = path.join(ROOT, 'data/predictions/champions-market-prospective');
function run({ capture = false, matchday = 4 } = {}) {
  const now = new Date().toISOString(); // Never accept a caller-supplied historical capture time.
  const code = String(matchday).padStart(2, '0');
  const files = { calendar: 'data/normalized/champions-league-2026-27.json', catalog: `data/normalized/schedina-champions-md${code}.json`, scenarios: 'data/generated/champions-shared-scenarios.json', history: 'data/normalized/uefa-europe-history-2023-26.json' };
  const calendar = read(files.calendar), catalog = read(files.catalog), scenarios = read(files.scenarios), history = read(files.history);
  const actuals = collectActuals(now);
  for (const row of actuals.teams) row.goals = row.score?.[row.side] ?? null;
  const receipts = Object.fromEntries([...Object.values(files), 'data/sources/champions-pilot-match-stats-2025-27.json', 'scripts/predictions/engine.js', 'scripts/md06-statistical-models.js', 'scripts/champions/shared-scenario.cjs', 'scripts/champions/market-prospective.cjs', 'scripts/champions/md04-team-volume-markets.cjs', 'scripts/champions/event-validation.cjs', 'scripts/champions/european-result-policy.cjs', 'scripts/research/european-rating-model.cjs', 'data/sources/champions-european-result-policy.json', 'data/sources/champions-team-history-map-2026-27.json', 'data/normalized/champions-team-strength-2026-27.json'].map(p => [p, hash(p)]));
  const countModelId = 'champions-md04-counts:' + digest(Object.fromEntries(['scripts/predictions/engine.js', 'scripts/md06-statistical-models.js', 'scripts/champions/shared-scenario.cjs', 'scripts/champions/md04-team-volume-markets.cjs'].map(p => [p, receipts[p]])));
  const captureResults = [];
  if (capture) for (const fixture of calendar.fixtures.filter(f => f.matchday === matchday)) {
    const match = catalog.marketCatalog.matches.find(m => m.matchId === fixture.id);
    if (!match) { captureResults.push({ fixtureId: fixture.id, status: 'NO_PUBLISHED_CATALOG' }); continue; }
    const scenario = scenarios.fixtures.find(f => f.fixtureId === fixture.id);
    const result = captureFixture({ fixture, match, catalogGeneratedAt: catalog.generatedAt, now, receipts, countModelId, baseline: t => baselineForTarget(t, actuals, history, now, baselineFor), meanForLeg: (leg, t) => {
      const metric = { shots: 'shotsTotal', sot: 'shotsOnTarget', corners: 'corners' }[t.metric];
      if (t.scope === 'player') return null;
      if (t.metric === 'goals') return scenario?.expectedGoals ? scenario.expectedGoals.home + scenario.expectedGoals.away : null;
      return (t.scope === 'team' ? scenario?.teamProjections?.find(s => s.teamId === t.subjectId) : scenario?.matchProjection)?.[metric]?.central ?? null;
    } });
    captureResults.push({ fixtureId: fixture.id, status: result.snapshot ? freeze(result.snapshot, snapshotRoot) : result.status, events: result.snapshot?.events.length || 0, excluded: result.snapshot?.exclusions.length || 0 });
  }
  const snapshots = fs.existsSync(snapshotRoot) ? fs.readdirSync(snapshotRoot).filter(name => /^ucl-/.test(name)).flatMap(name => fs.readdirSync(path.join(snapshotRoot, name)).filter(file => /^(first|revision-[a-f0-9]+)\.json$/.test(file)).map(file => JSON.parse(fs.readFileSync(path.join(snapshotRoot, name, file), 'utf8')))) : [];
  const report = { ...evaluate(snapshots, actuals, actualFor, now), captureResults };
  const output = path.join(ROOT, 'data/analysis/champions/market-prospective');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ captureResults, snapshots: snapshots.length, observations: report.observations, pending: report.pending.length, quarantined: report.quarantine.length, activation: false }));
  return report;
}
if (require.main === module) {
  const i = process.argv.indexOf('--matchday');
  run({ capture: process.argv.includes('--capture'), matchday: i < 0 ? 4 : Number(process.argv[i + 1]) });
}
module.exports = { run };
