'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const metrics=['shots','shotsOnTarget','corners','fouls','yellowCards','redCards','possessionPct','expectedGoals'];
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
function projectHistory(teams,league,champions){
 const canonical=new Set(teams.map(t=>t.id));
 // The verified branding slug is the canonical club ID; never resolve approximate names.
 const ids=new Map((champions.teamBranding||[]).filter(t=>canonical.has(t.slug)).map(t=>[t.team,t.slug]));
 const names=new Map(teams.map(t=>[t.id,t.name]));
 const result=Object.fromEntries(teams.map(t=>[t.id,[]]));
 for(const [competition,fixtures] of [['serie-a',league],['champions-league',champions.fixtures]]){
  const seen=new Set();
  for(const match of fixtures){
   if(match.status!=='finished'||!match.date||!match.score||numeric(match.score.home)===null||numeric(match.score.away)===null||seen.has(match.id))continue;
   if(competition==='serie-a'&&match.competition!=='serie-a')continue;
   seen.add(match.id);
   for(const [side,index] of [['home',0],['away',1]]){
    const team=match[side+'Team'],id=competition==='serie-a'?team:ids.get(team);
    if(!canonical.has(id))continue;
    const opposite=side==='home'?'away':'home',opponent=match[opposite+'Team'];
    const stats=Object.fromEntries(metrics.map(key=>[key,numeric(competition==='serie-a'?match.teamStats?.[side]?.[key]:match.matchReport?.statistics?.[key]?.[index])]));
    const forGoals=match.score[side],againstGoals=match.score[opposite];
    result[id].push({id:match.id,date:match.date,kickoff:match.kickoff||null,competition,competitionLabel:competition==='serie-a'?'Serie A':'Champions League',season:match.season||'2026-27',venue:side==='home'?'Casa':'Trasferta',opponent:competition==='serie-a'?names.get(opponent)||opponent:opponent,goalsFor:forGoals,goalsAgainst:againstGoals,result:forGoals>againstGoals?'V':forGoals<againstGoals?'S':'P',stats});
   }
  }
 }
 for(const rows of Object.values(result))rows.sort((a,b)=>b.date.localeCompare(a.date)||String(b.kickoff).localeCompare(String(a.kickoff))||a.id.localeCompare(b.id));
 return {schemaVersion:1,season:'2026-27',teams:result};
}
function build(){
 const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const data=projectHistory(read('data/normalized/teams.json'),read('data/normalized/matches.json'),read('data/normalized/champions-league-2026-27.json'));
 const file=path.join(root,'data/generated/serie-a-team-history.json'),text=JSON.stringify(data)+'\n';
 fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);
 return data;
}
module.exports={build,projectHistory};if(require.main===module)build();
