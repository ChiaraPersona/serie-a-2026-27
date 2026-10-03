"use strict";

const crypto = require("crypto");

const SNAPSHOT_SCHEMA_VERSION = 3;
const N_D = "N/D";
const round = value => Number.isFinite(value) ? Number(value.toFixed(4)) : null;
const numeric = value => Number.isFinite(value);
const normalizeName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function stableStringify(value) { return JSON.stringify(stableValue(value)); }
function sha256(value) { return crypto.createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex"); }

function canonicalMatchHash(snapshot) {
  const { integrity, ...payload } = snapshot;
  return sha256(payload);
}

function toKickoffUtc(match) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date || "") || !/^\d{2}:\d{2}$/.test(match.kickoff || "")) return null;
  const [year, month, day] = match.date.split("-").map(Number);
  const [hour, minute] = match.kickoff.split(":").map(Number);
  const nominal = Date.UTC(year, month - 1, day, hour, minute);
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "longOffset" }).formatToParts(new Date(nominal)).find(part => part.type === "timeZoneName")?.value || "GMT+01:00";
  const offset = zone.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!offset) return nominal;
  const minutesOffset = (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1);
  return nominal - minutesOffset * 60_000;
}

function lineupState(matchId, homeTeamId, awayTeamId, officialLineups, teams) {
  const official = officialLineups.fixtures?.find(fixture => fixture.matchId === matchId);
  if (official && [homeTeamId, awayTeamId].every(id => official.teams?.some(team => team.teamId === id && team.players?.length === 11))) return "OFFICIAL";
  const byId = new Map((teams.teams || []).map(team => [team.id, team]));
  const bothProbable = [homeTeamId, awayTeamId].every(id => {
    const team = byId.get(id);
    const lineup = team?.projectedLineup || (team?.probableLineup?.status === "probable" ? team.probableLineup : null);
    return lineup?.status === "probable" && lineup.players?.length === 11;
  });
  return bothProbable ? "PROBABLE" : "UNKNOWN";
}

function exactTeamGoalFeatures(teamId, matchday, matches, priorStandings) {
  const rows = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished" && match.matchday < matchday && match.score && (match.homeTeam === teamId || match.awayTeam === teamId));
  const goalsFor = rows.map(match => match.homeTeam === teamId ? match.score.home : match.score.away);
  const goalsAgainst = rows.map(match => match.homeTeam === teamId ? match.score.away : match.score.home);
  const xgFor = rows.map(match => match.teamStats?.[match.homeTeam === teamId ? "home" : "away"]?.expectedGoals).filter(numeric);
  const xgAgainst = rows.map(match => match.teamStats?.[match.homeTeam === teamId ? "away" : "home"]?.expectedGoals).filter(numeric);
  const totalGoals = rows.map(match => match.score.home + match.score.away);
  const sum = values => values.reduce((total, value) => total + value, 0);
  const prior = (priorStandings.rows || []).find(row => row.team === teamId || row.teamId === teamId);
  return {
    matchesUsed: rows.map(match => match.id),
    currentSeasonMatches: rows.length,
    seasonGoalsScoredPerMatch: rows.length ? round(sum(goalsFor) / rows.length) : null,
    seasonGoalsConcededPerMatch: rows.length ? round(sum(goalsAgainst) / rows.length) : null,
    historicalPriorGoalsScoredPerMatch: numeric(prior?.goalsForPerMatch) ? prior.goalsForPerMatch : numeric(prior?.goalsFor) && numeric(prior?.played) && prior.played ? round(prior.goalsFor / prior.played) : null,
    historicalPriorGoalsConcededPerMatch: numeric(prior?.goalsAgainstPerMatch) ? prior.goalsAgainstPerMatch : numeric(prior?.goalsAgainst) && numeric(prior?.played) && prior.played ? round(prior.goalsAgainst / prior.played) : null,
    currentXGF: xgFor.length ? round(sum(xgFor) / xgFor.length) : null,
    currentXGA: xgAgainst.length ? round(sum(xgAgainst) / xgAgainst.length) : null,
    finishingResidualGoalsMinusXG: xgFor.length && xgFor.length === rows.length ? round(sum(goalsFor) / rows.length - sum(xgFor) / rows.length) : null,
    goalkeeperPreventionEvidence: null,
    cleanSheetRate: rows.length ? round(goalsAgainst.filter(goals => goals === 0).length / rows.length) : null,
    failedToScoreRate: rows.length ? round(goalsFor.filter(goals => goals === 0).length / rows.length) : null,
    bttsRate: rows.length ? round(rows.filter(match => match.score.home > 0 && match.score.away > 0).length / rows.length) : null,
    overUnderGoalRates: rows.length ? { over15: round(totalGoals.filter(total => total >= 2).length / rows.length), over25: round(totalGoals.filter(total => total >= 3).length / rows.length), over35: round(totalGoals.filter(total => total >= 4).length / rows.length), under15: round(totalGoals.filter(total => total < 2).length / rows.length), under25: round(totalGoals.filter(total => total < 3).length / rows.length), under35: round(totalGoals.filter(total => total < 4).length / rows.length) } : null
  };
}

