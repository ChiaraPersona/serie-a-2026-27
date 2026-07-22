const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const expectedCounts = { inter: 24, juventus: 38, napoli: 32 };
const allowedStatuses = new Set(["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"]);

for (const [teamId, expectedCount] of Object.entries(expectedCounts)) {
  const generated = read(`data/generated/team-pages/${teamId}-squad.json`);
  const team = read(`data/teams/${teamId}.json`);
  assert.strictEqual(generated.players.length, expectedCount, `${teamId}: numero rosa inatteso`);
  assert.strictEqual(team.squad.length, expectedCount, `${teamId}: rosa non propagata nella pagina`);
  assert.strictEqual(new Set(generated.players.map(player => player.id)).size, expectedCount, `${teamId}: ID duplicati`);
  assert.strictEqual(new Set(generated.players.map(player => player.name.toLocaleLowerCase("it"))).size, expectedCount, `${teamId}: nomi duplicati`);
  assert.ok(generated.rosterSource?.url, `${teamId}: fonte rosa assente`);
  assert.strictEqual(team.availability.squad, "available", `${teamId}: pagina non disponibile`);
  assert.ok(fs.existsSync(path.join(root, `statistiche-squadra/${teamId}.html`)), `${teamId}: HTML assente`);

  for (const player of generated.players) {
    assert.ok(allowedStatuses.has(player.status), `${teamId}/${player.name}: stato non ammesso`);
    assert.ok(fs.existsSync(path.join(root, `data/players/${teamId}/${player.id}.json`)), `${teamId}/${player.name}: JSON individuale assente`);
    assert.strictEqual(player.currentTeam, generated.team);
    assert.strictEqual(player.previousSeason.season, "2025/26");
    for (const entry of player.previousSeason.entries) {
      assert.strictEqual(entry.competition, "Serie A", `${player.name}: competizione non separata`);
      assert.ok(entry.team && entry.source && entry.lastUpdated, `${player.name}: provenienza incompleta`);
      for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
        const expected = entry[field] == null || !entry.minutes ? null : Number((entry[field] * 90 / entry.minutes).toFixed(2));
        assert.strictEqual(entry.per90[field], expected, `${player.name}: ${field}/90 errato`);
      }
      const cardValues = [entry.yellowCards, entry.secondYellowCards, entry.straightRedCards];
      const cardTotal = cardValues.every(value => value == null) ? null : cardValues.reduce((sum, value) => sum + (value ?? 0), 0);
      const expectedCards = cardTotal == null || !entry.minutes ? null : Number((cardTotal * 90 / entry.minutes).toFixed(2));
      assert.strictEqual(entry.per90.cards, expectedCards, `${player.name}: cartellini/90 errato`);
    }
  }
}

const interfaceSource = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
const rootShell = fs.readFileSync(path.join(root, "statistiche-squadre.html"), "utf8");
for (const teamId of Object.keys(expectedCounts)) {
  assert.ok(rootShell.includes(`statistiche-squadra/${teamId}.html`), `${teamId}: collegamento rapido assente`);
}
assert.ok(interfaceSource.includes('href="${team.id}.html"') && interfaceSource.includes("completed-team-grid"), "Collegamenti dinamici dell'indice assenti");
assert.ok(interfaceSource.includes("squadLeaderboards"), "Top 3 non condivisa con le nuove pagine");
console.log("Inter, Juventus e Napoli: rose, statistiche /90, pagine, fonti e collegamenti validati.");
