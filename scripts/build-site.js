const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const pages = [
  ["index.html","home","Home"],["calendario.html","calendar","Calendario"],["squadra.html","team","Squadra"],["classifica.html","standings","Classifica"],["statistiche-squadre.html","team-stats","Statistiche squadre"],["statistiche-giocatori.html","player-stats","Statistiche giocatori"],["lettura.html","readings","Lettura"],["coppa-italia.html","cup","Coppa Italia"],["arbitri.html","referees","Arbitri"]
];
const nav = pages.filter(([,id])=>id!=="team").map(([file,id,label]) => `<a class="page-link" data-page-link="${id}" href="${file}">${label}</a>`).join("");
for (const [file,id,label] of pages) {
  const version = "20260718-even-standing-columns";
  const html = `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Serie A e Coppa Italia 2026/27: ${label}"><title>${label} | Serie A 2026/27</title><link rel="stylesheet" href="css/styles.css?v=${version}"></head><body data-page="${id}"><header class="site-header"><a class="brand" href="index.html"><span class="brand-mark"><img src="assets/images/serie-a-logo.png" alt=""></span><span><strong>Serie A 2026/27</strong><small>Campionato e Coppa Italia</small></span></a><button class="menu-button" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Navigazione principale">${nav}</nav></header><main id="app" tabindex="-1"><section class="loading"><p class="eyebrow">Caricamento</p><h1>${label}</h1></section></main><footer><p>Progetto statico · Dati ufficiali Lega Serie A</p></footer><script src="scripts/standings.js?v=${version}"></script><script src="js/app.js?v=${version}"></script></body></html>`;
  fs.writeFileSync(path.join(root,file), html);
}
console.log(`Generate ${pages.length} pagine.`);
