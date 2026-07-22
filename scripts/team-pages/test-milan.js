const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const generated = read("data/generated/team-pages/milan-squad.json");
const team = read("data/teams/milan.json");
const interfaceSource = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
const allowedStatuses = new Set(["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"]);
const sortable = ["appearances", "minutes", "goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "yellowCards"];

assert.strictEqual(generated.players.length, 26, "La rosa ufficiale Milan deve contenere 26 giocatori");
assert.strictEqual(team.squad.length, 26, "La pagina Milan deve ricevere 26 giocatori");
assert.strictEqual(new Set(generated.players.map(player => player.id)).size, 26, "ID giocatore duplicati");
assert.strictEqual(new Set(generated.players.map(player => player.name.toLocaleLowerCase("it"))).size, 26, "Nomi giocatore duplicati");
assert.ok(generated.players.some(player => player.status === "nuovo acquisto"));
assert.ok(generated.players.some(player => player.status === "rientro dal prestito"));

for (const player of generated.players) {
  assert.ok(allowedStatuses.has(player.status), `${player.name}: stato non ammesso`);
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
assert.strictEqual(generated.players.filter(player => player.dataQuality.status === "complete").length, 24);
assert.deepStrictEqual(generated.players.filter(player => player.dataQuality.status === "partial").map(player => player.name).sort(), ["Gonçalo Ramos", "Lorenzo Torriani"]);
assert.deepStrictEqual(generated.players.filter(player => player.dataQuality.uncertainAssociation).map(player => player.name), []);
assert.strictEqual(generated.players.find(player => player.name === "David Odogu").dataQuality.associationMethod, "nome+squadra+numero-maglia");
for (const contract of ["Tiri totali", "Tiri nello specchio", "Falli commessi", "Falli subiti", "goalsPer90", "assistsPer90", "shotsPer90", "shotsOnTargetPer90", "cardsPer90", "foulsCommittedPer90", "foulsWonPer90", "squad-table-wrap", "player-detail", "searchKey", "da verificare"]) assert.ok(interfaceSource.includes(contract), `Interfaccia: contratto ${contract} assente`);
for (const contract of [".squad-table-wrap", "position:sticky", ".squad-table thead tr:nth-child(2) th", ".squad-table tbody tr:hover td"]) assert.ok(stylesSource.includes(contract), `Stili tabella: contratto ${contract} assente`);
assert.strictEqual(team.availability.squad, "available");
console.log(`Milan pilot: ${generated.players.length} giocatori, ${generated.players.filter(player => player.previousSeason.entries.length).length} con statistiche, duplicati 0, per90 validato.`);
