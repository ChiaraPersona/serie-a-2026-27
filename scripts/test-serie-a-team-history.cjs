const fs=require('node:fs'),assert=require('node:assert/strict');
const {projectHistory}=require('./build-serie-a-team-history.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
(async()=>{
 const teams=read('data/normalized/teams.json'),league=read('data/normalized/matches.json'),champions=read('data/normalized/champions-league-2026-27.json');
 const data=projectHistory(teams,league,champions);
 assert.deepEqual(data,read('data/generated/serie-a-team-history.json'));
 const {recentTeamMatches,teamMatchHistoryMarkup}=await import('../js/components/team-match-history.mjs');
 let european=0;
 for(const team of teams){
  const rows=data.teams[team.id];assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  for(let i=1;i<rows.length;i++)assert(rows[i-1].date>=rows[i].date);
  assert.equal(rows.filter(r=>r.competition==='serie-a').length,league.filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.score&&[m.homeTeam,m.awayTeam].includes(team.id)).length);
  for(const row of rows.filter(r=>r.competition==='champions-league')){
   european++;const original=champions.fixtures.find(m=>m.id===row.id);assert.equal(original.status,'finished');
   const side=row.venue==='Casa'?'home':'away',index=side==='home'?0:1;
   assert.equal(row.goalsFor,original.score[side]);
   assert.equal(row.stats.shots,original.matchReport?.statistics?.shots?.[index]??null);
  }
 }
 assert.equal(european,16);
 const old=recentTeamMatches(data,'inter',{before:'2026-10-01'});assert(old.every(r=>r.date<'2026-10-01'));
 assert(!old.some(r=>r.id.includes('md04')));
 const html=teamMatchHistoryMarkup(data,'inter');assert(html.includes('Champions League'));assert(!/https?:|sourceUrl|provider/.test(html));
 const fixture=league.find(m=>m.homeTeam==='inter'&&m.matchday===11);
 const projected=read(`data/generated/readings/matches/${fixture.id}.json`).artifacts['data/generated/serie-a-team-history.json'];
 assert.deepEqual(projected.teams.inter,recentTeamMatches(data,'inter',{before:fixture.date}));
 const partial=projectHistory([{id:'inter',name:'Inter'}],[],{teamBranding:[{team:'Inter',slug:'inter'}],fixtures:[{id:'test',date:'2026-01-01',status:'finished',homeTeam:'Inter',awayTeam:'Other',score:{home:0,away:0}}]});
 assert.equal(partial.teams.inter[0].stats.shots,null);assert.equal(partial.teams.inter[0].goalsFor,0);
 console.log('OK storico: 20 squadre, 16 gare Champions per squadra, ordine, prospettiva, cutoff, N/D e proiezione.');
})().catch(e=>{console.error(e);process.exitCode=1});
