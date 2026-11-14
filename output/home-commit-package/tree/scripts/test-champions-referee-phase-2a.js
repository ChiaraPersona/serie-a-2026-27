"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const { kickoffUtc, matchKey, sha256, validateReferee } = require("./champions/referee-analysis");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const runBuilder = () => childProcess.execFileSync(process.execPath, [path.join(root, "scripts/build-champions-referee-phase-2a.js")], { cwd: root, stdio: "pipe" });

const outputPath = "data/analysis/champions/referee-phase-2a-2026-10-13.json";
const reportPath = "data/analysis/champions/referee-phase-2a-report-2026-10-13.md";
const baseline = read("data/sources/champions-referees/phase-2a-production-baseline-2026-10-13.json");
const protectedBefore = new Map(baseline.files.map(file => [file.path, sha256(path.join(root, file.path))]));

runBuilder();
const first = { json: sha256(path.join(root, outputPath)), report: sha256(path.join(root, reportPath)) };
runBuilder();
const second = { json: sha256(path.join(root, outputPath)), report: sha256(path.join(root, reportPath)) };
assert.deepStrictEqual(second, first, "Phase 2A output is not deterministic");

const result = read(outputPath);
const history = read("data/normalized/champions-referee-history-2026-10-13.json");
const assignments = read("data/sources/champions-referee-assignments-md02-2026-27.json");
const registry = read("data/sources/champions-referees/registry-2026-27.json");
const snapshot = read("data/sources/champions-referees/snapshot-control-2026-10-13.json");
const pilot = read("data/normalized/champions-pilot-predictions-md02-2026-27.json");

assert.strictEqual(result.status, "ARCHIVE_VALIDATED_MODULE_ISOLATED");
assert.strictEqual(result.calibrationReadiness.status, "NOT_READY_FOR_CALIBRATION");
assert.strictEqual(result.publicationStatus, "NO_REFEREE_PREDICTIONS_PUBLISHED");
assert.strictEqual(result.activeEngineStatus, "UNCHANGED");
assert.strictEqual(result.fixtures.length, 18);
assert.strictEqual(assignments.assignments.length, 18);
assert.strictEqual(registry.referees.length, 18);
assert.strictEqual(new Set(registry.referees.map(referee => referee.id)).size, 18);
assert.strictEqual(new Set(registry.referees.map(referee => referee.providers.footymetrics.id)).size, 18);
assert.deepStrictEqual(result.validationErrors, []);

for (const file of snapshot.files) {
  assert.strictEqual(sha256(path.join(root, file.path)), file.sha256, `raw hash changed: ${file.path}`);
  assert.ok(Date.parse(file.lastWriteTimeUtc) < Date.parse(snapshot.earliestFixtureKickoffUtc), `raw snapshot not pre-kickoff: ${file.path}`);
}

for (const fixture of result.fixtures) {
  assert.strictEqual(fixture.chronology.status, "PASS", fixture.fixtureId);
  assert.strictEqual(fixture.identity.status, "PASS", fixture.fixtureId);
  assert.strictEqual(fixture.reliability.status, "ELIGIBLE_FOR_CALIBRATION", fixture.fixtureId);
  assert.strictEqual(fixture.reliability.numericScore, null);
  assert.deepStrictEqual(fixture.validation.errors, []);
  assert.ok(Date.parse(fixture.sourceSnapshot.capturedAtUtc) < Date.parse(fixture.kickoff));
  const log = fixture.samples.recent10.matchLog;
  assert.strictEqual(log.length, 10);
  assert.strictEqual(new Set(log.map(matchKey)).size, log.length, `${fixture.referee}: duplicate last10`);
  for (let index = 1; index < log.length; index += 1) assert.ok(log[index].date < log[index - 1].date, `${fixture.referee}: last10 order`);
  for (const match of log) {
    assert.strictEqual(match.totalCards, match.yellowCards + match.redCards);
    assert.ok(Date.parse(`${match.date}T23:59:59Z`) < Date.parse(fixture.kickoff), `${fixture.referee}: post-kickoff last10`);
  }
  assert.strictEqual(fixture.samples.career.overCardFrequencies.over3_5.frequency, null);
  assert.strictEqual(fixture.samples.recent10.homeAwayCards, null);
}

for (const referee of history.referees) {
  const fixture = result.fixtures.find(item => item.refereeId === referee.refereeId);
  const checked = validateReferee(referee, kickoffUtc({ date: fixture.kickoff.slice(0, 10), kickoff: fixture.kickoff.slice(11, 16) }));
  assert.deepStrictEqual(checked.errors, [], referee.name);
}

const sven = registry.referees.find(referee => referee.id === "uefa-referee:deu:sven-jablonski");
assert.strictEqual(sven.providers.footymetrics.id, 191);
assert.deepStrictEqual(sven.providers.footymetrics.rejectedDuplicateIds, [33247]);
assert.strictEqual(result.identityAudit.nicholasWalsh.careerHeadlineMatches, 179);
assert.strictEqual(result.identityAudit.nicholasWalsh.atomicRowsMatches, 180);
assert.strictEqual(result.identityAudit.nicholasWalsh.treatment, "SOURCE_ANOMALY_PRESERVED_NOT_RECONCILED");

assert.strictEqual(pilot.fixtures.reduce((sum, fixture) => sum + (fixture.likelyBooked?.length || 0), 0), 0, "individual referee predictions unexpectedly published");
assert.strictEqual(pilot.fixtures.filter(fixture => fixture.cards?.refereeAdjustment === null).length, 18, "active referee adjustment changed");

for (const file of baseline.files) {
  const actual = sha256(path.join(root, file.path));
  assert.strictEqual(actual, protectedBefore.get(file.path), `builder changed protected file: ${file.path}`);
}
assert.strictEqual(result.coverage.productionBaselineAcceptable, result.coverage.productionBaselineFiles, "undisclosed Phase 2A coupling in protected assets");

for (const activeBuilder of [
  "scripts/build-champions-pilot-predictions.js",
  "scripts/build-champions-md02-integration.js",
  "scripts/build-champions-md02-schedina.js",
  "scripts/build-readings.js",
  "scripts/build-site.js",
  "js/pages/champions.js",
  "css/champions.css"
]) {
  const source = fs.readFileSync(path.join(root, activeBuilder), "utf8");
  assert.ok(!source.includes("referee-analysis"), `${activeBuilder} imports Phase 2A module`);
  assert.ok(!source.includes("referee-phase-2a"), `${activeBuilder} consumes Phase 2A artifact`);
}

console.log("Champions referee Phase 2A: PASS");
console.log(`- chronology: ${result.coverage.chronologyPass}/18`);
console.log(`- numeric/archive integrity: ${result.coverage.archiveIntegrityPass}/18`);
console.log(`- raw snapshot hashes: ${result.coverage.rawSnapshotsHashPass}/${result.coverage.rawSnapshots}`);
console.log(`- protected production assets accepted: ${result.coverage.productionBaselineAcceptable}/${result.coverage.productionBaselineFiles} (${result.coverage.disclosedConcurrentProductionChanges} disclosed concurrent change)`);
console.log(`- calibration: ${result.calibrationReadiness.status}`);
