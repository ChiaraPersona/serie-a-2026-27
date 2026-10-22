"use strict";
const fs = require("fs"), path = require("path");
const { hash, captureProduction, assertProductionUnchanged } = require("./integrity");
const { makeFeatureVector, actualForResearch } = require("./features");
const { FEATURE_GROUPS, FEATURE_DEFINITIONS, PROMOTION_STATES, ERROR_COMPONENTS, assertResearchState } = require("./contracts");
const { registry, createModel } = require("./models");
const { evaluateModel, walkForwardFolds, commonSample, correlationMatrix, goalDispersion } = require("./evaluate");
const { studyConfiguration } = require("./config");
const { SOURCE: historicalXGSource, historicalXGAdapter, auditCurrentXG } = require("./historical-xg");

const root = path.resolve(__dirname, "../../..");
const outputDir = "data/analysis/exact-score-research";
function loadInputs() {
  const sources = ["data/normalized/matches.json", "data/normalized/standings-2025-26.json", "data/analysis/prediction-continuous-evaluation-v2.json", "data/predictions/snapshots/manifest.json", "data/predictions/snapshots/2026-27/md-06.json"];
  const values = {}, sourceHashes = {};
  for (const source of sources) { const bytes = fs.readFileSync(path.join(root, source)); values[source] = JSON.parse(bytes.toString()); sourceHashes[source] = hash(bytes); }
  let historicalXG = null;
  if (fs.existsSync(path.join(root, historicalXGSource))) {
    const bytes = fs.readFileSync(path.join(root, historicalXGSource)); sourceHashes[historicalXGSource] = hash(bytes);
    historicalXG = historicalXGAdapter(JSON.parse(bytes.toString()), sourceHashes[historicalXGSource]);
  }
  // Keep future fixture metadata only. MD6+ scores/statistics cannot reach any feature/evaluator.
  const matches = values[sources[0]].map(m => m.matchday >= 6 ? Object.fromEntries(["id", "competition", "season", "matchday", "date", "kickoff", "timezone", "homeTeam", "awayTeam", "status"].map(k => [k, m[k]])) : m);
  return { matches, prior: values[sources[1]], continuous: values[sources[2]], manifest: values[sources[3]], snapshotFile: values[sources[4]], sourceHashes, historicalXG };
}

