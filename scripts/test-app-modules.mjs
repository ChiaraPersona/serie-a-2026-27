import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pageFiles = ["home", "matches", "teams", "readings", "referees", "fantasy", "betting", "cup"];

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
assert.match(bettingPage, /<details class="betting-archive-card">/, "Schedina: card archivio cliccabile della giornata assente");
assert.match(bettingPage, /<summary class="betting-archive-card-heading">/, "Schedina: comando di apertura della card archivio assente");
assert.match(bettingPage, /id="betting-round-01-title">1ª giornata/, "Schedina: intestazione archivio prima giornata assente");
const bettingCss = fs.readFileSync(path.join(root, "css", "betting.css"), "utf8");
assert.match(bettingCss, /\.betting-archive-card\{flex:0 1 calc\(\(100% - 48px\)\/4\);height:300px/, "Schedina: la card chiusa deve avere le dimensioni delle card Statistiche squadre");
console.log(`OK moduli applicazione: ${pageFiles.length} pagine e 4 componenti condivisi`);