function playerSnapshot(player, opponent) {
  const base = {
    playerId: player.playerId ?? null,
    player: player.name || player.lineupName || N_D,
    team: player.teamId || player.team || N_D,
    opponent,
    role: player.role ?? N_D,
    detailedRole: player.detailedRole ?? N_D,
    teamProfileRole: player.teamProfileRole ?? N_D,
    expectedStarter: true,
    expectedMinutes: player.expectedMinutes ?? null,
    predictedShots: player.projectedShots ?? null,
    predictedSOT: player.projectedShotsOnTarget ?? null,
    probabilities: {
      shots1Plus: player.shotProbabilities?.over05 ?? null,
      shots2Plus: player.shotProbabilities?.over15 ?? null,
      shots3Plus: player.shotProbabilities?.over25 ?? null,
      shots4Plus: player.shotProbabilities?.over35 ?? null,
      sot1Plus: player.shotOnTargetProbabilities?.over05 ?? null,
      sot2Plus: player.shotOnTargetProbabilities?.over15 ?? null
    },
    tier: player.qualifiedOutsider || player.qualifiedSotOutsider ? "OUTSIDER" : player.allocationClass === "primary" ? "PRIMARY" : player.allocationClass === "co-primary" ? "SECOND PRIMARY" : player.allocationClass ? "SECONDARY" : N_D,
    classification: { allocationClass: player.allocationClass ?? null, primary: player.allocationClass === "primary" || player.allocationClass === "co-primary", secondary: Boolean(player.allocationClass && !["primary", "co-primary"].includes(player.allocationClass)) },
    outsiderStatus: { shots: Boolean(player.qualifiedOutsider), sot: Boolean(player.qualifiedSotOutsider) },
    matchupFactor: player.matchupFactor ?? null,
    opponentInteraction: player.opponentInteractionApplied ?? null,
    maturity: player.playerBaselineStability?.maturity ?? player.playerBaselineStability?.level ?? N_D,
    historicalWeight: null,
    currentWeight: null,
    persistence: player.playerBaselineStability?.historicalCurrentAgreement ?? null,
    stability: player.playerBaselineStability?.level ?? N_D,
    fallbackUsed: player.fallbackUsed ?? null,
    modelConfidence: N_D,
    confidenceAvailability: "not-calculated-by-production-engine",
    baselineConfidence: player.playerBaselineStability?.confidence ?? N_D,
    componentTrace: {
      individualBaselineShots90: player.stabilizedShots90 ?? player.baselineShots90 ?? null,
      individualBaselineSOT90: player.stabilizedShotsOnTarget90 ?? player.baselineShotsOnTarget90 ?? null,
      teamScalingShots: player.projectedShotsTeamScaling ?? player.teamScaling ?? null,
      teamScalingSOT: player.projectedShotsOnTargetTeamScaling ?? null,
      expectedMinutesFactor: player.minutesFactor ?? null,
      matchupFactorShots: player.shotsMatchupFactor ?? null,
      matchupFactorSOT: player.shotsOnTargetMatchupFactor ?? null,
      opponentInteractionFactor: null,
      reconciliationFactorShots: player.projectedShotsTeamScaling ?? null,
      reconciliationFactorSOT: player.projectedShotsOnTargetTeamScaling ?? null,
      baseShotsBeforeFinalAllocation: player.projectedShotsV2Base ?? null,
      finalShotsAfterAllocation: player.projectedShots ?? null,
      baseSOTBeforeFinalAllocation: player.projectedShotsOnTargetV2Base ?? null,
      finalSOTAfterAllocation: player.projectedShotsOnTarget ?? null
    },
    counterfactualTrace: { noMatchupExact: false, noOpponentInteractionExact: false, reason: "Serialized production output does not expose post-reconciliation component-neutral player allocations." }
  };
  return base;
}

