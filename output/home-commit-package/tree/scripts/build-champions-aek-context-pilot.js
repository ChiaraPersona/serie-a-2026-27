"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { scaleShotProjections } = require("./champions/player-volume-utils");
const {
  ROLE_PRIORS,
  CURRENT_RELIABILITY_K,
  CURRENT_RELIABILITY_CAP,
  OPPONENT_SAMPLE_K,
  TRANSFER_REGRESSION,
  TRANSFER_FACTOR_MIN,
  TRANSFER_FACTOR_MAX,
  aggregateEntries,
  buildStandings,
  deriveLeagueStrengthFallback,
  neutralStrength,
  opponentStrength,
  transferFactor,
  blendRates,
  round
} = require("./champions/context-adjusted-player-baseline");

const root = path.resolve(__dirname, "..");
const controlPath = path.join(root, "data/analysis/champions/aek-context-control-2026-10-04.json");
const outputPath = path.join(root, "data/analysis/champions/aek-context-adjusted-md02-2026-10-04.json");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ı/g, "i").replace(/æ/g, "ae").replace(/ø/g, "o").replace(/đ/g, "d").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();
const mean = values => {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
};
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function scoreboardFor(leagueCode, asOf) {
  const directory = path.join(root, "data/raw/champions-pilot/espn/scoreboards/2026-27", leagueCode);
  const candidates = fs.readdirSync(directory).filter(file => file.endsWith(`as-of-${asOf}.json.gz`)).sort();
  if (!candidates.length) throw new Error(`${leagueCode}: scoreboard as-of ${asOf} mancante`);
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory, candidates.at(-1)))).toString("utf8"));
  return { file: path.relative(root, path.join(directory, candidates.at(-1))), raw };
}

function currentEvidence(player) {
  const entries = player?.currentSeason?.entries || [];
  return {
    domestic: aggregateEntries(entries.filter(entry => entry.competitionType === "domestic-league")),
    champions: aggregateEntries(entries.filter(entry => entry.competition === "UEFA Champions League")),
    otherEuropean: aggregateEntries(entries.filter(entry => entry.competitionType === "uefa-competition" && entry.competition !== "UEFA Champions League"))
  };
}

