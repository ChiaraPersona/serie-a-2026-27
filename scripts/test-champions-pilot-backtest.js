"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const report = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/normalized/champions-pilot-volume-backtest.json"), "utf8"));
for (const [metric, result] of Object.entries(report.metrics)) {
  assert(result.samples >= 150, `${metric}: campione walk-forward insufficiente`);
  if (metric === "yellowCards") assert(result.mae <= result.baselineMae * 1.01, `${metric}: regressione MAE eccessiva rispetto alla baseline`);
  else assert(result.mae < result.baselineMae, `${metric}: MAE non migliore della baseline`);
  assert(result.brier < result.baselineBrier, `${metric}: Brier non migliore della baseline`);
  assert(result.intervalCoveragePct >= 45 && result.intervalCoveragePct <= 80, `${metric}: copertura intervallo anomala`);
}
assert(report.matchCardsOver35.samples >= 75, "Over 3.5 cartellini: campione insufficiente");
assert(report.matchCardsOver35.brier < report.matchCardsOver35.baselineBrier, "Over 3.5 cartellini: nessun miglioramento sulla baseline");
console.log("OK backtest volumi Champions: tiri/corner sopra baseline · cartellini stabili in MAE e migliori in Brier");
