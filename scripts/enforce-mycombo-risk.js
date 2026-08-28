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
  const prediction = predictionByMatch.get(matchId);
  if (!prediction) throw new Error(`Pronostico non trovato: ${matchId}`);
  for (const portfolio of portfolios) {
    const limits = source.constraints?.tierLimits?.[portfolio.tier];
    if (!limits) throw new Error(`Intervallo gambe mancante: ${matchId}/${portfolio.tier}`);
    if (!portfolio.legs?.length || portfolio.legs.length < limits.minimum || portfolio.legs.length > limits.maximum) {
      throw new Error(`${matchId}/${portfolio.tier}: ${portfolio.legs?.length || 0} gambe fuori dall'intervallo ${limits.minimum}-${limits.maximum}`);
    }
    const combo = prediction.combinations?.find(item => item.tier === portfolio.tier);
    if (!combo?.legs?.length || combo.qualityStatus === "nd") throw new Error(`${matchId}/${portfolio.tier}: portafoglio non disponibile nel pronostico rigenerato`);
    const minimumOdds = source.constraints.minLegOddsInclusive;
    const maximumOdds = source.constraints.maxLegOddsInclusive;
    if (combo.legs.some(leg => leg.odds < minimumOdds || leg.odds > maximumOdds)) throw new Error(`${matchId}/${portfolio.tier}: quota singola fuori dal range ${minimumOdds}-${maximumOdds}`);
    if (new Set(combo.legs.map(leg => leg.overlapKey)).size !== combo.legs.length) throw new Error(`${matchId}/${portfolio.tier}: famiglia di mercato ripetuta`);
    valid += 1;
  }
}

console.log(`OK MyCombo giornata ${matchday}: ${valid} portafogli · intervalli gambe, quote 1.10-1.85 e famiglie di mercato validate`);
