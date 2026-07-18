const fs = require("fs"); const path = require("path"); const {calculateStandings} = require("./standings");
const dir = path.resolve(__dirname,"../data/normalized");
const read = name => JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const teams=read("teams.json"), matches=read("matches.json"), ids=new Set(teams.map(t=>t.id)), matchIds=new Set();
if (teams.length !== 10) throw new Error("La giornata demo deve avere 10 squadre.");
for(const m of matches){ if(matchIds.has(m.id)) throw new Error(`ID duplicato: ${m.id}`); matchIds.add(m.id); if(!ids.has(m.homeTeam)||!ids.has(m.awayTeam)) throw new Error(`Squadra sconosciuta: ${m.id}`); if(m.competition==="serie-a"&&!Number.isInteger(m.matchday)) throw new Error(`matchday mancante: ${m.id}`); if(m.competition==="coppa-italia"&&!m.stage) throw new Error(`stage mancante: ${m.id}`); if(m.status==="finished"&&!m.score) throw new Error(`score mancante: ${m.id}`); if(!m.source) throw new Error(`fonte mancante: ${m.id}`); }
const league=matches.filter(m=>m.competition==="serie-a"&&m.matchday===1); if(league.length!==5) throw new Error("La giornata demo deve contenere 5 partite per le 10 squadre demo.");
const table=calculateStandings(teams,matches); if(table[0].points!==3) throw new Error("Calcolo classifica non valido.");
console.log(`Validazione completata: ${teams.length} squadre demo, ${matches.length} partite, ${table.length} righe classifica.`);
