const fs=require('node:fs'),assert=require('node:assert/strict');
const {projectHistory}=require('./build-serie-a-team-history.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
(async()=>{
 const teams=read('data/normalized/teams.json'),league=read('data/normalized/matches.json'),champions=read('data/normalized/champions-league-2026-27.json');
 const secondary=read('data/normalized/european-recent-results-2026-27.json').fixtures;
 const {normalize,jobs}=require('./import-european-recent-results.cjs');
 for(const job of jobs){
  const fixture=secondary.find(f=>f.id===job[0]);assert(fixture);
  const raw=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(fixture.evidence.rawPath)));
  assert.deepEqual(normalize(raw,fixture,job).teamStats,fixture.teamStats);
  const wrong=structuredClone(raw);wrong.payload.header.id='wrong';assert.throws(()=>normalize(wrong,fixture,job));
 }
 const xg=read('data/normalized/european-history-xg-2026-27.json').entries;
 const data=projectHistory(teams,league,champions,secondary,xg);
 const milan=data.teams.milan.filter(m=>m.competition==='europa-league');
 assert.equal(milan.length,4,'Milan: tutte le quattro gare Europa League devono entrare nello storico');
 assert.deepEqual(milan.map(m=>[m.date,m.goalsFor,m.goalsAgainst]),[['2026-11-05',0,2],['2026-10-22',0,3],['2026-10-15',4,0],['2026-09-16',0,2]]);
 assert.equal(data.teams.juventus.filter(m=>m.competition==='europa-league').length,4);
 assert.equal(data.teams.atalanta.filter(m=>m.competition==='conference-league').length,3);
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
 const milanHtml=teamMatchHistoryMarkup(data,'milan',{before:'2026-11-07'});assert(milanHtml.includes('Europa League'));assert(milanHtml.includes('Ferencaros'));assert(!/https?:|sourceUrl|provider/.test(milanHtml));
 assert.equal(recentTeamMatches(data,'milan',{before:'2026-10-15'}).filter(m=>m.competition==='europa-league').length,1);
 for(const m of secondary){
  const row=data.teams[m.teamId].find(r=>r.id===m.id),side=row.venue==='Casa'?'home':'away';
  assert.deepEqual(row.stats,{...m.teamStats[side],expectedGoals:xg.find(e=>e.fixtureId===m.id).expectedGoals[side]});
 }
 const fixture=league.find(m=>m.homeTeam==='inter'&&m.matchday===11);
 const projected=read(`data/generated/readings/matches/${fixture.id}.json`).artifacts['data/generated/serie-a-team-history.json'];
 assert.deepEqual(projected.teams.inter,recentTeamMatches(data,'inter',{before:fixture.date}));
 const partial=projectHistory([{id:'inter',name:'Inter'}],[],{teamBranding:[{team:'Inter',slug:'inter'}],fixtures:[{id:'test',date:'2026-01-01',status:'finished',homeTeam:'Inter',awayTeam:'Other',score:{home:0,away:0}}]});
 assert.equal(partial.teams.inter[0].stats.shots,null);assert.equal(partial.teams.inter[0].goalsFor,0);
 const milanFixture=league.find(m=>[m.homeTeam,m.awayTeam].includes('milan')&&m.matchday===11);
 const milanProjection=read(`data/generated/readings/matches/${milanFixture.id}.json`);
 assert.deepEqual(milanProjection.artifacts['data/generated/serie-a-team-history.json'].teams.milan,recentTeamMatches(data,'milan',{before:milanFixture.date}));
 assert.equal(milanProjection.matches.filter(m=>m.competition==='europa-league').length,4);
 console.log('OK storico: Champions, 8 gare Europa League, 3 Conference, Milan MD11, ordine, prospettiva, cutoff, N/D e proiezione.');
})().catch(e=>{console.error(e);process.exitCode=1});
