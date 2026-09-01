"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-history-2023-26.json");
const mapPath = path.join(root, "data/sources/champions-team-history-map-2026-27.json");
const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const historyOutputPath = path.join(root, "data/normalized/champions-history-2023-26.json");
const profilesOutputPath = path.join(root, "data/normalized/champions-team-history-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const teamMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));

const seasons = ["2023-24", "2024-25", "2025-26"];
const expectedBySeason = new Map([["2023-24", 125], ["2024-25", 189], ["2025-26", 189]]);
const seasonWeights = new Map([["2023-24", 0.6], ["2024-25", 0.8], ["2025-26", 1]]);
const fail = message => { throw new Error(`Storico Champions: ${message}`); };
const round = value => value == null ? null : Math.round(value * 100) / 100;
const emptyStats = () => ({ matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
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
const addMatch = (stats, goalsFor, goalsAgainst) => {
  stats.matches += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) { stats.wins += 1; stats.points += 3; }
  else if (goalsFor === goalsAgainst) { stats.draws += 1; stats.points += 1; }
  else stats.losses += 1;
};

if (source.schemaVersion !== 1 || source.competitionId !== 1 || !Array.isArray(source.matches)) fail("fonte non valida");
if (!Array.isArray(teamMap.teams) || teamMap.teams.length !== 36) fail("mappa delle 36 squadre non valida");
const ids = new Set();
const seasonCounts = new Map();
for (const match of source.matches) {
  if (!match.id || ids.has(match.id)) fail(`ID duplicato: ${match.id || "N/D"}`);
  ids.add(match.id);
  if (!expectedBySeason.has(match.season)) fail(`${match.id}: stagione non prevista`);
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(match.date || "")) fail(`${match.id}: data non valida`);
  if (!match.homeTeam?.id || !match.awayTeam?.id || match.homeTeam.id === match.awayTeam.id) fail(`${match.id}: squadre non valide`);
  if (!Number.isInteger(match.score90?.home) || !Number.isInteger(match.score90?.away)) fail(`${match.id}: risultato a 90 minuti mancante`);
  seasonCounts.set(match.season, (seasonCounts.get(match.season) || 0) + 1);
}
for (const [season, expected] of expectedBySeason) if (seasonCounts.get(season) !== expected) fail(`${season}: attese ${expected} gare, trovate ${seasonCounts.get(season) || 0}`);

const seasonTeamStats = new Map();
for (const match of source.matches) {
  for (const [team, goalsFor, goalsAgainst] of [[match.homeTeam, match.score90.home, match.score90.away], [match.awayTeam, match.score90.away, match.score90.home]]) {
    const key = `${match.season}|${team.id}`;
    const stats = seasonTeamStats.get(key) || emptyStats();
    addMatch(stats, goalsFor, goalsAgainst);
    seasonTeamStats.set(key, stats);
  }
}
const tournamentPpgBySeason = new Map(seasons.map(season => {
  const matches = source.matches.filter(match => match.season === season);
  const points = matches.reduce((sum, match) => sum + (match.score90.home === match.score90.away ? 2 : 3), 0);
  return [season, round(points / (matches.length * 2))];
}));

const calendarTeams = new Set(calendar.teams);
const mappedNames = new Set();
const mappedIds = new Set();
for (const item of teamMap.teams) {
  if (!calendarTeams.has(item.team) || mappedNames.has(item.team)) fail(`mappa non allineata: ${item.team}`);
  mappedNames.add(item.team);
  if (item.uefaTeamId != null) {
    if (mappedIds.has(item.uefaTeamId)) fail(`UEFA team ID duplicato: ${item.uefaTeamId}`);
    mappedIds.add(item.uefaTeamId);
    if (!source.matches.some(match => match.homeTeam.id === item.uefaTeamId || match.awayTeam.id === item.uefaTeamId)) fail(`${item.team}: UEFA team ID non presente nello storico`);
  }
}
if ([...calendarTeams].some(team => !mappedNames.has(team))) fail("mappa incompleta rispetto al calendario");

const profiles = teamMap.teams.map(item => {
  const teamMatches = item.uefaTeamId == null ? [] : source.matches.filter(match => match.homeTeam.id === item.uefaTeamId || match.awayTeam.id === item.uefaTeamId);
  const overall = emptyStats(), home = emptyStats(), away = emptyStats(), weighted = { points: 0, matches: 0 };
  let opponentPpgSum = 0;
  for (const match of teamMatches) {
    const isHome = match.homeTeam.id === item.uefaTeamId;
    const goalsFor = isHome ? match.score90.home : match.score90.away;
    const goalsAgainst = isHome ? match.score90.away : match.score90.home;
    const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
    const weight = seasonWeights.get(match.season);
    const opponentId = isHome ? match.awayTeam.id : match.homeTeam.id;
    addMatch(overall, goalsFor, goalsAgainst);
    addMatch(isHome ? home : away, goalsFor, goalsAgainst);
    weighted.points += points * weight;
    weighted.matches += weight;
    opponentPpgSum += seasonTeamStats.get(`${match.season}|${opponentId}`).points / seasonTeamStats.get(`${match.season}|${opponentId}`).matches;
  }
  const bySeason = seasons.map(season => {
    const stats = seasonTeamStats.get(`${season}|${item.uefaTeamId}`);
    return { season, ...(stats ? finishStats(stats) : finishStats(emptyStats())) };
  });
  const availableSeasons = bySeason.filter(stats => stats.matches > 0);
  const progressionDelta = availableSeasons.length >= 2 ? round(availableSeasons.at(-1).pointsPerMatch - availableSeasons[0].pointsPerMatch) : null;
  const progressionLabel = progressionDelta == null ? "N/D" : progressionDelta >= 0.25 ? "in crescita" : progressionDelta <= -0.25 ? "in calo" : "stabile";
  const recent = teamMatches.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 10).reverse();
  const recentStats = emptyStats();
  for (const match of recent) {
    const isHome = match.homeTeam.id === item.uefaTeamId;
    addMatch(recentStats, isHome ? match.score90.home : match.score90.away, isHome ? match.score90.away : match.score90.home);
  }
  return {
    team: item.team,
    uefaTeamId: item.uefaTeamId,
    coverage: teamMatches.length >= 15 ? "sufficient" : teamMatches.length ? "limited" : "unavailable",
    seasonsPlayed: availableSeasons.length,
    overall: finishStats(overall),
    home: finishStats(home),
    away: finishStats(away),
    recent10: finishStats(recentStats),
    weightedPointsPerMatch: weighted.matches ? round(weighted.points / weighted.matches) : null,
    averageOpponentPointsPerMatch: teamMatches.length ? round(opponentPpgSum / teamMatches.length) : null,
    tournamentAveragePointsPerMatch: teamMatches.length ? round(teamMatches.reduce((sum, match) => sum + tournamentPpgBySeason.get(match.season), 0) / teamMatches.length) : null,
    progression: { label: progressionLabel, deltaPointsPerMatch: progressionDelta },
    bySeason
  };
}).sort((a, b) => (b.weightedPointsPerMatch ?? -1) - (a.weightedPointsPerMatch ?? -1) || a.team.localeCompare(b.team, "it"));

