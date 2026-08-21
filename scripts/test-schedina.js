const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina.json"), "utf8"));
assert.strictEqual(data.slips.length, 3, "La pagina deve contenere tre schedine");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [6, 6, 10], "Numero selezioni inatteso");
assert.strictEqual(new Set(data.slips[2].legs.map(leg => leg.matchId)).size, 10, "Supernova deve coprire tutte le dieci partite");
for (const slip of data.slips) {
  assert(slip.combinedOdds > 1, `${slip.id}: quota totale non valida`);
  assert(slip.jointModelProbabilityPct > 0, `${slip.id}: probabilità modello non valida`);
  for (const leg of slip.legs) {
    assert([...leg.selection].includes(leg.predictedOutcome), `${slip.id}/${leg.matchId}: selezione incoerente con il pronostico`);
    assert(leg.odds > 1, `${slip.id}/${leg.matchId}: quota non valida`);
  }
}
const shell = fs.readFileSync(path.join(root, "schedina.html"), "utf8");
assert.match(shell, /data-page="betting"/, "Shell Schedina non generata");
assert.match(shell, /fantacalcio\.html[^]*schedina\.html/, "Schedina non è accanto a Fantacalcio nella navigazione");
console.log(`Schedina valida: ${data.slips.map(slip => `${slip.name} ${slip.combinedOdds.toFixed(2)}`).join(" · ")}`);
