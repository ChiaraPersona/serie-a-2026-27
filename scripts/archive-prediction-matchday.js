"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = process.argv.indexOf("--matchday");
const matchday = index >= 0 ? Number(process.argv[index + 1]) : NaN;
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) {
  throw new Error("--matchday deve essere compreso tra 1 e 38.");
}

const predictions = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "predictions.json"), "utf8"));
const matches = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "matches.json"), "utf8"));
const matchdayById = new Map(matches.map(match => [match.id, match.matchday]));
const selected = predictions.predictions.filter(prediction => matchdayById.get(prediction.matchId) === matchday);
if (selected.length !== 10) throw new Error(`Pronostici giornata ${matchday} incompleti: ${selected.length}/10.`);

const code = String(matchday).padStart(2, "0");
const output = {
  schemaVersion: predictions.schemaVersion,
  competition: predictions.competition,
  season: predictions.season,
  matchday,
  archivedAt: new Date().toISOString(),
  predictions: selected.map(({ decisionSupport, ...prediction }) => prediction)
};
const destination = path.join(root, "data", "sources", `prediction-archive-md${code}-2026-27.json`);
fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Archivio pronostici MD${code}: ${selected.length} partite.`);
