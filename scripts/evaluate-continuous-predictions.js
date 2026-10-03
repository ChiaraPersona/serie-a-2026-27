"use strict";

const fs = require("fs");
const path = require("path");
const { SNAPSHOT_SCHEMA_VERSION, actualForSnapshot, validateSnapshot, continuous, marketMetrics, numeric, normalizeName, toKickoffUtc, sha256 } = require("./predictions/snapshot-core");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
const round = value => Number.isFinite(value) ? Number(value.toFixed(4)) : null;
const dataRoot = path.join(root, "data/predictions/snapshots/2026-27");
const manifestPath = "data/predictions/snapshots/manifest.json";
const reportPath = "data/analysis/prediction-continuous-evaluation-v2.json";
const docPath = "docs/prediction-continuous-evaluation-v2.md";
const reportNow = new Date().toISOString();
const manifest = fs.existsSync(path.join(root, manifestPath)) ? read(manifestPath) : { schemaVersion: 1, season: "2026-27", competition: "serie-a", snapshots: [] };
const canonicalMatches = read("data/normalized/matches.json");
const matchById = new Map(canonicalMatches.map(match => [match.id, match]));
const allSnapshots = [];
const duplicateIds = new Set();
for (const filename of fs.existsSync(dataRoot) ? fs.readdirSync(dataRoot).filter(name => /^md-\d{2}\.json$/.test(name)).sort() : []) {
  const file = JSON.parse(fs.readFileSync(path.join(dataRoot, filename), "utf8"));
  for (const snapshot of file.snapshots || []) {
    if (duplicateIds.has(snapshot.matchId)) throw new Error(`DUPLICATE_SNAPSHOT_MATCH_ID: ${snapshot.matchId}`);
    duplicateIds.add(snapshot.matchId);
    allSnapshots.push({ snapshot, file: `data/predictions/snapshots/2026-27/${filename}` });
  }
}

const invalid = [], exactScoreDataset = [], nonSportingOutcomes = [], evaluatedMatches = [], pending = [], invalidMatchIds = [];
const playerRows = [], teamRows = [];
for (const { snapshot, file } of allSnapshots) {
  const errors = validateSnapshot(snapshot);
  const match = matchById.get(snapshot.matchId);
  if (!match) errors.push("canonical matchId is absent from normalized matches");
  else if (match.id !== snapshot.matchId) errors.push("canonical matchId mismatch");
  if (errors.length) { invalid.push({ matchId: snapshot.matchId, snapshotId: snapshot.snapshotId, file, reasons: errors }); invalidMatchIds.push(snapshot.matchId); continue; }
  const kickoffUtc = toKickoffUtc(match);
  const prospective = kickoffUtc != null && Date.parse(snapshot.generatedAt) < kickoffUtc;
  const generationClass = prospective ? "PROSPECTIVE IMMUTABLE SNAPSHOT" : "RETROSPECTIVE TEST SNAPSHOT";
  if (["postponed", "cancelled"].includes(match.status) || (match.status === "abandoned" && !match.resultCoverage?.awarded)) {
    pending.push({ snapshotId: snapshot.snapshotId, matchId: match.id, matchday: match.matchday, status: match.status.toUpperCase(), evaluationStatus: match.status === "postponed" ? "VOID/POSTPONED" : "VOID/CANCELLED", generationClass });
    continue;
  }
  const actual = actualForSnapshot(snapshot, match);
  if (!actual) {
    pending.push({ snapshotId: snapshot.snapshotId, matchId: match.id, matchday: match.matchday, status: match.status, evaluationStatus: "PENDING", generationClass });
    continue;
  }
  const joined = { ...actual, generationClass, lineupState: snapshot.lineupState, modelVersion: snapshot.modelVersion, engineVersion: snapshot.engineVersion, teamProjections: snapshot.prediction.teamProjections, projectedPlayers: snapshot.prediction.players };
  evaluatedMatches.push(joined);
  if (actual.sportingEvaluationEligible) exactScoreDataset.push(actual.exactScoreFeatures);
  else nonSportingOutcomes.push({ matchId: match.id, snapshotId: snapshot.snapshotId, status: actual.status, goals: { home: actual.actual.homeGoals, away: actual.actual.awayGoals }, excludedFromSportingMetrics: true });
  const actualById = new Map(actual.actual.players.filter(player => player.playerId).map(player => [`${player.teamId}:${player.playerId}`, player]));
  const actualByName = new Map(actual.actual.players.map(player => [`${player.teamId}:${normalizeName(player.player)}`, player]));
  for (const player of snapshot.prediction.players) {
    const observed = (player.playerId ? actualById.get(`${player.team}:${player.playerId}`) : null) || actualByName.get(`${player.team}:${normalizeName(player.player)}`) || null;
    playerRows.push({ snapshotId: snapshot.snapshotId, matchId: match.id, matchday: match.matchday, team: player.team, opponent: player.opponent, venue: player.team === match.homeTeam ? "home" : "away", playerId: player.playerId, player: player.player, role: player.detailedRole !== "N/D" ? player.detailedRole : player.role, tier: player.tier, allocationClass: player.classification?.allocationClass, outsider: player.outsiderStatus?.shots || player.outsiderStatus?.sot, lineupState: snapshot.lineupState, predictedShots: player.predictedShots, predictedSOT: player.predictedSOT, expectedMinutes: player.expectedMinutes, actualShots: observed?.shots ?? null, actualSOT: observed?.shotsOnTarget ?? null, actualMinutes: observed?.minutes ?? null, actualStarter: observed ? Boolean(observed.starter) : null, pShots1: player.probabilities?.shots1Plus, pShots2: player.probabilities?.shots2Plus, pShots3: player.probabilities?.shots3Plus, pShots4: player.probabilities?.shots4Plus, pSot1: player.probabilities?.sot1Plus, pSot2: player.probabilities?.sot2Plus, baselineConfidence: player.baselineConfidence, modelConfidence: player.modelConfidence });
  }
  for (const team of snapshot.prediction.teamProjections) {
    const venue = team.venue;
    teamRows.push({ matchId: match.id, matchday: match.matchday, team: team.teamId, opponent: team.opponent, venue, predictedShots: team.finalTeamTargetShots, predictedSOT: team.finalTeamTargetSOT, actualShots: actual.actual[`${venue}Shots`], actualSOT: actual.actual[`${venue}SOT`], predictedExpectedGoalsExisting: team.teamExpectedGoalsExisting, actualXG: actual.actual[`${venue}XG`], goals: actual.actual[`${venue}Goals`] });
  }
}

