"use strict";

const fs = require("fs");
const path = require("path");
const { parseStatmuseGame } = require("./parse-statmuse-game");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const playerStatsPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, "utf8"));
const retrievedAt = "2026-08-31";
const mvpUrl = "https://www.legaseriea.it/serie-a/awards/player-of-the-match";

const games = [
  {
    matchId: "napoli-como-2026-27-md-02",
    file: "napoli-como-statmuse.html",
    url: "https://www.statmuse.com/fc/match/8-30-2026-nap-vs-com-112088",
    home: { slug: "napoli", abbr: "NAP" },
    away: { slug: "como", abbr: "COM" },
    mvp: { team: "como", player: "Martin Baturina" },
    didNotPlay: { home: [], away: [{ playerId: "jesus-rodriguez", player: "Jesús Rodriguez" }] }
  },
  {
    matchId: "cagliari-inter-2026-27-md-02",
    file: "cagliari-inter-statmuse.html",
    url: "https://www.statmuse.com/fc/match/8-30-2026-cag-vs-int-112093",
    home: { slug: "cagliari", abbr: "CAG" },
    away: { slug: "inter", abbr: "INT" },
    mvp: { team: "inter", player: "Hakan Çalhanoğlu" }
  },
  {
    matchId: "lazio-genoa-2026-27-md-02",
    file: "lazio-genoa-statmuse.html",
    url: "https://www.statmuse.com/fc/match/8-30-2026-laz-vs-gen-112090",
    home: { slug: "lazio", abbr: "LAZ" },
    away: { slug: "genoa", abbr: "GEN" },
    mvp: { team: "lazio", player: "Nuno Tavares" }
  }
];

const formationNames = {
  fourThreeThree: "4-3-3",
  fourTwoThreeOne: "4-2-3-1",
  threeFiveTwo: "3-5-2",
  threeFourTwoOne: "3-4-2-1"
};
const canonicalNames = new Map([
  ["Nicolás Paz", "Nico Paz"],
  ["Yann Aurel Bisseck", "Yann Bisseck"],
  ["Francesco Esposito", "Pio Esposito"]
]);
const canonicalName = value => canonicalNames.get(value) || value;
const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const stat = (lookup, key, fallback = null) => lookup[key]?.value ?? fallback;
const eventMinute = event => event.clock.minute >= 90 ? 90 : event.clock.minute + 1;

const teamStats = team => {
  const lookup = team.stats.team.statsLookup[team.stats.team.statsLookupKey];
  return {
    possessionPct: Math.round(stat(lookup, "PossessionPercentage", 0) * 100),
    expectedGoals: stat(lookup, "ExpectedGoals"),
    expectedAssists: stat(lookup, "ExpectedAssists"),
    shots: stat(lookup, "Shots"),
    shotsOnTarget: stat(lookup, "ShotsOnTarget"),
    shotsOffTarget: stat(lookup, "ShotsOffTarget"),
    shotsBlocked: stat(lookup, "BlockedScoringAttempts"),
    hitWoodwork: stat(lookup, "HitWoodwork"),
    bigChancesMissed: stat(lookup, "BigChancesMissed"),
    corners: stat(lookup, "Corners"),
    passesCompleted: stat(lookup, "PassesCompleted"),
    passesAttempted: stat(lookup, "PassesAttempted"),
    passAccuracyPct: Math.round(stat(lookup, "PassCompletionPercentage", 0) * 100),
    keyPasses: stat(lookup, "KeyPasses"),
    tackles: stat(lookup, "Tackles"),
    tacklesWon: stat(lookup, "TacklesWon"),
    interceptions: stat(lookup, "Interceptions"),
    clearances: stat(lookup, "Clearances"),
    recoveries: stat(lookup, "BallRecoveries"),
    fouls: stat(lookup, "FoulsCommitted"),
    yellowCards: stat(lookup, "YellowCards"),
    secondYellowCards: 0,
    straightRedCards: stat(lookup, "RedCards", 0),
    penaltiesFor: stat(lookup, "PenaltiesTaken", 0),
    penaltiesAgainst: stat(lookup, "PenaltiesCommitted", 0),
    duelsWon: stat(lookup, "DuelsWon"),
    aerialsWon: stat(lookup, "AerialsWon"),
    goalkeeperSaves: stat(lookup, "Saves")
  };
};

const appearedPlayers = (rootData, team) => {
  const roster = new Map(team.players.map(item => [item.playerId, item]));
  const stats = team.stats.player;
  return stats.splits[0].splits.map(split => {
    const lookup = stats.statsLookup[split.statsLookupKey];
    const identity = rootData.players[String(split.playerId)];
    const name = canonicalName(identity.longName);
    const rosterEntry = roster.get(split.playerId);
    return {
      playerId: slug(name),
      player: name,
      starter: Boolean(rosterEntry?.starter),
      minutes: stat(lookup, "MinutesPlayed"),
      rating: Number(stat(lookup, "Rating")?.toFixed(1)),
      goals: stat(lookup, "Goals", 0),
      assists: stat(lookup, "Assists", 0),
      shotsOnTarget: stat(lookup, "ShotsOnTarget"),
      expectedGoals: stat(lookup, "ExpectedGoals"),
      shots: stat(lookup, "Shots")
    };
  });
};

