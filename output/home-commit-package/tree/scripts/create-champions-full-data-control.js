"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const outputPath = path.join(root, `data/analysis/champions/full-data-control-${asOf}.json`);
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256Buffer = value => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = relative => sha256Buffer(fs.readFileSync(path.join(root, relative)));
const sha256Json = value => sha256Buffer(JSON.stringify(value));

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

if (fs.existsSync(outputPath)) throw new Error(`CONTROL_ALREADY_EXISTS: ${path.relative(root, outputPath)}`);
const data = read("data/normalized/champions-player-stats-2026-27.json");
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const registry = builder.squadTeams();
const configByName = new Map(source.teams.map(team => [team.name, team]));
const existingIds = new Set(data.teams.map(team => team.id));
const missing = registry.filter(team => !existingIds.has(team.id)).map(team => {
  const config = configByName.get(team.team);
  if (!config) throw new Error(`${team.team}: configurazione import mancante`);
  return { team: team.team, teamId: team.id, league: config.league, leagueName: config.leagueName, providerTeamId: config.espnTeamId };
});
if (registry.length !== 36 || data.teams.length !== 7 || missing.length !== 29) {
  throw new Error(`Perimetro inatteso: registry=${registry.length}, current=${data.teams.length}, missing=${missing.length}`);
}

const definitions = [
  { id: "batch-01-italy-germany", leagues: ["ita.1", "ger.1"] },
  { id: "batch-02-england-france", leagues: ["eng.1", "fra.1"] },
  { id: "batch-03-spain-portugal", leagues: ["esp.1", "por.1"] },
  { id: "batch-04-nl-be-at-no", leagues: ["ned.1", "bel.1", "aut.1", "nor.1"] },
  { id: "batch-05-uefa-fallbacks", leaguePrefix: "uefa." }
];
const batches = definitions.map(definition => ({
  id: definition.id,
  teams: missing.filter(team => definition.leagues?.includes(team.league) || (definition.leaguePrefix && team.league.startsWith(definition.leaguePrefix)))
}));
const assigned = batches.flatMap(batch => batch.teams.map(team => team.teamId));
if (assigned.length !== missing.length || new Set(assigned).size !== missing.length || batches.some(batch => batch.teams.length < 5 || batch.teams.length > 6)) {
  throw new Error(`Batch non validi: ${batches.map(batch => `${batch.id}=${batch.teams.length}`).join(", ")}`);
}

const rawRoot = path.join(root, "data/raw/champions-pilot/espn");
const rawSnapshots = files(rawRoot)
  .filter(file => file.endsWith(".json.gz") && file.includes(`${path.sep}2026-27${path.sep}`))
  .map(file => ({ path: path.relative(root, file).split(path.sep).join("/"), sha256: sha256Buffer(fs.readFileSync(file)) }))
  .sort((left, right) => left.path.localeCompare(right.path));
const output = {
  schemaVersion: 1,
  phase: "6",
  status: "frozen-before-import",
  createdAt: new Date().toISOString(),
  asOf,
  registryTeams: registry.length,
  initialDatasetTeams: data.teams.length,
  missingTeams: missing,
  batches,
  protectedTeamSnapshots: Object.fromEntries(data.teams.map(team => [team.id, {
    asOf: data.teamSnapshots?.[team.id]?.asOf || team.asOf || data.asOf,
    sha256: sha256Json(team)
  }])),
  protectedFiles: {
    historicalPlayers: { path: "data/normalized/champions-player-stats-2025-26.json", sha256: sha256File("data/normalized/champions-player-stats-2025-26.json") },
    predictionBuilder: { path: "scripts/build-champions-pilot-predictions.js", sha256: sha256File("scripts/build-champions-pilot-predictions.js") },
    leagueStrength: { path: "data/analysis/champions/league-strength-2026-10-03.json", sha256: sha256File("data/analysis/champions/league-strength-2026-10-03.json") }
  },
  protectedRawSnapshots: rawSnapshots
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Champions full-data control frozen: ${registry.length} registry · ${data.teams.length} protected · ${missing.length} missing · ${rawSnapshots.length} raw snapshots`);
