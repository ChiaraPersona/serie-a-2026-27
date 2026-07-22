const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const index = read("data/teams/index.json");
const roleReport = read("data/generated/team-pages/detailed-role-report.json");
let totalPlayers = 0;
let coveredPlayers = 0;
let specificRoles = 0;

assert.strictEqual(index.teams.length, 20, "Sono richieste 20 squadre");
for (const summary of index.teams) {
  const generatedPath = `data/generated/team-pages/${summary.id}-squad.json`;
  assert.ok(fs.existsSync(path.join(root, generatedPath)), `${summary.id}: rosa generata assente`);
  const generated = read(generatedPath);
  const team = read(`data/teams/${summary.id}.json`);
  for (const field of ["city", "stadium", "coach"]) {
    assert.ok(team[field], `${summary.id}: ${field} assente`);
    assert.strictEqual(summary[field], team[field], `${summary.id}: ${field} non sincronizzato nell'indice`);
  }
  assert.ok(team.sources.some(source => source.provider === "Lega Serie A" && source.scope.includes("Allenatori")), `${summary.id}: fonte allenatore assente`);
  assert.ok(generated.players.length >= 20, `${summary.id}: rosa troppo corta`);
  assert.strictEqual(team.squad.length, generated.players.length, `${summary.id}: rosa non propagata`);
  assert.strictEqual(summary.playerCount, generated.players.length, `${summary.id}: conteggio indice errato`);
  assert.strictEqual(new Set(generated.players.map(player => player.id)).size, generated.players.length, `${summary.id}: ID duplicati`);
  assert.ok(generated.rosterSource?.url, `${summary.id}: fonte rosa assente`);
  if (summary.id !== "milan") {
    const teamSpecificRoles = generated.players.filter(player => player.detailedRole !== player.role);
    assert.ok(teamSpecificRoles.length >= 10, `${summary.id}: ruoli specifici insufficienti`);
    assert.ok(teamSpecificRoles.every(player => player.detailedRoleSource && player.detailedRoleEvidence?.starts), `${summary.id}: evidenza dei ruoli specifici assente`);
    specificRoles += teamSpecificRoles.length;
  }
  totalPlayers += generated.players.length;

  for (const player of generated.players) {
    assert.ok(fs.existsSync(path.join(root, `data/players/${summary.id}/${player.id}.json`)), `${summary.id}/${player.id}: scheda assente`);
    if (player.previousSeason.entries.length) coveredPlayers++;
    for (const entry of player.previousSeason.entries) {
      assert.ok(entry.competition && entry.team, `${summary.id}/${player.id}: squadra o competizione assente`);
      for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
        const expected = entry[field] == null || !entry.minutes ? null : Number((entry[field] * 90 / entry.minutes).toFixed(2));
        assert.strictEqual(entry.per90[field], expected, `${summary.id}/${player.id}: ${field}/90 errato`);
      }
    }
  }
}

assert.strictEqual(index.teams.filter(team => team.playerCount > 0).length, 20, "Copertura squadre incompleta");
assert.ok(coveredPlayers >= 450, `Copertura individuale insufficiente: ${coveredPlayers}`);
assert.strictEqual(roleReport.teams.length, 19, "Report ruoli specifici incompleto");
assert.ok(specificRoles >= 400, `Copertura ruoli specifici insufficiente: ${specificRoles}`);
console.log(`Tutte le squadre: 20/20, ${totalPlayers} calciatori, ${coveredPlayers} con statistiche 2025/26, ${specificRoles} ruoli tattici specifici fuori dal Milan.`);