function makeSnapshot({ prediction, match, generatedAt, officialLineups, teams, matches, priorStandings }) {
  const modelVersion = `player-market-v${prediction.playerMarketModelVersion}`;
  const id = `${match.competition}-${match.season}-md${String(match.matchday).padStart(2, "0")}-${match.id}-${modelVersion}`;
  const projections = new Map((prediction.teamProjections || []).map(team => [team.teamId, team]));
  const lineups = lineupState(match.id, match.homeTeam, match.awayTeam, officialLineups, teams);
  const firstMatchdayKickoff = matches.filter(candidate => candidate.competition === match.competition && candidate.season === match.season && candidate.matchday === match.matchday).map(toKickoffUtc).filter(Number.isFinite).sort((a, b) => a - b)[0] ?? toKickoffUtc(match);
  const sides = [
    { key: "home", teamId: match.homeTeam, opponentId: match.awayTeam },
    { key: "away", teamId: match.awayTeam, opponentId: match.homeTeam }
  ];
  const asOf = prediction.futureDataDiagnostics?.dataCutoff;
  const snapshot = {
    snapshotId: id,
    season: match.season,
    competition: match.competition,
    matchId: match.id,
    matchday: match.matchday,
    kickoff: { date: match.date, time: match.kickoff || null, timezone: match.timezone || "Europe/Rome" },
    generatedAt,
    dataCutoff: { mode: "asOfMatchday", matchdayExclusive: asOf?.matchdayExclusive ?? match.matchday, targetMatchIdExcluded: asOf?.targetMatchIdExcluded ?? match.id, completedOnly: asOf?.completedOnly ?? true, effectiveDateExclusive: Number.isFinite(firstMatchdayKickoff) ? new Date(firstMatchdayKickoff).toISOString() : match.date },
    engineVersion: prediction.engineVersion,
    modelVersion,
    profileVersion: prediction.teamMatchupProfileVersion ?? prediction.futureDataDiagnostics?.profileSnapshotSchemaVersion ?? null,
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
    lineupState: lineups,
    prediction: {
      expectedGoals: prediction.expectedGoals ?? null,
      probabilities: prediction.probabilities ?? null,
      scoreForecast: prediction.scoreForecast ?? null,
      teamProjections: sides.map(side => {
        const team = projections.get(side.teamId) || {};
        const asOfTeam = prediction.futureDataDiagnostics?.[side.key] || {};
        const opp = projections.get(side.opponentId) || {};
        return {
          teamId: side.teamId,
          opponent: side.opponentId,
          venue: side.key,
          predictedTeamShots: team.shotsTotal?.central ?? null,
          predictedTeamSOT: team.shotsOnTarget?.central ?? null,
          teamBaselineShots: team.shotsTotal?.inputs ?? null,
          teamBaselineSOT: team.shotsOnTarget?.inputs ?? null,
          finalTeamTargetShots: team.shotsTotal?.central ?? null,
          finalTeamTargetSOT: team.shotsOnTarget?.central ?? null,
          maturity: asOfTeam.sampleMaturity ?? null,
          teamProfileStatus: asOfTeam.teamProfileConfidence ?? N_D,
          ownOffensiveSignal: team.ownOffensiveInteraction ?? null,
          opponentVulnerabilitySignal: opp.opponentMatchupInteraction ?? null,
          teamConfidence: asOfTeam.teamProfileConfidence ?? null,
          teamExpectedGoalsExisting: team.expectedGoals ?? null,
          outcomeInputs: {
            teamShotsBaseline: team.shotsTotal?.inputs ?? null,
            predictedTeamShots: team.shotsTotal?.central ?? null,
            teamSOTBaseline: team.shotsOnTarget?.inputs ?? null,
            predictedTeamSOT: team.shotsOnTarget?.central ?? null,
            offensiveXGBaseline: prediction.expectedGoals?.components?.xg?.[side.key === "home" ? "homeRaw" : "awayRaw"] ?? null,
            opponentXGABaseline: exactTeamGoalFeatures(side.opponentId, match.matchday, matches, priorStandings).currentXGA,
            chanceQualityPerShot: null,
            possessionExpectation: null,
            homeAwayState: side.key,
            offensiveMaturity: asOfTeam.sampleMaturity ?? null,
            opponentDefensiveMaturity: prediction.futureDataDiagnostics?.[side.key === "home" ? "away" : "home"]?.sampleMaturity ?? null,
            shotSuppressionSignal: opp.opponentMatchupInteraction?.metricEvidence?.shots ?? null,
            sotSuppressionSignal: opp.opponentMatchupInteraction?.metricEvidence?.shotsOnTarget ?? null,
            chanceQualitySignal: null,
            existingTeamExpectedGoals: team.expectedGoals ?? null
          },
          goalFeatures: exactTeamGoalFeatures(side.teamId, match.matchday, matches, priorStandings)
        };
      }),
      players: (prediction.shooters?.allPlayers || []).map(player => playerSnapshot(player, player.teamId === match.homeTeam ? match.awayTeam : match.homeTeam)),
      traceAvailability: { modelConfidence: "N/D: field absent in production model", noMatchupExact: false, noOpponentInteractionExact: false }
    },
    warnings: []
  };
  if (snapshot.dataCutoff.matchdayExclusive !== match.matchday || snapshot.dataCutoff.targetMatchIdExcluded !== match.id || snapshot.dataCutoff.completedOnly !== true) snapshot.warnings.push("SNAPSHOT BLOCKER: production as-of cutoff does not prove target/future exclusion.");
  if (lineups === "UNKNOWN") snapshot.warnings.push("Lineup state unknown; no complete probable or official XI could be identified.");
  if (snapshot.prediction.players.some(player => player.playerId == null)) snapshot.warnings.push("One or more projected player identities are unresolved.");
  snapshot.integrity = { sha256: canonicalMatchHash(snapshot), algorithm: "SHA-256", scope: "snapshot payload excluding integrity metadata" };
  return snapshot;
}

