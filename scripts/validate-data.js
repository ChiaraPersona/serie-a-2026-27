const fs=require("fs"), path=require("path");
const dir=path.resolve(__dirname,"../data/normalized"), root=path.resolve(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const teams=read("teams.json"), matches=read("matches.json"), previousStandings=read("standings-2025-26.json"), teamIds=new Set(teams.map(t=>t.id));
function assert(condition,message){if(!condition)throw new Error(message)}

assert(teams.length===20,`Squadre: ${teams.length}, attese 20`);
assert(new Set(teams.map(t=>t.id)).size===20,"ID squadra duplicati");
for(const team of teams){
  assert(team.logoSource?.sourceUrl&&team.logoSource?.sourceType&&team.logoSource?.retrievedAt&&team.logoSource?.licenseNote,`Metadati logo incompleti: ${team.id}`);
  assert(fs.existsSync(path.join(root,team.logo)),`Logo locale mancante: ${team.id}`);
}
const league=matches.filter(m=>m.competition==="serie-a"&&m.season==="2026-27");
assert(league.length===380,`Partite: ${league.length}, attese 380`);
assert(new Set(league.map(m=>m.id)).size===380,"ID partita duplicati");
for(let day=1;day<=38;day++)assert(league.filter(m=>m.matchday===day).length===10,`Giornata ${day}: numero partite diverso da 10`);

const counters=new Map(teams.map(t=>[t.id,{total:0,home:0,away:0,opponents:new Map()}]));
for(const match of league){
  assert(teamIds.has(match.homeTeam)&&teamIds.has(match.awayTeam),`Squadra sconosciuta: ${match.id}`);
  assert(match.homeTeam!==match.awayTeam,`Autopartita: ${match.id}`);
  assert(match.matchdayDate&&["confirmed","provisional","tbd"].includes(match.dateStatus),`Data giornata/stato non valido: ${match.id}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(match.matchdayDate)&&(!match.date||/^\d{4}-\d{2}-\d{2}$/.test(match.date)),`Formato data non valido: ${match.id}`);
  assert(match.timezone==="Europe/Rome"&&Array.isArray(match.sources)&&match.sources.length,`Timezone/fonti mancanti: ${match.id}`);
  if(match.dateStatus==="confirmed")assert(match.date&&match.kickoff,`Data confermata incompleta: ${match.id}`);
  if(match.matchday>5)assert(match.date===null&&match.kickoff===null&&match.dateStatus==="tbd",`Data inventata oltre la quinta giornata: ${match.id}`);
  const home=counters.get(match.homeTeam),away=counters.get(match.awayTeam);home.total++;home.home++;away.total++;away.away++;
  home.opponents.set(match.awayTeam,(home.opponents.get(match.awayTeam)||0)+1);away.opponents.set(match.homeTeam,(away.opponents.get(match.homeTeam)||0)+1);
}
for(const [id,c] of counters){
  assert(c.total===38&&c.home===19&&c.away===19,`${id}: ${c.total} gare, ${c.home} casa, ${c.away} trasferta`);
  assert(c.opponents.size===19&&[...c.opponents.values()].every(v=>v===2),`${id}: doppio confronto non valido`);
}
for(let a=0;a<teams.length;a++)for(let b=a+1;b<teams.length;b++){
  const x=teams[a].id,y=teams[b].id,pair=league.filter(m=>(m.homeTeam===x&&m.awayTeam===y)||(m.homeTeam===y&&m.awayTeam===x));
  assert(pair.length===2&&pair.some(m=>m.homeTeam===x)&&pair.some(m=>m.homeTeam===y),`Casa/trasferta non invertite: ${x}-${y}`);
}
const firstFive=league.filter(m=>m.matchday<=5), provisional=firstFive.filter(m=>m.dateStatus==="provisional");
assert(firstFive.length===50,"Prime cinque giornate incomplete");
assert(firstFive.every(m=>m.dateStatus!=="tbd"),"Programmazione mancante nelle prime cinque giornate");
assert(provisional.length===5,`Gare provvisorie: ${provisional.length}, attese 5`);
assert(league.every(m=>!m.isDemo)&&teams.every(t=>!t.isDemo),"Dati demo ancora presenti");
assert(previousStandings.season==="2025-26"&&previousStandings.status==="final","Metadati classifica 2025/26 non validi");
assert(previousStandings.historicalTeams.length===3,"Classifica 2025/26: attesi 3 loghi per squadre non presenti nel 2026/27");
for(const team of previousStandings.historicalTeams){assert(fs.existsSync(path.join(root,team.logo)),`Logo storico locale mancante: ${team.id}`);assert(team.logoSource?.sourceUrl&&team.logoSource?.sourceType==="official-club",`Fonte logo storico non valida: ${team.id}`)}
assert(previousStandings.rows.length===20,"Classifica 2025/26: attese 20 squadre");
assert(new Set(previousStandings.rows.map(r=>r.position)).size===20,"Classifica 2025/26: posizioni duplicate");
for(const row of previousStandings.rows){
  assert(row.played===38&&row.won+row.drawn+row.lost===38,`Classifica 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Classifica 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Classifica 2025/26: punti incoerenti per ${row.teamName}`);
}
assert(previousStandings.homeRows.length===20,"Rendimento casa 2025/26: attese 20 squadre");
assert(new Set(previousStandings.homeRows.map(r=>r.position)).size===20,"Rendimento casa 2025/26: posizioni duplicate");
for(const row of previousStandings.homeRows){
  assert(row.played===19&&row.won+row.drawn+row.lost===19,`Rendimento casa 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Rendimento casa 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Rendimento casa 2025/26: punti incoerenti per ${row.teamName}`);
}
assert(previousStandings.awayRows.length===20,"Rendimento trasferta 2025/26: attese 20 squadre");
assert(new Set(previousStandings.awayRows.map(r=>r.position)).size===20,"Rendimento trasferta 2025/26: posizioni duplicate");
for(const row of previousStandings.awayRows){
  assert(row.played===19&&row.won+row.drawn+row.lost===19,`Rendimento trasferta 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Rendimento trasferta 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Rendimento trasferta 2025/26: punti incoerenti per ${row.teamName}`);
}
for(const total of previousStandings.rows){
  const home=previousStandings.homeRows.find(r=>r.team===total.team),away=previousStandings.awayRows.find(r=>r.team===total.team);
  assert(home&&away,`Rendimento casa/trasferta mancante per ${total.teamName}`);
  for(const field of ["played","won","drawn","lost","goalsFor","goalsAgainst","goalDifference","points"])
    assert(home[field]+away[field]===total[field],`Totale casa+trasferta incoerente per ${total.teamName}: ${field}`);
}
const summary=previousStandings.summary;
assert(summary.teams===20&&summary.matches===380,"Riepilogo 2025/26: squadre o partite non validi");
assert(summary.goals===previousStandings.rows.reduce((sum,r)=>sum+r.goalsFor,0),"Riepilogo 2025/26: gol totali incoerenti");
assert(summary.homeGoals===previousStandings.homeRows.reduce((sum,r)=>sum+r.goalsFor,0),"Riepilogo 2025/26: gol in casa incoerenti");
assert(summary.awayGoals===previousStandings.awayRows.reduce((sum,r)=>sum+r.goalsFor,0),"Riepilogo 2025/26: gol in trasferta incoerenti");
assert(summary.goals===summary.homeGoals+summary.awayGoals,"Riepilogo 2025/26: ripartizione gol incoerente");
assert(summary.draws===previousStandings.rows.reduce((sum,r)=>sum+r.drawn,0)/2,"Riepilogo 2025/26: pareggi incoerenti");
assert(summary.homeWins===previousStandings.homeRows.reduce((sum,r)=>sum+r.won,0)&&summary.awayWins===previousStandings.awayRows.reduce((sum,r)=>sum+r.won,0),"Riepilogo 2025/26: vittorie casa/trasferta incoerenti");
assert(summary.decisiveMatches===summary.homeWins+summary.awayWins&&summary.matches===summary.draws+summary.decisiveMatches,"Riepilogo 2025/26: esiti incoerenti");
assert(Math.abs(summary.goalsPerMatch-summary.goals/summary.matches)<0.01&&Math.abs(summary.homeGoalsPerMatch-summary.homeGoals/summary.matches)<0.01&&Math.abs(summary.awayGoalsPerMatch-summary.awayGoals/summary.matches)<0.01,"Riepilogo 2025/26: medie gol incoerenti");
assert(summary.champion.team===previousStandings.rows[0].team&&summary.champion.points===previousStandings.rows[0].points,"Riepilogo 2025/26: campione incoerente");
const verdicts=summary.verdicts,positions=previousStandings.rows.map(r=>r.team);
assert(verdicts.champion.length===1&&verdicts.champion[0]===positions[0],"Verdetti 2025/26: campione incoerente");
assert(JSON.stringify(verdicts.championsLeague)===JSON.stringify(positions.slice(0,4)),"Verdetti 2025/26: qualificate Champions incoerenti");
assert(JSON.stringify(verdicts.europaLeague)===JSON.stringify(positions.slice(4,6)),"Verdetti 2025/26: qualificate Europa League incoerenti");
assert(JSON.stringify(verdicts.conferenceLeague)===JSON.stringify(positions.slice(6,7)),"Verdetti 2025/26: qualificata Conference incoerente");
assert(JSON.stringify(verdicts.relegated)===JSON.stringify(positions.slice(17,20)),"Verdetti 2025/26: retrocesse incoerenti");
assert(verdicts.promoted.length===3&&verdicts.promoted.every(id=>teamIds.has(id)&&!positions.includes(id)),"Verdetti 2025/26: promosse incoerenti con le 20 squadre 2026/27");
console.log("OK 20 squadre ufficiali e 20 loghi locali");
console.log("OK 38 giornate x 10 partite = 380");
console.log("OK ogni squadra: 38 gare, 19 casa, 19 trasferta");
console.log("OK 190 coppie: doppio confronto con casa/trasferta invertite");
console.log(`OK prime 5 giornate: 50 programmazioni (${50-provisional.length} confermate, ${provisional.length} provvisorie)`);
console.log("OK nessuna data o orario assegnati oltre la quinta giornata");
console.log("OK classifica finale 2025/26: 20 squadre e valori coerenti");
console.log("OK rendimento casa 2025/26: 20 squadre e valori coerenti");
console.log("OK rendimento trasferta 2025/26 e riconciliazione con classifica finale");
console.log("OK riepilogo statistico 2025/26 riconciliato con classifiche generale/casa/trasferta");
console.log("OK verdetti 2025/26 e promosse 2026/27 coerenti con le classifiche");
