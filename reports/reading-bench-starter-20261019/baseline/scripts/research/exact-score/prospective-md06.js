"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { stableStringify, sha256, toKickoffUtc } = require("../../predictions/snapshot-core");
const { loadInputs } = require("./run");
const { validateFeatureVector } = require("./contracts");
const { registry, createModel } = require("./models");
const { studyConfiguration } = require("./config");
const { validateMatrix, deriveMarkets, topScores, scoreProbability } = require("./distribution");
const { rankedProbabilityScore, calibration } = require("./evaluate");

const root = path.resolve(__dirname, "../../..");
const snapshotRelative = "data/predictions/exact-score-research/2026-27/md-06.json";
const manifestRelative = "data/predictions/exact-score-research/manifest.json";
const evaluationRelative = "data/analysis/exact-score-research/prospective-md06-evaluation.json";
const validationRelative = "data/analysis/exact-score-research/prospective-md06-validation.json";
const reportJsonRelative = "output/reports/exact-score-md06-final-research-closure-2026-10-09.json";
const reportMarkdownRelative = "output/reports/exact-score-md06-final-research-closure-2026-10-09.md";
const modelOrder = ["ENGINE_4.13.0", "M0", "M1", "M2"];
const modelIdByLabel = {
  "ENGINE_4.13.0": "engine-4.13.0-shadow",
  M0: "league-poisson-r0",
  M1: "goals-poisson-r0",
  M2: "xg-poisson-r0",
};
const labelByModelId = Object.fromEntries(Object.entries(modelIdByLabel).map(([label, id]) => [id, label]));

function absolute(relative) { return path.join(root, relative); }
function read(relative) { return JSON.parse(fs.readFileSync(absolute(relative), "utf8")); }
function write(relative, value) {
  const target = absolute(relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}
function fileHash(relative) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolute(relative))).digest("hex");
}
function payloadHash(value, excludedKey = "integrity") {
  const copy = structuredClone(value);
  delete copy[excludedKey];
  return sha256(copy);
}
function predictionHash(prediction) {
  const copy = structuredClone(prediction);
  delete copy.snapshotHash;
  return sha256(copy);
}
function hashManifest(hashes) {
  return sha256(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)));
}
function allowedResearchPath(file) {
  return file.startsWith("scripts/research/exact-score/")
    || file.startsWith("data/analysis/exact-score-research/")
    || file.startsWith("data/predictions/exact-score-research/")
    || file === reportJsonRelative
    || file === reportMarkdownRelative;
}
function captureProtectedHashes() {
  const files = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    maxBuffer: 96 * 1024 * 1024,
  }).toString().split("\0").filter(Boolean).map(file => file.replace(/\\/g, "/"));
  return Object.fromEntries([...new Set(files)].filter(file => !allowedResearchPath(file)).filter(file => {
    const target = absolute(file);
    return fs.existsSync(target) && fs.statSync(target).isFile();
  }).sort().map(file => [file, fileHash(file)]));
}
function compareHashes(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
}

