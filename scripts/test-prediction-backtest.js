"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const report = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "prediction-backtest-2025-26.json"), "utf8"));

assert.strictEqual(report.methodology.type, "walk-forward", "Il backtest deve essere walk-forward");
assert.strictEqual(report.methodology.testWindow.fromMatchday, 20, "Il test deve iniziare dal girone di ritorno");
assert.strictEqual(report.outOfSample.model.matches, 190, "Il test fuori campione deve coprire 190 gare");
assert(report.outOfSample.model.oneXTwoLogLoss < report.outOfSample.baseline.oneXTwoLogLoss, "Il modello deve migliorare il log-loss 1X2 rispetto al baseline");
assert(report.outOfSample.model.oneXTwoBrier < report.outOfSample.baseline.oneXTwoBrier, "Il modello deve migliorare il Brier 1X2 rispetto al baseline");
assert(report.outOfSample.model.exactModeHitPct < 20, "Il report non deve suggerire che il punteggio modale sia una previsione affidabile");
assert(report.outOfSample.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95.length === 2, "Intervallo bootstrap assente");
assert(report.outOfSample.configuredV4Core.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95[0] > 0, "Il vantaggio log-loss del nucleo v4 non e stabile nel bootstrap");
assert(["pending-dataset", "integrated"].includes(report.headToHead.status), "Stato H2H non valido");
console.log(`OK backtest walk-forward: ${report.outOfSample.model.matches} gare fuori campione, log-loss ${report.outOfSample.model.oneXTwoLogLoss}`);
