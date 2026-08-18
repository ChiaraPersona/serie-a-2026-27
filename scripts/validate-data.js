const fs=require("fs"), path=require("path");
const dir=path.resolve(__dirname,"../data/normalized"), root=path.resolve(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const teams=read("teams.json"), matches=read("matches.json"), readings=read("readings.json"), predictions=read("predictions.json"), referees=read("referees.json"), refereeHistory=read("referee-stats-2025-26.json"), previousStandings=read("standings-2025-26.json"), teamStyleProfiles=read("team-style-profiles.json"), objectives=JSON.parse(fs.readFileSync(path.join(root,"data/team-objectives.json"),"utf8")), teamIds=new Set(teams.map(t=>t.id));
const {calculateObjectiveMetrics}=require("./objective-metrics.js");
const fantasy=JSON.parse(fs.readFileSync(path.join(root,"data/generated/fantacalcio-advice.json"),"utf8"));
const fantasyWorkbook=JSON.parse(fs.readFileSync(path.join(root,"data/sources/fantacalcio-stats-2025-26.json"),"utf8"));
const marketValues=JSON.parse(fs.readFileSync(path.join(root,"data/sources/team-pages/transfermarkt-market-values-2026-27.json"),"utf8"));
const cup=JSON.parse(fs.readFileSync(path.join(dir,"coppa-italia-2026-27.json"),"utf8"));
const teamColorSource=JSON.parse(fs.readFileSync(path.join(root,"data/sources/team-pages/footylogos-club-colors.json"),"utf8"));
function assert(condition,message){if(!condition)throw new Error(message)}

assert(teams.length===20,`Squadre: ${teams.length}, attese 20`);
assert(teamColorSource.provider==="FootyLogos","Provider colori club non valido");
assert(teamColorSource.competitionUrl==="https://www.footylogos.com/team-color-codes/serie-a","URL raccolta colori club non valido");
assert(Object.keys(teamColorSource.teams).length===20,"La fonte colori deve coprire 20 squadre");
assert(fantasy.season==="2026-27"&&fantasy.players.length>100,"Dataset fantacalcio non valido");
assert(marketValues.provider==="Transfermarkt"&&marketValues.players.length>=500,"Copertura valori di mercato insufficiente");
assert(marketValues.players.every(player=>player.marketValueEur>0&&player.transfermarktId&&player.profileUrl),"Valore di mercato privo di importo, ID o fonte");
assert(fantasy.players.filter(player=>player.marketValueEur!==null).length>=400,"Valori di mercato non integrati nel Fantacalcio");
assert(fantasy.players.every(player=>["P","D","C","A"].includes(player.role)&&Number.isInteger(player.stars)&&player.stars>=1&&player.stars<=5&&player.value500>=1),"Ruoli, stelle o valori fantacalcio non validi");
assert([1,2,3,4,5].every(stars=>fantasy.players.some(player=>player.stars===stars)),"Distribuzione stelle fantacalcio incompleta");
assert(fantasy.players.every(player=>player.competitionProfile&&player.competitionProfile.coefficient>=.72&&player.competitionProfile.coefficient<=1),"Coefficiente Serie A/Serie B non valido");
assert(!fantasy.players.some(player=>player.competitionProfile.serieAShare<=20&&player.stars===5),"Un profilo quasi esclusivamente di Serie B ha ricevuto 5 stelle");
assert(fantasy.methodology.scoringRules.goal===3&&fantasy.methodology.scoringRules.assist===1&&fantasy.methodology.scoringRules.yellowCard===-.5&&fantasy.methodology.scoringRules.redCard===-1&&fantasy.methodology.scoringRules.penaltyMissed===-3&&fantasy.methodology.scoringRules.penaltySaved===3&&fantasy.methodology.scoringRules.ownGoal===-3&&fantasy.methodology.scoringRules.didNotPlay==="SV","Regole punteggio fantacalcio non valide");
assert(fantasyWorkbook.players.length===663&&fantasyWorkbook.coverage.matchedCurrentPlayers>=400,"Importazione foglio Fantacalcio incompleta");
assert(fantasy.sources.fantasyStatistics.matchedPlayers===fantasyWorkbook.coverage.matchedCurrentPlayers,"Fonte Fantacalcio non collegata alla metodologia");
assert(fantasy.players.filter(player=>player.fantasyScoring.averageRating!==null).length>=Math.floor(fantasy.players.length*.7),"PV, MV e FM integrati in meno del 70% dei profili");
assert(fantasy.players.every(player=>player.fantasyScoring&&player.fantasyScoring.unavailableTreatment==="SV: escluso dalla media"),"Gestione SV fantacalcio non valida");
assert(fantasy.goalkeeperHierarchy.como.primaryIds[0]==="jean-butez"&&fantasy.players.find(player=>player.id==="jean-butez")?.goalkeeperStatus==="Titolare confermato","Gerarchia portieri Como non valida");
assert(Object.keys(fantasy.goalkeeperHierarchy).length===20&&fantasy.sources.goalkeeperHierarchy.provider==="SOS Fanta","Fonte gerarchie portieri non valida");
assert(fantasy.goalkeeperTrios.examples.every(trio=>trio.players.every(player=>fantasy.goalkeeperHierarchy[player.teamId]?.trioEligible&&fantasy.goalkeeperHierarchy[player.teamId].primaryIds[0]===player.id)),"Un tris usa un portiere senza gerarchia chiara");
assert(!fantasy.goalkeeperTrios.examples.some(trio=>trio.players.some(player=>player.teamId==="como"&&player.id!=="jean-butez")),"Un tris usa un portiere del Como diverso da Butez");
assert(fantasy.calendarWindow===38&&fantasy.teams.every(team=>team.calendar.fixtures.length===38),"Calendario formazione fantacalcio incompleto");
assert(fantasy.sources.historicalTable.provider==="Transfermarkt"&&fantasy.sources.historicalTable.url,"Fonte classifica perpetua mancante");
const fantasyComo=fantasy.teams.find(team=>team.id==="como"),fantasyFiorentina=fantasy.teams.find(team=>team.id==="fiorentina");
assert(fantasyComo.strength.recent>fantasyFiorentina.strength.recent&&fantasyComo.strength.combined>fantasyFiorentina.strength.combined,"Rendimento recente Como/Fiorentina sovrascritto dalla storia");
assert(new Set(teams.map(t=>t.id)).size===20,"ID squadra duplicati");
assert(objectives.schemaVersion===1&&objectives.season==="2026-27"&&objectives.teams.length===20,"Dataset obiettivi non valido");
assert(new Set(objectives.teams.map(team=>team.teamId)).size===20,"Profili obiettivo duplicati");
for(const profile of objectives.teams){
  assert(profile.idealPosition<=profile.targetPosition&&profile.targetPosition<=profile.minimumAcceptable,`Gerarchia posizioni non valida: ${profile.teamId}`);
  for(const field of ["ambition","pressure","expectation","boardPatience","motivationStart"])assert(Number.isInteger(profile[field])&&profile[field]>=0&&profile[field]<=100,`${field} non valido: ${profile.teamId}`);
  const initial=calculateObjectiveMetrics(profile,{played:0,position:profile.targetPosition,points:0},0);
  assert(initial.objectiveProgress===0&&initial.seasonOverperformance===0&&initial.motivationCurrent===profile.motivationStart&&initial.pressureCurrent===profile.pressure,`Metriche iniziali non coerenti: ${profile.teamId}`);
}
assert(objectives.teams.every(profile=>teamIds.has(profile.teamId)),"Copertura obiettivi corrente diversa da 20/20");
assert(teamStyleProfiles.schemaVersion===1&&teamStyleProfiles.season==="2025-26"&&teamStyleProfiles.targetSeason==="2026-27","Metadati profili tattici non validi");
assert(teamStyleProfiles.provider?.name==="WhoScored"&&teamStyleProfiles.profiles.length===20,"Provider o copertura profili tattici non validi");
assert(new Set(teamStyleProfiles.profiles.map(profile=>profile.teamId)).size===20,"Profili tattici duplicati");
assert(teamStyleProfiles.profiles.every(profile=>teamIds.has(profile.teamId)),"Profili tattici fuori dalle 20 squadre correnti");
assert(teamStyleProfiles.coverage.complete===17&&teamStyleProfiles.coverage.statisticalOnly===2&&teamStyleProfiles.coverage.limitedSample===1,"Riepilogo copertura profili tattici inatteso");
for(const profile of teamStyleProfiles.profiles){
  assert(profile.source?.provider==="WhoScored"&&profile.source.url&&profile.source.statisticsUrl,`Fonti tattiche incomplete: ${profile.teamId}`);
  assert(["Serie A","Serie B"].includes(profile.competition)&&profile.summary.appearances>0,`Campione tattico non valido: ${profile.teamId}`);
  assert(profile.modelInputs?.numeric&&profile.modelInputs?.categorical,`Input modello mancanti: ${profile.teamId}`);
  if(profile.coverage.goalTypes)assert(profile.goalTypes.reduce((sum,item)=>sum+item.goals,0)===profile.summary.goals,`Tipi di gol incoerenti: ${profile.teamId}`);
  if(profile.coverage.formation)assert(profile.formation.wins+profile.formation.draws+profile.formation.losses===profile.formation.appearances,`Esiti modulo incoerenti: ${profile.teamId}`);
  if(profile.competition==="Serie B")assert(profile.notes.some(note=>note.includes("non confrontare direttamente")),`Avvertenza Serie B mancante: ${profile.teamId}`);
}
assert(referees.length===42,`Arbitri CAN: ${referees.length}, attesi 42`);
assert(new Set(referees.map(r=>r.id)).size===42&&new Set(referees.map(r=>r.slug)).size===42,"ID o slug arbitro duplicati");
const refereeStats=["serieAAppearances","serieBAppearances","yellowCards","secondYellowCards","straightRedCards","penalties","fouls","yellowCardsPerMatch","redCardsPerMatch","penaltiesPerMatch","homeWins","draws","awayWins","varInterventions"];
for(const referee of referees){
  assert(referee.name&&referee.section&&referee.season==="2026-27"&&referee.role==="arbitro CAN"&&referee.status==="active",`Anagrafica arbitro incompleta: ${referee.id}`);
  assert(referee.promotedFrom===null&&referee.isNew===null,`Promozione non verificata valorizzata: ${referee.id}`);
  assert(refereeStats.every(field=>referee[field]===null),`Statistica non verificata valorizzata: ${referee.id}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(referee.lastUpdated)&&Array.isArray(referee.sources)&&referee.sources.length,`Aggiornamento/fonti arbitro mancanti: ${referee.id}`);
}
assert(refereeHistory.season==="2025-26"&&refereeHistory.minimumSampleForRanking===5,"Metadati storico arbitri non validi");
assert(refereeHistory.referees.length===42,"Storico arbitri 2025/26: attese 42 righe");
const refereeIds=new Set(referees.map(r=>r.id));
for(const row of refereeHistory.referees){
  assert(refereeIds.has(row.refereeId),`Arbitro storico fuori organico 2026/27: ${row.refereeId}`);
  for(const competition of ["serieA","serieB"]){const stats=row[competition];assert(Number.isInteger(stats.matches)&&stats.matches>=0,`Presenze non valide: ${row.refereeId} ${competition}`);assert(["yellowCardsPerMatch","redCardsPerMatch"].every(field=>Number.isFinite(stats[field])&&stats[field]>=0),`Medie non valide: ${row.refereeId} ${competition}`)}
  assert(row.serieA.yellowCards>=0&&row.serieA.redCards>=0&&Number.isFinite(row.serieB.foulsPerMatch),`Statistiche storiche incomplete: ${row.refereeId}`);
}
for(const team of teams){
  assert(team.logoSource?.sourceUrl&&team.logoSource?.sourceType&&team.logoSource?.retrievedAt&&team.logoSource?.licenseNote,`Metadati logo incompleti: ${team.id}`);
  assert(fs.existsSync(path.join(root,team.logo)),`Logo locale mancante: ${team.id}`);
  assert(Array.isArray(team.colors)&&team.colors.length===2&&team.colors.every(color=>/^#[0-9a-f]{6}$/i.test(color)),`Coppia colori non valida: ${team.id}`);
  const colorEntry=teamColorSource.teams[team.id];
  assert(colorEntry&&colorEntry.sourceUrl&&["color-code-page","current-logo-svg"].includes(colorEntry.sourceType),`Fonte colori non valida: ${team.id}`);
  assert(Array.isArray(colorEntry.palette)&&colorEntry.palette.length>=1&&colorEntry.palette.every(color=>/^#[0-9a-f]{6}$/i.test(color)),`Palette FootyLogos non valida: ${team.id}`);
  assert(Array.isArray(colorEntry.displayColors)&&colorEntry.displayColors.length===2&&colorEntry.displayColors.every(color=>colorEntry.palette.includes(color)),`Colori visuali fuori palette: ${team.id}`);
  assert(JSON.stringify(team.colors)===JSON.stringify(colorEntry.displayColors),`Colori non sincronizzati con FootyLogos: ${team.id}`);
}
const league=matches.filter(m=>m.competition==="serie-a"&&m.season==="2026-27");
assert(league.length===380,`Partite: ${league.length}, attese 380`);
assert(new Set(league.map(m=>m.id)).size===380,"ID partita duplicati");
const readingModules=["context","form","availability","tactics","referee","market","synthesis"],matchIds=new Set(matches.map(match=>match.id));
assert(new Set(readings.map(reading=>reading.id)).size===readings.length,"ID lettura duplicati");
assert(new Set(readings.map(reading=>reading.matchId)).size===readings.length,"Piu letture collegate alla stessa partita");
for(const reading of readings){
  assert(matchIds.has(reading.matchId),`Partita lettura non trovata: ${reading.matchId}`);
  assert(["draft","published","archived"].includes(reading.status),`Stato lettura non valido: ${reading.id}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(reading.updatedAt),`Data lettura non valida: ${reading.id}`);
  assert(reading.sections&&readingModules.every(moduleId=>reading.sections[moduleId]),`Sette sezioni lettura incomplete: ${reading.id}`);
  assert(reading.prototype===undefined||typeof reading.prototype==="boolean",`Flag prototipo non valido: ${reading.id}`);
  for(const moduleId of readingModules){const section=reading.sections[moduleId];assert(section.content===null||typeof section.content==="string",`Contenuto lettura non valido: ${reading.id}/${moduleId}`);assert(Array.isArray(section.signals)&&Array.isArray(section.sources),`Segnali o fonti lettura non validi: ${reading.id}/${moduleId}`)}
}
const prototypeReadings=readings.filter(reading=>reading.prototype),firstMatchdayIds=new Set(league.filter(match=>match.matchday===1).map(match=>match.id));
assert(prototypeReadings.length===10&&prototypeReadings.every(reading=>firstMatchdayIds.has(reading.matchId)),"Il prototipo Letture deve coprire le 10 gare della prima giornata");
const atalantaSassuoloReading=readings.find(reading=>reading.matchId==="atalanta-sassuolo-2026-27-md-01");
assert(["context","form","tactics"].every(moduleId=>atalantaSassuoloReading?.sections[moduleId].content),"La lettura pilota Atalanta-Sassuolo deve avere contesto, storico e base tattica");
assert(atalantaSassuoloReading.sections.availability.content&&atalantaSassuoloReading.sections.availability.sources.length,"La lettura pilota deve includere il monitor indisponibili aggiornato");
assert(atalantaSassuoloReading.sections.market.content&&atalantaSassuoloReading.sections.market.sources.length,"La lettura pilota deve includere lo snapshot quote aggiornato");
assert(["referee","synthesis"].every(moduleId=>atalantaSassuoloReading.sections[moduleId].content===null),"La lettura pilota non deve inventare gli altri dati prepartita mancanti");
assert(predictions.engine?.version&&predictions.predictions?.length===10,"Il motore pronostici deve coprire le 10 gare quotate della prima giornata");
assert(Math.abs(Object.values(predictions.engine.weights).reduce((total,value)=>total+value,0)-1)<1e-9,"Pesi del motore pronostici non normalizzati");
for(const prediction of predictions.predictions){const values=Object.values(prediction.probabilities.final);assert(matchIds.has(prediction.matchId),`Partita pronostico non trovata: ${prediction.matchId}`);assert(Number(values.reduce((total,value)=>total+value,0).toFixed(1))===100,`Probabilita pronostico non esattamente normalizzate: ${prediction.matchId}`);assert(prediction.exactScores.length===3,`Risultati esatti incompleti: ${prediction.matchId}`);assert(prediction.scoreProfile?.bands?.length===3,`Profilo punteggi incompleto: ${prediction.matchId}`);assert(prediction.surprise.value>=0&&prediction.surprise.value<=100,`Fattore sorpresa non valido: ${prediction.matchId}`);assert(prediction.teamProjections?.length===2,`Volumi squadra incompleti: ${prediction.matchId}`);assert(prediction.likelyBooked?.length===5&&new Set(prediction.likelyBooked.map(item=>item.teamId)).size===2,`Gerarchia ammoniti non valida: ${prediction.matchId}`);assert(prediction.mvpCandidate?.name&&prediction.mvpCandidate?.mvpHistory?.status,`MVP non valido: ${prediction.matchId}`);assert(prediction.marketComparison?.length>=16,`Confronto quote incompleto: ${prediction.matchId}`);assert(prediction.scenarios?.length===3,`Scenari incompleti: ${prediction.matchId}`)}
assert(cup.competition==="coppa-italia"&&cup.season==="2026-27","Dataset Coppa Italia non valido");
assert(cup.source?.url?.includes("goal.com/it/liste/tabellone-coppa-italia-2026-2027"),"Fonte Coppa Italia mancante");
assert(cup.matches.length===43&&new Set(cup.matches.map(match=>match.id)).size===43,"Incontri o percorsi Coppa Italia incompleti");
assert(JSON.stringify(cup.counts)===JSON.stringify({preliminary:4,"round-32":16,"round-16":8,"round-of-16":8,quarter:4,semifinal:2,final:1}),"Conteggi turni Coppa Italia incoerenti");
assert(cup.matches.every(match=>match.competition==="coppa-italia"&&match.season==="2026-27"&&["scheduled","finished"].includes(match.status)&&match.scheduleLabel&&match.sources?.length),"Metadati Coppa Italia incompleti");
const cupPreliminary=cup.matches.filter(match=>match.stage==="preliminary");
assert(cupPreliminary.every(match=>match.status==="finished"&&Number.isInteger(match.score?.home)&&Number.isInteger(match.score?.away)&&match.winner&&match.scorers?.length&&Array.isArray(match.bookings)&&match.resultSource?.url),"Risultati preliminari Coppa Italia incompleti");
assert(cup.matches.find(match=>match.id==="pre-1")?.shootout?.away===4,"Esito ai rigori Vicenza-Catania non valido");
assert(cup.matches.find(match=>match.id==="r32-01a")?.away==="Ascoli"&&cup.matches.find(match=>match.id==="r32-04b")?.away==="Catania"&&cup.matches.find(match=>match.id==="r32-05a")?.away==="Arezzo"&&cup.matches.find(match=>match.id==="r32-08b")?.away==="Benevento","Qualificate ai trentaduesimi non aggiornate");
assert(cup.matches.filter(match=>match.stage==="round-32").every(match=>match.date&&match.kickoff&&["confirmed"].includes(match.dateStatus)),"Programmazione trentaduesimi incompleta");
assert(cup.matches.find(match=>match.id==="final")?.date==="2027-05-19","Data finale Coppa Italia non valida");
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
const historicalDisciplineFields=["penaltiesFor","penaltiesAgainst","cardsFor","cardsAgainst"];
assert(previousStandings.disciplineSource?.provider==="espn"&&previousStandings.disciplineSource.matches===380&&previousStandings.disciplineSource.teamMatchRecords===760&&previousStandings.disciplineSource.completeCoverage===true,"Fonte disciplinare classifica 2025/26 non valida");
assert(previousStandings.historicalTeams.length===3,"Classifica 2025/26: attesi 3 loghi per squadre non presenti nel 2026/27");
for(const team of previousStandings.historicalTeams){assert(fs.existsSync(path.join(root,team.logo)),`Logo storico locale mancante: ${team.id}`);assert(team.logoSource?.sourceUrl&&team.logoSource?.sourceType==="official-club",`Fonte logo storico non valida: ${team.id}`)}
assert(previousStandings.rows.length===20,"Classifica 2025/26: attese 20 squadre");
assert(new Set(previousStandings.rows.map(r=>r.position)).size===20,"Classifica 2025/26: posizioni duplicate");
for(const row of previousStandings.rows){
  assert(row.played===38&&row.won+row.drawn+row.lost===38,`Classifica 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Classifica 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Classifica 2025/26: punti incoerenti per ${row.teamName}`);
  assert(historicalDisciplineFields.every(field=>Number.isInteger(row[field])&&row[field]>=0),`Classifica 2025/26: rigori/cartellini mancanti per ${row.teamName}`);
}
assert(previousStandings.homeRows.length===20,"Rendimento casa 2025/26: attese 20 squadre");
assert(new Set(previousStandings.homeRows.map(r=>r.position)).size===20,"Rendimento casa 2025/26: posizioni duplicate");
for(const row of previousStandings.homeRows){
  assert(row.played===19&&row.won+row.drawn+row.lost===19,`Rendimento casa 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Rendimento casa 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Rendimento casa 2025/26: punti incoerenti per ${row.teamName}`);
  assert(historicalDisciplineFields.every(field=>Number.isInteger(row[field])&&row[field]>=0),`Rendimento casa 2025/26: rigori/cartellini mancanti per ${row.teamName}`);
}
assert(previousStandings.awayRows.length===20,"Rendimento trasferta 2025/26: attese 20 squadre");
assert(new Set(previousStandings.awayRows.map(r=>r.position)).size===20,"Rendimento trasferta 2025/26: posizioni duplicate");
for(const row of previousStandings.awayRows){
  assert(row.played===19&&row.won+row.drawn+row.lost===19,`Rendimento trasferta 2025/26: partite incoerenti per ${row.teamName}`);
  assert(row.goalDifference===row.goalsFor-row.goalsAgainst,`Rendimento trasferta 2025/26: differenza reti incoerente per ${row.teamName}`);
  assert(row.points===row.won*3+row.drawn,`Rendimento trasferta 2025/26: punti incoerenti per ${row.teamName}`);
  assert(historicalDisciplineFields.every(field=>Number.isInteger(row[field])&&row[field]>=0),`Rendimento trasferta 2025/26: rigori/cartellini mancanti per ${row.teamName}`);
}
for(const total of previousStandings.rows){
  const home=previousStandings.homeRows.find(r=>r.team===total.team),away=previousStandings.awayRows.find(r=>r.team===total.team);
  assert(home&&away,`Rendimento casa/trasferta mancante per ${total.teamName}`);
  for(const field of ["played","won","drawn","lost","goalsFor","goalsAgainst","goalDifference","points",...historicalDisciplineFields])
    assert(home[field]+away[field]===total[field],`Totale casa+trasferta incoerente per ${total.teamName}: ${field}`);
}
assert(previousStandings.rows.reduce((sum,row)=>sum+row.penaltiesFor,0)===previousStandings.rows.reduce((sum,row)=>sum+row.penaltiesAgainst,0),"Totale rigori a favore/contro 2025/26 non riconciliato");
assert(previousStandings.rows.reduce((sum,row)=>sum+row.cardsFor,0)===previousStandings.rows.reduce((sum,row)=>sum+row.cardsAgainst,0),"Totale cartellini a favore/contro 2025/26 non riconciliato");
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
console.log("OK organico CAN 2026/27: 42 arbitri con fonti e statistiche non inventate");
console.log("OK snapshot arbitri 2025/26: Serie A e Serie B separate per 42 arbitri");
console.log("OK 38 giornate x 10 partite = 380");
console.log("OK Coppa Italia 2026/27: 43 incontri e percorsi con fonte, turni e programmazione");
console.log("OK ogni squadra: 38 gare, 19 casa, 19 trasferta");
console.log("OK 190 coppie: doppio confronto con casa/trasferta invertite");
console.log(`OK prime 5 giornate: 50 programmazioni (${50-provisional.length} confermate, ${provisional.length} provvisorie)`);
console.log("OK nessuna data o orario assegnati oltre la quinta giornata");
console.log("OK classifica finale 2025/26: 20 squadre e valori coerenti");
console.log("OK rendimento casa 2025/26: 20 squadre e valori coerenti");
console.log("OK rendimento trasferta 2025/26 e riconciliazione con classifica finale");
console.log("OK riepilogo statistico 2025/26 riconciliato con classifiche generale/casa/trasferta");
console.log("OK verdetti 2025/26 e promosse 2026/27 coerenti con le classifiche");
console.log("OK profili tattici WhoScored 2025/26: 20/20 con copertura e campioni dichiarati");
