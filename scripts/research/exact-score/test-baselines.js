"use strict";
const assert = require("assert"), fs = require("fs"), path = require("path");
const { studyConfiguration } = require("./config");
const { makeFeatureVector } = require("./features");
const { predictStrengthBaseline, stabilizedRate } = require("./baselines");
const { historicalXGAdapter, auditCurrentXG } = require("./historical-xg");
const { registry, createModel } = require("./models");
const { independentPoissonScoreMatrix } = require("./distribution");
const { pairedBootstrap, compare } = require("./comparison");
const { captureProduction, assertProductionUnchanged } = require("./integrity");

function runSyntheticBaselineTests() {
  let assertions = 0;
  const check = (condition, message) => { assert(condition, message); assertions++; };
  const near = (a, b) => check(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  const throws = fn => { assert.throws(fn); assertions++; };
  const configuration = studyConfiguration();
  const first = { id: "h-a-md1", matchday: 1, homeTeam: "h", awayTeam: "a", competition: "serie-a", season: "2026-27", date: "2026-08-23", kickoff: "15:00", status: "finished", score: { home: 4, away: 1 }, teamStats: { home: { expectedGoals: 2 }, away: { expectedGoals: 0.8 } } };
  const second = { ...first, id: "a-h-md2", matchday: 2, homeTeam: "a", awayTeam: "h", date: "2026-08-30", score: { home: 9, away: 9 } };
  const third = { ...first, id: "h-a-md3", matchday: 3, date: "2026-09-05", score: { home: 99, away: 99 } };
  const prior = { competition: "serie-a", season: "2025-26", status: "final", retrievedAt: "2026-07-18", rows: [{ team: "h", played: 38, goalsFor: 57, goalsAgainst: 38 }, { team: "a", played: 38, goalsFor: 38, goalsAgainst: 57 }], homeRows: [{ team: "h", played: 19, goalsFor: 38, goalsAgainst: 19 }, { team: "a", played: 19, goalsFor: 19, goalsAgainst: 38 }], awayRows: [{ team: "h", played: 19, goalsFor: 19, goalsAgainst: 19 }, { team: "a", played: 19, goalsFor: 19, goalsAgainst: 19 }] };
  const hist = { source: "data/normalized/understat-serie-a-xg.json", sourceHash: "synthetic-xg", competition: "serie-a", season: "2025-26", retrievedAt: "2026-08-01", rows: [{ id: "old", date: "2026-05-01" }], audit: {}, teams: {}, league: {} };
  const rate = value => ({ value, sample: 1, matchIds: ["old"] });
  hist.league = { home: rate(1.5), away: rate(1) };
  hist.teams.h = { overallFor: rate(1.5), overallAgainst: rate(1), homeFor: rate(2), homeAgainst: rate(0.8), awayFor: rate(1), awayAgainst: rate(1.2) };
  hist.teams.a = { overallFor: rate(1), overallAgainst: rate(1.5), homeFor: rate(1.2), homeAgainst: rate(1.8), awayFor: rate(0.8), awayAgainst: rate(1.2) };
  const sourceHashes = { "data/normalized/matches.json": "synthetic-current", "data/normalized/standings-2025-26.json": "synthetic-goal-prior", [hist.source]: hist.sourceHash };
  const matches = [first, second, third];
  const vector = target => makeFeatureVector({ target, matches, prior, sourceHashes, historicalXG: hist });
  for (const kind of ["TEAM_GOALS_BASELINE", "XG_BASELINE"]) {
    const md1 = predictStrengthBaseline(vector(first), kind, configuration);
    check(md1 != null, `${kind} prior-only available`);
    Object.values(md1.diagnostics.components).forEach(c => { near(c.currentWeight, 0); near(c.priorWeight, 1); check(c.maturity.label === "PRIOR_ONLY", "MD1 prior-only"); check(c.provenance.sourceMatches.length === 0, "MD1 no current outcomes"); });
    const md2 = predictStrengthBaseline(vector(second), kind, configuration);
    Object.values(md2.diagnostics.components).forEach(c => { check(c.provenance.sourceMatches.every(id => id === first.id), "MD2 only MD1"); check(c.currentWeight <= 1 / 13 + 1e-12, "single-match strong shrinkage"); near(c.currentWeight + c.priorWeight, 1); check(new Set([...c.provenance.venueMatches, ...c.provenance.nonVenueMatches]).size === c.provenance.sourceMatches.length, "disjoint current evidence"); });
    const md3 = predictStrengthBaseline(vector(third), kind, configuration);
    check(Object.values(md3.diagnostics.components).every(c => c.provenance.sourceMatches.every(id => [first.id, second.id].includes(id)) && !c.provenance.sourceMatches.includes(third.id)), "MD3 excludes target/future");
    check([md1, md2, md3].every(p => Number.isFinite(p.lambdaHome) && p.lambdaHome >= 0 && Number.isFinite(p.lambdaAway) && p.lambdaAway >= 0), "finite nonnegative lambda");
    check(md3.diagnostics.cutoffMatchday === 2 && md3.diagnostics.matchesAvailable === 2, "as-of trace");
  }
  const md1Goals = predictStrengthBaseline(vector(first), "TEAM_GOALS_BASELINE", configuration);
  near(md1Goals.diagnostics.components.homeAttack.stabilizedRate, 2);
  near(md1Goals.diagnostics.components.awayAttack.stabilizedRate, 1);
  near(md1Goals.diagnostics.components.homeDefense.leagueNormalization, md1Goals.diagnostics.leagueAwayRate);
  near(md1Goals.diagnostics.components.awayDefense.leagueNormalization, md1Goals.diagnostics.leagueHomeRate);
  near(stabilizedRate(5, 1, 1, 12).value, 17 / 13);
  check(stabilizedRate(5, 4, 1, 12).currentWeight > stabilizedRate(5, 1, 1, 12).currentWeight, "maturity grows with sample");
  throws(() => stabilizedRate(1, 1, 1, 0));
  const promoted = vector(first); promoted.features["home.historicalVenueGoalsFor"].value = null; promoted.features["home.historicalGoalsFor"].value = null;
  const promotedPrediction = predictStrengthBaseline(promoted, "TEAM_GOALS_BASELINE", configuration);
  check(promotedPrediction.diagnostics.components.homeAttack.fallback === "LEAGUE_PRIOR_NO_SERIE_A_TEAM_PRIOR", "promoted conservative league fallback");
  near(promotedPrediction.diagnostics.components.homeAttack.stabilizedStrength, 1);
  const missing = vector(second); missing.features["home.currentXGF"].value = null; missing.features["home.venueXGF"].value = null; missing.features["home.xgCoverage"].value = 0;
  const missingPrediction = predictStrengthBaseline(missing, "XG_BASELINE", configuration);
  check(missingPrediction.lambdaHome > 0 && missingPrediction.diagnostics.components.homeAttack.rawOverallRate === null, "missing xG never zero");
  check(missingPrediction.diagnostics.components.homeAttack.coverageFallback === "CURRENT_XG_COVERAGE_INSUFFICIENT_USING_PRIOR", "coverage gate explicit prior fallback");
  const noHist = makeFeatureVector({ target: first, matches, prior, sourceHashes });
  check(predictStrengthBaseline(noHist, "XG_BASELINE", configuration) === null, "no available xG environment returns unavailable");
  const lateHist = makeFeatureVector({ target: first, matches, prior, sourceHashes, historicalXG: { ...hist, retrievedAt: "2026-09-01" } });
  check(predictStrengthBaseline(lateHist, "XG_BASELINE", configuration) === null, "historical xG availability cutoff");
  const crossCompetition = makeFeatureVector({ target: first, matches, prior, sourceHashes, historicalXG: { ...hist, competition: "serie-b" } });
  check(crossCompetition.features["home.historicalXGF"].value === null, "cross-competition xG not equivalent");
  const changed = structuredClone(vector(third));
  for (const [key, feature] of Object.entries(changed.features)) if (key.includes("goalsFor") || key.includes("goalsAgainst") || key.includes("GoalsFor") || key.includes("GoalsAgainst") || key.includes("Residual")) feature.value = 1000;
  const m2Before = predictStrengthBaseline(vector(third), "XG_BASELINE", configuration), m2After = predictStrengthBaseline(changed, "XG_BASELINE", configuration);
  near(m2Before.lambdaHome, m2After.lambdaHome); near(m2Before.lambdaAway, m2After.lambdaAway);
  const model = registry("2026-10-03", { baselineStudy: true, researchConfig: configuration }).models[1];
  const prediction = createModel(model, { baselineStudy: true, researchConfig: configuration }).predictMatch(vector(third));
  assert.deepEqual(prediction.scoreMatrix, independentPoissonScoreMatrix(prediction.lambdaHome, prediction.lambdaAway)); assertions++;
  throws(() => predictStrengthBaseline({ ...vector(third), targetMatchday: 6 }, "XG_BASELINE", configuration));
  const audit = auditCurrentXG([{ ...first, teamStats: { home: { expectedGoals: 0 }, away: { expectedGoals: null } } }]);
  check(audit.withHomeXG === 1 && audit.withAwayXG === 0 && audit.completeXGMatches === 0 && audit.teamsAffected.length === 2, "xG audit zero vs missing");
  throws(() => historicalXGAdapter({ provider: "Understat", competition: "Serie A", retrievedAt: "2026-08-01", matches: [{ season: "2025-26", providerMatchId: "x", date: "2026-05-01", homeTeam: { name: "Unknown" }, awayTeam: { name: "Inter" }, xg: { home: 1, away: 1 } }] }, "hash"));
  const bootstrapConfig = { ...configuration.bootstrap, iterations: 100 };
  const diagnostics = Array.from({ length: 4 }, (_, i) => ({ matchId: `m${i}`, matchday: i < 2 ? 1 : 2, lambdaHome: 1, lambdaAway: 1, actualHomeGoals: 1, actualAwayGoals: 1, scoreLogLoss: 2 + i, rps: 0.2, actualScoreProbability: 0.1, exactHit: true, top3Hit: true, top5Hit: true, actualScoreRank: 1, outcomeLogLoss: 1, btts: { yes: 0.5, no: 0.5 }, actualBTTS: 1, overUnder: { 1.5: { over: 0.5 }, 2.5: { over: 0.4 }, 3.5: { over: 0.3 } } }));
  const adjusted = diagnostics.map(d => ({ ...d, scoreLogLoss: d.scoreLogLoss - 0.5 }));
  const intervals = pairedBootstrap(diagnostics, adjusted, bootstrapConfig, "MATCH");
  near(intervals.intervals.scoreLogLoss.ci95[0], -0.5); near(intervals.intervals.scoreLogLoss.ci95[1], -0.5);
  check(pairedBootstrap(diagnostics, adjusted, bootstrapConfig, "MATCHDAY").clusters === 2, "matchday clustered pairing");
  assert.deepEqual(pairedBootstrap(diagnostics, adjusted, bootstrapConfig, "MATCH"), intervals); assertions++;
  const same = { model: { id: "model" }, sample: 4, matchDiagnostics: diagnostics };
  check(compare(same, same, { ...configuration, bootstrap: bootstrapConfig }).status === "SIMILAR", "identical contributions only similarity");
  check(compare({ ...same, sample: 0, matchDiagnostics: [] }, { ...same, sample: 0, matchDiagnostics: [] }, { ...configuration, bootstrap: bootstrapConfig }).status === "INSUFFICIENT", "empty comparison unavailable");
  return { status: "PASS", assertions, scope: "M1_M2_SHRINKAGE_CUTOFF_FALLBACK_XG_PURITY_PAIRED_BOOTSTRAP" };
}

function runRepositoryBaselineTests() {
  const root = path.resolve(__dirname, "../../.."), before = captureProduction(root);
  const { loadInputs, parseConfiguration, buildResearchArtifacts } = require("./run");
  const inputs = loadInputs(), config = parseConfiguration(["--models", "league,team-goals,xg", "--through-matchday", "5"]);
  const fixedDate = "2026-10-03T00:00:00.000Z";
  const result = buildResearchArtifacts(inputs, config, fixedDate);
  assert.equal(result.evaluation.commonSample.n, 50);
  for (const id of ["M0", "M1", "M2"]) assert.deepEqual(result.evaluation[id].matchIds, result.evaluation.M0.matchIds);
  const old = buildResearchArtifacts(inputs, {}, fixedDate);
  assert.deepEqual(result.retrospectivePredictions.models["league-poisson-r0"], old.retrospectivePredictions.models["league-poisson-r0"]);
  const opening = result.retrospectivePredictions.models["goals-poisson-r0"].filter(p => p.targetMatchday === 1);
  assert(opening.every(p => Object.values(p.diagnostics.components).every(c => c.currentWeight === 0 && c.maturity.label === "PRIOR_ONLY")));
  const missingHistoricalTeams = result.evaluation.xgCoverage.historicalTeamPriorMissing;
  assert.deepEqual(missingHistoricalTeams.sort(), ["frosinone", "monza", "venezia"]);
  for (const [id, predictions] of Object.entries(result.retrospectivePredictions.models)) {
    assert.equal(predictions.length, 50);
    for (const p of predictions) {
      assert(p.targetMatchday <= 5 && p.generationClass === "RETROSPECTIVE");
      assert(Number.isFinite(p.lambdaHome) && p.lambdaHome >= 0 && Number.isFinite(p.lambdaAway) && p.lambdaAway >= 0);
      if (id === "league-poisson-r0") continue;
      for (const c of Object.values(p.diagnostics.components)) {
        assert(!c.provenance.sourceMatches.includes(p.matchId));
        c.provenance.sourceMatches.forEach(sourceId => assert(inputs.matches.find(m => m.id === sourceId).matchday < p.targetMatchday));
        assert(Math.abs(c.currentWeight + c.priorWeight - 1) < 1e-12);
        assert.equal(c.provenance.cutoff.targetMatchIdExcluded, p.matchId);
      }
    }
  }
  assert(result.evaluation.lambdaDistribution.M1.home.distinctValues > 10);
  assert(result.evaluation.lambdaDistribution.M2.home.distinctValues > 10);
  assert.equal(result.evaluation.xgCoverage.current.completeXGMatches, 50);
  assert.equal(result.evaluation.xgCoverage.historical.completeXGMatches, 380);
  assert.equal(result.evaluation.prospective.exactScorePredictions, 0);
  assert(result.models.models.every(model => model.state === "RESEARCH" && !model.production));
  const changedInputs = structuredClone(inputs);
  for (const m of changedInputs.matches) if (m.matchday >= 6) { Object.defineProperty(m, "score", { get() { throw new Error("MD6 outcome accessed"); } }); Object.defineProperty(m, "teamStats", { get() { throw new Error("MD6 process accessed"); } }); }
  const protectedResult = buildResearchArtifacts(changedInputs, config, fixedDate);
  assert.deepEqual(result, protectedResult);
  const changedCurrentGoals = structuredClone(inputs);
  changedCurrentGoals.matches.forEach(m => { if (m.matchday <= 5) m.score = { home: 30, away: 20 }; });
  const xgPureResult = buildResearchArtifacts(changedCurrentGoals, config, fixedDate);
  assert.deepEqual(result.retrospectivePredictions.models["xg-poisson-r0"], xgPureResult.retrospectivePredictions.models["xg-poisson-r0"]);
  assert.deepEqual(result, buildResearchArtifacts(inputs, config, fixedDate));
  assert.throws(() => parseConfiguration(["--through-matchday", "6"]));
  assert.throws(() => parseConfiguration(["--models", "league,process"]));
  assert.deepEqual(parseConfiguration([]), {});
  const isolation = assertProductionUnchanged(root, before);
  const initialPath = path.join(root, "tmp/exact-score-m1-m2-before.json");
  if (fs.existsSync(initialPath)) {
    const initial = JSON.parse(fs.readFileSync(initialPath, "utf8"));
    assert.deepEqual(result.retrospectivePredictions.models["league-poisson-r0"], initial.m0);
    assertProductionUnchanged(root, initial.files);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")), initial.package);
  }
  return { status: "PASS", commonSample: 50, historicalXG: 380, M0FrozenPredictions: "IDENTICAL", deterministic: true, M2IndependentOfActualGoals: true, MD6OutcomeGettersNeverAccessed: true, isolation };
}
if (require.main === module) console.log(JSON.stringify({ synthetic: runSyntheticBaselineTests(), repository: runRepositoryBaselineTests() }));
module.exports = { runSyntheticBaselineTests, runRepositoryBaselineTests };
