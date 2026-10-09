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
const from = "2026-07-01";
const asOf = "2026-10-09";
const expected = {
  aekTeam: "f2f3deb29a908c2637510dbfecf2d754ff2ebe1086ef16bae0da1d545ef9d308",
  aekSourceMatches: "207c225e9b37d95be6134de09e880e767823048c62c572a2268da418d0d04a94",
  historicalPlayers: "4c09d7f109f9d5a3b769c153ed4c051cc7a99adb588a11f7c3a7cb3b348ef692",
  predictionBuilder: "135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5",
  leagueStrength: "82a4975c77509a1b49faa1b63ee84c08cade57cccd2edbf07625215644563d22"
};

const data = read("data/normalized/champions-player-stats-2026-27.json");
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const configById = new Map(source.teams.map(team => [team.id, team]));
const espn = builder.collectEspnRows({ season: "2026-27", asOf });

function strictSum(values) {
  return values.length && values.every(Number.isFinite) ? values.reduce((total, value) => total + value, 0) : null;
}

function metricReconciliation(teamValue, allPlayersValue, registeredPlayersValue) {
  const residual = Number.isFinite(teamValue) && Number.isFinite(allPlayersValue) ? teamValue - allPlayersValue : null;
  return {
    team: teamValue,
    allPlayers: allPlayersValue,
    registeredPlayers: registeredPlayersValue,
    residual,
    registeredGap: Number.isFinite(teamValue) && Number.isFinite(registeredPlayersValue) ? teamValue - registeredPlayersValue : null,
    status: residual === 0 ? "exact" : residual === null ? "not_comparable_missing_provider_value" : "provider_definition_gap"
  };
}