function validateSnapshot(snapshot) {
  const failures = [];
  if (!snapshot.matchId || !snapshot.snapshotId) failures.push("missing canonical identity");
  if (snapshot.snapshotSchemaVersion !== SNAPSHOT_SCHEMA_VERSION) failures.push("unsupported schema version");
  if (!snapshot.engineVersion || !snapshot.modelVersion) failures.push("missing engine/model version");
  if (snapshot.dataCutoff?.matchdayExclusive !== snapshot.matchday || snapshot.dataCutoff?.targetMatchIdExcluded !== snapshot.matchId || snapshot.dataCutoff?.completedOnly !== true) failures.push("as-of cutoff does not exclude the target");
  if (snapshot.integrity?.sha256 !== canonicalMatchHash(snapshot)) failures.push("hash mismatch");
  if (!Array.isArray(snapshot.prediction?.players)) failures.push("missing player predictions");
  if (!["OFFICIAL", "PROBABLE", "UNKNOWN"].includes(snapshot.lineupState)) failures.push("invalid lineup state");
  const playerKeys = (snapshot.prediction?.players || []).map(player => `${player.team}:${player.playerId || normalizeName(player.player)}`);
  if (new Set(playerKeys).size !== playerKeys.length) failures.push("duplicate projected player identity within match");
  const teamIds = (snapshot.prediction?.teamProjections || []).map(team => team.teamId);
  if (teamIds.length !== 2 || new Set(teamIds).size !== 2) failures.push("team projection identities are incomplete or duplicated");
  if ((snapshot.prediction?.teamProjections || []).some(team => !team.opponent || team.opponent === team.teamId)) failures.push("unresolved or self-opponent team projection");
  return failures;
}

