"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseStatmuseGame } = require("./parse-statmuse-game");

const formationNames = {
  fourThreeThree: "4-3-3",
  fourThreeTwoOne: "4-3-2-1",
  fourTwoThreeOne: "4-2-3-1",
  fourFourOneOne: "4-4-1-1",
  fourFourTwo: "4-4-2",
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
  ["André-Frank Zambo Anguissa", "Frank Anguissa"],
  ["Matteo Chichella", "Matteo Cichella"],
  ["Kialonda", "Kialonda Gaspar"],
  ["Amar Ahmed", "Amar Fatah"],
  ["Oliver Nielsen", "Oliver Provstgaard"],
  ["Vakoun Bayo", "Bayo Youssouf"]
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

function squadResolver(root, teamId) {
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
    expectedGoals: displayedStat(lookup, "ExpectedGoals"),
    expectedAssists: displayedStat(lookup, "ExpectedAssists"),
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

function appearedPlayers(rootData, team, resolvePlayer) {
  const roster = new Map(team.players.map(item => [item.playerId, item]));
  const stats = team.stats.player;
  return stats.splits.flatMap(group => group.splits)
    .filter(split => stat(stats.statsLookup[split.statsLookupKey], "GamesPlayed", 0) > 0)
    .map(split => {
      const lookup = stats.statsLookup[split.statsLookupKey];
      const resolved = resolvePlayer(rootData.players[String(split.playerId)].longName);
      const row = {
        playerId: resolved.id,
        player: resolved.name,
        starter: Boolean(roster.get(split.playerId)?.starter),
        minutes: stat(lookup, "MinutesPlayed"),
        rating: displayedStat(lookup, "Rating"),
        goals: stat(lookup, "Goals", 0),
        assists: stat(lookup, "Assists", 0),
        shots: stat(lookup, "Shots"),
        shotsOnTarget: stat(lookup, "ShotsOnTarget"),
        expectedGoals: displayedStat(lookup, "ExpectedGoals"),
        foulsCommitted: stat(lookup, "FoulsCommitted"),
        foulsWon: stat(lookup, "FoulsDrawn")
      };
      for (const field of ["minutes", "goals", "assists", "shots", "shotsOnTarget", "expectedGoals", "foulsCommitted", "foulsWon"]) {
        assert(Number.isFinite(row[field]), `${resolved.name}: ${field} mancante`);
      }
      return row;
    });
}

function didNotPlayPlayers(rootData, team, resolvePlayer, appeared) {
  const appearedIds = new Set(appeared.map(player => player.playerId));
  return team.players
    .filter(player => !player.starter)
    .map(player => rootData.players[String(player.playerId)] ? resolvePlayer(rootData.players[String(player.playerId)].longName) : null)
    .filter(player => player && !appearedIds.has(player.id))
    .map(player => ({ playerId: player.id, player: player.name }));
}

function importStatmuseResult({ root, config }) {
  const rootData = parseStatmuseGame(path.join(root, "tmp", config.file));
  const game = rootData.gameData;
  assert.equal(game.gameStatus, "played", `${config.matchId}: referto non finale`);
  const homeResolve = squadResolver(root, config.home.slug);
  const awayResolve = squadResolver(root, config.away.slug);
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
  const didNotPlay = {
    home: didNotPlayPlayers(rootData, game.homeTeam, homeResolve, homePlayers),
    away: didNotPlayPlayers(rootData, game.awayTeam, awayResolve, awayPlayers)
  };
  const resultTeamStats = { home: teamStats(game.homeTeam), away: teamStats(game.awayTeam) };
  for (const [side, rows] of [["home", homePlayers], ["away", awayPlayers]]) {
    const sum = field => rows.reduce((total, row) => total + row[field], 0);
    assert.equal(sum("shots"), resultTeamStats[side].shots, `${config.matchId} ${side}: tiri non riconciliati`);
    assert.equal(sum("shotsOnTarget"), resultTeamStats[side].shotsOnTarget, `${config.matchId} ${side}: tiri in porta non riconciliati`);
    assert.equal(sum("foulsCommitted"), resultTeamStats[side].fouls, `${config.matchId} ${side}: falli non riconciliati`);
  }
  const halfScore = team => team.lineScore.periods.find(period => period.period === "firstHalf")?.score ?? null;
  return {
    result: {
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
      didNotPlay,
      teamStats: resultTeamStats,
      playerStats: { home: homePlayers, away: awayPlayers },
      coverage: {
        teamStats: "complete",
        playerStats: "complete",
        participation: "available",
        bookings: "complete",
        substitutions: "complete",
        note: "Referto StatMuse completo: statistiche di squadra e calciatori, impiego, cartellini e sostituzioni disponibili."
      },
      mvp: null,
      sourceUrl: config.url
    },
    overlay: [config.url, config.home.abbr, homePlayers.map(row => [row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon]), config.away.abbr, awayPlayers.map(row => [row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon])]
  };
}

module.exports = { importStatmuseResult };
