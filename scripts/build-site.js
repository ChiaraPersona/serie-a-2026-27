const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const teams = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/teams.json"), "utf8"));
const pages = [
  ["index.html","home","Home"],["calendario.html","calendar","Calendario"],["squadra.html","team","Squadra"],["classifica.html","standings","Classifica"],["statistiche-squadre.html","team-stats","Statistiche squadre"],["lettura.html","readings","Lettura"],["coppa-italia.html","cup","Coppa Italia"],["arbitri.html","referees","Arbitri"],["fantacalcio.html","fantasy","Fantacalcio"]
];
const navigationPages = pages.filter(([,id]) => id !== "team");
const navigation = (depth = "", activeId = "") => navigationPages.map(([file, id, label]) => `<a class="page-link${id === activeId ? " active" : ""}" data-page-link="${id}" href="${depth}${file}">${label}</a>`).join("");
const fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">';
const withFonts = html => html.replace("</title>", `</title>${fontLinks}`);
const version = "20260728-monochrome-team-cards";
for (const [file,id,label] of pages) {
  const html = `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Serie A e Coppa Italia 2026/27: ${label}"><title>${label} | Serie A 2026/27</title><link rel="stylesheet" href="css/styles.css?v=${version}"></head><body data-page="${id}"><header class="site-header"><a class="brand" href="index.html"><span class="brand-mark"><img src="assets/images/serie-a-logo-mark.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation("", id)}</nav></header><main id="app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${label}</h1></section></main><footer><p>Progetto statico Â· Fonti registrate in ogni dataset</p></footer><script src="scripts/standings.js?v=${version}"></script><script src="scripts/objective-metrics.js?v=${version}"></script><script src="js/app.js?v=${version}"></script></body></html>`;
  fs.writeFileSync(path.join(root,file), withFonts(html));
}
const squadDir = path.join(root, "statistiche-squadra");
fs.mkdirSync(squadDir, { recursive: true });
const squadPage = (team = null) => {
  const title = team ? `${team.name} | Rosa e statistiche` : "Rose e statistiche squadra";
  const depth = team ? "../" : "../";
  return `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${title} Â· Serie A 2026/27"><title>${title} | Serie A 2026/27</title><link rel="stylesheet" href="${depth}css/styles.css?v=${version}"></head><body data-page="team-stats" data-depth="team"${team ? ` data-team="${team.id}"` : ""}><header class="site-header"><a class="brand" href="${depth}index.html"><span class="brand-mark"><img src="${depth}assets/images/serie-a-logo-mark.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${navigation(depth, "team-stats")}</nav></header><main id="team-squad-app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${title}</h1></section></main><footer><p>Dati separati per stagione, squadra e competizione Â· valori assenti: N/D</p></footer><script src="${depth}scripts/standings.js?v=${version}"></script><script src="${depth}scripts/objective-metrics.js?v=${version}"></script><script src="${depth}js/team-squads.js?v=${version}"></script><script>document.querySelector('.menu-button')?.addEventListener('click',e=>{const n=document.getElementById('site-nav'),open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));n.classList.toggle('open',!open)});</script></body></html>`;
};
fs.writeFileSync(path.join(squadDir, "index.html"), withFonts(squadPage()));
for (const team of teams) fs.writeFileSync(path.join(squadDir, `${team.id}.html`), withFonts(squadPage(team)));
console.log(`Generate ${pages.length} pagine.`);