const playerOverlay = (rootData, team) => {
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
};

const mvpSource = results.sources.find(item => item.url === mvpUrl && item.sourceType === "official-player-of-the-match");
if (!mvpSource) throw new Error("Fonte ufficiale MVP non dichiarata");
mvpSource.retrievedAt = retrievedAt;
results.retrievedAt = retrievedAt;

for (const config of games) {
  const rootData = parseStatmuseGame(path.join(root, "tmp", config.file));
  const game = rootData.gameData;
  const teamById = new Map([
    [game.homeTeam.teamId, config.home.slug],
    [game.awayTeam.teamId, config.away.slug]
  ]);
  const playerName = id => canonicalName(rootData.players[String(id)]?.longName || null);
  const playerId = id => playerName(id) ? slug(playerName(id)) : null;
  const events = rootData.playByPlay.events;
  const substitutions = events.filter(event => event.type === "substitution").map(event => ({
    team: teamById.get(event.teamId),
    minute: eventMinute(event),
    playerIn: playerName(event.subbedInPlayerId),
    playerInId: playerId(event.subbedInPlayerId),
    playerOut: playerName(event.subbedOutPlayerId),
    playerOutId: playerId(event.subbedOutPlayerId)
  }));
  const scorers = events.filter(event => event.type === "goal").map(event => ({
    team: teamById.get(event.teamId),
    playerId: playerId(event.playerId),
    player: playerName(event.playerId),
    minute: eventMinute(event),
    assistPlayerId: event.assistPlayerId ? playerId(event.assistPlayerId) : null,
    assist: event.assistPlayerId ? playerName(event.assistPlayerId) : null
  }));
  const bookings = events.filter(event => event.type === "booking").map(event => ({
    team: teamById.get(event.teamId),
    playerId: playerId(event.playerId),
    player: playerName(event.playerId),
    minute: eventMinute(event),
    card: event.bookingType === "yellowCard" ? "yellow" : event.bookingType
  }));
  const homePlayers = appearedPlayers(rootData, game.homeTeam);
  const awayPlayers = appearedPlayers(rootData, game.awayTeam);
  const halfScore = team => team.lineScore.periods.find(period => period.period === "firstHalf")?.score ?? null;
  const result = {
    matchId: config.matchId,
    status: "finished",
    score: { home: game.homeTeam.score, away: game.awayTeam.score },
    halfTimeScore: { home: halfScore(game.homeTeam), away: halfScore(game.awayTeam) },
    attendance: null,
    weatherCelsius: game.weather?.temperatureFahrenheit == null ? null : Math.round((game.weather.temperatureFahrenheit - 32) * 5 / 9),
    formations: { home: formationNames[game.homeTeam.formation] || null, away: formationNames[game.awayTeam.formation] || null },
    scorers,
    bookings,
    substitutions,
    didNotPlay: config.didNotPlay || { home: [], away: [] },
    teamStats: { home: teamStats(game.homeTeam), away: teamStats(game.awayTeam) },
    playerStats: { home: homePlayers, away: awayPlayers },
    mvp: { team: config.mvp.team, playerId: slug(config.mvp.player), player: config.mvp.player, sourceUrl: mvpUrl },
    sourceUrl: config.url
  };
  const mvpSide = config.mvp.team === config.home.slug ? homePlayers : awayPlayers;
  if (!mvpSide.some(player => player.playerId === result.mvp.playerId)) throw new Error(`MVP non riconciliato: ${config.matchId}`);
  const source = { provider: "StatMuse", sourceType: "match-report-stats", url: config.url, retrievedAt };
  const sourceIndex = results.sources.findIndex(item => item.url === config.url);
  if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
  const resultIndex = results.matches.findIndex(item => item.matchId === config.matchId);
  if (resultIndex >= 0) results.matches[resultIndex] = result; else results.matches.push(result);
  const overlay = [config.url, config.home.abbr, playerOverlay(rootData, game.homeTeam), config.away.abbr, playerOverlay(rootData, game.awayTeam)];
  const overlayIndex = playerStats.matches.findIndex(item => item[0] === config.url);
  if (overlayIndex >= 0) playerStats.matches[overlayIndex] = overlay; else playerStats.matches.push(overlay);
}

playerStats.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(playerStatsPath, `${JSON.stringify(playerStats)}\n`);
console.log(`Aggiornati ${games.length} risultati finali del 30 agosto 2026.`);
