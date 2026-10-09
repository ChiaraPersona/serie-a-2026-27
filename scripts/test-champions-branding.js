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
const editorial = fixture => fixture.probableFormation.editorialProjection || fixture.probableFormation;
assert.equal(firstMatchday.length, 18);
assert.deepEqual(Object.fromEntries(["official", "editorial-probable"].map(status => [status, firstMatchday.filter(fixture => fixture.probableFormation?.status === status).length])), { official: 13, "editorial-probable": 5 });
assert.equal(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-01")).home.formation, "4-4-2");
assert.equal(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-06")).away.formation, "3-5-2");
assert.equal(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-18")).away.formation, "3-4-2-1");
assert.equal(firstMatchday.filter(fixture => fixture.probableFormation.home.players?.length === 11 && fixture.probableFormation.away.players?.length === 11).length, 18);
assert.equal(firstMatchday.reduce((sum, fixture) => sum + fixture.probableFormation.home.players.length + fixture.probableFormation.away.players.length, 0), 396);
assert.deepEqual(Object.fromEntries(["very-high", "medium-high", "lower"].map(band => [band, firstMatchday.filter(fixture => editorial(fixture).lineupConfidence.band === band).length])), { "very-high": 6, "medium-high": 6, "lower": 6 });
assert.deepEqual(firstMatchday.flatMap(fixture => editorial(fixture).lineupConfidence.uncertainSides.map(side => editorial(fixture)[side].team)), ["AEK Athens", "Inter", "Sporting CP", "Roma", "Leipzig", "Manchester United"]);
assert.deepEqual(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-01")).home.players, ["Strakosha", "Rota", "Moukoudi", "Relvas", "Pilios", "Majer", "Marin", "Vitalis", "Gacinovic", "Jovic", "Varga"]);
assert.match(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-01")).home.notes[0], /Kairinen e Koïta/);
assert.deepEqual(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-06")).away.players, ["Josep Martínez", "Pavard", "Akanji", "Bastoni", "Luis Henrique", "Barella", "Çalhanoğlu", "Petar Sučić", "Carlos Augusto", "Lautaro Martínez", "Thuram"]);
assert.match(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-06")).away.notes[0], /Dimarco.*dubbio.*Carlos Augusto/);
assert.equal(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-07")).home.players[0], "Joan García");
assert.equal(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-11")).home.players[9], "Francisco Trincão/Gonçalves");
assert.match(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-12")).home.notes[0], /Buongiorno e McTominay.*fuori/);
assert.match(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-13")).away.notes[0], /Dybala e Soulé dietro Malen/);
assert.match(editorial(firstMatchday.find(fixture => fixture.id === "ucl-2026-27-md01-17")).home.notes[0], /Rashford.*dubbio/);
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
