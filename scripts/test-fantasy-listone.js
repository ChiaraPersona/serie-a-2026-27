const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const source = read("data/sources/fantacalcio-quotations-2026-27.json");
const callups = read("data/sources/fantacalcio-callups-md1-2026-27.json");
const statsSource = read("data/sources/fantacalcio-stats-2025-26.json");
const externalStatsSource = read("data/sources/fantasy-external-stats-2025-26.json");
const probable = read("data/sources/probable-lineups-md3-2026-27.json");
const injuries = read("data/sources/fantacalcio-injuries-2026-27.json");
const goalkeeperHierarchy = read("data/sources/fantasy-goalkeeper-hierarchy-2026-27.json");
const generated = read("data/generated/fantacalcio-advice.json");
const teamPagePlayers = read("data/normalized/teams.json").flatMap(team => read(`data/generated/team-pages/${team.id}-squad.json`).players);
const appSource = fs.readdirSync(path.join(root, "js"), { recursive: true })
  .filter(file => file.endsWith(".js"))
  .map(file => fs.readFileSync(path.join(root, "js", file), "utf8"))
  .join("\n");

assert.equal(source.season, "2026/27");
assert.equal(source.players.length, source.coverage.activePlayers);
assert.equal(source.departed.length, source.coverage.departedPlayers);
assert.equal(new Set(source.players.map(player => player.sourceId)).size, source.players.length);
assert.deepEqual(source.coverage.byRole, Object.fromEntries(["P", "D", "C", "A"].map(role => [role, source.players.filter(player => player.role === role).length])));
assert.equal(new Set(source.players.map(player => player.teamId)).size, 20);
assert.equal(callups.coverage.teams, 20);
assert.equal(callups.coverage.teamsWithOfficialList, 18);
assert.deepEqual(callups.coverage.incompleteTeams, ["lazio", "sassuolo"]);
const callupIdsByTeam = new Map(callups.teams.map(team => [team.teamId, new Set(team.players.map(player => String(player.sourceId))) ]));
const historicalCallupIds = new Set(callups.teams.flatMap(team => team.players.map(player => String(player.sourceId))));
for (const player of source.players.filter(player => historicalCallupIds.has(String(player.sourceId)))) {
  const originalTeam = callups.teams.find(team => team.players.some(entry => String(entry.sourceId) === String(player.sourceId)));
  if (originalTeam?.teamId === player.teamId) assert.ok(callupIdsByTeam.get(player.teamId).has(String(player.sourceId)), `${player.team}:${player.name} non presente nella pagina Convocati`);
}
for (const player of source.players) {
  assert.ok(["P", "D", "C", "A"].includes(player.role), `${player.name}: ruolo Classic non valido`);
  for (const field of ["currentQuotation", "initialQuotation", "currentMantraQuotation", "initialMantraQuotation", "fvm", "mantraFvm"]) {
    assert.ok(player[field] === null || Number.isFinite(player[field]), `${player.name}: ${field} non numerico`);
  }
}

assert.equal(generated.listone.players.length, source.players.length);
assert.equal(generated.listone.coverage.matchedCurrentPlayers, source.coverage.matchedCurrentPlayers);
assert.equal(teamPagePlayers.length, source.players.length, "le schede squadra devono coprire tutto il listone ufficiale");
assert.ok(teamPagePlayers.every(player => player.dataQuality?.status === "complete"), "ogni calciatore del listone deve avere statistiche 2025/26 complete");
assert.ok(generated.methodology.description.includes("correttivo del 15%"));
assert.equal(probable.coverage.teams, 20);
assert.equal(probable.coverage.starters, 220);
const probablePlayers = probable.teams.flatMap(team => team.players);
assert.equal(probable.coverage.unmatched, probablePlayers.filter(player => player.matchStatus === "unmatched").length);
assert.equal(probable.provider, "Fantacalcio.it");
assert.ok(probable.teams.every(team => team.players.filter(player => player.lineupStatus === "starter").length === 11), "ogni squadra deve avere 11 titolari editoriali");
assert.ok(probablePlayers.every(player => Number.isFinite(player.probability)), "Fantacalcio deve fornire una percentuale editoriale per ogni calciatore");
assert.equal(injuries.coverage.teams, 20);
assert.ok(injuries.coverage.reports > 0);
assert.equal(injuries.coverage.unmatched, 0);
assert.equal(generated.sources.probableLineups.matchday, 3);
assert.equal(generated.sources.injuries.coverage.reports, injuries.coverage.reports);
const quotedAdvice = generated.players.filter(player => player.quotations);
assert.ok(quotedAdvice.length > 350, `Copertura quotazioni insufficiente: ${quotedAdvice.length}`);
for (const player of quotedAdvice) {
  assert.ok(player.quotations.classic === null || Number.isFinite(player.quotations.classic));
  assert.ok(player.quotations.fvm === null || Number.isFinite(player.quotations.fvm));
}

