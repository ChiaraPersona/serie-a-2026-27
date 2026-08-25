"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dashboard = JSON.parse(fs.readFileSync(path.join(root, "data/generated/prediction-performance-dashboard.json"), "utf8"));

assert(dashboard.matches >= 10, "Il dashboard deve includere la prima giornata conclusa");
for (const metric of ["outcome", "primaryScore", "modalScore", "topThreeScores"]) {
  const value = dashboard.predictionPerformance[metric];
  assert.strictEqual(value.resolved, dashboard.matches, `${metric}: copertura incompleta`);
  assert(value.hitRatePct >= 0 && value.hitRatePct <= 100, `${metric}: percentuale non valida`);
}
assert.deepStrictEqual(Object.keys(dashboard.profilePerformance), ["Safe", "Balanced", "Aggressive"], "Profili dashboard incompleti");
assert(dashboard.marketPerformance["double-chance"].all.resolved > 0, "Settlement doppia chance assente");
assert(dashboard.methodology.warning.includes("non dimostra"), "Avvertenza statistica assente");
console.log(`OK dashboard pronostici: ${dashboard.matches} partite concluse`);