function buildResearchArtifacts(inputs, configuration = {}, createdAt = new Date().toISOString()) {
  const { matches, prior, continuous, manifest, snapshotFile, sourceHashes } = inputs;
  const throughMatchday = configuration.throughMatchday ?? 5;
  if (!Number.isInteger(throughMatchday) || throughMatchday < 1 || throughMatchday > 5) throw new Error("Retrospective research through-matchday must be 1..5; MD6 prohibited");
  if (configuration.baselineStudy) configuration = { ...configuration, researchConfig: configuration.researchConfig || studyConfiguration(configuration) };
  const gate = continuous.exactScoreDataGate;
  const models = registry(createdAt, configuration);
  models.models.forEach(model => assertResearchState(model, gate));
  const retrospectiveTargets = matches.filter(m => m.competition === "serie-a" && m.season === "2026-27" && m.matchday >= 1 && m.matchday <= throughMatchday).sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));
  if (new Set(retrospectiveTargets.map(m => m.id)).size !== retrospectiveTargets.length) throw new Error("Duplicate retrospective match identity");
  const retrospective = retrospectiveTargets.map(target => {
    const vector = makeFeatureVector({ target, matches, prior, sourceHashes, historicalXG: configuration.baselineStudy ? inputs.historicalXG : null });
    return { matchId: target.id, targetMatchday: target.matchday, generationClass: "RETROSPECTIVE", retrospective: true, dataCutoff: vector.dataCutoff, vector, actual: actualForResearch(target), provenance: { source: "data/normalized/matches.json", sourceHash: sourceHashes["data/normalized/matches.json"], eventTimeReconstruction: true, originalPrematchAvailabilityProven: false } };
  });
  if (snapshotFile.matchday !== 6 || snapshotFile.snapshots?.length !== 10 || new Set(snapshotFile.snapshots.map(s => s.matchId)).size !== 10) throw new Error("Expected ten unique immutable MD6 snapshots");
  const prospective = snapshotFile.snapshots.map(snapshot => {
    const target = matches.find(m => m.id === snapshot.matchId);
    const entries = manifest.snapshots.filter(s => s.matchId === snapshot.matchId);
    if (!target || target.matchday !== 6 || entries.length !== 1 || entries[0].hash !== snapshot.integrity.sha256 || entries[0].snapshotId !== snapshot.snapshotId || entries[0].generationClass !== "PROSPECTIVE IMMUTABLE SNAPSHOT") throw new Error("Snapshot/manifest canonical integrity mismatch");
    const vector = makeFeatureVector({ target, matches, prior, snapshot, sourceHashes });
    const actual = actualForResearch(target);
    if (actual.actualHomeGoals !== null || actual.actualAwayGoals !== null) throw new Error("MD6 actuals must remain unavailable");
    return { matchId: target.id, targetMatchday: 6, generationClass: "PROSPECTIVE", retrospective: false, dataCutoff: vector.dataCutoff, vector, actual, snapshotId: snapshot.snapshotId, snapshotSHA256: snapshot.integrity.sha256, exactScorePrediction: null };
  });
  const predictionsByModel = {}, coverage = [];
  for (const model of models.models) {
    const shortName = { LEAGUE_AVERAGE_BASELINE: "league", TEAM_GOALS_BASELINE: "team-goals", XG_BASELINE: "xg", PROCESS_BASELINE: "process" }[model.name];
    if (configuration.models && !configuration.models.includes(shortName)) { coverage.push({ modelId: model.id, status: "NOT_REQUESTED", availableMatches: 0, metrics: null }); continue; }
    if (!model.implementationStatus.startsWith("EXECUTABLE")) { coverage.push({ modelId: model.id, status: model.implementationStatus, availableMatches: 0, metrics: null }); continue; }
    const modelConfiguration = configuration.baselineStudy && model.name === "LEAGUE_AVERAGE_BASELINE" ? {} : configuration;
    const implementation = createModel(model, modelConfiguration, gate);
    predictionsByModel[model.id] = retrospective.map(row => implementation.predictMatch(row.vector)).filter(Boolean);
    model.executed = predictionsByModel[model.id].length > 0;
    coverage.push({ modelId: model.id, status: "RETROSPECTIVE_RESEARCH_ONLY", availableMatches: predictionsByModel[model.id].length, unavailableMatches: retrospective.filter(row => !predictionsByModel[model.id].some(p => p.matchId === row.matchId)).map(row => row.matchId) });
  }
  // All executed levels, including xG, use the exact same intersection; never compare 50 vs 40.
  const sample = commonSample(predictionsByModel, retrospective);
  const sampleIds = new Set(sample.map(row => row.matchId));
  const evaluations = models.models.filter(model => predictionsByModel[model.id]).map(model => evaluateModel(predictionsByModel[model.id].filter(p => sampleIds.has(p.matchId)), sample, model));
  const retrospectiveDataset = { schemaVersion: 1, createdAt, label: "RETROSPECTIVE AS-OF RESEARCH ONLY", rows: retrospective, sample: retrospective.length, targetMatchdays: [...new Set(retrospective.map(r => r.targetMatchday))], sourceHashes, noFutureActuals: true };
  const prospectiveDataset = { schemaVersion: 1, createdAt, label: "PROSPECTIVE FROZEN V2 INPUTS — NO EXACT-SCORE PREDICTIONS", sample: prospective.length, completedActuals: 0, evaluatedMatches: 0, rows: prospective, noMD6Actuals: true };
  const contract = { schemaVersion: 1, name: "ExactScoreFeatureVector", targets: ["homeGoals", "awayGoals"], groups: FEATURE_GROUPS, definitions: FEATURE_DEFINITIONS,
    provenanceRequired: ["source", "sourceHash", "cutoff", "period", "kind", "availability", "matchesUsed", "sample", "availableBefore", "competition", "season", "note"], missing: null, playerFeatures: false, quoteFeatures: false,
    threeLayers: ["GOAL_STRENGTH", "PROCESS_ADJUSTMENT", "GOAL_DISTRIBUTION"], rawXGIsLambda: false, promotionStates: PROMOTION_STATES, maximumCurrentState: "RESEARCH", errorComponents: ERROR_COMPONENTS,
    ablations: ["Goals only", "+ xG", "+ shots", "+ SOT", "+ chance quality", "+ matchup"].map((name, index) => ({ id: `ablation-${index}`, name, status: "FUTURE_SAME_SAMPLE_SAME_FOLDS", isolatedIncrementRequired: true })),
    scenarios: ["PREDICTED PROCESS", "ORACLE TEAM PROCESS (RETROSPECTIVE OFFLINE ONLY)"], finishingAndGoalkeepingResidualPolicy: { diagnosticOnly: true, shrinkage: null, persistenceAssumed: false } };
  const numericKeys = ["home.goalsFor", "away.goalsFor", "home.currentXGF", "away.currentXGF", "home.baselineShots", "away.baselineShots", "home.baselineSOT", "away.baselineSOT", "home.xGPerShot", "away.xGPerShot"];
  const evaluation = { schemaVersion: 1, createdAt, exactScoreDataGate: gate, gateSource: { source: "data/analysis/prediction-continuous-evaluation-v2.json", sourceHash: sourceHashes["data/analysis/prediction-continuous-evaluation-v2.json"] }, modelChangeGate: continuous.modelChangeGate.status,
    researchOnly: true, promotionDisabled: true, modelWinner: null, currentRetrospectiveLeader: evaluations.length > 1 && evaluations[0].sample ? [...evaluations].sort((a, b) => a.scoreLogLoss - b.scoreLogLoss)[0].model.id : null,
    leaderCaution: "Small retrospective sample with revised source provenance; no model selection or promotion", sameSample: { matchIds: sample.map(r => r.matchId), n: sample.length, rule: "INTERSECTION_ALL_EXECUTED_MODELS", sameCutoffs: true, sameFeatures: true, sameMetrics: true, folds: walkForwardFolds(sample) },
    modelCoverage: coverage, retrospective: { label: "RETROSPECTIVE RESEARCH ONLY", models: evaluations }, prospective: { pendingMatches: 10, evaluatedMatches: 0, exactScorePredictions: 0, models: [], metrics: null },
    featureRedundancy: { pairs: correlationMatrix(retrospective.map(row => row.vector), numericKeys), warnings: ["xG already contains shot volume and quality; use nested ablation, do not count xG + shots + xG/shot as independent evidence", "Repeated team aggregates across fixtures are descriptive correlated observations, not independent evidence"], automaticFeatureRemoval: false },
    overdispersion: goalDispersion(retrospective), caution: "Exact score hit rate is a secondary metric.", uncertainty: { status: "INSUFFICIENT_PROSPECTIVE_TEMPORAL_SAMPLE", futureUnit: "MATCH_OR_MATCHDAY_CLUSTER", noOutcomePseudoReplication: true },
    nextAction: gate === "READY_FOR_BASELINE_MODEL" ? "BUILD EXACT SCORE BASELINE MODEL (SEPARATE PROMPT)" : "CONTINUE PROSPECTIVE DATA COLLECTION",
    limits: ["50 retrospective matches / five matchdays do not validate a model", "No retrospective frozen V2 process features", "MD6 actuals prohibited; no prospective goal-scoring predictions exist", "Goals/xG require explicit experimental shrinkage and xG coverage configuration", "Historical xG, chance-quality suppression, exact game-state timeline and open-play xG unavailable", "No fitted process or dependency model, no definitive prior weights", "Retrospective event time is proven; original historical data vintages are not"] };
  const retrospectivePredictions = { schemaVersion: 1, createdAt, label: "RETROSPECTIVE RESEARCH ONLY", generationClass: "RETROSPECTIVE", prospectivePredictions: 0, models: predictionsByModel };
  if (configuration.baselineStudy) {
    const xgAudit = { current: auditCurrentXG(matches, throughMatchday), historical: inputs.historicalXG?.audit || { status: "UNAVAILABLE" }, historicalTeamPriorMissing: [...new Set(retrospective.flatMap(row => [row.vector.homeTeam, row.vector.awayTeam]))].filter(team => !inputs.historicalXG?.teams[team]) };
    require("./comparison").enrichBaselineEvaluation(evaluation, predictionsByModel, retrospective, models.models, configuration.researchConfig, xgAudit);
    models.researchConfig = configuration.researchConfig;
  }
  return { models, retrospectiveDataset, prospectiveDataset, retrospectivePredictions, contract, evaluation };
}

