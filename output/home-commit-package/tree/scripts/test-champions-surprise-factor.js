"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-surprise-factor-md01-2026-27.json"), "utf8"));

assert.strictEqual(data.fixtures.length, 18);
assert.deepStrictEqual(data.methodology.formula, { market: 0.5, form: 0.15, venue: 0.1, absences: 0.1, tactical: 0.1, motivation: 0.05 });
assert.strictEqual(data.summary.marketFromOdds, 18);
assert.strictEqual(data.summary.marketFallbacks, 0);
assert.strictEqual(data.summary.verifiedAbsenceFixtures, 0);
for (const fixture of data.fixtures) {
  assert(Number.isInteger(fixture.surpriseFactor));
  assert(fixture.surpriseFactor >= 0 && fixture.surpriseFactor <= 100);
  assert(["molto basso", "basso", "medio", "alto", "molto alto", "estremo"].includes(fixture.surpriseLevel));
  assert(fixture.favorite && fixture.underdog && fixture.favorite !== fixture.underdog);
  assert.deepStrictEqual(Object.keys(fixture.components), ["market", "form", "venue", "absences", "tactical", "motivation"]);
  assert(Object.values(fixture.components).every(value => Number.isFinite(value) && value >= 0 && value <= 100));
  assert(fixture.reasons.length <= 3);
  assert(fixture.componentDetails.market.evidence.normalizedProbabilities);
  assert.strictEqual(fixture.componentDetails.absences.status, "fallback-neutral-no-verified-availability");
  const recomputed = Math.round(fixture.components.market * 0.5 + fixture.components.form * 0.15 + fixture.components.venue * 0.1 + fixture.components.absences * 0.1 + fixture.components.tactical * 0.1 + fixture.components.motivation * 0.05);
  assert.strictEqual(fixture.surpriseFactor, recomputed, `${fixture.fixtureId}: formula non riproducibile`);
}

console.log("OK Fattore Sorpresa Champions MD1");