function auditTeam(team) {
  const config = configById.get(team.id);
  if (!config) throw new Error(`${team.id}: configurazione ESPN mancante`);
  const matches = source.matches
    .filter(match => match.season === "2026-27" && match.league === config.league && match.date >= from && match.date <= asOf)
    .filter(match => match.home.providerTeamId === config.espnTeamId || match.away.providerTeamId === config.espnTeamId)
    .sort((left, right) => left.date.localeCompare(right.date) || left.eventId.localeCompare(right.eventId));
  const matchIds = new Set(matches.map(match => match.eventId));
  const registeredByProviderId = new Map(team.players.filter(player => player.providerPlayerId).map(player => [player.providerPlayerId, player]));
  const observedByMatch = new Map(matches.map(match => [match.eventId, []]));
  for (const [providerPlayerId, rows] of espn.matchesByAthlete) {
    for (const row of rows) {
      if (row.teamId !== config.espnTeamId || row.league !== config.league || !matchIds.has(row.matchId)) continue;
      const registered = registeredByProviderId.get(providerPlayerId) || null;
      observedByMatch.get(row.matchId).push({
        observationId: `${team.id}:${row.matchId}:${providerPlayerId}`,
        providerPlayerId,
        player: row.name,
        classification: registered ? "registered_active" : "played_not_registered",
        registeredPlayerId: registered?.id || null,
        predictionCandidateEligible: Boolean(registered),
        exclusionReason: registered ? null : "not_in_registered_champions_squad",
        minutes: row.minutes,
        starter: Boolean(row.row.starter),
        substituteAppearance: Boolean(row.row.subbedIn),
        shots: row.stats.totalShots ?? null,
        shotsOnTarget: row.stats.shotsOnTarget ?? null,
        goals: row.stats.totalGoals ?? null,
        assists: row.stats.goalAssists ?? null,
        foulsCommitted: row.stats.foulsCommitted ?? null,
        foulsWon: row.stats.foulsSuffered ?? null,
        yellowCards: row.stats.yellowCards ?? null,
        redCards: row.stats.redCards ?? null,
        dataQuality: row.minutes === null || row.stats.totalShots == null || row.stats.shotsOnTarget == null ? "partial" : "complete",
        source: "ESPN",
        sourceUrl: row.sourceUrl,
        asOf
      });
    }
  }

  const matchEvidence = matches.map(match => {
    const side = match.home.providerTeamId === config.espnTeamId ? match.home : match.away;
    const opponent = match.home.providerTeamId === config.espnTeamId ? match.away : match.home;
    const players = observedByMatch.get(match.eventId)
      .sort((left, right) => (right.minutes ?? -1) - (left.minutes ?? -1) || left.player.localeCompare(right.player, "it"));
    const registeredPlayers = players.filter(player => player.classification === "registered_active");
    return {
      matchId: match.eventId,
      date: match.date,
      match: `${match.home.name} ${match.home.score}-${match.away.score} ${match.away.name}`,
      homeAway: side.homeAway,
      opponent: opponent.name,
      players,
      reconciliation: {
        shots: metricReconciliation(side.statistics.totalShots, strictSum(players.map(player => player.shots)), strictSum(registeredPlayers.map(player => player.shots))),
        shotsOnTarget: metricReconciliation(side.statistics.shotsOnTarget, strictSum(players.map(player => player.shotsOnTarget)), strictSum(registeredPlayers.map(player => player.shotsOnTarget)))
      },
      source: match.source
    };
  });

  const observations = matchEvidence.flatMap(match => match.players);
  const observedProviderIds = new Set(observations.map(player => player.providerPlayerId));
  const outsideById = new Map();
  for (const observation of observations.filter(player => player.classification === "played_not_registered")) {
    const current = outsideById.get(observation.providerPlayerId) || {
      providerPlayerId: observation.providerPlayerId,
      player: observation.player,
      classification: "played_not_registered",
      predictionCandidateEligible: false,
      exclusionReason: observation.exclusionReason,
      appearances: 0,
      minutes: 0,
      shots: 0,
      shotsOnTarget: 0,
      observationIds: []
    };
    current.appearances += 1;
    current.minutes = Number.isFinite(current.minutes) && Number.isFinite(observation.minutes) ? current.minutes + observation.minutes : null;
    current.shots = Number.isFinite(current.shots) && Number.isFinite(observation.shots) ? current.shots + observation.shots : null;
    current.shotsOnTarget = Number.isFinite(current.shotsOnTarget) && Number.isFinite(observation.shotsOnTarget) ? current.shotsOnTarget + observation.shotsOnTarget : null;
    current.observationIds.push(observation.observationId);
    outsideById.set(observation.providerPlayerId, current);
  }

  const registeredActive = team.players
    .filter(player => player.providerPlayerId && observedProviderIds.has(player.providerPlayerId))
    .map(player => ({ player: player.name, playerId: player.id, providerPlayerId: player.providerPlayerId, classification: "registered_active", predictionCandidateEligible: true }));
  const registeredNoAppearance = team.players
    .filter(player => player.providerPlayerId && !observedProviderIds.has(player.providerPlayerId))
    .map(player => {
      const otherClubEvidence = (player.currentSeason?.entries || [])
        .filter(entry => entry.teamId !== config.espnTeamId)
        .map(entry => ({ teamId: entry.teamId, team: entry.team, competition: entry.competition, appearances: entry.appearances }));
      return {
        player: player.name,
        playerId: player.id,
        providerPlayerId: player.providerPlayerId,
        identitySource: player.identitySource,
        classification: "registered_no_appearance",
        predictionCandidateEligible: true,
        evidenceStatus: otherClubEvidence.length ? "other_club_evidence_only" : "absent_from_observed_target_matches",
        otherClubEvidence
      };
    });
  const identityUnresolved = team.players
    .filter(player => player.providerPlayerId === null)
    .map(player => ({
      player: player.name,
      playerId: player.id,
      providerPlayerId: null,
      classification: "identity_unresolved",
      predictionCandidateEligible: true,
      exactCurrentNameCandidates: [...(espn.athletesByNormalizedName.get(builder.normalize(player.name)) || [])],
      status: "open",
      reason: "Nessun ESPN ID affidabile negli snapshot o nei riferimenti storici del repository"
    }));
  const resolvedFromHistorical = team.players
    .filter(player => player.identitySource === "historical-dataset-exact-team-name")
    .map(player => ({ player: player.name, playerId: player.id, providerPlayerId: player.providerPlayerId, status: "resolved", evidence: "2025/26 exact team+normalized-name provider ID" }));

  const uniqueObservedPlayers = new Set(observations.map(player => player.providerPlayerId));
  const observationIds = observations.map(player => player.observationId);
  return {
    team: team.team,
    teamId: team.id,
    providerTeamId: config.espnTeamId,
    league: config.leagueName,
    coverage: {
      matches: matches.length,
      registeredPlayers: team.players.length,
      registeredActive: registeredActive.length,
      playedPlayers: uniqueObservedPlayers.size,
      playedNotRegistered: outsideById.size,
      registeredNoAppearance: registeredNoAppearance.length,
      identityUnresolved: identityUnresolved.length,
      playerMatchObservations: observations.length,
      duplicateObservations: observationIds.length - new Set(observationIds).size
    },
    classifications: {
      registeredActive,
      playedNotRegistered: [...outsideById.values()].sort((left, right) => right.minutes - left.minutes || left.player.localeCompare(right.player, "it")),
      registeredNoAppearance,
      identityUnresolved
    },
    identityReview: { resolvedFromHistorical, unresolved: identityUnresolved },
    matches: matchEvidence
  };
}

