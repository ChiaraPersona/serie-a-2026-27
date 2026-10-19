import fs from "node:fs";
import assert from "node:assert/strict";

const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const matchId = "juventus-milan-2026-27-md-03";
const source = read("data/sources/mycombo-serie-a-2026-27-md-03.json");
const prediction = read("data/normalized/predictions.json").predictions.find(item => item.matchId === matchId);
const expected = new Map([
  ["Partita equilibrata", 28.07],
  ["Maggiore Juventus", 29.18],
  ["Maggiore Milan", 29.47]
]);
const unsupported = /draw no bet|più tiri (?:totali )?di|prima a \d+ corner|1° tempo oppure (?:la partita|a fine gara)|ammonito oppure/i;
const unsupportedMarket = /DRAW NO BET|1X2 TIRI TOTALI GIOCATORI|PRIMA A X CORNER|COMBO CHANCE: [12X] 1T O [12X] FINALE|GIOCATORE QUASI CARTELLINO/i;

assert.ok(prediction, "Pronostico Juventus-Milan assente");
assert.equal(source.matches[matchId].length, 3, "Servono tre MyCombo Juventus-Milan");
assert.deepEqual(prediction.combinations.map(combo => combo.scenario), [...expected.keys()], "Scenari MyCombo non conformi");
for (const combo of prediction.combinations) {
  assert.equal(combo.targetOdds, 30, `${combo.scenario}: riferimento quota errato`);
  assert.equal(combo.risk, "elevato", `${combo.scenario}: rischio quota 30 non dichiarato`);
  assert.equal(combo.legs.length, 7, `${combo.scenario}: servono sette gambe`);
  assert.equal(combo.odds, expected.get(combo.scenario), `${combo.scenario}: quota combinata inattesa`);
  assert.ok(combo.odds >= 27 && combo.odds <= 33, `${combo.scenario}: quota non abbastanza vicina a 30`);
  assert.equal(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${combo.scenario}: mercato ripetuto`);
  assert.ok(combo.legs.every(leg => !unsupported.test(leg.label)), `${combo.scenario}: contiene un mercato non inseribile in MyCombo`);
  assert.ok(combo.legs.every(leg => !unsupportedMarket.test(leg.market)), `${combo.scenario}: famiglia Sisal non inseribile in MyCombo`);
}

console.log("Juventus-Milan: tre MyCombo scenario a quota circa 30 validate.");
