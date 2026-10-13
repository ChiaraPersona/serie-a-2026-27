"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const analysisRoot = path.join(root, "data/analysis/champions/referee-phase-2b");
const rawRoot = path.join(root, "data/raw/champions-referee-phase-2b/2026-10-13");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const uniqueCount = values => new Set(values).size;
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

const outputFiles = [
  "referee-registry.json", "match-totals.json", "team-cards.json",
  "individual-cards.json", "rolling-origin-splits.json", "quality-report.json"
].map(file => path.join(analysisRoot, file));
const protectedFiles = [
  "data/normalized/champions-pilot-predictions-md02-2026-27.json",
  "data/normalized/champions-md02-integration-2026-27.json",
  "data/normalized/schedina-champions-md02.json",
  "js/pages/champions.js", "css/champions.css",
  "scripts/build-champions-pilot-predictions.js",
  "scripts/build-champions-md02-integration.js",
  "scripts/build-champions-md02-schedina.js",
  "scripts/build-readings.js", "scripts/build-site.js"
].map(file => path.join(root, file));

const matches = read("data/analysis/champions/referee-phase-2b/match-totals.json").matches;
const teams = read("data/analysis/champions/referee-phase-2b/team-cards.json").rows;
const players = read("data/analysis/champions/referee-phase-2b/individual-cards.json").rows;
const registry = read("data/analysis/champions/referee-phase-2b/referee-registry.json").referees;
const splitDocument = read("data/analysis/champions/referee-phase-2b/rolling-origin-splits.json");
const quality = read("data/analysis/champions/referee-phase-2b/quality-report.json");
const manifest = read("data/raw/champions-referee-phase-2b/2026-10-13/manifest.json");

assert.deepStrictEqual(Object.fromEntries([...new Set(matches.map(row => row.season))].map(season => [season, matches.filter(row => row.season === season).length])), {
  "2022-23": 125, "2023-24": 125, "2024-25": 189, "2025-26": 189
});
assert.strictEqual(matches.length, 628);
assert.strictEqual(teams.length, 1256);
assert.strictEqual(players.length, 19311);
assert.strictEqual(registry.length, 68);
assert.strictEqual(uniqueCount(matches.map(row => row.matchId)), matches.length);
assert.strictEqual(uniqueCount(matches.map(row => row.uefaMatchId)), matches.length);
assert.strictEqual(uniqueCount(matches.map(row => row.espnEventId)), matches.length);
assert.strictEqual(uniqueCount(teams.map(row => `${row.matchId}:${row.homeAway}`)), teams.length);
assert.strictEqual(uniqueCount(players.map(row => `${row.matchId}:${row.playerId}`)), players.length);
assert.strictEqual(uniqueCount(registry.map(row => row.id)), registry.length);

const teamByMatch = new Map();
const playerByMatchTeam = new Map();
for (const row of teams) {
  if (!teamByMatch.has(row.matchId)) teamByMatch.set(row.matchId, []);
  teamByMatch.get(row.matchId).push(row);
  assert.strictEqual(row.totalCards, row.yellowCards + row.secondYellowCards + row.directRedCards);
  assert.ok(Number.isFinite(row.foulsCommitted));
}
for (const row of players) {
  assert.strictEqual(row.appeared, true);
  assert.strictEqual(row.totalCards, row.yellowCards + row.secondYellowCards + row.directRedCards);
  assert.strictEqual(row.participationTemporalStatus, "POST_MATCH_OUTCOME_ONLY");
  assert.strictEqual(row.preMatchFeatures.actualParticipationUsedAsFeature, false);
  assert.strictEqual(row.preMatchFeatures.actualMinutesUsedAsFeature, false);
  assert.ok(Number.isFinite(row.foulsCommitted));
  assert.ok(Number.isFinite(row.minutesPlayed));
  const key = `${row.matchId}:${row.teamId}`;
  if (!playerByMatchTeam.has(key)) playerByMatchTeam.set(key, []);
  playerByMatchTeam.get(key).push(row);
}
for (const match of matches) {
  assert.strictEqual(match.cards.totalCards, match.cards.yellowCards + match.cards.secondYellowCards + match.cards.directRedCards);
  assert.strictEqual(match.refereeAssignmentTemporalStatus, "NOT_SOURCE_TIMESTAMPED_PRE_KICKOFF");
  assert.strictEqual(match.preMatchFeatures.refereePriorUcl.usable, false);
  assert.strictEqual(match.preMatchFeatures.outcomeFieldsExcluded, true);
  assert.ok(registry.some(row => row.id === match.refereeId));
  const matchTeams = teamByMatch.get(match.matchId) || [];
  assert.strictEqual(matchTeams.length, 2);
  for (const key of ["yellowCards", "secondYellowCards", "directRedCards", "totalCards", "foulsCommitted", "penaltiesAwarded"])
    assert.strictEqual(match.cards[key], sum(matchTeams, key), `${match.matchId}: ${key}`);
  for (const team of matchTeams) {
    const participants = playerByMatchTeam.get(`${match.matchId}:${team.providerTeamId}`) || [];
    for (const key of ["yellowCards", "secondYellowCards", "directRedCards", "totalCards"])
      assert.strictEqual(team[key], sum(participants, key), `${match.matchId}/${team.homeAway}: ${key}`);
  }
}