function poisson(k, lambda) {
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * lambda ** k / factorial;
}
function productionMatrix(lambdaHome, lambdaAway, maxGoals = 7) {
  const rawCells = Array.from({ length: maxGoals + 1 }, (_, home) => Array.from({ length: maxGoals + 1 }, (_, away) => poisson(home, lambdaHome) * poisson(away, lambdaAway)));
  const rawMass = rawCells.flat().reduce((sum, probability) => sum + probability, 0);
  const cells = rawCells.map(row => row.map(probability => probability / rawMass));
  return {
    cells,
    lambdaHome,
    lambdaAway,
    distribution: "INDEPENDENT_POISSON",
    maxHomeGoals: maxGoals,
    maxAwayGoals: maxGoals,
    representedMass: 1,
    tailMass: 0,
    tailBound: 0,
    tailPolicy: "PRODUCTION_FIXED_0_7_TRUNCATED_AND_RENORMALIZED",
    rawRepresentedMassBeforeRenormalization: rawMass,
    rawTruncatedTailMass: Math.max(0, 1 - rawMass),
    numericalMassError: Math.abs(1 - cells.flat().reduce((sum, probability) => sum + probability, 0)),
  };
}
function marketsFromMatrix(matrix) {
  validateMatrix(matrix);
  const derived = deriveMarkets(matrix, [2.5]);
  return {
    oneXTwo: { "1": derived.outcomes.home, X: derived.outcomes.draw, "2": derived.outcomes.away },
    btts: derived.btts,
    overUnder2_5: derived.overUnder[2.5],
  };
}
function sourceSummary(vector) {
  const rows = Object.values(vector.features).map(feature => feature.provenance);
  return [...new Map(rows.map(row => [`${row.source}:${row.sourceHash}`, {
    source: row.source,
    sourceHash: row.sourceHash,
    availability: row.availability,
    availableBefore: row.availableBefore,
    competition: row.competition,
    season: row.season,
  }])).values()];
}
function freezePrediction(base) {
  const prediction = structuredClone(base);
  prediction.snapshotHash = predictionHash(prediction);
  return prediction;
}
function researchPrediction(label, prediction, vector, vectorHash, generatedAt, configurationHash) {
  const markets = marketsFromMatrix(prediction.scoreMatrix);
  return freezePrediction({
    snapshotId: `serie-a-2026-27-md06-${prediction.matchId}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    modelLabel: label,
    modelId: prediction.modelId,
    modelVersion: prediction.modelVersion,
    modelState: "RESEARCH",
    generationClass: "PROSPECTIVE_HEAD_TO_HEAD",
    generatedAt,
    frozenAt: generatedAt,
    cutoff: prediction.dataCutoff,
    lambdaHome: prediction.lambdaHome,
    lambdaAway: prediction.lambdaAway,
    probabilities: markets,
    scoreMatrix: prediction.scoreMatrix,
    top3ExactScores: topScores(prediction.scoreMatrix, 3),
    top5ExactScores: topScores(prediction.scoreMatrix, 5),
    featureProvenance: {
      featureVectorHash: vectorHash,
      featureVectorScope: "sharedFeatureVector on the same match record",
      sources: sourceSummary(vector),
      quoteFeaturesUsed: false,
      actualMD6Used: false,
    },
    fallback: prediction.diagnostics?.fallback ?? (prediction.diagnostics?.leagueFallbackUsed ? "HISTORICAL_LEAGUE_RATE" : null),
    maturity: prediction.diagnostics?.maturity ?? null,
    diagnostics: prediction.diagnostics,
    configurationHash,
  });
}

function predictFrozenResearchModel(model, label, configuration, gate, vector) {
  // M1/M2 intentionally retain their canonical retrospective-only implementation.
  // This adapter changes only contract metadata while the frozen feature vector,
  // cutoff, configuration and formulas remain byte-for-byte/model-for-model the same.
  const input = label === "M0" ? vector : { ...structuredClone(vector), generationClass: "RETROSPECTIVE", targetMatchday: 5 };
  const prediction = createModel(model, configuration, gate).predictMatch(input);
  if (!prediction || label === "M0") return prediction;
  prediction.generationClass = vector.generationClass;
  prediction.targetMatchday = vector.targetMatchday;
  prediction.dataCutoff = vector.dataCutoff;
  prediction.diagnostics.label = "PROSPECTIVE RESEARCH ONLY";
  prediction.diagnostics.targetMatchday = vector.targetMatchday;
  prediction.diagnostics.cutoffMatchday = vector.targetMatchday - 1;
  prediction.diagnostics.cutoffMatchdayExclusive = vector.targetMatchday;
  prediction.diagnostics.dataCutoff = vector.dataCutoff;
  prediction.diagnostics.contractAdapter = {
    id: "CANONICAL_M1_M2_PROSPECTIVE_METADATA_ADAPTER_V1",
    metadataOnly: true,
    frozenFeaturesChanged: false,
    modelFormulaChanged: false,
    canonicalGuardChanged: false,
  };
  for (const component of Object.values(prediction.diagnostics.components || {})) {
    if (component.provenance) component.provenance.reconstructionClass = "PROSPECTIVE_FROZEN_INPUT";
  }
  return prediction;
}
function enginePrediction(sourceSnapshot, generatedAt, configurationHash) {
  const expected = sourceSnapshot.prediction.expectedGoals;
  if (![expected?.home, expected?.away].every(Number.isFinite)) throw new Error(`Missing Engine lambda ${sourceSnapshot.matchId}`);
  const scoreMatrix = productionMatrix(expected.home, expected.away);
  const markets = marketsFromMatrix(scoreMatrix);
  const serialized = sourceSnapshot.prediction.probabilities?.final;
  for (const outcome of ["1", "X", "2"]) {
    if (!Number.isFinite(serialized?.[outcome]) || Math.abs(markets.oneXTwo[outcome] - serialized[outcome] / 100) > 0.0011) throw new Error(`Engine matrix/probability mismatch ${sourceSnapshot.matchId}:${outcome}`);
  }
  return freezePrediction({
    snapshotId: `serie-a-2026-27-md06-${sourceSnapshot.matchId}-engine-4-13-0-shadow`,
    modelLabel: "ENGINE_4.13.0",
    modelId: modelIdByLabel["ENGINE_4.13.0"],
    modelVersion: sourceSnapshot.engineVersion,
    modelState: "SHADOW",
    generationClass: "PROSPECTIVE_HEAD_TO_HEAD",
    generatedAt: sourceSnapshot.generatedAt,
    frozenAt: generatedAt,
    cutoff: sourceSnapshot.dataCutoff,
    lambdaHome: expected.home,
    lambdaAway: expected.away,
    probabilities: markets,
    serializedSourceProbabilitiesPct: serialized,
    scoreMatrix,
    top3ExactScores: topScores(scoreMatrix, 3),
    top5ExactScores: topScores(scoreMatrix, 5),
    featureProvenance: {
      source: "data/predictions/snapshots/2026-27/md-06.json",
      sourceFileHash: fileHash("data/predictions/snapshots/2026-27/md-06.json"),
      sourceSnapshotId: sourceSnapshot.snapshotId,
      sourceSnapshotHash: sourceSnapshot.integrity.sha256,
      originalGeneratedAt: sourceSnapshot.generatedAt,
      expectedGoalsComponents: expected.components,
      quoteFeaturesUsed: false,
      actualMD6Used: false,
    },
    fallback: { xg: expected.components?.xg?.status ?? null },
    maturity: Object.fromEntries((sourceSnapshot.prediction.teamProjections || []).map(team => [team.venue, team.maturity ?? null])),
    diagnostics: {
      probabilitySource: "Engine 4.13.0 expectedGoals -> fixed 0..7 Poisson matrix -> 1X2",
      sourcePredictionImmutable: true,
      reconstructedWithoutReexecutingProductionEngine: true,
      productionSerializedRoundingPctPoints: 0.1,
    },
    configurationHash,
  });
}

function modelConfigurations(generatedAt) {
  const researchConfig = {
    ...studyConfiguration(),
    prospectiveHeadToHead: true,
    prospectiveProtocol: "PROSPECTIVE_HEAD_TO_HEAD",
  };
  const configuration = { baselineStudy: true, researchConfig, models: ["league", "team-goals", "xg"] };
  const modelRegistry = registry(generatedAt, configuration);
  const codeHashes = {
    models: fileHash("scripts/research/exact-score/models.js"),
    baselines: fileHash("scripts/research/exact-score/baselines.js"),
    distribution: fileHash("scripts/research/exact-score/distribution.js"),
    config: fileHash("scripts/research/exact-score/config.js"),
  };
  const byId = new Map(modelRegistry.models.map(model => [model.id, model]));
  const configurationHashes = {};
  for (const label of ["M0", "M1", "M2"]) {
    const model = byId.get(modelIdByLabel[label]);
    configurationHashes[label] = sha256({ modelId: model.id, modelVersion: model.version, distribution: model.distribution, configuration: model.configuration, codeHashes });
  }
  configurationHashes["ENGINE_4.13.0"] = sha256({
    modelId: modelIdByLabel["ENGINE_4.13.0"],
    modelVersion: "4.13.0",
    matrix: "fixed 0..7 independent Poisson, truncated and renormalized",
    sourceEngineHash: fileHash("scripts/predictions/engine.js"),
    sourceSnapshotHash: fileHash("data/predictions/snapshots/2026-27/md-06.json"),
    quoteFeaturesUsed: false,
  });
  return { researchConfig, configuration, modelRegistry, byId, configurationHashes, codeHashes };
}

function immutableSourceHashes() {
  const candidates = [
    "data/predictions/snapshots/2026-27/md-06.json",
    "data/predictions/snapshots/manifest.json",
    "data/analysis/exact-score-research/exact-score-prospective-inputs.json",
    "data/analysis/exact-score-research/exact-score-research-config.json",
    "data/analysis/champions/aek-context-control-2026-10-04.json",
  ];
  const cardDirectory = absolute("data/predictions/card-snapshots");
  if (fs.existsSync(cardDirectory)) for (const name of fs.readdirSync(cardDirectory)) {
    const relative = `data/predictions/card-snapshots/${name}`;
    if (fs.statSync(absolute(relative)).isFile()) candidates.push(relative);
  }
  return candidates.filter(relative => fs.existsSync(absolute(relative))).sort().map(file => ({ file, sha256: fileHash(file) }));
}

function buildProspectiveSnapshot(generatedAt = new Date().toISOString()) {
  const inputs = loadInputs();
  const frozenInputs = read("data/analysis/exact-score-research/exact-score-prospective-inputs.json");
  const fixtures = inputs.matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === 6).sort((left, right) => toKickoffUtc(left) - toKickoffUtc(right) || left.id.localeCompare(right.id));
  if (fixtures.length !== 10 || new Set(fixtures.map(match => match.id)).size !== 10) throw new Error(`Expected 10 unique MD6 fixtures, found ${fixtures.length}`);
  if (frozenInputs.label !== "PROSPECTIVE FROZEN V2 INPUTS — NO EXACT-SCORE PREDICTIONS" || frozenInputs.rows?.length !== 10 || frozenInputs.noMD6Actuals !== true) throw new Error("Invalid frozen prospective input contract");
  const frozenById = new Map(frozenInputs.rows.map(row => [row.matchId, row]));
  if (frozenById.size !== 10) throw new Error("Duplicate frozen prospective input identity");
  const generationTime = Date.parse(generatedAt);
  if (!Number.isFinite(generationTime)) throw new Error("Invalid generatedAt");
  const blocked = fixtures.filter(match => !Number.isFinite(toKickoffUtc(match)) || toKickoffUtc(match) <= generationTime || ["finished", "cancelled", "abandoned", "awarded"].includes(match.status));
  const eligible = fixtures.filter(match => !blocked.includes(match));
  if (!eligible.length) throw new Error("MD6 EXACT-SCORE SNAPSHOTS NOT_READY: no pre-kickoff fixture eligible");
  const sourceById = new Map(inputs.snapshotFile.snapshots.map(snapshot => [snapshot.matchId, snapshot]));
  const { configuration, byId, configurationHashes, researchConfig, codeHashes } = modelConfigurations(generatedAt);
  const rows = [];
  for (const match of eligible) {
    const sourceSnapshot = sourceById.get(match.id);
    const frozen = frozenById.get(match.id);
    if (!sourceSnapshot) throw new Error(`Missing immutable Engine source ${match.id}`);
    if (!frozen?.vector || frozen.generationClass !== "PROSPECTIVE" || frozen.actual?.availability !== "UNAVAILABLE" || frozen.exactScorePrediction !== null) throw new Error(`Invalid frozen prospective vector ${match.id}`);
    if (frozen.snapshotId !== sourceSnapshot.snapshotId || frozen.snapshotSHA256 !== sourceSnapshot.integrity.sha256) throw new Error(`Frozen vector/Engine snapshot mismatch ${match.id}`);
    const vector = structuredClone(frozen.vector);
    validateFeatureVector(vector, inputs.matches);
    const vectorHash = sha256(vector);
    const predictions = [enginePrediction(sourceSnapshot, generatedAt, configurationHashes["ENGINE_4.13.0"])];
    for (const label of ["M0", "M1", "M2"]) {
      const model = byId.get(modelIdByLabel[label]);
      const prediction = predictFrozenResearchModel(model, label, configuration, inputs.continuous.exactScoreDataGate, vector);
      if (!prediction) throw new Error(`${label} unavailable for ${match.id}`);
      predictions.push(researchPrediction(label, prediction, vector, vectorHash, generatedAt, configurationHashes[label]));
    }
    rows.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchday: match.matchday,
      kickoff: { date: match.date, time: match.kickoff, timezone: match.timezone || "Europe/Rome", utc: new Date(toKickoffUtc(match)).toISOString() },
      cutoff: vector.dataCutoff,
      sharedFeatureVector: { hash: vectorHash, vector },
      predictions,
    });
  }
  const snapshot = {
    schemaVersion: 1,
    snapshotClass: "PROSPECTIVE_HEAD_TO_HEAD_RESEARCH",
    season: "2026-27",
    competition: "serie-a",
    matchday: 6,
    createdAt: generatedAt,
    revision: 1,
    status: blocked.length ? "PARTIAL" : "FROZEN",
    researchProtocol: "ENGINE_4.13.0 + M0 + M1 + M2 IN PARALLEL",
    matchCount: rows.length,
    predictionCount: rows.reduce((count, row) => count + row.predictions.length, 0),
    models: modelOrder.map(label => ({ label, modelId: modelIdByLabel[label], state: label === "ENGINE_4.13.0" ? "SHADOW" : "RESEARCH", configurationHash: configurationHashes[label] })),
    blockedMatches: blocked.map(match => ({ matchId: match.id, status: match.status, kickoffUtc: Number.isFinite(toKickoffUtc(match)) ? new Date(toKickoffUtc(match)).toISOString() : null, reason: "STARTED_FINISHED_OR_UNKNOWN_KICKOFF" })),
    inputs: {
      prospectiveVectors: "data/analysis/exact-score-research/exact-score-prospective-inputs.json",
      prospectiveVectorsCreatedAt: frozenInputs.createdAt,
      prospectiveVectorsFileHash: fileHash("data/analysis/exact-score-research/exact-score-prospective-inputs.json"),
      engineSnapshot: "data/predictions/snapshots/2026-27/md-06.json",
      engineSnapshotFileHash: fileHash("data/predictions/snapshots/2026-27/md-06.json"),
      exactScoreResearchConfig: "data/analysis/exact-score-research/exact-score-research-config.json",
      exactScoreResearchConfigHash: fileHash("data/analysis/exact-score-research/exact-score-research-config.json"),
      immutableAssetsBefore: immutableSourceHashes(),
      codeHashes,
    },
    guarantees: {
      quoteFeaturesUsed: false,
      md6ActualsUsed: false,
      generationTimeActualNotBackdated: true,
      immutableByDefault: true,
      replacementBeforeKickoffRequiresReason: true,
      replacementAfterKickoffProhibited: true,
      evaluationRecalculatesPredictions: false,
      modelPromotion: "NONE",
    },
    researchConfig,
    history: [],
    matches: rows,
    productionIntegrity: null,
  };
  return { snapshot };
}

function validateProspectiveSnapshot(snapshot, { now = null, requirePreKickoffAtCreation = true } = {}) {
  const failures = [];
  if (snapshot.schemaVersion !== 1 || snapshot.snapshotClass !== "PROSPECTIVE_HEAD_TO_HEAD_RESEARCH" || snapshot.season !== "2026-27" || snapshot.matchday !== 6) failures.push("invalid container identity");
  if (!["FROZEN", "PARTIAL"].includes(snapshot.status)) failures.push("invalid freeze status");
  if (snapshot.matchCount !== snapshot.matches?.length || snapshot.predictionCount !== snapshot.matches?.reduce((count, row) => count + row.predictions.length, 0)) failures.push("coverage count mismatch");
  if (new Set(snapshot.matches?.map(row => row.matchId)).size !== snapshot.matches?.length) failures.push("duplicate match identity");
  for (const row of snapshot.matches || []) {
    if (row.sharedFeatureVector?.hash !== sha256(row.sharedFeatureVector?.vector)) failures.push(`${row.matchId}: feature vector hash mismatch`);
    if (JSON.stringify(row.cutoff) !== JSON.stringify(row.sharedFeatureVector?.vector?.dataCutoff)) failures.push(`${row.matchId}: cutoff/vector mismatch`);
    if (requirePreKickoffAtCreation && Date.parse(snapshot.createdAt) >= Date.parse(row.kickoff.utc)) failures.push(`${row.matchId}: snapshot created after kickoff`);
    if (now && Date.parse(now) < Date.parse(snapshot.createdAt)) failures.push("validation clock predates snapshot");
    const labels = row.predictions.map(prediction => prediction.modelLabel);
    if (labels.length !== 4 || modelOrder.some(label => !labels.includes(label))) failures.push(`${row.matchId}: model coverage`);
    for (const prediction of row.predictions) {
      if (prediction.snapshotHash !== predictionHash(prediction)) failures.push(`${row.matchId}:${prediction.modelLabel}: prediction hash mismatch`);
      if (!modelOrder.includes(prediction.modelLabel) || prediction.modelId !== modelIdByLabel[prediction.modelLabel]) failures.push(`${row.matchId}: model identity`);
      if (prediction.modelState !== (prediction.modelLabel === "ENGINE_4.13.0" ? "SHADOW" : "RESEARCH")) failures.push(`${row.matchId}: model state`);
      try { validateMatrix(prediction.scoreMatrix); } catch (error) { failures.push(`${row.matchId}:${prediction.modelLabel}: ${error.message}`); }
      const markets = marketsFromMatrix(prediction.scoreMatrix);
      if (Math.abs(Object.values(markets.oneXTwo).reduce((sum, value) => sum + value, 0) - 1) > 1e-9) failures.push(`${row.matchId}:${prediction.modelLabel}: 1X2 sum`);
      if (Math.abs(markets.btts.yes + markets.btts.no - 1) > 1e-9) failures.push(`${row.matchId}:${prediction.modelLabel}: BTTS sum`);
      if (Math.abs(markets.overUnder2_5.over + markets.overUnder2_5.under - 1) > 1e-9) failures.push(`${row.matchId}:${prediction.modelLabel}: O/U sum`);
      if (JSON.stringify(markets) !== JSON.stringify(prediction.probabilities)) failures.push(`${row.matchId}:${prediction.modelLabel}: derived-market mismatch`);
      if (prediction.cutoff?.matchdayExclusive !== 6 || prediction.cutoff?.targetMatchIdExcluded !== row.matchId || prediction.cutoff?.completedOnly !== true) failures.push(`${row.matchId}:${prediction.modelLabel}: cutoff`);
      if (!/^[a-f0-9]{64}$/.test(prediction.configurationHash || "")) failures.push(`${row.matchId}:${prediction.modelLabel}: configuration hash`);
      if (prediction.featureProvenance?.quoteFeaturesUsed !== false || prediction.featureProvenance?.actualMD6Used !== false) failures.push(`${row.matchId}:${prediction.modelLabel}: forbidden inputs`);
    }
  }
  if (snapshot.integrity?.sha256 !== payloadHash(snapshot)) failures.push("container hash mismatch");
  return failures;
}

function freezeMd06({ replacePrekickoff = false, reason = null, generatedAt = new Date().toISOString() } = {}) {
  const before = captureProtectedHashes();
  const sourceAssetsBefore = immutableSourceHashes();
  const snapshotPath = absolute(snapshotRelative);
  const existing = fs.existsSync(snapshotPath) ? read(snapshotRelative) : null;
  if (existing && !replacePrekickoff) throw new Error("SNAPSHOT_ALREADY_EXISTS: exact-score research MD6 is immutable by default");
  if (existing && (!reason || !String(reason).trim())) throw new Error("--replace-prekickoff requires --reason <text>");
  if (existing && existing.matches.some(row => Date.now() >= Date.parse(row.kickoff.utc))) throw new Error("IMMUTABLE_SNAPSHOT_EXISTS: replacement after kickoff prohibited");
  const { snapshot } = buildProspectiveSnapshot(generatedAt);
  if (existing) {
    snapshot.revision = (existing.revision || 1) + 1;
    const previousPayload = structuredClone(existing);
    delete previousPayload.history;
    snapshot.history = [...(existing.history || []), { supersededAt: generatedAt, reason: String(reason), previousContainerHash: existing.integrity.sha256, payload: previousPayload }];
  }
  const after = captureProtectedHashes();
  const changed = compareHashes(before, after);
  const sourceAssetsAfter = immutableSourceHashes();
  const sourceBeforeByFile = new Map(sourceAssetsBefore.map(row => [row.file, row.sha256]));
  const sourceAfterByFile = new Map(sourceAssetsAfter.map(row => [row.file, row.sha256]));
  const sourceDrift = [...new Set([...sourceBeforeByFile.keys(), ...sourceAfterByFile.keys()])]
    .filter(file => sourceBeforeByFile.get(file) !== sourceAfterByFile.get(file))
    .map(file => ({ file, before: sourceBeforeByFile.get(file) || null, after: sourceAfterByFile.get(file) || null }));
  snapshot.productionIntegrity = {
    checkedFiles: Object.keys(before).length,
    manifestBefore: hashManifest(before),
    manifestAfter: hashManifest(after),
    changedFiles: changed,
    immutableSourceAssetsChanged: sourceDrift,
    status: changed.length || sourceDrift.length ? "FAILED" : "PASS",
  };
  if (snapshot.productionIntegrity.status !== "PASS") throw new Error(`PRODUCTION_INTEGRITY_FAILED: ${[...changed, ...sourceDrift.map(row => row.file)].join(", ")}`);
  snapshot.integrity = { algorithm: "SHA-256", scope: "container payload excluding integrity metadata", sha256: payloadHash(snapshot) };
  const failures = validateProspectiveSnapshot(snapshot);
  if (failures.length) throw new Error(`SNAPSHOT_VALIDATION_FAILED: ${failures.join("; ")}`);
  if (snapshot.matches.some(row => Date.now() >= Date.parse(row.kickoff.utc))) throw new Error("KICKOFF_PASSED_DURING_GENERATION: no snapshot written");
  write(snapshotRelative, snapshot);
  const records = snapshot.matches.flatMap(row => row.predictions.map(prediction => ({
    snapshotId: prediction.snapshotId,
    snapshotFile: snapshotRelative,
    matchId: row.matchId,
    matchday: 6,
    kickoffUtc: row.kickoff.utc,
    generatedAt: prediction.generatedAt,
    frozenAt: prediction.frozenAt,
    modelLabel: prediction.modelLabel,
    modelId: prediction.modelId,
    modelVersion: prediction.modelVersion,
    modelState: prediction.modelState,
    configurationHash: prediction.configurationHash,
    hash: prediction.snapshotHash,
    evaluationStatus: "PENDING",
    generationClass: "PROSPECTIVE_HEAD_TO_HEAD",
  })));
  const manifest = {
    schemaVersion: 1,
    season: "2026-27",
    competition: "serie-a",
    protocol: "PROSPECTIVE HEAD-TO-HEAD",
    updatedAt: generatedAt,
    immutableByDefault: true,
    snapshotFile: snapshotRelative,
    snapshotFileSHA256: fileHash(snapshotRelative),
    containerHash: snapshot.integrity.sha256,
    matchCount: snapshot.matchCount,
    predictionCount: snapshot.predictionCount,
    status: snapshot.status,
    snapshots: records,
    replacements: snapshot.history.map(item => ({ supersededAt: item.supersededAt, reason: item.reason, previousContainerHash: item.previousContainerHash })),
  };
  write(manifestRelative, manifest);
  const finalProtected = captureProtectedHashes();
  const finalChanged = compareHashes(before, finalProtected);
  if (finalChanged.length) throw new Error(`PRODUCTION_INTEGRITY_FAILED_AFTER_WRITE: ${finalChanged.join(", ")}`);
  return { snapshot, manifest };
}

const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
function evaluatePredictionRows(predictions, actualById) {
  const diagnostics = predictions.map(({ matchId, prediction }) => {
    const actual = actualById.get(matchId);
    const homeGoals = actual.score.home, awayGoals = actual.score.away;
    const outcomeIndex = homeGoals > awayGoals ? 0 : homeGoals === awayGoals ? 1 : 2;
    const p = prediction.probabilities.oneXTwo;
    const probabilities = [p["1"], p.X, p["2"]];
    const actualScoreProbability = scoreProbability(prediction.scoreMatrix, homeGoals, awayGoals);
    return {
      matchId,
      actualScore: `${homeGoals}-${awayGoals}`,
      actualOutcome: ["1", "X", "2"][outcomeIndex],
      actualScoreProbability,
      scoreLogLoss: -Math.log(Math.max(1e-15, actualScoreProbability)),
      rps: rankedProbabilityScore(probabilities, outcomeIndex),
      bttsProbability: prediction.probabilities.btts.yes,
      actualBTTS: Number(homeGoals > 0 && awayGoals > 0),
      over25Probability: prediction.probabilities.overUnder2_5.over,
      actualOver25: Number(homeGoals + awayGoals > 2.5),
      lambdaHome: prediction.lambdaHome,
      lambdaAway: prediction.lambdaAway,
      actualHomeGoals: homeGoals,
      actualAwayGoals: awayGoals,
      exactHit: prediction.top5ExactScores[0]?.score === `${homeGoals}-${awayGoals}`,
      top3Hit: prediction.top3ExactScores.some(row => row.score === `${homeGoals}-${awayGoals}`),
      top5Hit: prediction.top5ExactScores.some(row => row.score === `${homeGoals}-${awayGoals}`),
      oneXTwo: p,
      outcomeIndex,
    };
  });
  if (!diagnostics.length) return null;
  const binaryBrier = (key, actual) => mean(diagnostics.map(row => (row[key] - row[actual]) ** 2));
  const goal = side => {
    const errors = diagnostics.map(row => row[`lambda${side}`] - row[`actual${side}Goals`]);
    return { mae: mean(errors.map(Math.abs)), rmse: Math.sqrt(mean(errors.map(error => error ** 2))), bias: mean(errors) };
  };
  const calibrationRows = (probability, actual) => diagnostics.map(row => ({ p: probability(row), y: actual(row) }));
  return {
    sample: diagnostics.length,
    matchIds: diagnostics.map(row => row.matchId),
    scoreLogLoss: mean(diagnostics.map(row => row.scoreLogLoss)),
    oneXTwoRPS: mean(diagnostics.map(row => row.rps)),
    bttsBrier: binaryBrier("bttsProbability", "actualBTTS"),
    over25Brier: binaryBrier("over25Probability", "actualOver25"),
    goalMAE: { home: goal("Home"), away: goal("Away") },
    exactHitRate: mean(diagnostics.map(row => Number(row.exactHit))),
    top3HitRate: mean(diagnostics.map(row => Number(row.top3Hit))),
    top5HitRate: mean(diagnostics.map(row => Number(row.top5Hit))),
    calibration: {
      homeWin: calibration(calibrationRows(row => row.oneXTwo["1"], row => Number(row.outcomeIndex === 0))),
      draw: calibration(calibrationRows(row => row.oneXTwo.X, row => Number(row.outcomeIndex === 1))),
      awayWin: calibration(calibrationRows(row => row.oneXTwo["2"], row => Number(row.outcomeIndex === 2))),
      btts: calibration(calibrationRows(row => row.bttsProbability, row => row.actualBTTS)),
      over25: calibration(calibrationRows(row => row.over25Probability, row => row.actualOver25)),
    },
    diagnostics,
  };
}

function evaluateFrozenMd06(generatedAt = new Date().toISOString()) {
  const snapshot = read(snapshotRelative);
  const failures = validateProspectiveSnapshot(snapshot, { now: generatedAt });
  if (failures.length) throw new Error(`SNAPSHOT_VALIDATION_FAILED: ${failures.join("; ")}`);
  const manifest = read(manifestRelative);
  if (manifest.containerHash !== snapshot.integrity.sha256 || manifest.snapshotFileSHA256 !== fileHash(snapshotRelative)) throw new Error("Manifest/container integrity mismatch");
  const matches = read("data/normalized/matches.json");
  const currentById = new Map(matches.map(match => [match.id, match]));
  const actualById = new Map(snapshot.matches.filter(row => {
    const match = currentById.get(row.matchId);
    return match && match.status === "finished" && !match.resultCoverage?.awarded && Number.isInteger(match.score?.home) && Number.isInteger(match.score?.away);
  }).map(row => [row.matchId, currentById.get(row.matchId)]));
  const commonIds = snapshot.matches.filter(row => actualById.has(row.matchId) && modelOrder.every(label => row.predictions.some(prediction => prediction.modelLabel === label))).map(row => row.matchId);
  const models = {};
  for (const label of modelOrder) {
    const predictions = snapshot.matches.filter(row => commonIds.includes(row.matchId)).map(row => ({ matchId: row.matchId, prediction: row.predictions.find(prediction => prediction.modelLabel === label) }));
    models[label] = evaluatePredictionRows(predictions, actualById);
  }
  const evaluation = {
    schemaVersion: 1,
    protocol: "PROSPECTIVE HEAD-TO-HEAD",
    generatedAt,
    snapshotFile: snapshotRelative,
    snapshotFileSHA256: fileHash(snapshotRelative),
    snapshotContainerHash: snapshot.integrity.sha256,
    status: commonIds.length === snapshot.matchCount ? "COMPLETE" : commonIds.length ? "PARTIAL" : "PENDING",
    predictionRecalculation: false,
    actualSource: "data/normalized/matches.json",
    actualSourceSHA256: fileHash("data/normalized/matches.json"),
    commonSample: { n: commonIds.length, matchIds: commonIds, rule: "INTERSECTION OF FINISHED NON-AWARDED MD6 MATCHES WITH ALL FOUR FROZEN MODELS" },
    pendingMatchIds: snapshot.matches.filter(row => !commonIds.includes(row.matchId)).map(row => row.matchId),
    models,
    metrics: commonIds.length ? ["scoreLogLoss", "oneXTwoRPS", "bttsBrier", "over25Brier", "goalMAE", "exactHitRate", "top3HitRate", "top5HitRate", "calibration"] : null,
    modelPromotion: "NONE",
  };
  evaluation.integrity = { algorithm: "SHA-256", scope: "evaluation payload excluding integrity metadata", sha256: payloadHash(evaluation) };
  write(evaluationRelative, evaluation);
  return evaluation;
}

module.exports = {
  root,
  snapshotRelative,
  manifestRelative,
  evaluationRelative,
  validationRelative,
  reportJsonRelative,
  reportMarkdownRelative,
  modelOrder,
  modelIdByLabel,
  labelByModelId,
  read,
  write,
  fileHash,
  payloadHash,
  predictionHash,
  hashManifest,
  captureProtectedHashes,
  compareHashes,
  productionMatrix,
  marketsFromMatrix,
  buildProspectiveSnapshot,
  validateProspectiveSnapshot,
  freezeMd06,
  evaluateFrozenMd06,
};
