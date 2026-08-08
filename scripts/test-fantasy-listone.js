const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const source = read("data/sources/fantacalcio-quotations-2026-27.json");
const generated = read("data/generated/fantacalcio-advice.json");

assert.equal(source.season, "2026/27");
assert.equal(source.players.length, 496);
assert.equal(source.departed.length, 6);
assert.equal(new Set(source.players.map(player => player.sourceId)).size, 496);
assert.deepEqual(source.coverage.byRole, { P: 60, D: 175, C: 174, A: 87 });
assert.equal(new Set(source.players.map(player => player.teamId)).size, 20);
for (const player of source.players) {
  assert.ok(["P", "D", "C", "A"].includes(player.role), `${player.name}: ruolo Classic non valido`);
  assert.ok(player.mantraRole, `${player.name}: ruolo Mantra mancante`);
  for (const field of ["currentQuotation", "initialQuotation", "currentMantraQuotation", "initialMantraQuotation", "fvm", "mantraFvm"]) {
    assert.ok(Number.isFinite(player[field]), `${player.name}: ${field} non numerico`);
  }
}

assert.equal(generated.listone.players.length, source.players.length);
assert.equal(generated.listone.coverage.matchedCurrentPlayers, source.coverage.matchedCurrentPlayers);
assert.ok(generated.methodology.description.includes("correttivo del 15%"));
const quotedAdvice = generated.players.filter(player => player.quotations);
assert.ok(quotedAdvice.length > 350, `Copertura quotazioni insufficiente: ${quotedAdvice.length}`);
for (const player of quotedAdvice) {
  assert.ok(Number.isFinite(player.quotations.classic));
  assert.ok(Number.isFinite(player.quotations.fvm));
}

console.log(`Listone Fantacalcio: ${source.players.length} attivi, ${source.departed.length} ceduti, ${source.coverage.matchedCurrentPlayers} collegati, ${quotedAdvice.length} consigli quotati.`);
