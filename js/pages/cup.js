export function createPage(deps){
  const {esc,dateOnly,scheduleLabel,scheduleChronology,hero,load}=deps;
function cupTeamSlot(match,team="Da definire"){
  const events=[...(match.scorers||[]).filter(item=>item.team===team).map(item=>({...item,type:"goal"})),...(match.bookings||[]).filter(item=>item.team===team).map(item=>({...item,type:"yellow"})),...(match.redCards||[]).filter(item=>item.team===team).map(item=>({...item,type:"red"}))].sort((a,b)=>(parseInt(a.minute)||0)-(parseInt(b.minute)||0));
  const eventLabel=event=>event.type==="goal"?`Gol di ${event.player} al ${event.minute}`:event.type==="yellow"?`Ammonizione di ${event.player} al ${event.minute}`:`Espulsione di ${event.player} al ${event.minute}`;
  const eventIcon=event=>event.type==="goal"?'<img src="assets/images/icons/goal-ball.jpg" alt="" aria-hidden="true">':`<i class="cup-card-symbol is-${event.type}" aria-hidden="true"></i>`;
  const eventRows=events.map(event=>`<span class="cup-team-event is-${event.type}" aria-label="${esc(eventLabel(event))}">${eventIcon(event)}<span>${esc(event.player)} <strong>${esc(event.minute)}${event.detail?` · ${esc(event.detail)}`:""}</strong></span></span>`).join("");
  return `<span class="cup-team-slot${eventRows?" has-events":""}"><i class="cup-team-dot" aria-hidden="true"></i><span class="cup-team-name">${esc(team)}</span>${eventRows?`<span class="cup-team-events">${eventRows}</span>`:""}</span>`;
}
const cupRoundConfig=[
  {id:"preliminary",step:"01",label:"Turno preliminare",window:"8–9 agosto 2026"},
  {id:"round-32",step:"02",label:"Trentaduesimi",window:"14–17 agosto 2026"},
  {id:"round-16",step:"03",label:"Sedicesimi",window:"2–15 settembre 2026"},
  {id:"round-of-16",step:"04",label:"Ottavi di finale",window:"2 dicembre 2026 – 13 gennaio 2027"},
  {id:"quarter",step:"05",label:"Quarti di finale",window:"3–10 febbraio 2027"},
  {id:"semifinal",step:"06",label:"Semifinali",window:"3–24 marzo 2027"},
  {id:"final",step:"07",label:"Finale",window:"19 maggio 2027"}
];
function cupMatchCard(match,index,round){
  const pathLabel=["preliminary","round-32"].includes(round.id)?`Partita ${index+1}`:round.id==="final"?"Atto conclusivo":round.id==="semifinal"?`Semifinale ${index+1}`:`Percorso ${String(match.branch??index+1).padStart(2,"0")}`;
  const result=match.score?`${match.score.home}-${match.score.away}${match.shootout?` (${match.shootout.home}-${match.shootout.away} d.c.r.)`:""}`:null;
  const source=match.resultSource?`<a class="cup-result-source" href="${esc(match.resultSource.url)}" target="_blank" rel="noreferrer">Tabellino</a>`:"";
  return `<article class="cup-match-card${match.status==="finished"?" is-finished":""}" aria-label="${esc(`${match.home} contro ${match.away}, ${result||match.scheduleLabel||"data da definire"}`)}"><header><span>${pathLabel}</span>${result?`<b class="cup-result">${esc(result)}</b>`:round.id==="final"?'<b aria-hidden="true">CI</b>':""}</header><div class="cup-match-teams">${cupTeamSlot(match,match.home)}${cupTeamSlot(match,match.away)}</div><footer><span>${result?"Giocata":"Data"}</span><strong>${esc(match.scheduleLabel||"Data da definire")}</strong>${source}</footer></article>`;
}
function cupRound(round,data){
  const matches=data.matches.filter(match=>match.stage===round.id).sort((a,b)=>scheduleChronology(a,b)||(a.branch??0)-(b.branch??0));
  return `<section class="cup-round cup-round--${round.id}" id="coppa-${round.id}" data-stage="${round.id}"><header class="cup-round-heading"><span>${round.step}</span><div><p>${round.window}</p><h3>${round.label}</h3></div><small>${matches.length} ${matches.length===1?"incrocio":"incroci"}</small></header><div class="cup-match-grid">${matches.map((match,index)=>cupMatchCard(match,index,round)).join("")}</div></section>`;
}
function cupBracket(data){
  const visibleMatches=data.matches.filter(match=>cupRoundConfig.some(round=>round.id===match.stage));
  const roundNavigation=cupRoundConfig.map(round=>`<a href="#coppa-${round.id}"><span>${round.step}</span>${round.label}</a>`).join("");
  return `<section class="section cup-stage"><header class="section-heading cup-stage-heading"><div><p class="eyebrow">Tabellone 2026/27</p><h2>Il percorso, turno dopo turno</h2><p>Gli incroci sono disposti in ordine cronologico. I nomi separati da una barra rappresentano alternative ancora aperte, non squadre già qualificate.</p></div><span class="cup-badge"><i aria-hidden="true"></i> ${visibleMatches.length} incroci mostrati</span></header><nav class="cup-round-nav" aria-label="Vai a un turno della Coppa Italia">${roundNavigation}</nav><div class="cup-round-list">${cupRoundConfig.map(round=>cupRound(round,data)).join("")}</div><footer class="cup-stage-note"><span>Aggiornato al ${dateOnly(data.updatedAt)}</span><p>Fonte: <a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">${esc(data.source.label)}</a>. Date, orari e programmazione TV sono riportati quando disponibili nella fonte.</p></footer></section>`;
}

  async function render(){
    const page="cup",cupBracketData=await load("coppa-italia-2026-27.json");
    let html="";
  if(page==="cup")html=hero("Eliminazione diretta","Coppa Italia","Dai preliminari dell’8 agosto alla finale del 19 maggio: date, orari e percorsi della coppa in un tabellone distinto dal campionato.")+cupBracket(cupBracketData);
    document.querySelector("#app").innerHTML=html;
  }
  return {render};
}
