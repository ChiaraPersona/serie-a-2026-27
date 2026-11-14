const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const index = read("data/teams/index.json");
const roleReport = read("data/generated/team-pages/detailed-role-report.json");
const fantasyQuotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const activeFantasyPlayerKeys = new Set(fantasyQuotations.players.filter(player => player.status === "active").map(player => `${player.teamId}:${player.playerId}`));
const teamSquadsRenderer = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(teamSquadsRenderer.includes("const lineup = team.probableLineup || team.projectedLineup;"), "La formazione ufficiale deve avere precedenza sulla proiezione editoriale");
let totalPlayers = 0;
let coveredPlayers = 0;
let specificRoles = 0;

assert.strictEqual(index.teams.length, 20, "Sono richieste 20 squadre");
for (const summary of index.teams) {
  const generatedPath = `data/generated/team-pages/${summary.id}-squad.json`;
  assert.ok(fs.existsSync(path.join(root, generatedPath)), `${summary.id}: rosa generata assente`);
  const generated = read(generatedPath);
  const team = read(`data/teams/${summary.id}.json`);
  for (const field of ["city", "stadium", "coach", "preferredFormation"]) {
    assert.ok(team[field], `${summary.id}: ${field} assente`);
    assert.strictEqual(summary[field], team[field], `${summary.id}: ${field} non sincronizzato nell'indice`);
  }
  assert.match(team.preferredFormation, /^[1-9](?:-[1-9]){2,4}$/, `${summary.id}: formato modulo non valido`);
  assert.deepStrictEqual(summary.probableLineup, team.probableLineup, `${summary.id}: probabile formazione non sincronizzata nell'indice`);
  assert.match(team.probableLineup.formation, /^[1-9](?:-[1-9]){2,4}$/, `${summary.id}: modulo probabile non valido`);
  assert.strictEqual(team.probableLineup.players.length, 11, `${summary.id}: la probabile formazione deve avere 11 calciatori`);
  assert.strictEqual(new Set(team.probableLineup.players).size, 11, `${summary.id}: nomi duplicati nella probabile formazione`);
  assert.ok(["official", "probable"].includes(team.probableLineup.status), `${summary.id}: stato formazione corrente non valido`);
  const projectedLineup = team.projectedLineup || team.probableLineup;
  assert.strictEqual(projectedLineup.players.length, 11, `${summary.id}: la proiezione MD5 deve avere 11 calciatori`);
  assert.strictEqual(projectedLineup.source.provider, "Fantacalcio.it", `${summary.id}: fonte proiezione MD5 assente`);
  assert.ok(team.sources.some(source => source.scope.includes("Modulo preferito")), `${summary.id}: fonte modulo preferito assente`);
  assert.ok(team.sources.some(source => source.provider === projectedLineup.source.provider && source.scope === projectedLineup.source.scope && source.url === projectedLineup.source.url), `${summary.id}: fonte della formazione pubblicata MD${projectedLineup.matchday} non registrata`);
  assert.ok(projectedLineup.source.scope.includes(`${projectedLineup.matchday}ª giornata`), `${summary.id}: giornata e provenienza della proiezione discordanti`);
  assert.ok(team.sources.some(source => source.provider === "Lega Serie A" && source.scope.includes("Allenatori")), `${summary.id}: fonte allenatore assente`);
  assert.ok(generated.players.length >= 20, `${summary.id}: rosa troppo corta`);
  assert.strictEqual(team.squad.length, generated.players.length, `${summary.id}: rosa non propagata`);
  assert.strictEqual(summary.playerCount, generated.players.length, `${summary.id}: conteggio indice errato`);
  assert.strictEqual(new Set(generated.players.map(player => player.id)).size, generated.players.length, `${summary.id}: ID duplicati`);
  assert.ok(generated.rosterSource?.url, `${summary.id}: fonte rosa assente`);
  assert.ok(generated.players.every(player => activeFantasyPlayerKeys.has(`${summary.id}:${player.id}`)), `${summary.id}: la rosa contiene calciatori non attivi nel listone Fantacalcio`);
  if (summary.id !== "milan") {
    const teamSpecificRoles = generated.players.filter(player => player.detailedRole !== player.role);
    assert.ok(teamSpecificRoles.length >= 10, `${summary.id}: ruoli specifici insufficienti`);
    assert.ok(teamSpecificRoles.every(player =>
      player.detailedRoleSource === "Configurazione rosa" || (player.detailedRoleSource && player.detailedRoleEvidence?.starts)
    ), `${summary.id}: evidenza dei ruoli specifici assente`);
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
assert.ok(coveredPlayers / totalPlayers >= 0.7, `Copertura individuale insufficiente: ${coveredPlayers}/${totalPlayers}`);
assert.strictEqual(roleReport.teams.length, 19, "Report ruoli specifici incompleto");
assert.ok(specificRoles / totalPlayers >= 0.65, `Copertura ruoli specifici insufficiente: ${specificRoles}/${totalPlayers}`);
console.log(`Tutte le squadre: 20/20, ${totalPlayers} calciatori, ${coveredPlayers} con statistiche 2025/26, ${specificRoles} ruoli tattici specifici fuori dal Milan.`);
