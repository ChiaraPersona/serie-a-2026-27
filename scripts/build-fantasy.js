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

const historicalRank = {
  juventus: 1, inter: 2, milan: 3, roma: 4, fiorentina: 5, napoli: 6, lazio: 7, torino: 8,
  bologna: 9, atalanta: 11, genoa: 12, udinese: 13, cagliari: 14, parma: 15, lecce: 26,
  como: 29, sassuolo: 30, venezia: 43, monza: 56, frosinone: 61
};
const strengthDetails = new Map(teamFiles.map(team => {
  const previous = team.previousSeason || {};
  const playedSerieA = previous.competition === "Serie A" && previous.position;
  const recent = playedSerieA ? clamp(104.5 - previous.position * 4.5, 15, 100) : clamp(38 - (previous.position || 3) * 3, 22, 35);
  const history = clamp(102 - (historicalRank[team.id] || 61) * 1.55, 8, 100);
  const combined = round(recent * .82 + history * .18);
  return [team.id, { combined, recent: round(recent), history: round(history), historicalRank: historicalRank[team.id] || null }];
}));

function calendarIndex(teamId) {
  const fixtures = matches.filter(match => match.homeTeam === teamId || match.awayTeam === teamId).sort((a, b) => a.matchday - b.matchday);
  const fullFixtures = fixtures.map(match => {
    const home = match.homeTeam === teamId;
    const opponent = home ? match.awayTeam : match.homeTeam;
    const opponentStrength = strengthDetails.get(opponent).combined;
    const ease = round(clamp(100 - opponentStrength + (home ? 7 : -7), 8, 92));
    return {
      matchday: match.matchday,
      opponent,
      venue: home ? "C" : "T",
      ease,
      label: ease >= 65 ? "Favorevole" : ease >= 48 ? "Equilibrata" : "Impegnativa"
    };
  });
  const index = round(fullFixtures.reduce((sum, fixture) => sum + fixture.ease, 0) / fullFixtures.length);
  return {
    index,
    label: index >= 57 ? "Favorevole" : index >= 44 ? "Equilibrato" : "Impegnativo",
    fixtures: fullFixtures
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
      marketValueEur: player.marketValue?.amountEur ?? null,
      marketValueLabel: player.marketValue?.label ?? null,
      reliability: minutes >= 2200 ? "Alta" : minutes >= 1100 ? "Media" : "Da verificare",
      calendar: { index: teamCalendar[team.id].index, label: teamCalendar[team.id].label }
    });
  }
}

