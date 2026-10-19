"use strict";

const fs = require("fs");
const path = require("path");
const { freezeCandidate } = require("./champions/complete-forecast-snapshots");

const root = path.resolve(__dirname, "..");
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const candidateRelative = argument("candidate") || "data/analysis/champions/complete-forecast-candidate-2026-10-13.json";
const evaluationWindow = argument("window") || "unassigned";
const candidate = JSON.parse(fs.readFileSync(path.join(root, candidateRelative), "utf8"));
const outputRoot = path.join(root, "data/predictions/champions/pre-match-snapshots");
const results = freezeCandidate({ candidate, outputRoot, evaluationWindow });
const frozen = results.filter(item => ["FROZEN", "ALREADY_FROZEN_IDENTICAL"].includes(item.status));
for (const result of results) console.log(`${result.fixtureId}: ${result.status}`);
if (!frozen.length) {
  process.exitCode = 2;
  console.error("No immutable pre-match snapshot was written: every fixture failed chronology or completeness gates.");
} else {
  console.log(`Frozen ${frozen.length}/${results.length} immutable Champions pre-match snapshots.`);
}
