"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const option = (argv, name) => {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
};
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const argv = process.argv.slice(2);
const batchId = option(argv, "--batch");
const recompute = argv.includes("--recompute");
if (!batchId) throw new Error("Usa --batch <batch-id>");
const control = read(`data/analysis/champions/full-data-control-${asOf}.json`);
const outputPath = path.join(root, `data/analysis/champions/full-data-batches-${asOf}.json`);
const previous = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : { schemaVersion: 1, phase: "6", asOf, batches: [] };
const previousEntry = previous.batches.find(batch => batch.batchId === batchId);
const plan = control.batches.find(batch => batch.id === batchId);
if (!plan) throw new Error(`Batch sconosciuto: ${batchId}`);
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const data = read("data/normalized/champions-player-stats-2026-27.json");
const configById = new Map(source.teams.map(team => [team.id, team]));
const protectedRaw = new Set(control.protectedRawSnapshots.map(item => item.path));
const teamIds = new Set(plan.teams.map(team => team.teamId));
const lastImportMatchesBatch = new Set(source.lastImport?.teams || []).size === teamIds.size && [...teamIds].every(id => source.lastImport.teams.includes(id));
if (!lastImportMatchesBatch && !recompute) {
  throw new Error(`${batchId}: lastImport non corrisponde al batch`);
}

const rawSnapshots = [];
for (const league of [...new Set(plan.teams.map(team => configById.get(team.teamId)?.league || team.league))]) {
  const scoreboard = `data/raw/champions-pilot/espn/scoreboards/2026-27/${league}/2026-as-of-${asOf}.json.gz`;
  if (fs.existsSync(path.join(root, scoreboard))) rawSnapshots.push(scoreboard);
}
const teams = plan.teams.map(planned => {
  const config = configById.get(planned.teamId);
  if (!config) throw new Error(`${planned.teamId}: configurazione corrente mancante`);
  const team = data.teams.find(item => item.id === planned.teamId);
  if (!team) throw new Error(`${planned.teamId}: team normalizzato mancante`);
  const matches = source.matches.filter(match => match.season === "2026-27"
    && (config.baselineKind !== "domestic" || match.league === config.league)
    && (match.home.providerTeamId === planned.providerTeamId || match.away.providerTeamId === planned.providerTeamId));
  for (const match of matches) {
    const summary = `data/raw/champions-pilot/espn/summaries/2026-27/${match.league}/${asOf}/${match.eventId}.json.gz`;
    if (fs.existsSync(path.join(root, summary))) rawSnapshots.push(summary);
  }
  const activePlayers = team.players.filter(player => (player.currentSeason?.totals?.minutes ?? 0) > 0).length;
  const shotsCoverage = team.players.filter(player => player.currentSeason?.totals?.shots !== null && player.currentSeason?.totals?.shots !== undefined).length;
  const shotsOnTargetCoverage = team.players.filter(player => player.currentSeason?.totals?.shotsOnTarget !== null && player.currentSeason?.totals?.shotsOnTarget !== undefined).length;
  const status = matches.length === 0 || activePlayers === 0 ? "FAIL"
    : config.baselineKind !== "domestic" || matches.some(match => match.coverage !== "complete") || activePlayers < 11 ? "PARTIAL"
      : "PASS";
  return {
    team: planned.team,
    teamId: planned.teamId,
    league: config.leagueName,
    providerLeague: config.league,
    evidenceLeagues: [...new Set(matches.map(match => match.league))],
    matches: matches.length,
    registeredPlayers: team.players.length,
    activePlayers,
    shotsCoverage,
    shotsOnTargetCoverage,
    partialMatches: matches.filter(match => match.coverage !== "complete").map(match => match.eventId),
    status
  };
});
const uniqueRaw = [...new Set(rawSnapshots)].sort();
const entry = {
  batchId,
  asOf,
  importedAt: lastImportMatchesBatch ? source.lastImport.retrievedAt : previousEntry?.importedAt || null,
  teams,
  matchesImported: lastImportMatchesBatch ? source.lastImport.matches : previousEntry?.matchesImported ?? teams.reduce((total, team) => total + team.matches, 0),
  effectivePeriods: lastImportMatchesBatch ? source.dateIntervalsByLeague || [] : previousEntry?.effectivePeriods || [],
  rawSnapshots: {
    used: uniqueRaw.length,
    createdDuringPhase6: uniqueRaw.filter(file => !protectedRaw.has(file)).length,
    files: uniqueRaw.map(file => ({ path: file, existedBeforePhase6: protectedRaw.has(file) }))
  },
  status: teams.every(team => team.status === "PASS") ? "PASS" : teams.some(team => team.status !== "FAIL") ? "PARTIAL" : "FAIL"
};
previous.batches = [...previous.batches.filter(batch => batch.batchId !== batchId), entry]
  .sort((left, right) => left.batchId.localeCompare(right.batchId));
previous.summary = {
  completedBatches: previous.batches.length,
  teams: previous.batches.reduce((total, batch) => total + batch.teams.length, 0),
  matchesImported: previous.batches.reduce((total, batch) => total + batch.matchesImported, 0),
  rawSnapshotsCreated: previous.batches.reduce((total, batch) => total + batch.rawSnapshots.createdDuringPhase6, 0)
};
fs.writeFileSync(outputPath, `${JSON.stringify(previous, null, 2)}\n`);
console.log(`${batchId}: ${entry.status} · ${entry.matchesImported} gare · ${entry.rawSnapshots.createdDuringPhase6} nuovi raw · ${previous.summary.teams}/29 squadre registrate`);
