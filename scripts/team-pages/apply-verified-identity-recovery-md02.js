const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const remainingPath = path.join(root, "data/sources/team-pages/remaining-teams-2026-27.json");
const completedPath = path.join(root, "data/sources/team-pages/completed-teams-2026-27.json");
const milanPath = path.join(root, "data/sources/milan/roster-2026-27.json");

const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, data, pretty) => fs.writeFileSync(file, `${JSON.stringify(data, null, pretty ? 2 : 0)}\n`);
const remaining = read(remainingPath);
const completed = read(completedPath);
const milan = read(milanPath);
const retrievedAt = "2026-08-27";
const legaMarket = "https://www.legaseriea.it/serie-a/calciomercato";

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

function transferSource(provider, scope, url = legaMarket) {
  return { provider, scope, url, retrievedAt };
}

function addMove({ from, to, player, source, completedFrom = false, completedTo = false }) {
  const sourceTeams = completedFrom ? completed.teams : remaining.teams;
  const targetTeams = completedTo ? completed.teams : remaining.teams;
  if (from) {
    sourceTeams[from].excludeEspnIds ||= [];
    addUnique(sourceTeams[from].excludeEspnIds, player.espnId);
  }
  addPlayer(targetTeams[to], { ...player, status: "nuovo acquisto", transferSource: source });
}

const milanComotto = {
  id: "christian-comotto",
  name: "Christian Comotto",
  role: "Centrocampista",
  detailedRole: "Centrocampista centrale",
  nationality: "Italia",
  profileSlug: "christian-comotto",
  espnId: "403807",
  shirtNumber: 28,
  status: "confermato",
  previousTeam: "Spezia",
  previousCompetition: "Serie B",
  transferSource: transferSource(
    "Lega Serie A / AC Milan",
    "Rientro al Milan e rinnovo fino al 30 giugno 2031",
    "https://www.legaseriea.it/serie-a/news/calciomercato-serie-a-tutte-le-novita-di-luglio"
  )
};
const milanIndex = milan.players.findIndex(player => player.espnId === milanComotto.espnId || player.id === milanComotto.id);
if (milanIndex === -1) milan.players.push(milanComotto);
else milan.players[milanIndex] = { ...milan.players[milanIndex], ...milanComotto };
milan.lastUpdated = retrievedAt;

