const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const raw = path.join(root, "data/raw/fixtures");
const output = path.join(root, "data/normalized");
const retrievedAt = "2026-07-18";
const calendarUrl = "https://images.legaseriea.it/image/private/fl_attachment/prd/blpfycdm1ozusg4otblb.pdf";
const scheduleUrl = "https://images.legaseriea.it/image/private/fl_attachment/prd/czailts3apyt3kuxjran.pdf";
const clubIndexUrl = "https://www.legaseriea.it/team/index";

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
const teamColors = {
  atalanta:["#1673c9","#111820"], bologna:["#c8212b","#10254a"], cagliari:["#c92335","#162d59"],
  como:["#1767a8","#f4f7fb"], fiorentina:["#6f2da8","#f4f0fa"], frosinone:["#f5c400","#174a91"],
  genoa:["#b51f35","#172b55"], inter:["#1266b1","#101820"], juventus:["#f5f5f5","#111111"],
  lazio:["#75bce7","#f4f8fb"], lecce:["#f2cf20","#c62828"], milan:["#d71920","#171717"],
  monza:["#d7192d","#f5f5f5"], napoli:["#159bd7","#1261a0"], parma:["#f2cf20","#174a91"],
  roma:["#8e1f2f","#f0b323"], sassuolo:["#18a558","#111820"], torino:["#8a1538","#f2f0ed"],
  udinese:["#f5f5f5","#111111"], venezia:["#ef6c23","#08783e"]
};
const logoSources = JSON.parse(fs.readFileSync(path.join(root,"data/raw/teams/logo-sources.json"),"utf8"));
const logoById = new Map(logoSources.map(item => [item.id,item.sourceUrl]));
const teams = teamDefinitions.map(([id,name,officialName]) => ({
  id,name,officialName,shortName:name,slug:id,logo:`assets/images/teams/${id}.png`,colors:teamColors[id],
  logoSource:{sourceUrl:logoById.get(id),sourceType:"lega-serie-a",retrievedAt,licenseNote:"Stemma distribuito dal CDN ufficiale Lega Serie A; marchio del rispettivo club, usato a fini identificativi."}
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

fs.writeFileSync(path.join(output,"teams.json"),JSON.stringify(teams,null,2)+"\n");
fs.writeFileSync(path.join(output,"matches.json"),JSON.stringify(matches,null,2)+"\n");
console.log(`Importate ${teams.length} squadre e ${matches.length} partite; overlay C.U. 208: ${[...overlays.keys()].length} gare.`);
