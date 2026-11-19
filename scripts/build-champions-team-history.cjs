'use strict';
// Presentation projection; never changes forecasts or canonical statistics.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const numeric=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
function projectHistory(source,calendar){
 const teams=Object.fromEntries(source.teams.map(t=>[t.id,[]]));
 const byProvider=new Map(source.teams.map(t=>[String(t.espnTeamId),t]));
 const byName=new Map(source.teams.map(t=>[t.name,t]));
 const stats=s=>Object.fromEntries(Object.entries({shots:'totalShots',shotsOnTarget:'shotsOnTarget',corners:'wonCorners',fouls:'foulsCommitted',yellowCards:'yellowCards',redCards:'redCards',expectedGoals:'expectedGoals'}).map(([key,input])=>[key,numeric(s?.[input])]));
 function add(team,row){if(team)teams[team.id].push(row);}
 for(const m of source.matches){
  if(!m.date||numeric(m.home.score)===null||numeric(m.away.score)===null)continue;
  for(const side of ['home','away']){
   const own=m[side],other=m[side==='home'?'away':'home'],team=byProvider.get(String(own.providerTeamId));
   add(team,{id:`${m.league}:${m.eventId}`,date:m.date,competition:m.league==='uefa.champions'?'champions-league':m.league,competitionLabel:m.league==='uefa.champions'?'Champions League':team?.leagueName||m.league,season:m.season,venue:side==='home'?'Casa':'Trasferta',opponent:other.name,goalsFor:own.score,goalsAgainst:other.score,stats:stats(own.statistics),statsAgainst:stats(other.statistics)});
  }
 }
 for(const m of calendar.fixtures){
  if(m.status!=='finished'||!m.date||numeric(m.score?.home)===null||numeric(m.score?.away)===null)continue;
  for(const [i,side]of ['home','away'].entries()){
   const team=byName.get(m[side+'Team']),other=i?'home':'away',report=m.matchReport;
   const observed=which=>{const index=which==='home'?0:1,result=stats(report?.observedTeamStatistics?.[which]);for(const key of Object.keys(result))result[key]??=numeric(report?.statistics?.[key]?.[index]);return result;};
   if(team)teams[team.id]=teams[team.id].filter(r=>!(r.date.slice(0,10)===m.date.slice(0,10)&&r.competition==='champions-league'));
   add(team,{id:m.id,date:m.date,competition:'champions-league',competitionLabel:'Champions League',season:m.season||'2026-27',venue:i?'Trasferta':'Casa',opponent:m[other+'Team'],goalsFor:m.score[side],goalsAgainst:m.score[other],stats:observed(side),statsAgainst:observed(other)});
  }
 }
 for(const rows of Object.values(teams)){rows.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));for(const row of rows)row.result=row.goalsFor>row.goalsAgainst?'V':row.goalsFor<row.goalsAgainst?'S':'P';}
 return {schemaVersion:1,teams};
}
function applySupplement(data,supplement){
 let filled=0;
 for(const entry of supplement.entries){const row=data.teams[entry.teamId]?.find(r=>r.id===entry.fixtureId&&r.date===entry.date);if(!row)continue;
  for(const side of ['stats','statsAgainst'])for(const [key,value]of Object.entries(entry[side]))if(row[side][key]===null&&numeric(value)!==null){row[side][key]=value;filled++;}
 }
 return filled;
}
function build(){const data=projectHistory(read('data/sources/champions-pilot-match-stats-2025-27.json'),read('data/normalized/champions-league-2026-27.json'));const supplement='data/sources/champions-team-history-supplement.json';if(fs.existsSync(path.join(root,supplement)))applySupplement(data,read(supplement));const file=path.join(root,'data/generated/champions-team-history.json'),text=JSON.stringify(data)+'\n';if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);return data;}
module.exports={build,projectHistory,applySupplement};if(require.main===module)build();
