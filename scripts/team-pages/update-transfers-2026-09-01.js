const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const remainingPath = path.join(root, "data/sources/team-pages/remaining-teams-2026-27.json");
const completedPath = path.join(root, "data/sources/team-pages/completed-teams-2026-27.json");
const milanPath = path.join(root, "data/sources/milan/roster-2026-27.json");
const remaining = JSON.parse(fs.readFileSync(remainingPath, "utf8"));
const completed = JSON.parse(fs.readFileSync(completedPath, "utf8"));
const milan = JSON.parse(fs.readFileSync(milanPath, "utf8"));
const retrievedAt = "2026-09-01";
const legaNews = "https://www.legaseriea.it/serie-a/news/calciomercato-in-diretta-serie-a-enilive";

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function addPlayer(team, player) {
  team.supplementalPlayers ||= [];
  const index = team.supplementalPlayers.findIndex(item =>
    (player.espnId && item.espnId === player.espnId) || item.name === player.name
  );
  if (index === -1) team.supplementalPlayers.push(player);
  else team.supplementalPlayers[index] = { ...team.supplementalPlayers[index], ...player };
}

function source(provider, scope, url = legaNews) {
  return { provider, scope, url, retrievedAt };
}

function addMove({ from, to, player, transferSource }) {
  if (from) {
    const origin = remaining.teams[from] || completed.teams[from];
    if (!origin) throw new Error(`Squadra di origine non trovata: ${from}`);
    origin.excludeEspnIds ||= [];
    addUnique(origin.excludeEspnIds, player.espnId);
  }
  addPlayer(remaining.teams[to], {
    ...player,
    arrivalDate: player.arrivalDate || retrievedAt,
    status: "nuovo acquisto",
    transferSource
  });
}

addMove({
  to: "sassuolo",
  player: {
    name: "Duje Ćaleta-Car",
    espnId: "194766",
    role: "Difensore",
    detailedRole: "Difensore centrale",
    nationality: "Croazia",
    dateOfBirth: "1996-09-17"
  },
  transferSource: source("Lega Serie A / US Sassuolo Calcio", "Trasferimento dall'Olympique Lione al Sassuolo")
});

addMove({
  from: "como",
  to: "monza",
  player: {
    name: "Noel Törnqvist",
    espnId: "301377",
    role: "Portiere",
    detailedRole: "Portiere",
    nationality: "Svezia",
    dateOfBirth: "2002-02-01"
  },
  transferSource: source(
    "AC Monza",
    "Prestito dal Como al Monza",
    "https://www.acmonza.com/it/news/noel-tornqvist-e-biancorosso/"
  )
});

addMove({
  to: "lecce",
  player: {
    name: "Joël Monteiro",
    espnId: "307893",
    role: "Attaccante",
    detailedRole: "Ala / seconda punta",
    nationality: "Svizzera",
    dateOfBirth: "1999-08-05",
    shirtNumber: 99,
    arrivalDate: "2026-08-31"
  },
  transferSource: source("Lega Serie A / US Lecce", "Trasferimento definitivo dallo Young Boys al Lecce")
});

addMove({
  to: "venezia",
  player: {
    name: "Juan Jesus",
    espnId: "170663",
    role: "Difensore",
    detailedRole: "Difensore centrale",
    nationality: "Brasile",
    dateOfBirth: "1991-06-10",
    arrivalDate: "2026-08-31"
  },
  transferSource: source("Lega Serie A / Venezia FC", "Tesseramento a parametro zero del difensore Juan Jesus")
});

addMove({
  from: "napoli",
  to: "venezia",
  player: {
    name: "Pasquale Mazzocchi",
    espnId: "260188",
    role: "Difensore",
    detailedRole: "Esterno destro / terzino",
    nationality: "Italia",
    dateOfBirth: "1995-07-27",
    arrivalDate: "2026-08-31"
  },
  transferSource: source(
    "Venezia FC",
    "Prestito dal Napoli con diritto di riscatto e obbligo condizionato",
    "https://www.veneziafc.it/news/pasquale-mazzocchi-al-venezia-fc"
  )
});

addMove({
  to: "cagliari",
  player: {
    name: "Roberto Gagliardini",
    espnId: "193977",
    role: "Centrocampista",
    detailedRole: "Centrocampista centrale",
    nationality: "Italia",
    dateOfBirth: "1994-04-07",
    arrivalDate: "2026-08-31"
  },
  transferSource: source(
    "Cagliari Calcio",
    "Tesseramento da svincolato; contratto fino al 30 giugno 2027 con opzione per un'ulteriore stagione",
    "https://cagliaricalcio.com/news/gagliardini-al-cagliari/"
  )
});

addMove({
  to: "torino",
  player: {
    name: "Rafik Belghali",
    espnId: "364590",
    role: "Difensore",
    detailedRole: "Terzino destro / esterno destro",
    nationality: "Algeria",
    dateOfBirth: "2002-06-07"
  },
  transferSource: source(
    "Torino FC",
    "Trasferimento definitivo dall'Hellas Verona al Torino",
    "https://www.torinofc.it/news/01/09/2026/belghali-al-toro_44664"
  )
});

const hutchinson = {
  id: "omari-hutchinson",
  name: "Omari Hutchinson",
  role: "Attaccante",
  detailedRole: "Ala destra / ala sinistra",
  nationality: "Inghilterra",
  profileSlug: "omari-hutchinson",
  espnId: "322771",
  shirtNumber: 20,
  dateOfBirth: "2003-10-29",
  status: "nuovo acquisto",
  previousTeam: "Nottingham Forest",
  previousCompetition: "Premier League",
  arrivalDate: "2026-08-31",
  transferSource: source(
    "AC Milan",
    "Prestito dal Nottingham Forest con diritto di riscatto",
    "https://www.acmilan.com/it/news/articoli/media/2026-08-31/comunicato-ufficiale-omari-hutchinson"
  )
};
const milanIndex = milan.players.findIndex(player => player.espnId === hutchinson.espnId || player.id === hutchinson.id);
if (milanIndex === -1) milan.players.push(hutchinson);
else milan.players[milanIndex] = { ...milan.players[milanIndex], ...hutchinson };

remaining.lastUpdated = retrievedAt;
completed.lastUpdated = retrievedAt;
milan.lastUpdated = retrievedAt;
fs.writeFileSync(remainingPath, `${JSON.stringify(remaining)}\n`);
fs.writeFileSync(completedPath, `${JSON.stringify(completed, null, 2)}\n`);
fs.writeFileSync(milanPath, `${JSON.stringify(milan, null, 2)}\n`);

console.log("Aggiornati 8 trasferimenti ufficiali del 31 agosto-1 settembre 2026.");
