const assert = require("assert");
const planner = require("./fantasy-squad.js");

const fixtures = values => values.map((ease, index) => ({ matchday: index + 1, ease }));
const teams = [
  { id: "alpha", calendar: { fixtures: fixtures([30, 70, 35, 72, 40, 68, 42, 66]) } },
  { id: "beta", calendar: { fixtures: fixtures([72, 35, 70, 34, 68, 38, 69, 40]) } },
  { id: "gamma", calendar: { fixtures: fixtures([45, 46, 48, 49, 50, 51, 52, 53]) } }
];
const players = [
  { id: "main-a", name: "Main A", teamId: "alpha", role: "A", score: 88, reliability: "Alta", value500: 120, auctionValue1000: 250, quotations: { classic: 35 } },
  { id: "value-a", name: "Value A", teamId: "beta", role: "A", score: 76, reliability: "Alta", value500: 45, auctionValue1000: 100, quotations: { classic: 12 } },
  { id: "risk-a", name: "Risk A", teamId: "gamma", role: "A", score: 82, reliability: "Da verificare", value500: 38, auctionValue1000: 80, quotations: { classic: 9 } },
  { id: "keeper", name: "Keeper", teamId: "beta", role: "P", score: 70, reliability: "Media", value500: 20 }
];
const data = { teams, players };

const normalized = planner.normalizeState({ budget: 500, entries: [
  { playerId: "main-a", main: true, price: 100 },
  { playerId: "missing", main: true, price: 10 },
  { playerId: "main-a", main: false, price: 1 }
] }, players);
assert.equal(normalized.entries.length, 1, "rimuove duplicati e giocatori non disponibili");

const summary = planner.summarize(normalized, players);
assert.equal(summary.mains, 1);
assert.equal(summary.remaining, 400);
assert.equal(summary.missing.A, 5);
assert.equal(summary.missing.P, 3);

const complementary = planner.calendarScore(players[1], data, summary.entries.filter(entry => entry.main));
const neutral = planner.calendarScore(players[2], data, summary.entries.filter(entry => entry.main));
assert(complementary > neutral, "premia il calendario complementare al main dello stesso ruolo");

const balanced = planner.recommendations(data, normalized, "balanced");
assert(!balanced.roles.A.some(item => item.player.id === "main-a"), "esclude i calciatori gia selezionati");
assert.equal(balanced.roles.A[0].player.id, "value-a", "propone il profilo affidabile e complementare");
assert.equal(planner.targetPrice(players[1], 1000, "classic", 8), 12, "in modalità Classic usa la quotazione ufficiale");
assert.equal(planner.targetPrice(players[1], 1000, "auction", 6), 88, "riduce il valore in una lega da 6");
assert.equal(planner.targetPrice(players[1], 1000, "auction", 8), 100, "usa il valore base in una lega da 8");
assert.equal(planner.targetPrice(players[1], 1000, "auction", 10), 112, "aumenta il valore in una lega da 10");
assert.equal(planner.targetPrice(players[0], 1000, "auction", 8), 250, "il miglior calciatore non supera il 25% del budget");
assert.equal(planner.targetPrice(players[0], 1000, "auction", 10), 250, "il tetto del 25% vale anche con 10 partecipanti");

console.log("Fantasy squad planner: test superati.");
