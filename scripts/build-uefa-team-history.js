"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const champions = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-history-2023-26.json"), "utf8"));
const secondary = JSON.parse(fs.readFileSync(path.join(root, "data/sources/uefa-secondary-history-2023-26.json"), "utf8"));
const teamMap = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-team-history-map-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const historyOutputPath = path.join(root, "data/normalized/uefa-europe-history-2023-26.json");
const profilesOutputPath = path.join(root, "data/normalized/uefa-team-history-2026-27.json");

const seasons = ["2023-24", "2024-25", "2025-26"];
const seasonWeights = new Map([["2023-24", 0.6], ["2024-25", 0.8], ["2025-26", 1]]);
const competitions = new Map([
  ["ucl", { name: "Champions League", weight: 1, expected: 503 }],
  ["uel", { name: "Europa League", weight: 0.78, expected: 519 }],
  ["uecl", { name: "Conference League", weight: 0.62, expected: 447 }]
]);
const fail = message => { throw new Error(`Storico europeo UEFA: ${message}`); };
const round = value => value == null ? null : Math.round(value * 100) / 100;
const emptyStats = () => ({ matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
const addMatch = (stats, goalsFor, goalsAgainst) => {
  stats.matches += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) { stats.wins += 1; stats.points += 3; }
  else if (goalsFor === goalsAgainst) { stats.draws += 1; stats.points += 1; }
  else stats.losses += 1;
};
const finishStats = stats => ({
  matches: stats.matches,
  wins: stats.wins,
  draws: stats.draws,
  losses: stats.losses,
  goalsFor: stats.goalsFor,
  goalsAgainst: stats.goalsAgainst,
  pointsPerMatch: stats.matches ? round(stats.points / stats.matches) : null,
  goalsForPerMatch: stats.matches ? round(stats.goalsFor / stats.matches) : null,
  goalsAgainstPerMatch: stats.matches ? round(stats.goalsAgainst / stats.matches) : null,
  goalDifferencePerMatch: stats.matches ? round((stats.goalsFor - stats.goalsAgainst) / stats.matches) : null
});

const matches = [
  ...champions.matches.map(match => ({ ...match, competitionId: 1, competitionCode: "ucl", competition: "UEFA Champions League" })),
  ...secondary.matches
].sort((a, b) => a.date.localeCompare(b.date) || a.competitionId - b.competitionId || a.id.localeCompare(b.id));

if (matches.length !== 1469) fail(`attese 1469 gare, trovate ${matches.length}`);
const matchIds = new Set();
const competitionCounts = new Map();
for (const match of matches) {
  if (!match.id || matchIds.has(match.id)) fail(`ID duplicato: ${match.id || "N/D"}`);
  matchIds.add(match.id);
  if (!competitions.has(match.competitionCode) || !seasons.includes(match.season)) fail(`${match.id}: competizione o stagione non valida`);
  if (!Number.isInteger(match.score90?.home) || !Number.isInteger(match.score90?.away)) fail(`${match.id}: risultato nei 90 minuti mancante`);
  competitionCounts.set(match.competitionCode, (competitionCounts.get(match.competitionCode) || 0) + 1);
}
for (const [code, config] of competitions) if (competitionCounts.get(code) !== config.expected) fail(`${code}: attese ${config.expected} gare, trovate ${competitionCounts.get(code) || 0}`);

const calendarTeams = new Set(calendar.teams);
const mappedNames = new Set(), mappedIds = new Set();
for (const item of teamMap.teams) {
  if (!calendarTeams.has(item.team) || mappedNames.has(item.team)) fail(`mappa non allineata: ${item.team}`);
  mappedNames.add(item.team);
  if (item.uefaTeamId != null) {
    if (mappedIds.has(item.uefaTeamId)) fail(`UEFA team ID duplicato: ${item.uefaTeamId}`);
    mappedIds.add(item.uefaTeamId);
    if (!matches.some(match => match.homeTeam.id === item.uefaTeamId || match.awayTeam.id === item.uefaTeamId)) fail(`${item.team}: UEFA team ID assente dall'archivio europeo`);
  }
}
if (mappedNames.size !== calendarTeams.size || [...calendarTeams].some(team => !mappedNames.has(team))) fail("mappa incompleta rispetto al calendario");

const contextStats = new Map();
for (const match of matches) {
  for (const [team, goalsFor, goalsAgainst] of [[match.homeTeam, match.score90.home, match.score90.away], [match.awayTeam, match.score90.away, match.score90.home]]) {
    const key = `${match.season}|${match.competitionCode}|${team.id}`;
    const stats = contextStats.get(key) || emptyStats();
    addMatch(stats, goalsFor, goalsAgainst);
    contextStats.set(key, stats);
  }
}

const profiles = teamMap.teams.map(item => {
  const teamMatches = item.uefaTeamId == null ? [] : matches.filter(match => match.homeTeam.id === item.uefaTeamId || match.awayTeam.id === item.uefaTeamId);
  const overall = emptyStats(), home = emptyStats(), away = emptyStats();
  const competitionStats = new Map([...competitions.keys()].map(code => [code, emptyStats()]));
  let rawWeightedPoints = 0, adjustedPoints = 0, recencyDenominator = 0, opponentPpgSum = 0;
  for (const match of teamMatches) {
    const isHome = match.homeTeam.id === item.uefaTeamId;
    const goalsFor = isHome ? match.score90.home : match.score90.away;
    const goalsAgainst = isHome ? match.score90.away : match.score90.home;
    const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
    const seasonWeight = seasonWeights.get(match.season);
    const levelWeight = competitions.get(match.competitionCode).weight;
    const opponentId = isHome ? match.awayTeam.id : match.homeTeam.id;
    const opponentStats = contextStats.get(`${match.season}|${match.competitionCode}|${opponentId}`);
    addMatch(overall, goalsFor, goalsAgainst);
    addMatch(isHome ? home : away, goalsFor, goalsAgainst);
    addMatch(competitionStats.get(match.competitionCode), goalsFor, goalsAgainst);
    rawWeightedPoints += points * seasonWeight;
    adjustedPoints += points * seasonWeight * levelWeight;
    recencyDenominator += seasonWeight;
    opponentPpgSum += opponentStats.points / opponentStats.matches;
  }
  const bySeason = seasons.map(season => {
    const seasonMatches = teamMatches.filter(match => match.season === season);
    const stats = emptyStats();
    let levelAdjustedPoints = 0;
    for (const match of seasonMatches) {
      const isHome = match.homeTeam.id === item.uefaTeamId;
      const goalsFor = isHome ? match.score90.home : match.score90.away;
      const goalsAgainst = isHome ? match.score90.away : match.score90.home;
      const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
      addMatch(stats, goalsFor, goalsAgainst);
      levelAdjustedPoints += points * competitions.get(match.competitionCode).weight;
    }
    return { season, ...finishStats(stats), levelAdjustedPointsPerMatch: seasonMatches.length ? round(levelAdjustedPoints / seasonMatches.length) : null };
  });
  const availableSeasons = bySeason.filter(stats => stats.matches > 0);
  const progressionDelta = availableSeasons.length >= 2 ? round(availableSeasons.at(-1).levelAdjustedPointsPerMatch - availableSeasons[0].levelAdjustedPointsPerMatch) : null;
  const progressionLabel = progressionDelta == null ? "N/D" : progressionDelta >= 0.25 ? "in crescita" : progressionDelta <= -0.25 ? "in calo" : "stabile";
  const recentMatches = teamMatches.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 10).reverse();
  const recentStats = emptyStats();
  for (const match of recentMatches) {
    const isHome = match.homeTeam.id === item.uefaTeamId;
    addMatch(recentStats, isHome ? match.score90.home : match.score90.away, isHome ? match.score90.away : match.score90.home);
  }
  return {
    team: item.team,
    uefaTeamId: item.uefaTeamId,
    coverage: teamMatches.length >= 15 ? "sufficient" : teamMatches.length ? "limited" : "unavailable",
    seasonsPlayed: availableSeasons.length,
    competitionsPlayed: [...competitions.entries()].filter(([code]) => competitionStats.get(code).matches > 0).map(([code]) => code.toUpperCase()),
    overall: finishStats(overall),
    home: finishStats(home),
    away: finishStats(away),
    recent10: finishStats(recentStats),
    recencyWeightedPointsPerMatch: recencyDenominator ? round(rawWeightedPoints / recencyDenominator) : null,
    levelAdjustedPointsPerMatch: recencyDenominator ? round(adjustedPoints / recencyDenominator) : null,
    averageOpponentPointsPerMatch: teamMatches.length ? round(opponentPpgSum / teamMatches.length) : null,
    progression: { label: progressionLabel, deltaAdjustedPointsPerMatch: progressionDelta },
    byCompetition: Object.fromEntries([...competitionStats].map(([code, stats]) => [code, finishStats(stats)])),
    bySeason
  };
}).sort((a, b) => (b.levelAdjustedPointsPerMatch ?? -1) - (a.levelAdjustedPointsPerMatch ?? -1) || a.team.localeCompare(b.team, "it"));

