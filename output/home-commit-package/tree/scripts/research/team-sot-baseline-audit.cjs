'use strict';

// Isolated diagnostic experiment. Does not build or change operational forecasts.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { volumeMetric, applyOwnOffensiveVolumeProfile } = require('../predictions/engine');
const root = path.resolve(__dirname, '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const matches = read('data/normalized/matches.json');
const volumes = read('data/normalized/team-volume-profiles-2025-26.json').profiles;
const styles = read('data/normalized/team-style-profiles.json').profiles;
const policies = read('data/sources/team-matchup-profiles-2026-27.json');
const byId = rows => new Map(rows.map(x => [x.teamId, x]));
const volumeById = byId(volumes), styleById = byId(styles), policyById = byId(policies.profiles);
const mean = a => a.reduce((s, n) => s + n, 0) / a.length;
const round = n => Number(n.toFixed(4));
const quantile = (a, q) => { const b = [...a].sort((x, y) => x - y), i = (b.length - 1) * q; return b[Math.floor(i)] + (b[Math.ceil(i)] - b[Math.floor(i)]) * (i % 1); };
const robust = a => { const cap = quantile(a, .8); return mean(a.map(x => Math.min(x, cap))); };
const historicalLeague = mean(volumes.map(p => p.venues.overall.shotsOnTarget.for.mean));
const eligible = matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.status === 'finished');
const rowsFor = (teamId, cutoff) => eligible.filter(m => m.matchday < cutoff && [m.homeTeam, m.awayTeam].includes(teamId))
  .sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id)).map(m => {
    const side = m.homeTeam === teamId ? 'home' : 'away', other = side === 'home' ? 'away' : 'home';
    return { matchId: m.id, matchday: m.matchday, venue: side, own: m.teamStats?.[side]?.shotsOnTarget, against: m.teamStats?.[other]?.shotsOnTarget };
  });

function proxyPrior(teamId) {
  // Historical XI are unavailable in this baseline-only comparison.
  const shots = styleById.get(teamId)?.summary?.shotsPerGame ?? 10.5;
  const value = shots * .34;
  return { mean: value, matches: 38, sd: 1.65, p20: Math.max(0, value - 1.4), p80: value + 1.4, source: 'proxy-accuracy-prior' };
}

function legacy(teamId, opponentId, venue, cutoff, capOverride) {
  const own = volumeById.get(teamId), opponent = volumeById.get(opponentId);
  const metric = volumeMetric(null, null, own, opponent, venue, 'shotsOnTarget', 1, proxyPrior(teamId));
  const current = rowsFor(teamId, cutoff).map(r => r.own).filter(Number.isFinite);
  const config = policyById.get(teamId);
  const historical = own?.venues.overall.shotsOnTarget.for.mean;
  // Cross-competition historical target, if configured, comes from the existing builder.
  const historicalTarget = historical ?? crossHistorical.get(teamId);
  const target = current.length && Number.isFinite(historicalTarget)
    ? (historicalTarget * 12 + robust(current) * current.length) / (12 + current.length) : null;
  const cappedProfile = { offense: { teamOffensiveAllocation: {
    ...(config?.offensiveAllocationPolicy || {}),
    ...(capOverride == null ? {} : { teamSotMaxAdjustmentPct: capOverride })
  }, teamSotVolume: { shrunkPerGame: target } } };
  applyOwnOffensiveVolumeProfile(cappedProfile, { min: 8, central: 12, max: 16 }, metric, { min: 3, central: 5, max: 8 });
  return metric.central;
}

function candidate(teamId, opponentId, venue, cutoff, { prior = 12, weakPrior = 4, winsor = false } = {}) {
  const opponentVenue = venue === 'home' ? 'away' : 'home';
  const estimate = (id, seat, field) => {
    const values = rowsFor(id, cutoff).map(r => r[field]).filter(Number.isFinite);
    const historical = volumeById.get(id)?.venues?.[seat]?.shotsOnTarget?.[field === 'own' ? 'for' : 'against']?.mean;
    const k = Number.isFinite(historical) ? prior : weakPrior;
    const base = Number.isFinite(historical) ? historical : historicalLeague;
    const observed = values.length ? (winsor ? robust(values) : mean(values)) : base;
    return { value: (base * k + observed * values.length) / (k + values.length), historical: historical ?? null, observed, matches: values.length, priorEquivalentMatches: k, currentWeight: values.length / (values.length + k) };
  };
  const own = estimate(teamId, venue, 'own'), opponent = estimate(opponentId, opponentVenue, 'against');
  const recent = rowsFor(teamId, cutoff).slice(-8).map(r => r.own).filter(Number.isFinite).reverse();
  const recentMean = recent.length ? recent.reduce((s, x, i) => s + x * .82 ** i, 0) / recent.reduce((s, _, i) => s + .82 ** i, 0) : own.value;
  return { central: .45 * own.value + .35 * opponent.value + .2 * recentMean, own, opponent, recentMean };
}

