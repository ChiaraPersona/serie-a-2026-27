const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { calculateStandings } = require("../standings.js");
const root = path.resolve(__dirname, "../..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const index = read("data/teams/index.json");
const playerLeaderboards = read("data/teams/player-leaderboards.json");
const mainApp = fs.readdirSync(path.join(root, "js"), { recursive: true })
  .filter(file => file.endsWith(".js"))
  .map(file => fs.readFileSync(path.join(root, "js", file), "utf8"))
  .join("\n");
const styles = ["styles", "base", "layout", "components", "home", "matches", "team", "players", "fantasy", "responsive"]
  .map(name => fs.readFileSync(path.join(root, `css/${name}.css`), "utf8"))
  .join("\n");
const teamStatsShell = fs.readFileSync(path.join(root, "statistiche-squadre.html"), "utf8");
const teamPageShell = fs.readFileSync(path.join(root, "statistiche-squadra", "inter.html"), "utf8");
const sourcesShell = fs.readFileSync(path.join(root, "fonti.html"), "utf8");
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
  assert.deepStrictEqual(Object.keys(team.teamStats.seasons), ["2026/27", "2025/26"], `${team.id}: statistiche stagionali non separate`);
  assert.strictEqual(team.teamStats.seasons["2026/27"].competition, "Serie A");
  assert.strictEqual(team.teamStats.seasons["2025/26"].competition, team.previousSeason.competition);
  assert.strictEqual(team.teamStats.total.results.played, team.teamStats.seasons["2026/27"].results.played + team.teamStats.seasons["2025/26"].results.played, `${team.id}: totale partite incoerente`);
  assert.strictEqual(team.teamStats.total.results.points, team.teamStats.seasons["2026/27"].results.points + team.teamStats.seasons["2025/26"].results.points, `${team.id}: totale punti incoerente`);
  for (const section of [team.teamStats.attack, team.teamStats.possession]) {
    assert.ok(Object.values(section).every(value => value === null), "Un campo non disponibile deve essere null");
  }
}
assert.ok(mainApp.includes("data/teams/index.json") && mainApp.includes("team-directory-grid") && mainApp.includes("statistiche-squadra/${team.id}.html"), "Elenco delle 20 squadre non integrato nella pagina principale");
assert.ok(mainApp.includes("team.monochromeLogo||team.logo"), "Le card Statistiche squadre non usano il logo monocromatico nero");
assert.ok(styles.includes("Statistiche squadre mobile: logo e riepilogo dentro un'unica card") && styles.includes("grid-template-columns:98px minmax(0,1fr)") && styles.includes(".team-flip-face{\n    position:relative"), "Su mobile ogni squadra deve usare una sola card visiva");
const expectedLeaderboardMetrics = ["goals", "assists", "shots", "shotsOnTarget", "cards", "foulsCommitted", "foulsWon"];
assert.strictEqual(playerLeaderboards.schemaVersion, 2);
assert.deepStrictEqual(Object.keys(playerLeaderboards.periods), ["2026/27", "2025/26", "total"], "Le classifiche individuali non sono separate per periodo");
for (const [periodId, period] of Object.entries(playerLeaderboards.periods)) for (const [metric, ranking] of Object.entries(period.rankings)) {
  assert.deepStrictEqual(Object.keys(period.rankings), expectedLeaderboardMetrics, `${periodId}: le Top 15 non coprono tutte le statistiche giocatore`);
  assert.strictEqual(ranking.players.length, Math.min(15, ranking.availablePlayers), `${periodId} ${metric}: dimensione classifica incoerente con la copertura`);
  assert.ok(ranking.players.every((player, index) => Number.isFinite(player.totalValue) && (!index || player.totalValue <= ranking.players[index - 1].totalValue)), `${metric}: valori non ordinati`);
  assert.ok(ranking.players.every(player => !ranking.hasPer90 || player.per90Value === null || Number.isFinite(player.per90Value)), `${metric}: media /90 non valida`);
  assert.strictEqual(new Set(ranking.players.map(player => `${player.currentTeamId}|${player.id}`)).size, ranking.players.length, `${metric}: calciatori duplicati`);
  assert.ok(ranking.players.every(player => index.teams.some(team => team.id === player.currentTeamId)), `${metric}: squadra 2026/27 non valida`);
  assert.ok(ranking.players.every(player => !["Internazionale", "AS Roma"].includes(player.previousTeam)), `${metric}: alias squadra non normalizzato`);
  assert.ok(ranking.players.every(player => !player.sameClub || player.previousTeam === player.currentTeam), `${metric}: duplicato fra squadra attuale e precedente non riconosciuto`);
}
assert.strictEqual(playerLeaderboards.periods["2026/27"].rankings.foulsCommitted.availablePlayers, 255, "I falli 2026/27 verificati devono coprire tutti i partecipanti");
assert.strictEqual(playerLeaderboards.periods["2026/27"].rankings.foulsWon.availablePlayers, 255, "I falli subiti 2026/27 verificati devono coprire tutti i partecipanti");
assert.strictEqual(playerLeaderboards.periods.total.rankings.foulsWon.availablePlayers, 208, "Il totale falli deve includere soltanto i calciatori coperti in entrambe le stagioni");
const currentParticipants = playerLeaderboards.periods["2026/27"].rankings.goals.availablePlayers;
assert.ok(playerLeaderboards.periods["2026/27"].rankings.shots.availablePlayers < currentParticipants && playerLeaderboards.periods["2026/27"].rankings.shotsOnTarget.availablePlayers < currentParticipants, "La copertura parziale dei tiri 2026/27 deve restare esplicita");
for (const contract of ["loadPlayerLeaderboards", "globalPlayerLeaderboards", "globalPlayerLeaderboardTable", "Top 15 calciatori per statistica", "data-player-period", "data-player-stat", "Totale 2025/26 + 2026/27", "serie-b-marker", "aria-pressed", "per90Value", "stessa riga"]) assert.ok(mainApp.includes(contract), `Top 15 globale: contratto ${contract} assente`);
assert.ok(mainApp.includes("Copertura dati 2026/27: ${coverage}") && mainApp.includes("ranking.availablePlayers"), "La Top 15 deve mostrare una copertura dinamica per ogni statistica");
for (const contract of [".global-player-leaders", ".global-player-table", ".global-leader-player", ".global-leader-value", ".global-leader-rate", ".global-stat-button", ".serie-b-marker", ".global-col-player", ".global-col-rate"]) assert.ok(styles.includes(contract), `Top 15 globale: stile ${contract} assente`);
const globalTableSource = mainApp.slice(mainApp.indexOf("function globalPlayerLeaderboardTable"), mainApp.indexOf("function globalPlayerLeaderboards"));
assert.ok(!globalTableSource.includes("<th>Competizione</th>"), "La Top 15 non deve mostrare la colonna Competizione");
assert.ok(globalTableSource.includes("<th>PG</th><th>Min</th>"), "Presenze e minuti devono comparire in ogni classifica");
assert.ok(!globalTableSource.includes("Squadra 2025/26") && !globalTableSource.includes("same-club-marker"), "La Top 15 non deve mostrare la squadra 2025/26");
assert.ok(globalTableSource.includes("<colgroup>") && styles.includes("table-layout:fixed"), "Le colonne della Top 15 devono mantenere larghezze fisse fra le classifiche");
assert.ok(!mainApp.includes('data-player-stat="appearances"') && !mainApp.includes('data-player-stat="minutes"'), "Presenze e minuti non devono avere classifiche autonome");
assert.ok(!mainApp.includes("classifiche disponibili"), "Il conteggio delle classifiche non deve comparire nel selettore compatto");
assert.ok(!mainApp.includes('id="global-player-stat"'), "La selezione Top 15 non deve usare un menu a tendina");
assert.ok(!mainApp.includes("Riepilogo statistico") && !mainApp.includes('class="season-summary"'), "Il vecchio riepilogo statistico non deve essere mostrato in Statistiche squadre");
for (const contract of ["reading-fixture-preview", "Anteprima della lettura", "prediction.verdict.label", "likelyScore", "prediction.confidence.value"]) assert.ok(mainApp.includes(contract), `Card Letture: anteprima ${contract} assente`);
for (const contract of ["readingPostMatchReport", "Tabellino e statistiche", "Partite concluse", "reading-player-table", "match.playerStats", "Analisi prepartita archiviata"]) assert.ok(mainApp.includes(contract), `Letture post-partita: contratto ${contract} assente`);
const postMatchSource = mainApp.slice(mainApp.indexOf("function readingPostMatchReport"), mainApp.indexOf("function readingPrototypeDetail"));
assert.ok(!postMatchSource.includes("reading-post-match-score"), "Il tabellino non deve ripetere il riquadro con risultato e squadre");
for (const contract of ['["Tiri totali", "shots", ""]', '["Falli commessi", "fouls", ""]', '["Falli subiti", "fouls", "", true]', 'fromOpponent?"away":"home"', 'fromOpponent?"home":"away"']) assert.ok(postMatchSource.includes(contract), `Tabella statistiche reali: contratto ${contract} assente`);
assert.ok(mainApp.includes("Risultato principale pronosticato") && mainApp.includes("prediction?.scoreForecast?.primary?.score"), "Le Letture concluse devono conservare il risultato principale pronosticato");
const readingHeroSource = mainApp.slice(mainApp.indexOf("function readingPrototypeDetail"), mainApp.indexOf("function renderProbableLineups"));
assert.ok(readingHeroSource.includes('class="reading-matchup" aria-label=') && readingHeroSource.includes("teamLogo(home,{showName:false})") && readingHeroSource.includes("teamLogo(away,{showName:false})"), "La testata della Lettura non deve ripetere i nomi delle squadre accanto al risultato");
assert.strictEqual((readingHeroSource.match(/reading-prediction-card/g)||[]).length, 1, "Ogni Lettura deve mostrare un solo risultato principale pronosticato sotto la testata");
for (const removed of ["reading-result-card", "reading-coverage-card", "Copertura post-partita", "Risultato finale"]) assert.ok(!readingHeroSource.includes(removed), `Riepilogo Lettura: contenuto rimosso ${removed} ancora presente`);
for (const contract of [".reading-hero-summary.reading-result-summary", ".reading-match-hero.is-finished .reading-matchup>b"]) assert.ok(styles.includes(contract), `Riepilogo Lettura conclusa: stile ${contract} assente`);
for (const contract of [".reading-fixture-preview", ".reading-fixture-preview-text"]) assert.ok(styles.includes(contract), `Card Letture: stile ${contract} assente`);
for (const contract of ['reading-fixture match fixture-card fixture-card-link', 'class="match-head"', 'class="matchday-chip"', 'class="match-date"', 'teamColorStyle']) assert.ok(mainApp.includes(contract), `Card Letture: struttura calendario ${contract} assente`);
for (const removed of ['reading-fixture-footer', 'Pronostico preliminare · sorpresa', 'Precedenti ${history.coverage.available}/5']) assert.ok(!mainApp.includes(removed), `Card Letture: contenuto inferiore ${removed} ancora presente`);
const teamInterface = fs.readFileSync(path.join(root, "js/team-squads.js"), "utf8");
const squadTableSource = teamInterface.slice(teamInterface.indexOf("function squadTable"), teamInterface.indexOf("function entryDetail"));
for (const removedColumn of ["Stato", "Squadra 2025/26", "Competizione", "squad-col-status", "squad-col-team", "squad-col-competition"]) assert.ok(!squadTableSource.includes(removedColumn), `Tabella calciatori: colonna rimossa ancora presente: ${removedColumn}`);
for (const retainedColumn of ["Valore mercato", "PG", "Min", "squad-col-market", "squad-col-played", "squad-col-minutes"]) assert.ok(squadTableSource.includes(retainedColumn), `Tabella calciatori: colonna richiesta assente: ${retainedColumn}`);
assert.ok(styles.includes(".squad-table{width:1621px;min-width:1621px;table-layout:fixed}"), "Tabella calciatori: larghezza non riallineata alle colonne rimaste");
for (const removedCopy of ["Copertura statistica" + " individuale", "Le schede separano squadra" + " e competizione 2025/26"]) assert.ok(!teamInterface.includes(removedCopy), `Pagine squadra: testo rimosso ancora presente: ${removedCopy}`);
const teamPageSource = teamInterface.slice(teamInterface.indexOf("function teamPage"), teamInterface.indexOf("async function init"));
assert.ok(!teamPageSource.includes('<h2>Fonti</h2>') && !teamPageSource.includes("team.sources.map"), "Le fonti non devono comparire in fondo alle pagine squadra");
assert.strictEqual((sourcesShell.match(/data-source-team=/g) || []).length, 20, "La pagina Fonti deve raccogliere tutte le 20 squadre");
assert.ok(sourcesShell.includes("Fonti registrate") && sourcesShell.includes("Apri la fonte"), "La pagina Fonti non espone i riferimenti registrati");
assert.ok(teamPageShell.includes('../fonti.html">Fonti</a>') && sourcesShell.includes('href="fonti.html">Fonti</a>'), "Il footer deve collegare la pagina Fonti a ogni profondità");
for (const contract of ['data-team-season="${esc(stats.season)}"', "Statistiche ${esc(stats.season)}", "Totale 2025/26 + 2026/27", "teamSeasonStatsBlock", "teamTotalStatsBlock", '<details class="detail-section team-season-section"', '<summary class="team-season-summary"', '<details class="detail-section team-total-section"']) assert.ok(teamInterface.includes(contract), `Statistiche squadra per stagione: manca ${contract}`);
for (const contract of [".team-season-section", ".team-total-section", ".team-season-summary", ".team-season-content", ".team-season-empty"]) assert.ok(styles.includes(contract), `Statistiche squadra per stagione: stile ${contract} assente`);
assert.ok(!teamInterface.includes('<details class="detail-section team-season-section" open') && !teamInterface.includes('<details class="detail-section team-total-section" open'), "I menu delle statistiche squadra devono partire chiusi");
for (const contract of ["currentSquadLeaderboardRows", "previousSquadLeaderboardRows", "I migliori di ${esc(teamName)} nel ${season}", 'season === "2026/27"', 'id="squad-leaderboards"', "Dati non disponibili", "Scheda N/D", 'closest("button.leader-player")']) assert.ok(teamInterface.includes(contract), `Top 3 squadra per stagione: manca ${contract}`);
const currentTeamLeadersSource = teamInterface.slice(teamInterface.indexOf("function currentSquadLeaderboardRows"), teamInterface.indexOf("function squadLeaderboardSection"));
for (const field of ["foulsCommitted", "foulsWon"]) {
  assert.ok(currentTeamLeadersSource.includes(`row.coverage.${field} === row.appearances`) && currentTeamLeadersSource.includes(`row.sums.${field}`), `Top 3 squadra 2026/27: ${field} non aggregato`);
  assert.ok(!currentTeamLeadersSource.includes(`${field}: null`), `Top 3 squadra 2026/27: ${field} non deve essere forzato a N/D`);
}
for (const contract of [".squad-leaders-summary", ".squad-leaders-content", ".squad-leaders[open]"]) assert.ok(styles.includes(contract), `Top 3 squadra per stagione: stile ${contract} assente`);
const readingLineupSource = mainApp.slice(mainApp.indexOf("function renderProbableLineups"), mainApp.indexOf("function renderReadingPilotEvidence"));
assert.ok(teamInterface.includes("lineup.players.slice(offset, offset + size).reverse()"), "Le probabili formazioni delle pagine squadra devono essere specchiate orizzontalmente");
assert.ok(readingLineupSource.includes("lineup.players.slice(offset,offset+size).reverse()"), "Le probabili formazioni delle Letture devono essere specchiate orizzontalmente");
const officialFixtureByTeam = { inter: "inter-monza-2026-27-md-01", monza: "inter-monza-2026-27-md-01", udinese: "udinese-como-2026-27-md-01", como: "udinese-como-2026-27-md-01", parma: "parma-cagliari-2026-27-md-01", cagliari: "parma-cagliari-2026-27-md-01", genoa: "genoa-napoli-2026-27-md-01", napoli: "genoa-napoli-2026-27-md-01", frosinone: "frosinone-juventus-2026-27-md-01", juventus: "frosinone-juventus-2026-27-md-01", venezia: "venezia-lecce-2026-27-md-01", lecce: "venezia-lecce-2026-27-md-01", torino: "torino-milan-2026-27-md-01", milan: "torino-milan-2026-27-md-01", atalanta: "atalanta-sassuolo-2026-27-md-01", sassuolo: "atalanta-sassuolo-2026-27-md-01", bologna: "bologna-lazio-2026-27-md-01", lazio: "bologna-lazio-2026-27-md-01", roma: "roma-fiorentina-2026-27-md-01", fiorentina: "roma-fiorentina-2026-27-md-01" };
for (const [teamId, fixtureId] of Object.entries(officialFixtureByTeam)) {
  const lineup = index.teams.find(team => team.id === teamId).probableLineup;
  assert.strictEqual(lineup.status, "official", `${teamId}: formazione ufficiale non applicata`);
  assert.strictEqual(lineup.matchId, fixtureId, `${teamId}: formazione ufficiale associata alla gara errata`);
  assert.strictEqual(lineup.players.length, 11, `${teamId}: XI ufficiale incompleto`);
  assert.strictEqual(lineup.shirtNumbers.length, 11, `${teamId}: numeri di maglia ufficiali incompleti`);
}
assert.strictEqual(index.teams.find(team => team.id === "genoa").probableLineup.substitutes.length, 13, "genoa: panchina ufficiale incompleta");
assert.strictEqual(index.teams.find(team => team.id === "napoli").probableLineup.substitutes.length, 13, "napoli: panchina ufficiale incompleta");
assert(index.teams.find(team => team.id === "torino").probableLineup.players.includes("Cesare Casadei") && !index.teams.find(team => team.id === "torino").probableLineup.players.includes("Alieu Njie"), "torino: correzione Casadei/Njie non applicata");
assert.ok(teamInterface.includes("probable-lineup-substitutes") && readingLineupSource.includes("reading-lineup-substitutes"), "Le panchine ufficiali non sono renderizzate nelle pagine squadra e Letture");
assert.ok(teamInterface.includes('official ? "Formazione ufficiale" : "Probabile formazione"'), "Le pagine squadra non distinguono la formazione ufficiale");
assert.ok(readingLineupSource.includes('officialLineups?"Formazioni ufficiali":referenceLineups?"Formazioni di riferimento":"Probabili formazioni"'), "La Lettura non distingue formazioni ufficiali, di riferimento e probabili");
assert.ok(mainApp.includes('<details class="reading-completed-matchday">') && mainApp.includes("Tabellini della giornata ${completed[0].matchday}"), "I tabellini conclusi non usano il menu a tendina per giornata");
assert.ok(mainApp.includes("Storico MVP 2025/26") && mainApp.includes("prediction-mvp-history"), "Lo storico MVP individuale non è esposto nelle Letture");
assert.ok(mainApp.includes("Totale partita") && mainApp.includes("prediction-match-volume") && mainApp.includes("percentili p20–p80"), "I totali volume casa/trasferta non sono esposti nelle Letture");
assert.ok(!mainApp.includes("giornata di riferimento") && !teamInterface.includes("Data da definire · riferimento"), "Le date non definite non devono mostrare una data di riferimento");
assert.ok(teamInterface.includes("Stato degli obiettivi") && teamInterface.includes("calculateObjectiveMetrics"), "Lo stato degli obiettivi non è integrato nelle pagine squadra");
assert.ok(teamInterface.includes("teamNavigation(team, teams)") && teamInterface.includes("Squadra precedente") && teamInterface.includes("Squadra successiva"), "La pagina squadra deve offrire la navigazione precedente/successiva");
assert.ok(!teamInterface.includes("Aggiornato automaticamente") && !teamInterface.includes('class="updated"'), "La pagina squadra non deve mostrare diciture di aggiornamento automatico o la data nel hero");
assert.ok(!teamInterface.includes("Distinta confermata") && !teamInterface.includes("Profilo completo"), "I badge Distinta confermata e Profilo completo non devono essere mostrati");
assert.ok(!teamInterface.includes('<div><p class="eyebrow">${esc(team.previousSeason.competition)} 2025/26'), "Il hero della squadra non deve mostrare la competizione 2025/26 sopra il nome");
assert.ok(teamInterface.includes("personalCalendar") && teamInterface.includes("Calendario di ${esc(team.name)}"), "Il calendario personale non è integrato nelle pagine squadra");
assert.ok(teamInterface.includes('id="team-calendar-select"') && teamInterface.includes('id="team-calendar-selection"') && teamInterface.includes("teamFixtureRow") && !teamInterface.includes("team-calendar-list"), "Il calendario personale deve usare un menu a tendina e mostrare una sola partita");
assert.ok(teamInterface.includes('assets/images/teams/monochrome/${esc(team.id)}-black.svg'), "Il calendario personale deve usare i loghi vettoriali neri preparati");
const teamNavSource = mainApp.slice(mainApp.indexOf('const teamNav='), mainApp.indexOf('const calendarDays='));
const calendarDaysSource = mainApp.slice(mainApp.indexOf('const calendarDays='), mainApp.indexOf('function empty'));
const matchCardSource = mainApp.slice(mainApp.indexOf('function matchCard'), mainApp.indexOf('function homeMatchListItem'));
assert.ok(matchCardSource.includes('class="card match fixture-card fixture-card-link"') && matchCardSource.includes('href="lettura.html?match=${esc(m.id)}"'), "L'intera card partita deve aprire direttamente la lettura");
assert.ok(matchCardSource.includes('class="fixture-official"') && matchCardSource.includes('m.refereeAssignment?.referee?.name'), "La card deve mostrare l'arbitro quando la designazione AIA e disponibile");
assert.ok(mainApp.includes('class="section reading-referee-assignment"') && mainApp.includes('id="lettura-referee"'), "La Lettura deve mostrare la squadra arbitrale ufficiale");
for (const contract of ["reading-referee-profiles-2025-26.json", "reading-referee-stats", "Quando tende ad ammonire", "datasetComparison.yellowCardsPerMatch", "events.reasons.unspecified"]) assert.ok(mainApp.includes(contract), `La Lettura deve mostrare statistiche e tendenze dell'arbitro ufficiale: ${contract}`);
assert.ok(matchCardSource.includes('m.status!=="scheduled"') && !matchCardSource.includes('<div class="actions">'), "Le card partita non devono mostrare Programmata o i pulsanti Lettura/Statistiche");
assert.ok(!matchCardSource.includes('match-events') && !matchCardSource.includes('Marcatori') && !matchCardSource.includes('Ammoniti'), "Le card partita non devono mostrare riquadri evento prima dei dati reali");
assert.ok(teamNavSource.includes('src="${esc(team.logo)}"') && !teamNavSource.includes("monochrome"), "La barra Calendario per squadra deve usare i loghi originali colorati");
assert.ok(styles.includes('.team-nav-link img') && styles.includes('filter:drop-shadow('), "I loghi del selettore squadre devono avere un'ombreggiatura di contrasto");
assert.ok(calendarDaysSource.includes('<details class="calendar-day"') && calendarDaysSource.includes('match.status==="finished"') && calendarDaysSource.includes("day===activeDay?' open':''"), "Il calendario deve chiudere le giornate concluse e aprire la prima non conclusa");
assert.ok(styles.includes('.calendar-list{gap:14px}') && styles.includes('.calendar-list{gap:10px}') && styles.includes('.calendar-day>summary.calendar-day-head'), "Le giornate a tendina devono essere compatte e responsive");
const teamMatchdayStyle = styles.slice(styles.indexOf('.team-matchday .match{'), styles.indexOf('.team-matchday .match-head{'));
assert.ok(!teamMatchdayStyle.includes('background:') && !teamMatchdayStyle.includes('border-color:') && !teamMatchdayStyle.includes('box-shadow:'), "Le card del calendario squadra devono conservare la stessa superficie chiara delle card globali");
assert.ok(!calendarDaysSource.includes('dateOnly(') && !calendarDaysSource.includes('matchdayDate'), "L'intestazione della giornata non deve mostrare una data; le date restano nelle card");
assert.ok(styles.includes('.match.fixture-card .matchday-chip{') && styles.includes('background:transparent;'), "Il testo Giornata X nelle card deve restare privo di riquadro");
assert.ok(styles.includes('body[data-page="cup"] main>.hero+.cup-stage') && styles.includes('body[data-page="readings"] main>.hero+.section{margin-top:24px}'), "Coppa Italia e Lettura devono usare la spaziatura compatta delle altre pagine interne");
const cupCardSource = mainApp.slice(mainApp.indexOf('function cupTeamSlot'), mainApp.indexOf('function cupRound'));
assert.ok(cupCardSource.includes('assets/images/icons/goal-ball.jpg')&&cupCardSource.includes('cup-card-symbol is-${event.type}')&&styles.includes('.cup-card-symbol.is-yellow')&&styles.includes('.cup-card-symbol.is-red'), "Gli eventi Coppa Italia devono usare pallone, cartellino giallo e cartellino rosso");
assert.ok(cupCardSource.includes('cup-team-events')&&!cupCardSource.includes('cup-match-events'), "Marcatori e cartellini devono essere disposti in riga dentro la rispettiva squadra");
assert.ok(styles.includes('.cup-match-card>header .cup-result')&&styles.includes('background:transparent;color:#9a5a08;font-size:16px'), "Il risultato Coppa Italia deve essere evidente e privo di riquadro o sfondo");
assert.ok(styles.includes('.cup-match-card.is-finished .cup-team-slot{height:120px')&&styles.includes('.cup-match-card.is-finished .cup-team-slot{height:200px'), "Le righe squadra delle partite concluse devono avere altezza uniforme su desktop e mobile");
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
assert.ok(!mainApp.includes('class="season-overview"'), "Il riepilogo Squadre/Partite/Capolista/Copertura non deve essere mostrato nella Home");
for (const marker of ['label:"R+"', 'label:"R-"', 'label:"C+"', 'label:"C-"', "configureStandingsTables()", "data-sortable-standings"]) assert.ok(mainApp.includes(marker), `Classifica dinamica: manca ${marker}`);
for (const scope of ['id:"general"', 'id:"home"', 'id:"away"', "data-standings-scope-tab", "data-standings-scope-panel", "activateScope"]) assert.ok(mainApp.includes(scope), `Selettore rendimento 2025/26: manca ${scope}`);
assert.ok(mainApp.includes('id:"general",label:"Generale",eyebrow:"",title:"",description:""'), "La classifica generale corrente non deve mostrare il blocco introduttivo ridondante");
assert.ok(mainApp.includes('class="standings-switch-separator"') && styles.includes("standings-switch-separator"), "I selettori classifica devono essere link testuali separati da una barra");
assert.ok(mainApp.includes("standings-column-active") && styles.includes("standings-column-active") && mainApp.includes('aria-pressed="false"'), "La colonna ordinata deve essere evidenziata visivamente e annunciata ai lettori di schermo");
assert.ok(!mainApp.includes("Esito della stagione") && !mainApp.includes("Verdetti 2025/26") && !mainApp.includes("verdictsPanel"), "Il blocco Verdetti 2025/26 deve essere rimosso dalla Home");
for (const tooltip of ["Rigori assegnati a favore", "Rigori subiti contro", "Cartellini assegnati agli avversari", "Cartellini ricevuti dalla squadra"]) assert.ok(mainApp.includes(tooltip), `Tooltip classifica mancante: ${tooltip}`);
assert.ok(styles.includes("width:calc(100% + 288px);min-width:1088px"), "Le quattro nuove colonne devono essere aggiunte senza restringere quelle esistenti");
for (const zone of ["standing-zone-champion", "standing-zone-top", "standing-zone-europa", "standing-zone-conference", "standing-zone-bottom"]) assert.ok(mainApp.includes(zone) && styles.includes(zone), `Fascia classifica mancante: ${zone}`);
const disciplineStandings = calculateStandings([{ id: "a" }, { id: "b" }], [{ id: "a-b", competition: "serie-a", status: "finished", homeTeam: "a", awayTeam: "b", score: { home: 1, away: 0 }, teamStats: { home: { penaltiesFor: 1, penaltiesAgainst: 2, yellowCards: 2, secondYellowCards: 0, straightRedCards: 1 }, away: { penaltiesFor: 2, penaltiesAgainst: 1, yellowCards: 4, secondYellowCards: 1, straightRedCards: 0 } } }]);
const disciplineHome = disciplineStandings.find(row => row.team === "a");
assert.deepStrictEqual([disciplineHome.penaltiesFor, disciplineHome.penaltiesAgainst, disciplineHome.cardsFor, disciplineHome.cardsAgainst], [1, 2, 5, 3], "Conteggio R+/R-/C+/C- errato");
const unavailableDiscipline = calculateStandings([{ id: "a" }, { id: "b" }], [{ id: "a-b", competition: "serie-a", status: "finished", homeTeam: "a", awayTeam: "b", score: { home: 0, away: 0 } }]).find(row => row.team === "a");
assert.deepStrictEqual([unavailableDiscipline.penaltiesFor, unavailableDiscipline.penaltiesAgainst, unavailableDiscipline.cardsFor, unavailableDiscipline.cardsAgainst], [null, null, null, null], "I dati disciplinari assenti devono restare N/D");
const homeRenderSource = mainApp.slice(mainApp.indexOf('if(page==="home"){'), mainApp.indexOf('if(page==="calendar")'));
assert.ok(homeRenderSource.includes("homeStandings(standings,currentHomeRows,currentAwayRows,previousStandings,teams,standingsTeams)"), "Le classifiche devono essere presenti nella Home");
assert.ok(!homeRenderSource.includes("Esplora il progetto") && !homeRenderSource.includes("feature-grid"), "Esplora il progetto deve essere rimosso dalla Home");
assert.ok(!homeRenderSource.includes("Apri il calendario"), "Il link Apri il calendario deve essere rimosso dalla Home");
assert.ok(!homeRenderSource.includes("Capolista") && !homeRenderSource.includes("leader="), "La Home non deve calcolare o mostrare la capolista dopo la rimozione del riepilogo");
const homeStandingsSource = mainApp.slice(mainApp.indexOf("function homeStandings"), mainApp.indexOf("const dayNav"));
assert.ok(!homeStandingsSource.includes("objectiveStatusSection(") && !homeStandingsSource.includes("Stato degli obiettivi"), "Lo stato degli obiettivi non deve essere renderizzato nella Home");
assert.ok(mainApp.includes('const routes={home:"home",calendar:"matches",team:"matches","team-stats":"teams"') && mainApp.includes('[teams,matches,previousStandings]=await Promise.all') && mainApp.includes('[teamDirectory,playerLeaderboards]=await Promise.all'), "Router e pagine devono caricare soltanto i dataset necessari");
assert.ok(mainApp.includes('requestedMatchId?"first-leg-2026-27.json":"first-leg-2026-27-summary.json"'), "L'indice Letture deve usare il riepilogo H2H leggero");
const expectedNavigation = [
  ["index.html", "Home"], ["calendario.html", "Calendario"],
  ["statistiche-squadre.html", "Statistiche squadre"], ["lettura.html", "Lettura"],
  ["coppa-italia.html", "Coppa Italia"], ["arbitri.html", "Arbitri"], ["fantacalcio.html", "Fantacalcio"],
  ["schedina.html", "Schedina"]
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