function actualForSnapshot(snapshot, match) {
  if (!match || match.id !== snapshot.matchId) throw new Error(`CANONICAL_MATCH_ID_MISMATCH: ${snapshot.matchId}`);
  const awarded = Boolean(match.resultCoverage?.awarded || match.status === "awarded");
  const abandonedButAwarded = match.status === "abandoned" && awarded && match.score;
  if ((!['finished', 'awarded'].includes(match.status) && !abandonedButAwarded) || !match.score || !numeric(match.score.home) || !numeric(match.score.away)) return null;
  const players = [];
  for (const side of ["home", "away"]) {
    const teamId = match[`${side}Team`];
    const rows = match.playerStats?.[side] || [];
    const notPlayed = match.didNotPlay?.[side] || [];
    for (const row of rows) players.push({ ...row, teamId, side });
    for (const row of notPlayed) players.push({ ...row, teamId, side, starter: false, minutes: 0, shots: 0, shotsOnTarget: 0, expectedGoals: 0, explicitDidNotPlay: true });
  }
  const homeStats = match.teamStats?.home || {}, awayStats = match.teamStats?.away || {};
  const homeFeatureTeam = snapshot.prediction.teamProjections.find(team => team.venue === "home");
  const awayFeatureTeam = snapshot.prediction.teamProjections.find(team => team.venue === "away");
  const exactFeatureSide = team => team ? { teamId: team.teamId, opponent: team.opponent, homeAway: team.venue, ...team.outcomeInputs, goalFeatures: team.goalFeatures, maturity: team.maturity } : null;
  return {
    snapshotId: snapshot.snapshotId,
    matchId: match.id,
    matchday: match.matchday,
    status: awarded ? "AWARDED" : "FINISHED",
    sportingEvaluationEligible: !awarded && !abandonedButAwarded,
    actual: {
      homeGoals: match.score.home,
      awayGoals: match.score.away,
      result: match.score.home > match.score.away ? "1" : match.score.home < match.score.away ? "2" : "X",
      homeShots: homeStats.shots ?? null,
      awayShots: awayStats.shots ?? null,
      homeSOT: homeStats.shotsOnTarget ?? null,
      awaySOT: awayStats.shotsOnTarget ?? null,
      homeXG: homeStats.expectedGoals ?? null,
      awayXG: awayStats.expectedGoals ?? null,
      players
    },
    exactScoreFeatures: {
      snapshotId: snapshot.snapshotId,
      matchId: match.id,
      matchday: match.matchday,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      X_home: exactFeatureSide(homeFeatureTeam),
      X_away: exactFeatureSide(awayFeatureTeam),
      dataCutoff: snapshot.dataCutoff,
      actualHomeGoals: match.score.home,
      actualAwayGoals: match.score.away
    }
  };
}

function continuous(rows, predicted, actual) {
  const valid = rows.filter(row => numeric(row[predicted]) && numeric(row[actual]));
  const errors = valid.map(row => row[predicted] - row[actual]);
  return { n: valid.length, predictedMean: valid.length ? round(valid.reduce((sum, row) => sum + row[predicted], 0) / valid.length) : null, actualMean: valid.length ? round(valid.reduce((sum, row) => sum + row[actual], 0) / valid.length) : null, mae: valid.length ? round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / valid.length) : null, rmse: valid.length ? round(Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / valid.length)) : null, bias: valid.length ? round(errors.reduce((sum, error) => sum + error, 0) / valid.length) : null };
}

function marketMetrics(rows, probability, actual, threshold) {
  const valid = rows.filter(row => numeric(row[probability]) && numeric(row[actual]));
  if (!valid.length) return { n: 0, brier: null, logLoss: null, ece: null };
  const pairs = valid.map(row => ({ p: Math.max(0, Math.min(1, row[probability])), y: Number(row[actual] >= threshold) }));
  const epsilon = 1e-15;
  const bins = Array.from({ length: 10 }, (_, index) => pairs.filter(pair => pair.p >= index / 10 && (index === 9 ? pair.p <= (index + 1) / 10 : pair.p < (index + 1) / 10))).filter(bin => bin.length);
  const ece = bins.reduce((sum, bin) => sum + bin.length / pairs.length * Math.abs(bin.reduce((total, item) => total + item.p - item.y, 0) / bin.length), 0);
  return { n: pairs.length, eventRate: round(pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length), meanProbability: round(pairs.reduce((sum, pair) => sum + pair.p, 0) / pairs.length), brier: round(pairs.reduce((sum, pair) => sum + (pair.p - pair.y) ** 2, 0) / pairs.length), logLoss: round(pairs.reduce((sum, pair) => sum - (pair.y * Math.log(Math.max(epsilon, pair.p)) + (1 - pair.y) * Math.log(Math.max(epsilon, 1 - pair.p))), 0) / pairs.length), ece: round(ece) };
}

module.exports = { SNAPSHOT_SCHEMA_VERSION, N_D, numeric, normalizeName, stableStringify, sha256, canonicalMatchHash, toKickoffUtc, makeSnapshot, validateSnapshot, actualForSnapshot, continuous, marketMetrics };
