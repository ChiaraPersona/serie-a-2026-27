"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "data/analysis/prediction-calibration-v2.json");
const markdownPath = path.join(root, "docs/prediction-calibration-v2.md");
const svgPath = path.join(root, "data/analysis/prediction-reliability-v2.svg");

assert(fs.existsSync(reportPath), "artifact JSON assente");
assert(fs.existsSync(markdownPath), "report Markdown assente");
assert(fs.existsSync(svgPath), "reliability diagram SVG assente");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const markdown = fs.readFileSync(markdownPath, "utf8");
const svg = fs.readFileSync(svgPath, "utf8");
assert(svg.startsWith("<svg"));
for (const market of ["shots1Plus", "shots2Plus", "shots3Plus", "sot1Plus", "sot2Plus"]) assert(svg.includes(market), `pannello SVG mancante: ${market}`);
assert.equal(report.metadata.modelFrozen, true);
assert.equal(report.metadata.productionBehaviorChanged, false);
assert.equal(report.leakageAudit.passed, true);
assert.equal(report.leakageAudit.passedDuplicationAudit, true);
assert(report.dataAudit.evaluableMatches > 0);
assert(report.dataAudit.totalPlayerMatchObservations >= 100);
assert.equal(report.observations.length, report.dataAudit.totalProjectedPlayerMatches);
for (const market of Object.values(report.marketMetrics)) {
  assert(market.brier >= 0 && market.brier <= 1);
  assert(market.logLoss >= 0);
  assert(market.ece >= 0 && market.ece <= 1);
}
for (const row of report.observations) {
  assert(row.shotProbability1Plus >= row.shotProbability2Plus);
  assert(row.shotProbability2Plus >= row.shotProbability3Plus);
  assert(row.sotProbability1Plus >= row.sotProbability2Plus);
  if (typeof row.actualShots === "number" && typeof row.actualSOT === "number") assert(row.actualSOT <= row.actualShots);
}
const required = ["EVALUATION VERDICT", "DATA COVERAGE", "LEAKAGE AUDIT", "WALK-FORWARD PROTOCOL", "OVERALL SHOTS PERFORMANCE", "OVERALL SOT PERFORMANCE", "MARKET CALIBRATION", "BRIER SCORES", "LOG LOSS", "ECE", "RELIABILITY DIAGNOSTICS", "DISCRIMINATION", "EXPECTED MINUTES ACCURACY", "STARTER ACCURACY", "PRIMARY PERFORMANCE", "SECONDARY PERFORMANCE", "OUTSIDER PERFORMANCE", "ROLE PERFORMANCE", "TEAM PATTERNS", "OPPONENT PATTERNS", "HOME/AWAY", "MATURITY PERFORMANCE", "CONFIDENCE VALIDATION", "MATCHUP FACTOR VALUE", "OPPONENT INTERACTION VALUE", "PERSISTENCE VALUE", "STABILITY VALUE", "POISSON DIAGNOSTIC", "NEGATIVE BINOMIAL SHADOW TEST", "SOT CONVERSION DIAGNOSTIC", "TEAM TARGET ERROR", "PLAYER ALLOCATION ERROR", "EXPECTED MINUTES ERROR", "ERROR DECOMPOSITION", "ABLATION RESULTS", "BASELINE COMPARISON", "V1 vs V2", "EARLY vs MATURE", "BIGGEST ERROR CLUSTERS", "CALIBRATION CANDIDATES", "DISTRIBUTION CANDIDATES", "VOLUME OWNERSHIP CANDIDATES", "ROLE/MATCHUP CANDIDATES", "DATA QUALITY LIMITS", "PRIORITY PROBLEMS", "FILES CREATED", "FILES MODIFIED", "TESTS", "NEXT RECOMMENDED MODEL CHANGE"];
for (const heading of required) assert(markdown.includes(`## ${heading}`), `sezione mancante: ${heading}`);
console.log(`OK evaluation V2: ${report.dataAudit.evaluableMatches} gare · ${report.dataAudit.totalPlayerMatchObservations} osservazioni · ${required.length} sezioni`);
