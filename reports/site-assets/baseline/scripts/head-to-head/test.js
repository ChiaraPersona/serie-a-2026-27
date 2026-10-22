const assert = require("assert");
const { rangeFor, normalizeDetail, firstLegPairs } = require("./import");

assert.equal(rangeFor("2025-26"), "20250801-20260731");
assert.equal(firstLegPairs().length, 190);
assert.equal(new Set(firstLegPairs().map(pair => pair.pairKey)).size, 190);
const event = {
  id: "1",
  date: "2025-11-09T11:30Z",
  competitions: [{ competitors: [
    { homeAway: "home", score: "0", team: { id: "105", displayName: "Atalanta" } },
    { homeAway: "away", score: "1", team: { id: "3997", displayName: "Sassuolo" } }
  ] }]
};
const summary = {
  keyEvents: [
    { scoringPlay: true, shootout: false, type: { type: "goal" }, team: { id: "3997", displayName: "Sassuolo" }, participants: [{ athlete: { id: "10", displayName: "Mario Rossi" } }], clock: { displayValue: "29'" }, text: "Goal" },
    { scoringPlay: false, type: { type: "yellow-card" }, team: { id: "105", displayName: "Atalanta" }, participants: [{ athlete: { id: "11", displayName: "Luigi Bianchi" } }], clock: { displayValue: "36'" }, text: "Yellow card" }
  ],
  boxscore: { teams: [
    { team: { id: "105" }, statistics: [{ name: "yellowCards", displayValue: "1" }] },
    { team: { id: "3997" }, statistics: [{ name: "yellowCards", displayValue: "0" }] }
  ] }
};
const detail = normalizeDetail({ event, league: { name: "Serie A" }, summaryUrl: "summary" }, { payload: summary, retrievedAt: "2026-08-04T00:00:00Z" }, new Map([["105", "atalanta"], ["3997", "sassuolo"]]));
assert.equal(detail.goals[0].player, "Mario Rossi");
assert.equal(detail.bookings[0].player, "Luigi Bianchi");
assert.deepEqual(detail.coverage.missingFields, []);
console.log("OK importer scontri diretti: 190 gare di andata, marcatori, ammoniti e controlli copertura");
