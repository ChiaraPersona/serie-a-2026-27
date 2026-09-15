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
const retrievedAt = "2026-09-15";
const scoreSourceUrl = "https://sport.sky.it/calcio/serie-a/calendario-risultati";

const games = [
  {
    matchId: "cagliari-lecce-2026-27-md-03",
    file: "statmuse-complete-9-7-2026-cag-vs-lec-112103.html",
    url: "https://www.statmuse.com/fc/match/9-7-2026-cag-vs-lec-112103",
    home: { slug: "cagliari", abbr: "CAG" }, away: { slug: "lecce", abbr: "LEC" }
  },
  {
    matchId: "udinese-lazio-2026-27-md-03",
    file: "statmuse-complete-9-7-2026-udi-vs-laz-112102.html",
    url: "https://www.statmuse.com/fc/match/9-7-2026-udi-vs-laz-112102",
    home: { slug: "udinese", abbr: "UDI" }, away: { slug: "lazio", abbr: "LAZ" }
  },
  {
    matchId: "venezia-fiorentina-2026-27-md-04",
    file: "statmuse-complete-9-11-2026-ven-vs-fio-112114.html",
    url: "https://www.statmuse.com/fc/match/9-11-2026-ven-vs-fio-112114",
    home: { slug: "venezia", abbr: "VEN" }, away: { slug: "fiorentina", abbr: "FIO" }
  },
  {
    matchId: "genoa-frosinone-2026-27-md-04",
    file: "statmuse-complete-9-12-2026-gen-vs-fro-112112.html",
    url: "https://www.statmuse.com/fc/match/9-12-2026-gen-vs-fro-112112",
    home: { slug: "genoa", abbr: "GEN" }, away: { slug: "frosinone", abbr: "FRO" }
  },
  {
    matchId: "lazio-milan-2026-27-md-04",
    file: "statmuse-complete-9-12-2026-laz-vs-mil-112109.html",
    url: "https://www.statmuse.com/fc/match/9-12-2026-laz-vs-mil-112109",
    home: { slug: "lazio", abbr: "LAZ" }, away: { slug: "milan", abbr: "MIL" }
  },
  {
    matchId: "atalanta-cagliari-2026-27-md-04",
    file: "statmuse-complete-9-12-2026-ata-vs-cag-112110.html",
    url: "https://www.statmuse.com/fc/match/9-12-2026-ata-vs-cag-112110",
    home: { slug: "atalanta", abbr: "ATA" }, away: { slug: "cagliari", abbr: "CAG" }
  },
  {
    matchId: "lecce-monza-2026-27-md-04",
    file: "statmuse-complete-9-13-2026-lec-vs-mon-112116.html",
    url: "https://www.statmuse.com/fc/match/9-13-2026-lec-vs-mon-112116",
    home: { slug: "lecce", abbr: "LEC" }, away: { slug: "monza", abbr: "MON" }
  },
  {
    matchId: "napoli-bologna-2026-27-md-04",
    file: "statmuse-complete-9-13-2026-nap-vs-bol-112107.html",
    url: "https://www.statmuse.com/fc/match/9-13-2026-nap-vs-bol-112107",
    home: { slug: "napoli", abbr: "NAP" }, away: { slug: "bologna", abbr: "BOL" }
  },
  {
    matchId: "sassuolo-juventus-2026-27-md-04",
    file: "statmuse-complete-9-13-2026-sas-vs-juv-112113.html",
    url: "https://www.statmuse.com/fc/match/9-13-2026-sas-vs-juv-112113",
    home: { slug: "sassuolo", abbr: "SAS" }, away: { slug: "juventus", abbr: "JUV" }
  },
  {
    matchId: "como-parma-2026-27-md-04",
    file: "statmuse-complete-9-14-2026-com-vs-par-112115.html",
    url: "https://www.statmuse.com/fc/match/9-14-2026-com-vs-par-112115",
    home: { slug: "como", abbr: "COM" }, away: { slug: "parma", abbr: "PAR" }
  },
  {
    matchId: "torino-roma-2026-27-md-04",
    file: "statmuse-complete-9-14-2026-tor-vs-rom-112111.html",
    url: "https://www.statmuse.com/fc/match/9-14-2026-tor-vs-rom-112111",
    home: { slug: "torino", abbr: "TOR" }, away: { slug: "roma", abbr: "ROM" }
  },
  {
    matchId: "inter-udinese-2026-27-md-04",
    file: "statmuse-complete-9-14-2026-int-vs-udi-112108.html",
    url: "https://www.statmuse.com/fc/match/9-14-2026-int-vs-udi-112108",
    home: { slug: "inter", abbr: "INT" }, away: { slug: "udinese", abbr: "UDI" }
  }
];

