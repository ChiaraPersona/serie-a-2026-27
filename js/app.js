const DATA="data/normalized/",RELEASE="20260718-official-3";
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
  const home=teams.find(x=>x.id===m.homeTeam),away=teams.find(x=>x.id===m.awayTeam),score=m.score?`${m.score.home} – ${m.score.away}`:"–";
  const scorers=m.scorers?.length?`<small class="muted">${m.scorers.map(s=>`${esc(s.player)} ${s.minute}’`).join(" · ")}</small>`:"";
  return `<article class="card match"><div><span class="status ${m.status}">${labels[m.status]||m.status}</span>${m.dateStatus==="provisional"?'<span class="status provisional">Provvisoria UEFA</span>':''}<div class="muted">${scheduleLabel(m)}</div></div><div><div class="match-teams">${teamLogo(home)}<strong class="score">${score}</strong>${teamLogo(away)}</div>${scorers}</div><div class="actions"><a class="button" href="lettura.html?match=${m.id}">Lettura</a><a class="button" href="statistiche-squadre.html?team=${m.homeTeam}">Statistiche</a></div></article>`
}
function standingsTable(rows,teams){const name=id=>teams.find(t=>t.id===id)?.name||id;return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Squadra</th><th>PG</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Pt</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(name(r.team))}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.goalsFor}</td><td>${r.goalsAgainst}</td><td>${r.goalDifference}</td><td><strong>${r.points}</strong></td></tr>`).join("")}</tbody></table></div>`}
const selector=(selected=1)=>`<div class="selector"><label for="day">Giornata</label><select id="day">${Array.from({length:38},(_,i)=>`<option value="${i+1}" ${i+1===selected?'selected':''}>${i+1}</option>`).join("")}</select></div>`;
function empty(text){return `<div class="empty">${text}</div>`}

async function render(){
  const page=document.body.dataset.page,[teams,matches,players,readings,refs]=await Promise.all([load("teams.json"),load("matches.json"),load("players.json"),load("readings.json"),load("referees.json")]);
  const league=matches.filter(m=>m.competition==="serie-a"),cup=matches.filter(m=>m.competition==="coppa-italia"),standings=calculateStandings(teams,matches);let html="";
  if(page==="home")html=hero("Stagione ufficiale","Il calcio italiano, giornata dopo giornata.","Tutte le 380 partite della Serie A Enilive 2026/27, con programmazione aggiornata senza inventare date ancora da definire.",`<div class="hero-stat"><strong>380</strong><span>partite ufficiali importate</span></div>`)+`<section class="section"><h2>Esplora la stagione</h2><div class="grid">${[["giornata.html","Giornata","Dieci partite e stato della programmazione."],["classifica.html","Classifica","Calcolata automaticamente dai risultati conclusi."],["calendario.html","Calendario","Tutti gli accoppiamenti delle 38 giornate."]].map(x=>`<a class="card card-link" href="${x[0]}"><h3>${x[1]}</h3><p class="muted">${x[2]}</p></a>`).join("")}</div></section>`;
  if(page==="matchday"||page==="calendar"){
    const queryDay=Math.min(38,Math.max(1,Number(new URLSearchParams(location.search).get("day"))||1));
    const title=page==="matchday"?"Giornata":"Calendario 2026/27",description=page==="matchday"?"Dieci partite, programmazione e classifica nello stesso aggiornamento.":"Accoppiamenti ufficiali con date confermate, provvisorie o ancora da definire.";
    html=hero("Serie A",title,description)+`<section class="section">${selector(queryDay)}<div id="day-matches">${league.filter(m=>m.matchday===queryDay).map(m=>matchCard(m,teams)).join("")}</div></section>${page==="matchday"?`<section class="section"><h2>Classifica aggiornata</h2>${standingsTable(standings,teams)}</section>`:""}`;
    document.querySelector("#app").innerHTML=html;
    document.querySelector("#day").addEventListener("change",event=>{const day=Number(event.target.value);document.querySelector("#day-matches").innerHTML=league.filter(m=>m.matchday===day).map(m=>matchCard(m,teams)).join("");history.replaceState(null,"",`${location.pathname}?day=${day}`)});return;
  }
  if(page==="standings")html=hero("Serie A","Classifica","Sarà aggiornata automaticamente dopo ogni partita conclusa, anche a giornata incompleta.")+`<section class="section">${standingsTable(standings,teams)}</section>`;
  if(page==="team-stats")html=hero("Numeri cumulativi","Statistiche squadre","Rendimento generale; casa, trasferta e forma ultime 5/10 saranno alimentati dai risultati ufficiali.")+`<section class="section"><h2>Rendimento disponibile</h2>${standingsTable(standings,teams)}</section>`;
  if(page==="player-stats")html=hero("Numeri cumulativi","Statistiche giocatori","Presenze, gol, assist e disciplina saranno pubblicati quando disponibili da fonti ufficiali.")+`<section class="section">${players.length?"":empty("Le statistiche giocatore non sono ancora disponibili.")}</section>`;
  if(page==="readings")html=hero("Analisi prepartita","Lettura","Le letture verranno pubblicate senza inventare quote o pronostici.")+`<section class="section">${readings.length?`<div class="grid">${readings.map(r=>`<article class="card"><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p></article>`).join("")}</div>`:empty("Nessuna lettura pubblicata per la stagione 2026/27.")}</section>`;
  if(page==="cup")html=hero("Eliminazione diretta","Coppa Italia","Il tabellone userà la stessa scheda partita condivisa quando verranno importati gli incontri ufficiali.")+`<section class="section bracket">${cup.length?cup.map(m=>matchCard(m,teams)).join(""):empty("Calendario Coppa Italia non ancora importato.")}</section>`;
  if(page==="referees")html=hero("Direzione gara","Arbitri","Designazioni e statistiche saranno aggiunte soltanto da fonti ufficiali tracciate.")+`<section class="section">${refs.length?"":empty("Designazioni arbitrali non ancora pubblicate.")}</section>`;
  if(page==="sources")html=hero("Trasparenza","Metodo e fonti","Ogni record conserva provenienza, comunicato e data di acquisizione.")+`<section class="section"><div class="grid"><article class="card"><h3>C.U. n. 205</h3><p>Accoppiamenti e date di riferimento delle 38 giornate.</p></article><article class="card"><h3>C.U. n. 208</h3><p>Date e orari delle prime cinque giornate, incluse le condizioni UEFA.</p></article><article class="card"><h3>Club Lega Serie A</h3><p>Stemmi locali acquisiti dalla pagina ufficiale dei club, senza hotlink.</p></article></div></section>`;
  document.querySelector("#app").innerHTML=html;
}
document.querySelectorAll("[data-page-link]").forEach(a=>a.classList.toggle("active",a.dataset.pageLink===document.body.dataset.page));
const btn=document.querySelector(".menu-button"),nav=document.querySelector(".site-nav");btn.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",open)});
render().catch(e=>{document.querySelector("#app").innerHTML=`<section class="empty"><h1>Dati non disponibili</h1><p>${esc(e.message)}</p></section>`;console.error(e)});
