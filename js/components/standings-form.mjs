// Recent form is descriptive and uses completed fixtures only.
export function standingsForm(fixtures,team,{scope='general',limit=5,name=id=>id,escape=value=>String(value)}={}){
  if(!fixtures)return '<span class="standings-form-empty">N/D</span>';
  const recent=fixtures.filter(f=>f.status==='finished'&&Number.isFinite(f.score?.home)&&Number.isFinite(f.score?.away)&&(scope==='home'?f.homeTeam===team:scope==='away'?f.awayTeam===team:f.homeTeam===team||f.awayTeam===team)).sort((a,b)=>`${a.date||''}T${a.kickoff||''}`.localeCompare(`${b.date||''}T${b.kickoff||''}`)||String(a.id).localeCompare(String(b.id))).slice(-limit);
  if(!recent.length)return '<span class="standings-form-empty">N/D</span>';
  return '<span class="standings-form" aria-label="Ultime partite, dalla meno recente alla più recente">'+recent.map(f=>{const home=f.homeTeam===team,own=f.score[home?'home':'away'],other=f.score[home?'away':'home'],result=own>other?'win':own===other?'draw':'loss',letter={win:'V',draw:'P',loss:'S'}[result],label={win:'Vittoria',draw:'Pareggio',loss:'Sconfitta'}[result],description=`${label} · ${f.date} · ${name(f.homeTeam)} ${f.score.home}–${f.score.away} ${name(f.awayTeam)}`;return `<span class="standings-form-result is-${result}" title="${escape(description)}" aria-label="${escape(description)}">${letter}</span>`}).join('')+'</span>';
}