const matchdays = [...new Set(allSnapshots.map(item => item.snapshot.matchday))].sort((a, b) => a - b);
const playerMarkets = [
  ["shots1Plus", "pShots1", "actualShots", 1], ["shots2Plus", "pShots2", "actualShots", 2], ["shots3Plus", "pShots3", "actualShots", 3], ["shots4Plus", "pShots4", "actualShots", 4], ["sot1Plus", "pSot1", "actualSOT", 1], ["sot2Plus", "pSot2", "actualSOT", 2]
];
function expectedMinutesBand(minutes) { return !numeric(minutes) ? "N/D" : minutes < 30 ? "<30" : minutes < 60 ? "30-59" : minutes < 75 ? "60-74" : "75+"; }
function pearson(left, right) {
  if (left.length < 3 || left.length !== right.length) return null;
  const mx = left.reduce((sum, value) => sum + value, 0) / left.length, my = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - mx) * (right[index] - my), 0);
  const dx = Math.sqrt(left.reduce((sum, value) => sum + (value - mx) ** 2, 0)), dy = Math.sqrt(right.reduce((sum, value) => sum + (value - my) ** 2, 0));
  return dx && dy ? round(numerator / (dx * dy)) : null;
}
const evaluateRows = (matches, players, teams) => {
  const marketMetricsById = Object.fromEntries(playerMarkets.map(([id, probability, actual, threshold]) => [id, marketMetrics(players, probability, actual, threshold)]));
  const conversions = matches.flatMap(match => match.projectedPlayers.map(player => ({ predicted: player.predictedShots > 0 ? player.predictedSOT / player.predictedShots : null, actual: player.actualShots > 0 ? player.actualSOT / player.actualShots : null })).filter(row => numeric(row.predicted) && numeric(row.actual)));
  const ratios = rows => ({ n: rows.length, predicted: rows.length ? round(rows.reduce((sum, row) => sum + row.predicted, 0) / rows.length) : null, actual: rows.length ? round(rows.reduce((sum, row) => sum + row.actual, 0) / rows.length) : null, gap: rows.length ? round(rows.reduce((sum, row) => sum + row.predicted - row.actual, 0) / rows.length) : null });
  const minutes = continuous(players, "expectedMinutes", "actualMinutes");
  const outsiders = players.filter(row => row.outsider);
  const outsiderRoles = [...new Set(outsiders.map(row => row.role || "N/D"))];
  const comparableControls = outsiderRoles.flatMap(role => players.filter(row => !row.outsider && row.tier === "SECONDARY" && (row.role || "N/D") === role));
  const shots = continuous(players, "predictedShots", "actualShots"), sot = continuous(players, "predictedSOT", "actualSOT");
  const teamShots = continuous(teams, "predictedShots", "actualShots"), teamSot = continuous(teams, "predictedSOT", "actualSOT");
  const conversionRows = teams.filter(row => row.predictedShots > 0 && row.actualShots > 0 && numeric(row.predictedSOT) && numeric(row.actualSOT));
  const allocatedToActualTeamVolume = [], allocatedToMatchedPlayerVolume = [];
  for (const match of matches) for (const team of match.teamProjections) {
    const subset = players.filter(row => row.matchId === match.matchId && row.team === team.teamId && numeric(row.actualShots) && numeric(row.predictedShots));
    const teamActual = team.venue === "home" ? match.actual.homeShots : match.actual.awayShots;
    const predictedSum = subset.reduce((sum, row) => sum + row.predictedShots, 0);
    const matchedActualSum = subset.reduce((sum, row) => sum + row.actualShots, 0);
    if (predictedSum > 0) for (const row of subset) {
      if (teamActual != null) allocatedToActualTeamVolume.push({ matchId: match.matchId, predictedShots: teamActual * row.predictedShots / predictedSum, actualShots: row.actualShots, predictedSOT: null, actualSOT: null });
      allocatedToMatchedPlayerVolume.push({ matchId: match.matchId, predictedShots: matchedActualSum * row.predictedShots / predictedSum, actualShots: row.actualShots, predictedSOT: null, actualSOT: null });
    }
    const sotSubset = players.filter(row => row.matchId === match.matchId && row.team === team.teamId && numeric(row.actualSOT) && numeric(row.predictedSOT));
    const predictedSotSum = sotSubset.reduce((sum, row) => sum + row.predictedSOT, 0);
    const matchedSotSum = sotSubset.reduce((sum, row) => sum + row.actualSOT, 0);
    const teamSotActual = team.venue === "home" ? match.actual.homeSOT : match.actual.awaySOT;
    if (predictedSotSum > 0) for (const row of sotSubset) {
      if (teamSotActual != null) allocatedToActualTeamVolume.push({ matchId: match.matchId, predictedShots: null, actualShots: null, predictedSOT: teamSotActual * row.predictedSOT / predictedSotSum, actualSOT: row.actualSOT });
      allocatedToMatchedPlayerVolume.push({ matchId: match.matchId, predictedShots: null, actualShots: null, predictedSOT: matchedSotSum * row.predictedSOT / predictedSotSum, actualSOT: row.actualSOT });
    }
  }
  const dispersion = (rows, key) => {
    const values = rows.map(row => row[key]).filter(numeric);
    if (values.length < 20) return { n: values.length, mean: null, variance: null, index: null, status: "INSUFFICIENT" };
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    return { n: values.length, mean: round(average), variance: round(variance), index: average ? round(variance / average) : null, status: "DESCRIPTIVE" };
  };
  return {
    matchClusters: matches.length,
    playerObservations: players.length,
    teamObservations: teams.length,
    shots, sot, markets: marketMetricsById,
    teamTarget: { shots: teamShots, sot: teamSot },
    allocation: { fullPlayerVolume: { shots, sot }, actualTeamVolumeCounterfactual: { shots: continuous(allocatedToActualTeamVolume, "predictedShots", "actualShots"), sot: continuous(allocatedToActualTeamVolume, "predictedSOT", "actualSOT") }, matchedPlayerVolumeCounterfactual: { shots: continuous(allocatedToMatchedPlayerVolume, "predictedShots", "actualShots"), sot: continuous(allocatedToMatchedPlayerVolume, "predictedSOT", "actualSOT") }, matchedPlayerRows: allocatedToMatchedPlayerVolume.length },
    sotConversion: {
      n: conversionRows.length,
      predicted: conversionRows.length ? round(conversionRows.reduce((sum, row) => sum + row.predictedSOT / row.predictedShots, 0) / conversionRows.length) : null,
      actual: conversionRows.length ? round(conversionRows.reduce((sum, row) => sum + row.actualSOT / row.actualShots, 0) / conversionRows.length) : null,
      byRole: Object.fromEntries([...new Set(players.map(row => row.role || "N/D"))].map(role => [role, ratios(players.filter(row => row.role === role && row.predictedShots > 0 && row.actualShots > 0).map(row => ({ predicted: row.predictedSOT / row.predictedShots, actual: row.actualSOT / row.actualShots })))])),
      byTier: Object.fromEntries([...new Set(players.map(row => row.tier || "N/D"))].map(tier => [tier, ratios(players.filter(row => row.tier === tier && row.predictedShots > 0 && row.actualShots > 0).map(row => ({ predicted: row.predictedSOT / row.predictedShots, actual: row.actualSOT / row.actualShots })))])),
      byTeam: Object.fromEntries([...new Set(players.map(row => row.team))].map(team => [team, ratios(players.filter(row => row.team === team && row.predictedShots > 0 && row.actualShots > 0).map(row => ({ predicted: row.predictedSOT / row.predictedShots, actual: row.actualSOT / row.actualShots })))])),
      byPlayer: Object.fromEntries([...new Set(players.map(row => row.playerId || row.player))].map(player => [player, ratios(players.filter(row => (row.playerId || row.player) === player && row.predictedShots > 0 && row.actualShots > 0).map(row => ({ predicted: row.predictedSOT / row.predictedShots, actual: row.actualSOT / row.actualShots })))]))
    },
    poissonDispersion: {
      shots: dispersion(players, "actualShots"), sot: dispersion(players, "actualSOT"),
      byTier: Object.fromEntries([...new Set(players.map(row => row.tier))].map(tier => [tier, { shots: dispersion(players.filter(row => row.tier === tier), "actualShots"), sot: dispersion(players.filter(row => row.tier === tier), "actualSOT") }])),
      byRole: Object.fromEntries([...new Set(players.map(row => row.role || "N/D"))].map(role => [role, { shots: dispersion(players.filter(row => (row.role || "N/D") === role), "actualShots"), sot: dispersion(players.filter(row => (row.role || "N/D") === role), "actualSOT") }])),
      byExpectedMinutesBand: Object.fromEntries(["<30", "30-59", "60-74", "75+"].map(band => [band, { shots: dispersion(players.filter(row => expectedMinutesBand(row.expectedMinutes) === band), "actualShots"), sot: dispersion(players.filter(row => expectedMinutesBand(row.expectedMinutes) === band), "actualSOT") }]))
    },
    expectedMinutes: { mae: minutes.mae, rmse: minutes.rmse, biasActualMinusExpected: numeric(minutes.bias) ? round(-minutes.bias) : null, n: minutes.n, correlationExpectedVsActual: pearson(players.filter(row => numeric(row.expectedMinutes) && numeric(row.actualMinutes)).map(row => row.expectedMinutes), players.filter(row => numeric(row.expectedMinutes) && numeric(row.actualMinutes)).map(row => row.actualMinutes)), byLineupState: Object.fromEntries([...new Set(players.map(row => row.lineupState))].map(state => [state, continuous(players.filter(row => row.lineupState === state), "expectedMinutes", "actualMinutes")])), byExpectedMinutesBand: Object.fromEntries(["<30", "30-59", "60-74", "75+", "N/D"].map(band => [band, continuous(players.filter(row => expectedMinutesBand(row.expectedMinutes) === band), "expectedMinutes", "actualMinutes")])) },
    outsider: { outsider: continuous(outsiders, "predictedShots", "actualShots"), outsiderExpectedMinutes: continuous(outsiders, "expectedMinutes", "actualMinutes"), comparableSecondaryControlSameRole: continuous(comparableControls, "predictedShots", "actualShots"), byRole: Object.fromEntries(outsiderRoles.map(role => [role, { outsider: continuous(outsiders.filter(row => (row.role || "N/D") === role), "predictedShots", "actualShots"), comparableSecondaryControl: continuous(players.filter(row => !row.outsider && row.tier === "SECONDARY" && (row.role || "N/D") === role), "predictedShots", "actualShots") }])), outsiderN: outsiders.length, comparableSameRoleControlN: comparableControls.length },
    coverage: { playerShotsPct: players.length ? round(players.filter(row => numeric(row.actualShots)).length / players.length * 100) : null, playerSotPct: players.length ? round(players.filter(row => numeric(row.actualSOT)).length / players.length * 100) : null, minutesPct: players.length ? round(players.filter(row => numeric(row.actualMinutes)).length / players.length * 100) : null, xgPct: teams.length ? round(teams.filter(row => numeric(row.actualXG)).length / teams.length * 100) : null },
    teamMatchupAndOpponentInteraction: { status: "COUNTERFACTUAL NOT EXACTLY RECONSTRUCTIBLE", noMatchupExact: null, noOpponentInteractionExact: null, note: "Stored component trace lacks re-run player allocation after neutralizing each factor; FULL V2 remains untouched." },
    nbShadow: negativeBinomialShadow(players)
  };
};