const marketValuesAvailable = candidates.map(player => player.marketValueEur).filter(Number.isFinite);
const maxMarketLog = Math.log10(Math.max(...marketValuesAvailable, 1) + 1);
for (const player of candidates) {
  if (player.marketValueEur !== null) {
    const marketIndex = 100 * Math.log10(player.marketValueEur + 1) / maxMarketLog;
    player.score = round(clamp(player.score * .88 + marketIndex * .12, 1, 99));
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

function buildGoalkeeperTrios() {
  const bestByTeam = [...candidates.filter(player => player.role === "P").reduce((map, player) => {
    const current = map.get(player.teamId);
    if (!current || player.score > current.score) map.set(player.teamId, player);
    return map;
  }, new Map()).values()];
  const trios = [];
  for (let first = 0; first < bestByTeam.length - 2; first += 1) {
    for (let second = first + 1; second < bestByTeam.length - 1; second += 1) {
      for (let third = second + 1; third < bestByTeam.length; third += 1) {
        const players = [bestByTeam[first], bestByTeam[second], bestByTeam[third]];
        const cost500 = players.reduce((sum, player) => sum + player.value500, 0);
        if (cost500 > 35) continue;
        const starts = Object.fromEntries(players.map(player => [player.id, 0]));
        const weeklyPlan = Array.from({ length: 38 }, (_, index) => {
          const options = players.map(player => ({
            player,
            fixture: teamCalendar[player.teamId].fixtures[index]
          })).sort((a, b) => b.fixture.ease - a.fixture.ease || b.player.score - a.player.score);
          const selected = options[0];
          starts[selected.player.id] += 1;
          return {
            matchday: index + 1,
            playerId: selected.player.id,
            teamId: selected.player.teamId,
            opponent: selected.fixture.opponent,
            venue: selected.fixture.venue,
            ease: selected.fixture.ease,
            label: selected.fixture.label
          };
        });
        const rotationIndex = round(weeklyPlan.reduce((sum, fixture) => sum + fixture.ease, 0) / weeklyPlan.length);
        const favorableDays = weeklyPlan.filter(fixture => fixture.ease >= 65).length;
        const coveredDays = weeklyPlan.filter(fixture => fixture.ease >= 48).length;
        const difficultDays = weeklyPlan.length - coveredDays;
        const quality = round(players.reduce((sum, player) => sum + player.score, 0) / players.length);
        trios.push({
          score: round(rotationIndex * .62 + quality * .38),
          cost500,
          rotationIndex,
          favorableDays,
          coveredDays,
          difficultDays,
          players: players.map(player => ({
            id: player.id,
            name: player.name,
            teamId: player.teamId,
            team: player.team,
            score: player.score,
            value500: player.value500,
            starts: starts[player.id]
          })),
          weeklyPlan
        });
      }
    }
  }
  return trios.sort((a, b) => b.score - a.score || b.coveredDays - a.coveredDays || a.cost500 - b.cost500).slice(0, 5);
}

const goalkeeperTrios = buildGoalkeeperTrios();
candidates.sort((a, b) => b.score - a.score);
const output = {
  schemaVersion: 1,
  season: "2026-27",
  generatedAt: new Date().toISOString().slice(0, 10),
  baseBudget: 500,
  calendarWindow: 38,
  methodology: {
    description: "Indice orientativo costruito da statistiche 2025/26, disponibilità e calendario completo 2026/27. Il valore di mercato, quando disponibile, incide soltanto per il 12% sul profilo del calciatore. La forza avversaria pesa per l'82% sul rendimento recente e per il 18% sulla storia in Serie A.",
    caveat: "Non è una quotazione ufficiale. Ruolo, titolarità, trasferimenti e listone della lega vanno verificati prima dell'asta.",
    missingValues: "I dati assenti restano N/D e non producono bonus."
  },
  sources: {
    historicalTable: {
      provider: "Transfermarkt",
      url: "https://www.transfermarkt.it/serie-a/ewigeTabelle/wettbewerb/IT1",
      retrievedAt: "2026-07-27",
      use: "Correttivo storico limitato al 18% della forza avversaria."
    },
    recentSeason: {
      provider: "Lega Serie A / dataset locale verificato",
      season: "2025-26",
      use: "Componente principale, 82% della forza avversaria."
    }
  },
  budgetPlan: [
    { role: "P", label: "Portieri", players: 3, pct: 7 },
    { role: "D", label: "Difensori", players: 8, pct: 17 },
    { role: "C", label: "Centrocampisti", players: 8, pct: 23 },
    { role: "A", label: "Attaccanti", players: 6, pct: 53 }
  ],
  goalkeeperTrios: {
    budgetPct: 7,
    budget500: 35,
    method: "Tre portieri di squadre diverse entro il 7% del budget. Per ogni giornata viene scelto il portiere con la partita piÃ¹ favorevole; il punteggio premia copertura del calendario e qualitÃ  individuale.",
    examples: goalkeeperTrios
  },
  slotGuide: {
    A: "Punto fermo: alto investimento e priorità d'asta.",
    B: "Titolare di valore: obiettivo forte con prezzo controllato.",
    C: "Rotazione utile: profilo da incrociare con calendario e titolarità.",
    D: "Scommessa o copertura: acquistare solo a costo contenuto."
  },
  teams: teams.map(team => ({ id: team.id, name: team.name, logo: team.logo, strength: strengthDetails.get(team.id), calendar: teamCalendar[team.id] })),
  players: candidates
};

const target = path.join(root, "data/generated/fantacalcio-advice.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Fantacalcio: ${candidates.length} calciatori valutati.`);
