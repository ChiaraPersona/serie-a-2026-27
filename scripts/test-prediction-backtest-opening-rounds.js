"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const report = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "prediction-backtest-opening-rounds.json"), "utf8"));
assert.strictEqual(report.methodology.type, "opening-rounds-walk-forward", "Metodo avvio campionato non valido");
assert(report.samples.training >= 290 && report.samples.validation === 90, "Campione avvio campionato insufficiente");
assert.strictEqual(report.samples.firstRoundValidation, 30, "Campione prima giornata inatteso");
assert.strictEqual(report.recommendation, "adopt-regularized-carry-over", "Decisione carry-over non valida");
assert.deepStrictEqual(report.regularized.configuration, { promotedAttack: 0.51, promotedDefence: 1.29, carryStrength: 1 }, "Configurazione regolarizzata inattesa");
assert(report.regularizedImprovementVsCurrentPct.oneXTwoLogLoss > 0 && report.regularizedImprovementVsCurrentPct.scoreLogLoss > 0, "Carry-over senza miglioramento congiunto");
assert(report.pairedBootstrap.regularizedOneXTwoLogLoss.confidenceInterval95.length === 2, "Bootstrap avvio campionato assente");
assert.strictEqual(report.processRegression.recommendation, "keep-process-regression-disabled", "Il correttivo di processo non validato non deve entrare nel modello");
assert(["xg-only", "xg-sot", "combined"].includes(report.processRegression.configuration.processMode), "Modalità di processo non tracciata");
assert(report.processRegression.trainingShortlist.length === 15, "Griglia del correttivo di processo incompleta");
assert(report.processRegression.improvementVsRegularizedPct.scoreLogLoss <= 0, "La decisione deve riflettere il peggioramento fuori campione");
console.log(`OK opening rounds: ${report.samples.training} training, ${report.samples.validation} validation, carry-over regolarizzato`);
