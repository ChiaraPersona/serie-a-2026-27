const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const teams = read("data/normalized/teams.json");
const matches = read("data/normalized/matches.json").filter(match => match.competition === "serie-a" && match.season === "2026-27");
const teamFiles = teams.map(team => read(`data/teams/${team.id}.json`));
const fantasyWorkbook = read("data/sources/fantacalcio-stats-2025-26.json");
const fantasyQuotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const fantasyCallups = read("data/sources/fantacalcio-callups-md1-2026-27.json");
const probableLineups = read("data/sources/probable-lineups-md3-2026-27.json");
const fantasyInjuries = read("data/sources/fantacalcio-injuries-2026-27.json");
const goalkeeperHierarchySource = read("data/sources/fantasy-goalkeeper-hierarchy-2026-27.json");
const fantasyExternalStats = read("data/sources/fantasy-external-stats-2025-26.json");
const fantasyHistoryByPlayerId = new Map(fantasyWorkbook.players.filter(player => player.playerId).map(player => [player.playerId, player]));
const fantasyHistoryBySourceId = new Map(fantasyWorkbook.players.map(player => [String(player.sourceId), player]));
const fantasyExternalByPlayerId = new Map(fantasyExternalStats.players.map(player => [player.playerId, player]));
const fantasyStatsByPlayerId = new Map(fantasyWorkbook.players.filter(player => player.playerId && player.appearancesWithVote > 0).map(player => [player.playerId, player]));
const fantasyQuotationByPlayerId = new Map(fantasyQuotations.players.filter(player => player.playerId).map(player => [player.playerId, player]));
const probablePlayers = probableLineups.teams.flatMap(team => team.players);
const injuryReports = fantasyInjuries.teams.flatMap(team => team.reports);
const probableByPlayerId = new Map(probablePlayers.filter(player => player.playerId).map(player => [player.playerId, player]));
const probableBySourceId = new Map(probablePlayers.filter(player => player.sourceId !== null && player.sourceId !== undefined).map(player => [String(player.sourceId), player]));
const injuryByPlayerId = new Map(injuryReports.filter(player => player.playerId).map(player => [player.playerId, player]));
const injuryBySourceId = new Map(injuryReports.filter(player => player.sourceId).map(player => [String(player.sourceId), player]));
const callupPlayers = fantasyCallups.teams.flatMap(team => team.players);
const callupBySourceId = new Map(callupPlayers.map(player => [String(player.sourceId), player]));
const callupByPlayerId = new Map(fantasyQuotations.players
  .filter(player => player.playerId && callupBySourceId.has(String(player.sourceId)))
  .map(player => [player.playerId, callupBySourceId.get(String(player.sourceId)).status]));
const activeFantasyPlayerIds = new Set(fantasyQuotations.players.filter(player => player.playerId).map(player => player.playerId));

