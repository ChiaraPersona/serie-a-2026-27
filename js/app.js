const DATA="data/normalized/",RELEASE="20260718-team-nav-spacing";
const labels={scheduled:"Programmata",live:"In corso",finished:"Conclusa",postponed:"Rinviata"};
const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function load(name){const r=await fetch(`${DATA}${name}?v=${RELEASE}`);if(!r.ok)throw new Error(`${name}: ${r.status}`);return r.json()}
const dateOnly=v=>{if(!v)return null;const [year,month,day]=String(v).slice(0,10).split("-");const months=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];return `${Number(day)} ${months[Number(month)-1]} ${year}`};
const sourceBanner=()=>`<aside class="source-banner"><strong>Dati ufficiali Lega Serie A.</strong> Calendario dal C.U. n. 205; date e orari delle prime cinque giornate dal C.U. n. 208.</aside>`;
const hero=(eyebrow,title,text,aside="")=>`${sourceBanner()}<section class="hero"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${text}</p></div>${aside}</section>`;
function scheduleLabel(m){
  if(!m.date)return `Data da definire · giornata di riferimento ${dateOnly(m.matchdayDate)}`;
  return `${dateOnly(m.date)} · ${m.kickoff||"orario da definire"}${m.dateStatus==="provisional"?" · programmazione provvisoria UEFA":""}`;
}
function teamLogo(team){return `<span class="team-with-logo"><span class="team-logo"><img src="${team.logo}" alt="" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><b>${esc(team.shortName.slice(0,2).toUpperCase())}</b></span><span>${esc(team.name)}</span></span>`}
function matchCard(m,teams){
  const home=teams.find(x=>x.id===m.homeTeam),away=teams.find(x=>x.id===m.awayTeam),score=m.score?`${m.score.home} – ${m.score.away}`:"VS";
  const scorers=m.scorers?.length?`<small class="muted">${m.scorers.map(s=>`${esc(s.player)} ${s.minute}’`).join(" · ")}</small>`:"";
  return `<article class="card match fixture-card"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${m.matchday}</span><span class="status ${m.status}">${labels[m.status]||m.status}</span>${m.dateStatus==="provisional"?'<span class="status provisional">Provvisoria UEFA</span>':''}</div><div class="match-date">${scheduleLabel(m)}</div></header><div class="fixture-teams"><div class="fixture-team">${teamLogo(home)}</div><div class="fixture-score"><span></span><strong class="score">${score}</strong><span></span></div><div class="fixture-team">${teamLogo(away)}</div></div>${scorers}<div class="actions"><a class="button" href="lettura.html?match=${m.id}">Lettura</a><a class="button" href="statistiche-squadre.html?team=${m.homeTeam}">Statistiche</a></div></article>`
}
function standingsTable(rows,teams){const name=id=>teams.find(t=>t.id===id)?.name||id;return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Squadra</th><th>PG</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Pt</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(name(r.team))}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.goalsFor}</td><td>${r.goalsAgainst}</td><td>${r.goalDifference}</td><td><strong>${r.points}</strong></td></tr>`).join("")}</tbody></table></div>`}
const dayNav=()=>`<nav class="day-nav" aria-label="Selezione rapida giornata"><span>Vai alla giornata</span><div>${Array.from({length:38},(_,i)=>{const day=i+1;return `<a class="day-link" href="#giornata-${day}" aria-label="Giornata ${day}">${day}</a>`}).join("")}</div></nav>`;
const teamNav=(teams,selected="")=>`<nav class="team-nav" aria-label="Calendari delle squadre"><span>Calendario per squadra</span><div>${teams.map(team=>`<a class="team-nav-link ${team.id===selected?'active':''}" href="squadra.html?team=${team.id}" aria-label="Calendario ${esc(team.name)}" title="${esc(team.name)}"><img src="${team.logo}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b hidden>${esc(team.shortName.slice(0,2).toUpperCase())}</b></a>`).join("")}</div></nav>`;
const calendarDays=(league,teams)=>Array.from({length:38},(_,i)=>{const day=i+1,matches=league.filter(m=>m.matchday===day);return `<section class="calendar-day" id="giornata-${day}"><header class="calendar-day-head"><div><p class="eyebrow">Serie A 2026/27</p><h2>Giornata ${day}</h2></div><span>${dateOnly(matches[0]?.matchdayDate)||"Data di riferimento da definire"}</span></header><div class="day-matches">${matches.map(m=>matchCard(m,teams)).join("")}</div></section>`}).join("");
function empty(text){return `<div class="empty">${text}</div>`}

