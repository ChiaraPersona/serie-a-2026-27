import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pageFiles = ["home", "matches", "teams", "readings", "referees", "fantasy", "betting", "cup", "champions"];

for (const name of pageFiles) {
  const module = await import(pathToFileURL(path.join(root, "js", "pages", `${name}.js`)));
  const page = module.createPage({});
  assert.equal(typeof page?.render, "function", `${name}: factory senza render()`);
}

const componentModule = await import(pathToFileURL(path.join(root, "js", "components", "match-card.js")));
const components = componentModule.createMatchComponents({ dateOnly: value => value, esc: value => String(value), labels: {} });
for (const name of ["scheduleLabel", "teamLogo", "matchCard", "homeMatchListItem"]) {
  assert.equal(typeof components?.[name], "function", `match-card: ${name} non esportata`);
}
const finishedMatchCard = components.matchCard({ id: "test", matchday: 1, status: "finished", date: "2026-08-22", homeTeam: "home", awayTeam: "away", score: { home: 3, away: 0 } }, [
  { id: "home", name: "Casa", shortName: "Casa", logo: "home.svg", colors: ["#000", "#111"] },
  { id: "away", name: "Ospite", shortName: "Ospite", logo: "away.svg", colors: ["#222", "#333"] }
]);
assert.match(finishedMatchCard, /class="score score-result reading-final-score">3 - 0<\/strong>/, "Calendario: risultato finale non allineato alle Letture");

const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(shell, /<script type="module" src="js\/app\.js\?v=[^"]+"><\/script>/, "entry point ES module non generato");
const homeCss = fs.readFileSync(path.join(root, "css", "home.css"), "utf8");
assert.match(homeCss, /\.home-next-head\{display:grid;grid-template-columns:minmax\(140px,\.72fr\) minmax\(280px,1\.55fr\)/, "Home: intestazione giornata non allineata alla griglia delle partite");
assert.match(homeCss, /\.home-matchday-nav\{display:flex;grid-column:2;justify-self:center/, "Home: navigazione giornata non centrata sopra le squadre");
const homePage = fs.readFileSync(path.join(root, "js", "pages", "home.js"), "utf8");
assert.match(homePage, /<a href="lettura\.html"><span>Letture<\/span><strong>Analisi e tabellini<\/strong>/, "Home: card Letture assente dalla colonna laterale");
assert.doesNotMatch(homePage, /<a href="#classifiche"><span>Classifiche<\/span><strong>Situazione e archivio<\/strong>/, "Home: vecchia card Classifiche ancora presente");
const bettingPage = fs.readFileSync(path.join(root, "js", "pages", "betting.js"), "utf8");
  assert.match(bettingPage, /href="schedina\.html\?giornata=\$\{number\}"/, "Schedina: card-link parametrica delle giornate assente");
  assert.match(bettingPage, /archiveCard\(md1,1,matchById\)/, "Schedina: card della prima giornata assente dall'archivio");
  assert.match(bettingPage, /load\("schedina-md02\.json"\)/, "Schedina: dati della seconda giornata non caricati");
  assert.match(bettingPage, /load\("schedina-md03\.json"\)/, "Schedina: dati della terza giornata non caricati");
  assert.match(bettingPage, /const rounds=\{1:md1,2:md2,3:md3\}/, "Schedina: viste dedicate alle prime tre giornate assenti");
  assert.match(bettingPage, /archiveCard\(md2,2,matchById\)/, "Schedina: card della seconda giornata assente dall'archivio");
  assert.match(bettingPage, /archiveCard\(md3,3,matchById\)/, "Schedina: card della terza giornata assente dall'archivio");
assert.doesNotMatch(bettingPage, /<details class="betting-archive-card">|<summary class="betting-archive-card-heading">/, "Schedina: la card archivio non deve essere un menu a tendina");
  assert.match(bettingPage, /if\(rounds\[matchday\]\)/, "Schedina: vista dedicata alla lista della giornata assente");
assert.match(bettingPage, /team-flip-inner/, "Schedina: effetto hover delle card Statistiche squadra non riutilizzato");
  assert.match(bettingPage, /<span class="betting-archive-number">\$\{number\}<\/span>/, "Schedina: il fronte deve mostrare soltanto il numero della giornata");
assert.doesNotMatch(bettingPage, /<span class="betting-archive-number">1ª<\/span><small>Giornata<\/small>/, "Schedina: dicitura Giornata ancora presente sul fronte");
  assert.match(bettingPage, /<small>Successo<\/small><strong>\$\{pct\(stats\.archiveSuccessPct\)\}%<\/strong>/, "Schedina: percentuale complessiva di successo assente dal retro");
  assert.match(bettingPage, /<small>Guadagno<\/small><strong>\$\{stats\.archiveProfitPct>0\?"\+":""\}\$\{pct\(stats\.archiveProfitPct\)\}%<\/strong>/, "Schedina: percentuale di guadagno assente dal retro");
assert.match(bettingPage, /archiveGrossReturn-archiveStake/, "Schedina: il guadagno non e calcolato sul rendimento netto di tutte le giocate");
assert.match(bettingPage, /class="betting-slip-metrics"/, "Schedina: riepilogo numerico compatto assente");
assert.doesNotMatch(bettingPage, /class="betting-slip-copy"|class="betting-family-list"|class="betting-quote"/, "Schedina: blocchi verticali ridondanti ancora presenti");
const bettingCss = fs.readFileSync(path.join(root, "css", "betting.css"), "utf8");
assert.match(bettingCss, /\.betting-archive-list\{width:100%;max-width:1180px/, "Schedina: griglia archivio non allineata alle card Statistiche squadra");
assert.match(bettingCss, /\.betting-archive-performance small,\.betting-archive-performance strong\{display:block;color:#000\}/, "Schedina: valori del retro senza contrasto nero leggibile");
assert.doesNotMatch(bettingCss, /betting-archive-performance[^}]*var\(--betting-gold\)/, "Schedina: il giallo poco leggibile e ancora usato negli indicatori del retro");
assert.match(bettingCss, /\.betting-slip-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, "Schedina: card desktop non organizzate su due colonne");
const readingsPage = fs.readFileSync(path.join(root, "js", "pages", "readings.js"), "utf8");
assert.match(readingsPage, /Livello decisionale/, "Letture: scenari quantitativi non esposti");
assert.match(readingsPage, /prediction-combo-risk/, "Letture: controllo rischio MyCombo non esposto");
const championsPage = fs.readFileSync(path.join(root, "js", "pages", "champions.js"), "utf8");
assert.match(championsPage, /seguiremo tutte le partite/, "Champions: copertura completa delle partite non dichiarata");
assert.doesNotMatch(championsPage, /Squadre italiane/, "Champions: copertura ancora presentata come limitata alle italiane");
console.log(`OK moduli applicazione: ${pageFiles.length} pagine e 4 componenti condivisi`);
