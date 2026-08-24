const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const raw = path.join(root, "data/raw/fixtures");
const output = path.join(root, "data/normalized");
const retrievedAt = "2026-07-18";
const calendarUrl = "https://images.legaseriea.it/image/private/fl_attachment/prd/blpfycdm1ozusg4otblb.pdf";
const scheduleUrl = "https://images.legaseriea.it/image/private/fl_attachment/prd/czailts3apyt3kuxjran.pdf";
const clubIndexUrl = "https://www.legaseriea.it/team/index";
const teamColorSource = JSON.parse(fs.readFileSync(path.join(root, "data/sources/team-pages/footylogos-club-colors.json"), "utf8"));
const refereeAssignments = JSON.parse(fs.readFileSync(path.join(root, "data/sources/referee-assignments-2026-27.json"), "utf8"));
const matchResults = JSON.parse(fs.readFileSync(path.join(root, "data/sources/match-results-2026-27.json"), "utf8"));
const statmusePlayerStats = JSON.parse(fs.readFileSync(path.join(root, "data/sources/statmuse-player-stats-2026-27.json"), "utf8"));

const normalizePlayerName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");
const statmuseNameAliases = new Map(Object.entries({
  francescoesposito: "pioesposito",
  yannaurelbisseck: "yannbisseck",
  vakounbayo: "bayoyoussouf",
  nicolaspaz: "nicopaz",
  kialonda: "kialondagaspar",
  matteochichella: "matteocichella"
}));
const statmuseStatsByUrl = new Map(statmusePlayerStats.matches.map(entry => [entry[0], {
  home: entry[2],
  away: entry[4]
}]));
const allowedUnmatchedStatmusePlayers = new Set(["stefanosabelli"]);

function mergeStatmusePlayerStats(result) {
  const overlay = statmuseStatsByUrl.get(result.sourceUrl);
  if (!overlay) throw new Error(`Statistiche calciatori StatMuse mancanti: ${result.matchId}`);
  for (const side of ["home", "away"]) {
    const players = result.playerStats?.[side];
    if (!Array.isArray(players)) throw new Error(`Elenco calciatori non valido: ${result.matchId} ${side}`);
    const playersByName = new Map(players.map(player => [normalizePlayerName(player.player), player]));
    for (const [sourceName, shots, shotsOnTarget, foulsCommitted, foulsWon] of overlay[side]) {
      const normalizedSourceName = normalizePlayerName(sourceName);
      const targetName = statmuseNameAliases.get(normalizedSourceName) || normalizedSourceName;
      const player = playersByName.get(targetName);
      if (!player) {
        if (allowedUnmatchedStatmusePlayers.has(normalizedSourceName)) continue;
        throw new Error(`Calciatore StatMuse non riconosciuto: ${result.matchId} ${side} ${sourceName}`);
      }
      for (const [field, value] of Object.entries({ shots, shotsOnTarget, foulsCommitted, foulsWon })) {
        if (value === null) continue;
        if (!Number.isInteger(value) || value < 0) throw new Error(`Valore StatMuse non valido: ${result.matchId} ${sourceName} ${field}`);
        if (player[field] !== null && player[field] !== undefined && player[field] !== value) {
          throw new Error(`Conflitto StatMuse: ${result.matchId} ${sourceName} ${field} (${player[field]} != ${value})`);
        }
        player[field] = value;
      }
    }
  }
  return result.playerStats;
}