function negativeBinomialShadow(players) {
  const counts = players.map(row => row.actualShots).filter(numeric);
  if (counts.length < 2) return { status: "INSUFFICIENT", dispersion: null, markets: {} };
  const mean = counts.reduce((sum, value) => sum + value, 0) / counts.length;
  const variance = counts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / counts.length;
  const dispersion = Math.max(0, (variance - mean) / Math.max(1e-9, mean ** 2));
  const nbAtLeast = (mu, threshold) => {
    if (!dispersion) return poissonAtLeast(mu, threshold);
    const r = 1 / dispersion, p = r / (r + mu);
    let mass = p ** r, cumulative = mass;
    for (let k = 1; k < threshold; k += 1) { mass *= ((k - 1 + r) / k) * (1 - p); cumulative += mass; }
    return Math.max(0, Math.min(1, 1 - cumulative));
  };
  const markets = {};
  for (const [threshold, key] of [[1, "shots1Plus"], [2, "shots2Plus"], [3, "shots3Plus"]]) {
    const rows = players.filter(row => numeric(row.predictedShots) && numeric(row.actualShots)).map(row => ({ poisson: poissonAtLeast(row.predictedShots, threshold), nb: nbAtLeast(row.predictedShots, threshold), actual: row.actualShots }));
    const metric = probability => { const result = marketMetrics(rows.map(row => ({ p: row[probability], y: row.actual })), "p", "y", threshold); return { brier: result.brier, logLoss: result.logLoss, ece: result.ece, n: result.n }; };
    markets[key] = { poisson: metric("poisson"), negativeBinomial: metric("nb"), status: "SHADOW ONLY" };
  }
  return { status: counts.length < 100 ? "INSUFFICIENT" : "WATCH", dispersion, source: "Pooled moments from evaluated observations; no model substitution.", markets };
}

