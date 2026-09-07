"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const squads = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-registered-squads-2026-27.json"), "utf8"));
const historyMap = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-team-history-map-2026-27.json"), "utf8"));
const historyIds = new Map(historyMap.teams.map(item => [item.team, item.uefaTeamId]));

assert.equal(calendar.teamBranding.length, 36);
assert.equal(new Set(calendar.teamBranding.map(item => item.team)).size, 36);
assert.equal(new Set(calendar.teamBranding.map(item => item.logo)).size, 36);
assert.deepEqual(calendar.teamBranding.map(item => item.team).sort(), [...calendar.teams].sort());
const firstMatchday = calendar.fixtures.filter(fixture => fixture.matchday === 1);
assert.equal(firstMatchday.length, 18);
assert.equal(firstMatchday.filter(fixture => fixture.probableFormation?.status === "editorial-probable").length, 18);
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-01").probableFormation.home.formation, "4-4-2");
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-06").probableFormation.away.formation, "3-5-2");
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-18").probableFormation.away.formation, "3-4-2-1");
assert(firstMatchday.every(fixture => fixture.probableFormation.home.players === null && fixture.probableFormation.away.players === null));
assert.equal(firstMatchday.filter(fixture => fixture.refereeAssignment?.status === "assigned").length, 12);
assert.equal(firstMatchday.filter(fixture => fixture.refereeAssignment?.status === "pending").length, 6);
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-06").refereeAssignment.referee.name, "Michael Oliver");
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-05").refereeAssignment.statistics.foulsPerMatch.display, "6,75†");
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-10").refereeAssignment.statistics.penaltiesPerMatch.value, null);
assert.equal(calendar.refereeVerification.designationsProvider, "UEFA");
assert.equal(calendar.refereeMethodology.modelUsage, "informational-only");
assert.equal(calendar.refereeWatchlist.length, 5);
assert.equal(firstMatchday.filter(fixture => fixture.refereeAttention).length, 5);
assert.equal(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-05").refereeAssignment.context.foulsPredictionEligible, false);
assert.equal(squads.teams.length, 36);
assert.deepEqual(calendar.teamBranding.map(item => item.team).sort(), squads.teams.map(item => item.team).sort(), "Ogni logo deve avere una scheda squadra associata");
for (const team of calendar.teamBranding) {
  assert.equal(team.uefaTeamId, historyIds.get(team.team), `${team.team}: ID UEFA non allineato allo storico`);
  assert.match(team.sourceUrl, new RegExp(`/${team.uefaTeamId}\\.png$`), `${team.team}: fonte logo non coerente`);
  const logo = fs.readFileSync(path.join(root, team.logo));
  assert.equal(logo.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${team.team}: firma PNG non valida`);
  assert(logo.length >= 100, `${team.team}: logo vuoto`);
}

console.log("OK Champions: 36 squadre · 36 ID UEFA · 36 PNG · 18 designazioni MD1");
