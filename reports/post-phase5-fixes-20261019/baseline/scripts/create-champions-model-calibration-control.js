"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-11";
const dataAsOf = "2026-10-09";
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

const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${dataAsOf}.json`);
const phase7 = read(`data/analysis/champions/data-recovery-audit-${dataAsOf}.json`);
const outsideEligibility = phase6.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => ({
  teamId: team.teamId,
  providerPlayerId: player.providerPlayerId,
  player: player.player,
  predictionCandidateEligible: player.predictionCandidateEligible
})));

const protectedFiles = {
  phase6Audit: `data/analysis/champions/full-data-coverage-audit-${dataAsOf}.json`,
  phase7Audit: `data/analysis/champions/data-recovery-audit-${dataAsOf}.json`,
  phase7Control: `data/analysis/champions/data-recovery-control-${dataAsOf}.json`,
  identityRecovery: `data/analysis/champions/player-identity-recovery-${dataAsOf}.json`,
  uefaSquadAudit: `data/analysis/champions/uefa-squad-audit-${dataAsOf}.json`,
  domesticRecovery: "data/normalized/champions-domestic-recovery-2026-27.json",
  currentPlayerStats: "data/normalized/champions-player-stats-2026-27.json",
  historicalPlayerStats: "data/normalized/champions-player-stats-2025-26.json",
  registeredSquadsSource: "data/sources/champions-registered-squads-2026-27.json",
  registeredSquadsNormalized: "data/normalized/champions-registered-squads-2026-27.json",
  calendar: "data/normalized/champions-league-2026-27.json",
  teamPredictions: "data/normalized/champions-pilot-predictions-2026-27.json",
  playerPredictions: "data/normalized/champions-player-markets-md01-2026-27.json",
  resultModel: "data/normalized/champions-1x2-2026-27.json",
  leagueStrength: "data/analysis/champions/league-strength-2026-10-03.json",
  teamStrength: "data/normalized/champions-team-strength-2026-27.json",
  teamPredictionBuilder: "scripts/build-champions-pilot-predictions.js",
  playerPredictionBuilder: "scripts/build-champions-player-markets.js",
  contextBaselineLibrary: "scripts/champions/context-adjusted-player-baseline.js",
  aekContextPilotBuilder: "scripts/build-champions-aek-context-pilot.js",
  championsRenderer: "js/pages/champions.js"
};

for (const [name, file] of Object.entries(protectedFiles)) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`File protetto assente (${name}): ${file}`);
}

const rawSnapshots = ["data/raw/champions-pilot", `data/raw/champions-recovery/${dataAsOf}`]
  .flatMap(walk)
  .filter(file => file.endsWith(".json.gz") || file.endsWith("manifest.json"))
  .sort()
  .map(file => ({ path: file, sha256: sha256File(file) }));

const output = {
  schemaVersion: 1,
  phase: "8",
  status: "control_frozen",
  createdAt: new Date().toISOString(),
  auditDate,
  dataAsOf,
  policy: {
    productionMutationAllowed: false,
    retroactiveAvailabilityAssumptionAllowed: false,
    identityAutofixAllowed: false,
    calibrationActivationAllowed: false
  },
  baseline: {
    teams: phase6.summary.teams,
    championsTeamMatchSidesObserved: phase6.teams.reduce((sum, team) => sum + team.matches.filter(match => match.competition === "uefa.champions").length, 0),
    unresolvedIdentities: phase7.summary.identityRemaining,
    outsideContributors: phase7.summary.outsideContributors,
    uefaVerifiedOutsideContributors: phase7.summary.uefaVerified,
    phase7Gate: phase7.gate
  },
  protectedFiles: Object.fromEntries(Object.entries(protectedFiles).map(([name, file]) => [name, { path: file, sha256: sha256File(file) }])),
  protectedRawSnapshots: rawSnapshots,
  predictionCandidateEligibility: {
    observations: outsideEligibility.length,
    sha256: sha256Json(outsideEligibility)
  }
};

const target = path.join(root, `data/analysis/champions/model-calibration-control-${auditDate}.json`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Champions model-calibration control: ${Object.keys(protectedFiles).length} file · ${rawSnapshots.length} raw · ${outsideEligibility.length} eleggibilità congelate`);
