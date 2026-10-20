const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const generated = read("data/generated/team-pages/milan-squad.json");
const team = read("data/teams/milan.json");
const interfaceSource = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
const stylesSource = ["styles", "base", "layout", "components", "home", "matches", "team", "players", "fantasy", "responsive"]
  .map(name => fs.readFileSync(path.join(root, `css/${name}.css`), "utf8"))
  .join("\n");
const allowedStatuses = new Set(["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"]);
const sortable = ["appearances", "minutes", "goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "yellowCards"];

const official = read("data/sources/fantacalcio-quotations-2026-27.json").players.filter(p=>p.teamId==="milan"&&p.status==="active");
assert.deepStrictEqual(generated.players.map(p=>p.id).sort(), official.map(p=>p.playerId).sort(), "Rosa Milan non allineata alle identita correnti canoniche");
assert.deepStrictEqual(team.squad.map(p=>p.id).sort(), generated.players.map(p=>p.id).sort());
assert.strictEqual(new Set(generated.players.map(p=>p.id)).size,generated.players.length);
assert.strictEqual(new Set(generated.players.map(p=>p.name.toLocaleLowerCase("it"))).size,generated.players.length);
for(const p of generated.players) {
 const individual=read(`data/players/milan/${p.id}.json`);
 assert.deepStrictEqual(p.previousSeason,individual.previousSeason, `${p.id}: statistiche individuali divergenti`);
 assert.deepStrictEqual(p.providerIds,individual.providerIds, `${p.id}: identita provider divergente`);
}

for (const player of generated.players) {
  assert.ok(allowedStatuses.has(player.status), `${player.name}: stato non ammesso`);
  assert.ok(Array.isArray(player.detailedRoles) && player.detailedRoles.length >= 1, `${player.name}: elenco ruoli tattici assente`);
  assert.strictEqual(new Set(player.detailedRoles).size, player.detailedRoles.length, `${player.name}: ruoli tattici duplicati`);
  assert.ok(player.sources.some(source => source.provider === "AC Milan"), `${player.name}: fonte rosa assente`);
  assert.ok(fs.existsSync(path.join(root, `data/players/milan/${player.id}.json`)), `${player.name}: JSON individuale assente`);
  for (const entry of player.previousSeason.entries) {
    assert.ok(entry.team && entry.competition && entry.source && entry.lastUpdated, `${player.name}: provenienza statistica incompleta`);
    for (const [field, value] of Object.entries(entry.per90 || {})) {
      if (!entry.minutes) assert.strictEqual(value, null, `${player.name}: ${field}/90 deve essere null senza minuti`);
      else if (field === "cards") {
        const cardValues = [entry.yellowCards, entry.secondYellowCards, entry.straightRedCards];
        const totalCards = cardValues.every(item => item == null) ? null : cardValues.reduce((total, item) => total + (item ?? 0), 0);
        assert.strictEqual(value, totalCards == null ? null : Number((totalCards * 90 / entry.minutes).toFixed(2)), `${player.name}: cartellini/90 errato`);
      } else if (entry[field] != null) assert.strictEqual(value, Number((entry[field] * 90 / entry.minutes).toFixed(2)), `${player.name}: ${field}/90 errato`);
    }
    if (player.role !== "Portiere") {
      for (const field of ["goalsConceded", "cleanSheets", "saves", "savePercentage", "penaltiesFaced", "penaltiesSaved"]) {
        assert.strictEqual(entry[field], null, `${player.name}: ${field} non deve essere attribuito a un giocatore di movimento`);
      }
    }
  }
  for (const field of sortable) {
    const value = player.previousSeason.totals[field];
    assert.ok(value === null || typeof value === "number", `${player.name}: ${field} non numerico`);
  }
  const totals = player.previousSeason.totals;
  for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
    const expected = totals[field] == null || !totals.minutes ? null : Number((totals[field] * 90 / totals.minutes).toFixed(2));
    assert.strictEqual(totals.per90[field], expected, `${player.name}: totale ${field}/90 errato`);
  }
  const totalCardValues = [totals.yellowCards, totals.secondYellowCards, totals.straightRedCards];
  const totalCards = totalCardValues.every(item => item == null) ? null : totalCardValues.reduce((sum, item) => sum + (item ?? 0), 0);
  const expectedCardsPer90 = totalCards == null || !totals.minutes ? null : Number((totalCards * 90 / totals.minutes).toFixed(2));
  assert.strictEqual(totals.per90.cards, expectedCardsPer90, `${player.name}: totale cartellini/90 errato`);
}

