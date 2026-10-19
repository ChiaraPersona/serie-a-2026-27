"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const history = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/uefa-europe-history-2023-26.json"), "utf8"));
const olderHistory = JSON.parse(fs.readFileSync(path.join(root, "data/sources/uefa-head-to-head-history-2020-23.json"), "utf8"));
const detailedHistory = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-head-to-head-details-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const teamMap = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-team-history-map-2026-27.json"), "utf8"));
const outputPath = path.join(root, "data/normalized/champions-head-to-head-2026-27.json");

const fail = message => { throw new Error(`Scontri diretti Champions: ${message}`); };
const idsByTeam = new Map(teamMap.teams.map(item => [item.team, String(item.uefaTeamId)]));
const pairKey = (first, second) => [String(first), String(second)].sort().join("|");
const detailedPairs = new Map(detailedHistory.pairs.map(pair => [pairKey(...pair.teamIds), pair]));

const seasons = ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
if (history.seasons?.join("|") !== "2023-24|2024-25|2025-26" || olderHistory.seasons?.join("|") !== "2020-21|2021-22|2022-23") fail("finestra storica inattesa");
if (calendar.summary?.fixtures !== 144 || idsByTeam.size !== 36) fail("calendario o mappa squadre non validi");
if ([...idsByTeam.values()].some(id => !id || id === "null")) fail("identificativo UEFA mancante");
if (detailedHistory.schemaVersion !== 1 || detailedPairs.size !== detailedHistory.pairs.length) fail("dettagli verificati non validi o duplicati");
for (const pair of detailedHistory.pairs) {
  if (pair.teamIds.length !== 2 || pair.maximumMeetings < 1 || pair.matches.length !== pair.maximumMeetings) fail(`coppia dettagliata incompleta: ${pair.teams.join(" - ")}`);
  if (new Set(pair.matches.map(match => match.id)).size !== pair.matches.length) fail(`ID dettagliati duplicati: ${pair.teams.join(" - ")}`);
  if (pair.matches.some(match => !match.goals?.length || !Array.isArray(match.bookings) || !match.sources?.length)) fail(`eventi o fonti mancanti: ${pair.teams.join(" - ")}`);
}

const matchesByPair = new Map();
const historicalMatches = [...olderHistory.matches, ...history.matches];
const historicalIds = new Set(historicalMatches.map(match => match.id));
if (historicalIds.size !== historicalMatches.length) fail("ID duplicati tra gli archivi UEFA");
for (const match of historicalMatches) {
  if (match.status !== "finished" || match.score90?.home == null || match.score90?.away == null) continue;
  const key = pairKey(match.homeTeam.id, match.awayTeam.id);
  if (!matchesByPair.has(key)) matchesByPair.set(key, []);
  matchesByPair.get(key).push(match);
}

const fixtures = calendar.fixtures.map(fixture => {
  const homeId = idsByTeam.get(fixture.homeTeam);
  const awayId = idsByTeam.get(fixture.awayTeam);
  const detailedPair = detailedPairs.get(pairKey(homeId, awayId));
  const maximumMeetings = detailedPair?.maximumMeetings || 4;
  const availableMeetings = detailedPair?.matches || matchesByPair.get(pairKey(homeId, awayId)) || [];
  const meetings = availableMeetings
    .filter(match => match.date < fixture.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maximumMeetings);
  let homeWins = 0, draws = 0, awayWins = 0, homeGoals = 0, awayGoals = 0;
  for (const match of meetings) {
    const currentHomeWasHome = String(match.homeTeam.id) === homeId;
    const currentHomeGoals = currentHomeWasHome ? match.score90.home : match.score90.away;
    const currentAwayGoals = currentHomeWasHome ? match.score90.away : match.score90.home;
    homeGoals += currentHomeGoals;
    awayGoals += currentAwayGoals;
    if (currentHomeGoals > currentAwayGoals) homeWins += 1;
    else if (currentHomeGoals < currentAwayGoals) awayWins += 1;
    else draws += 1;
  }
  return {
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    window: detailedPair ? `${meetings.at(-1).season}–${meetings[0].season}` : "2020-21–2025-26",
    maximumMeetings,
    coverage: meetings.length ? "available" : "no-recent-meetings",
    meetings: meetings.length,
    homeWins,
    draws,
    awayWins,
    goals: { home: homeGoals, away: awayGoals },
    latestMeetingDate: meetings[0]?.date || null,
    recentMatches: meetings.map(match => ({
      id: match.id,
      season: match.season,
      date: match.date,
      competition: match.competition,
      homeTeam: match.homeTeam.shortName || match.homeTeam.name,
      awayTeam: match.awayTeam.shortName || match.awayTeam.name,
      score90: match.score90,
      goals: match.goals,
      bookings: match.bookings,
      sources: match.sources
    }))
  };
});

const output = {
  schemaVersion: 1,
  season: "2026-27",
  generatedAt: "2026-09-02",
  source: {
    provider: "UEFA match feed e referti verificati",
    details: {
      path: "data/sources/champions-head-to-head-details-2026-27.json",
      retrievedAt: detailedHistory.retrievedAt,
      pairs: detailedHistory.pairs.length
    },
    pages: [...olderHistory.sources.map(item => ({ competition: item.competition, season: item.season, url: item.publicPage })), ...history.source.pages]
  },
  method: {
    competitions: ["UEFA Champions League", "UEFA Europa League", "UEFA Conference League"],
    seasons,
    maximumMeetingsPerFixture: 4,
    detailedPairExceptions: detailedHistory.pairs.map(pair => ({ teams: pair.teams, maximumMeetings: pair.maximumMeetings, seasons: [...new Set(pair.matches.map(match => match.season))] })),
    regulationTimeOnly: true,
    note: "L'archivio generale copre i confronti UEFA dal 2020/21 al 2025/26. Le coppie verificate nel dettaglio possono estendere la finestra e mostrare fino a cinque precedenti, mantenendo fonti per marcatori e ammoniti."
  },
  summary: {
    fixtures: fixtures.length,
    fixturesWithRecentMeetings: fixtures.filter(item => item.meetings > 0).length,
    fixturesWithoutRecentMeetings: fixtures.filter(item => item.meetings === 0).length,
    recentMeetingsUsed: fixtures.reduce((total, item) => total + item.meetings, 0)
  },
  fixtures
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK H2H Champions: ${output.summary.fixturesWithRecentMeetings}/${fixtures.length} gare con precedenti recenti · ${output.summary.recentMeetingsUsed} confronti utilizzati`);