// Read-only builder, using the same cutoff as the published target.
const { buildProfiles } = require('../build-team-matchup-profiles');
const profiles = buildProfiles({ asOfMatchday: 11, excludeMatchId: 'cagliari-frosinone-2026-27-md-11' }).profiles;
const crossHistorical = new Map(profiles.filter(p => p.historicalBaseline.crossCompetitionHistoricalBaseline?.enabled)
  .map(p => [p.teamId, p.historicalBaseline.shotsOnTargetForPerGame]));
const published = read('data/generated/readings/matches/cagliari-frosinone-2026-27-md-11.json').predictionDataset.predictions[0].teamProjections.find(t => t.teamId === 'frosinone');
const replay = target => {
  const sot = structuredClone(published.legacyVolumeProjection.shotsOnTarget);
  applyOwnOffensiveVolumeProfile({ offense: { teamOffensiveAllocation: { enabled: true, teamSotMaxAdjustmentPct: 6 }, teamSotVolume: { shrunkPerGame: target } } }, { central: 11.5, min: 8, max: 16 }, sot, { central: 5.7, min: 3, max: 8 });
  return sot.central;
};
assert.equal(replay(6.2), 4.1);
assert.equal(replay(8), 4.1, 'Reproduce the current cap plateau');
const frosinoneRows = rowsFor('frosinone', 11);
assert.equal(frosinoneRows.length, 10);
assert.equal(mean(frosinoneRows.map(r => r.own)), 6.6);
assert(rowsFor('frosinone', 9).every(r => r.matchday < 9));
const models = {
  legacy_proxy: (a, b, v, d) => legacy(a, b, v, d),
  cap20_only_proxy: (a, b, v, d) => legacy(a, b, v, d, 20),
  current_raw_k12_weak4: (a, b, v, d) => candidate(a, b, v, d).central,
  current_robust_k12_weak4: (a, b, v, d) => candidate(a, b, v, d, { winsor: true }).central,
  current_raw_k12_weak12: (a, b, v, d) => candidate(a, b, v, d, { weakPrior: 12 }).central,
  season_mean: (a, b, v, d) => mean(rowsFor(a, d).map(r => r.own).filter(Number.isFinite))
};
const forecasts = eligible.filter(m => m.matchday >= 6).flatMap(m => ['home', 'away'].flatMap(venue => {
  const teamId = venue === 'home' ? m.homeTeam : m.awayTeam, opponentId = venue === 'home' ? m.awayTeam : m.homeTeam;
  const observed = m.teamStats?.[venue]?.shotsOnTarget;
  if (!Number.isFinite(observed)) return [];
  const predictions = Object.fromEntries(Object.entries(models).map(([id, fn]) => [id, fn(teamId, opponentId, venue, m.matchday)]));
  assert(Object.values(predictions).every(Number.isFinite));
  return [{ matchId: m.id, matchday: m.matchday, teamId, venue, observed, predictions }];
}));
function evaluate(rows) {
  return Object.fromEntries(Object.keys(models).map(id => {
    const errors = rows.map(r => r.predictions[id] - r.observed);
    return [id, { teamForecasts: rows.length, matchClusters: new Set(rows.map(r => r.matchId)).size, mae: round(mean(errors.map(Math.abs))), rmse: round(Math.sqrt(mean(errors.map(x => x * x)))), bias: round(mean(errors)) }];
  }));
}
function pairedClusterBootstrap(rows, modelId, repetitions = 2000) {
  // Resample whole fixtures so home/away observations remain dependent.
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.matchId) || [];
    group.push(Math.abs(row.predictions[modelId] - row.observed) - Math.abs(row.predictions.legacy_proxy - row.observed));
    groups.set(row.matchId, group);
  }
  const clusters = [...groups.values()], deltas = [];
  let seed = 11062026;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < repetitions; i++) {
    const sampled = Array.from({ length: clusters.length }, () => clusters[Math.floor(random() * clusters.length)]).flat();
    deltas.push(mean(sampled));
  }
  return { model: modelId, comparison: 'MAE candidate minus legacy proxy; negative is better', seed: 11062026, repetitions, percentile95: [round(quantile(deltas, .025)), round(quantile(deltas, .975))], note: 'Descriptive interval only; excludes model selection, input revision and proxy uncertainty.' };
}
// Leakage check: altering target-round outcomes cannot alter its forecast.
const cutoffProbe = candidate('frosinone', 'lecce', 'home', 9).central;
const targetProbe = eligible.find(m => m.id === 'frosinone-lecce-2026-27-md-09');
const originalProbe = targetProbe.teamStats.home.shotsOnTarget;
targetProbe.teamStats.home.shotsOnTarget = 999;
assert.equal(candidate('frosinone', 'lecce', 'home', 9).central, cutoffProbe);
targetProbe.teamStats.home.shotsOnTarget = originalProbe;
assert(Number.isFinite(candidate('frosinone', 'cagliari', 'away', 1).central));
const frosCandidate = candidate('frosinone', 'cagliari', 'away', 11);
// Context recovered from the published pre-cap inputs, not fitted to outcomes.
const inputs = published.legacyVolumeProjection.shotsOnTarget.inputs;
const baseMean = inputs.reduce((s, x) => s + x.mean * x.weightPct, 0) / inputs.reduce((s, x) => s + x.weightPct, 0);
const contextApprox = published.legacyVolumeProjection.shotsOnTarget.central / baseMean;
const result = {
  generatedAt: new Date().toISOString(), role: 'RESEARCH_ONLY', operationalChanges: false,
  limitations: ['Baseline-only comparison, not a replay of full historical XI, tactical, possession or opponent interactions.', 'Historical proxy uses fixed .34 accuracy when missing own venue history; published case is replayed exactly only for the cap operation.', 'Candidates declared after observing the symptom; MD9-10 is a descriptive temporal check, not an untouched holdout.', '100 side forecasts correspond to 50 dependent match clusters; no statistical superiority claim.', 'Current overall means mix venues and opponents. Venue pooling and opponent-strength normalization remain to validate.', 'No direct Serie B to Serie A equivalence in candidate baselines.'],
  diagnosis: { actualMean: mean(frosinoneRows.map(r => r.own)), homeMean: mean(frosinoneRows.filter(r => r.venue === 'home').map(r => r.own)), awayMean: mean(frosinoneRows.filter(r => r.venue === 'away').map(r => r.own)), rows: frosinoneRows, updatedSotProfile: profiles.find(p => p.teamId === 'frosinone').offense.teamSotVolume, publishedSot: published.shotsOnTarget, legacySot: published.legacyVolumeProjection.shotsOnTarget, capReplay: { target6_2: replay(6.2), target8: replay(8) }, candidate: frosCandidate, approximateSameContext: round(frosCandidate.central * contextApprox) },
  evaluation: { all: evaluate(forecasts), md6to8: evaluate(forecasts.filter(r => r.matchday <= 8)), md9to10: evaluate(forecasts.filter(r => r.matchday >= 9)), promotedTeams: evaluate(forecasts.filter(r => !volumeById.has(r.teamId))), otherTeams: evaluate(forecasts.filter(r => volumeById.has(r.teamId))) },
  uncertainty: pairedClusterBootstrap(forecasts, 'current_raw_k12_weak4'),
  checks: ['Exact published cap replay', '10 canonical current fixtures and mean 6.6', 'Target round outcome perturbation excluded', 'No-current-data fallback finite', 'All experimental predictions finite'], forecasts
};
const outputDir = path.join(root, 'data/analysis/team-sot-baseline-audit-2026-11-06');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ diagnosis: { mean: result.diagnosis.actualMean, home: result.diagnosis.homeMean, away: result.diagnosis.awayMean, published: published.shotsOnTarget.central, candidateNeutral: round(frosCandidate.central), candidateApproxContext: result.diagnosis.approximateSameContext }, evaluation: result.evaluation.all, uncertainty: result.uncertainty, checks: result.checks }, null, 2));
