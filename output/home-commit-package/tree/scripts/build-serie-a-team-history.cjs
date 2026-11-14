'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const metrics=['shots','shotsOnTarget','corners','fouls','yellowCards','redCards','possessionPct','expectedGoals'];
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const competitionLabels={'serie-a':'Serie A','champions-league':'Champions League','europa-league':'Europa League','conference-league':'Conference League'};
function loadEuropeanResults(){
 const file=path.join(root,'data/normalized/european-recent-results-2026-27.json');
 return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).fixtures:[];
}
function europeanFixtures(teams,champions,secondary=[]){
 const canonical=new Set(teams.map(t=>t.id));
 const ids=new Map((champions.teamBranding||[]).map(t=>[t.team,t.slug]));
 const fixtures=(champions.fixtures||[]).filter(m=>m.status==='finished'&&m.date&&m.score&&[m.homeTeam,m.awayTeam].some(t=>canonical.has(ids.get(t)))).map(m=>({
  id:m.id,competition:'champions-league',competitionLabel:'Champions League',season:m.season,date:m.date,kickoff:m.kickoff,status:m.status,score:m.score,
  homeTeam:ids.get(m.homeTeam)||m.homeTeam,awayTeam:ids.get(m.awayTeam)||m.awayTeam,
  teamNames:{[ids.get(m.homeTeam)||m.homeTeam]:m.homeTeam,[ids.get(m.awayTeam)||m.awayTeam]:m.awayTeam},
  teamStats:Object.fromEntries(['home','away'].map((side,i)=>[side,Object.fromEntries(metrics.map(k=>[k,numeric(m.matchReport?.statistics?.[k]?.[i])]))]))
 }));
 for(const m of secondary){
  if(!canonical.has(m.teamId)||m.status!=='finished'||!m.date||!m.score||!Object.values(m.score).every(v=>numeric(v)!==null)||!['europa-league','conference-league'].includes(m.competition))continue;
  const own=['home','away'].filter(side=>m[side+'Team'].toLowerCase()===m.teamId);
  if(own.length!==1)throw Error('European canonical identity conflict: '+m.id);
  const home=own[0]==='home'?m.teamId:m.homeTeam,away=own[0]==='away'?m.teamId:m.awayTeam;
  fixtures.push({id:m.id,competition:m.competition,competitionLabel:competitionLabels[m.competition],season:m.season,date:m.date,kickoff:m.kickoff,status:m.status,score:m.score,homeTeam:home,awayTeam:away,teamNames:{[home]:m.homeTeam,[away]:m.awayTeam},teamStats:m.teamStats||{}});
 }
 return fixtures;
}
function projectHistory(teams,league,champions,secondary=[],xg=[]){
 const canonical=new Set(teams.map(t=>t.id));
 const names=new Map(teams.map(t=>[t.id,t.name]));
 const result=Object.fromEntries(teams.map(t=>[t.id,[]]));
 for(const [group,fixtures] of [['serie-a',league],['europe',europeanFixtures(teams,champions,secondary)]]){
  const seen=new Set();
  for(const match of fixtures){
   if(match.status!=='finished'||!match.date||!match.score||numeric(match.score.home)===null||numeric(match.score.away)===null||seen.has(match.id))continue;
   if(group==='serie-a'&&match.competition!=='serie-a')continue;
   const competition=match.competition;
   seen.add(match.id);
   for(const side of ['home','away']){
    const team=match[side+'Team'],id=team;
    if(!canonical.has(id))continue;
    const opposite=side==='home'?'away':'home',opponent=match[opposite+'Team'];
    const stats=Object.fromEntries(metrics.map(key=>[key,numeric(match.teamStats?.[side]?.[key])]));
    if(stats.expectedGoals===null)stats.expectedGoals=numeric(xg.find(e=>e.fixtureId===match.id)?.expectedGoals?.[side]);
    const forGoals=match.score[side],againstGoals=match.score[opposite];
    result[id].push({id:match.id,date:match.date,kickoff:match.kickoff||null,competition,competitionLabel:competitionLabels[competition],season:match.season||'2026-27',venue:side==='home'?'Casa':'Trasferta',opponent:match.teamNames?.[opponent]||names.get(opponent)||opponent,goalsFor:forGoals,goalsAgainst:againstGoals,result:forGoals>againstGoals?'V':forGoals<againstGoals?'S':'P',stats});
   }
  }
 }
 for(const rows of Object.values(result))rows.sort((a,b)=>b.date.localeCompare(a.date)||String(b.kickoff).localeCompare(String(a.kickoff))||a.id.localeCompare(b.id));
 return {schemaVersion:1,season:'2026-27',teams:result};
}
function build(){
 const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const xgFile='data/normalized/european-history-xg-2026-27.json';
 const data=projectHistory(read('data/normalized/teams.json'),read('data/normalized/matches.json'),read('data/normalized/champions-league-2026-27.json'),loadEuropeanResults(),fs.existsSync(path.join(root,xgFile))?read(xgFile).entries:[]);
 const file=path.join(root,'data/generated/serie-a-team-history.json'),text=JSON.stringify(data)+'\n';
 fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);
 return data;
}
module.exports={build,projectHistory,europeanFixtures,loadEuropeanResults};if(require.main===module)build();