const entryKeys = generated.players.flatMap(player => player.previousSeason.entries.map(entry => `${player.id}|${entry.team}|${entry.competition}`));
assert.strictEqual(new Set(entryKeys).size, entryKeys.length, "Blocchi squadra/competizione duplicati");
assert.ok(generated.players.filter(player => player.previousSeason.entries.length).length >= 20, "Copertura statistica insufficiente");
for (const player of generated.players) {
 assert(["complete","partial","unavailable"].includes(player.dataQuality.status));
 assert(!player.dataQuality.uncertainAssociation, `${player.id}: associazione incerta`);
 if(player.dataQuality.status==="unavailable") assert.equal(player.previousSeason.entries.length,0);
}
for (const contract of ["Tiri totali", "Tiri nello specchio", "Falli commessi", "Falli subiti", "goalsPer90", "assistsPer90", "shotsPer90", "shotsOnTargetPer90", "cardsPer90", "foulsCommittedPer90", "foulsWonPer90", "squad-table-wrap", "squadLeaderboards", "leaderboard", "leader-player", "player-detail", "searchKey", "da verificare", "roleOrder", "compareByRole", "<option value=\"role\">Ruolo</option>"]) assert.ok(interfaceSource.includes(contract), `Interfaccia: contratto ${contract} assente`);
assert.ok(interfaceSource.includes("const seasonTotals = player => player.previousSeason?.totals"), "Tabella e classifiche 2025/26 devono usare i totali stagionali multi-club");
for (const abbreviation of ['Portiere: "POR"', '"Difensore centrale": "DC"', '"Terzino destro": "TD"', '"Terzino sinistro": "TS"', '"Centrocampista centrale": "CC"', 'Mediano: "CDC"', '"Esterno destro": "ED"', '"Esterno sinistro": "ES"', 'Trequartista: "COC"', 'Attaccante: "ATT"', '"Ala destra": "AD"', '"Ala sinistra": "AS"']) assert.ok(interfaceSource.includes(abbreviation), `Interfaccia: abbreviazione ${abbreviation} assente`);
assert.ok(interfaceSource.includes("displayRole(player)"), "Interfaccia: abbreviazioni non applicate ai giocatori");
assert.ok(interfaceSource.includes("player.detailedRoles") && interfaceSource.includes('join(" / ")'), "Interfaccia: multiruolo non visualizzato");
for (const contract of [".squad-table-wrap", "position:sticky", ".squad-table thead tr:nth-child(2) th", ".squad-table tbody tr:hover td", ".squad-leader-grid", ".squad-leader-card"]) assert.ok(stylesSource.includes(contract), `Stili tabella: contratto ${contract} assente`);
assert.ok(!stylesSource.includes(".squad-table .goal-stat") && !interfaceSource.includes("goal-stat"), "Gol deve usare le stesse dimensioni delle altre statistiche");
assert.ok(interfaceSource.includes('Array.from({ length: 14 }') && interfaceSource.includes('class="squad-col-stat"'), "Le colonne statistiche devono condividere lo stesso modello di larghezza");
assert.ok(stylesSource.includes(".squad-table .squad-col-stat{width:70px}") && stylesSource.includes("table-layout:fixed"), "Gol e le altre statistiche devono avere una larghezza uniforme");
for (const obsoleteClass of ["demo-banner", "summary-grid", "champion-card", "highlight-grid", "match-teams", "milan-pilot-card", "quick-milan-link", "completed-team-card", "quick-team-links", "coverage-complete-card"]) assert.ok(!stylesSource.includes(`.${obsoleteClass}`), `CSS obsoleto ancora presente: ${obsoleteClass}`);
assert.strictEqual(team.availability.squad, "available");
console.log(`Milan pilot: ${generated.players.length} giocatori, ${generated.players.filter(player => player.previousSeason.entries.length).length} con statistiche, duplicati 0, per90 validato.`);
