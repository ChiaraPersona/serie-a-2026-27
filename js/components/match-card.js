export function createMatchComponents({dateOnly,esc,labels}){
function scheduleLabel(m){
  if(!m.date)return "Data da definire";
  return `${dateOnly(m.date)} · ${m.kickoff||"orario da definire"}${m.dateStatus==="provisional"?" · programmazione provvisoria UEFA":""}`;
}
function teamLogo(team,{showName=true}={}){return `<span class="team-with-logo"><span class="team-logo"><img src="${team.logo}" alt="Stemma ${esc(team.name)}" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><b>${esc(team.shortName.slice(0,2).toUpperCase())}</b></span>${showName?`<span class="team-name">${esc(team.name)}</span>`:""}</span>`}
function matchCard(m,teams){
  const home=teams.find(x=>x.id===m.homeTeam),away=teams.find(x=>x.id===m.awayTeam),score=m.score?`${m.score.home} - ${m.score.away}`:"VS";
  const scoreContent=m.score?esc(score):"vs";
  const [homeColor1="#174fa5",homeColor2="#081d48"]=home.colors||[],[awayColor1="#174fa5",awayColor2="#081d48"]=away.colors||[];
  const teamColorStyle=`--home-color-1:${homeColor1};--home-color-2:${homeColor2};--away-color-1:${awayColor1};--away-color-2:${awayColor2}`;
  const status=m.status!=="scheduled"?`<span class="status ${m.status}">${labels[m.status]||m.status}</span>`:"";
  const referee=m.refereeAssignment?.referee?.name?`<footer class="fixture-official"><span>Arbitro</span><strong>${esc(m.refereeAssignment.referee.name)}</strong></footer>`:"";
  return `<a class="card match fixture-card fixture-card-link" href="lettura.html?match=${esc(m.id)}" aria-label="Apri la lettura di ${esc(home.name)} - ${esc(away.name)}" style="${teamColorStyle}"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${m.matchday}</span>${status}${m.dateStatus==="provisional"?'<span class="status provisional">Provvisoria UEFA</span>':''}</div><div class="match-date">${scheduleLabel(m)}</div></header><div class="fixture-teams"><div class="fixture-team fixture-team-home">${teamLogo(home)}</div><div class="fixture-score"><strong class="score ${m.score?'score-result reading-final-score':'score-versus'}">${scoreContent}</strong></div><div class="fixture-team fixture-team-away">${teamLogo(away)}</div></div>${referee}</a>`
}
function homeMatchListItem(m,teams){
  const home=teams.find(team=>team.id===m.homeTeam),away=teams.find(team=>team.id===m.awayTeam);
  const finished=m.status==="finished"&&m.score,result=finished?`${m.score.home} – ${m.score.away}`:"–";
  return `<li class="home-match-row${finished?" is-finished":""}"><div class="home-match-meta"><time>${scheduleLabel(m)}</time></div><div class="home-match-teams">${teamLogo(home)}<b class="home-match-score" aria-label="${finished?`Risultato ${m.score.home} a ${m.score.away}`:"Partita da giocare"}">${result}</b>${teamLogo(away)}</div></li>`
}
  return {scheduleLabel,teamLogo,matchCard,homeMatchListItem};
}
