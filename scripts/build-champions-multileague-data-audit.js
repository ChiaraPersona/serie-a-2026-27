"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256File = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const sha256Json = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const batchIds = ["arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
const asOf = "2026-10-09";
const from = "2026-07-01";
const expectedAekHash = "f2f3deb29a908c2637510dbfecf2d754ff2ebe1086ef16bae0da1d545ef9d308";
const expectedAekSourceMatchesHash = "207c225e9b37d95be6134de09e880e767823048c62c572a2268da418d0d04a94";

const data = read("data/normalized/champions-player-stats-2026-27.json");
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const configById = new Map(source.teams.map(team => [team.id, team]));
const espn = builder.collectEspnRows({ season: "2026-27", asOf });
const sum = values => values.length && values.every(Number.isFinite) ? values.reduce((total, value) => total + value, 0) : null;

function teamAudit(team) {
  const config = configById.get(team.id);
  if (!config) throw new Error(`${team.id}: configurazione mancante`);
  const matches = source.matches.filter(match => match.season === "2026-27" && match.date >= from && match.date <= asOf && (match.home.providerTeamId === config.espnTeamId || match.away.providerTeamId === config.espnTeamId));
  const side = match => match.home.providerTeamId === config.espnTeamId ? match.home : match.away;
  const teamTotal = metric => sum(matches.map(match => side(match).statistics[metric]));
  const currentTeamEntries = team.players.flatMap(player => player.currentSeason?.entries || [])
    .filter(entry => entry.teamId === config.espnTeamId && entry.competitionType === "domestic-league");
  const playerTotal = metric => {
    const values = currentTeamEntries.map(entry => entry[metric]).filter(value => value !== null && value !== undefined);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const registeredProviderIds = new Set(team.players.map(player => player.providerPlayerId).filter(Boolean));
  const rawContributors = new Map();
  for (const [providerPlayerId, rows] of espn.matchesByAthlete) {
    for (const row of rows.filter(item => item.teamId === config.espnTeamId && item.league === config.league)) {
      const current = rawContributors.get(providerPlayerId) || { providerPlayerId, player: row.name, appearances: 0, shots: 0, shotsOnTarget: 0 };
      current.appearances += 1;
      current.shots += Number.isFinite(row.stats.totalShots) ? row.stats.totalShots : 0;
      current.shotsOnTarget += Number.isFinite(row.stats.shotsOnTarget) ? row.stats.shotsOnTarget : 0;
      rawContributors.set(providerPlayerId, current);
    }
  }
  const outsideRegisteredSquad = [...rawContributors.values()].filter(player => !registeredProviderIds.has(player.providerPlayerId));
  const metricCoverage = metric => ({
    players: team.players.filter(player => player.currentSeason?.totals?.[metric] !== null && player.currentSeason?.totals?.[metric] !== undefined).length,
    registeredPlayers: team.players.length
  });
  const transfers = team.players.flatMap(player => {
    const otherEntries = (player.currentSeason?.entries || []).filter(entry => entry.teamId !== config.espnTeamId);
    return otherEntries.length ? [{
      player: player.name,
      providerPlayerId: player.providerPlayerId,
      evidence: otherEntries.map(entry => ({ teamId: entry.teamId, team: entry.team, competition: entry.competition, appearances: entry.appearances }))
    }] : [];
  });
  const primaryPlayers = team.players.filter(player => player.currentSeason)
    .sort((left, right) => (right.currentSeason.totals.minutes || 0) - (left.currentSeason.totals.minutes || 0))
    .slice(0, 10)
    .map(player => ({
      player: player.name,
      providerPlayerId: player.providerPlayerId,
      appearances: player.currentSeason.totals.appearances,
      starts: player.currentSeason.totals.starts,
      minutes: player.currentSeason.totals.minutes,
      shots: player.currentSeason.totals.shots,
      shotsOnTarget: player.currentSeason.totals.shotsOnTarget,
      dataQuality: player.dataQuality,
      competitions: player.currentSeason.entries.map(entry => ({ teamId: entry.teamId, team: entry.team, competition: entry.competition, competitionType: entry.competitionType }))
    }));
  const teamShots = teamTotal("totalShots"), playerShots = playerTotal("shots");
  const teamSot = teamTotal("shotsOnTarget"), playerSot = playerTotal("shotsOnTarget");
  return {
    team: team.team,
    teamId: team.id,
    providerTeamId: config.espnTeamId,
    league: config.leagueName,
    asOf: data.teamSnapshots[team.id]?.asOf || team.asOf || data.asOf,
    matches: matches.length,
    players: team.players.length,
    coverage: {
      completeMatches: matches.filter(match => match.coverage === "complete").length,
      partialMatches: matches.filter(match => match.coverage === "partial").map(match => ({ eventId: match.eventId, date: match.date, missing: match.missing })),
      matchesWithoutSummary: team.coverage.matchesWithoutPlayerStats,
      minutes: metricCoverage("minutes"),
      shots: metricCoverage("shots"),
      shotsOnTarget: metricCoverage("shotsOnTarget")
    },
    reconciliation: {
      teamShots,
      registeredPlayerShots: playerShots,
      shotsDifference: playerShots === null || teamShots === null ? null : playerShots - teamShots,
      teamShotsOnTarget: teamSot,
      registeredPlayerShotsOnTarget: playerSot,
      shotsOnTargetDifference: playerSot === null || teamSot === null ? null : playerSot - teamSot,
      outsideRegisteredSquad,
      status: playerShots === teamShots && playerSot === teamSot ? "exact" : "explained_registered_squad_gap"
    },
    identities: {
      unresolved: team.players.filter(player => player.providerPlayerId === null).map(player => ({ player: player.name, reason: player.unmatchedReason })),
      withoutAppearances: team.players.filter(player => !player.currentSeason).map(player => ({ player: player.name, providerPlayerId: player.providerPlayerId, reason: player.unmatchedReason })),
      transfers
    },
    competitionSeparation: [...new Set(team.players.flatMap(player => player.currentSeason?.entries || []).map(entry => `${entry.competitionType}|${entry.competition}|${entry.teamId}`))].sort(),
    primaryPlayers,
    status: matches.length > 0 && matches.every(match => match.coverage === "complete") && team.summary.withMinutes >= 11 ? "usable" : "partial"
  };
}

const aek = data.teams.find(team => team.id === "aek-athens");
const aekSourceMatches = source.matches.filter(match => match.season === "2026-27" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887"));
const teams = batchIds.map(id => data.teams.find(team => team.id === id));
if (teams.some(team => !team)) throw new Error("Batch incompleto nel dataset normalizzato");
const audits = teams.map(teamAudit);
const output = {
  schemaVersion: 1,
  status: audits.every(team => team.status === "usable") ? "pass" : "partial",
  asOf,
  dateInterval: { from, to: asOf },
  scope: { selectedTeams: batchIds, excludedTeams: ["aek-athens"], finalDatasetTeams: data.teams.map(team => team.id) },
  source: { provider: "ESPN", path: "data/sources/champions-pilot-match-stats-2025-27.json", lastImport: source.lastImport },
  aekInvariant: {
    asOf: data.teamSnapshots["aek-athens"].asOf,
    expectedTeamHash: expectedAekHash,
    actualTeamHash: sha256Json(aek),
    expectedSourceMatchesHash: expectedAekSourceMatchesHash,
    actualSourceMatchesHash: sha256Json(aekSourceMatches),
    preserved: sha256Json(aek) === expectedAekHash && sha256Json(aekSourceMatches) === expectedAekSourceMatchesHash,
    matches: aek.coverage.matches,
    players: aek.summary.players,
    withMinutes: aek.summary.withMinutes,
    complete: aek.summary.complete,
    partial: aek.summary.partial,
    unavailable: aek.summary.unavailable
  },
  protectedInputs: {
    historicalPlayerStatsSha256: sha256File("data/normalized/champions-player-stats-2025-26.json"),
    predictionBuilderSha256: sha256File("scripts/build-champions-pilot-predictions.js"),
    leagueStrengthSha256: sha256File("data/analysis/champions/league-strength-2026-10-03.json")
  },
  summary: {
    teams: audits.length,
    matches: audits.reduce((total, team) => total + team.matches, 0),
    registeredPlayers: audits.reduce((total, team) => total + team.players, 0),
    playersWithMinutes: audits.reduce((total, team) => total + team.coverage.minutes.players, 0),
    unresolvedIdentities: audits.reduce((total, team) => total + team.identities.unresolved.length, 0),
    partialMatches: audits.reduce((total, team) => total + team.coverage.partialMatches.length, 0),
    matchesWithoutSummary: audits.reduce((total, team) => total + team.coverage.matchesWithoutSummary.length, 0)
  },
  teams: audits,
  gate: audits.every(team => team.status === "usable") && sha256Json(aek) === expectedAekHash && sha256Json(aekSourceMatches) === expectedAekSourceMatchesHash
    ? "CHAMPIONS MULTILEAGUE DATA GATE = PASS"
    : "CHAMPIONS MULTILEAGUE DATA GATE = PARTIAL"
};

const outputPath = path.join(root, `data/analysis/champions/multileague-current-season-batch-${asOf}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`${output.gate} · ${output.summary.matches} gare · ${output.summary.playersWithMinutes}/${output.summary.registeredPlayers} giocatori con minuti`);