const formationNames = {
  fourThreeThree: "4-3-3", fourThreeTwoOne: "4-3-2-1", fourTwoThreeOne: "4-2-3-1",
  fourFourOneOne: "4-4-1-1", fourFourTwo: "4-4-2", threeFiveTwo: "3-5-2",
  threeFourTwoOne: "3-4-2-1", threeFourOneTwo: "3-4-1-2", threeOneFourTwo: "3-1-4-2"
};
const canonicalNames = new Map([
  ["Nicolás Paz", "Nico Paz"], ["Leo Østigård", "Leo Østigard"],
  ["Yann Aurel Bisseck", "Yann Bisseck"], ["Francesco Esposito", "Pio Esposito"],
  ["André-Frank Zambo Anguissa", "Frank Anguissa"], ["Matteo Chichella", "Matteo Cichella"],
  ["Kialonda", "Kialonda Gaspar"], ["Amar Ahmed", "Amar Fatah"],
  ["Oliver Nielsen", "Oliver Provstgaard"], ["Vakoun Bayo", "Bayo Youssouf"]
]);
const canonicalName = value => canonicalNames.get(value) || value;
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/gi, "l").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");
const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const stat = (lookup, key, fallback = null) => lookup?.[key]?.value ?? fallback;
const displayedStat = (lookup, key, fallback = null) => {
  const displayed = lookup?.[key]?.display;
  if (displayed === undefined || displayed === null || displayed === "") return stat(lookup, key, fallback);
  const number = Number(displayed);
  return Number.isFinite(number) ? number : fallback;
};
const eventMinute = event => event.clock.minute >= 90 ? 90 : event.clock.minute + 1;

function squadResolver(teamId) {
  const team = JSON.parse(fs.readFileSync(path.join(root, `data/teams/${teamId}.json`), "utf8"));
  const byName = new Map(team.squad.map(player => [normalize(player.name), player]));
  return name => {
    const canonical = canonicalName(name);
    const exact = byName.get(normalize(canonical));
    if (exact) return { id: exact.id, name: exact.name };
    const surname = normalize(canonical.split(/\s+/).at(-1));
    const candidates = team.squad.filter(player => normalize(player.name).endsWith(surname));
    if (candidates.length === 1) return { id: candidates[0].id, name: candidates[0].name };
    return { id: slug(canonical), name: canonical };
  };
}

const teamStats = team => {
  const lookup = team.stats.team.statsLookup[team.stats.team.statsLookupKey];
  return {
    possessionPct: Math.round(stat(lookup, "PossessionPercentage", 0) * 100),
    expectedGoals: displayedStat(lookup, "ExpectedGoals"), expectedAssists: displayedStat(lookup, "ExpectedAssists"),
    shots: stat(lookup, "Shots"), shotsOnTarget: stat(lookup, "ShotsOnTarget"), shotsOffTarget: stat(lookup, "ShotsOffTarget"),
    shotsBlocked: stat(lookup, "BlockedScoringAttempts"), hitWoodwork: stat(lookup, "HitWoodwork"), bigChancesMissed: stat(lookup, "BigChancesMissed"),
    corners: stat(lookup, "Corners"), passesCompleted: stat(lookup, "PassesCompleted"), passesAttempted: stat(lookup, "PassesAttempted"),
    passAccuracyPct: Math.round(stat(lookup, "PassCompletionPercentage", 0) * 100), keyPasses: stat(lookup, "KeyPasses"),
    tackles: stat(lookup, "Tackles"), tacklesWon: stat(lookup, "TacklesWon"), interceptions: stat(lookup, "Interceptions"),
    clearances: stat(lookup, "Clearances"), recoveries: stat(lookup, "BallRecoveries"), fouls: stat(lookup, "FoulsCommitted"),
    yellowCards: stat(lookup, "YellowCards"), secondYellowCards: 0, straightRedCards: stat(lookup, "RedCards", 0),
    penaltiesFor: stat(lookup, "PenaltiesTaken", 0), penaltiesAgainst: stat(lookup, "PenaltiesCommitted", 0),
    duelsWon: stat(lookup, "DuelsWon"), aerialsWon: stat(lookup, "AerialsWon"), goalkeeperSaves: stat(lookup, "Saves")
  };
};

