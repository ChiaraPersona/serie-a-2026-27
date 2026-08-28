"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = process.argv.indexOf("--matchday");
const matchday = index >= 0 ? Number(process.argv[index + 1]) : 1;
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) throw new Error("--matchday deve essere compreso tra 1 e 38.");

const filename = `mycombo-serie-a-2026-27-md-${String(matchday).padStart(2, "0")}.json`;
const sourcePath = path.join(root, "data/sources", filename);
const predictionsPath = path.join(root, "data/normalized/predictions.json");
if (!fs.existsSync(sourcePath)) throw new Error(`Fonte MyCombo assente: ${filename}`);

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const predictions = JSON.parse(fs.readFileSync(predictionsPath, "utf8")).predictions;
const predictionByMatch = new Map(predictions.map(prediction => [prediction.matchId, prediction]));
let valid = 0;

for (const [matchId, portfolios] of Object.entries(source.matches || {})) {
  if (!predictionByMatch.has(matchId)) throw new Error(`Pronostico non trovato: ${matchId}`);
  for (const portfolio of portfolios) {
    const limits = source.constraints?.tierLimits?.[portfolio.tier];
    if (!limits) throw new Error(`Intervallo gambe mancante: ${matchId}/${portfolio.tier}`);
    if (!portfolio.legs?.length || portfolio.legs.length < limits.minimum || portfolio.legs.length > limits.maximum) {
      throw new Error(`${matchId}/${portfolio.tier}: ${portfolio.legs?.length || 0} gambe fuori dall'intervallo ${limits.minimum}-${limits.maximum}`);
    }
    valid += 1;
  }
}

console.log(`OK intervalli MyCombo giornata ${matchday}: ${valid} portafogli validi · nessun altro vincolo di ammissibilita`);
