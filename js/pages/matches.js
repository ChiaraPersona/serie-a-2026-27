export function createPage(deps){
  const {dateOnly,esc,hero,scheduleChronology,load}=deps;
  const competitionMarks={"champions-league":"UCL","europa-league":"UEL","conference-league":"UECL"};
  const statusLabels={scheduled:"Programmata",live:"In corso",finished:"Conclusa",postponed:"Rinviata"};
  const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").replace(/[^a-z0-9]+/g," ").trim();
  const teamNav=(teams,selected="")=>`<nav class="team-nav" aria-label="Calendari delle squadre"><span>Calendario per squadra</span><div>${teams.map(team=>`<a class="team-nav-link ${team.id===selected?'active':''}" data-team="${team.id}" href="squadra.html?team=${team.id}" aria-label="Calendario ${esc(team.name)}" title="${esc(team.name)}"><img src="${esc(team.logo)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b hidden>${esc(team.shortName.slice(0,2).toUpperCase())}</b></a>`).join("")}</div></nav>`;
  function empty(text){return `<div class="empty">${text}</div>`}
  const scheduleLabel=match=>match.date?`${dateOnly(match.date)} · ${match.kickoff||"orario da definire"}`:"Data da definire";
  const teamNameIndex=teams=>new Map(teams.flatMap(team=>[team.name,team.officialName,team.shortName,team.id].filter(Boolean).map(name=>[normalize(name),team.id])));
  const cupFixturesFor=(team,cup,teams)=>{
    const ids=teamNameIndex(teams),stages=new Map((cup.stages||[]).map(stage=>[stage.id,stage.label]));
    return (cup.matches||[]).map(match=>{
      const homeTeam=ids.get(normalize(match.home)),awayTeam=ids.get(normalize(match.away));
      if(homeTeam!==team.id&&awayTeam!==team.id)return null;
      return {...match,calendarType:"cup",competition:"coppa-italia",competitionLabel:"Coppa Italia",stageLabel:stages.get(match.stage)||"Coppa Italia",homeTeam:homeTeam||match.home,awayTeam:awayTeam||match.away,homeName:match.home,awayName:match.away};
    }).filter(Boolean);
  };
  const europeanFixturesFor=(team,europe)=>europe.fixtures.filter(match=>match.teamId===team.id).map(match=>({...match,calendarType:"europe",homeName:match.homeTeam,awayName:match.awayTeam}));
  const leagueFixturesFor=(team,league,teams)=>league.filter(match=>match.homeTeam===team.id||match.awayTeam===team.id).map(match=>({...match,calendarType:"league",competitionLabel:"Serie A",homeName:teams.find(item=>item.id===match.homeTeam)?.name||match.homeTeam,awayName:teams.find(item=>item.id===match.awayTeam)?.name||match.awayTeam}));
  const dayDistance=(left,right)=>Math.round((Date.parse(right)-Date.parse(left))/86400000);
  const workloadNote=(match,european)=>{
    if(match.calendarType!=="league"||!match.date)return"";
    const previous=european.filter(item=>item.date&&dayDistance(item.date,match.date)>=0&&dayDistance(item.date,match.date)<=4).sort((a,b)=>b.date.localeCompare(a.date))[0];
    return previous?`Fatica: a ${dayDistance(previous.date,match.date)} giorn${dayDistance(previous.date,match.date)===1?"o":"i"} da ${previous.competitionLabel}`:"";
  };
  const calendarClub=(name,teamId,teams,currentTeamId)=>{
    const club=teams.find(team=>team.id===teamId),current=teamId===currentTeamId;
    return `<span class="team-calendar-club${current?" is-current":""}">${club?`<img src="${esc(club.logo)}" alt="" loading="lazy">`:`<i class="team-calendar-opponent-mark" aria-hidden="true">${esc(String(name).split(/\s+/).map(part=>part[0]).join("").slice(0,3).toUpperCase())}</i>`}<span>${esc(name)}</span></span>`;
  };
  const appointmentRow=(match,team,teams,european)=>{
    const isLeague=match.calendarType==="league",isEurope=match.calendarType==="europe",isCup=match.calendarType==="cup";
    const ids=teamNameIndex(teams),homeId=ids.get(normalize(match.homeName))||null,awayId=ids.get(normalize(match.awayName))||null;
    const venue=homeId===team.id?"Casa":"Trasferta",score=match.score?`${match.score.home} – ${match.score.away}`:"VS",fatigue=workloadNote(match,european);
    const mark=isLeague?match.matchday:isCup?"COPPA":competitionMarks[match.competition];
    const round=isLeague?"Giornata":isCup?match.stageLabel:match.competitionLabel;
    const opponentId=homeId===team.id?awayId:homeId;
    const actions=isLeague?`<div class="team-calendar-actions"><a href="lettura.html?match=${esc(match.id)}">Lettura</a><a href="statistiche-squadra/${esc(opponentId)}.html">Avversaria</a></div>`:isCup?`<div class="team-calendar-actions"><a href="coppa-italia.html">Coppa Italia</a></div>`:`<span class="team-calendar-no-prediction">Solo carico calendario · nessun pronostico</span>`;
    return `<article class="team-calendar-row${isEurope?" is-european":""}${isCup?" is-cup":""}${fatigue?" has-fatigue":""}"><div class="team-calendar-round"><strong>${esc(mark)}</strong><span>${esc(round)}</span></div><div class="team-calendar-when"><strong>${scheduleLabel(match)}</strong><span class="status ${esc(match.status)}">${esc(statusLabels[match.status]||match.status)}</span>${fatigue?`<small class="team-calendar-fatigue">${esc(fatigue)}</small>`:""}</div><span class="status venue-status">${venue}</span><div class="team-calendar-match">${calendarClub(match.homeName,homeId,teams,team.id)}<strong class="team-calendar-score">${esc(score)}</strong>${calendarClub(match.awayName,awayId,teams,team.id)}</div>${actions}</article>`;
  };
  const personalCalendar=(team,league,europe,cup,teams)=>{
    const european=europeanFixturesFor(team,europe),coppa=cupFixturesFor(team,cup,teams),fixtures=[...leagueFixturesFor(team,league,teams),...european,...coppa].sort((a,b)=>scheduleChronology(a,b)||a.id.localeCompare(b.id));
    const uefaLabel=european.length===1?"gara UEFA":"gare UEFA",cupLabel=coppa.length===1?"gara di Coppa Italia":"gare di Coppa Italia";
    return {fixtures,html:`<section class="section team-schedule team-personal-calendar"><div class="team-schedule-head"><div><p class="eyebrow">Tutte le competizioni 2026/27</p><h2>Tutti gli appuntamenti</h2><p class="muted">38 giornate di Serie A · ${european.length} ${uefaLabel} · ${coppa.length} ${cupLabel}.</p></div></div><div class="team-calendar-list">${fixtures.map(match=>appointmentRow(match,team,teams,european)).join("")}</div></section>`};
  };
  async function render(){
    const page=document.body.dataset.page,[teams,matches]=await Promise.all([load("teams.json"),load("matches.json")]);
    const league=matches.filter(m=>m.competition==="serie-a");
    let html="";
    if(page==="team"){
      const [europe,cup]=await Promise.all([load("european-fixtures-2026-27.json"),load("coppa-italia-2026-27.json")]);
      const teamId=new URLSearchParams(location.search).get("team"),team=teams.find(t=>t.id===teamId)||teams[0],calendar=personalCalendar(team,league,europe,cup,teams);
      html=hero("Calendario squadra",team.name,"Serie A, Champions League, Europa League, Conference League e Coppa Italia in un'unica sequenza cronologica.",`<div class="team-hero-logo"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"></div>`)+teamNav(teams,team.id)+calendar.html;
      document.title=`${team.name} | Calendario 2026/27`;document.querySelector("#app").innerHTML=html;return;
    }
    document.querySelector("#app").innerHTML=html;
  }
  return {render};
}