function appearedPlayers(rootData, team, resolvePlayer) {
  const roster = new Map(team.players.map(item => [item.playerId, item]));
  const stats = team.stats.player;
  return stats.splits.flatMap(group => group.splits).filter(split => stat(stats.statsLookup[split.statsLookupKey], "GamesPlayed", 0) > 0).map(split => {
    const lookup = stats.statsLookup[split.statsLookupKey];
    const resolved = resolvePlayer(rootData.players[String(split.playerId)].longName);
    const row = {
      playerId: resolved.id, player: resolved.name, starter: Boolean(roster.get(split.playerId)?.starter),
      minutes: stat(lookup, "MinutesPlayed"), rating: displayedStat(lookup, "Rating"), goals: stat(lookup, "Goals", 0),
      assists: stat(lookup, "Assists", 0), shots: stat(lookup, "Shots"), shotsOnTarget: stat(lookup, "ShotsOnTarget"),
      expectedGoals: displayedStat(lookup, "ExpectedGoals"), foulsCommitted: stat(lookup, "FoulsCommitted"), foulsWon: stat(lookup, "FoulsDrawn")
    };
    for (const field of ["minutes", "goals", "assists", "shots", "shotsOnTarget", "expectedGoals", "foulsCommitted", "foulsWon"]) {
      assert(Number.isFinite(row[field]), `${resolved.name}: ${field} mancante`);
    }
    return row;
  });
}

function didNotPlayPlayers(rootData, team, resolvePlayer, appeared) {
  const appearedIds = new Set(appeared.map(player => player.playerId));
  return team.players.filter(player => !player.starter).map(player => {
    const providerPlayer = rootData.players[String(player.playerId)];
    return providerPlayer ? resolvePlayer(providerPlayer.longName) : null;
  }).filter(player => player && !appearedIds.has(player.id)).map(player => ({ playerId: player.id, player: player.name }));
}

