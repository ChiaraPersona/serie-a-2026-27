const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const source = read("data/sources/fantacalcio-quotations-2026-27.json");
const statsSource = read("data/sources/fantacalcio-stats-2025-26.json");
const externalStatsSource = read("data/sources/fantasy-external-stats-2025-26.json");
const probable = read("data/sources/fantacalcio-probable-lineups-md1-2026-27.json");
const injuries = read("data/sources/fantacalcio-injuries-2026-27.json");
const goalkeeperHierarchy = read("data/sources/fantasy-goalkeeper-hierarchy-2026-27.json");
const generated = read("data/generated/fantacalcio-advice.json");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

assert.equal(source.season, "2026/27");
assert.equal(source.players.length, 496);
assert.equal(source.departed.length, 6);
assert.equal(new Set(source.players.map(player => player.sourceId)).size, 496);
assert.deepEqual(source.coverage.byRole, { P: 60, D: 175, C: 174, A: 87 });
assert.equal(new Set(source.players.map(player => player.teamId)).size, 20);
for (const player of source.players) {
  assert.ok(["P", "D", "C", "A"].includes(player.role), `${player.name}: ruolo Classic non valido`);
  assert.ok(player.mantraRole, `${player.name}: ruolo Mantra mancante`);
  for (const field of ["currentQuotation", "initialQuotation", "currentMantraQuotation", "initialMantraQuotation", "fvm", "mantraFvm"]) {
    assert.ok(Number.isFinite(player[field]), `${player.name}: ${field} non numerico`);
  }
}

assert.equal(generated.listone.players.length, source.players.length);
assert.equal(generated.listone.coverage.matchedCurrentPlayers, source.coverage.matchedCurrentPlayers);
assert.ok(generated.methodology.description.includes("correttivo del 15%"));
assert.equal(probable.coverage.teams, 20);
assert.equal(probable.coverage.starters, 220);
assert.equal(probable.coverage.unmatched, 0);
assert.equal(injuries.coverage.teams, 20);
assert.ok(injuries.coverage.reports > 0);
assert.equal(injuries.coverage.unmatched, 0);
assert.equal(generated.sources.probableLineups.matchday, 1);
assert.equal(generated.sources.injuries.coverage.reports, injuries.coverage.reports);
const quotedAdvice = generated.players.filter(player => player.quotations);
assert.ok(quotedAdvice.length > 350, `Copertura quotazioni insufficiente: ${quotedAdvice.length}`);
for (const player of quotedAdvice) {
  assert.ok(Number.isFinite(player.quotations.classic));
  assert.ok(Number.isFinite(player.quotations.fvm));
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
assert.ok(recoverableGoalAssists.length > 0, "nessun G/A recuperabile per i profili solo listone");
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
assert.ok(externallyCoveredListone.length >= 40, "copertura ESPN esterna insufficiente per i profili solo listone");
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
assert.ok(generated.players.filter(player => Number.isFinite(player.currentAvailability?.starterProbability)).length >= 350, "copertura titolarità insufficiente nei consigli");
assert.equal(generated.listone.players.filter(player => Number.isFinite(player.currentAvailability?.starterProbability)).length, probable.coverage.players);
assert.equal(generated.listone.players.filter(player => player.currentAvailability?.injuryReported).length, injuries.coverage.reports);

console.log(`Fantacalcio unificato: ${unifiedCount} righe, ${source.players.length} attivi nel listone, ${quotedAdvice.length} consigli quotati.`);
