const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "team-referee-profiles.json"), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(data.profiles.length === 20, "Copertura arbitro-squadra diversa da 20 squadre");
assert(new Set(data.profiles.map(profile => profile.teamId)).size === 20, "Squadre arbitro-squadra duplicate");
assert(data.coverage.available === 17 && data.coverage.notAvailable === 3, "Copertura WhoScored inattesa");
assert(data.coverage.completeTables + data.coverage.top20Tables === data.coverage.available, "Classificazione copertura incompleta");
assert(data.coverage.linkedToEspn <= data.coverage.refereeRows, "Collegamenti ESPN oltre le righe disponibili");

const unavailable = data.profiles.filter(profile => profile.availability === "not_available").map(profile => profile.teamId).sort();
assert(JSON.stringify(unavailable) === JSON.stringify(["frosinone", "monza", "venezia"]), "Squadre N/D Serie A inattese");

for (const profile of data.profiles) {
  assert(/^https:\/\/it\.whoscored\.com\//.test(profile.sourceUrl), `Fonte mancante: ${profile.teamId}`);
  assert(profile.rows.length <= 20, `Limite tabella WhoScored non rispettato: ${profile.teamId}`);
  assert(profile.coverage.visibleReferees === profile.rows.length, `Conteggio arbitri non coerente: ${profile.teamId}`);
  assert(profile.coverage.visibleAppearances <= profile.coverage.seasonAppearances, `Presenze visibili non coerenti: ${profile.teamId}`);
  for (const row of profile.rows) {
    assert(row.appearances > 0, `Presenze arbitro non valide: ${profile.teamId}/${row.referee}`);
    assert(row.yellowCards >= 0 && row.redCards >= 0, `Cartellini non validi: ${profile.teamId}/${row.referee}`);
    if (row.espnComparison) {
      assert(row.espnComparison.matchDifference === row.appearances - row.espnComparison.matches, `Delta presenze errato: ${profile.teamId}/${row.referee}`);
      assert(row.espnComparison.yellowCardDifference === row.yellowCards - row.espnComparison.yellowCards, `Delta gialli errato: ${profile.teamId}/${row.referee}`);
    }
  }
}

const inter = data.profiles.find(profile => profile.teamId === "inter");
assert(inter.coverage.mode === "complete" && inter.coverage.visibleAppearances === 38, "Inter: copertura non completa");
assert(inter.providerTotals.yellowCards === 64 && inter.providerTotals.redCards === 0, "Inter: totali WhoScored non riconciliati");
console.log(`OK team-referee: 20/20 squadre, ${data.coverage.refereeRows} righe, ${data.coverage.linkedToEspn} collegamenti ESPN`);