function main() {
  const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
  const current = read("data/normalized/champions-player-stats-2026-27.json");
  const historical = read("data/normalized/champions-player-stats-2025-26.json");
  const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
  const strength = read("data/normalized/champions-team-strength-2026-27.json");
  const asOf = current.asOf;
  if (!asOf || asOf >= control.fixture.date) throw new Error(`As-of non pre-match: ${asOf}`);
  const currentTeam = current.teams.find(team => team.id === "aek-athens");
  const historicalTeam = historical.teams.find(team => team.team === "AEK Athens");
  const teamConfig = source.teams.find(team => team.id === "aek-athens");
  if (!currentTeam || !historicalTeam || !teamConfig) throw new Error("Dataset AEK incompleti");
  if (sha256(path.join(root, "data/normalized/champions-player-stats-2025-26.json")) !== control.protectedInputs.historicalDatasetSha256) throw new Error("Baseline 2025/26 diversa dal CONTROL");

  const scoreboard = scoreboardFor(teamConfig.league, asOf);
  const standings = buildStandings(scoreboard.raw.payload?.events || [], { from: current.dateInterval.from, asOf });
  const leagueFallback = deriveLeagueStrengthFallback(teamConfig.league, source.teams, strength.teams);
  const neutralFallback = neutralStrength(strength.teams);
  const directStrengthByTeam = new Map(strength.teams.filter(team => Number.isFinite(team.europeanStrengthIndex)).map(team => [team.team, team.europeanStrengthIndex]));
  const sourceMatches = source.matches.filter(match => match.season === "2026-27" && match.date <= asOf && (match.home.providerTeamId === teamConfig.espnTeamId || match.away.providerTeamId === teamConfig.espnTeamId));
  if (sourceMatches.some(match => match.date > asOf)) throw new Error("Future leakage nei source match");
  const sourceMatchById = new Map(sourceMatches.map(match => [String(match.eventId), match]));
  const opponentByMatchId = new Map(sourceMatches.map(match => {
    const opponent = match.home.providerTeamId === teamConfig.espnTeamId ? match.away : match.home;
    return [String(match.eventId), { eventId: String(match.eventId), date: match.date, providerTeamId: opponent.providerTeamId, team: opponent.name }];
  }));

  const historicalById = new Map(historicalTeam.players.map(player => [player.id, player]));
  const currentById = new Map(currentTeam.players.map(player => [player.id, player]));
  const controlById = new Map(control.players.map(player => [player.playerId, player]));
  const ids = [...new Set([...currentById.keys(), ...controlById.keys()])];
  const players = ids.map(playerId => {
    const currentPlayer = currentById.get(playerId) || null;
    const historicalPlayer = historicalById.get(playerId) || null;
    const controlPlayer = controlById.get(playerId) || null;
    const role = currentPlayer?.position || historicalPlayer?.position || controlPlayer?.role || "midfielder";
    const rolePrior = ROLE_PRIORS[role] || ROLE_PRIORS.midfielder;
    const historicalTotals = historicalPlayer?.previousSeason?.totals || {};
    const evidence = currentEvidence(currentPlayer);
    const opponentsFaced = evidence.domestic.matchIds.map(matchId => opponentByMatchId.get(matchId)).filter(Boolean).map(opponent => ({
      ...opponent,
      ...opponentStrength({ opponent, standings, directStrengthByTeam, leagueFallback: leagueFallback.value, neutralFallback })
    }));
    const currentSampleOpponentStrength = mean(opponentsFaced.map(opponent => opponent.value));
    const fallbackUsed = evidence.domestic.minutes > 0 && currentSampleOpponentStrength === null;
    const transferStrength = currentSampleOpponentStrength ?? (evidence.domestic.minutes > 0 ? leagueFallback.value ?? neutralFallback : null);
    const strengthFactor = transferStrength === null ? null : transferFactor(transferStrength, neutralFallback);
    const historicalShots = Number.isFinite(historicalTotals.per90?.shots) ? historicalTotals.per90.shots : null;
    const historicalSot = Number.isFinite(historicalTotals.per90?.shotsOnTarget) ? historicalTotals.per90.shotsOnTarget : null;
    const shots = blendRates({
      historicalRaw: historicalShots,
      historicalMinutes: historicalTotals.minutes || 0,
      rolePrior: rolePrior.shots,
      domesticRaw: evidence.domestic.shotsPer90,
      domesticMinutes: evidence.domestic.minutes || 0,
      domesticStrengthFactor: strengthFactor ?? 1,
      europeanRaw: evidence.champions.shotsPer90,
      europeanMinutes: evidence.champions.minutes || 0
    });
    const sot = blendRates({
      historicalRaw: historicalSot,
      historicalMinutes: historicalTotals.minutes || 0,
      rolePrior: rolePrior.shotsOnTarget,
      domesticRaw: evidence.domestic.sotPer90,
      domesticMinutes: evidence.domestic.minutes || 0,
      domesticStrengthFactor: strengthFactor ?? 1,
      europeanRaw: evidence.champions.sotPer90,
      europeanMinutes: evidence.champions.minutes || 0
    });
    return {
      playerId,
      player: currentPlayer?.name || historicalPlayer?.name || controlPlayer?.player || playerId,
      lineupName: controlPlayer?.lineupName || null,
      identityStatus: controlPlayer?.identityStatus || (currentPlayer || historicalPlayer ? "matched-not-in-control-xi" : "unavailable"),
      role,
      historicalMinutes: historicalTotals.minutes ?? null,
      historicalShotsPer90: historicalShots,
      historicalSotPer90: historicalSot,
      historicalBaselineShotsPer90: shots.historicalBaseline,
      historicalBaselineSotPer90: sot.historicalBaseline,
      currentDomesticMinutes: evidence.domestic.minutes,
      rawCurrentShotsPer90: evidence.domestic.shotsPer90,
      rawCurrentSotPer90: evidence.domestic.sotPer90,
      currentEuropeanEvidence: evidence.champions.minutes > 0 ? evidence.champions : null,
      currentOtherEuropeanEvidence: evidence.otherEuropean.minutes > 0 ? evidence.otherEuropean : null,
      opponentsFaced,
      currentSampleOpponentStrength,
      competitionStrengthFallback: { value: leagueFallback.value, used: fallbackUsed, contributors: leagueFallback.contributors },
      neutralChampionsReferenceStrength: neutralFallback,
      strengthAdjustmentShots: strengthFactor,
      strengthAdjustmentSot: strengthFactor,
      adjustedCurrentShotsPer90: shots.adjustedDomestic,
      adjustedCurrentSotPer90: sot.adjustedDomestic,
      currentReliabilityWeight: shots.currentReliabilityWeight,
      currentEuropeanReliabilityWeight: shots.currentEuropeanReliabilityWeight,
      historicalWeight: shots.historicalWeight,
      blendedShotsPer90: shots.blended,
      blendedSotPer90: sot.blended,
      expectedMinutes: controlPlayer?.expectedMinutes || 0,
      oldProjectedShots: controlPlayer?.projectedShots || 0,
      oldProjectedSot: controlPlayer?.projectedSot || 0,
      per90: { shots: shots.blended, shotsOnTarget: sot.blended },
      roleKey: role
    };
  });

  const shotsScaled = scaleShotProjections(players, "shots", control.expectedTeamShots);
  const sotScaled = scaleShotProjections(players, "shotsOnTarget", control.expectedTeamSot);
  const shotsById = new Map(shotsScaled.map(item => [item.player.playerId, item]));
  const sotById = new Map(sotScaled.map(item => [item.player.playerId, item]));
  const projectedPlayers = players.map(player => ({
    ...player,
    projectedShots: player.role === "goalkeeper" || !(player.expectedMinutes > 0) ? 0 : shotsById.get(player.playerId)?.projection ?? 0,
    projectedSot: player.role === "goalkeeper" || !(player.expectedMinutes > 0) ? 0 : sotById.get(player.playerId)?.projection ?? 0,
    reconciliationFactorShots: shotsById.get(player.playerId)?.reconciliationFactor ?? null,
    reconciliationFactorSot: sotById.get(player.playerId)?.reconciliationFactor ?? null
  })).map(player => ({
    ...player,
    deltaShots: round(player.projectedShots - player.oldProjectedShots, 2),
    deltaSot: round(player.projectedSot - player.oldProjectedSot, 2)
  }));

  const sum = (field, rows = projectedPlayers) => round(rows.reduce((total, player) => total + (Number(player[field]) || 0), 0), 2);
  const teamSampleOpponents = sourceMatches.map(match => {
    const opponent = opponentByMatchId.get(String(match.eventId));
    return { ...opponent, ...opponentStrength({ opponent, standings, directStrengthByTeam, leagueFallback: leagueFallback.value, neutralFallback }) };
  });
  const individualEvidenceOpponents = [...new Map(projectedPlayers.flatMap(player => player.opponentsFaced).map(opponent => [opponent.eventId, opponent])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const output = {
    schemaVersion: 1,
    status: "aek-only-context-adjusted-player-baseline-pilot",
    generatedAt: new Date().toISOString(),
    asOf,
    fixture: control.fixture,
    control: { path: path.relative(root, controlPath), sha256: sha256(controlPath), lineup: control.lineupControl },
    strengthSystem: {
      dataset: "data/normalized/champions-team-strength-2026-27.json",
      metric: "europeanStrengthIndex",
      range: [0, 100],
      neutralChampionsReferenceStrength: round(neutralFallback),
      leagueStrengthFallback: { league: teamConfig.league, value: round(leagueFallback.value), contributors: leagueFallback.contributors },
      opponentSampleK: OPPONENT_SAMPLE_K,
      precedence: ["opponent-specific europeanStrengthIndex", "opponent domestic PPG shrinkato e ancorato al fallback di lega", "derived league fallback", "neutral Champions reference"]
    },
    methodology: {
      reliability: `current minutes / (current minutes + ${CURRENT_RELIABILITY_K}), cap ${CURRENT_RELIABILITY_CAP}`,
      pastContextNormalization: `factor = clamp(1 + (sampleStrength / neutralChampionsStrength - 1) * ${TRANSFER_REGRESSION}, ${TRANSFER_FACTOR_MIN}, ${TRANSFER_FACTOR_MAX})`,
      blending: "historical/role prior + strength-adjusted domestic evidence; current European evidence remains a separate sample-aware channel",
      futureMatchupAdjustment: "Not applied in the individual baseline. Shakhtar matchup is already embedded only in the frozen team projections from the CONTROL.",
      expectedMinutes: "Frozen from CONTROL; current-season average minutes do not update expected playing time.",
      reconciliation: "Shared scaleShotProjections helper; separate shots and SOT allocation against frozen team totals."
    },
    strengthOfSchedule: {
      scoreboard: scoreboard.file,
      includedLeagueMatches: standings.included.length,
      excludedFutureEvents: (scoreboard.raw.payload?.events || []).filter(event => event.date?.slice(0, 10) > asOf).length,
      leagueAveragePointsPerMatch: round(standings.leagueAveragePointsPerMatch),
      teamSampleOpponents,
      individualEvidenceOpponents,
      excludedFromIndividualEvidence: teamSampleOpponents.filter(opponent => !individualEvidenceOpponents.some(item => item.eventId === opponent.eventId)).map(opponent => ({ eventId: opponent.eventId, date: opponent.date, team: opponent.team, reason: "player statistics unavailable/placeholder" })),
      averageOpponentStrength: round(mean(individualEvidenceOpponents.map(opponent => opponent.value)))
    },
    teamInvariant: {
      expectedTeamShotsBefore: control.expectedTeamShots,
      expectedTeamShotsAfter: control.expectedTeamShots,
      expectedTeamSotBefore: control.expectedTeamSot,
      expectedTeamSotAfter: control.expectedTeamSot,
      shotsInvariant: true,
      sotInvariant: true
    },
    reconciliation: {
      sumProjectedPlayerShotsBefore: control.reconciliation.sumProjectedShots,
      sumProjectedPlayerShotsAfter: sum("projectedShots"),
      sumProjectedPlayerSotBefore: control.reconciliation.sumProjectedSot,
      sumProjectedPlayerSotAfter: sum("projectedSot"),
      targetTeamShots: control.expectedTeamShots,
      targetTeamSot: control.expectedTeamSot
    },
    coverage: {
      registeredPlayers: currentTeam.players.length,
      playersWithCurrentDomesticMinutes: projectedPlayers.filter(player => player.currentDomesticMinutes > 0).length,
      playersWithCurrentEuropeanMinutes: projectedPlayers.filter(player => player.currentEuropeanEvidence?.minutes > 0).length,
      playersWithCurrentOtherEuropeanMinutes: projectedPlayers.filter(player => player.currentOtherEuropeanEvidence?.minutes > 0).length,
      controlStarters: control.players.length,
      identityAnomalies: projectedPlayers.filter(player => !player.identityStatus.startsWith("matched")).map(player => ({ player: player.player, status: player.identityStatus }))
    },
    players: projectedPlayers
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`AEK context pilot: ${output.coverage.playersWithCurrentDomesticMinutes} current · team shots ${output.teamInvariant.expectedTeamShotsAfter} · SOT ${output.teamInvariant.expectedTeamSotAfter}`);
}

main();
