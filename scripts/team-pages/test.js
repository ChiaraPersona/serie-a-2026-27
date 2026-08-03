const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { calculateStandings } = require("../standings.js");
const root = path.resolve(__dirname, "../..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const index = read("data/teams/index.json");
const playerLeaderboards = read("data/teams/player-leaderboards.json");
const mainApp = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
const teamStatsShell = fs.readFileSync(path.join(root, "statistiche-squadre.html"), "utf8");
const teamPageShell = fs.readFileSync(path.join(root, "statistiche-squadra", "inter.html"), "utf8");
assert.strictEqual(index.teams.length, 20, "Sono richieste 20 squadre");
assert.strictEqual(new Set(index.teams.map(team => team.id)).size, 20, "ID squadra duplicati");
for (const summary of index.teams) {
  const team = read(`data/teams/${summary.id}.json`);
  assert.strictEqual(summary.monochromeLogo, `../assets/images/teams/monochrome/${summary.id}-black.svg`);
  assert.strictEqual(team.monochromeLogo, summary.monochromeLogo);
  assert.ok(fs.existsSync(path.join(root, summary.monochromeLogo.replace(/^\.\.\//, ""))), `${summary.id}: logo monocromatico nero assente`);
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
assert.ok(mainApp.includes("team.monochromeLogo||team.logo"), "Le card Statistiche squadre non usano il logo monocromatico nero");
const expectedLeaderboardMetrics = ["goals", "assists", "shots", "shotsOnTarget", "cards", "foulsCommitted", "foulsWon"];
assert.deepStrictEqual(Object.keys(playerLeaderboards.rankings), expectedLeaderboardMetrics, "Le Top 15 non coprono tutte le statistiche giocatore");
for (const [metric, ranking] of Object.entries(playerLeaderboards.rankings)) {
  assert.strictEqual(ranking.players.length, 15, `${metric}: la classifica deve contenere 15 calciatori`);
  assert.ok(ranking.availablePlayers >= 15, `${metric}: copertura insufficiente`);
  assert.ok(ranking.players.every((player, index) => Number.isFinite(player.totalValue) && (!index || player.totalValue <= ranking.players[index - 1].totalValue)), `${metric}: valori non ordinati`);
  assert.ok(ranking.players.every(player => !ranking.hasPer90 || player.per90Value === null || Number.isFinite(player.per90Value)), `${metric}: media /90 non valida`);
  assert.strictEqual(new Set(ranking.players.map(player => `${player.currentTeamId}|${player.id}`)).size, 15, `${metric}: calciatori duplicati`);
  assert.ok(ranking.players.every(player => index.teams.some(team => team.id === player.currentTeamId)), `${metric}: squadra 2026/27 non valida`);
  assert.ok(ranking.players.every(player => !["Internazionale", "AS Roma"].includes(player.previousTeam)), `${metric}: alias squadra non normalizzato`);
  assert.ok(ranking.players.every(player => !player.sameClub || player.previousTeam === player.currentTeam), `${metric}: duplicato fra squadra attuale e precedente non riconosciuto`);
}
for (const contract of ["loadPlayerLeaderboards", "globalPlayerLeaderboards", "globalPlayerLeaderboardTable", "Top 15 calciatori per statistica", "data-player-stat", "serie-b-marker", "same-club-marker", "aria-pressed", "per90Value", "stessa riga"]) assert.ok(mainApp.includes(contract), `Top 15 globale: contratto ${contract} assente`);
for (const contract of [".global-player-leaders", ".global-player-table", ".global-leader-player", ".global-leader-value", ".global-leader-rate", ".global-stat-button", ".serie-b-marker", ".same-club-marker"]) assert.ok(styles.includes(contract), `Top 15 globale: stile ${contract} assente`);
const globalTableSource = mainApp.slice(mainApp.indexOf("function globalPlayerLeaderboardTable"), mainApp.indexOf("function globalPlayerLeaderboards"));
assert.ok(!globalTableSource.includes("<th>Competizione</th>"), "La Top 15 non deve mostrare la colonna Competizione");
assert.ok(globalTableSource.includes("<th>PG</th><th>Min</th>"), "Presenze e minuti devono comparire in ogni classifica");
assert.ok(!mainApp.includes('data-player-stat="appearances"') && !mainApp.includes('data-player-stat="minutes"'), "Presenze e minuti non devono avere classifiche autonome");
assert.ok(!mainApp.includes("classifiche disponibili"), "Il conteggio delle classifiche non deve comparire nel selettore compatto");
assert.ok(!mainApp.includes('id="global-player-stat"'), "La selezione Top 15 non deve usare un menu a tendina");
assert.ok(!mainApp.includes("Riepilogo statistico") && !mainApp.includes("season-summary"), "Il riepilogo statistico non deve essere mostrato in Statistiche squadre");
for (const contract of ["reading-fixture-preview", "Anteprima della lettura", "prediction.verdict.label", "likelyScore", "prediction.confidence.value"]) assert.ok(mainApp.includes(contract), `Card Letture: anteprima ${contract} assente`);
for (const contract of [".reading-fixture-preview", ".reading-fixture-preview-text"]) assert.ok(styles.includes(contract), `Card Letture: stile ${contract} assente`);
const teamInterface = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
assert.ok(!mainApp.includes("giornata di riferimento") && !teamInterface.includes("Data da definire · riferimento"), "Le date non definite non devono mostrare una data di riferimento");
assert.ok(teamInterface.includes("Stato degli obiettivi") && teamInterface.includes("calculateObjectiveMetrics"), "Lo stato degli obiettivi non è integrato nelle pagine squadra");
assert.ok(teamInterface.includes("personalCalendar") && teamInterface.includes("Calendario di ${esc(team.name)}"), "Il calendario personale non è integrato nelle pagine squadra");
assert.ok(teamInterface.includes('id="team-calendar-select"') && teamInterface.includes('id="team-calendar-selection"') && teamInterface.includes("teamFixtureRow") && !teamInterface.includes("team-calendar-list"), "Il calendario personale deve usare un menu a tendina e mostrare una sola partita");
assert.ok(teamInterface.includes('assets/images/teams/monochrome/${esc(team.id)}-black.svg'), "Il calendario personale deve usare i loghi vettoriali neri preparati");
const teamNavSource = mainApp.slice(mainApp.indexOf('const teamNav='), mainApp.indexOf('const calendarDays='));
assert.ok(teamNavSource.includes('src="${esc(team.logo)}"') && !teamNavSource.includes("monochrome"), "La barra Calendario per squadra deve usare i loghi originali colorati");
assert.ok(styles.includes('.team-nav-link img') && styles.includes('filter:drop-shadow('), "I loghi del selettore squadre devono avere un'ombreggiatura di contrasto");
const currentMatches = read("data/normalized/matches.json").filter(match => match.competition === "serie-a" && match.season === "2026-27");
for (const summary of index.teams) {
  const fixtures = currentMatches.filter(match => match.homeTeam === summary.id || match.awayTeam === summary.id);
  assert.strictEqual(fixtures.length, 38, `${summary.id}: il calendario personale deve contenere 38 partite`);
  assert.deepStrictEqual(fixtures.map(match => match.matchday).sort((left, right) => left - right), Array.from({ length: 38 }, (_, index) => index + 1), `${summary.id}: giornate mancanti o duplicate nel calendario personale`);
}
assert.ok(teamPageShell.includes("scripts/standings.js") && teamPageShell.includes("scripts/objective-metrics.js"), "Le pagine squadra non caricano il motore condiviso degli obiettivi");
assert.ok(!teamInterface.includes("Copertura completa") && !mainApp.includes("Copertura completa") && !teamStatsShell.includes("Copertura completa"), "Il banner Copertura completa non deve essere mostrato");
assert.ok(!fs.existsSync(path.join(root, "statistiche-giocatori.html")), "La pagina Statistiche giocatori deve essere rimossa");
assert.ok(!fs.existsSync(path.join(root, "classifica.html")), "La pagina Classifica deve essere rimossa");
const generatedHtml = fs.readdirSync(root).filter(file => file.endsWith(".html")).map(file => fs.readFileSync(path.join(root, file), "utf8"))
  .concat(fs.readdirSync(path.join(root, "statistiche-squadra")).filter(file => file.endsWith(".html")).map(file => fs.readFileSync(path.join(root, "statistiche-squadra", file), "utf8"))).join("\n");
assert.ok(!generatedHtml.includes("statistiche-giocatori"), "Un collegamento alla pagina rimossa è ancora presente");
assert.ok(!generatedHtml.includes('href="classifica.html"') && !generatedHtml.includes('href="../classifica.html"'), "Un collegamento alla pagina Classifica rimossa è ancora presente");
assert.ok(mainApp.includes('if(page==="home")') && mainApp.includes('data-standings-tab="current"') && mainApp.includes('data-standings-tab="archive"'), "Le due classifiche devono essere renderizzate nella Home");
for (const marker of ['label:"R+"', 'label:"R-"', 'label:"C+"', 'label:"C-"', "configureStandingsTables()", "data-sortable-standings"]) assert.ok(mainApp.includes(marker), `Classifica dinamica: manca ${marker}`);
for (const tooltip of ["Rigori assegnati a favore", "Rigori subiti contro", "Cartellini assegnati agli avversari", "Cartellini ricevuti dalla squadra"]) assert.ok(mainApp.includes(tooltip), `Tooltip classifica mancante: ${tooltip}`);
assert.ok(styles.includes("width:calc(100% + 288px);min-width:1088px"), "Le quattro nuove colonne devono essere aggiunte senza restringere quelle esistenti");
for (const zone of ["standing-zone-champion", "standing-zone-top", "standing-zone-europa", "standing-zone-conference", "standing-zone-bottom"]) assert.ok(mainApp.includes(zone) && styles.includes(zone), `Fascia classifica mancante: ${zone}`);
const disciplineStandings = calculateStandings([{ id: "a" }, { id: "b" }], [{ id: "a-b", competition: "serie-a", status: "finished", homeTeam: "a", awayTeam: "b", score: { home: 1, away: 0 }, teamStats: { home: { penaltiesFor: 1, penaltiesAgainst: 2, yellowCards: 2, secondYellowCards: 0, straightRedCards: 1 }, away: { penaltiesFor: 2, penaltiesAgainst: 1, yellowCards: 4, secondYellowCards: 1, straightRedCards: 0 } } }]);
const disciplineHome = disciplineStandings.find(row => row.team === "a");
assert.deepStrictEqual([disciplineHome.penaltiesFor, disciplineHome.penaltiesAgainst, disciplineHome.cardsFor, disciplineHome.cardsAgainst], [1, 2, 5, 3], "Conteggio R+/R-/C+/C- errato");
const unavailableDiscipline = calculateStandings([{ id: "a" }, { id: "b" }], [{ id: "a-b", competition: "serie-a", status: "finished", homeTeam: "a", awayTeam: "b", score: { home: 0, away: 0 } }]).find(row => row.team === "a");
assert.deepStrictEqual([unavailableDiscipline.penaltiesFor, unavailableDiscipline.penaltiesAgainst, unavailableDiscipline.cardsFor, unavailableDiscipline.cardsAgainst], [null, null, null, null], "I dati disciplinari assenti devono restare N/D");
const homeRenderSource = mainApp.slice(mainApp.indexOf('if(page==="home"){'), mainApp.indexOf('if(page==="calendar")'));
assert.ok(homeRenderSource.includes("homeStandings(standings,previousStandings,objectiveProfiles,teams,standingsTeams)"), "Le classifiche devono essere presenti nella Home");
assert.ok(!homeRenderSource.includes("Esplora il progetto") && !homeRenderSource.includes("feature-grid"), "Esplora il progetto deve essere rimosso dalla Home");
assert.ok(mainApp.includes('leader=completed===0?{teamName:"N/D",points:0}:standings[0]'), "Prima dell'inizio del campionato la Home deve mostrare N/D come capolista");
const homeStandingsSource = mainApp.slice(mainApp.indexOf("function homeStandings"), mainApp.indexOf("const dayNav"));
assert.ok(!homeStandingsSource.includes("objectiveStatusSection(") && !homeStandingsSource.includes("Stato degli obiettivi"), "Lo stato degli obiettivi non deve essere renderizzato nella Home");
const expectedNavigation = [
  ["index.html", "Home"], ["calendario.html", "Calendario"],
  ["statistiche-squadre.html", "Statistiche squadre"], ["lettura.html", "Lettura"],
  ["coppa-italia.html", "Coppa Italia"], ["arbitri.html", "Arbitri"], ["fantacalcio.html", "Fantacalcio"]
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
