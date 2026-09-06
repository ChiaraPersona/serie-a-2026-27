"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseStatmuseGame } = require("./parse-statmuse-game");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const overlaysPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
const retrievedAt = "2026-09-06";

const normalize = value => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ł/gi, "l")
  .replace(/đ/gi, "d")
  .replace(/[^a-z0-9]+/gi, "")
  .toLowerCase();
const value = (stats, key) => stats?.[key]?.value ?? null;
const displayedValue = (stats, key) => {
  const displayed = stats?.[key]?.display;
  return displayed == null || displayed === "" ? value(stats, key) : Number(displayed);
};
const round = number => Math.round(number * 100) / 100;
const close = (actual, expected, tolerance = 0) => Math.abs(actual - expected) <= tolerance;
const providerAliases = new Map([
  ["bayoyoussouf", "vakounbayo"],
  ["matteocichella", "matteochichella"],
  ["oliverprovstgaard", "olivernielsen"],
  ["amarfatah", "amarahmed"]
]);

function providerPlayers(state, side) {
  const team = state.gameData[side];
  const lookup = team.stats.player.statsLookup;
  return team.stats.player.splits.flatMap(group => group.splits).map(split => ({
    name: state.players[String(split.playerId)].longName,
    stats: lookup[split.statsLookupKey]
  })).filter(player => value(player.stats, "GamesPlayed") > 0);
}

function resolveProvider(players, name) {
  const wanted = normalize(name);
  const aliased = providerAliases.get(wanted);
  if (aliased) return players.find(player => normalize(player.name) === aliased) || null;
  const exact = players.find(player => normalize(player.name) === wanted);
  if (exact) return exact;
  const contained = players.filter(player => normalize(player.name).includes(wanted) || wanted.includes(normalize(player.name)));
  if (contained.length === 1) return contained[0];
  const surname = normalize(String(name).trim().split(/\s+/).at(-1));
  const sameSurname = players.filter(player => normalize(player.name).endsWith(surname));
  return sameSurname.length === 1 ? sameSurname[0] : null;
}

for (const result of results.matches) {
  if (result.status !== "finished") continue;
  const sourceUrl = result.sourceUrl;
  const source = results.sources.find(item => item.url === sourceUrl && item.provider === "StatMuse");
  assert(source, `${result.matchId}: fonte StatMuse mancante`);
  const fileName = `statmuse-complete-${sourceUrl.split("/").at(-1)}.html`;
  const filePath = path.join(root, "tmp", fileName);
  assert(fs.existsSync(filePath), `${result.matchId}: referto locale mancante (${fileName})`);
  const state = parseStatmuseGame(filePath);
  assert.equal(state.gameData.gameStatus, "played", `${result.matchId}: referto non definitivo`);

  const overlay = overlays.matches.find(item => item[0] === sourceUrl);
  assert(overlay, `${result.matchId}: overlay StatMuse mancante`);

  for (const [side, stateSide, overlaySide] of [["home", "homeTeam", 2], ["away", "awayTeam", 4]]) {
    const providerTeamStats = state.gameData[stateSide].stats.team.statsLookup["*"];
    result.teamStats[side] = {
      ...result.teamStats[side],
      expectedGoals: value(providerTeamStats, "ExpectedGoals"),
      shots: value(providerTeamStats, "Shots"),
      shotsOnTarget: value(providerTeamStats, "ShotsOnTarget"),
      fouls: value(providerTeamStats, "FoulsCommitted")
    };
    const sourcePlayers = providerPlayers(state, stateSide);
    const rows = result.playerStats[side];
    assert.equal(rows.length, sourcePlayers.length, `${result.matchId} ${side}: numero calciatori incoerente`);
    const refreshed = rows.map(row => {
      const provider = resolveProvider(sourcePlayers, row.player);
      assert(provider, `${result.matchId} ${side}: calciatore StatMuse non riconciliato: ${row.player}`);
      const fields = {
        minutes: value(provider.stats, "MinutesPlayed"),
        rating: displayedValue(provider.stats, "Rating"),
        goals: value(provider.stats, "Goals"),
        assists: value(provider.stats, "Assists"),
        shots: value(provider.stats, "Shots"),
        shotsOnTarget: value(provider.stats, "ShotsOnTarget"),
        expectedGoals: displayedValue(provider.stats, "ExpectedGoals"),
        foulsCommitted: value(provider.stats, "FoulsCommitted"),
        foulsWon: value(provider.stats, "FoulsDrawn")
      };
      assert(Object.values(fields).every(Number.isFinite), `${result.matchId} ${row.player}: statistiche ancora incomplete`);
      return { ...row, ...fields };
    });
    result.playerStats[side] = refreshed;
    overlay[overlaySide] = refreshed.map(row => [row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon]);

    const teamStats = result.teamStats[side];
    const sums = field => refreshed.reduce((total, row) => total + row[field], 0);
    assert.equal(sums("shots"), teamStats.shots, `${result.matchId} ${side}: tiri individuali non riconciliati`);
    assert.equal(sums("shotsOnTarget"), teamStats.shotsOnTarget, `${result.matchId} ${side}: tiri in porta individuali non riconciliati`);
    assert.equal(sums("foulsCommitted"), teamStats.fouls, `${result.matchId} ${side}: falli individuali non riconciliati`);
    assert(close(round(sums("expectedGoals")), teamStats.expectedGoals, 0.05), `${result.matchId} ${side}: xG individuali non riconciliati`);
  }
  source.retrievedAt = retrievedAt;
}

results.retrievedAt = retrievedAt;
overlays.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(overlaysPath, `${JSON.stringify(overlays)}\n`);
console.log(`Statistiche individuali complete e riconciliate per ${results.matches.filter(match => match.status === "finished").length} partite.`);