const roleCode = role => {
  if (role === "Portiere") return "P";
  if (String(role).startsWith("Difensore") || String(role).startsWith("Terzino")) return "D";
  if (["Attaccante", "Centravanti", "Seconda punta", "Ala destra", "Ala sinistra"].includes(role)) return "A";
  return "C";
};
const number = value => Number.isFinite(value) ? value : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const maxClassicFvm = Math.max(...fantasyQuotations.players.map(player => number(player.fvm)).filter(value => value > 0), 1);
const injuryPenalty = report => {
  if (!report) return 0;
  const detail = report.description.toLowerCase();
  if (/out .*1a|non ci sar[aà].*1a/.test(detail)) return 12;
  if (/da valutare|a rischio|rischio forfait/.test(detail)) return 5;
  return 8;
};

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
const goalkeeperHierarchyByTeam = Object.fromEntries(goalkeeperHierarchySource.teams.map(entry => [entry.teamId, entry]));
const goalkeeperPrimaryIds = new Set(goalkeeperHierarchySource.teams.flatMap(entry => entry.primaryIds));
const candidates = [];
for (const team of teamFiles) {
  for (const player of team.squad || []) {
    if (!activeFantasyPlayerIds.has(player.id)) continue;
    const totals = player.previousSeason?.totals || {};
    const entries = player.previousSeason?.entries || [];
    const fantasyHistory = fantasyHistoryByPlayerId.get(player.id) || null;
    const externalHistory = fantasyExternalByPlayerId.get(player.id) || null;
    const fantasyStat = fantasyStatsByPlayerId.get(player.id) || null;
    const fantasyQuotation = fantasyQuotationByPlayerId.get(player.id) || null;
    const probable = probableByPlayerId.get(player.id) || null;
    const injury = injuryByPlayerId.get(player.id) || null;
    const role = fantasyQuotation?.role || roleCode(player.role);
    const appearances = fantasyStat ? number(fantasyStat.appearancesWithVote) : Number.isFinite(externalHistory?.totals?.appearances) ? externalHistory.totals.appearances : number(totals.appearances);
    const starts = Number.isFinite(externalHistory?.totals?.starts) ? externalHistory.totals.starts : number(totals.starts);
    const minutes = Number.isFinite(externalHistory?.totals?.minutes) ? externalHistory.totals.minutes : number(totals.minutes);
    const goals = fantasyStat ? number(fantasyStat.goalsFor) : number(totals.goals);
    const assists = fantasyStat ? number(fantasyStat.assists) : number(totals.assists);
    const cleanSheets = number(totals.cleanSheets);
    const saves = number(totals.saves);
    const yellowCards = fantasyStat ? number(fantasyStat.yellowCards) : Number.isFinite(externalHistory?.totals?.yellowCards) ? externalHistory.totals.yellowCards : number(totals.yellowCards);
    const dismissals = fantasyStat ? number(fantasyStat.redCards) : Number.isFinite(externalHistory?.totals?.redCards) ? externalHistory.totals.redCards : number(totals.secondYellowCards) + number(totals.straightRedCards);
    const penaltiesMissed = fantasyStat ? number(fantasyStat.penaltiesMissed) : Number.isFinite(totals.penaltiesTaken) && Number.isFinite(totals.penaltiesScored)
      ? Math.max(0, totals.penaltiesTaken - totals.penaltiesScored)
      : null;
    const penaltiesSaved = fantasyStat ? number(fantasyStat.penaltiesSaved) : number(totals.penaltiesSaved);
    const ownGoals = fantasyStat ? number(fantasyStat.ownGoals) : number(totals.ownGoals);
    const averageRating = fantasyStat && fantasyStat.averageRating > 0 ? number(fantasyStat.averageRating) : null;
    const fantasyAverage = fantasyStat && fantasyStat.fantasyAverage > 0 ? number(fantasyStat.fantasyAverage) : null;
    const serieAMinutes = entries.filter(entry => entry.competition === "Serie A").reduce((sum, entry) => sum + number(entry.minutes), 0);
    const serieBMinutes = entries.filter(entry => entry.competition === "Serie B").reduce((sum, entry) => sum + number(entry.minutes), 0);
    const leagueMinutes = serieAMinutes + serieBMinutes;
    const serieAAppearances = entries.filter(entry => entry.competition === "Serie A").reduce((sum, entry) => sum + number(entry.appearances), 0);
    const leagueAppearances = entries.reduce((sum, entry) => sum + number(entry.appearances), 0);
    const serieAShare = leagueMinutes > 0 ? serieAMinutes / leagueMinutes : leagueAppearances > 0 ? serieAAppearances / leagueAppearances : 0;
    const competitionCoefficient = round(.72 + serieAShare * .28, 2);
    const availability = clamp((minutes / 2600) * 55 + (starts / 30) * 30 + (appearances / 34) * 15, 0, 100);
    const fantasyEventPoints = goals * 3 + assists - yellowCards * .5 - dismissals - (penaltiesMissed || 0) * 3 + penaltiesSaved * 3 - ownGoals * 3;
    const fantasyPointsPerAppearance = appearances > 0 ? fantasyEventPoints / appearances : null;
    const eventIndex = clamp(50 + number(fantasyPointsPerAppearance) * 45, 0, 100);
    const observedIndex = fantasyStat
      ? clamp((50 + (averageRating - 6) * 50) * .45 + (50 + (fantasyAverage - averageRating) * 30) * .55, 0, 100)
      : null;
    const rawScore = fantasyStat
      ? availability * .3 * (.82 + competitionCoefficient * .18) + eventIndex * .25 * competitionCoefficient + observedIndex * .3 * competitionCoefficient + teamCalendar[team.id].index * .15
      : availability * .4 * (.82 + competitionCoefficient * .18) + eventIndex * .45 * competitionCoefficient + teamCalendar[team.id].index * .15;
    const currentScore = (probable && Number.isFinite(probable.probability) ? rawScore * .92 + probable.probability * .08 : rawScore) - injuryPenalty(injury);
    if (!fantasyStat && number(totals.appearances) === 0 && number(totals.minutes) === 0 && !goalkeeperPrimaryIds.has(player.id)) continue;
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
      goals: Number.isFinite(fantasyHistory?.goalsFor) ? fantasyHistory.goalsFor : externalHistory?.totals?.goals ?? totals.goals ?? null,
      assists: Number.isFinite(fantasyHistory?.assists) ? fantasyHistory.assists : externalHistory?.totals?.assists ?? totals.assists ?? null,
      score: round(clamp(currentScore, 1, 99)),
      marketValueEur: player.marketValue?.amountEur ?? null,
      marketValueLabel: player.marketValue?.label ?? null,
      reliability: fantasyStat ? (appearances >= 28 ? "Alta" : appearances >= 15 ? "Media" : "Da verificare") : minutes >= 2200 ? "Alta" : minutes >= 1100 ? "Media" : "Da verificare",
      goalkeeperStatus: role === "P"
        ? (goalkeeperHierarchyByTeam[team.id]?.primaryIds.includes(player.id) ? goalkeeperHierarchyByTeam[team.id].label : goalkeeperHierarchyByTeam[team.id] ? "Alternativa" : "Da valutare")
        : null,
      fantasyScoring: {
        points: round(fantasyEventPoints, 2),
        pointsPerAppearance: fantasyPointsPerAppearance === null ? null : round(fantasyPointsPerAppearance, 2),
        goals,
        assists,
        yellowCards,
        dismissals,
        penaltiesMissed,
        penaltiesSaved,
        ownGoals,
        averageRating,
        fantasyAverage,
        source: fantasyStat ? fantasyWorkbook.provider : externalHistory ? (fantasyHistory ? `${fantasyWorkbook.provider} (G/A) + ESPN Core` : "ESPN Core") : fantasyHistory ? `${fantasyWorkbook.provider} (G/A)` : "Statistiche squadra 2025/26",
        appearancesWithVoteProxy: appearances,
        unavailableMatches: Math.max(0, 38 - appearances),
        unavailableTreatment: "SV: escluso dalla media"
      },
      competitionProfile: {
        serieAMinutes,
        serieBMinutes,
        serieAShare: round(serieAShare * 100),
        coefficient: competitionCoefficient,
        label: serieAShare >= .8 ? "Serie A" : serieAShare <= .2 ? "Serie B" : "Serie A / B"
      },
      calendar: { index: teamCalendar[team.id].index, label: teamCalendar[team.id].label },
      currentAvailability: {
        matchday: probableLineups.matchday,
        callupStatus: callupByPlayerId.get(player.id) || null,
        starterProbability: probable?.probability ?? null,
        lineupStatus: probable?.lineupStatus ?? null,
        lineupUpdatedAt: probable ? probableLineups.teams.find(item => item.teamId === team.id)?.updatedAt ?? null : null,
        injuryReported: Boolean(injury),
        injuryDetail: injury?.description ?? null,
        injuryPenalty: injuryPenalty(injury)
      },
      quotations: fantasyQuotation ? {
        sourceId: fantasyQuotation.sourceId,
        classic: fantasyQuotation.currentQuotation,
        classicInitial: fantasyQuotation.initialQuotation,
        mantra: fantasyQuotation.currentMantraQuotation,
        mantraInitial: fantasyQuotation.initialMantraQuotation,
        mantraRole: fantasyQuotation.mantraRole,
        fvm: fantasyQuotation.fvm,
        mantraFvm: fantasyQuotation.mantraFvm
      } : null
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
  const roleFvmMax = Math.max(...candidates.filter(player => player.role === role && Number.isFinite(player.quotations?.fvm)).map(player => player.quotations.fvm), 1);
  candidates.filter(player => player.role === role && Number.isFinite(player.quotations?.fvm)).forEach(player => {
    const fvmIndex = 100 * player.quotations.fvm / roleFvmMax;
    player.score = round(clamp(player.score * .85 + fvmIndex * .15, 1, 99));
  });
  const group = candidates.filter(player => player.role === role).sort((a, b) => b.score - a.score);
  group.forEach((player, index) => {
    const percentile = index / Math.max(1, group.length);
    player.stars = percentile < .1 ? 5 : percentile < .25 ? 4 : percentile < .5 ? 3 : percentile < .75 ? 2 : 1;
    if (player.competitionProfile.serieAShare <= 20) player.stars = Math.min(player.stars, 4);
    const roleMax = { P: 38, D: 45, C: 85, A: 185 }[role];
    player.value500 = Math.max(1, Math.round(1 + Math.pow(player.score / 100, 2.15) * roleMax));
  });
}

for (const player of candidates) {
  player.auctionValue1000 = Number.isFinite(player.quotations?.fvm)
    ? Math.max(1, Math.round(player.quotations.fvm / maxClassicFvm * 250))
    : Math.max(1, Math.round(Math.pow(player.score / 100, 2.15) * 250));
}

function buildGoalkeeperTrios() {
  const bestByTeam = [...candidates.filter(player => player.role === "P").reduce((map, player) => {
    const hierarchy = goalkeeperHierarchyByTeam[player.teamId];
    if (hierarchy?.trioEligible && hierarchy.primaryIds.length === 1 && player.id === hierarchy.primaryIds[0]) map.set(player.teamId, player);
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
            auctionValue1000: player.auctionValue1000,
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
  pricing: {
    defaultMode: "auction",
    defaultParticipants: 8,
    participantFactors: { 6: .88, 8: 1, 10: 1.12 },
    maxPlayerBudgetShare: .25,
    maxClassicFvm,
    classicDefinition: "La quotazione Classic ufficiale è mostrata senza adattamenti al budget o al numero di partecipanti.",
    auctionDefinition: "Il massimo d'asta normalizza l'FVM sul miglior calciatore, applica il numero di partecipanti e non supera mai il 25% del budget."
  },
  calendarWindow: 38,
  methodology: {
    scoringRules: { goal: 3, assist: 1, yellowCard: -.5, redCard: -1, penaltyMissed: -3, penaltySaved: 3, ownGoal: -3, didNotPlay: "SV" },
    competitionAdjustment: "Le statistiche di Serie B hanno coefficiente 0,72 rispetto alla Serie A; un calciatore con dati quasi esclusivamente di Serie B non puÃ² ricevere 5 stelle.",
    description: "Indice orientativo costruito da PV, media voto, fantamedia, bonus/malus 2025/26, disponibilità e calendario completo 2026/27. Per i profili collegati al foglio Fantacalcio, MV e FM incidono direttamente sul 30% dell'indice; il valore FVM 2026/27 aggiunge un correttivo del 15% normalizzato all'interno del ruolo. La probabilità editoriale di titolarità della 1ª giornata interviene soltanto per l'8% sul punteggio corrente; una segnalazione nella pagina infortuni applica un correttivo prudente da 5 a 12 punti senza trasformare i casi dubbi in assenze certe.",
    caveat: "Il listone fornito è riportato senza inventare collegamenti: i profili non associati alla rosa corrente restano visibili nel listone ma non ricevono un indice di consiglio.",
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
    },
    fantasyStatistics: {
      provider: fantasyWorkbook.provider,
      sourceFile: fantasyWorkbook.sourceFile,
      season: fantasyWorkbook.season,
      matchedPlayers: fantasyWorkbook.coverage.matchedCurrentPlayers,
      use: "PV, MV, FM, gol, assist, cartellini, rigori parati/sbagliati e autogol."
    },
    fantasyExternalStatistics: {
      provider: fantasyExternalStats.provider,
      season: fantasyExternalStats.season,
      generatedAt: fantasyExternalStats.generatedAt,
      coveredPlayers: fantasyExternalStats.players.length,
      use: "Presenze, titolarita, minuti, gol, assist e cartellini dei campionati nazionali 2025/26 collegati tramite ID ESPN."
    },
    fantasyQuotations: {
      provider: fantasyQuotations.provider,
      sourceFile: fantasyQuotations.sourceFile,
      season: fantasyQuotations.season,
      activePlayers: fantasyQuotations.coverage.activePlayers,
      matchedPlayers: fantasyQuotations.coverage.matchedCurrentPlayers,
      use: "Quotazioni Classic e Mantra, ruoli Mantra e FVM; FVM applicato come correttivo di ruolo al 15%."
    },
    callups: {
      provider: fantasyCallups.provider,
      url: fantasyCallups.sourceUrl,
      importedAt: fantasyCallups.importedAt,
      matchday: fantasyCallups.matchday,
      coverage: fantasyCallups.coverage,
      use: fantasyCallups.interpretation
    },
    probableLineups: {
      provider: probableLineups.provider,
      url: probableLineups.sourceUrl,
      importedAt: probableLineups.importedAt,
      matchday: probableLineups.matchday,
      coverage: probableLineups.coverage,
      use: probableLineups.interpretation
    },
    injuries: {
      provider: fantasyInjuries.provider,
      url: fantasyInjuries.sourceUrl,
      importedAt: fantasyInjuries.importedAt,
      coverage: fantasyInjuries.coverage,
      use: fantasyInjuries.interpretation
    },
    goalkeeperHierarchy: {
      provider: goalkeeperHierarchySource.provider,
      title: goalkeeperHierarchySource.title,
      url: goalkeeperHierarchySource.url,
      publishedAt: goalkeeperHierarchySource.publishedAt,
      importedAt: goalkeeperHierarchySource.importedAt,
      use: goalkeeperHierarchySource.interpretation
    },
    teamLogos: {
      provider: "Dataset locale squadre Serie A 2026/27",
      variant: "color",
      use: "Loghi colorati canonici nella pagina Fantacalcio."
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
    method: "Tre primi portieri con gerarchia chiara, di squadre diverse ed entro il 7% del budget. Per ogni giornata viene scelto il portiere con la partita più favorevole; il punteggio premia copertura del calendario e qualità individuale.",
    examples: goalkeeperTrios
  },
  goalkeeperHierarchy: Object.fromEntries(goalkeeperHierarchySource.teams.map(entry => [entry.teamId, { primaryIds: entry.primaryIds, status: entry.status, label: entry.label, trioEligible: entry.trioEligible, source: goalkeeperHierarchySource.provider }])),
  starGuide: {
    5: "Top di ruolo: priorita d'asta e investimento importante.",
    4: "Titolare di alto valore: obiettivo forte con prezzo controllato.",
    3: "Buon titolare o prima rotazione, da incrociare con il calendario.",
    2: "Alternativa utile: acquistare a costo contenuto.",
    1: "Scommessa o copertura profonda, da verificare prima dell'asta."
  },
  slotGuide: {
    A: "Punto fermo: alto investimento e priorità d'asta.",
    B: "Titolare di valore: obiettivo forte con prezzo controllato.",
    C: "Rotazione utile: profilo da incrociare con calendario e titolarità.",
    D: "Scommessa o copertura: acquistare solo a costo contenuto."
  },
  teams: teams.map(team => ({
    id: team.id,
    name: team.name,
    logo: team.logo,
    fantasyLogo: team.id === "juventus" ? "assets/images/teams/juventus.png" : team.logo,
    strength: strengthDetails.get(team.id),
    calendar: teamCalendar[team.id]
  })),
  listone: {
    provider: fantasyQuotations.provider,
    sourceFile: fantasyQuotations.sourceFile,
    importedAt: fantasyQuotations.importedAt,
    definitions: fantasyQuotations.definitions,
    coverage: fantasyQuotations.coverage,
    players: fantasyQuotations.players.map(player => {
      const probable = probableBySourceId.get(String(player.sourceId));
      const injury = injuryBySourceId.get(String(player.sourceId));
      const callup = callupBySourceId.get(String(player.sourceId));
      const fantasyHistory = fantasyHistoryBySourceId.get(String(player.sourceId));
      const externalHistory = fantasyExternalByPlayerId.get(player.playerId) || null;
      return ({
      sourceId: player.sourceId,
      playerId: player.playerId,
      name: player.name,
      currentName: player.currentName,
      team: player.team,
      teamId: player.teamId,
      role: player.role,
      mantraRole: player.mantraRole,
      currentQuotation: player.currentQuotation,
      initialQuotation: player.initialQuotation,
      quotationDifference: player.quotationDifference,
      currentMantraQuotation: player.currentMantraQuotation,
      initialMantraQuotation: player.initialMantraQuotation,
      mantraQuotationDifference: player.mantraQuotationDifference,
      fvm: player.fvm,
      auctionValue1000: Number.isFinite(player.fvm) ? Math.max(1, Math.round(player.fvm / maxClassicFvm * 250)) : null,
      mantraFvm: player.mantraFvm,
      matchConfidence: player.matchConfidence,
      appearances: externalHistory?.totals?.appearances ?? null,
      minutes: externalHistory?.totals?.minutes ?? null,
      goals: Number.isFinite(fantasyHistory?.goalsFor) ? fantasyHistory.goalsFor : externalHistory?.totals?.goals ?? null,
      assists: Number.isFinite(fantasyHistory?.assists) ? fantasyHistory.assists : externalHistory?.totals?.assists ?? null,
      yellowCards: externalHistory?.totals?.yellowCards ?? null,
      redCards: externalHistory?.totals?.redCards ?? null,
      currentAvailability: {
        matchday: probableLineups.matchday,
        callupStatus: callup?.status ?? null,
        starterProbability: probable?.probability ?? null,
        lineupStatus: probable?.lineupStatus ?? null,
        lineupUpdatedAt: probable ? probableLineups.teams.find(item => item.teamId === player.teamId)?.updatedAt ?? null : null,
        injuryReported: Boolean(injury),
        injuryDetail: injury?.description ?? null
      }
    });}),
    departed: fantasyQuotations.departed
  },
  players: candidates
};

const target = path.join(root, "data/generated/fantacalcio-advice.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Fantacalcio: ${candidates.length} calciatori valutati.`);