function formatReport(artifacts, isolation, synthetic) {
  const { evaluation: e, retrospectiveDataset: r, prospectiveDataset: p, models } = artifacts;
  const metric = value => Number.isFinite(value) ? value.toFixed(4) : "N/D";
  const lines = ["# Match Outcome & Exact Score Research Framework", "", `Generated: ${e.createdAt}`, "", `EXACT_SCORE_DATA_GATE: **${e.exactScoreDataGate}** · MODEL_CHANGE_GATE: **${e.modelChangeGate}** · maximum model state: **RESEARCH**.`, "", "Exact score hit rate is a secondary metric.", "", `Retrospective data: ${r.sample} matches, MD1–MD5. Prospective: ${p.sample} immutable V2 snapshots, MD6; actuals unavailable, exact-score predictions 0.`, "", `Production isolation: ${isolation.checkedFiles} protected files; changed ${isolation.changedFiles.length}. Synthetic assertions: ${synthetic.assertions}.`, "", "## Same-sample retrospective metrics", "", "| Model | Sample | Goal MAE H/A/T | Score LogLoss | Exact Hit | Top3 | Top5 | 1X2 RPS | BTTS Brier | O2.5 Brier |", "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|"];
  for (const model of models.models) {
    const m = e.retrospective.models.find(row => row.model.id === model.id);
    lines.push(m ? `| ${model.name} | ${m.sample} | ${metric(m.goalMAE.home.mae)} / ${metric(m.goalMAE.away.mae)} / ${metric(m.goalMAE.total.mae)} | ${metric(m.scoreLogLoss)} | ${metric(m.exactHitRate)} | ${metric(m.top3Coverage)} | ${metric(m.top5Coverage)} | ${metric(m.oneXtwo.rps)} | ${metric(m.btts.brier)} | ${metric(m.overUnder[2.5].brier)} |` : `| ${model.name} (${model.implementationStatus}) | 0 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D |`);
  }
  lines.push("", "Top-3 and Top-5 coverage are practical diagnostics. Current retrospective leader: " + (e.currentRetrospectiveLeader || "N/D (only one executed benchmark)") + (e.leaderSelection ? " — NOT VALIDATED PROSPECTIVELY; prespecified multi-metric ranking, no promotion." : ""), "", "## Diagnostic examples", "", "Deterministic category selection; missing categories remain N/D. Full diagnostics for every evaluated match are in exact-score-evaluation.json.", "", "| Category | Match | lambda H/A | Modal | Top 3 | Actual | P(actual) | Rank | Surprise |", "|---|---|---|---|---|---|---:|---:|---:|");
  const diagnostics = e.retrospective.models[0]?.matchDiagnostics || [];
  const categories = { "modal hit": diagnostics.find(d => d.exactHit), "actual in top3, non-modal": diagnostics.find(d => d.top3Hit && !d.exactHit), "actual outside top5": diagnostics.find(d => !d.top5Hit), "highest surprise": [...diagnostics].sort((a, b) => b.scoreSurprise - a.scoreSurprise)[0] };
  for (const [label, d] of Object.entries(categories)) lines.push(d ? `| ${label} | ${d.matchId} | ${metric(d.lambdaHome)} / ${metric(d.lambdaAway)} | ${d.modalScore} | ${d.top3.map(s => `${s.score} (${metric(s.probability)})`).join(", ")} | ${d.actualScore} | ${metric(d.actualScoreProbability)} | ${d.actualScoreRank ?? "N/D"} | ${metric(d.scoreSurprise)} |` : `| ${label} | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D |`);
  lines.push("", "## Limits and next step", "", ...e.limits.map(limit => `- ${limit}`), "", `NEXT ACTION: ${e.nextAction}`, "", "Continue pre-kickoff frozen input collection, then collect outcomes and shots/SOT/xG coverage through the existing continuous evaluation workflow. This phase never imports MD6 actuals, generates MD6 goal predictions, changes the gate, promotes a model, or publishes UI output.", "");
  return lines.join("\n");
}

