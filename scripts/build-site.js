const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const teams = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/teams.json"), "utf8"));
const pages = [
  ["index.html","home","Home"],["calendario.html","calendar","Calendario"],["squadra.html","team","Squadra"],["classifica.html","standings","Classifica"],["statistiche-squadre.html","team-stats","Statistiche squadre"],["statistiche-giocatori.html","player-stats","Statistiche giocatori"],["lettura.html","readings","Lettura"],["coppa-italia.html","cup","Coppa Italia"],["arbitri.html","referees","Arbitri"]
];
const nav = pages.filter(([,id])=>id!=="team").map(([file,id,label]) => `<a class="page-link" data-page-link="${id}" href="${file}">${label}</a>`).join("");
for (const [file,id,label] of pages) {
  const version = "20260722-goal-width";
  const quickTeamLinks = id === "team-stats" ? `<aside class="quick-team-links"><span>Pagine squadra complete</span><nav aria-label="Accesso rapido alle pagine complete"><a href="statistiche-squadra/milan.html">Milan</a><a href="statistiche-squadra/inter.html">Inter</a><a href="statistiche-squadra/juventus.html">Juventus</a><a href="statistiche-squadra/napoli.html">Napoli</a></nav></aside>` : "";
  const html = `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Serie A e Coppa Italia 2026/27: ${label}"><title>${label} | Serie A 2026/27</title><link rel="stylesheet" href="css/styles.css?v=${version}"></head><body data-page="${id}"><header class="site-header"><a class="brand" href="index.html"><span class="brand-mark"><img src="assets/images/serie-a-logo.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${nav}</nav></header>${quickTeamLinks}<main id="app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${label}</h1></section></main><footer><p>Progetto statico · Fonti registrate in ogni dataset</p></footer><script src="scripts/standings.js?v=${version}"></script><script src="js/app.js?v=${version}"></script></body></html>`;
  fs.writeFileSync(path.join(root,file), html);
}
const squadDir = path.join(root, "statistiche-squadra");
fs.mkdirSync(squadDir, { recursive: true });
const squadPage = (team = null) => {
  const title = team ? `${team.name} | Rosa e statistiche` : "Rose e statistiche squadra";
  const depth = team ? "../" : "../";
  return `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${title} · Serie A 2026/27"><title>${title} | Serie A 2026/27</title><link rel="stylesheet" href="${depth}css/styles.css?v=20260722-goal-width"></head><body data-page="team-stats" data-depth="team"${team ? ` data-team="${team.id}"` : ""}><header class="site-header"><a class="brand" href="${depth}index.html"><span class="brand-mark"><img src="${depth}assets/images/serie-a-logo.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale"><a class="page-link" href="${depth}index.html">Home</a><a class="page-link" href="${depth}calendario.html">Calendario</a><a class="page-link active" href="index.html">Statistiche squadra</a><a class="page-link" href="${depth}statistiche-giocatori.html">Statistiche giocatori</a><a class="page-link" href="${depth}arbitri.html">Arbitri</a></nav></header><main id="team-squad-app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${title}</h1></section></main><footer><p>Dati separati per stagione, squadra e competizione · valori assenti: N/D</p></footer><script src="${depth}js/team-squads.js?v=20260722-goal-width"></script><script>document.querySelector('.menu-button')?.addEventListener('click',e=>{const n=document.getElementById('site-nav'),open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));n.classList.toggle('open',!open)});</script></body></html>`;
};
fs.writeFileSync(path.join(squadDir, "index.html"), squadPage());
for (const team of teams) fs.writeFileSync(path.join(squadDir, `${team.id}.html`), squadPage(team));
console.log(`Generate ${pages.length} pagine.`);
