"use strict";

const assert = require("assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/champions-probable-formations-md02-2026-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const fixtures = calendar.fixtures.filter(fixture => fixture.matchday === 2);
const targetedFixtureIds = new Set(["ucl-2026-27-md02-03", "ucl-2026-27-md02-04", "ucl-2026-27-md02-05", "ucl-2026-27-md02-06", "ucl-2026-27-md02-07", "ucl-2026-27-md02-08", "ucl-2026-27-md02-09"]);
const baselineCalendar = JSON.parse(execFileSync("git", ["show", "HEAD:data/normalized/champions-league-2026-27.json"], { cwd: root, encoding: "utf8" }));

assert.equal(source.matchday, 2);
assert.equal(source.status, "editorial-probable");
assert.equal(source.source.provider, "UEFA");
assert.match(source.source.url, /^https:\/\/it\.uefa\.com\/uefachampionsleague\//);
assert.equal(source.fixtures.length, 18);
assert.equal(fixtures.length, 18);
assert.equal(fixtures.filter(fixture => fixture.probableFormation?.status === "editorial-probable").length, 9);
assert.equal(fixtures.filter(fixture => fixture.probableFormation?.status === "official").length, 9);
assert.equal(fixtures.reduce((sum, fixture) => sum + fixture.probableFormation.home.players.length + fixture.probableFormation.away.players.length, 0), 396);
assert.equal(
  crypto.createHash("sha256").update(JSON.stringify(fixtures.filter(fixture => !targetedFixtureIds.has(fixture.id)))).digest("hex").toUpperCase(),
  crypto.createHash("sha256").update(JSON.stringify(baselineCalendar.fixtures.filter(fixture => fixture.matchday === 2 && !targetedFixtureIds.has(fixture.id)))).digest("hex").toUpperCase(),
  "Le 11 gare Champions fuori ambito sono cambiate"
);

for (const fixture of fixtures) {
  const lineup = fixture.probableFormation;
  const official = lineup.status === "official";
  assert.equal(lineup.lineupConfidence.band, official ? "very-high" : "not-rated");
  assert.equal(lineup.source.provider, official ? (targetedFixtureIds.has(fixture.id) ? "Diretta.it" : "Fantacalcio") : "UEFA");
  for (const side of ["home", "away"]) {
    assert.equal(lineup[side].players.length, 11, `${fixture.id}/${side}: XI incompleto`);
    assert.equal(new Set(lineup[side].players).size, 11, `${fixture.id}/${side}: giocatore duplicato`);
    const availabilitySide = official ? lineup[side].availability ? lineup[side] : lineup.editorialProjection[side] : lineup[side];
    assert.equal(availabilitySide.availability.unavailable.length >= 0, true);
    assert.equal(availabilitySide.availability.doubts.length >= 0, true);
    assert.equal(availabilitySide.notes.some(note => /^(?:Indisponibili|Non disponibil)/.test(note)), true);
    if (!official || !lineup[side].availability) assert.equal(availabilitySide.notes.some(note => note.startsWith("In dubbio:")), true);
  }
}

const lensSporting = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-01").probableFormation;
assert.deepEqual(lensSporting.home.players, ["Risser", "Baidoo", "Ganiou", "Antonio", "Abdulhamid", "Cuisance", "Haidara", "Udol", "Thauvin", "Ivanovic", "Kadile"]);
assert.deepEqual(lensSporting.away.players, ["Kaique Pereira", "Fresneda", "Eduardo Quaresma", "Inácio", "Araujo", "Joao Simoes", "Doumbia", "Sergi Altimira", "Irankunda", "Suarez", "Catamo"]);
const sabahSlavia = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-02").probableFormation;
assert.deepEqual(sabahSlavia.home.players, ["Pokatilov", "Zedadka", "Solvet", "McCarthy", "Puchacz", "Rakhmonaliev", "Lepinjica", "Parris", "De Queiroz", "Simic", "Mickels"]);
assert.deepEqual(sabahSlavia.away.players, ["Markovic", "Holes", "N'Guessan", "Zima", "Vlcek", "Moses", "Sadilek", "Sturm", "Provod", "Ayaosi", "Chory"]);

for (const fixtureId of targetedFixtureIds) {
  const lineup = fixtures.find(fixture => fixture.id === fixtureId).probableFormation;
  assert.equal(lineup.source.provider, "Diretta.it");
  for (const side of ["home", "away"]) {
    assert(lineup[side].bench.length >= 8, `${fixtureId}/${side}: panchina ufficiale incompleta`);
    assert(lineup[side].coach, `${fixtureId}/${side}: allenatore ufficiale mancante`);
  }
}
const inter = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-05").probableFormation.home.players;
assert(inter.includes("Martinez J.") && inter.includes("Martinez L."));
const feyenoordComo = fixtures.find(fixture => fixture.id === "ucl-2026-27-md02-10").probableFormation;
assert(feyenoordComo.home.players.includes("Vanhoutte"));
assert(feyenoordComo.away.players.includes("Yan Couto"));
const sourcePlayers = source.fixtures.flatMap(fixture => [...fixture.homePlayers, ...fixture.awayPlayers]);
assert(!sourcePlayers.includes("VanhIndisponibilite"));
assert(!sourcePlayers.includes("Yan CIndisponibilio"));

console.log("OK Champions MD2: 9 probabili UEFA + 2 ufficiali Fantacalcio + 7 ufficiali Diretta.it, 396 titolari, panchine/allenatori e disponibilità esplicite");