const sources = [
  ...champions.sources.map(item => ({ competition: "Champions League", season: item.season, url: item.publicPage })),
  ...secondary.sources.map(item => ({ competition: item.competition, season: item.season, url: item.publicPage }))
];
const summary = {
  teams: profiles.length,
  historicalMatches: matches.length,
  byCompetition: Object.fromEntries(competitionCounts),
  sufficient: profiles.filter(profile => profile.coverage === "sufficient").length,
  limited: profiles.filter(profile => profile.coverage === "limited").length,
  unavailable: profiles.filter(profile => profile.coverage === "unavailable").length
};

fs.writeFileSync(historyOutputPath, `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: champions.retrievedAt,
  seasons,
  source: { provider: "UEFA match feed", competitionCatalogUrl: secondary.competitionCatalogUrl, pages: sources },
  summary,
  matches
}, null, 2)}\n`);

fs.writeFileSync(profilesOutputPath, `${JSON.stringify({
  schemaVersion: 1,
  season: "2026-27",
  historySeasons: seasons,
  generatedAt: champions.retrievedAt,
  status: "descriptive-no-probabilities",
  source: { provider: "UEFA match feed", competitionCatalogUrl: secondary.competitionCatalogUrl, pages: sources },
  methodology: {
    resultBasis: "Tempi regolamentari",
    recencyWeights: Object.fromEntries(seasonWeights),
    competitionWeights: Object.fromEntries([...competitions].map(([code, config]) => [code, config.weight])),
    levelAdjustedMetric: "Punti per gara moltiplicati per il peso della competizione; pesi provvisori, da validare nel backtest.",
    opponentContext: "Media dei punti per partita ottenuti dagli avversari nella stessa competizione e stagione.",
    warning: "Indicatori descrittivi: non sono probabilità e non modificano ancora l'indice di forza europeo."
  },
  summary,
  teams: profiles
}, null, 2)}\n`);

console.log(`OK storico europeo UEFA: ${matches.length} gare · ${summary.sufficient} sufficienti · ${summary.limited} limitati · ${summary.unavailable} N/D`);