function parseConfiguration(args) {
  const configuration = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--models") {
      if (!args[i + 1]) throw new Error("Missing research models");
      const models = args[i + 1].split(",");
      if (!models.includes("league") || new Set(models).size !== models.length || models.some(name => !["league", "team-goals", "xg"].includes(name))) throw new Error("Use league,team-goals,xg; M0 required, M3 not implemented");
      configuration.models = models;
      configuration.baselineStudy = models.some(name => ["team-goals", "xg"].includes(name));
      continue;
    }
    if (args[i] === "--through-matchday") {
      const md = Number(args[i + 1]);
      if (!Number.isInteger(md) || md < 1 || md > 5) throw new Error("Only MD1–MD5 retrospective evaluation allowed");
      configuration.throughMatchday = md; continue;
    }
    const key = { "--prior-equivalent-matches": "priorEquivalentMatches", "--minimum-xg-coverage": "minimumXGCoverage" }[args[i]];
    const value = Number(args[i + 1]);
    if (!key || !Number.isFinite(value) || value <= 0 || (key === "minimumXGCoverage" && value > 1) || args[i + 1] == null) throw new Error("Invalid explicit research configuration");
    configuration[key] = value;
  }
  return configuration;
}

function main() {
  const before = captureProduction(root), packageBefore = fs.readFileSync(path.join(root, "package.json"));
  const configuration = parseConfiguration(process.argv.slice(2));
  const artifacts = buildResearchArtifacts(loadInputs(), configuration);
  const synthetic = require("../../test-exact-score-research").runSyntheticTests();
  const baselineStudyTests = configuration.baselineStudy ? require("./test-baselines").runSyntheticBaselineTests() : null;
  const isolation = assertProductionUnchanged(root, before);
  if (!packageBefore.equals(fs.readFileSync(path.join(root, "package.json")))) throw new Error("Research command changed package.json");
  fs.mkdirSync(path.join(root, outputDir), { recursive: true });
  const write = (name, value) => fs.writeFileSync(path.join(root, outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
  write("exact-score-models.json", artifacts.models);
  write("exact-score-feature-contract.json", artifacts.contract);
  const schemas = require("./schemas");
  write("exact-score-feature-vector.schema.json", schemas.featureVectorSchema);
  write("exact-score-evaluation.schema.json", schemas.evaluationSchema);
  write("exact-score-retrospective-dataset.json", artifacts.retrospectiveDataset);
  write("exact-score-retrospective-predictions.json", artifacts.retrospectivePredictions);
  write("exact-score-prospective-inputs.json", artifacts.prospectiveDataset);
  write("exact-score-evaluation.json", artifacts.evaluation);
  write("research-validation.json", { schemaVersion: 1, createdAt: artifacts.evaluation.createdAt, synthetic, baselineStudyTests, isolation, configuration, datasetValidation: "PASS", md6Actuals: "UNAVAILABLE", maximumModelState: "RESEARCH" });
  fs.writeFileSync(path.join(root, outputDir, "research-report.md"), formatReport(artifacts, isolation, synthetic));
  if (configuration.baselineStudy) {
    write("exact-score-research-config.json", artifacts.evaluation.researchConfig);
    const report = require("./baseline-report").formatBaselineReport(artifacts, isolation, synthetic, baselineStudyTests);
    fs.writeFileSync(path.join(root, outputDir, "baselines-m1-m2-report.md"), report);
    fs.writeFileSync(path.join(root, "docs/exact-score-baselines-m1-m2.md"), report);
  }
  // Verify even after writes, including new unexpected non-research files.
  assertProductionUnchanged(root, before);
  console.log(JSON.stringify({ retrospective: artifacts.retrospectiveDataset.sample, prospectivePending: artifacts.prospectiveDataset.sample, commonEvaluationSample: artifacts.evaluation.sameSample.n, gate: artifacts.evaluation.exactScoreDataGate, syntheticAssertions: synthetic.assertions, productionChangedFiles: 0, nextAction: artifacts.evaluation.nextAction }));
}
if (require.main === module) main();
module.exports = { loadInputs, buildResearchArtifacts, formatReport, parseConfiguration };
