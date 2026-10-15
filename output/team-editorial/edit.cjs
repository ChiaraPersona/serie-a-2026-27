const fs=require('fs');const p='js/team-squads.js';let s=fs.readFileSync(p,'utf8');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing '+a.slice(0,90));s=s.replace(a,b)};
replace('const teamSeasonList = (object, keys) => `<dl class="team-season-list">${keys.map(key => `<div><dt>${labels[key] || key}</dt><dd>${key.endsWith("Percentage") || percentageKeys.has(key) ? pct(object?.[key]) : value(object?.[key])}</dd></div>`).join("")}</dl>`;', 'const teamSeasonList = (object, keys) => `<div class="team-stat-table-wrap"><table class="team-season-list"><caption class="sr-only">Statistiche del gruppo</caption><tbody>${keys.map(key => `<tr><th scope="row">${labels[key] || key}</th><td>${key.endsWith("Percentage") || percentageKeys.has(key) ? pct(object?.[key]) : value(object?.[key])}</td></tr>`).join("")}</tbody></table></div>`;');
// Keep the full tactical component and all its original values inside a disclosure.
replace('const tacticalProfileSection = (team, dataset) => {','const tacticalProfileDetails = (team, dataset) => {');
const insert=s.indexOf('  const probableLineupSection =');
s=s.slice(0,insert)+`  const editorialDisclosure = (id, label, content, className = "") => \`<details id="\${id}" class="team-editorial-disclosure \${className}"><summary aria-controls="\${id}-content" aria-expanded="false"><span>\${label}</span><span class="team-disclosure-arrow" aria-hidden="true">↗</span></summary><div id="\${id}-content" class="team-disclosure-content">\${content}</div></details>\`;

  const tacticalProfileSection = (team, dataset) => {
    const profile = dataset?.profiles?.find(item => item.teamId === team.id);
    if (!profile) return '<section class="team-style-section"><h2>Stile di gioco</h2><p>Dati tattici non disponibili.</p></section>';
    const candidates = [
      ["Possesso medio", profile.summary.possessionPct, "%"],
      ["Precisione dei passaggi", profile.summary.passSuccessPct, "%"],
      ["Tiri a partita", profile.summary.shotsPerGame, ""],
      ["Duelli aerei vinti / gara", profile.summary.aerialWonPerGame, ""],
      ["Gol / gara", profile.derived.goalsPerGame, ""],
      ["Gialli / gara", profile.derived.yellowCardsPerGame, ""],
      ["Partite del campione", profile.summary.appearances, ""],
      ["Modulo più usato", profile.formation.code, ""]
    ].filter(([, number]) => number !== null && number !== undefined && number !== "").slice(0, 4);
    return \`<section class="detail-section team-style-section team-style-essential" aria-labelledby="team-style-essential-title"><header class="team-style-heading"><div><p class="eyebrow">Il profilo tattico</p><h2 id="team-style-essential-title">Stile di gioco</h2></div></header><p class="team-editorial-note">Baseline \${esc(profile.competition)} 2025/26 · \${value(profile.summary.appearances)} partite. Indicatori disponibili nella fonte, non una stima della stagione in corso.</p><dl class="team-tactical-summary">\${candidates.map(([label, number, suffix]) => \`<div><dt>\${label}</dt><dd>\${value(number, suffix)}</dd></div>\`).join("")}</dl>\${editorialDisclosure("team-style-disclosure", "Fonti e profilo tattico completo", tacticalProfileDetails(team, dataset))}</section>\`;
  };

`+s.slice(insert);
// Share the original ranking policy between full lists and the three editorial leaders.
const a=s.indexOf('      const leaders = rows.map('),b=s.indexOf(';',a)+1;
const sort=s.slice(a,b).replace('      const leaders = ','').replace(/;$/,'');
s=s.slice(0,a)+'      const leaders = rankedLeaders(rows, stat);'+s.slice(b);
const at=s.indexOf('  function squadLeaderboardSection');s=s.slice(0,at)+`  const rankedLeaders = (rows, stat) => ${sort};

`+s.slice(at);
replace('function squadLeaderboards(team, matches) {\r\n    const currentRows = currentSquadLeaderboardRows(team, matches);', 'function squadLeaderboards(team, currentRows) {');
// The file can be LF on other workspaces.
if(s.includes('function squadLeaderboards(team, matches)'))replace('function squadLeaderboards(team, matches) {\n    const currentRows = currentSquadLeaderboardRows(team, matches);','function squadLeaderboards(team, currentRows) {');
const at2=s.indexOf('  function squadTable');s=s.slice(0,at2)+`  function editorialLeaders(rows) {
    return \`<div class="team-leader-summary">\${[["goals", "Miglior marcatore"], ["shots", "Più tiri"], ["assists", "Miglior assistman"]].map(([key, label]) => {
      const first = rankedLeaders(rows, leaderboardStats.find(stat => stat.key === key))[0];
      return \`<article><p>\${label}</p>\${first ? \`<strong>\${esc(first.player.name)}</strong><span>\${value(first.total)} · Serie A 2026/27</span>\` : '<strong>N/D</strong><span>Dati non disponibili</span>'}</article>\`;
    }).join("")}</div>\`;
  }

  function editorialSeason(team, currentStats, standings) {
    const index = standings.findIndex(row => row.team === team.id);
    const results = currentStats?.results;
    const metrics = [["Posizione", index >= 0 ? index + 1 : null], ["Punti", results?.points], ["Partite", results?.played], ["Gol fatti", results?.goalsFor], ["Gol subiti", results?.goalsAgainst]];
    return \`<section class="team-season-summary" data-editorial-section="season" aria-labelledby="team-season-summary-title"><header class="team-editorial-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="team-season-summary-title">La stagione in numeri</h2></header><dl class="team-key-numbers">\${metrics.map(([label, number]) => \`<div><dt>\${label}</dt><dd>\${value(number)}</dd></div>\`).join("")}</dl>\${team.europeanCompetitions?.length ? \`<p class="team-editorial-note">Altre competizioni: \${team.europeanCompetitions.map(item => esc(typeof item === "string" ? item : item.name || item.competition || "")).filter(Boolean).join(" · ")}</p>\` : ""}</section>\`;
  }

  function editorialStatsSummary(stats) {
    const groups = [["Attacco", [["Gol fatti", stats?.results?.goalsFor], ["Tiri / partita", stats?.attack?.shotsPerGame]]], ["Difesa", [["Gol subiti", stats?.results?.goalsAgainst], ["Clean sheet", stats?.results?.cleanSheets]]], ["Possesso e costruzione", [["Possesso medio", stats?.possession?.averagePossession, "%"], ["Precisione passaggi", stats?.possession?.passAccuracy, "%"]]]];
    return \`<div class="team-stat-summary">\${groups.map(([label, metrics]) => \`<article><h3>\${label}</h3><dl>\${metrics.map(([name, number, suffix]) => \`<div><dt>\${name}</dt><dd>\${value(number, suffix || "")}</dd></div>\`).join("")}</dl></article>\`).join("")}</div>\`;
  }

`+s.slice(at2);
const start=s.indexOf('    const pageJumps ='),end=s.indexOf('    const comparatorSelectors',start);
s=s.slice(0,start)+`    const currentLeaderboardRows = currentSquadLeaderboardRows(team, matches);
    const pageJumps = \`<nav class="team-page-jumps" aria-label="Indice della pagina"><a href="#team-season-summary-title">Stagione</a><a href="#team-tactics-heading">Formazione e stile</a><a href="#team-statistics-title">Statistiche</a><a href="#squad-roster-heading">Protagonisti</a><a href="#team-comparator-disclosure">Comparatore</a><a class="team-calendar-link" href="\${base}squadra.html?team=\${esc(team.id)}">Calendario completo →</a></nav>\`;
    root.classList.add("team-editorial");
    root.innerHTML = \`\${teamNavigation(team, teams)}<section class="team-detail-hero" data-editorial-section="identity"><img src="\${team.logo}" alt="Stemma \${esc(team.name)}"><div><h1>\${esc(team.officialName)}</h1><p>\${esc(team.shortName)} · Città \${value(team.city)} · Stadio \${value(team.stadium)}</p><p><strong>Allenatore:</strong> \${value(team.coach)} · <strong>Modulo preferito:</strong> \${value(team.preferredFormation)}</p>\${pageJumps}</div></section>
    \${editorialSeason(team, currentStats, standings)}
    <section class="team-tactics-section" data-editorial-section="tactics" aria-labelledby="team-tactics-heading"><header class="team-dashboard-heading team-editorial-heading"><p class="eyebrow">Assetto e caratteristiche</p><h2 id="team-tactics-heading">Probabile formazione e stile di gioco</h2></header><div class="team-analysis-grid">\${lineupSection || '<p>Formazione non disponibile.</p>'}\${styleSection}</div></section>
    <section class="team-editorial-statistics" data-editorial-section="statistics" aria-labelledby="team-statistics-title"><header class="team-editorial-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="team-statistics-title">Statistiche approfondite</h2></header>\${editorialStatsSummary(currentStats)}\${editorialDisclosure("team-statistics-disclosure", "Mostra tutte le statistiche", \`\${team.previousSeason.promoted ? '<p class="competition-warning">Statistiche di provenienza: Serie B 2025/26. Non sono confrontate direttamente con i valori grezzi di Serie A.</p>' : ""}\${statsSections}\${objectiveSection}\`)} </section>
    <section class="detail-section team-roster-section" data-editorial-section="leaders" aria-labelledby="squad-roster-heading"><header class="team-roster-heading team-editorial-heading"><div><p class="eyebrow">Prestazioni individuali</p><h2 id="squad-roster-heading">I protagonisti</h2></div></header>\${editorialLeaders(currentLeaderboardRows)}\${editorialDisclosure("team-leaders-disclosure", "Mostra tutte le classifiche", \`\${squadLeaderboards(team, currentLeaderboardRows)}<details class="squad-table-disclosure"><summary><span><strong>Rosa e statistiche complete</strong><small>\${quality.complete || 0} schede complete · \${quality.partial || 0} parziali · \${quality.unavailable || 0} non disponibili</small></span><span>Apri la tabella</span></summary><div class="squad-table-disclosure-content"><p class="roster-summary">I dati sommano 2025/26 e 2026/27; seleziona un nome per il dettaglio.</p>\${filters()}<div id="squad-results">\${squadTable(team.squad, combinedPlayerStats)}</div></div></details>\`)}</section>
    <section class="team-editorial-comparator" data-editorial-section="comparator" aria-label="Comparatore calciatori">\${editorialDisclosure("team-comparator-disclosure", "Confronta i calciatori", squadComparator(team, combinedPlayerStats))}</section><dialog id="player-detail" class="player-detail"><div id="player-detail-content"></div></dialog>\`;
    root.querySelectorAll("details").forEach(panel => {
      const summary = panel.querySelector(":scope > summary");
      if (!summary) return;
      const sync = () => summary.setAttribute("aria-expanded", String(panel.open));
      sync();
      panel.addEventListener("toggle", sync);
    });
`+s.slice(end);
replace('La stagione in corso è aperta; il 2025/26 resta disponibile come confronto.','Serie A 2026/27 e confronto 2025/26: tutti i dati disponibili, inclusi casa e trasferta.');
fs.writeFileSync(p,s);
