import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {settleLeg} from '../js/pages/betting-settlement.mjs';
import {hasVerifiedPlayableQuote,sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
const require=createRequire(import.meta.url),{calculateStandings}=require('./standings');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const matches=read('data/normalized/matches.json'),teams=read('data/normalized/teams.json'),md7=matches.filter(m=>m.competition==='serie-a'&&m.matchday===7);
const baseline=read('output/md07-closure-20261020/baseline.json');
const expected={frosinone:[4,2],venezia:[1,0],bologna:[1,3],roma:[2,0],udinese:[0,3],fiorentina:[1,3],milan:[3,2],juventus:[0,3],monza:[4,0],parma:[0,3]};
assert.equal(md7.length,10);assert.equal(new Set(md7.flatMap(m=>[m.homeTeam,m.awayTeam])).size,20);
const missing=[],fixtureReport=[],teamReport=[],playerReport=[];
const catalog=read('data/normalized/schedina-md07.json'),leaderboard=read('data/teams/player-leaderboards.json').comparator.periods['2026/27'];
const requiredPlayer=['minutes','goals','assists','shots','shotsOnTarget','foulsCommitted','foulsWon','hitWoodwork','expectedGoals','rating'];
const requiredTeam=['shots','shotsOnTarget','possessionPct','corners','fouls','yellowCards','secondYellowCards','straightRedCards','expectedGoals'];
const counts=()=>({won:0,lost:0,void:0,unavailable:0,pending:0});const economics={...counts(),stake:0,grossReturn:0};const allForecasts=counts();
for(const m of md7){
 assert.equal(m.status,'finished');assert.deepEqual([m.score.home,m.score.away],expected[m.homeTeam]);
 const source=read('data/sources/match-results-2026-27.json').matches.find(r=>r.matchId===m.id);assert.deepEqual(source.score,m.score);
 const ids=[];
 for(const side of ['home','away']){
  const ps=m.playerStats[side],ts=m.teamStats[side],tid=m[side+'Team'];assert.equal(ps.filter(p=>p.starter).length,11);
  assert.equal(new Set(ps.map(p=>p.playerId)).size,ps.length);
  for(const p of ps){assert(p.playerId,`${m.id}: ${p.player}`);ids.push(p.playerId);assert(p.minutes>0&&p.minutes<=90);assert(p.shotsOnTarget<=p.shots);for(const f of requiredPlayer)if(p[f]==null)missing.push({matchId:m.id,scope:'player',subject:p.player,field:f});}
  for(const [pf,tf] of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls']])assert.equal(ps.reduce((s,p)=>s+p[pf],0),ts[tf]);
  assert.equal(ps.reduce((s,p)=>s+p.goals,0)+(m.scorers||[]).filter(g=>g.ownGoal&&g.team===tid).length,m.score[side]);
  for(const f of requiredTeam)if(ts[f]==null)missing.push({matchId:m.id,scope:'team',subject:side,field:f});
 }
 assert.equal(new Set(ids).size,ids.length);
 const quoted=catalog.marketCatalog.matches.find(x=>x.matchId===m.id).selections.filter(l=>hasVerifiedPlayableQuote(l)&&l.suggestionAnalysis?.suggested);
 const outcomes=quoted.map(leg=>({selectionId:leg.selectionId,label:leg.label,odds:leg.odds,...settleLeg(leg,m)}));
 const local=counts();for(const o of outcomes){local[o.status]++;economics[o.status]++;if(['won','lost','void'].includes(o.status)){assert(Number.isFinite(o.odds));economics.stake++;economics.grossReturn+=o.status==='won'?o.odds:o.status==='void'?1:0;}}
 for(const leg of sharedForecastsForMatch(catalog.marketCatalog,m.id))allForecasts[settleLeg(leg,m).status]++;
 fixtureReport.push({matchId:m.id,status:m.status,score:m.score,players:ids.length,quoted:local,outcomes});
}
const season=matches.filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.matchday<=7),standings=calculateStandings(teams,season);
const officialStandingsChecks=standings.map((row,index)=>{
 const html=fs.readFileSync(`tmp/lega-md07-${row.team}.html`,'utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 const found=html.match(/Posizione in classifica (\d+) Partite giocate (\d+) Partite vinte (\d+) Goal Totali (\d+)/);
 assert(found,`${row.team}: official club table absent`);
 assert.deepEqual(found.slice(1).map(Number),[index+1,row.played,row.won,row.goalsFor],`${row.team}: official club summary mismatch`);
 return {team:row.team,position:index+1,played:row.played,won:row.won,goalsFor:row.goalsFor,url:`https://www.legaseriea.it/team/${row.team}`};
});
assert.equal(season.length,70);assert.equal(standings.reduce((s,r)=>s+r.played,0),140);
assert.equal(standings.reduce((s,r)=>s+r.goalsFor-r.goalsAgainst,0),0);
const near=(a,b,label)=>assert(Math.abs(a-b)<0.011,`${label}: ${a} != ${b}`);
for(const team of teams){
 const tm=season.filter(m=>m.homeTeam===team.id||m.awayTeam===team.id),data=read(`data/teams/${team.id}.json`),stats=data.teamStats.seasons['2026/27'];
 const own=m=>m.teamStats[m.homeTeam===team.id?'home':'away'],opp=m=>m.teamStats[m.homeTeam===team.id?'away':'home'];
 const sum=(fn,f)=>tm.reduce((s,m)=>s+fn(m)[f],0);const standing=standings.find(r=>r.team===team.id);
 for(const f of ['played','won','drawn','lost','points','goalsFor','goalsAgainst'])assert.equal(stats.results[f],standing[f],`${team.id} ${f}`);
 for(const [actual,want,label] of [[stats.attack.shots,sum(own,'shots'),'shots'],[stats.attack.shotsOnTarget,sum(own,'shotsOnTarget'),'sot'],[stats.attack.corners,sum(own,'corners'),'corners'],[stats.defence.shotsConceded,sum(opp,'shots'),'shotsAgainst'],[stats.discipline.foulsCommitted,sum(own,'fouls'),'fouls'],[stats.discipline.foulsWon,sum(opp,'fouls'),'foulsWon'],[stats.attack.shotsPerGame,sum(own,'shots')/tm.length,'shots mean'],[stats.attack.expectedGoals,sum(own,'expectedGoals'),'xG']])near(actual,want,team.id+' '+label);
 assert.equal(stats.homeAway.home.played+stats.homeAway.away.played,7);
 const chronological=tm.toSorted((a,b)=>(a.date+a.kickoff).localeCompare(b.date+b.kickoff));
 teamReport.push({teamId:team.id,played:7,results:stats.results,lastFive:chronological.slice(-5).map(m=>({matchId:m.id,result:(m.homeTeam===team.id?m.score.home-m.score.away:m.score.away-m.score.home)>0?'W':m.score.home===m.score.away?'D':'L'})),cornersAgainst:sum(opp,'corners')});
 const byPlayer=new Map();for(const m of tm)for(const p of m.playerStats[m.homeTeam===team.id?'home':'away']){if(!byPlayer.has(p.playerId))byPlayer.set(p.playerId,[]);byPlayer.get(p.playerId).push(p);}
 for(const [id,rows] of byPlayer){const lp=leaderboard.find(p=>p.currentTeamId===team.id&&p.id===id);assert(lp,`${team.id}:${id} missing leaderboard`);assert.equal(lp.appearances,rows.length);assert.equal(lp.minutes,rows.reduce((s,p)=>s+p.minutes,0));for(const f of ['goals','assists','shots','shotsOnTarget','foulsCommitted','foulsWon']){const v=rows.reduce((s,p)=>s+p[f],0);assert.equal(lp.values[f],v,`${id} ${f}`);near(lp.per90[f],v/lp.minutes*90,id+' '+f+' /90');}playerReport.push({teamId:team.id,playerId:id,appearances:rows.length,starts:rows.filter(p=>p.starter).length,minutes:lp.minutes});}
}
for(const [file,original] of Object.entries(baseline.files).filter(([f])=>!f.endsWith('matches.json')&&!f.endsWith('official-lineups-2026-27.json')))assert.equal(fs.readFileSync(file,'utf8'),original,`Historical artifact changed: ${file}`);
const oldMatches=JSON.parse(baseline.files['data/normalized/matches.json']);
const withoutMetadata=m=>{const {playerIdentityAliases,sources,...rest}=m;return rest;};
for(const m of matches.filter(m=>m.matchday!==7))assert.deepEqual(withoutMetadata(m),withoutMetadata(oldMatches.find(x=>x.id===m.id)),`Foreign fixture changed: ${m.id}`);
economics.net=economics.grossReturn-economics.stake;economics.roiPct=economics.net/economics.stake*100;economics.successPct=economics.won/(economics.won+economics.lost)*100;
const report={date:'2026-10-20',fixtures:fixtureReport,teams:teamReport,players:playerReport,standings,officialStandingsChecks,economics,allPublishedForecasts:allForecasts,missing,checks:{fixtures:10,teams:20,seasonMatches:70,playerSeasonRows:playerReport.length,officialTeamSummaries:20,historicalContracts:'unchanged',nonMD7Results:'unchanged; alias/source metadata excluded'}};
fs.writeFileSync('output/md07-closure-20261020/audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks,economics,allForecasts,missingCount:missing.length,missingFields:[...new Set(missing.map(m=>m.field))]},null,2));