function poissonAtLeast(mu, threshold) {
  let term = Math.exp(-mu), cumulative = term;
  for (let k = 1; k < threshold; k += 1) { term *= mu / k; cumulative += term; }
  return Math.max(0, Math.min(1, 1 - cumulative));
}

const evaluationsByDay = Object.fromEntries(matchdays.map(day => {
  const matches = evaluatedMatches.filter(row => row.matchday === day);
  const players = playerRows.filter(row => row.matchday === day);
  const teams = teamRows.filter(row => row.matchday === day);
  return [String(day), { maturity: maturityBand(day), ...evaluateRows(matches, players, teams) }];
}));
function maturityBand(day) { return day <= 5 ? "EARLY" : day <= 10 ? "DEVELOPING" : day <= 20 ? "MID SAMPLE" : "MATURE"; }
const pooled = evaluateRows(evaluatedMatches, playerRows, teamRows);
const modelEvidenceTeams = allSnapshots.flatMap(item => item.snapshot.prediction.teamProjections || []);
const modelEvidencePlayers = allSnapshots.flatMap(item => item.snapshot.prediction.players || []);
const modelMaturityValues = modelEvidenceTeams.map(team => team.maturity).filter(numeric);
const modelEvidenceMaturityCoverage = {
  teamProfileRecords: modelEvidenceTeams.length,
  maturityWeight: { n: modelMaturityValues.length, min: modelMaturityValues.length ? round(Math.min(...modelMaturityValues)) : null, mean: modelMaturityValues.length ? round(modelMaturityValues.reduce((sum, value) => sum + value, 0) / modelMaturityValues.length) : null, max: modelMaturityValues.length ? round(Math.max(...modelMaturityValues)) : null },
  teamProfileStatusCounts: modelEvidenceTeams.reduce((counts, team) => { const status = team.teamProfileStatus || "N/D"; counts[status] = (counts[status] || 0) + 1; return counts; }, {}),
  playerBaselineStabilityCounts: modelEvidencePlayers.reduce((counts, player) => { const status = player.stability || "N/D"; counts[status] = (counts[status] || 0) + 1; return counts; }, {})
};
const temporalCoverage = {
  totalMatchClusters: evaluatedMatches.length,
  totalPlayerObservations: playerRows.length,
  firstEvaluatedMatchday: evaluatedMatches.length ? Math.min(...evaluatedMatches.map(row => row.matchday)) : null,
  lastEvaluatedMatchday: evaluatedMatches.length ? Math.max(...evaluatedMatches.map(row => row.matchday)) : null,
  evaluatedMatchdays: [...new Set(evaluatedMatches.map(row => row.matchday))].sort((a, b) => a - b),
  snapshotMatchdays: matchdays,
  pendingMatches: pending.length,
  maturityCoverage: Object.fromEntries(["EARLY", "DEVELOPING", "MID SAMPLE", "MATURE"].map(band => [band, evaluatedMatches.filter(row => maturityBand(row.matchday) === band).length]))
};
const exactScoreDatasetStatus = {
  prospectiveValidMatches: exactScoreDataset.filter(row => evaluatedMatches.find(match => match.matchId === row.matchId)?.generationClass === "PROSPECTIVE IMMUTABLE SNAPSHOT").length,
  totalOutcomeRows: exactScoreDataset.length,
  actualXGCoverage: pooled.coverage.xgPct,
  shotsSOTCoverage: { shots: pooled.coverage.playerShotsPct, sot: pooled.coverage.playerSotPct },
  goalFeatureCoverage: evaluatedMatches.length ? round(evaluatedMatches.reduce((sum, match) => sum + match.teamProjections.filter(team => team.goalFeatures.currentSeasonMatches > 0).length, 0) / (evaluatedMatches.length * 2) * 100) : 0
};
const exactScoreGate = exactScoreDatasetStatus.prospectiveValidMatches >= 100 && exactScoreDatasetStatus.actualXGCoverage >= 80 && exactScoreDatasetStatus.shotsSOTCoverage.shots >= 90 && exactScoreDatasetStatus.shotsSOTCoverage.sot >= 90 && exactScoreDatasetStatus.goalFeatureCoverage >= 80 && temporalCoverage.evaluatedMatchdays.length >= 10 ? "READY_FOR_BASELINE_MODEL" : exactScoreDataset.length ? "COLLECTING" : "INSUFFICIENT";

