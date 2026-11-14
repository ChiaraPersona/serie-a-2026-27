"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const calendar = read("data/normalized/champions-league-2026-27.json");
const history = read("data/normalized/champions-referee-history-2026-10-13.json");
const validated = read("data/analysis/champions/referee-phase-2a-2026-10-13.json");
const pilot = read("data/normalized/champions-pilot-predictions-md02-2026-27.json");
const integration = read("data/normalized/champions-md02-integration-2026-27.json");
const renderer = fs.readFileSync(path.join(root, "js/pages/champions.js"), "utf8");

const fixtures = calendar.fixtures.filter(fixture => fixture.matchday === 2);
const checks = new Map(history.officialVerification.checks.map(check => [check.fixtureId, check]));
const profiles = new Map(history.referees.map(profile => [profile.refereeId, profile]));
const validations = new Map(validated.fixtures.map(fixture => [fixture.fixtureId, fixture]));

assert.strictEqual(fixtures.length, 18, "MD2 must contain 18 fixtures");
assert.strictEqual(pilot.fixtures.length, 18, "MD2 must contain 18 readings");
assert.strictEqual(checks.size, 18, "UEFA verification must cover 18 fixtures");
assert.strictEqual(profiles.size, 18, "validated history must contain 18 canonical referees");

for (const fixture of fixtures) {
  const check = checks.get(fixture.id);
  const profile = profiles.get(check?.refereeId);
  const audit = validations.get(fixture.id);
  assert.ok(check?.confirmed, `${fixture.id}: UEFA assignment not confirmed`);
  assert.ok(profile, `${fixture.id}: missing canonical referee profile`);
  assert.ok(audit, `${fixture.id}: missing Phase 2A validation`);
  assert.strictEqual(fixture.refereeAssignment?.referee?.name, check.referee, `${fixture.id}: calendar/UEFA referee mismatch`);
  assert.strictEqual(profile.name, check.referee, `${fixture.id}: profile/UEFA referee mismatch`);
  assert.strictEqual(profile.refereeId, audit.refereeId, `${fixture.id}: canonical ID mismatch`);
  assert.strictEqual(profile.source.provider, "FootyMetrics", `${fixture.id}: unexpected statistics source`);
  assert.strictEqual(profile.career.matches, audit.samples.career.matches, `${fixture.id}: career sample mismatch`);
  assert.deepStrictEqual(profile.career.yellowCards, audit.samples.career.yellowCards, `${fixture.id}: yellow-card values changed`);
  assert.deepStrictEqual(profile.career.redCards, audit.samples.career.redCards, `${fixture.id}: red-card values changed`);
  assert.deepStrictEqual(profile.career.fouls, audit.samples.career.fouls, `${fixture.id}: foul values changed`);
  assert.deepStrictEqual(profile.career.overCardFrequencies, audit.samples.career.overCardFrequencies, `${fixture.id}: career Over values changed`);
  assert.deepStrictEqual(profile.last10, audit.samples.recent10, `${fixture.id}: recent-10 values changed`);
  assert.strictEqual(profile.career.overCardFrequencies.over3_5.frequency, null, `${fixture.id}: career Over 3.5 must stay unavailable`);
  assert.strictEqual(profile.last10.matches, 10, `${fixture.id}: recent sample must contain 10 matches`);
}

const refereeAdjustments = [];
const collectRefereeAdjustments = value => {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "refereeAdjustment") refereeAdjustments.push(nested);
    collectRefereeAdjustments(nested);
  }
};
collectRefereeAdjustments(integration);
assert.strictEqual(refereeAdjustments.length, 18, "expected one refereeAdjustment field per MD2 fixture");
assert.ok(refereeAdjustments.every(value => value === null), "refereeAdjustment must remain inactive");
assert.match(renderer, /load\("champions-referee-history-2026-10-13\.json"\)/, "renderer must reuse the validated history database");
assert.match(renderer, /Number\.isFinite\(frequencies\?\.\[key\]\?\.frequency\)/, "unavailable Over values must be omitted");
assert.match(renderer, /campioni non combinati/, "sample separation note is missing");
assert.doesNotMatch(renderer, /refereeAdjustment\s*=/, "renderer must not activate refereeAdjustment");

console.log("Champions MD2 referee readings: PASS");
console.log("- assignment/profile joins: 18/18");
console.log("- career and recent-10 values: exact Phase 2A match");
console.log("- missing career Over 3.5: omitted, not reconstructed");
console.log("- refereeAdjustment: null 18/18");
