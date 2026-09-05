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
const mvpUrl = "https://www.legaseriea.it/serie-a/awards/player-of-the-match";

const games = [
  {
    matchId: "genoa-como-2026-27-md-03",
    file: "genoa-como-statmuse.html",
    url: "https://www.statmuse.com/fc/match/9-4-2026-gen-vs-com-112105",
    officialUrl: "https://www.legaseriea.it/serie-a/news/genoa-como-2026-2027-1-4-cronaca-risultato-gol",
    home: { slug: "genoa", abbr: "GEN" },
    away: { slug: "como", abbr: "COM" },
    mvp: { team: "como", player: "Assane Diao" }
  },
  {
    matchId: "fiorentina-torino-2026-27-md-03",
    file: "fiorentina-torino-statmuse.html",
    url: "https://www.statmuse.com/fc/match/9-5-2026-fio-vs-tor-112099",
    officialUrl: "https://www.legaseriea.it/serie-a/match/fa5bd623291544e09fcf3963235095cd/fiorentina-vs-torino",
    home: { slug: "fiorentina", abbr: "FIO" },
    away: { slug: "torino", abbr: "TOR" },
    mvp: null
  },
  {
    matchId: "inter-napoli-2026-27-md-03",
    file: "inter-napoli-statmuse.html",
    url: "https://www.statmuse.com/fc/match/9-5-2026-int-vs-nap-112098",
    officialUrl: "https://www.inter.it/en/match_center/5371",
    home: { slug: "inter", abbr: "INT" },
    away: { slug: "napoli", abbr: "NAP" },
    mvp: null,
    assistOverrides: [{ player: "Lautaro Martínez", minute: 90, assist: "Manuel Akanji" }]
  }
];

const formationNames = {
  fourThreeThree: "4-3-3",
  fourTwoThreeOne: "4-2-3-1",
  threeFiveTwo: "3-5-2",
  threeFourTwoOne: "3-4-2-1",
  threeFourOneTwo: "3-4-1-2",
  threeOneFourTwo: "3-1-4-2"
};
const canonicalNames = new Map([
  ["Nicolás Paz", "Nico Paz"],
  ["Leo Østigård", "Leo Østigard"],
  ["Yann Aurel Bisseck", "Yann Bisseck"],
  ["Francesco Esposito", "Pio Esposito"],
  ["André-Frank Zambo Anguissa", "Frank Anguissa"]
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
    const name = canonicalName(rootData.players[String(split.playerId)].longName);
    return {
      playerId: slug(name),
      player: name,
      starter: Boolean(roster.get(split.playerId)?.starter),
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
  if (game.gameStatus !== "played") throw new Error(`Referto non finale: ${config.matchId}`);
  const teamById = new Map([[game.homeTeam.teamId, config.home.slug], [game.awayTeam.teamId, config.away.slug]]);
  const playerName = id => canonicalName(rootData.players[String(id)]?.longName || null);
  const playerId = id => playerName(id) ? slug(playerName(id)) : null;
  const events = rootData.playByPlay.events;
  const substitutions = events.filter(event => event.type === "substitution").map(event => ({
    team: teamById.get(event.teamId), minute: eventMinute(event), playerIn: playerName(event.subbedInPlayerId), playerInId: playerId(event.subbedInPlayerId), playerOut: playerName(event.subbedOutPlayerId), playerOutId: playerId(event.subbedOutPlayerId)
  }));
  const scorers = events.filter(event => event.type === "goal").map(event => ({
    team: teamById.get(event.teamId), playerId: playerId(event.playerId), player: playerName(event.playerId), minute: eventMinute(event), assistPlayerId: event.assistPlayerId ? playerId(event.assistPlayerId) : null, assist: event.assistPlayerId ? playerName(event.assistPlayerId) : null
  }));
  for (const override of config.assistOverrides || []) {
    const scorer = scorers.find(item => item.player === override.player && item.minute === override.minute);
    if (!scorer) throw new Error(`Assist non riconciliato: ${config.matchId}`);
    scorer.assist = override.assist;
    scorer.assistPlayerId = slug(override.assist);
  }
  const bookings = events.filter(event => event.type === "booking").map(event => ({
    team: teamById.get(event.teamId), playerId: playerId(event.playerId), player: playerName(event.playerId), minute: eventMinute(event), card: event.bookingType === "yellowCard" ? "yellow" : event.bookingType
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
    didNotPlay: { home: [], away: [] },
    teamStats: { home: teamStats(game.homeTeam), away: teamStats(game.awayTeam) },
    playerStats: { home: homePlayers, away: awayPlayers },
    mvp: config.mvp ? { team: config.mvp.team, playerId: slug(config.mvp.player), player: config.mvp.player, sourceUrl: mvpUrl } : null,
    sourceUrl: config.url
  };
  if (result.mvp) {
    const mvpSide = config.mvp.team === config.home.slug ? homePlayers : awayPlayers;
    if (!mvpSide.some(player => player.playerId === result.mvp.playerId)) throw new Error(`MVP non riconciliato: ${config.matchId}`);
  }
  for (const source of [
    { provider: "StatMuse", sourceType: "match-report-stats", url: config.url, retrievedAt },
    { provider: "Lega Serie A", sourceType: "official-match-result", url: config.officialUrl, retrievedAt }
  ]) {
    const sourceIndex = results.sources.findIndex(item => item.url === source.url);
    if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
  }
  const resultIndex = results.matches.findIndex(item => item.matchId === config.matchId);
  if (resultIndex >= 0) results.matches[resultIndex] = result; else results.matches.push(result);
  const overlay = [config.url, config.home.abbr, playerOverlay(rootData, game.homeTeam), config.away.abbr, playerOverlay(rootData, game.awayTeam)];
  const overlayIndex = playerStats.matches.findIndex(item => item[0] === config.url);
  if (overlayIndex >= 0) playerStats.matches[overlayIndex] = overlay; else playerStats.matches.push(overlay);
}

playerStats.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(playerStatsPath, `${JSON.stringify(playerStats)}\n`);
console.log("Aggiornati i primi 3 risultati finali della 3a giornata 2026/27.");
