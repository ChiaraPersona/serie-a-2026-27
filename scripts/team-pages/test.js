const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const index = read("data/teams/index.json");
const mainApp = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const teamStatsShell = fs.readFileSync(path.join(root, "statistiche-squadre.html"), "utf8");
assert.strictEqual(index.teams.length, 20, "Sono richieste 20 squadre");
assert.strictEqual(new Set(index.teams.map(team => team.id)).size, 20, "ID squadra duplicati");
for (const summary of index.teams) {
  const team = read(`data/teams/${summary.id}.json`);
  assert.strictEqual(team.previousSeason.season, "2025/26");
  assert.ok(["Serie A", "Serie B"].includes(team.previousSeason.competition));
  assert.ok(Array.isArray(team.squad));
  assert.ok(Array.isArray(team.sources) && team.sources.length);
  assert.ok(fs.existsSync(path.join(root, `statistiche-squadra/${team.id}.html`)));
  assert.strictEqual(team.teamStats.competition, team.previousSeason.competition);
  for (const section of [team.teamStats.attack, team.teamStats.possession]) {
    assert.ok(Object.values(section).every(value => value === null), "Un campo non disponibile deve essere null");
  }
}
for (const teamId of ["milan", "inter", "juventus", "napoli"]) {
  assert.ok(mainApp.includes(`"${teamId}"`), `${teamId} assente dal blocco delle pagine complete`);
  assert.ok(teamStatsShell.includes(`href="statistiche-squadra/${teamId}.html"`), `Collegamento alla pagina ${teamId} assente da Statistiche squadre`);
}
const teamInterface = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(teamInterface.includes("completed-team-grid") && teamInterface.includes('href="${team.id}.html"'), "Pagine complete non evidenziate nell'indice delle squadre");
console.log("Team pages: 20 JSON e 20 pagine valide; competizioni separate; null preservati.");
