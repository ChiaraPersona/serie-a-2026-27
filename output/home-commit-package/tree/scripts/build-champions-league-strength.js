"use strict";

const fs = require("fs");
const path = require("path");
const { buildLeagueStrengthDataset } = require("./champions/league-strength");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const arg = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const asOf = arg("--as-of");
if (!asOf) throw new Error("Uso: node scripts/build-champions-league-strength.js --as-of YYYY-MM-DD");

const output = buildLeagueStrengthDataset({
  history: read("data/normalized/uefa-europe-history-2023-26.json"),
  model: read("data/normalized/uefa-1x2-model-2026-27.json"),
  championsStrength: read("data/normalized/champions-team-strength-2026-27.json"),
  championsTeamMap: read("data/sources/champions-team-history-map-2026-27.json"),
  asOf
});
const outputPath = path.join(root, `data/analysis/champions/league-strength-${asOf}.json`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
const sufficient = output.leagues.filter(league => league.evidenceStatus === "estimated").length;
console.log(`League strength: ${sufficient}/${output.leagues.length} leghe stimate · ${output.status.toUpperCase()} · ${path.relative(root, outputPath)}`);
