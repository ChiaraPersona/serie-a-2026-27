const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const index = read("data/teams/index.json");
const roleReport = read("data/generated/team-pages/detailed-role-report.json");
const wikimediaPhotos = read("data/sources/team-pages/wikimedia-player-photos.json");
const wikimediaPhotoByPlayer = new Map(wikimediaPhotos.entries.map(entry => [`${entry.teamId}:${entry.playerId}`, entry]));
const playerPlaceholder = "assets/images/players/player-placeholder.png";
const expectedRosterAdditions = {
  atalanta: ["paolo-vismara", "relja-obric", "federico-cassa", "eljif-elmas"],
  cagliari: ["alieu-fadera"],
  fiorentina: ["gianmaria-fei", "alessandro-perrotti", "federico-croci", "brando-mazzeo"],
  genoa: ["rendijs-mihelsons", "matteo-barbini", "lukas-klisys", "nicolo-tondi"],
  inter: ["curtis-jones"],
  lazio: ["cristian-bagordo", "jacopo-landi"],
  monza: ["idrissa-toure"],
  napoli: ["benoit-badiashile"],
  sassuolo: ["fedde-leysen"],
  torino: ["diego-mascardi", "gaetano-oristanio", "giovanni-simeone", "sandro-kulenovic", "nicolo-fortini"],
  udinese: ["rene-pirih"]
};
assert.ok(fs.existsSync(path.join(root, playerPlaceholder)), "Immagine fallback calciatore assente");
const teamSquadsRenderer = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(teamSquadsRenderer.includes(playerPlaceholder), "Fallback calciatore non collegato al renderer");
assert.ok(!teamSquadsRenderer.includes("<figcaption>Foto:"), "Il testo della fonte foto non deve essere mostrato");
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
  assert.strictEqual(team.probableLineup.status, "official", `${summary.id}: la distinta conclusa MD1 deve restare ufficiale`);
  assert.ok(team.projectedLineup, `${summary.id}: proiezione MD2 assente`);
  assert.strictEqual(team.projectedLineup.players.length, 11, `${summary.id}: la proiezione MD2 deve avere 11 calciatori`);
  assert.strictEqual(team.projectedLineup.source.provider, "Fantacalcio.it", `${summary.id}: fonte proiezione MD2 assente`);
  assert.ok(team.sources.some(source => source.scope.includes("Modulo preferito")), `${summary.id}: fonte modulo preferito assente`);
  assert.ok(team.sources.some(source => source.provider === "Fantacalcio.it" && source.scope.includes("Probabili formazioni della 2ª giornata")), `${summary.id}: fonte probabile formazione MD2 non registrata`);
  assert.ok(team.sources.some(source => source.provider === "Lega Serie A" && source.scope.includes("Allenatori")), `${summary.id}: fonte allenatore assente`);
  assert.ok(generated.players.length >= 20, `${summary.id}: rosa troppo corta`);
  assert.strictEqual(team.squad.length, generated.players.length, `${summary.id}: rosa non propagata`);
  assert.strictEqual(summary.playerCount, generated.players.length, `${summary.id}: conteggio indice errato`);
  assert.strictEqual(new Set(generated.players.map(player => player.id)).size, generated.players.length, `${summary.id}: ID duplicati`);
  assert.ok(generated.rosterSource?.url, `${summary.id}: fonte rosa assente`);
  for (const playerId of expectedRosterAdditions[summary.id] || []) {
    assert.ok(generated.players.some(player => player.id === playerId), `${summary.id}: calciatore aggiunto assente (${playerId})`);
  }
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
    const wikimediaPhoto = wikimediaPhotoByPlayer.get(`${summary.id}:${player.id}`);
    if (wikimediaPhoto) {
      const builtPlayer = team.squad.find(item => item.id === player.id);
      assert.strictEqual(builtPlayer.photoAttribution?.provider, "Wikimedia Commons", `${summary.id}/${player.id}: attribuzione Wikimedia assente`);
      assert.ok(wikimediaPhoto.descriptionUrl && wikimediaPhoto.license && wikimediaPhoto.artist, `${summary.id}/${player.id}: metadati Wikimedia incompleti`);
      if (wikimediaPhoto.localPath) {
        assert.ok(fs.existsSync(path.join(root, ...wikimediaPhoto.localPath.split("/"))), `${summary.id}/${player.id}: file Wikimedia locale assente`);
        assert.strictEqual(builtPlayer.photo, `../${wikimediaPhoto.localPath}`, `${summary.id}/${player.id}: percorso foto locale non propagato`);
      } else {
        assert.strictEqual(builtPlayer.photo, wikimediaPhoto.thumbnailUrl, `${summary.id}/${player.id}: fallback Wikimedia non propagato`);
      }
    }
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
assert.strictEqual(wikimediaPhotos.summary.matchedPhotos, wikimediaPhotos.entries.length, "Conteggio foto Wikimedia errato");
assert.strictEqual(wikimediaPhotos.summary.localPhotos, wikimediaPhotos.entries.filter(entry => entry.localPath).length, "Conteggio foto Wikimedia locali errato");
console.log(`Tutte le squadre: 20/20, ${totalPlayers} calciatori, ${coveredPlayers} con statistiche 2025/26, ${specificRoles} ruoli tattici specifici fuori dal Milan.`);