function bootstrapByMatch(rows, getValue, seed = 20261003, iterations = 1000) {
  const ids = [...new Set(rows.map(row => row.matchId))];
  if (ids.length < 5) return { status: "INSUFFICIENT", clusters: ids.length, ci95: null };
  const grouped = new Map(ids.map(id => [id, rows.filter(row => row.matchId === id)]));
  const random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const estimates = [];
  for (let i = 0; i < iterations; i += 1) {
    const sample = [];
    for (let j = 0; j < ids.length; j += 1) sample.push(...grouped.get(ids[Math.floor(random() * ids.length)]));
    const values = sample.map(getValue).filter(numeric);
    if (values.length) estimates.push(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  estimates.sort((a, b) => a - b);
  const quantile = q => estimates[Math.floor((estimates.length - 1) * q)] ?? null;
  const values = rows.map(getValue).filter(numeric);
  return { status: "ESTIMATED", clusters: ids.length, iterations, estimate: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null, ci95: [round(quantile(0.025)), round(quantile(0.975))], ciBonferroni4: [round(quantile(0.00625)), round(quantile(0.99375))] };
}

const signalSpecs = [
  { id: "team-shots-target-bias", label: "Team shots target bias", minimumPracticalEffect: 2, rows: matchday => teamRows.filter(row => row.matchday === matchday), value: row => numeric(row.predictedShots) && numeric(row.actualShots) ? row.predictedShots - row.actualShots : null },
  { id: "team-sot-target-bias", label: "Team SOT target bias", minimumPracticalEffect: 1, rows: matchday => teamRows.filter(row => row.matchday === matchday), value: row => numeric(row.predictedSOT) && numeric(row.actualSOT) ? row.predictedSOT - row.actualSOT : null },
  { id: "player-cfst-shots-bias", label: "CF/ST shots bias", minimumPracticalEffect: 0.25, rows: matchday => playerRows.filter(row => row.matchday === matchday && /^(CF|ST)$/.test(row.role || "")), value: row => numeric(row.predictedShots) && numeric(row.actualShots) ? row.predictedShots - row.actualShots : null },
  { id: "sot-conversion-gap", label: "SOT/shots conversion gap", minimumPracticalEffect: 0.03, rows: matchday => playerRows.filter(row => row.matchday === matchday && row.predictedShots > 0 && row.actualShots > 0), value: row => row.predictedSOT / row.predictedShots - row.actualSOT / row.actualShots }
];
const observedDays = temporalCoverage.evaluatedMatchdays;
const rollingSubset = count => {
  const start = observedDays.length ? observedDays[Math.max(0, observedDays.length - count)] : Infinity;
  return {
    matches: evaluatedMatches.filter(row => row.matchday >= start),
    players: playerRows.filter(row => row.matchday >= start),
    teams: teamRows.filter(row => row.matchday >= start)
  };
};
const persistentSignals = Object.fromEntries(signalSpecs.map(spec => {
  const points = observedDays.map(day => {
    const rows = spec.rows(day), values = rows.map(spec.value).filter(numeric);
    return { matchday: day, n: values.length, effectSize: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null, bootstrap: bootstrapByMatch(rows, spec.value) };
  }).filter(point => point.n > 0);
  const signs = points.map(point => Math.sign(point.effectSize)).filter(Boolean);
  const persistence = signs.length >= 3 && signs.slice(-3).every(sign => sign === signs.at(-1)) && Math.abs(points.at(-1)?.effectSize || 0) >= spec.minimumPracticalEffect && points.at(-1)?.bootstrap?.ciBonferroni4 && (points.at(-1).bootstrap.ciBonferroni4[0] > 0 || points.at(-1).bootstrap.ciBonferroni4[1] < 0);
  const n = points.reduce((sum, point) => sum + point.n, 0);
  const interval = bootstrapByMatch(playerOrTeamRows(spec.id), spec.value);
  const resolved = points.length >= 3 && points.at(-3)?.bootstrap?.ciBonferroni4 && (points.at(-3).bootstrap.ciBonferroni4[0] > 0 || points.at(-3).bootstrap.ciBonferroni4[1] < 0) && points.slice(-2).every(point => point.bootstrap.ciBonferroni4 && point.bootstrap.ciBonferroni4[0] <= 0 && point.bootstrap.ciBonferroni4[1] >= 0);
  const status = n < 20 ? "INSUFFICIENT" : persistence ? "PERSISTENT" : resolved ? "RESOLVED" : points.length >= 2 ? "WATCH" : "NEW";
  return [spec.id, { label: spec.label, firstSeen: points[0]?.matchday ?? null, lastSeen: points.at(-1)?.matchday ?? null, matchdaysObserved: points.map(point => point.matchday), n, effectSize: points.length ? points.at(-1).effectSize : null, minimumPracticalEffect: spec.minimumPracticalEffect, direction: points.length ? points.at(-1).effectSize > 0 ? "POSITIVE" : points.at(-1).effectSize < 0 ? "NEGATIVE" : "NEUTRAL" : "N/D", confidence: interval.status === "ESTIMATED" ? "Match-cluster bootstrap; 95% CI plus Bonferroni-adjusted 98.75% CI" : "INSUFFICIENT", bootstrap: interval, status, history: points }];
}));
function playerOrTeamRows(id) { return id.startsWith("team-") ? teamRows : playerRows; }
const gateChecks = {
  matchClusters: { value: temporalCoverage.totalMatchClusters, reviewMinimum: 50, passed: temporalCoverage.totalMatchClusters >= 50 },
  targetMatchdays: { value: temporalCoverage.evaluatedMatchdays.length, reviewMinimum: 5, passed: temporalCoverage.evaluatedMatchdays.length >= 5 },
  playerObservations: { value: temporalCoverage.totalPlayerObservations, reviewMinimum: 1000, passed: temporalCoverage.totalPlayerObservations >= 1000 },
  multipleMaturityStages: { value: Object.values(temporalCoverage.maturityCoverage).filter(value => value > 0).length, reviewMinimum: 3, passed: Object.values(temporalCoverage.maturityCoverage).filter(value => value > 0).length >= 3 },
  persistentSignalWithUncertainty: { value: Object.values(persistentSignals).filter(signal => signal.status === "PERSISTENT" && signal.bootstrap.ciBonferroni4 && (signal.bootstrap.ciBonferroni4[0] > 0 || signal.bootstrap.ciBonferroni4[1] < 0)).length, passed: Object.values(persistentSignals).some(signal => signal.status === "PERSISTENT" && signal.bootstrap.ciBonferroni4 && (signal.bootstrap.ciBonferroni4[0] > 0 || signal.bootstrap.ciBonferroni4[1] < 0)) },
  multipleComparisonReview: { value: "4 signals; match-cluster bootstrap with Bonferroni-adjusted two-sided 98.75% intervals", passed: Object.values(persistentSignals).some(signal => signal.status === "PERSISTENT" && signal.bootstrap.ciBonferroni4 && (signal.bootstrap.ciBonferroni4[0] > 0 || signal.bootstrap.ciBonferroni4[1] < 0)) }
};
const gateOpen = Object.values(gateChecks).every(value => value.passed);
const affectedMarketsBySignal = { "team-shots-target-bias": ["team shots"], "team-sot-target-bias": ["team SOT"], "player-cfst-shots-bias": ["CF/ST shots"], "sot-conversion-gap": ["player SOT conversion"] };
const modelChangeReview = {
  status: gateOpen ? "REVIEW REQUIRED — STOP FOR SEPARATE HUMAN DECISION" : "CLOSED",
  findings: Object.entries(persistentSignals).filter(([, signal]) => signal.status === "PERSISTENT").map(([id, signal]) => ({ problem: signal.label, affectedMarkets: affectedMarketsBySignal[id] || [], matchdays: signal.matchdaysObserved, n: signal.n, effectSize: signal.effectSize, uncertainty: signal.bootstrap.ciBonferroni4 || signal.bootstrap.ci95, candidateIntervention: "research hypothesis only; no candidate is selected or applied automatically" })),
  stopAfterReport: gateOpen,
  automaticModelChanges: false
};

const legacyReport = fs.existsSync(path.join(root, "data/analysis/prediction-calibration-v2.json")) ? read("data/analysis/prediction-calibration-v2.json") : null;
const legacy = legacyReport ? { status: "LEGACY EVALUATION SNAPSHOT", matchdays: [5], matchClusters: legacyReport.dataAudit?.evaluableMatches ?? null, playerObservations: legacyReport.dataAudit?.totalPlayerMatchObservations ?? null, generatedAt: null, limitation: "No prospective immutable snapshot provenance was retained; excluded from cumulative prospective metrics." } : null;
const legacyInitialSignals = legacyReport ? {
  teamShotsTarget: { firstSeen: 5, lastSeen: 5, matchdaysObserved: [5], n: legacyReport.teamTarget?.shots?.n ?? null, effectSize: legacyReport.teamTarget?.shots?.mae ?? null, direction: "ABSOLUTE_ERROR", status: "WATCH / INSUFFICIENT", source: "legacy MD5 report" },
  sotConversionGap: { firstSeen: 5, lastSeen: 5, matchdaysObserved: [5], n: legacyReport.sotConversionDiagnostic?.n ?? null, effectSize: numeric(legacyReport.sotConversionDiagnostic?.predictedRatioMean) && numeric(legacyReport.sotConversionDiagnostic?.actualRatioMean) ? round(legacyReport.sotConversionDiagnostic.predictedRatioMean - legacyReport.sotConversionDiagnostic.actualRatioMean) : null, direction: "POSITIVE", status: "WATCH / INSUFFICIENT", source: "legacy MD5 report" },
  cfStShotsBias: { firstSeen: 5, lastSeen: 5, matchdaysObserved: [5], n: legacyReport.segments?.role?.["CF/ST"]?.shots?.n ?? null, effectSize: legacyReport.segments?.role?.["CF/ST"]?.shots?.bias ?? null, direction: "POSITIVE", status: "WATCH / INSUFFICIENT", source: "legacy MD5 report" },
  shotsDispersion: { firstSeen: 5, lastSeen: 5, matchdaysObserved: [5], n: legacyReport.poissonDiagnostic?.shots?.n ?? null, effectSize: legacyReport.poissonDiagnostic?.shots?.observedVariance != null && legacyReport.poissonDiagnostic?.shots?.observedMean ? round(legacyReport.poissonDiagnostic.shots.observedVariance / legacyReport.poissonDiagnostic.shots.observedMean) : null, direction: "OVERDISPERSED", status: "WATCH / INSUFFICIENT", source: "legacy MD5 report" }
} : {};
const report = {
  schemaVersion: 1,
  metadata: { title: "Continuous Prediction Engine V2 evaluation", generatedAt: reportNow, season: "2026-27", competition: "serie-a", engineVersion: [...new Set(allSnapshots.map(item => item.snapshot.engineVersion))], modelVersion: [...new Set(allSnapshots.map(item => item.snapshot.modelVersion))], snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION, modelFrozen: true, productionBehaviorChanged: false },
  snapshots: { total: allSnapshots.length, prospective: allSnapshots.filter(item => { const match = matchById.get(item.snapshot.matchId); return match && toKickoffUtc(match) > Date.parse(item.snapshot.generatedAt); }).length, retrospective: allSnapshots.filter(item => { const match = matchById.get(item.snapshot.matchId); return match && toKickoffUtc(match) <= Date.parse(item.snapshot.generatedAt); }).length, pending: pending.length, invalid: invalid.length, manifestHash: sha256(manifest.snapshots) },
  legacyMd5: legacy,
  legacyInitialSignals,
  temporalCoverage,
  modelEvidenceMaturityCoverage,
  marketMetrics: pooled.markets,
  teamTargetDiagnostics: pooled.teamTarget,
  allocationDiagnostics: pooled.allocation,
  sotConversionDiagnostics: pooled.sotConversion,
  distributionDiagnostics: { dispersion: pooled.poissonDispersion, negativeBinomialShadow: pooled.nbShadow, status: "SHADOW ONLY" },
  matchupDiagnostics: pooled.teamMatchupAndOpponentInteraction,
  minutesDiagnostics: pooled.expectedMinutes,
  outsiderDiagnostics: pooled.outsider,
  v1v2: { status: "V1 snapshot not available for the prospective snapshot IDs", comparableObservations: 0 },
  persistentSignals,
  matchdayMetrics: evaluationsByDay,
  rollingMetrics: {
    last3Matchdays: evaluateRows(rollingSubset(3).matches, rollingSubset(3).players, rollingSubset(3).teams),
    last5Matchdays: evaluateRows(rollingSubset(5).matches, rollingSubset(5).players, rollingSubset(5).teams),
    seasonToDate: pooled
  },
  exactScoreDatasetStatus,
  exactScoreDataGate: exactScoreGate,
  modelChangeGate: { status: gateOpen ? "REVIEW" : "CLOSED", checks: gateChecks, note: "Compound gate; one MD/10 matches cannot open it. The signal also requires persistence, clustered uncertainty, meaningful effect, and multiple-comparison review." },
  modelChangeReview,
  nextAction: exactScoreGate === "READY_FOR_BASELINE_MODEL" ? "EXACT_SCORE_DATA_GATE: READY_FOR_BASELINE_MODEL — report readiness only; do not implement the model." : gateOpen ? "MODEL CHANGE REVIEW" : "COLLECT PROSPECTIVE SNAPSHOTS",
  evaluationRows: evaluatedMatches.map(({ projectedPlayers, teamProjections, ...row }) => row),
  exactScoreDataset,
  nonSportingOutcomes,
  pending,
  invalid,
  warnings: ["Production prediction formulas and outputs were not changed by evaluation.", "Actuals are joined only by canonical matchId and remain separate from immutable snapshots.", "Unavailable actual fields remain null; no missing statistic is converted into a model feature or observed zero.", "Exact score, 1X2, BTTS, and total goals model layers remain unimplemented."]
};

for (const row of manifest.snapshots) {
  const result = invalid.find(item => item.matchId === row.matchId) ? "INVALID" : pending.find(item => item.matchId === row.matchId)?.evaluationStatus || (evaluatedMatches.some(item => item.matchId === row.matchId) ? "EVALUATED" : "PENDING");
  row.evaluationStatus = result;
}
manifest.updatedAt = reportNow;
write(manifestPath, manifest);
write(reportPath, report);

const signalLines = Object.values(persistentSignals).map(signal => `| ${signal.label} | ${signal.firstSeen ?? "N/D"} | ${signal.lastSeen ?? "N/D"} | ${signal.matchdaysObserved.join(", ") || "N/D"} | ${signal.n} | ${signal.effectSize ?? "N/D"} | ${signal.direction} | ${signal.bootstrap.ci95?.join(" – ") || "N/D"} | ${signal.status} |`);
const md = [
  "# Continuous Prediction Engine V2 evaluation",
  "",
  `Generated: ${reportNow} · Model: ${report.metadata.modelVersion.join(", ") || "player-market-v2"} · Engine: ${report.metadata.engineVersion.join(", ") || "N/D"}`,
  "",
  "## Coverage and decision",
  "",
  `Evaluated matchdays: ${temporalCoverage.evaluatedMatchdays.join(", ") || "none"}; prospective matchdays: ${allSnapshots.filter(item => report.snapshots.prospective && toKickoffUtc(matchById.get(item.snapshot.matchId)) > Date.parse(item.snapshot.generatedAt)).map(item => item.snapshot.matchday).filter((value, index, all) => all.indexOf(value) === index).join(", ") || "none"}; retrospective/legacy: ${legacy?.matchdays.join(", ") || "none"}.`,
  `Match clusters: ${temporalCoverage.totalMatchClusters} · player observations: ${temporalCoverage.totalPlayerObservations} · gate: **MODEL_CHANGE_GATE: ${report.modelChangeGate.status}** · exact-score data gate: **${exactScoreGate}** · next action: **${report.nextAction}**.`,
  "When MODEL_CHANGE_GATE reaches REVIEW, `modelChangeReview` lists the persistent issue, markets, matchdays, N, effect size, adjusted uncertainty and a research-only intervention hypothesis, then requires a separate human decision. No intervention is applied.",
  `Evaluation temporal maturity: ${JSON.stringify(temporalCoverage.maturityCoverage)}. Model evidence maturity is separate: ${modelEvidenceMaturityCoverage.teamProfileRecords} team profiles; shrinkage maturity weight min/mean/max ${modelEvidenceMaturityCoverage.maturityWeight.min ?? "N/D"}/${modelEvidenceMaturityCoverage.maturityWeight.mean ?? "N/D"}/${modelEvidenceMaturityCoverage.maturityWeight.max ?? "N/D"}; player baseline stability levels ${JSON.stringify(modelEvidenceMaturityCoverage.playerBaselineStabilityCounts)}.`,
  "",
  "| Maturity | Evaluated match clusters |",
  "|---|---:|",
  ...Object.entries(temporalCoverage.maturityCoverage).map(([band, count]) => `| ${band} | ${count} |`),
  "",
  "## Persistent diagnostic signals",
  "",
  "| Signal | First MD | Last MD | MDs observed | N | Effect | Direction | Cluster bootstrap 95% CI | Status |",
  "|---|---:|---:|---|---:|---:|---|---|---|",
  ...signalLines,
  "",
  "## Operational contract",
  "",
  "Snapshots are one JSON file per matchday under `data/predictions/snapshots/2026-27/`; the manifest records deterministic match identity, schema/model versions, lineup state, SHA-256, and evaluation status. Snapshot payloads never receive actuals. Evaluation joins `matchId` to `data/normalized/matches.json`, the normalized canonical result source. Schema is version 3. When a production formula changes, increment `modelVersion`; existing snapshots remain on their original model version and are never rebuilt in place.",
  "",
  "Run `npm run snapshot:predictions -- --matchday 6` before kickoff. Existing snapshots fail closed. A pre-kickoff replacement requires `--replace-prekickoff --reason \"...\"`; the old payload and hash are retained in file history and the manifest. Run `npm run evaluate:continuous` after updating canonical match results and player statistics. Neither command commits, pushes, deploys, or publishes.",
  "",
  "Before matchday: refresh source inputs and lineups, build V2 preview, save/validate immutable snapshot and hash. After matchday: import results and stats, normalize, run continuous evaluation, review persistent signals. A closed gate never triggers a model change.",
  "",
  "## Actual and exact-score dataset",
  "",
  `Actual results joined: ${evaluatedMatches.length}; pending: ${pending.length}; invalid: ${invalid.length}. Exact-score feature/outcome rows: ${exactScoreDataset.length}; gate: **${exactScoreGate}**. Each row keeps pre-match X_home / X_away separate from actual home/away goals. READY_FOR_BASELINE_MODEL requires at least 100 prospective matches, 80% actual-xG and goal-feature coverage, 90% shots/SOT coverage and 10 evaluated matchdays. All goal features use matches strictly earlier than the target matchday. The report does not create score probabilities or calculate exact-score model metrics.`,
  "",
  "Future roadmap: (1) prospective dataset; (2) home/away expected-goals baselines from historical goals, current goal averages and available xG; (3) independent Poisson score matrix; (4) calibration evaluation; (5) dependency and low-score correction comparison; (6) coherent 1X2/BTTS/Over-Under checks from the same goal distribution; (7) V2/V3 integration only after out-of-sample improvement. Stages 2–7 are not implemented.",
  "",
  "## Trace limits",
  "",
  "`modelConfidence` is N/D because the frozen engine does not calculate an individual confidence field. Production baseline confidence is serialized separately. The current serialized player allocations do not permit exact NO MATCHUP or NO OPPONENT INTERACTION replays after reconciliation; the evaluator reports the limitation instead of approximating them. No V1 snapshot exists for the same prospective match IDs.",
  "",
  "## Legacy MD5 and prospective start",
  "",
  `${legacy ? `MD5 is retained as ${legacy.status} (${legacy.matchClusters} matches, ${legacy.playerObservations} player observations); it has no reliable historical generatedAt and is excluded from prospective cumulative metrics.` : "No legacy MD5 report was available."}`,
  `PROSPECTIVE EVALUATION STARTS AT: MD${allSnapshots.filter(item => { const match = matchById.get(item.snapshot.matchId); return match && toKickoffUtc(match) > Date.parse(item.snapshot.generatedAt); }).map(item => item.snapshot.matchday).sort((a, b) => a - b)[0] || "N/D"}.`,
  "",
  "## Metrics contract",
  "",
  "The JSON artifact holds pooled and matchday shots/SOT MAE, RMSE and bias; market Brier/log loss/ECE; team target and player allocation errors; SOT conversion split by role, tier, team and player; Poisson dispersion split by role, tier and Expected Minutes band when N ≥ 20, plus a negative-binomial shadow; expected-minutes diagnostics separated by lineup state; outsiders versus same-role secondary controls; V1/V2 availability; exact-score dataset coverage; pending, void/awarded and invalid matches; signal history and the compound model-change gate. Signal status uses NEW, WATCH, PERSISTENT, RESOLVED or INSUFFICIENT; MD5's initial CF/ST signal is retained as WATCH / INSUFFICIENT.",
  "",
  "Do not use exact-score hit rate alone in any future model evaluation. Required measures include probability on actual score, score-matrix log loss, goal MAE, calibrated 1X2/BTTS/Over-Under, Ranked Probability Score and top-N score coverage.",
  ""
].join("\n");
fs.writeFileSync(path.join(root, docPath), md);
console.log(`OK continuous evaluation: ${evaluatedMatches.length} evaluated matches · ${playerRows.length} player observations · ${pending.length} pending · gate ${report.modelChangeGate.status}`);
