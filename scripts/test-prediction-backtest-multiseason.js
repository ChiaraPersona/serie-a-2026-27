"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const report = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "prediction-backtest-multiseason.json"), "utf8"));

assert.strictEqual(report.methodology.type, "multi-season-walk-forward", "Metodo pluristagionale non valido");
assert.strictEqual(report.methodology.testSeasons.length, 4, "Servono quattro stagioni fuori campione");
assert(report.archive.outOfSamplePredictions >= 1000, "Campione pluristagionale insufficiente");
for (const variant of ["poisson", "empirical", "dixon-coles", "empirical+dixon-coles", "xg-blend-25", "xg-blend-50", "xg-blend-75", "xg-only"]) {
  assert(report.variants[variant].aggregate.matches === report.archive.outOfSamplePredictions, `${variant}: copertura incompleta`);
}
assert(["adopt-dixon-coles", "keep-current"].includes(report.decision.recommendation), "Decisione modello non valida");
assert(["adopt-poisson", "keep-empirical"].includes(report.decision.calibrationRecommendation), "Decisione calibrazione non valida");
assert(["adopt-xg-blend-25", "keep-goals-only"].includes(report.decision.xgRecommendation), "Decisione xG non valida");
assert(report.decision.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95.length === 2, "Bootstrap pluristagionale assente");
console.log(`OK backtest pluristagionale: ${report.archive.outOfSamplePredictions} gare, ${report.decision.recommendation}`);
