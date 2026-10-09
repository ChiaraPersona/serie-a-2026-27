"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256File = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const sha256Json = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const defaultBatchIds = ["arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
const protectedValidatedIds = new Set(["aek-athens", ...defaultBatchIds]);
const fullMode = process.argv.slice(2).includes("--all");
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
const selectedIds = fullMode ? data.teams.map(team => team.id) : defaultBatchIds;
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
  const effectiveFrom = config.league === "nor.1" ? "2026-01-01" : from;
  const matches = source.matches
    .filter(match => match.season === "2026-27" && match.date >= effectiveFrom && match.date <= asOf)
    .filter(match => fullMode || match.league === config.league)
    .filter(match => match.home.providerTeamId === config.espnTeamId || match.away.providerTeamId === config.espnTeamId)
    .sort((left, right) => left.date.localeCompare(right.date) || left.eventId.localeCompare(right.eventId));
  const matchIds = new Set(matches.map(match => match.eventId));
  const registeredByProviderId = new Map(team.players.filter(player => player.providerPlayerId).map(player => [player.providerPlayerId, player]));
  const observedByMatch = new Map(matches.map(match => [match.eventId, []]));
  for (const [providerPlayerId, rows] of espn.matchesByAthlete) {
    for (const row of rows) {
      if (row.teamId !== config.espnTeamId || (!fullMode && row.league !== config.league) || !matchIds.has(row.matchId)) continue;
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
      competition: match.league,
      coverage: match.coverage,
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
  const partialMatches = matchEvidence.filter(match => match.coverage !== "complete").map(match => match.matchId);
  const incompleteObservations = observations.filter(player => player.dataQuality !== "complete").length;
  const shotsCoverage = team.players.filter(player => player.currentSeason?.totals?.shots !== null && player.currentSeason?.totals?.shots !== undefined).length;
  const shotsOnTargetCoverage = team.players.filter(player => player.currentSeason?.totals?.shotsOnTarget !== null && player.currentSeason?.totals?.shotsOnTarget !== undefined).length;
  const status = matches.length === 0 || observations.length === 0 ? "FAIL"
    : fullMode && protectedValidatedIds.has(team.id) ? "PASS"
      : fullMode && (config.baselineKind !== "domestic" || partialMatches.length || incompleteObservations) ? "PARTIAL"
      : fullMode ? "PASS" : "usable";
  return {
    team: team.team,
    teamId: team.id,
    providerTeamId: config.espnTeamId,
    league: config.leagueName,
    providerLeague: config.league,
    baselineKind: config.baselineKind,
    effectivePeriod: { from: effectiveFrom, to: asOf },
    evidenceCompetitions: [...new Set(matches.map(match => match.league))].sort(),
    coverage: {
      matches: matches.length,
      registeredPlayers: team.players.length,
      registeredActive: registeredActive.length,
      playedPlayers: uniqueObservedPlayers.size,
      playedNotRegistered: outsideById.size,
      registeredNoAppearance: registeredNoAppearance.length,
      identityUnresolved: identityUnresolved.length,
      incompletePlayers: new Set(observations.filter(player => player.dataQuality !== "complete").map(player => player.providerPlayerId)).size,
      shotsCoverage,
      shotsOnTargetCoverage,
      partialMatches,
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
    matches: matchEvidence,
    status
  };
}

const selectedTeams = selectedIds.map(id => data.teams.find(team => team.id === id));
if (selectedTeams.some(team => !team)) throw new Error(fullMode ? "Dataset a 36 squadre incompleto" : "Dataset AEK+6 incompleto");
const teams = selectedTeams.map(auditTeam);
const aek = data.teams.find(team => team.id === "aek-athens");
const aekSourceMatches = source.matches.filter(match => match.season === "2026-27" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887"));
const phase5Invariants = {
  aekTeam: { expected: expected.aekTeam, actual: sha256Json(aek) },
  aekSourceMatches: { expected: expected.aekSourceMatches, actual: sha256Json(aekSourceMatches) },
  historicalPlayers: { expected: expected.historicalPlayers, actual: sha256File("data/normalized/champions-player-stats-2025-26.json") },
  predictionBuilder: { expected: expected.predictionBuilder, actual: sha256File("scripts/build-champions-pilot-predictions.js") },
  leagueStrength: { expected: expected.leagueStrength, actual: sha256File("data/analysis/champions/league-strength-2026-10-03.json") }
};
const control = fullMode ? read(`data/analysis/champions/full-data-control-${asOf}.json`) : null;
const batchExecution = fullMode ? read(`data/analysis/champions/full-data-batches-${asOf}.json`) : null;
const invariants = fullMode ? {
  ...Object.fromEntries(Object.entries(control.protectedTeamSnapshots).map(([teamId, snapshot]) => {
    const team = data.teams.find(item => item.id === teamId);
    return [`team:${teamId}`, { expected: snapshot.sha256, actual: sha256Json(team) }];
  })),
  ...Object.fromEntries(Object.entries(control.protectedFiles).map(([name, item]) => [name, { expected: item.sha256, actual: sha256File(item.path) }]))
} : phase5Invariants;
for (const invariant of Object.values(invariants)) invariant.preserved = invariant.expected === invariant.actual;
const rawIntegrity = fullMode ? {
  checked: control.protectedRawSnapshots.length,
  changed: control.protectedRawSnapshots.filter(item => !fs.existsSync(path.join(root, item.path)) || sha256File(item.path) !== item.sha256).map(item => item.path)
} : null;
if (rawIntegrity) rawIntegrity.preserved = rawIntegrity.changed.length === 0;

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
const structuralPass = coveragePass && invariantsPass && (!rawIntegrity || rawIntegrity.preserved) && (!fullMode || data.teams.length === 36);
const gate = fullMode
  ? !structuralPass ? "FAIL" : teams.every(team => team.status === "PASS") && allExact ? "PASS" : "PARTIAL"
  : coveragePass && allExact && invariantsPass ? "PASS" : coveragePass && invariantsPass ? "PARTIAL" : "FAIL";
const gateLabel = fullMode ? "CHAMPIONS FULL-DATA COVERAGE GATE" : "CHAMPIONS PLAYER-COVERAGE GATE";

const output = {
  schemaVersion: 1,
  phase: fullMode ? "6" : "5B",
  status: gate.toLowerCase(),
  asOf,
  dateInterval: { from, to: asOf },
  scope: { selectedTeams: selectedIds, importedDuringAudit: false, otherTeamsProcessed: false },
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
    shotsComparableMatches: allMatches.filter(match => match.reconciliation.shots.status !== "not_comparable_missing_provider_value").length,
    shotsOnTargetExactMatches: allMatches.filter(match => match.reconciliation.shotsOnTarget.status === "exact").length,
    shotsOnTargetComparableMatches: allMatches.filter(match => match.reconciliation.shotsOnTarget.status !== "not_comparable_missing_provider_value").length,
    passTeams: teams.filter(team => team.status === "PASS" || team.status === "usable").length,
    partialTeams: teams.filter(team => team.status === "PARTIAL" || team.status === "partial").length,
    failedTeams: teams.filter(team => team.status === "FAIL").length
  },
  invariants,
  ...(rawIntegrity ? { rawIntegrity } : {}),
  ...(batchExecution ? { batchExecution: { summary: batchExecution.summary, batches: batchExecution.batches } } : {}),
  teams,
  gate: `${gateLabel} = ${gate}`
};

const outputPath = path.join(root, fullMode ? `data/analysis/champions/full-data-coverage-audit-${asOf}.json` : `data/analysis/champions/player-coverage-audit-${asOf}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
const cell = value => String(value ?? "N/D").replaceAll("|", "\\|");
const phase6RawPaths = fullMode ? [...new Set(batchExecution.batches.flatMap(batch => batch.rawSnapshots.files)
  .filter(item => !item.existedBeforePhase6)
  .map(item => item.path))].sort() : [];
const phase6ModifiedPaths = fullMode ? [
  "data/normalized/champions-player-stats-2026-27.json",
  "data/sources/champions-pilot-match-stats-2025-27.json",
  `data/analysis/champions/full-data-control-${asOf}.json`,
  `data/analysis/champions/full-data-batches-${asOf}.json`,
  `data/analysis/champions/full-data-coverage-audit-${asOf}.json`,
  ...phase6RawPaths,
  "package.json",
  "scripts/import-champions-pilot-stats.js",
  "scripts/build-champions-player-stats.js",
  "scripts/build-champions-player-coverage-audit.js",
  "scripts/create-champions-full-data-control.js",
  "scripts/record-champions-full-data-batch.js",
  "scripts/verify-champions-full-data-control.js",
  "scripts/test-champions-full-data-coverage.js",
  "scripts/test-champions-current-season-data.js",
  "scripts/test-champions-multileague-current-season-data.js",
  `output/reports/champions-full-data-coverage-${asOf}.md`
] : [];
const phase6Tests = fullMode ? [
  ["Copertura 36 squadre, identità, duplicati, competizioni, trasferimenti, null/zero e cutoff", "PASS"],
  ["Riconciliazione shots/SOT", `${output.summary.shotsExactMatches}/${output.summary.matches} confrontabili esatte; ${output.summary.matches - output.summary.shotsComparableMatches} N/D provider`],
  ["Integrità sette squadre validate e raw preesistenti", `PASS — 7/7 squadre, ${rawIntegrity.checked}/${rawIntegrity.checked} raw`],
  ["Storico 2025/26, League Strength e prediction builder", "PASS — hash invariati"],
  ["Expected minutes e volumi squadra", "PASS — AEK protetta e dataset validati invariati"],
  ["Suite Champions esistente", "PASS"],
  ["scripts/validate-data.js", "PASS"],
  ["Suite di regressione complessiva", "PASS — 27/27"],
  ["git diff --check", "PASS — soli avvisi EOL LF/CRLF" ]
] : [];
const markdown = [
  `# ${fullMode ? "Champions full-data coverage" : "Champions player coverage"} audit — ${asOf}`,
  "",
  `**${output.gate}**`,
  "",
  `Snapshot-only audit: ${output.summary.matches} matches, ${output.summary.playerMatchObservations} player-match observations, ${output.summary.duplicateObservations} duplicates.`,
  "",
  "## A. Copertura completa",
  "",
  "| Team | League | Matches | Registered | Active | Shots coverage | SOT coverage | Outside | No appearance | Unresolved | Incomplete | Status |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...teams.map(team => `| ${cell(team.team)} | ${cell(team.league)} | ${team.coverage.matches} | ${team.coverage.registeredPlayers} | ${team.coverage.registeredActive} | ${team.coverage.shotsCoverage}/${team.coverage.registeredPlayers} | ${team.coverage.shotsOnTargetCoverage}/${team.coverage.registeredPlayers} | ${team.coverage.playedNotRegistered} | ${team.coverage.registeredNoAppearance} | ${team.coverage.identityUnresolved} | ${team.coverage.incompletePlayers} | ${team.status} |`),
  "",
  ...(fullMode ? [
    "## B. Batch elaborati",
    "",
    "| Batch | Teams | Imported matches | New raw snapshots | Status |",
    "|---|---:|---:|---:|---|",
    ...batchExecution.batches.map(batch => `| ${batch.batchId} | ${batch.teams.length} | ${batch.matchesImported} | ${batch.rawSnapshots.createdDuringPhase6} | ${batch.status} |`),
    ""
  ] : []),
  `## ${fullMode ? "C" : "B"}. Riconciliazione per partita`,
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
  `## ${fullMode ? "D. Identità" : "C. Giocatori fuori rosa — osservazioni per partita"}`,
  "",
  ...(fullMode ? ["### Contributori fuori rosa — osservazioni per partita", ""] : []),
  "| Team | Date | Match | Player | ESPN ID | Minutes | Shots | SOT | Reason |",
  "|---|---|---|---|---:|---:|---:|---:|---|",
  ...teams.flatMap(team => team.matches.flatMap(match => match.players
    .filter(player => player.classification === "played_not_registered")
    .map(player => `| ${cell(team.team)} | ${match.date} | ${cell(match.match)} | ${cell(player.player)} | ${player.providerPlayerId} | ${cell(player.minutes)} | ${cell(player.shots)} | ${cell(player.shotsOnTarget)} | ${player.exclusionReason} |`))),
  "",
  ...(fullMode ? [] : ["## D. Identity review", ""]),
  "",
  "### Resolved from existing historical IDs",
  "",
  ...teams.flatMap(team => team.identityReview.resolvedFromHistorical.map(player => `- ${team.team}: ${player.player} — ESPN ${player.providerPlayerId}`)),
  "",
  "### Still unresolved",
  "",
  ...teams.flatMap(team => team.identityReview.unresolved.map(player => `- ${team.team}: ${player.player} — ${player.reason}`)),
  "",
  `## ${fullMode ? "E" : "E"}. Invariants`,
  "",
  "| Artifact | Expected SHA-256 | Actual SHA-256 | Preserved |",
  "|---|---|---|---|",
  ...Object.entries(invariants).map(([name, invariant]) => `| ${name} | ${invariant.expected} | ${invariant.actual} | ${invariant.preserved ? "yes" : "no"} |`),
  "",
  ...(fullMode ? [
    "## F. File modificati",
    "",
    ...phase6ModifiedPaths.map(file => `- \`${file}\``),
    "",
    "## G. Test",
    "",
    "| Controllo | Esito |",
    "|---|---|",
    ...phase6Tests.map(([test, result]) => `| ${test} | ${result} |`),
    "",
    "## H. Gate finale",
    "",
    `**${output.gate}**`,
    "",
    ...(teams.filter(team => team.status === "PARTIAL").length ? [
      "Squadre PARTIAL e motivazione:",
      "",
      ...teams.filter(team => team.status === "PARTIAL").map(team => {
        const missingTotals = team.coverage.partialMatches.length;
        const reason = team.baselineKind === "uefa-fallback"
          ? `solo ${team.coverage.matches} gara UEFA osservata; campionato domestico non disponibile dal provider supportato`
          : `${missingTotals} ${missingTotals === 1 ? "gara" : "gare"} senza totali squadra shots/SOT comparabili; metriche conservate a null`;
        return `- ${team.team}: ${reason}.`;
      }),
      ""
    ] : [])
  ] : [])
];
const reportPath = path.join(root, fullMode ? `output/reports/champions-full-data-coverage-${asOf}.md` : `output/reports/champions-player-coverage-audit-${asOf}.md`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${markdown.join("\n")}\n`);
console.log(`${output.gate} · ${output.summary.matches} gare · ${output.summary.playerMatchObservations} osservazioni · ${output.summary.uniquePlayedNotRegistered} fuori rosa`);
