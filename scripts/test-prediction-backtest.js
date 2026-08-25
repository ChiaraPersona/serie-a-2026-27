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
assert(["validated", "rejected-by-training"].includes(report.headToHead.status), "Stato H2H non valido");
assert(report.headToHead.archiveEvents > 5000, "Archivio H2H pluristagionale incompleto");
assert(report.headToHead.outOfSample.selected.metrics.headToHeadCoveragePct >= 90, "Copertura H2H fuori campione insufficiente");
assert(report.headToHead.outOfSample.selected.configuration.cap <= 0.05, "Il correttivo H2H supera il limite prudenziale del 5%");
assert(report.headToHead.outOfSample.selected.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95[0] > 0, "Il vantaggio H2H sul log-loss non e stabile nel bootstrap");
assert.strictEqual(report.opponentRatings.status, "rejected", "Il ranking attacco/difesa non deve essere adottato senza guadagni fuori campione completi");
assert.strictEqual(report.opponentRatings.recommendation, "keep-points-ranking", "Decisione ranking avversari incoerente con il backtest");
assert.strictEqual(report.opponentRatings.candidate.matches, report.methodology.testWindow.matches, "Confronto ranking avversari con copertura incompleta");
assert(report.opponentRatings.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95.length === 2, "Bootstrap ranking avversari assente");
console.log(`OK backtest walk-forward: ${report.outOfSample.model.matches} gare fuori campione, log-loss ${report.outOfSample.model.oneXTwoLogLoss}`);
