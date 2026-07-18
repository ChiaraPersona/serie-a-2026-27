const fs=require("fs"), path=require("path");
const dir=path.resolve(__dirname,"../data/normalized"), root=path.resolve(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const teams=read("teams.json"), matches=read("matches.json"), teamIds=new Set(teams.map(t=>t.id));
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
console.log("OK 20 squadre ufficiali e 20 loghi locali");
console.log("OK 38 giornate x 10 partite = 380");
console.log("OK ogni squadra: 38 gare, 19 casa, 19 trasferta");
console.log("OK 190 coppie: doppio confronto con casa/trasferta invertite");
console.log(`OK prime 5 giornate: 50 programmazioni (${50-provisional.length} confermate, ${provisional.length} provvisorie)`);
console.log("OK nessuna data o orario assegnati oltre la quinta giornata");