const teamDefinitions = [
  ["atalanta","Atalanta","Atalanta Bergamasca Calcio"],["bologna","Bologna","Bologna Football Club 1909"],
  ["cagliari","Cagliari","Cagliari Calcio"],["como","Como","Como 1907"],
  ["fiorentina","Fiorentina","ACF Fiorentina"],["frosinone","Frosinone","Frosinone Calcio"],
  ["genoa","Genoa","Genoa Cricket and Football Club"],["inter","Inter","FC Internazionale Milano"],
  ["juventus","Juventus","Juventus Football Club"],["lazio","Lazio","Società Sportiva Lazio"],
  ["lecce","Lecce","Unione Sportiva Lecce"],["milan","Milan","Associazione Calcio Milan"],
  ["monza","Monza","Associazione Calcio Monza"],["napoli","Napoli","Società Sportiva Calcio Napoli"],
  ["parma","Parma","Parma Calcio 1913"],["roma","Roma","Associazione Sportiva Roma"],
  ["sassuolo","Sassuolo","Unione Sportiva Sassuolo Calcio"],["torino","Torino","Torino Football Club"],
  ["udinese","Udinese","Udinese Calcio"],["venezia","Venezia","Venezia Football Club"]
];
const teamColors = Object.fromEntries(
  Object.entries(teamColorSource.teams).map(([id, entry]) => [id, entry.displayColors])
);
const logoSources = JSON.parse(fs.readFileSync(path.join(root,"data/raw/teams/logo-sources.json"),"utf8"));
const logoById = new Map(logoSources.map(item => [item.id,item.sourceUrl]));
const logoOverrides = {
  juventus: {
    logo: "assets/images/teams/monochrome/juventus-black.svg",
    logoSource: {
      sourceUrl: "https://www.footylogos.com/logos/serie-a-italy",
      sourceType: "footylogos-monochrome-svg",
      retrievedAt: "2026-07-28",
      licenseNote: "Variante nera per sfondi chiari; marchio del club usato a fini identificativi."
    }
  },
  napoli: {
    logo: "assets/images/teams/napoli.svg",
    logoSource: {
      sourceUrl: "https://football-logos.cc/italy/napoli",
      sourceType: "football-logos.cc",
      retrievedAt: "2026-08-04",
      licenseNote: "Stemma del club fornito dall'utente e usato a fini identificativi."
    }
  }
};
const teams = teamDefinitions.map(([id,name,officialName]) => ({
  id,name,officialName,shortName:name,slug:id,logo:logoOverrides[id]?.logo || `assets/images/teams/${id}.png`,colors:teamColors[id],
  logoSource:logoOverrides[id]?.logoSource || {sourceUrl:logoById.get(id),sourceType:"lega-serie-a",retrievedAt,licenseNote:"Stemma distribuito dal CDN ufficiale Lega Serie A; marchio del rispettivo club, usato a fini identificativi."}
}));
const upperToId = new Map(teams.map(team => [team.name.toUpperCase(),team.id]));
const teamPattern = new RegExp(`\\b(${[...upperToId.keys()].sort((a,b)=>b.length-a.length).join("|")})\\b`,"g");
const calendarSource = {sourceUrl:calendarUrl,sourceType:"lega-serie-a",documentNumber:"C.U. n. 205",publishedAt:"2026-06-05",retrievedAt};
const scheduleSource = {sourceUrl:scheduleUrl,sourceType:"lega-serie-a",documentNumber:"C.U. n. 208",publishedAt:"2026-06-24",retrievedAt};

function isoDate(italianDate) { const [d,m,y]=italianDate.split("/"); return `${y}-${m}-${d}`; }
function teamsIn(text) { return [...text.matchAll(teamPattern)].map(match => upperToId.get(match[1])); }

const matches = [];
for (let matchday=1; matchday<=38; matchday++) {
  const file = path.join(raw,"calendar-ocr",`matchday-${String(matchday).padStart(2,"0")}.txt`);
  let text = fs.readFileSync(file,"utf8").replace(/^﻿/,"").toUpperCase();
  const marker = `GIORNATA ${matchday}`; const markerAt = text.indexOf(marker);
  if (markerAt < 0) throw new Error(`Intestazione OCR mancante: giornata ${matchday}`);
  text = text.slice(markerAt + marker.length);
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  if (!dateMatch) throw new Error(`Data OCR mancante: giornata ${matchday}`);
  const before = text.slice(0,dateMatch.index); const after = text.slice(dateMatch.index + dateMatch[0].length);
  const homes = teamsIn(before); const aways = teamsIn(after);
  if (homes.length !== 10 || aways.length !== 10) throw new Error(`OCR giornata ${matchday}: ${homes.length} casa, ${aways.length} trasferta`);
  for (let i=0;i<10;i++) {
    const homeTeam=homes[i], awayTeam=aways[i];
    matches.push({
      id:`${homeTeam}-${awayTeam}-2026-27-md-${String(matchday).padStart(2,"0")}`,
      competition:"serie-a",season:"2026-27",matchday,stage:null,homeTeam,awayTeam,
      matchdayDate:isoDate(dateMatch[0]),date:null,kickoff:null,timezone:"Europe/Rome",dateStatus:"tbd",
      status:"scheduled",score:null,scorers:[],sources:[calendarSource]
    });
  }
}

