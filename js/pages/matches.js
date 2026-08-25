export function createPage(deps){
  const {esc,hero,scheduleChronology,matchCard,load}=deps;
const dayNav=()=>`<nav class="day-nav" aria-label="Selezione rapida giornata"><span>Vai alla giornata</span><div>${Array.from({length:38},(_,i)=>{const day=i+1;return `<a class="day-link" href="#giornata-${day}" aria-label="Giornata ${day}">${day}</a>`}).join("")}</div></nav>`;
const teamNav=(teams,selected="")=>`<nav class="team-nav" aria-label="Calendari delle squadre"><span>Calendario per squadra</span><div>${teams.map(team=>`<a class="team-nav-link ${team.id===selected?'active':''}" data-team="${team.id}" href="squadra.html?team=${team.id}" aria-label="Calendario ${esc(team.name)}" title="${esc(team.name)}"><img src="${esc(team.logo)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b hidden>${esc(team.shortName.slice(0,2).toUpperCase())}</b></a>`).join("")}</div></nav>`;
const calendarDays=(league,teams)=>{
  const matchdays=Array.from({length:38},(_,i)=>{const day=i+1,matches=league.filter(m=>m.matchday===day).sort(scheduleChronology);return {day,matches,finished:matches.length===10&&matches.every(match=>match.status==="finished")}});
  const activeDay=matchdays.find(matchday=>!matchday.finished)?.day||38;
  return matchdays.map(({day,matches})=>`<details class="calendar-day" id="giornata-${day}" data-calendar-day="${day}" name="serie-a-calendar"${day===activeDay?' open':''}><summary class="calendar-day-head"><div><p class="eyebrow">Serie A 2026/27</p><h2>Giornata ${day}</h2></div></summary><div class="day-matches">${matches.map(m=>`<div data-calendar-teams="${m.homeTeam} ${m.awayTeam}">${matchCard(m,teams)}</div>`).join("")}</div></details>`).join("");
};
function empty(text){return `<div class="empty">${text}</div>`}
  async function render(){
    const page=document.body.dataset.page,[teams,matches]=await Promise.all([load("teams.json"),load("matches.json")]);
    const league=matches.filter(m=>m.competition==="serie-a");
    let html="";
  if(page==="calendar"){
    html=hero("Serie A","Calendario 2026/27","Scegli una giornata o una squadra e consulta tutte le 380 partite.")+dayNav()+teamNav(teams)+`<div class="calendar-list">${calendarDays(league,teams)}</div>`;
  }
  if(page==="team"){
    const teamId=new URLSearchParams(location.search).get("team"),team=teams.find(t=>t.id===teamId)||teams[0],teamMatches=league.filter(m=>m.homeTeam===team.id||m.awayTeam===team.id).sort((a,b)=>a.matchday-b.matchday);
    html=hero("Calendario squadra",team.name,`Tutte le 38 partite di ${esc(team.name)}, dalla prima all'ultima giornata.`,`<div class="team-hero-logo"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"></div>`)+teamNav(teams,team.id)+`<section class="section team-schedule"><div class="team-schedule-head"><h2>Le 38 giornate</h2><a class="button" href="calendario.html">Calendario completo</a></div><div class="team-match-list">${teamMatches.map(m=>`<section class="team-matchday">${matchCard(m,teams)}</section>`).join("")}</div></section>`;
    document.title=`${team.name} | Calendario Serie A 2026/27`;document.querySelector("#app").innerHTML=html;return;
  }
    document.querySelector("#app").innerHTML=html;
    if(page==="calendar"){
      const calendar=document.querySelector(".calendar-list"),days=[...calendar.querySelectorAll(".calendar-day")];
      days.forEach(day=>day.addEventListener("toggle",()=>{if(day.open)days.forEach(other=>{if(other!==day)other.open=false})}));
      document.querySelectorAll('.day-link[href^="#giornata-"]').forEach(link=>link.addEventListener("click",()=>{const target=document.querySelector(link.getAttribute("href"));if(target)target.open=true}));
    }
  }
  return {render};
}
