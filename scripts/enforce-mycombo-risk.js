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
let allowed = 0;
let unavailable = 0;

for (const [matchId, portfolios] of Object.entries(source.matches || {})) {
  const prediction = predictionByMatch.get(matchId);
  if (!prediction) throw new Error(`Pronostico non trovato: ${matchId}`);
  source.matches[matchId] = portfolios.map(portfolio => {
    if (portfolio.status === "N/D" || !portfolio.legs?.length) {
      unavailable += 1;
      return portfolio;
    }
    const risk = prediction.decisionSupport?.portfolios?.find(item => item.tier === portfolio.tier);
    if (!risk) throw new Error(`Controllo rischio mancante: ${matchId}/${portfolio.tier}`);
    if (risk.allowed) {
      allowed += 1;
      return portfolio;
    }
    unavailable += 1;
    return {
      tier: portfolio.tier,
      status: "N/D",
      reason: `Controllo rischio: ${risk.reasons.join(" ") || "profilo fuori dai limiti prudenziali."}`,
      legs: []
    };
  });
}

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
console.log(`OK filtro rischio MyCombo giornata ${matchday}: ${allowed} ammesse · ${unavailable} N/D`);
