const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const index = read("data/teams/index.json");
const playerLeaderboards = read("data/teams/player-leaderboards.json");
const mainApp = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
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
assert.ok(mainApp.includes("data/teams/index.json") && mainApp.includes("team-directory-grid") && mainApp.includes("statistiche-squadra/${team.id}.html"), "Elenco delle 20 squadre non integrato nella pagina principale");
const expectedLeaderboardMetrics = ["appearances", "minutes", "goals", "goalsPer90", "assists", "assistsPer90", "shots", "shotsPer90", "shotsOnTarget", "shotsOnTargetPer90", "cards", "cardsPer90", "foulsCommitted", "foulsCommittedPer90", "foulsWon", "foulsWonPer90"];
assert.deepStrictEqual(Object.keys(playerLeaderboards.rankings), expectedLeaderboardMetrics, "Le Top 15 non coprono tutte le statistiche giocatore");
for (const [metric, ranking] of Object.entries(playerLeaderboards.rankings)) {
  assert.strictEqual(ranking.players.length, 15, `${metric}: la classifica deve contenere 15 calciatori`);
  assert.ok(ranking.availablePlayers >= 15, `${metric}: copertura insufficiente`);
  assert.ok(ranking.players.every((player, index) => Number.isFinite(player.value) && (!index || player.value <= ranking.players[index - 1].value)), `${metric}: valori non ordinati`);
  assert.strictEqual(new Set(ranking.players.map(player => `${player.currentTeamId}|${player.id}`)).size, 15, `${metric}: calciatori duplicati`);
  assert.ok(ranking.players.every(player => index.teams.some(team => team.id === player.currentTeamId)), `${metric}: squadra 2026/27 non valida`);
}
for (const contract of ["loadPlayerLeaderboards", "globalPlayerLeaderboards", "globalPlayerLeaderboardTable", "Top 15 calciatori per statistica", "data-player-stat", "serie-b-marker", "aria-pressed"]) assert.ok(mainApp.includes(contract), `Top 15 globale: contratto ${contract} assente`);
for (const contract of [".global-player-leaders", ".global-player-table", ".global-leader-player", ".global-leader-value", ".global-stat-button", ".serie-b-marker"]) assert.ok(styles.includes(contract), `Top 15 globale: stile ${contract} assente`);
const globalTableSource = mainApp.slice(mainApp.indexOf("function globalPlayerLeaderboardTable"), mainApp.indexOf("function globalPlayerLeaderboards"));
assert.ok(!globalTableSource.includes("<th>Competizione</th>"), "La Top 15 non deve mostrare la colonna Competizione");
assert.ok(!mainApp.includes('id="global-player-stat"'), "La selezione Top 15 non deve usare un menu a tendina");
assert.ok(!mainApp.includes("Riepilogo statistico") && !mainApp.includes("season-summary"), "Il riepilogo statistico non deve essere mostrato in Statistiche squadre");
const teamInterface = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(!teamInterface.includes("Copertura completa") && !mainApp.includes("Copertura completa") && !teamStatsShell.includes("Copertura completa"), "Il banner Copertura completa non deve essere mostrato");
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
