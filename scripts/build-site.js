const fs = require("fs");
const path = require("path");
const {applyStyleLinks} = require('./site-styles');
const {iconLinks} = require('./site-icons');
const presentationOnly = process.argv.includes('--presentation-only');
const root = path.resolve(__dirname, "..");
if (fs.existsSync(path.join(root,'data/analysis/card-prediction-research/tactical-prototype-md08.json'))) require('./build-tactical-duels-page.cjs');
const writeHtml = (file, html) => {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
};
// Presentation-only refresh: never recalculate forecasts or canonical archives.
const readingsIndexOnly = process.argv.includes('--readings-index-only');
const bettingPageOnly = process.argv.includes('--betting-page-only');
const championsPageOnly = process.argv.includes('--champions-page-only');
const md3PagesOnly = process.argv.includes('--md3-pages-only');
const readingPagesOnly = bettingPageOnly || md3PagesOnly || championsPageOnly || readingsIndexOnly || process.argv.includes('--reading-pages-only');
const teamPagesOnly = readingPagesOnly || process.argv.includes('--team-pages-only');
if (!teamPagesOnly && !presentationOnly) require('./apply-official-starter-policy.js').build();
if (!teamPagesOnly && !presentationOnly && fs.existsSync(path.join(root,'data/sources/reading-referee-match-history.json'))) require('./build-reading-referee-history.js').build();
// Readings consume a separate bench artifact; production starter forecasts stay untouched.
if (!readingsIndexOnly && !presentationOnly && !process.argv.includes('--team-pages-only')) {
  require('node:child_process').execFileSync(process.execPath, [path.join(root, 'scripts/build-reading-bench-forecasts.mjs'), '--if-needed'], {cwd:root,stdio:'inherit'});
}
// Remove retired public shells in every build mode; preserve internal data.
for (const retired of ['fantacalcio.html', 'fonti.html', 'arbitri.html', 'squadra.html', 'css/pages/team.css']) {
  const target = path.join(root, retired);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
const teams = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/teams.json"), "utf8"));
const esc = value => String(value ?? "").replace(/[&<>\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
const pages = [
  ["index.html","home","Home"],["statistiche-squadre.html","team-stats","Statistiche squadre"],["statistiche-giocatori.html","player-stats","Statistiche giocatori"],["lettura.html","readings","Lettura"],["coppa-italia.html","cup","Coppa Italia"],["champions-league.html","champions","Champions League"],["schedina.html","betting","Schedina"]
];
const navigationPages = pages;
const navigation = (depth = "", activeId = "") => navigationPages.map(([file, id, label]) => `<a class="page-link${id === activeId ? " active" : ""}" data-page-link="${id}" href="${depth}${file}">${id === "team-stats" ? "Squadre" : id === "player-stats" ? "Giocatori" : label}</a>`).join("");
const footer = (depth = "") => `<footer class="site-footer"><div class="site-footer-inner"><div class="site-footer-top"><div class="site-footer-intro"><a class="footer-brand" href="${depth}index.html"><span class="footer-brand-mark"><img src="${depth}assets/images/optimized/serie-a-logo-mark.webp" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><p>Calendario, rose, statistiche e letture della stagione raccolti in un unico spazio.</p><span class="footer-season">Stagione 2026/27</span></div><nav class="footer-nav" aria-label="Navigazione nel footer"><div><strong>Campionato</strong><a href="${depth}index.html">Home</a><a href="${depth}statistiche-squadre.html">Squadre</a><a href="${depth}statistiche-giocatori.html">Giocatori</a></div><div><strong>Approfondimenti</strong><a href="${depth}lettura.html">Lettura</a><a href="${depth}coppa-italia.html">Coppa Italia</a><a href="${depth}champions-league.html">Champions League</a><a href="${depth}schedina.html">Schedina</a></div></nav></div><div class="site-footer-bottom"><p>Progetto statico indipendente</p><a href="#site-top">Torna su <span aria-hidden="true">↑</span></a></div></div></footer>`;
const fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">';
const withFonts = input => {const html=applyStyleLinks(input);const prefix=(/<body[^>]*data-depth="team"/.test(html)?"../":"");const policyVersion=html.includes('data-page="betting"')?'20261016-schedina-selection-rows-v2':'20261016-public-policy';return html.replace("</title>", `</title>${iconLinks(prefix)}${fontLinks}`).replace("</head>", `<script src="${prefix}js/public-presentation.js?v=${policyVersion}"></script></head>`)};
const version = "20260901-coppa-round16-calendar-v1";
const homeVersion = "20260919-roma-inter-juventus-fatigue-v1";
const teamVersion = "20261018-no-player-media-v1";
const leaderboardVersion = "20261013-md06-results-v1";
const bettingVersion = "20261022-schedina-md3-projection-v1";
const readingVersion = "20261022-reading-projection-v1";
const cupVersion = "20261025-coppa-round16-disclosure-v1";
const championsVersion = "20261022-champions-md02-ui-v1";
const headToHeadPath = path.join(root, "data/generated/head-to-head/first-leg-2026-27.json");
if (!teamPagesOnly && !presentationOnly && fs.existsSync(headToHeadPath)) {
  const headToHead = JSON.parse(fs.readFileSync(headToHeadPath, "utf8"));
  const summary = {
    schemaVersion: headToHead.schemaVersion,
    season: headToHead.season,
    scope: headToHead.scope,
    retrievedAt: headToHead.retrievedAt,
    fixtures: (headToHead.fixtures || []).map(fixture => ({ fixtureId: fixture.fixtureId, coverage: fixture.coverage }))
  };
  fs.writeFileSync(path.join(root, "data/generated/head-to-head/first-leg-2026-27-summary.json"), JSON.stringify(summary, null, 2));
}
for (const obsoletePage of ((teamPagesOnly || presentationOnly) ? [] : ["calendario.html", "classifica.html", "statistiche-squadra/index.html"])) {
  const obsoletePath = path.join(root, obsoletePage);
  if (fs.existsSync(obsoletePath)) fs.unlinkSync(obsoletePath);
}
const renderedPages = readingPagesOnly ? pages.filter(([,id])=>bettingPageOnly?id==='betting':md3PagesOnly?['champions','betting'].includes(id):championsPageOnly?id==='champions':readingsIndexOnly?id==="readings":["readings","champions"].includes(id)) : teamPagesOnly ? [] : pages;
// Refresh the browser projection from the existing archive, including during a
// presentation-only build. Never invoke the MD2 forecasting/integration builder.
if (renderedPages.some(([,id]) => id === 'readings')) {
  const dayIndex = process.argv.indexOf('--matchday');
  const matchday = dayIndex < 0 ? null : Number(process.argv[dayIndex + 1]);
  if (matchday !== null && (!Number.isInteger(matchday) || matchday < 1 || matchday > 38)) throw Error('Giornata non valida');
  require('./build-reading-browser-data.cjs').build({matchday});
}
if (renderedPages.some(([,id]) => id === 'champions')) require('./build-champions-md02-browser-data.cjs').build();
if (renderedPages.some(([,id]) => id === 'betting')) require('node:child_process').execFileSync(process.execPath,[path.join(root,'scripts/build-schedina-browser-data.mjs'),...(process.argv.includes('--matchday')?['--matchday',process.argv[process.argv.indexOf('--matchday')+1]]:[])],{cwd:root,stdio:'inherit'});
if (!process.argv.includes('--matchday') && renderedPages.some(([,id]) => id === 'betting')) require('node:child_process').execFileSync(process.execPath,[path.join(root,'scripts/build-champions-md3-browser-data.mjs')],{cwd:root,stdio:'inherit'});
for (const [file,id,label] of renderedPages) {
  const pageVersion = id === "home" ? homeVersion : id === "betting" ? bettingVersion : id === "readings" ? readingVersion : id === "cup" ? cupVersion : id === "champions" ? championsVersion : id === "player-stats" ? "20261024-player-keepers-data-v12" : id === "team-stats" ? "20261018-player-stats-v4" : version;
  const main = `<main id="app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${label}</h1></section></main>`;
  const scripts = `${id === "home" ? `<script src="scripts/standings.js?v=${pageVersion}"></script>` : ""}<script type="module" src="js/app.js?v=${pageVersion}"></script>`;
  const html = `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Serie A e Coppa Italia 2026/27: ${label}"><title>${label} | Serie A 2026/27</title><link rel="stylesheet" href="css/styles.css?v=${pageVersion}"></head><body data-page="${id}"><header id="site-top" class="site-header"><a class="brand" href="index.html"><span class="brand-mark"><img src="assets/images/optimized/serie-a-logo-mark.webp" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation("", id)}</nav></header>${main}${footer()}${scripts}</body></html>`;
  writeHtml(path.join(root,file), withFonts(html));
}
if (bettingPageOnly || md3PagesOnly || championsPageOnly || readingsIndexOnly) { console.log("Generati i soli shell richiesti e relativi payload UI; archivi, previsioni e altre pagine invariati."); process.exit(0); }
// Retired public overview; analytical motivation builders and datasets remain active.
if (!teamPagesOnly) {
  const retiredPage = path.join(root, "champions-2026-27/motivazione.html");
  if (fs.existsSync(retiredPage)) fs.unlinkSync(retiredPage);
}
const squadDir = path.join(root, "statistiche-squadra");
fs.mkdirSync(squadDir, { recursive: true });
const squadPage = (team = null, version = teamVersion) => {
  const title = team ? `${team.name} | Rosa e statistiche` : "Rose e statistiche squadra";
  const depth = team ? "../" : "../";
  return `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${title} Â· Serie A 2026/27"><title>${title} | Serie A 2026/27</title><link rel="stylesheet" href="${depth}css/styles.css?v=${version}"></head><body data-page="team-stats" data-depth="team"${team ? ` data-team="${team.id}"` : ""}><header id="site-top" class="site-header"><a class="brand" href="${depth}index.html"><span class="brand-mark"><img src="${depth}assets/images/optimized/serie-a-logo-mark.webp" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation(depth, "team-stats")}</nav></header><main id="team-squad-app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${title}</h1></section></main>${footer(depth)}<script src="${depth}scripts/standings.js?v=${version}"></script><script src="${depth}scripts/objective-metrics.js?v=${version}"></script><script src="${depth}js/team-squads.js?v=${version}"></script><script>document.querySelector('.menu-button')?.addEventListener('click',e=>{const n=document.getElementById('site-nav'),open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));n.classList.toggle('open',!open)});</script></body></html>`;
};
for (const team of (readingPagesOnly ? [] : teams)) writeHtml(path.join(squadDir, `${team.id}.html`), withFonts(squadPage(team)));
console.log(readingPagesOnly ? "Generate 2 pagine Lettura, senza rigenerare dati o altre pagine." : teamPagesOnly ? `Generate ${teams.length} pagine squadra, senza rigenerare dati o altre pagine.` : `Generate ${pages.length + 1} pagine.`);


