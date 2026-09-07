"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-pilot-predictions-2026-27.json"), "utf8"));
const pageSource = fs.readFileSync(path.join(root, "js/pages/champions.js"), "utf8");
assert.strictEqual(data.status, "experimental-md01-team-volumes");
assert.strictEqual(data.fixtures.length, 18);
assert.strictEqual(data.coverage.fixtures, 18);
assert.strictEqual(data.coverage.detailedVolumeFixtures, 17);
assert.strictEqual(data.coverage.teams, 36);
assert(data.coverage.historicalOpeningFixtures >= 50);
assert(data.coverage.completeSourceMatches >= 4000);
assert.strictEqual(Object.keys(data.coverage.leagueBaselineMatches).length, 15);
assert.strictEqual(data.coverage.oddsMatched, 18);
assert.strictEqual(data.coverage.resultOdds, 18);
assert.strictEqual(data.coverage.goalOdds, 18);
assert.strictEqual(data.coverage.requestedVolumeOdds, 0);
assert.strictEqual(data.coverage.referees, 0);
assert.strictEqual(data.coverage.probableLineups, 0);
assert.strictEqual(data.readingTemplate.id, "serie-a-reading-v1");
assert.strictEqual(data.readingTemplate.graphics, "champions");
assert.deepStrictEqual(data.readingTemplate.sections, ["summary", "decisionSupport", "headToHead", "referee", "teamContext", "projections", "discipline", "mvp", "myCombo"]);
for (const fixture of data.fixtures) {
  assert.strictEqual(fixture.teamProjections.length, 2, `${fixture.fixtureId}: proiezioni squadra`);
  assert(Math.abs(fixture.probabilities.home + fixture.probabilities.draw + fixture.probabilities.away - 100) < 0.01, `${fixture.fixtureId}: 1X2 non normalizzato`);
  assert.strictEqual(fixture.goals.length, 3, `${fixture.fixtureId}: soglie gol`);
  assert.strictEqual(fixture.goalBand.interval, "p20-p80", `${fixture.fixtureId}: fascia gol`);
  assert(fixture.goalBand.min <= fixture.expectedGoals.total && fixture.expectedGoals.total <= fixture.goalBand.max, `${fixture.fixtureId}: media gol fuori fascia`);
  assert.strictEqual(fixture.cards.refereeAdjustment, null, `${fixture.fixtureId}: correttivo arbitro inventato`);
  assert(fixture.market.result1x2.every(row => Number.isFinite(row.odds) && Number.isFinite(row.edgePct)), `${fixture.fixtureId}: confronto 1X2 Sisal`);
  assert(fixture.goals.every(row => row.market && Number.isFinite(row.market.overOdds)), `${fixture.fixtureId}: confronto gol Sisal`);
  assert.strictEqual(fixture.market.requestedVolumeMarketsAvailable, false, `${fixture.fixtureId}: quote volumi non pubblicate da Sisal`);
  assert.strictEqual(fixture.exactScores.length, 3, `${fixture.fixtureId}: risultati esatti`);
  assert.strictEqual(fixture.scoreForecast.display.length, 3, `${fixture.fixtureId}: configurazione risultati esatti`);
  assert(fixture.verdict.outcomes.includes(fixture.scoreForecast.primary.outcome), `${fixture.fixtureId}: risultato principale incoerente con la selezione`);
  assert.strictEqual(fixture.scoreForecast.coherentWithVerdict, true, `${fixture.fixtureId}: flag di coerenza del risultato`);
  assert(fixture.scoreForecast.modal && fixture.scoreForecast.display.some(row => row.score === fixture.scoreForecast.modal.score), `${fixture.fixtureId}: moda assoluta non esposta`);
  assert.deepStrictEqual(fixture.likelyBooked, [], `${fixture.fixtureId}: ammoniti mancanti non espliciti`);
  assert.strictEqual(fixture.mvpCandidate, null, `${fixture.fixtureId}: MVP non verificato deve restare N/D`);
  assert.deepStrictEqual(fixture.combinations, [], `${fixture.fixtureId}: MyCombo non validate devono restare vuote`);
  if (fixture.dataQuality.detailedVolumesAvailable) {
    assert.strictEqual(fixture.cards.lines.length, 3, `${fixture.fixtureId}: soglie cartellini`);
    assert(fixture.matchProjection && ["shotsTotal", "shotsOnTarget", "corners"].every(metric => fixture.matchProjection[metric].min <= fixture.matchProjection[metric].central && fixture.matchProjection[metric].central <= fixture.matchProjection[metric].max), `${fixture.fixtureId}: volumi totali partita`);
    for (const team of fixture.teamProjections) {
      for (const metric of [team.shotsTotal, team.shotsOnTarget, team.corners, team.cards]) {
        assert(Number.isFinite(metric.central) && metric.min <= metric.central && metric.central <= metric.max, `${fixture.fixtureId}/${team.team}: volume non valido`);
        assert.strictEqual(metric.normalization.method, "relative-to-domestic-league", `${fixture.fixtureId}/${team.team}: normalizzazione campionato assente`);
        assert(metric.normalization.currentSeasonReliabilityPct >= 0 && metric.normalization.currentSeasonReliabilityPct < 100, `${fixture.fixtureId}/${team.team}: affidabilità nuova stagione non valida`);
      }
      assert(team.shotsOnTarget.central <= team.shotsTotal.central, `${fixture.fixtureId}/${team.team}: tiri in porta oltre tiri totali`);
      assert.deepStrictEqual(Object.keys(team.lines), ["shotsTotal", "shotsOnTarget", "corners"]);
    }
  } else {
    assert.strictEqual(fixture.matchProjection, null, `${fixture.fixtureId}: volumi non coperti devono restare N/D`);
    assert.strictEqual(fixture.cards.lines.length, 0, `${fixture.fixtureId}: cartellini non coperti devono restare N/D`);
    assert(fixture.teamProjections.every(team => team.shotsTotal === null && team.shotsOnTarget === null && team.corners === null && team.cards === null), `${fixture.fixtureId}: volumi squadra inventati`);
  }
}
assert.strictEqual(data.profiles.filter(profile => profile.usableForDetailedVolumes).length, 35, "Copertura profili squadra inattesa");
assert.deepStrictEqual(data.profiles.filter(profile => !profile.usableForDetailedVolumes).map(profile => profile.team), ["Sabah"], "Le squadre senza volumi devono restare esplicite");
assert(data.profiles.filter(profile => profile.baselineKind === "uefa-fallback").every(profile => profile.league.startsWith("UEFA") || profile.league.startsWith("Qualificazioni UEFA")), "Fallback UEFA non dichiarato");
assert(data.fixtures.some(fixture => fixture.verdict.outcome === "1X"), "Manca una selezione prudenziale 1X");
assert(data.fixtures.some(fixture => fixture.verdict.outcome === "X2"), "Manca una selezione prudenziale X2");
assert(data.fixtures.filter(fixture => ["1X", "X2"].includes(fixture.verdict.outcome)).every(fixture => fixture.scoreForecast.primary.outcome === "X"), "Le doppie chance devono poter ripristinare il pareggio come risultato esatto principale");
assert(pageSource.includes('href="champions-league.html?match=${esc(fixture.fixtureId)}"'), "Le schede Champions devono essere link diretti alle letture");
assert(pageSource.includes('new URLSearchParams(location.search).get("match")'), "La pagina Champions deve gestire la lettura selezionata");
assert(pageSource.includes("pilotReadingDetail(requestedFixture,pilot,backtest,squads,branding,h2h,motivationByFixture.get(requestedMatchId),styleProfiles)"), "Dettaglio lettura Champions non collegato");
assert(pageSource.includes("Baseline tattica delle squadre"), "Baseline tattica non collegata alle Letture Champions");
assert(pageSource.includes("attackChannelsPanel(styleByTeam.get(team.teamId))"), "Direzioni d'attacco non collegate ai volumi squadra Champions");
assert(pageSource.includes("Fascia gol probabile"), "La lettura deve distinguere la fascia gol dal risultato esatto");
assert(pageSource.includes("fixture.verdict.outcome"), "La lettura deve usare la selezione ricalcolata, comprese 1X e X2");
assert(pageSource.includes("I gol attesi sono la media di tutti gli scenari"), "La lettura deve spiegare la differenza tra media gol e risultato esatto");
assert(pageSource.includes("Statistiche di squadra"), "Le schede delle 36 squadre devono esporre i volumi recuperati");
assert(pageSource.includes("fallback UEFA"), "Le schede squadra devono dichiarare i fallback UEFA");
assert(pageSource.includes("Stesso tracciato delle schede Serie A"), "Le schede squadra devono dichiarare il tracciato statistiche giocatori Serie A");
assert(pageSource.includes("Falli subiti"), "La tabella giocatori deve esporre i campi statistici Serie A");
assert(pageSource.includes("Le statistiche Champions 2026/27 restano separate"), "Le statistiche correnti e storiche non devono essere confuse");
const projectionSection = pageSource.match(/<section class="section reading-projection-prototype prediction-volume-section champions-reading-volume"[^>]*>[\s\S]*?<\/section>/)?.[0] || "";
assert(projectionSection.includes("${goalForecast}<section") && projectionSection.includes("${matchProjection}"), "Il pronostico quantitativo deve essere incluso prima dei volumi nella sezione proiezioni squadra");
assert(projectionSection.includes("Storico distinto tra casa e trasferta."), "Le proiezioni Champions devono riprendere il testo introduttivo della Serie A");
assert(projectionSection.includes("Tiri e corner combinano produzione per sede, valori concessi dall'avversaria e ultime otto gare"), "Le proiezioni Champions devono riprendere lo stile metodologico della Serie A");
console.log(`OK pronostici Champions MD1: ${data.fixtures.length} gare · risultato e gol completi · volumi mancanti espliciti`);