async function render(){
  const page=document.body.dataset.page,[teams,matches,players,readings,refs]=await Promise.all([load("teams.json"),load("matches.json"),load("players.json"),load("readings.json"),load("referees.json")]);
  const league=matches.filter(m=>m.competition==="serie-a"),cup=matches.filter(m=>m.competition==="coppa-italia"),standings=calculateStandings(teams,matches);let html="";
  if(page==="home")html=hero("Stagione ufficiale","Il calcio italiano, giornata dopo giornata.","Tutte le 380 partite della Serie A Enilive 2026/27, con programmazione aggiornata senza inventare date ancora da definire.",`<div class="hero-stat"><strong>380</strong><span>partite ufficiali importate</span></div>`)+`<section class="section"><h2>Esplora la stagione</h2><div class="grid">${[["calendario.html","Calendario","Tutti gli accoppiamenti delle 38 giornate."],["classifica.html","Classifica","Calcolata automaticamente dai risultati conclusi."],["statistiche-squadre.html","Statistiche squadre","Rendimento generale aggiornato dai risultati ufficiali."]].map(x=>`<a class="card card-link" href="${x[0]}"><h3>${x[1]}</h3><p class="muted">${x[2]}</p></a>`).join("")}</div></section>`;
  if(page==="calendar"){
    html=hero("Serie A","Calendario 2026/27","Tutte le 38 giornate in un'unica pagina. Usa le barre rapide per cercare una giornata o il calendario di una squadra.")+dayNav()+teamNav(teams)+`<div class="calendar-list">${calendarDays(league,teams)}</div>`;
    document.querySelector("#app").innerHTML=html;return;
  }
  if(page==="team"){
    const teamId=new URLSearchParams(location.search).get("team"),team=teams.find(t=>t.id===teamId)||teams[0],teamMatches=league.filter(m=>m.homeTeam===team.id||m.awayTeam===team.id).sort((a,b)=>a.matchday-b.matchday);
    html=hero("Calendario squadra",team.name,`Tutte le 38 partite di ${esc(team.name)}, dalla prima all'ultima giornata.`,`<div class="team-hero-logo"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"></div>`)+teamNav(teams,team.id)+`<section class="section team-schedule"><div class="team-schedule-head"><h2>Le 38 giornate</h2><a class="button" href="calendario.html">Calendario completo</a></div><div class="team-match-list">${teamMatches.map(m=>`<section class="team-matchday">${matchCard(m,teams)}</section>`).join("")}</div></section>`;
    document.title=`${team.name} | Calendario Serie A 2026/27`;document.querySelector("#app").innerHTML=html;return;
  }
  if(page==="standings")html=hero("Serie A","Classifica","Sarà aggiornata automaticamente dopo ogni partita conclusa, anche a giornata incompleta.")+`<section class="section">${standingsTable(standings,teams)}</section>`;
  if(page==="team-stats")html=hero("Numeri cumulativi","Statistiche squadre","Rendimento generale; casa, trasferta e forma ultime 5/10 saranno alimentati dai risultati ufficiali.")+`<section class="section"><h2>Rendimento disponibile</h2>${standingsTable(standings,teams)}</section>`;
  if(page==="player-stats")html=hero("Numeri cumulativi","Statistiche giocatori","Presenze, gol, assist e disciplina saranno pubblicati quando disponibili da fonti ufficiali.")+`<section class="section">${players.length?"":empty("Le statistiche giocatore non sono ancora disponibili.")}</section>`;
  if(page==="readings")html=hero("Analisi prepartita","Lettura","Le letture verranno pubblicate senza inventare quote o pronostici.")+`<section class="section">${readings.length?`<div class="grid">${readings.map(r=>`<article class="card"><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p></article>`).join("")}</div>`:empty("Nessuna lettura pubblicata per la stagione 2026/27.")}</section>`;
  if(page==="cup")html=hero("Eliminazione diretta","Coppa Italia","Il tabellone userà la stessa scheda partita condivisa quando verranno importati gli incontri ufficiali.")+`<section class="section bracket">${cup.length?cup.map(m=>matchCard(m,teams)).join(""):empty("Calendario Coppa Italia non ancora importato.")}</section>`;
  if(page==="referees")html=hero("Direzione gara","Arbitri","Designazioni e statistiche saranno aggiunte soltanto da fonti ufficiali tracciate.")+`<section class="section">${refs.length?"":empty("Designazioni arbitrali non ancora pubblicate.")}</section>`;
  document.querySelector("#app").innerHTML=html;
}
document.querySelectorAll("[data-page-link]").forEach(a=>a.classList.toggle("active",a.dataset.pageLink===document.body.dataset.page));
const btn=document.querySelector(".menu-button"),nav=document.querySelector(".site-nav");btn.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",open)});
render().catch(e=>{document.querySelector("#app").innerHTML=`<section class="empty"><h1>Dati non disponibili</h1><p>${esc(e.message)}</p></section>`;console.error(e)});