addMove({
  to: "frosinone",
  player: { name: "Omar Fayed", espnId: "368011", role: "Difensore", detailedRole: "Difensore centrale", nationality: "Egitto" },
  source: transferSource("Fenerbahçe / Anadolu Agency", "Trasferimento definitivo dal Fenerbahçe al Frosinone", "https://www.aa.com.tr/tr/spor/fenerbahceli-futbolcu-omar-fayed-frosinoneye-transfer-oldu/4032007/4032007")
});
addMove({
  to: "frosinone",
  player: { name: "Enzo Tchato", espnId: "334986", role: "Difensore", detailedRole: "Terzino destro", nationality: "Camerun" },
  source: transferSource("Lega Serie A", "Trasferimento definitivo dal Montpellier al Frosinone")
});
addMove({
  from: "inter",
  to: "monza",
  completedFrom: true,
  player: { name: "Yvan Maye", espnId: "412249", role: "Difensore", detailedRole: "Difensore", nationality: "Francia", dateOfBirth: "2006-03-21" },
  source: transferSource("Lega Serie A", "Trasferimento temporaneo dall'Inter al Monza")
});
addPlayer(remaining.teams.sassuolo, {
  name: "Simone Cinquegrano",
  espnId: "412248",
  role: "Difensore",
  detailedRole: "Terzino destro",
  nationality: "Italia",
  heightCm: 192,
  status: "promosso dal vivaio",
  transferSource: transferSource("Lega Serie A / Sassuolo", "Aggregato alla prima squadra dal settore giovanile", "https://www.legaseriea.it/serie-a/news/la-primavera-del-calcio-italiano-i-giovanissimi-si-prendono-la-serie-a")
});
addPlayer(remaining.teams.sassuolo, {
  name: "Gabriel Kulla",
  espnId: "3129533",
  role: "Attaccante",
  detailedRole: "Centravanti",
  status: "promosso dal vivaio",
  transferSource: transferSource("US Sassuolo Calcio", "Rinnovo fino al 30 giugno 2030 e aggregazione alla prima squadra", "https://www.sassuolocalcio.it/en/featured/gabriel-kulla-contract-renewal/")
});
addMove({
  to: "juventus",
  completedTo: true,
  player: { name: "Kamil Grabara", espnId: "259474", role: "Portiere", detailedRole: "Portiere", nationality: "Polonia" },
  source: transferSource("Lega Serie A", "Trasferimento temporaneo dal Wolfsburg alla Juventus")
});
addMove({
  to: "como",
  player: { name: "Willy Kambwala", espnId: "325553", role: "Difensore", detailedRole: "Difensore centrale", nationality: "Francia" },
  source: transferSource("Lega Serie A", "Trasferimento temporaneo dal Villarreal al Como")
});
addMove({
  to: "lazio",
  player: { name: "Josip Šutalo", espnId: "305552", role: "Difensore", detailedRole: "Difensore centrale", nationality: "Croazia", arrivalDate: "2026-08-22", shirtNumber: 37 },
  source: transferSource("SS Lazio", "Trasferimento temporaneo dall'Ajax con opzione di acquisto", "https://www.sslazio.it/it/news/comunicati/josip-sutalo-in-biancoceleste-a-titolo-temporaneo")
});
addMove({
  from: "sassuolo",
  to: "lazio",
  player: { name: "Andrea Pinamonti", espnId: "239086", role: "Attaccante", detailedRole: "Centravanti", nationality: "Italia", dateOfBirth: "1999-05-19", heightCm: 188, weightKg: 72 },
  source: transferSource("Lega Serie A", "Trasferimento definitivo dal Sassuolo alla Lazio")
});
addPlayer(remaining.teams.genoa, {
  name: "Adam Žulevič",
  espnId: "3118700",
  role: "Attaccante",
  detailedRole: "Centravanti",
  nationality: "Slovacchia",
  dateOfBirth: "2007-09-14",
  shirtNumber: 80,
  status: "promosso dal vivaio",
  transferSource: transferSource("Genoa CFC", "Tesserato dal 2025 e aggregato alla prima squadra", "https://genoacfc.it/2025/08/05/adam-zulevic-e-un-nuovo-giocatore-del-genoa/")
});
addMove({
  to: "genoa",
  player: { name: "Milutin Osmajić", espnId: "275444", role: "Attaccante", detailedRole: "Centravanti", nationality: "Montenegro", dateOfBirth: "1999-07-25", arrivalDate: "2026-08-24" },
  source: transferSource("Genoa CFC / Telenord", "Trasferimento definitivo dal Preston North End", "https://app.telenord.it/genoa/i/d5adac212991fea3c7162b6bf2123831/ufficiale-osmajic-e-un-nuovo-giocatore-del-genoa")
});
addMove({
  to: "lecce",
  player: { name: "Amar Fatah", espnId: "330550", role: "Centrocampista", detailedRole: "Esterno offensivo", nationality: "Svezia" },
  source: transferSource("Lega Serie A", "Trasferimento definitivo dal Troyes al Lecce")
});
addMove({
  from: "torino",
  to: "lecce",
  player: { name: "Ivan Ilic", espnId: "260004", role: "Centrocampista", detailedRole: "Centrocampista centrale", nationality: "Serbia", dateOfBirth: "2001-03-17", heightCm: 185, weightKg: 77 },
  source: transferSource("Lega Serie A", "Trasferimento temporaneo dal Torino al Lecce")
});

write(remainingPath, remaining, false);
write(completedPath, completed, true);
write(milanPath, milan, true);
console.log("Aggiornate 14 identità canoniche MD2 e 3 trasferimenti interni.");