for (const config of games) {
  const rootData = parseStatmuseGame(path.join(root, "tmp", config.file));
  const game = rootData.gameData;
  assert.equal(game.gameStatus, "played", `${config.matchId}: referto non finale`);
  const homeResolve = squadResolver(config.home.slug);
  const awayResolve = squadResolver(config.away.slug);
  const resolverByTeamId = new Map([[game.homeTeam.teamId, homeResolve], [game.awayTeam.teamId, awayResolve]]);
  const slugByTeamId = new Map([[game.homeTeam.teamId, config.home.slug], [game.awayTeam.teamId, config.away.slug]]);
  const resolveEventPlayer = (teamId, providerId) => providerId ? resolverByTeamId.get(teamId)(rootData.players[String(providerId)]?.longName) : null;
  const events = rootData.playByPlay.events;
  const substitutions = events.filter(event => event.type === "substitution").map(event => {
    const playerIn = resolveEventPlayer(event.teamId, event.subbedInPlayerId);
    const playerOut = resolveEventPlayer(event.teamId, event.subbedOutPlayerId);
    return { team: slugByTeamId.get(event.teamId), minute: eventMinute(event), playerIn: playerIn.name, playerInId: playerIn.id, playerOut: playerOut.name, playerOutId: playerOut.id };
  });
  const rawScorers = events.filter(event => event.type === "goal").map(event => {
    const player = resolveEventPlayer(event.teamId, event.playerId);
    const assist = resolveEventPlayer(event.teamId, event.assistPlayerId);
    return { team: slugByTeamId.get(event.teamId), playerId: player.id, player: player.name, minute: eventMinute(event), assistPlayerId: assist?.id || null, assist: assist?.name || null, ...(event.isOwnGoal ? { ownGoal: true } : {}) };
  });
  const scorers = [...rawScorers.reduce((unique, scorer) => {
    const key = `${scorer.team}|${scorer.playerId}|${scorer.minute}`;
    const previous = unique.get(key);
    unique.set(key, previous?.assist ? previous : scorer);
    return unique;
  }, new Map()).values()];
  const bookings = events.filter(event => event.type === "booking").map(event => {
    const player = resolveEventPlayer(event.teamId, event.playerId);
    return { team: slugByTeamId.get(event.teamId), playerId: player.id, player: player.name, minute: eventMinute(event), card: event.bookingType === "yellowCard" ? "yellow" : event.bookingType };
  });
  const homePlayers = appearedPlayers(rootData, game.homeTeam, homeResolve);
  const awayPlayers = appearedPlayers(rootData, game.awayTeam, awayResolve);
  const didNotPlay = config.file.includes("9-14-2026") ? {
    home: didNotPlayPlayers(rootData, game.homeTeam, homeResolve, homePlayers),
    away: didNotPlayPlayers(rootData, game.awayTeam, awayResolve, awayPlayers)
  } : { home: [], away: [] };
  const resultTeamStats = { home: teamStats(game.homeTeam), away: teamStats(game.awayTeam) };
  for (const [side, rows] of [["home", homePlayers], ["away", awayPlayers]]) {
    const sum = field => rows.reduce((total, row) => total + row[field], 0);
    assert.equal(sum("shots"), resultTeamStats[side].shots, `${config.matchId} ${side}: tiri non riconciliati`);
    assert.equal(sum("shotsOnTarget"), resultTeamStats[side].shotsOnTarget, `${config.matchId} ${side}: tiri in porta non riconciliati`);
    assert.equal(sum("foulsCommitted"), resultTeamStats[side].fouls, `${config.matchId} ${side}: falli non riconciliati`);
  }
  const halfScore = team => team.lineScore.periods.find(period => period.period === "firstHalf")?.score ?? null;
  const result = {
    matchId: config.matchId, status: "finished", score: { home: game.homeTeam.score, away: game.awayTeam.score },
    halfTimeScore: { home: halfScore(game.homeTeam), away: halfScore(game.awayTeam) }, attendance: null,
    weatherCelsius: game.weather?.temperatureFahrenheit == null ? null : Math.round((game.weather.temperatureFahrenheit - 32) * 5 / 9),
    formations: { home: formationNames[game.homeTeam.formation] || null, away: formationNames[game.awayTeam.formation] || null },
    scorers, bookings, substitutions, didNotPlay, teamStats: resultTeamStats,
    playerStats: { home: homePlayers, away: awayPlayers }, mvp: null, sourceUrl: config.url
  };
  for (const source of [
    { provider: "StatMuse", sourceType: "match-report-stats", url: config.url, retrievedAt },
    { provider: "Sky Sport", sourceType: "results-index", url: scoreSourceUrl, retrievedAt }
  ]) {
    const sourceIndex = results.sources.findIndex(item => item.url === source.url && item.provider === source.provider);
    if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
  }
  const resultIndex = results.matches.findIndex(item => item.matchId === config.matchId);
  if (resultIndex >= 0) results.matches[resultIndex] = result; else results.matches.push(result);
  const overlay = [config.url, config.home.abbr, homePlayers.map(row => [row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon]), config.away.abbr, awayPlayers.map(row => [row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon])];
  const overlayIndex = overlays.matches.findIndex(item => item[0] === config.url);
  if (overlayIndex >= 0) overlays.matches[overlayIndex] = overlay; else overlays.matches.push(overlay);
}

results.retrievedAt = retrievedAt;
overlays.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(overlaysPath, `${JSON.stringify(overlays)}\n`);
console.log(`Completati ${games.length} referti: 2 della 3a giornata e 10 della 4a giornata.`);
