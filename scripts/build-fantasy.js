const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const teams = read("data/normalized/teams.json");
const matches = read("data/normalized/matches.json").filter(match => match.competition === "serie-a" && match.season === "2026-27");
const teamFiles = teams.map(team => read(`data/teams/${team.id}.json`));

const roleCode = role => {
  if (role === "Portiere") return "P";
  if (String(role).startsWith("Difensore") || String(role).startsWith("Terzino")) return "D";
  if (["Attaccante", "Centravanti", "Seconda punta", "Ala destra", "Ala sinistra"].includes(role)) return "A";
  return "C";
};
const number = value => Number.isFinite(value) ? value : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));

const strength = new Map(teamFiles.map(team => {
  const previous = team.previousSeason || {};
  const position = previous.competition === "Serie A" && previous.position ? previous.position : 18;
  return [team.id, clamp(21 - position, 2, 20)];
}));

function calendarIndex(teamId) {
  const fixtures = matches.filter(match => match.matchday <= 5 && (match.homeTeam === teamId || match.awayTeam === teamId));
  const raw = fixtures.reduce((sum, match) => {
    const home = match.homeTeam === teamId;
    const opponent = home ? match.awayTeam : match.homeTeam;
    return sum + strength.get(opponent) + (home ? -1.2 : 1.2);
  }, 0) / Math.max(1, fixtures.length);
  const index = round(clamp(100 - raw * 4.2, 20, 90));
  return {
    index,
    label: index >= 67 ? "Favorevole" : index >= 48 ? "Equilibrato" : "Impegnativo",
    fixtures: fixtures.map(match => ({
      matchday: match.matchday,
      opponent: match.homeTeam === teamId ? match.awayTeam : match.homeTeam,
      venue: match.homeTeam === teamId ? "C" : "T"
    }))
  };
}

const teamCalendar = Object.fromEntries(teams.map(team => [team.id, calendarIndex(team.id)]));
const candidates = [];
for (const team of teamFiles) {
  for (const player of team.squad || []) {
    const totals = player.previousSeason?.totals || {};
    const role = roleCode(player.role);
    const appearances = number(totals.appearances);
    const starts = number(totals.starts);
    const minutes = number(totals.minutes);
    const goals = number(totals.goals);
    const assists = number(totals.assists);
    const cleanSheets = number(totals.cleanSheets);
    const saves = number(totals.saves);
    const cards = number(totals.yellowCards) + number(totals.secondYellowCards) * 2 + number(totals.straightRedCards) * 3;
    const availability = clamp((minutes / 2600) * 55 + (starts / 30) * 30 + (appearances / 34) * 15, 0, 100);
    const bonusWeights = role === "P" ? [5, 2.5] : role === "D" ? [7, 4] : role === "C" ? [8, 5] : [10, 4];
    const bonus = goals * bonusWeights[0] + assists * bonusWeights[1] + cleanSheets * (role === "P" ? 1.6 : role === "D" ? .7 : 0) + saves * (role === "P" ? .08 : 0);
    const rawScore = availability * .48 + Math.min(100, bonus * 1.65) * .42 + teamCalendar[team.id].index * .1 - Math.min(10, cards * .35);
    if (appearances === 0 && minutes === 0) continue;
    candidates.push({
      id: player.id,
      name: player.name,
      teamId: team.id,
      team: team.name,
      role,
      detailedRole: player.detailedRole || player.role || "N/D",
      appearances: appearances || null,
      starts: starts || null,
      minutes: minutes || null,
      goals: totals.goals ?? null,
      assists: totals.assists ?? null,
      score: round(clamp(rawScore, 1, 99)),
      reliability: minutes >= 2200 ? "Alta" : minutes >= 1100 ? "Media" : "Da verificare",
      calendar: teamCalendar[team.id]
    });
  }
}

for (const role of ["P", "D", "C", "A"]) {
  const group = candidates.filter(player => player.role === role).sort((a, b) => b.score - a.score);
  group.forEach((player, index) => {
    const percentile = index / Math.max(1, group.length);
    player.slot = percentile < .15 ? "A" : percentile < .4 ? "B" : percentile < .7 ? "C" : "D";
    const roleMax = { P: 38, D: 45, C: 85, A: 185 }[role];
    player.value500 = Math.max(1, Math.round(1 + Math.pow(player.score / 100, 2.15) * roleMax));
  });
}

candidates.sort((a, b) => b.score - a.score);
const output = {
  schemaVersion: 1,
  season: "2026-27",
  generatedAt: new Date().toISOString().slice(0, 10),
  baseBudget: 500,
  openingWindow: 5,
  methodology: {
    description: "Indice orientativo costruito da statistiche 2025/26, disponibilità e difficoltà delle prime cinque giornate 2026/27.",
    caveat: "Non è una quotazione ufficiale. Ruolo, titolarità, trasferimenti e listone della lega vanno verificati prima dell'asta.",
    missingValues: "I dati assenti restano N/D e non producono bonus."
  },
  budgetPlan: [
    { role: "P", label: "Portieri", players: 3, minPct: 6, maxPct: 9 },
    { role: "D", label: "Difensori", players: 8, minPct: 14, maxPct: 18 },
    { role: "C", label: "Centrocampisti", players: 8, minPct: 24, maxPct: 30 },
    { role: "A", label: "Attaccanti", players: 6, minPct: 45, maxPct: 54 }
  ],
  slotGuide: {
    A: "Punto fermo: alto investimento e priorità d'asta.",
    B: "Titolare di valore: obiettivo forte con prezzo controllato.",
    C: "Rotazione utile: profilo da incrociare con calendario e titolarità.",
    D: "Scommessa o copertura: acquistare solo a costo contenuto."
  },
  teams: teams.map(team => ({ id: team.id, name: team.name, logo: team.logo, calendar: teamCalendar[team.id] })),
  players: candidates
};

const target = path.join(root, "data/generated/fantacalcio-advice.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Fantacalcio: ${candidates.length} calciatori valutati.`);
