"use strict";

const fs = require("fs");
const path = require("path");
const { parseStatmuseGame } = require("./parse-statmuse-game");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const playerStatsPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, "utf8"));
const retrievedAt = "2026-09-05";

const games = [
  {
    matchId: "roma-fiorentina-2026-27-md-01",
    file: "roma-fiorentina-statmuse-refresh.html",
    url: "https://www.statmuse.com/fc/match/8-24-2026-rom-vs-fio-112078",
    abbreviations: ["ROM", "FIO"],
    romaSide: "home"
  },
  {
    matchId: "lecce-roma-2026-27-md-02",
    file: "lecce-roma-statmuse-refresh.html",
    url: "https://www.statmuse.com/fc/match/8-31-2026-lec-vs-rom-112095",
    abbreviations: ["LEC", "ROM"],
    romaSide: "away"
  }
];

const canonicalNames = new Map([
  ["Matìas Soulé", "Matìas Soulè"],
  ["João Mário Lopes", "João Mário"],
  ["Alejandro Jiménez", "Álex Jiménez"],
  ["Kialonda", "Kialonda Gaspar"],
  ["Amar Ahmed", "Amar Fatah"],
  ["Konan N'dri", "Konan N’Dri"]
]);
const canonicalName = value => canonicalNames.get(value) || value;
const stat = (lookup, key) => lookup[key]?.value ?? null;

function teamFouls(team) {
  const lookup = team.stats.team.statsLookup[team.stats.team.statsLookupKey];
  return { committed: stat(lookup, "FoulsCommitted"), won: stat(lookup, "FoulsDrawn") };
}

function playerRows(rootData, team) {
  const stats = team.stats.player;
  return stats.splits[0].splits.map(split => {
    const lookup = stats.statsLookup[split.statsLookupKey];
    return [
      canonicalName(rootData.players[String(split.playerId)].longName),
      stat(lookup, "Shots"),
      stat(lookup, "ShotsOnTarget"),
      stat(lookup, "FoulsCommitted"),
      stat(lookup, "FoulsDrawn")
    ];
  });
}

for (const config of games) {
  const rootData = parseStatmuseGame(path.join(root, "tmp", config.file));
  const game = rootData.gameData;
  if (game.gameStatus !== "played") throw new Error(`Referto non finale: ${config.matchId}`);

  const rows = { home: playerRows(rootData, game.homeTeam), away: playerRows(rootData, game.awayTeam) };
  const totals = { home: teamFouls(game.homeTeam), away: teamFouls(game.awayTeam) };
  for (const side of ["home", "away"]) {
    const committed = rows[side].reduce((sum, row) => sum + row[3], 0);
    const won = rows[side].reduce((sum, row) => sum + row[4], 0);
    if (committed !== totals[side].committed || won !== totals[side].won) {
      throw new Error(`Falli non riconciliati: ${config.matchId} ${side}`);
    }
  }

  const result = results.matches.find(item => item.matchId === config.matchId);
  if (!result) throw new Error(`Risultato non trovato: ${config.matchId}`);
  result.teamStats.home.fouls = totals.home.committed;
  result.teamStats.away.fouls = totals.away.committed;

  const overlay = [config.url, config.abbreviations[0], rows.home, config.abbreviations[1], rows.away];
  const overlayIndex = playerStats.matches.findIndex(item => item[0] === config.url);
  if (overlayIndex < 0) throw new Error(`Overlay StatMuse non trovato: ${config.matchId}`);
  playerStats.matches[overlayIndex] = overlay;

  const source = results.sources.find(item => item.url === config.url);
  if (source) source.retrievedAt = retrievedAt;
  console.log(`${config.matchId}: Roma ${totals[config.romaSide].committed} falli commessi, ${totals[config.romaSide].won} subiti.`);
}

results.retrievedAt = retrievedAt;
playerStats.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(playerStatsPath, `${JSON.stringify(playerStats)}\n`);