assert.strictEqual(quality.integrity.duplicateMatchIds, 0);
assert.strictEqual(quality.integrity.duplicateTeamKeys, 0);
assert.strictEqual(quality.integrity.duplicatePlayerKeys, 0);
assert.strictEqual(quality.integrity.chronologyFailures, 0);
assert.strictEqual(quality.antiLeakage.status, "PASS_WITH_DOCUMENTED_EXCLUSIONS");
assert.ok(splitDocument.folds.every(fold => fold.chronologyPass));
for (const fold of splitDocument.folds) {
  assert.strictEqual(uniqueCount(fold.trainMatchIds), fold.trainMatchIds.length);
  assert.strictEqual(uniqueCount(fold.validationMatchIds), fold.validationMatchIds.length);
  assert.strictEqual(fold.trainMatchIds.some(id => fold.validationMatchIds.includes(id)), false);
}
const sven = registry.filter(row => /sven jablonski/i.test(row.displayName));
const walsh = registry.filter(row => /nick(?:olas)? walsh/i.test(row.displayName));
assert.strictEqual(sven.length, 1);
assert.strictEqual(sven[0].id, "uefa-referee:deu:sven-jablonski");
assert.strictEqual(walsh.length, 1);
assert.strictEqual(walsh[0].id, "uefa-referee:sco:nicholas-walsh");

assert.strictEqual(uniqueCount(manifest.files.map(row => row.path)), manifest.files.length);
for (const row of manifest.files) {
  const file = path.join(root, row.path);
  assert.ok(fs.existsSync(file), `Raw mancante: ${row.path}`);
  assert.strictEqual(hash(file), row.sha256, `Hash raw non valido: ${row.path}`);
  assert.strictEqual(fs.statSync(file).size, row.bytes, `Dimensione raw non valida: ${row.path}`);
}

if (process.argv.includes("--repro")) {
  const beforeOutputs = Object.fromEntries(outputFiles.map(file => [file, hash(file)]));
  const beforeProtected = Object.fromEntries(protectedFiles.map(file => [file, hash(file)]));
  const run = spawnSync(process.execPath, [path.join(__dirname, "import-champions-referee-phase-2b.js")], { cwd: root, encoding: "utf8" });
  assert.strictEqual(run.status, 0, run.stderr || run.stdout);
  for (const file of outputFiles) assert.strictEqual(hash(file), beforeOutputs[file], `Output non riproducibile: ${path.basename(file)}`);
  for (const file of protectedFiles) assert.strictEqual(hash(file), beforeProtected[file], `Superficie protetta modificata: ${path.relative(root, file)}`);
}

assert.ok(fs.existsSync(rawRoot));
console.log(`Phase 2B integrity PASS: ${matches.length} matches, ${teams.length} team rows, ${players.length} player rows, ${registry.length} referees, ${manifest.files.length} raw files${process.argv.includes("--repro") ? ", reproducibility/protected-surface PASS" : ""}`);
