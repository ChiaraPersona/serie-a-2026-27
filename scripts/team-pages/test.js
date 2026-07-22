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
assert.ok(teamStatsShell.includes('href="statistiche-squadra/index.html"'), "Collegamento all'indice delle 20 squadre assente");
assert.ok(!mainApp.includes("Riepilogo statistico") && !mainApp.includes("season-summary"), "Il riepilogo statistico non deve essere mostrato in Statistiche squadre");
const teamInterface = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(teamInterface.includes("coverage-complete-card") && mainApp.includes("20 squadre su 20"), "Copertura completa non evidenziata" );
assert.ok(!fs.existsSync(path.join(root, "statistiche-giocatori.html")), "La pagina Statistiche giocatori deve essere rimossa");
const generatedHtml = fs.readdirSync(root).filter(file => file.endsWith(".html")).map(file => fs.readFileSync(path.join(root, file), "utf8"))
  .concat(fs.readdirSync(path.join(root, "statistiche-squadra")).filter(file => file.endsWith(".html")).map(file => fs.readFileSync(path.join(root, "statistiche-squadra", file), "utf8"))).join("\n");
assert.ok(!generatedHtml.includes("statistiche-giocatori"), "Un collegamento alla pagina rimossa è ancora presente");
const expectedNavigation = [
  ["index.html", "Home"], ["calendario.html", "Calendario"], ["classifica.html", "Classifica"],
  ["statistiche-squadre.html", "Statistiche squadre"], ["lettura.html", "Lettura"],
  ["coppa-italia.html", "Coppa Italia"], ["arbitri.html", "Arbitri"]
];
for (const file of fs.readdirSync(root).filter(file => file.endsWith(".html")).map(file => path.join(root, file))
  .concat(fs.readdirSync(path.join(root, "statistiche-squadra")).filter(file => file.endsWith(".html")).map(file => path.join(root, "statistiche-squadra", file)))) {
  const html = fs.readFileSync(file, "utf8");
  const nav = html.match(/<nav id="site-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, `${path.basename(file)}: navbar assente`);
  const links = [...nav.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[1].replace(/^\.\.\//, ""), match[2]]);
  assert.deepStrictEqual(links, expectedNavigation, `${path.basename(file)}: navbar non uniforme`);
}
console.log("Team pages: 20 JSON e 20 pagine valide; competizioni separate; null preservati.");
