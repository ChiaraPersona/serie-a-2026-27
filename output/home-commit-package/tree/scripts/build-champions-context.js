"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-pre-match-context-2026-27.json");
const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const predictionsPath = path.join(root, "data/normalized/champions-1x2-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-pre-match-context-2026-27.json");

const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const fail = message => { throw new Error(`Contesto Champions: ${message}`); };
const round = (value, digits = 2) => Number(value.toFixed(digits));
const dateOnly = value => value ? new Date(`${value}T12:00:00Z`) : null;

const source = readJson(sourcePath);
const calendar = readJson(calendarPath);
const predictions = readJson(predictionsPath);

if (!Array.isArray(source.teams) || source.teams.length !== 36) fail("sono richieste esattamente 36 squadre");
if (new Set(source.teams).size !== 36) fail("squadre duplicate nella fonte");
if (calendar.summary?.teams !== 36 || calendar.summary?.fixtures !== 144) fail("calendario non valido");
if (predictions.summary?.fixtures !== 144) fail("pronostici di base non validi");
const calendarTeams = new Set(calendar.teams);
for (const team of source.teams) if (!calendarTeams.has(team)) fail(`squadra estranea al calendario: ${team}`);
for (const team of calendar.teams) if (!source.teams.includes(team)) fail(`squadra priva di stato contestuale: ${team}`);

const rawTeamData = source.teamData || {};
const computeMetrics = (team, fixtureDate) => {
  const data = rawTeamData[team] || {};
  const matches = Array.isArray(data.recentDomesticMatches) ? data.recentDomesticMatches : [];
  const completed = matches.filter(match => match?.date && Number.isInteger(match.goalsFor) && Number.isInteger(match.goalsAgainst));
  const lastFive = completed.slice(-5);
  const points = lastFive.reduce((total, match) => total + (match.goalsFor > match.goalsAgainst ? 3 : match.goalsFor === match.goalsAgainst ? 1 : 0), 0);
  const lastDate = completed.length ? completed[completed.length - 1].date : null;
  const restDays = lastDate ? Math.round((dateOnly(fixtureDate) - dateOnly(lastDate)) / 86400000) : null;
  return {
    recentDomesticMatches: completed.length,
    lastFivePointsPerMatch: lastFive.length ? round(points / lastFive.length) : null,
    lastCompletedMatchDate: lastDate,
    restDays,
    matchesLast14Days: data.matchesLast14Days ?? null,
    consecutiveAwayMatches: data.consecutiveAwayMatches ?? null,
    motivation: data.motivation ?? null,
    finalDomesticMatchCompleted: data.finalDomesticMatchCompleted === true
  };
};

const firstFixtureByTeam = new Map();
for (const fixture of calendar.fixtures.filter(item => item.matchday === 1)) {
  firstFixtureByTeam.set(fixture.homeTeam, fixture);
  firstFixtureByTeam.set(fixture.awayTeam, fixture);
}
if (firstFixtureByTeam.size !== 36) fail("la prima giornata non copre tutte le squadre");

const teams = calendar.teams.map(team => {
  const fixture = firstFixtureByTeam.get(team);
  const metrics = computeMetrics(team, fixture.date);
  const status = metrics.finalDomesticMatchCompleted ? "ready-for-review" : "awaiting-final-domestic-match";
  return {
    team,
    firstChampionsFixtureId: fixture.id,
    firstChampionsDate: fixture.date,
    remainingMatchesBeforeFirstUcl: metrics.finalDomesticMatchCompleted ? 0 : source.updatePolicy.remainingDomesticMatchesPerTeam,
    status,
    metrics,
    adjustment: {
      enabled: false,
      probabilityShiftPctPoints: 0,
      reason: metrics.finalDomesticMatchCompleted
        ? "Dati descrittivi disponibili; correzione ancora disattivata in attesa di validazione."
        : "Ultima gara domestica pre-Champions ancora da acquisire."
    }
  };
});

const allTeamsComplete = teams.every(item => item.metrics.finalDomesticMatchCompleted);
const adjustmentsEnabled = source.updatePolicy.adjustmentsEnabled === true && allTeamsComplete;
const fixtures = calendar.fixtures.map(fixture => ({
  fixtureId: fixture.id,
  matchday: fixture.matchday,
  contextStatus: fixture.matchday === 1
    ? (allTeamsComplete ? "ready-for-validation" : "awaiting-final-domestic-refresh")
    : "future-refresh-required",
  probabilityStatus: adjustmentsEnabled ? "context-adjusted" : "base-only",
  adjustmentApplied: false,
  totalProbabilityShiftPctPoints: 0,
  homeTeamStatus: teams.find(item => item.team === fixture.homeTeam)?.status,
  awayTeamStatus: teams.find(item => item.team === fixture.awayTeam)?.status
}));

const output = {
  schemaVersion: 1,
  season: source.season,
  generatedAt: source.snapshotDate,
  status: allTeamsComplete ? "ready-for-validation" : "awaiting-final-domestic-match",
  source: source.source,
  updatePolicy: source.updatePolicy,
  summary: {
    teams: teams.length,
    pendingTeams: teams.filter(item => item.status === "awaiting-final-domestic-match").length,
    readyTeams: teams.filter(item => item.status === "ready-for-review").length,
    remainingMatchesPerPendingTeam: source.updatePolicy.remainingDomesticMatchesPerTeam,
    adjustedFixtures: 0,
    baseOnlyFixtures: fixtures.length,
    allTeamsComplete,
    adjustmentsEnabled
  },
  teams,
  fixtures
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK contesto Champions: ${output.summary.pendingTeams} squadre in attesa · ${output.summary.adjustedFixtures} correzioni applicate · ${fixtures.length} gare base`);
