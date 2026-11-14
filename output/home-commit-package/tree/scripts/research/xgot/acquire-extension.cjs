"use strict";
const { run } = require("../../acquire-xgot-seasons.cjs");
const domestic = [
  [47, "premier-league"], [87, "la-liga"], [54, "bundesliga"], [53, "ligue-1"],
  [61, "liga-portugal"], [57, "eredivisie"], [40, "belgian-pro-league"]
];
const TARGETS = [
  { leagueId: 55, competition: "serie-a", season: "2023/2024", expectedMatches: 380 },
  { leagueId: 42, competition: "champions-league", season: "2023/2024", expectedMatches: 125 },
  ...["2024/2025", "2025/2026"].flatMap(season => domestic.map(([leagueId, competition]) => ({ leagueId, competition, season })))
];
if (require.main === module) run({ targets: TARGETS, offline: process.argv.includes("--offline"),
  normalizedRoot: "data/normalized/xgot-extended-seasons", auditRoot: "data/analysis/xgot/extended-seasons" })
  .catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { TARGETS };
