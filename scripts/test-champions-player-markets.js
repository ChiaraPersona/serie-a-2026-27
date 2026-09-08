const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-player-markets-md01-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const fixtureById = new Map(calendar.fixtures.map(fixture => [fixture.id, fixture]));

assert.equal(data.fixtures.length, 18);
for (const fixture of data.fixtures) {
  assert.equal(fixture.coverage.lineupPlayers, 22, `${fixture.fixtureId}: XI incompleti`);
  assert.equal(fixture.likelyBooked.length, 5, `${fixture.fixtureId}: ammoniti`);
  assert.ok(fixture.mvpCandidate?.name, `${fixture.fixtureId}: MVP`);
  assert.equal(fixture.shooters.totalShots.length, 5, `${fixture.fixtureId}: tiratori totali`);
  assert.equal(fixture.shooters.shotsOnTarget.length, 5, `${fixture.fixtureId}: tiratori in porta`);
  const source = fixtureById.get(fixture.fixtureId);
  const lineupNames = [...source.probableFormation.home.players, ...source.probableFormation.away.players].map(value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  for (const candidate of fixture.likelyBooked) assert.ok(lineupNames.includes(candidate.lineupName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()), `${fixture.fixtureId}: ammonito fuori XI ${candidate.name}`);
  const forbidden = /CARTELL|AMMONIT|DRAW NO BET|PRIMA A X CORNER|QUASI CARTELLINO|1X2 TIRI (TOTALI|IN PORTA) GIOCATORI/i;
  for (const combo of fixture.combinations) {
    const families = new Set();
    for (const leg of combo.legs) {
      assert.ok(leg.odds >= 1.10, "Quota inferiore a 1.10");
      assert.ok(!forbidden.test(`${leg.marketName} ${leg.variantName}`), `${fixture.fixtureId}: mercato vietato`);
      assert.ok(!families.has(leg.marketName === "UNDER/OVER" || leg.marketName === "GOAL/NOGOAL" || leg.marketName === "MULTIGOAL" ? "goals" : leg.marketName), `${fixture.fixtureId}: sovrapposizione semantica`);
      families.add(leg.marketName === "UNDER/OVER" || leg.marketName === "GOAL/NOGOAL" || leg.marketName === "MULTIGOAL" ? "goals" : leg.marketName);
    }
  }
}
console.log("Champions player markets: OK");
