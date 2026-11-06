"use strict";
// Offline research replay of the unchanged technical engine; never a production builder.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { ROOT, read, save } = require("../../xgot-validation.cjs");
const { predictScenario, scoreMatrix, ENGINE_VERSION } = require("../../predictions/engine.js");
const sum = a => a.reduce((n, v) => n + v, 0);
const mean = a => a.length ? sum(a) / a.length : null;
const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
const finite = v => typeof v === "number" && Number.isFinite(v);
const protocol = read("docs/xgot-validation-protocol.json");
const understatAlias = { "AC Milan": "milan", "Parma Calcio 1913": "parma", "Verona": "verona" };
const understatTeam = name => understatAlias[name] || name.toLowerCase();

function previous(rows, target) {
  const lower = Date.parse(target.date) - protocol.historyWindowDays * 86400000;
  return rows.filter(m => m.competition === target.competition && m.date < target.date && Date.parse(m.date) >= lower);
}
function observations(history, id, metric) {
  return history.flatMap(m => {
    const side = m.teams.findIndex(t => t.providerTeamId === id);
    if (side < 0) return [];
    const own = metric === "goals" ? [m.score.home, m.score.away][side] : m.teams[side][metric];
    const against = metric === "goals" ? [m.score.home, m.score.away][1 - side] : m.teams[1 - side][metric];
    return finite(own) && finite(against) ? [{ date: m.date, venue: side ? "away" : "home", for: own, against,
      shots: m.teams[side].shots, id: m.providerMatchId }] : [];
  });
}
function profile(rows) {
  const rate = rr => ({ for: mean(rr.map(r => r.for)), against: mean(rr.map(r => r.against)) });
  return { home: rate(rows.filter(r => r.venue === "home")), away: rate(rows.filter(r => r.venue === "away")),
    overall: rate(rows), recent: rate(rows.slice(-5)) };
}
function enough(rows, venue = false) {
  return rows.length >= protocol.minimumTeamMatches && (!venue || ["home", "away"].every(v =>
    rows.filter(r => r.venue === v).length >= protocol.minimumMatchesPerVenue));
}
function buildInput(target, history) {
  const goalRows = target.teams.map(t => observations(history, t.providerTeamId, "goals"));
  if (!goalRows.every(rows => enough(rows, true))) return null;
  const input = { reading: { sections: {} }, generatedAt: target.kickoffUtc,
    leagueSummary: { homeGoalsPerMatch: mean(history.map(m => m.score.home)), awayGoalsPerMatch: mean(history.map(m => m.score.away)) },
    crossCompetitionBaseline: target.competition !== "serie-a", homeSquad: { players: [] }, awaySquad: { players: [] } };
  for (const [i, side] of ["home", "away"].entries()) {
    const rr = goalRows[i], venue = rr.filter(r => r.venue === side), recent = rr.slice(-5);
    input[side + "Team"] = { id: target.teams[i].providerTeamId };
    input[side + "Profile"] = { competition: target.competition === "serie-a" ? "Serie A" : "UEFA Champions League",
      goalRatesOnTargetScale: true, derived: { goalsPerGame: mean(rr.map(r => r.for)) },
      formation: { appearances: rr.length, goalsFor: sum(rr.map(r => r.for)), goalsAgainst: sum(rr.map(r => r.against)) },
      summary: { shotsPerGame: mean(rr.map(r => r.shots).filter(finite)) } };
    input[side + "Venue"] = { played: venue.length, goalsFor: sum(venue.map(r => r.for)), goalsAgainst: sum(venue.map(r => r.against)) };
    const weights = recent.map((r, index) => 0.82 ** (recent.length - 1 - index));
    input[side + "Recent"] = { goalsFor: sum(recent.map((r, i) => r.for * weights[i])) / sum(weights),
      goalsAgainst: sum(recent.map((r, i) => r.against * weights[i])) / sum(weights) };
  }
  if (target.competition === "serie-a") {
    const xgRows = target.teams.map(t => observations(history, t.providerTeamId, "baselineXg"));
    const valid = history.filter(m => m.teams.every(t => finite(t.baselineXg)));
    if (xgRows.every(rr => enough(rr, true)) && valid.length) {
      input.homeXgProfile = profile(xgRows[0]); input.awayXgProfile = profile(xgRows[1]);
      input.xgLeagueSummary = { homeXgPerMatch: mean(valid.map(m => m.teams[0].baselineXg)), awayXgPerMatch: mean(valid.map(m => m.teams[1].baselineXg)) };
    }
  }
  return input;
}
function xgotProjection(target, history) {
  const eligible = history.filter(m => m.teams.every(t => finite(t.xgot)));
  const rr = target.teams.map(t => observations(eligible, t.providerTeamId, "xgot"));
  if (!rr.every(rows => enough(rows, true))) return null;
  const league = [0, 1].map(i => mean(eligible.map(m => m.teams[i].xgot)));
  const overall = mean(league), prior = protocol.xgotPriorMatches;
  const shrunk = (rows, side) => (sum(rows.map(r => r[side])) + overall * prior) / (rows.length + prior);
  return [0, 1].map(i => league[i] * shrunk(rr[i], "for") / overall * shrunk(rr[1 - i], "against") / overall);
}
function probabilities(matrix) {
  return [sum(matrix.filter(s => s.home > s.away).map(s => s.probability)),
    sum(matrix.filter(s => s.home === s.away).map(s => s.probability)), sum(matrix.filter(s => s.home < s.away).map(s => s.probability))];
}
function evaluate(matrix, score) {
  const p = probabilities(matrix), outcome = score.home > score.away ? 0 : score.home === score.away ? 1 : 2;
  const over = sum(matrix.filter(s => s.home + s.away > 2).map(s => s.probability));
  const btts = sum(matrix.filter(s => s.home > 0 && s.away > 0).map(s => s.probability));
  const binary = (p, observed) => -Math.log(Math.max(1e-12, observed ? p : 1 - p));
  return { p, outcome, logLoss: -Math.log(Math.max(1e-12, p[outcome])),
    brier: sum(p.map((v, i) => (v - Number(i === outcome)) ** 2)),
    over25LogLoss: binary(over, score.home + score.away > 2), bttsLogLoss: binary(btts, score.home > 0 && score.away > 0) };
}
function metrics(rows) {
  if (!rows.length) return null;
  const bins = Array.from({ length: 10 }, (_, bin) => {
    const items = rows.flatMap(r => r.p.map((p, outcome) => ({ p, y: Number(r.outcome === outcome) })))
      .filter(r => Math.min(9, Math.floor(r.p * 10)) === bin);
    return { bin, n: items.length, predicted: mean(items.map(r => r.p)), observed: mean(items.map(r => r.y)) };
  });
  return { n: rows.length, logLoss: mean(rows.map(r => r.logLoss)), brier: mean(rows.map(r => r.brier)),
    over25LogLoss: mean(rows.map(r => r.over25LogLoss)), bttsLogLoss: mean(rows.map(r => r.bttsLogLoss)),
    ece10: sum(bins.filter(b => b.n).map(b => b.n * Math.abs(b.predicted - b.observed))) / (rows.length * 3), calibrationBins: bins };
}
function pairedCI(rows, field = "logLoss") {
  if (!rows.length) return null;
  const blocks = new Map();
  for (const r of rows) {
    const key = Math.floor((Date.parse(r.date) - 4 * 86400000) / (7 * 86400000));
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key).push(r.candidate[field] - r.baseline[field]);
  }
  const groups = [...blocks.values()], samples = [];
  let state = 1337;
  function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; }
  for (let i = 0; i < protocol.bootstrapReplicates; i++) {
    let total = 0, count = 0;
    for (let j = 0; j < groups.length; j++) { const block = groups[Math.floor(random() * groups.length)]; total += sum(block); count += block.length; }
    samples.push(total / count);
  }
  samples.sort((a, b) => a - b);
  return { meanDelta: mean(rows.map(r => r.candidate[field] - r.baseline[field])),
    lower95: samples[Math.floor(samples.length * 0.025)], upper95: samples[Math.floor(samples.length * 0.975)],
    blocks: groups.length, replicates: protocol.bootstrapReplicates };
}
function loadRows() {
  const reconciliation = read("data/analysis/xgot/reconciliation.json");
  const approved = new Map(read("data/normalized/xgot-reconciled-history.json").matches.map(m => [m.providerMatchId, m]));
  const sources = [];
  for (const f of fs.readdirSync(path.join(ROOT, "data/normalized/xgot-history-seasons"))) sources.push(...read(`data/normalized/xgot-history-seasons/${f}`).matches);
  const byId = new Map(sources.map(m => [m.providerMatchId, m]));
  const understat = read("data/normalized/understat-serie-a-xg.json").matches;
  return reconciliation.fixtureIdentityRegistry.filter(m => m.regulationEligible && m.fixtureId).map(m => {
    const source = byId.get(m.providerMatchId), accepted = approved.get(m.providerMatchId);
    const xg = m.competition === "serie-a" ? understat.filter(x => x.season === m.season && x.date.slice(0, 10) === m.date &&
      understatTeam(x.homeTeam.name) === m.teams[0].historicalTeamId && understatTeam(x.awayTeam.name) === m.teams[1].historicalTeamId) : [];
    return { ...m, teams: source.teams.map((t, i) => ({ ...t, xgot: accepted ? accepted.teams[i].xgot : null,
      baselineXg: xg.length === 1 ? [xg[0].xg.home, xg[0].xg.away][i] : null })) };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.providerMatchId.localeCompare(b.providerMatchId));
}
function run() {
  const rows = loadRows(), forecasts = [], competitions = [];
  for (const competition of ["serie-a", "champions-league"]) {
    const pool = rows.filter(m => m.competition === competition), candidates = [];
    for (const target of pool) {
      const history = previous(pool, target), input = buildInput(target, history);
      if (!input) continue;
      const xgot = xgotProjection(target, history);
      if (!xgot) continue;
      const baseline = predictScenario(input);
      const variants = protocol.candidateWeights.map(weight => {
        const lambda = [baseline.expected.home, baseline.expected.away].map((v, i) => clamp(
          v ** (1 - weight) * xgot[i] ** weight, i ? 0.24 : 0.28, i ? 3.3 : 3.5));
        return { weight, lambda, ...evaluate(scoreMatrix(lambda[0], lambda[1], 7), target.score) };
      });
      candidates.push({ providerMatchId: target.providerMatchId, fixtureId: target.fixtureId, competition,
        date: target.date, season: target.season, latestHistoryDate: history.at(-1)?.date,
        historicalSamples: target.teams.map(t => observations(history, t.providerTeamId, "xgot").length),
        baselineXgUsed: !!input.homeXgProfile, variants });
    }
    const development = candidates.filter(m => m.season === protocol.developmentSeason);
    const ranking = protocol.candidateWeights.map(weight => ({ weight, metrics: metrics(development.map(m => m.variants.find(v => v.weight === weight))) }))
      .sort((a, b) => (a.metrics?.logLoss ?? Infinity) - (b.metrics?.logLoss ?? Infinity) || a.weight - b.weight);
    const selectedWeight = ranking[0]?.weight ?? 0;
    const test = candidates.filter(m => m.season === protocol.heldOutTestSeason).map(m => ({ ...m,
      baseline: m.variants[0], candidate: m.variants.find(v => v.weight === selectedWeight) }));
    const baseline = metrics(test.map(m => m.baseline)), candidate = metrics(test.map(m => m.candidate));
    const ci = pairedCI(test), gate = protocol.researchSuccessGate;
    const gates = { developmentSample: development.length >= gate.minimumDevelopmentFixtures,
      testSample: test.length >= gate.minimumTestFixtures, positiveWeight: selectedWeight > 0,
      logLossImprovement: ci ? ci.upper95 < gate.testPairedLogLoss95CIUpperBelow : false,
      brierNonWorsening: !!baseline && candidate.brier <= baseline.brier,
      calibrationNonWorsening: !!baseline && candidate.ece10 <= baseline.ece10 + gate.testECE10MaximumWorsening };
    competitions.push({ competition, totalRegulationFixtures: pool.length, developmentFixtures: development.length,
      testFixtures: test.length, omittedForInsufficientPriorData: pool.length - candidates.length,
      baselineUnderstatUsedInTest: test.filter(m => m.baselineXgUsed).length,
      selectedWeight, developmentRanking: ranking, baseline, candidate, pairedLogLossCI: ci,
      gates, retrospectiveResearchGatePassed: Object.values(gates).every(Boolean), predictiveUseApproved: false });
    forecasts.push(...test.map(({ variants, ...m }) => m));
  }
  const inputs = ["docs/xgot-validation-protocol.json", "data/analysis/xgot/reconciliation.json", "data/normalized/xgot-reconciled-history.json",
    "data/normalized/understat-serie-a-xg.json", "scripts/predictions/engine.js", "scripts/research/xgot/run.cjs"].map(file => ({ path: file,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex") }));
  const report = { schemaVersion: 1, engineVersion: ENGINE_VERSION, protocol, inputs,
    mode: "retrospective-technical-core-replay-not-original-production-forecasts", predictiveUseApproved: false,
    operationalGate: "Not passed: no historical as-of snapshots, full contextual replay or prospective frozen validation",
    individualAndDuoMarketsValidated: false, competitions };
  save("data/analysis/xgot/validation/report.json", report);
  save("data/analysis/xgot/validation/held-out-predictions.json", { schemaVersion: 1, forecasts });
  console.log(JSON.stringify(competitions.map(({ competition, developmentFixtures, testFixtures, selectedWeight, baseline, candidate, pairedLogLossCI, gates, retrospectiveResearchGatePassed }) =>
    ({ competition, developmentFixtures, testFixtures, selectedWeight, baselineLogLoss: baseline?.logLoss, candidateLogLoss: candidate?.logLoss,
      pairedLogLossCI, gates, retrospectiveResearchGatePassed }))));
  return report;
}
if (require.main === module) run();
module.exports = { run, previous, observations, buildInput, xgotProjection, evaluate, metrics, pairedCI, loadRows };
