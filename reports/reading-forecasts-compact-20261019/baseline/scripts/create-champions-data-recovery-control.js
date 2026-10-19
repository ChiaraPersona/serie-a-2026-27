"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const rel = value => value.split(path.sep).join("/");
const sha256 = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const sha256File = file => sha256(fs.readFileSync(path.join(root, file)));
const sha256Json = value => sha256(Buffer.from(JSON.stringify(value)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

function walk(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(absolute, entry.name);
    const relative = rel(path.relative(root, target));
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

const phase6Audit = read(`data/analysis/champions/full-data-coverage-audit-${asOf}.json`);
const stats = read("data/normalized/champions-player-stats-2026-27.json");
const protectedTeamIds = ["aek-athens", "arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
const outsideEligibility = phase6Audit.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => ({
  teamId: team.teamId,
  providerPlayerId: player.providerPlayerId,
  player: player.player,
  predictionCandidateEligible: player.predictionCandidateEligible
})));
const protectedFiles = {
  phase6Audit: `data/analysis/champions/full-data-coverage-audit-${asOf}.json`,
  phase6Control: `data/analysis/champions/full-data-control-${asOf}.json`,
  historicalPlayers: "data/normalized/champions-player-stats-2025-26.json",
  registeredSquadsSource: "data/sources/champions-registered-squads-2026-27.json",
  registeredSquadsNormalized: "data/normalized/champions-registered-squads-2026-27.json",
  predictionBuilder: "scripts/build-champions-pilot-predictions.js",
  leagueStrength: "data/analysis/champions/league-strength-2026-10-03.json"
};
const rawRoots = ["data/raw/champions-pilot"];
const rawSnapshots = rawRoots.flatMap(walk).sort().map(file => ({ path: file, sha256: sha256File(file) }));

const output = {
  schemaVersion: 1,
  phase: "7",
  status: "control_frozen",
  createdAt: new Date().toISOString(),
  asOf,
  baseline: {
    teams: phase6Audit.summary.teams,
    unresolvedIdentities: phase6Audit.summary.identityUnresolved,
    outsideContributors: phase6Audit.summary.uniquePlayedNotRegistered,
    comparableMatches: phase6Audit.summary.shotsComparableMatches,
    gate: phase6Audit.gate
  },
  protectedTeamSnapshots: Object.fromEntries(protectedTeamIds.map(teamId => {
    const team = stats.teams.find(item => item.id === teamId);
    if (!team) throw new Error(`Squadra protetta assente: ${teamId}`);
    return [teamId, { sha256: sha256Json(team), asOf: team.asOf }];
  })),
  protectedFiles: Object.fromEntries(Object.entries(protectedFiles).map(([name, file]) => [name, { path: file, sha256: sha256File(file) }])),
  protectedRawSnapshots: rawSnapshots,
  predictionCandidateEligibility: {
    observations: outsideEligibility.length,
    sha256: sha256Json(outsideEligibility)
  }
};

const target = path.join(root, `data/analysis/champions/data-recovery-control-${asOf}.json`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Champions data-recovery control: ${protectedTeamIds.length} squadre · ${rawSnapshots.length} raw · ${outsideEligibility.length} eleggibilità congelate`);