fs.writeFileSync(historyOutputPath, `${JSON.stringify({
  schemaVersion: 1,
  competition: source.competition,
  seasons,
  generatedAt: source.retrievedAt,
  source: { provider: source.provider, sources: source.sources, resultPolicy: source.resultPolicy },
  summary: { matches: source.matches.length, bySeason: Object.fromEntries(seasonCounts) },
  matches: source.matches
}, null, 2)}\n`);

fs.writeFileSync(profilesOutputPath, `${JSON.stringify({
  schemaVersion: 1,
  season: "2026-27",
  historySeasons: seasons,
  generatedAt: source.retrievedAt,
  status: "descriptive-no-probabilities",
  source: {
    provider: source.provider,
    pages: source.sources.map(item => ({ season: item.season, url: item.publicPage }))
  },
  methodology: {
    resultBasis: "Tempi regolamentari",
    recencyWeights: Object.fromEntries(seasonWeights),
    opponentContext: "Media dei punti per partita ottenuti nel torneo dagli avversari affrontati nella stessa stagione.",
    warning: "Indicatori descrittivi: non sono probabilità e non modificano ancora l'indice di forza europeo."
  },
  summary: {
    teams: profiles.length,
    sufficient: profiles.filter(profile => profile.coverage === "sufficient").length,
    limited: profiles.filter(profile => profile.coverage === "limited").length,
    unavailable: profiles.filter(profile => profile.coverage === "unavailable").length,
    historicalMatches: source.matches.length
  },
  teams: profiles
}, null, 2)}\n`);

console.log(`OK profili storici Champions: ${source.matches.length} gare · ${profiles.filter(profile => profile.coverage === "sufficient").length} sufficienti · ${profiles.filter(profile => profile.coverage === "limited").length} limitati · ${profiles.filter(profile => profile.coverage === "unavailable").length} N/D`);
