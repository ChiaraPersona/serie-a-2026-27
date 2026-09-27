"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const predictions = read("data/normalized/predictions.json").predictions.filter(prediction => prediction.playerMarketModelVersion === 2 && prediction.matchId.includes("-md-05"));
const matches = new Map(read("data/normalized/matches.json").filter(match => match.status === "finished" && match.playerStats).map(match => [match.id, match]));
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const poissonAtLeast = (lambda, threshold) => {
  let cumulative = 0;
  for (let k = 0; k < threshold; k += 1) {
    let factorial = 1;
    for (let i = 2; i <= k; i += 1) factorial *= i;
    cumulative += Math.exp(-lambda) * lambda ** k / factorial;
  }
  return Math.max(0, Math.min(1, 1 - cumulative));
};
const observations = [];

for (const prediction of predictions) {
  const match = matches.get(prediction.matchId);
  if (!match) continue;
  const actual = [...(match.playerStats.home || []), ...(match.playerStats.away || [])].filter(player => player.starter);
  const byId = new Map(actual.filter(player => player.playerId).map(player => [player.playerId, player]));
  const byName = new Map(actual.map(player => [clean(player.player), player]));
  for (const projected of prediction.shooters.allPlayers) {
    const observed = byId.get(projected.playerId) || byName.get(clean(projected.name)) || byName.get(clean(projected.lineupName));
    if (!observed || observed.shots == null || observed.shotsOnTarget == null) continue;
    observations.push({
      matchId: prediction.matchId,
      playerId: projected.playerId,
      player: projected.name,
      actualShots: observed.shots,
      actualShotsOnTarget: observed.shotsOnTarget,
      v1Shots: projected.projectedShotsV1,
      v2Shots: projected.projectedShots,
      v1ShotsOnTarget: projected.projectedShotsOnTargetV1,
      v2ShotsOnTarget: projected.projectedShotsOnTarget
    });
  }
}

const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
const variantMetrics = variant => {
  const shotsKey = `${variant}Shots`;
  const sotKey = `${variant}ShotsOnTarget`;
  const brier = (key, actualKey, threshold) => mean(observations.map(row => (poissonAtLeast(row[key], threshold) - Number(row[actualKey] >= threshold)) ** 2));
  return {
    observations: observations.length,
    shotsMae: Number(mean(observations.map(row => Math.abs(row[shotsKey] - row.actualShots))).toFixed(4)),
    shotsRmse: Number(Math.sqrt(mean(observations.map(row => (row[shotsKey] - row.actualShots) ** 2))).toFixed(4)),
    shotsOnTargetMae: Number(mean(observations.map(row => Math.abs(row[sotKey] - row.actualShotsOnTarget))).toFixed(4)),
    shotsOnTargetRmse: Number(Math.sqrt(mean(observations.map(row => (row[sotKey] - row.actualShotsOnTarget) ** 2))).toFixed(4)),
    brier: {
      shots1Plus: Number(brier(shotsKey, "actualShots", 1).toFixed(4)),
      shots2Plus: Number(brier(shotsKey, "actualShots", 2).toFixed(4)),
      shots3Plus: Number(brier(shotsKey, "actualShots", 3).toFixed(4)),
      shotsOnTarget1Plus: Number(brier(sotKey, "actualShotsOnTarget", 1).toFixed(4)),
      shotsOnTarget2Plus: Number(brier(sotKey, "actualShotsOnTarget", 2).toFixed(4))
    }
  };
};

if (observations.length < 100) throw new Error(`Campione MD05 insufficiente: ${observations.length} osservazioni`);
const output = {
  schemaVersion: 1,
  scope: "Serie A 2026/27 MD05, soli titolari con statistiche StatMuse verificate",
  methodology: "Pilot retrospettivo separato dal backtest principale. Confronta le proiezioni V1 conservate nell'output con V2 contestuale; MAE/RMSE sui conteggi e Brier sulle soglie Poisson.",
  caveat: "Campione di una sola giornata: diagnostico, non sufficiente per promuovere o ricalibrare automaticamente V2.",
  matches: new Set(observations.map(row => row.matchId)).size,
  observations: observations.length,
  v1: variantMetrics("v1"),
  v2: variantMetrics("v2")
};
const outputPath = path.join(root, "data/generated/player-market-backtest-v1-v2-md05.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK backtest giocatori V1/V2: ${output.matches} gare · ${output.observations} titolari`);

