const fs=require('node:fs');
const path=require('node:path');
const {per90}=require('./model');
const numeric=value=>typeof value==='number'&&Number.isFinite(value);
function enrichGoalkeepers(root,data,playerIds=null){
  const matches=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'),'utf8')).filter(m=>m.competition==='serie-a'&&m.season==='2026-27'&&m.status==='finished');
  const teams=new Map();
  const squad=id=>{if(!teams.has(id))teams.set(id,JSON.parse(fs.readFileSync(path.join(root,`data/teams/${id}.json`),'utf8')).squad);return teams.get(id)};
  for(const [period,players] of Object.entries(data.comparator.periods))for(const player of players){
    if(player.role!=='Portiere'||playerIds&&!playerIds.includes(player.id))continue;
    const canonical=squad(player.currentTeamId).find(p=>p.id===player.id);
    const previousEntry=canonical?.previousSeason?.entries?.find(e=>e.competitionType==='domestic-league')||canonical?.previousSeason?.entries?.[0];
    const previous=previousEntry?.goalsConceded??null;
    const samples=[];
    for(const match of matches)for(const side of ['home','away']){
      if(match[side+'Team']!==player.currentTeamId)continue;
      const rows=match.playerStats?.[side]||[],row=rows.find(p=>p.playerId===player.id);
      if(!row)continue;
      const keepers=rows.filter(p=>squad(player.currentTeamId).some(s=>s.id===p.playerId&&(s.detailedRole||s.role)==='Portiere'));
      const score=match.score?.[side==='home'?'away':'home'];
      samples.push(numeric(row.goalsConceded)?row.goalsConceded:score===0&&row.minutes>0?0:row.minutes===90&&keepers.length===1&&numeric(score)?score:null);
    }
    const current=samples.length&&samples.every(numeric)?samples.reduce((a,b)=>a+b,0):null;
    const currentRow=data.comparator.periods['2026/27'].find(p=>p.id===player.id&&p.currentTeamId===player.currentTeamId);
    const complete=currentRow&&samples.length===currentRow.appearances?current:!currentRow&&samples.length===0?0:null;
    const value=period==='2025/26'?previous:period==='2026/27'?complete:numeric(previous)&&numeric(complete)?previous+complete:null;
    player.values.goalsConceded=value;
    player.per90.goalsConceded=per90(value,player.minutes);
  }
  return data;
}
module.exports={enrichGoalkeepers};
if(require.main===module){const root=path.resolve(__dirname,'../..'),file=path.join(root,'data/teams/player-leaderboards.json');const data=enrichGoalkeepers(root,JSON.parse(fs.readFileSync(file,'utf8')),process.argv.includes('--players')?process.argv[process.argv.indexOf('--players')+1].split(','):null);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log('Aggiornati soltanto i gol subiti dei portieri nella proiezione classifiche.');}