const adviceIds = new Set(generated.players.map(player => player.id));
const unlinkedListone = generated.listone.players.filter(player => !player.playerId || !adviceIds.has(player.playerId));
const unifiedCount = generated.players.length + unlinkedListone.length;
const statsBySourceId = new Map(statsSource.players.map(player => [String(player.sourceId), player]));
const externalStatsByPlayerId = new Map(externalStatsSource.players.map(player => [player.playerId, player]));
const recoverableGoalAssists = unlinkedListone.filter(player => {
  const stats = statsBySourceId.get(String(player.sourceId));
  return Number.isFinite(stats?.goalsFor) && Number.isFinite(stats?.assists);
});
assert.ok(source.coverage.unmatchedActivePlayers === 0 || recoverableGoalAssists.length > 0, "nessun G/A recuperabile per i profili solo listone");
for (const player of recoverableGoalAssists) {
  const stats = statsBySourceId.get(String(player.sourceId));
  assert.equal(player.goals, stats.goalsFor, `${player.name}: gol storici non propagati`);
  assert.equal(player.assists, stats.assists, `${player.name}: assist storici non propagati`);
}
for (const playerId of ["christos-mandas", "lorenzo-torriani"]) {
  const player = generated.players.find(entry => entry.id === playerId);
  const stats = statsSource.players.find(entry => entry.playerId === playerId);
  assert.equal(player.goals, stats.goalsFor, `${playerId}: gol storici non propagati`);
  assert.equal(player.assists, stats.assists, `${playerId}: assist storici non propagati`);
}
const externallyCoveredListone = unlinkedListone.filter(player => externalStatsByPlayerId.has(player.playerId));
assert.ok(source.coverage.unmatchedActivePlayers === 0 || externallyCoveredListone.length >= 39, "copertura ESPN esterna insufficiente per i profili solo listone");
for (const player of externallyCoveredListone) {
  const stats = externalStatsByPlayerId.get(player.playerId).totals;
  assert.equal(player.appearances, stats.appearances, `${player.name}: presenze ESPN non propagate`);
  assert.equal(player.minutes, stats.minutes, `${player.name}: minuti ESPN non propagati`);
  if (!statsBySourceId.has(String(player.sourceId))) {
    assert.equal(player.goals, stats.goals, `${player.name}: gol ESPN non propagati`);
    assert.equal(player.assists, stats.assists, `${player.name}: assist ESPN non propagati`);
  }
}
assert.ok(appSource.includes('[["Indice","score"],["Qt. Classic","quotation"],["FVM","fvm"],["Valore mercato","marketValue"],["Valore consigliato","price"],["Pres.","appearances"]'), "ordinamento presenze non collegato");
assert.ok(unifiedCount >= generated.players.length && unifiedCount < 634, "l'unione deve deduplicare i profili collegati senza perdere righe");
assert.ok(appSource.includes("function fantasyUnifiedPlayers"), "funzione di unione tabella mancante");
assert.ok(!appSource.includes("function fantasyListoneSection"), "il vecchio elenco separato non deve essere renderizzato");
assert.ok(!appSource.includes('id="listone-players"'), "tbody del vecchio listone ancora presente");
assert.ok(appSource.includes('removedColumns=new Set(["Affidabilità","Titolarità 1ª","Stato fisico"])'), "rimozione delle tre colonne non configurata");
assert.ok(!appSource.includes("<td>${esc(player.reliability)}</td>"), "cella affidabilità ancora renderizzata");
assert.ok(!appSource.includes("<td>${starter}</td>"), "cella titolarità ancora renderizzata");
assert.ok(!appSource.includes("<td>${injury}</td>"), "cella stato fisico ancora renderizzata");
assert.ok(!appSource.includes("<th>Ruolo Mantra</th>"), "la colonna ruolo Mantra non deve essere renderizzata");
assert.ok(!appSource.includes("<th>Qt. Mantra</th>"), "la colonna quotazione Mantra non deve essere renderizzata");
assert.ok(!appSource.includes("<th>FVM Mantra</th>"), "la colonna FVM Mantra non deve essere renderizzata");
assert.ok(appSource.includes("data.sources?.probableLineups?.url"), "fallback per copie dati senza fonti correnti mancante");
assert.ok(appSource.includes('data.sources.probableLineups.provider||"fonte editoriale"'), "etichetta dinamica della fonte probabili mancante");
assert.ok(appSource.includes("data-fantasy-exclude"), "comando per escludere un consigliato mancante");
assert.ok(appSource.includes('title="Aggiungi alla rosa">+</button>'), "simbolo + per aggiungere mancante");
assert.ok(appSource.includes('title="Non proporre">-</button>'), "simbolo - per escludere mancante");
assert.ok(appSource.includes("data-fantasy-restore"), "comando per ripristinare un escluso mancante");
assert.ok(appSource.includes("Esclusi dai consigli"), "riepilogo degli esclusi mancante");
assert.ok(appSource.includes("calendario completo: 50% giornate 1–8, 30% giornate 9–19, 20% giornate 20–38"), "pesi del calendario completo non dichiarati");
const nicoPaz = generated.players.find(player => player.id === "nico-paz");
assert.ok(nicoPaz, "Nico Paz non collegato alla rosa analitica");
assert.equal(nicoPaz.role, "C", "Nico Paz deve usare il ruolo Classic di centrocampista");
assert.equal(generated.sources.teamLogos.variant, "color", "la pagina Fantacalcio deve usare i loghi colorati");
assert.ok(generated.teams.every(team => !team.fantasyLogo.includes("/monochrome/")), "la pagina Fantacalcio non deve usare loghi monocromatici");
assert.equal(generated.teams.find(team => team.id === "juventus").fantasyLogo, "assets/images/teams/juventus.png");
assert.equal(goalkeeperHierarchy.teams.length, 20, "gerarchie portieri incomplete");
assert.equal(generated.sources.goalkeeperHierarchy.provider, "SOS Fanta");
for (const trio of generated.goalkeeperTrios.examples) {
  for (const player of trio.players) {
    const hierarchy = goalkeeperHierarchy.teams.find(entry => entry.teamId === player.teamId);
    assert.ok(hierarchy?.trioEligible, `${player.name}: gerarchia non abbastanza certa per il tris`);
    assert.deepEqual(hierarchy.primaryIds, [player.id], `${player.name}: non è il primo portiere indicato`);
  }
}
const generatedPlayerIds = new Set(generated.players.map(player => player.id));
const expectedAdviceStarters = probablePlayers.filter(player => player.lineupStatus === "starter" && player.playerId && generatedPlayerIds.has(player.playerId)).length;
assert.equal(generated.players.filter(player => player.currentAvailability?.lineupStatus === "starter").length, expectedAdviceStarters, "titolari editoriali eleggibili non propagati ai consigli");
const activeSourceIds = new Set(source.players.map(player => String(player.sourceId)));
const expectedListoneAvailability = probablePlayers.filter(player => player.lineupStatus === "starter" && activeSourceIds.has(String(player.sourceId))).length;
assert.equal(generated.listone.players.filter(player => player.currentAvailability?.lineupStatus === "starter").length, expectedListoneAvailability);
const activeInjuryReports = injuries.teams
  .flatMap(team => team.reports)
  .filter(report => activeSourceIds.has(String(report.sourceId))).length;
assert.equal(generated.listone.players.filter(player => player.currentAvailability?.injuryReported).length, activeInjuryReports);

console.log(`Fantacalcio unificato: ${unifiedCount} righe, ${source.players.length} attivi nel listone, ${quotedAdvice.length} consigli quotati.`);
