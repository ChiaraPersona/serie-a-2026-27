const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const teams = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/teams.json"), "utf8"));
const esc = value => String(value ?? "").replace(/[&<>\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
const pages = [
  ["index.html","home","Home"],["calendario.html","calendar","Calendario"],["squadra.html","team","Squadra"],["statistiche-squadre.html","team-stats","Statistiche squadre"],["lettura.html","readings","Lettura"],["coppa-italia.html","cup","Coppa Italia"],["arbitri.html","referees","Arbitri"],["fantacalcio.html","fantasy","Fantacalcio"],["schedina.html","betting","Schedina"],["fonti.html","sources","Fonti"]
];
const navigationPages = pages.filter(([,id]) => !["team", "sources"].includes(id));
const navigation = (depth = "", activeId = "") => navigationPages.map(([file, id, label]) => `<a class="page-link${id === activeId ? " active" : ""}" data-page-link="${id}" href="${depth}${file}">${label}</a>`).join("");
const footer = (depth = "") => `<footer class="site-footer"><div class="site-footer-inner"><div class="site-footer-top"><div class="site-footer-intro"><a class="footer-brand" href="${depth}index.html"><span class="footer-brand-mark"><img src="${depth}assets/images/serie-a-logo-mark.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><p>Calendario, rose, statistiche e letture della stagione raccolti in un unico spazio.</p><span class="footer-season">Stagione 2026/27</span></div><nav class="footer-nav" aria-label="Navigazione nel footer"><div><strong>Campionato</strong><a href="${depth}index.html">Home</a><a href="${depth}calendario.html">Calendario</a><a href="${depth}statistiche-squadre.html">Statistiche squadre</a><a href="${depth}arbitri.html">Arbitri</a></div><div><strong>Approfondimenti</strong><a href="${depth}lettura.html">Lettura</a><a href="${depth}coppa-italia.html">Coppa Italia</a><a href="${depth}fantacalcio.html">Fantacalcio</a><a href="${depth}schedina.html">Schedina</a><a href="${depth}fonti.html">Fonti</a></div></nav></div><div class="site-footer-bottom"><p>Progetto statico indipendente <span aria-hidden="true">·</span> Fonti consultabili nella pagina dedicata</p><a href="#site-top">Torna su <span aria-hidden="true">↑</span></a></div></div></footer>`;
const fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">';
const withFonts = html => html.replace("</title>", `</title>${fontLinks}`);
const version = "20260824-central-sources-page-v1";
const homeVersion = "20260824-home-standings-links-v1";
const calendarVersion = "20260824-calendar-final-score-v1";
const teamVersion = "20260824-team-table-columns-v1";
const leaderboardVersion = "20260824-player-leaderboards-by-season-v18-player-minutes-modern-buttons-v3";
const bettingVersion = "20260824-schedina-archive-v4-modern-buttons-v3";
const readingVersion = "20260824-reading-matchup-logos-referee-profile-score-dedup-v6-rodrigo-mora";
const headToHeadPath = path.join(root, "data/generated/head-to-head/first-leg-2026-27.json");
if (fs.existsSync(headToHeadPath)) {
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
for (const obsoletePage of ["classifica.html", "statistiche-squadra/index.html"]) {
  const obsoletePath = path.join(root, obsoletePage);
  if (fs.existsSync(obsoletePath)) fs.unlinkSync(obsoletePath);
}
const sourcesPageContent = () => {
  const teamCards = teams.map(summary => {
    const team = JSON.parse(fs.readFileSync(path.join(root, `data/teams/${summary.id}.json`), "utf8"));
    const sources = team.sources.map(source => `<li><strong>${esc(source.provider)}</strong><span>${esc(source.scope)}</span><small>Aggiornamento ${esc(source.retrievedAt)}</small>${source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">Apri la fonte</a>` : ""}</li>`).join("");
    return `<details class="source-team-card" data-source-team="${esc(team.id)}"><summary><img src="${esc(summary.logo)}" alt=""><span><strong>${esc(team.name)}</strong><small>${team.sources.length} fonti registrate</small></span></summary><ul class="source-directory-list">${sources}</ul></details>`;
  }).join("");
  return `<main id="app" tabindex="-1"><section class="hero sources-hero"><p class="eyebrow">Trasparenza dei dati</p><h1>Fonti</h1><p>Provider, ambiti e date di aggiornamento utilizzati per le rose e le statistiche delle 20 squadre.</p></section><section class="section sources-directory" aria-labelledby="sources-directory-title"><div class="section-heading"><div><p class="eyebrow">Squadra per squadra</p><h2 id="sources-directory-title">Fonti registrate</h2></div><p>Apri una squadra per consultare i riferimenti associati ai suoi dati.</p></div><div class="source-team-grid">${teamCards}</div></section></main>`;
};
for (const [file,id,label] of pages) {
  const pageVersion = id === "home" ? homeVersion : id === "betting" ? bettingVersion : id === "readings" ? readingVersion : id === "team-stats" ? leaderboardVersion : id === "calendar" || id === "team" ? calendarVersion : version;
  const main = id === "sources" ? sourcesPageContent() : `<main id="app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${label}</h1></section></main>`;
  const scripts = id === "sources" ? `<script>document.querySelector('.menu-button')?.addEventListener('click',e=>{const n=document.getElementById('site-nav'),open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));n.classList.toggle('open',!open)});</script>` : `${id === "home" ? `<script src="scripts/standings.js?v=${pageVersion}"></script>` : ""}${id === "fantasy" ? `<script src="scripts/fantasy-squad.js?v=${pageVersion}"></script>` : ""}<script type="module" src="js/app.js?v=${pageVersion}"></script>`;
  const html = `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Serie A e Coppa Italia 2026/27: ${label}"><title>${label} | Serie A 2026/27</title><link rel="stylesheet" href="css/styles.css?v=${pageVersion}"></head><body data-page="${id}"><header id="site-top" class="site-header"><a class="brand" href="index.html"><span class="brand-mark"><img src="assets/images/serie-a-logo-mark.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation("", id)}</nav></header>${main}${footer()}${scripts}</body></html>`;
  fs.writeFileSync(path.join(root,file), withFonts(html));
}
const squadDir = path.join(root, "statistiche-squadra");
fs.mkdirSync(squadDir, { recursive: true });
const squadPage = (team = null, version = teamVersion) => {
  const title = team ? `${team.name} | Rosa e statistiche` : "Rose e statistiche squadra";
  const depth = team ? "../" : "../";
  return `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${title} Â· Serie A 2026/27"><title>${title} | Serie A 2026/27</title><link rel="stylesheet" href="${depth}css/styles.css?v=${version}"></head><body data-page="team-stats" data-depth="team"${team ? ` data-team="${team.id}"` : ""}><header id="site-top" class="site-header"><a class="brand" href="${depth}index.html"><span class="brand-mark"><img src="${depth}assets/images/serie-a-logo-mark.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation(depth, "team-stats")}</nav></header><main id="team-squad-app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${title}</h1></section></main>${footer(depth)}<script src="${depth}scripts/standings.js?v=${version}"></script><script src="${depth}scripts/objective-metrics.js?v=${version}"></script><script src="${depth}js/team-squads.js?v=${version}"></script><script>document.querySelector('.menu-button')?.addEventListener('click',e=>{const n=document.getElementById('site-nav'),open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));n.classList.toggle('open',!open)});</script></body></html>`;
};
for (const team of teams) fs.writeFileSync(path.join(squadDir, `${team.id}.html`), withFonts(squadPage(team)));
console.log(`Generate ${pages.length} pagine.`);
