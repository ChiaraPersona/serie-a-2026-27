"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/champions-probable-formations-md02-2026-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const fixtures = calendar.fixtures.filter(fixture => fixture.matchday === 2);

assert.equal(source.matchday, 2);
assert.equal(source.status, "editorial-probable");
assert.equal(source.source.provider, "UEFA");
assert.match(source.source.url, /^https:\/\/it\.uefa\.com\/uefachampionsleague\//);
assert.equal(source.fixtures.length, 18);
assert.equal(fixtures.length, 18);
assert.equal(fixtures.filter(fixture => fixture.probableFormation?.status === "editorial-probable").length, 18);
assert.equal(fixtures.reduce((sum, fixture) => sum + fixture.probableFormation.home.players.length + fixture.probableFormation.away.players.length, 0), 396);

for (const fixture of fixtures) {
  const lineup = fixture.probableFormation;
  assert.equal(lineup.lineupConfidence.band, "not-rated");
  assert.equal(lineup.source.provider, "UEFA");
  for (const side of ["home", "away"]) {
    assert.equal(lineup[side].players.length, 11, `${fixture.id}/${side}: XI incompleto`);
    assert.equal(new Set(lineup[side].players).size, 11, `${fixture.id}/${side}: giocatore duplicato`);
    assert.equal(lineup[side].availability.unavailable.length >= 0, true);
    assert.equal(lineup[side].availability.doubts.length >= 0, true);
    assert.equal(lineup[side].notes.some(note => note.startsWith("Indisponibili:")), true);
    assert.equal(lineup[side].notes.some(note => note.startsWith("In dubbio:")), true);
  }
}

const inter = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-05").probableFormation.home.players;
assert(inter.includes("Josep Martínez") && inter.includes("Lautaro Martínez"));
const feyenoordComo = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-10").probableFormation;
assert(feyenoordComo.home.players.includes("Vanhoutte"));
assert(feyenoordComo.away.players.includes("Yan Couto"));
const sourcePlayers = source.fixtures.flatMap(fixture => [...fixture.homePlayers, ...fixture.awayPlayers]);
assert(!sourcePlayers.includes("VanhIndisponibilite"));
assert(!sourcePlayers.includes("Yan CIndisponibilio"));

console.log("OK Champions MD2: 18 probabili formazioni UEFA, 396 titolari, disponibilità esplicite");