const scheduleText = fs.readFileSync(path.join(raw,"cu-208.txt"),"utf8");
const datedLine = /^(\d{2}\/\d{2}\/2026)\s+\S+\s+(\d{2}\.\d{2})\s+(.+?)\s+(?:DAZN|SKY)/gm;
const overlays = new Map();
for (const found of scheduleText.matchAll(datedLine)) {
  const date=isoDate(found[1]), kickoff=found[2].replace(".",":"), rawGames=found[3].replace(/\s*\*+\s*$/g,"").trim();
  for (const game of rawGames.split("/")) {
    const clean=game.replace(/\s*\*+\s*$/g,"").trim(); const parts=clean.split(/\s*-\s*/);
    if (parts.length !== 2) continue;
    const homeTeam=upperToId.get(parts[0].toUpperCase()), awayTeam=upperToId.get(parts[1].toUpperCase());
    if (!homeTeam || !awayTeam) throw new Error(`Squadra non riconosciuta nel C.U. 208: ${clean}`);
    const key=`${homeTeam}-${awayTeam}`; const current=overlays.get(key)||[]; current.push({date,kickoff}); overlays.set(key,current);
  }
}
const provisional = new Set(["lazio-milan","sassuolo-juventus","como-parma","napoli-bologna","torino-roma"]);
for (const match of matches.filter(item => item.matchday <= 5)) {
  const key=`${match.homeTeam}-${match.awayTeam}`; const options=overlays.get(key);
  if (!options?.length) throw new Error(`Programmazione C.U. 208 mancante: ${key}`);
  const unique=[...new Map(options.map(o=>[`${o.date}T${o.kickoff}`,o])).values()];
  if (provisional.has(key)) {
    match.dateStatus="provisional"; match.scheduleAlternatives=unique;
    if (unique.length === 1) { match.date=unique[0].date; match.kickoff=unique[0].kickoff; }
  } else {
    match.dateStatus="confirmed"; match.date=unique[0].date; match.kickoff=unique[0].kickoff;
  }
  match.sources.push({...scheduleSource,note:match.dateStatus==="provisional"?"Programmazione modificabile in funzione del calendario UEFA.":"Data e orario ufficiali."});
}

const assignmentSource = {
  sourceUrl: refereeAssignments.source.url,
  sourceType: refereeAssignments.source.sourceType,
  publishedAt: refereeAssignments.publishedAt,
  retrievedAt: refereeAssignments.retrievedAt,
  note: "Designazione ufficiale: arbitro, assistenti, IV ufficiale, VAR e AVAR."
};
const matchById = new Map(matches.map(match => [match.id, match]));
for (const assignment of refereeAssignments.assignments) {
  const match = matchById.get(assignment.matchId);
  if (!match) throw new Error(`Partita non riconosciuta nelle designazioni AIA: ${assignment.matchId}`);
  if (match.matchday !== refereeAssignments.matchday) throw new Error(`Giornata incoerente nelle designazioni AIA: ${assignment.matchId}`);
  match.refereeAssignment = {
    referee: assignment.referee,
    assistants: assignment.assistants,
    fourthOfficial: assignment.fourthOfficial,
    var: assignment.var,
    avar: assignment.avar
  };
  match.sources.push(assignmentSource);
}
if (refereeAssignments.assignments.length !== 10 || matches.filter(match => match.matchday === 1 && match.refereeAssignment).length !== 10) {
  throw new Error("Le designazioni AIA della prima giornata devono coprire tutte le 10 gare");
}

if (matchResults.competition !== "serie-a" || matchResults.season !== "2026-27" || !Array.isArray(matchResults.matches)) {
  throw new Error("Dataset risultati Serie A non valido");
}
for (const result of matchResults.matches) {
  const match = matchById.get(result.matchId);
  if (!match) throw new Error(`Partita non riconosciuta nei risultati: ${result.matchId}`);
  if (result.status !== "finished" || !Number.isInteger(result.score?.home) || !Number.isInteger(result.score?.away)) {
    throw new Error(`Risultato finale non valido: ${result.matchId}`);
  }
  const source = matchResults.sources.find(item => item.url === result.sourceUrl);
  if (!source) throw new Error(`Fonte risultato non dichiarata: ${result.matchId}`);
  Object.assign(match, {
    status: result.status,
    score: result.score,
    halfTimeScore: result.halfTimeScore,
    attendance: result.attendance,
    weatherCelsius: result.weatherCelsius,
    formations: result.formations,
    scorers: result.scorers,
    bookings: result.bookings,
    substitutions: result.substitutions,
    teamStats: result.teamStats,
    playerStats: mergeStatmusePlayerStats(result),
    resultSource: source
  });
  match.sources.push({
    sourceUrl: source.url,
    sourceType: source.sourceType,
    retrievedAt: source.retrievedAt,
    note: "Risultato finale, eventi e statistiche di squadra e calciatori."
  });
}

fs.writeFileSync(path.join(output,"teams.json"),JSON.stringify(teams,null,2)+"\n");
fs.writeFileSync(path.join(output,"matches.json"),JSON.stringify(matches,null,2)+"\n");
console.log(`Importate ${teams.length} squadre e ${matches.length} partite; overlay C.U. 208: ${[...overlays.keys()].length} gare; designazioni AIA: ${refereeAssignments.assignments.length}; risultati: ${matchResults.matches.length}; statistiche calciatori StatMuse: ${statmusePlayerStats.matches.length} gare.`);