const selectedTeams = batchIds.map(id => data.teams.find(team => team.id === id));
if (selectedTeams.some(team => !team)) throw new Error("Dataset AEK+6 incompleto");
const teams = selectedTeams.map(auditTeam);
const aek = data.teams.find(team => team.id === "aek-athens");
const aekSourceMatches = source.matches.filter(match => match.season === "2026-27" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887"));
const invariants = {
  aekTeam: { expected: expected.aekTeam, actual: sha256Json(aek) },
  aekSourceMatches: { expected: expected.aekSourceMatches, actual: sha256Json(aekSourceMatches) },
  historicalPlayers: { expected: expected.historicalPlayers, actual: sha256File("data/normalized/champions-player-stats-2025-26.json") },
  predictionBuilder: { expected: expected.predictionBuilder, actual: sha256File("scripts/build-champions-pilot-predictions.js") },
  leagueStrength: { expected: expected.leagueStrength, actual: sha256File("data/analysis/champions/league-strength-2026-10-03.json") }
};
for (const invariant of Object.values(invariants)) invariant.preserved = invariant.expected === invariant.actual;

const allMatches = teams.flatMap(team => team.matches);
const allObservations = allMatches.flatMap(match => match.players);
const allOutside = teams.flatMap(team => team.classifications.playedNotRegistered);
const allUnresolved = teams.flatMap(team => team.classifications.identityUnresolved);
const allExact = allMatches.every(match => match.reconciliation.shots.status === "exact" && match.reconciliation.shotsOnTarget.status === "exact");
const coveragePass = teams.every(team => team.coverage.matches > 0 && team.coverage.duplicateObservations === 0)
  && allObservations.every(player => player.providerPlayerId && player.source === "ESPN" && player.asOf === asOf)
  && allOutside.every(player => player.predictionCandidateEligible === false)
  && allUnresolved.every(player => player.providerPlayerId === null && player.status === "open");
const invariantsPass = Object.values(invariants).every(invariant => invariant.preserved);
const gate = coveragePass && allExact && invariantsPass ? "PASS" : coveragePass && invariantsPass ? "PARTIAL" : "FAIL";

const output = {
  schemaVersion: 1,
  phase: "5B",
  status: gate.toLowerCase(),
  asOf,
  dateInterval: { from, to: asOf },
  scope: { selectedTeams: batchIds, importedDuringAudit: false, otherTeamsProcessed: false },
  evidenceViews: {
    completeMatchEvidence: { storage: "teams[].matches[].players", includes: "all observed participants", predictionCandidateEligible: false },
    registeredSquadEvidence: { path: "data/normalized/champions-player-stats-2026-27.json", storage: "teams[].players", includes: "registered Champions squad only", predictionCandidateEligible: true },
    countingRule: "Each team-match-providerPlayerId observation is stored once; summaries are derived and never added back to match totals."
  },
  summary: {
    teams: teams.length,
    matches: allMatches.length,
    playerMatchObservations: allObservations.length,
    registeredPlayers: teams.reduce((total, team) => total + team.coverage.registeredPlayers, 0),
    registeredActive: teams.reduce((total, team) => total + team.coverage.registeredActive, 0),
    uniquePlayedNotRegistered: allOutside.length,
    registeredNoAppearance: teams.reduce((total, team) => total + team.coverage.registeredNoAppearance, 0),
    identityUnresolved: allUnresolved.length,
    identitiesResolvedFromHistorical: teams.reduce((total, team) => total + team.identityReview.resolvedFromHistorical.length, 0),
    duplicateObservations: teams.reduce((total, team) => total + team.coverage.duplicateObservations, 0),
    shotsExactMatches: allMatches.filter(match => match.reconciliation.shots.status === "exact").length,
    shotsOnTargetExactMatches: allMatches.filter(match => match.reconciliation.shotsOnTarget.status === "exact").length
  },
  invariants,
  teams,
  gate: `CHAMPIONS PLAYER-COVERAGE GATE = ${gate}`
};

const outputPath = path.join(root, `data/analysis/champions/player-coverage-audit-${asOf}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
const cell = value => String(value ?? "N/D").replaceAll("|", "\\|");
const markdown = [
  `# Champions player coverage audit — ${asOf}`,
  "",
  `**${output.gate}**`,
  "",
  `Snapshot-only audit: ${output.summary.matches} matches, ${output.summary.playerMatchObservations} player-match observations, ${output.summary.duplicateObservations} duplicates.`,
  "",
  "## A. Copertura completa",
  "",
  "| Team | Registered | Registered active | Played total | Outside squad | Registered no appearance | Identity unresolved |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...teams.map(team => `| ${cell(team.team)} | ${team.coverage.registeredPlayers} | ${team.coverage.registeredActive} | ${team.coverage.playedPlayers} | ${team.coverage.playedNotRegistered} | ${team.coverage.registeredNoAppearance} | ${team.coverage.identityUnresolved} |`),
  "",
  "## B. Riconciliazione per partita",
  "",
  "Residual = team total - all-player total.",
  "",
  "| Team | Date | Match | Team shots | All-player shots | Registered shots | Residual | Shots status | Team SOT | All-player SOT | Registered SOT | Residual | SOT status |",
  "|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|",
  ...teams.flatMap(team => team.matches.map(match => {
    const shots = match.reconciliation.shots;
    const sot = match.reconciliation.shotsOnTarget;
    return `| ${cell(team.team)} | ${match.date} | ${cell(match.match)} | ${cell(shots.team)} | ${cell(shots.allPlayers)} | ${cell(shots.registeredPlayers)} | ${cell(shots.residual)} | ${shots.status} | ${cell(sot.team)} | ${cell(sot.allPlayers)} | ${cell(sot.registeredPlayers)} | ${cell(sot.residual)} | ${sot.status} |`;
  })),
  "",
  "## C. Giocatori fuori rosa — osservazioni per partita",
  "",
  "| Team | Date | Match | Player | ESPN ID | Minutes | Shots | SOT | Reason |",
  "|---|---|---|---|---:|---:|---:|---:|---|",
  ...teams.flatMap(team => team.matches.flatMap(match => match.players
    .filter(player => player.classification === "played_not_registered")
    .map(player => `| ${cell(team.team)} | ${match.date} | ${cell(match.match)} | ${cell(player.player)} | ${player.providerPlayerId} | ${cell(player.minutes)} | ${cell(player.shots)} | ${cell(player.shotsOnTarget)} | ${player.exclusionReason} |`))),
  "",
  "## D. Identity review",
  "",
  "### Resolved from existing historical IDs",
  "",
  ...teams.flatMap(team => team.identityReview.resolvedFromHistorical.map(player => `- ${team.team}: ${player.player} — ESPN ${player.providerPlayerId}`)),
  "",
  "### Still unresolved",
  "",
  ...teams.flatMap(team => team.identityReview.unresolved.map(player => `- ${team.team}: ${player.player} — ${player.reason}`)),
  "",
  "## E. Invariants",
  "",
  "| Artifact | Expected SHA-256 | Actual SHA-256 | Preserved |",
  "|---|---|---|---|",
  ...Object.entries(invariants).map(([name, invariant]) => `| ${name} | ${invariant.expected} | ${invariant.actual} | ${invariant.preserved ? "yes" : "no"} |`),
  ""
];
const reportPath = path.join(root, `output/reports/champions-player-coverage-audit-${asOf}.md`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${markdown.join("\n")}\n`);
console.log(`${output.gate} · ${output.summary.matches} gare · ${output.summary.playerMatchObservations} osservazioni · ${output.summary.uniquePlayedNotRegistered} fuori rosa`);
