"use strict";

const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs = require("node:fs");
const path = require("node:path");
const { poissonAtLeast } = require("./predictions/engine");

const root = path.resolve(__dirname, "..");
const read = relative => storageReadJson(path.join(root, relative));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const round = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
const pct = value => Number.isFinite(Number(value)) ? `${round(Number(value) * (Number(value) <= 1 ? 100 : 1), 1)}%` : "N/D";
const num = value => Number.isFinite(Number(value)) ? round(value, 2) : "N/D";
const fair = probabilityPct => Number(probabilityPct) > 0 ? round(100 / Number(probabilityPct), 2) : null;
const ev = (probabilityPct, oddsValue) => Number.isFinite(Number(probabilityPct)) && Number.isFinite(Number(oddsValue))
  ? round(Number(probabilityPct) / 100 * Number(oddsValue) * 100 - 100, 2)
  : null;
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|")).join(" | ")} |`),
].join("\n");

const input = read("output/reports/_tmp-two-official-predictions.json");
const schedina = read("data/normalized/schedina-md06.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");

const fixtures = {
  "lazio-monza-2026-27-md-06": {
    fixture: "Lazio–Monza",
    slug: "lazio-monza",
    kickoff: "2026-10-11T15:00:00+02:00",
    sources: [
      { label: "S.S. Lazio — formazioni ufficiali", url: "https://www.sslazio.it/it/news/match-report/serie-a-enilive-or-lazio-monza-le-formazioni-ufficiali-a" },
      { label: "Diretta.it — distinta fornita dall'utente", url: "https://www.diretta.it/partita/calcio/lazio-URcSl02h/monza-4YSMlwj7/riassunto/formazioni/?mid=69bHPmA4" },
      { label: "AC Monza — convocati", url: "https://www.acmonza.com/it/news/lazio-monza-i-convocati-101026/" }
    ],
    teams: [
      {
        team: "Lazio", teamId: "lazio", formation: "4-3-3", coach: "Gennaro Gattuso",
        starters: [
          ["Christos Mandas", "Portiere"], ["Nuno Tavares", "Terzino sinistro"], ["Oliver Provstgaard", "Difensore centrale"], ["Danilho Doekhi", "Difensore centrale"], ["Romano Floriani", "Terzino destro"],
          ["Kenneth Taylor", "Mezzala sinistra"], ["Reda Belahyane", "Regista"], ["Davide Frattesi", "Mezzala destra"], ["Mattia Zaccagni", "Ala sinistra"], ["Tijjani Noslin", "Centravanti"], ["Gustav Isaksen", "Ala destra"]
        ],
        bench: ["Motta", "Renzetti", "Leite", "Dele-Bashiru", "Pinamonti", "Pedraza", "Przyborek", "Lazzari", "Cataldi", "Šutalo", "Serra", "Farcomeni"],
        mainSubs: [
          ["Andrea Pinamonti", "alternativa a Noslin; minuti/probabilità d'ingresso N/D"],
          ["Fisayo Dele-Bashiru", "alternativa nelle mezzali; minuti/probabilità d'ingresso N/D"],
          ["Manuel Lazzari", "alternativa sulla fascia destra; minuti/probabilità d'ingresso N/D"],
          ["Danilo Cataldi", "alternativa in regia; minuti/probabilità d'ingresso N/D"]
        ],
        unavailable: ["Gudmundsson: stop al braccio confermato prepartita", "Rovella, Cancellieri e Marusic: non convocati; natura/tempi non trasformati in dati modellistici"]
      },
      {
        team: "Monza", teamId: "monza", formation: "3-4-2-1", coach: "Ivan Juric",
        starters: [
          ["Noel Törnqvist", "Portiere"], ["Eddy Kouadio", "Braccetto destro"], ["Lorenzo Lucchesi", "Difensore centrale"], ["Andrea Carboni", "Braccetto sinistro"], ["Samuele Birindelli", "Esterno destro"],
          ["Cyril Ngonge", "Centrocampista offensivo"], ["Ebenezer Akinsanmiro", "Centrocampista"], ["Ricardo Mangas", "Esterno sinistro"], ["Michael Folorunsho", "Trequartista"], ["Zeballos", "Trequartista"], ["Gustavo Varela", "Centravanti"]
        ],
        bench: ["Thiam", "Strajnar", "Goglichidze", "Maye", "Antov", "Foe Ondoa", "Cutrone", "Colombo", "Bakoune", "Colpani", "Robinson", "Dany Mota", "Mout"],
        mainSubs: [
          ["Patrick Cutrone", "prima alternativa offensiva; minuti/probabilità d'ingresso N/D"],
          ["Andrea Colpani", "alternativa tra le linee; minuti/probabilità d'ingresso N/D"],
          ["Dany Mota", "alternativa offensiva; minuti/probabilità d'ingresso N/D"],
          ["Leonardo Colombo", "alternativa a centrocampo; minuti/probabilità d'ingresso N/D"]
        ],
        unavailable: ["Matteo Pessina, Jan Ziólkowski e Idrissa Touré: segnalati indisponibili e assenti dai convocati", "Ciurria: assente dalla distinta; motivazione non usata dal modello"]
      }
    ],
    matchupNotes: [
      "Lazio: produzione fortemente orientata a sinistra (54,1%); Zaccagni, Taylor e Tavares concentrano il vantaggio posizionale contro il lato destro del 3-4-2-1.",
      "Monza: ampiezza simmetrica (40,9% a sinistra e 40,9% a destra); Birindelli e Mangas sono i terminali laterali, mentre il centro pesa solo 18,2%.",
      "Il cambio Cutrone/Robinson → Ngonge/Zeballos non modifica il totale squadra, ma porta più volume su Ngonge e Varela; Zeballos ha minuti attesi bassi e affidabilità ridotta.",
      "Il modello applica alla Lazio una lieve soppressione tiri da matchup (-1,53%); sul Monza il segnale avversario resta neutro/watch."
    ],
    volumePicks: ["Monza Over 2,5 corner", "Lazio Over 3,5 corner", "Lazio multigoal 1-3", "Multigoal 2-5"],
    playerPicks: [
      { player: "Samuele Birindelli", metric: "shots", threshold: 1, label: "Samuele Birindelli e suo eventuale sostituto 1+ tiri", tier: "intermedio" },
      { player: "Mattia Zaccagni", metric: "shots", threshold: 2, label: "Mattia Zaccagni e suo eventuale sostituto 2+ tiri", tier: "intermedio" },
      { player: "Michael Folorunsho", metric: "shots", threshold: 2, label: "Michael Folorunsho e suo eventuale sostituto 2+ tiri", tier: "outsider" },
      { player: "Gustavo Varela", metric: "shots", threshold: 3, label: "Gustavo Varela e suo eventuale sostituto 3+ tiri", tier: "outsider" },
      { player: "Gustavo Varela", metric: "sot", threshold: 2, label: "Gustavo Varela e suo eventuale sostituto 2+ tiri in porta (pali e traverse inclusi)", tier: "outsider" }
    ],
    solidIds: ["team-goal:SI:home", "goals:OVER:1.5", "double-chance:12:main", "double-chance:1X:main"],
    intermediateIds: ["team-goal:SI:away", "goals:OVER:2.5", "btts:GOAL:main", "goals:UNDER:3.5"],
    outsiderIds: ["1x2:2:main", "draw-no-bet:2:main"]
  },
  "lecce-bologna-2026-27-md-06": {
    fixture: "Lecce–Bologna",
    slug: "lecce-bologna",
    kickoff: "2026-10-11T15:00:00+02:00",
    sources: [
      { label: "Diretta.it — distinta fornita dall'utente", url: "https://www.diretta.it/partita/calcio/bologna-0M9xNN8N/lecce-G8lYsMgU/riassunto/formazioni/?mid=C61PNRvH" },
      { label: "Convocati Lecce prepartita", url: "https://www.tuttomercatoweb.com/serie-a/lecce-bologna-convocati-francesco-assenti-manchera-stulic-2281838" },
      { label: "Convocati Bologna prepartita", url: "https://www.calciobologna.it/2026/10/10/lecce-bologna-convocati-palladino-serie-a-2026-27/" },
      { label: "US Lecce — designazione arbitrale", url: "https://uslecce.it/lecce-bologna-la-designazione-arbitrale/" }
    ],
    teams: [
      {
        team: "Lecce", teamId: "lecce", formation: "4-3-3", coach: "Eusebio Di Francesco",
        starters: [
          ["Wladimiro Falcone", "Portiere"], ["Danilo Veiga", "Terzino destro"], ["Tiago Gabriel", "Difensore centrale"], ["Jamil Siebert", "Difensore centrale"], ["Antonino Gallo", "Terzino sinistro"],
          ["Lassana Coulibaly", "Mezzala destra"], ["Ivan Ilic", "Regista"], ["Youssef Maleh", "Mezzala sinistra"], ["Santiago Pierotti", "Ala destra"], ["Paco Esteban", "Centravanti"], ["Amar Fatah", "Ala sinistra"]
        ],
        bench: ["Bleve", "Borbei", "Dembélé", "Gaspar", "Jean", "Ndaba", "Fofana", "Gandelman", "Gorter", "Kaba", "Ngom", "Geubbels", "Monteiro", "N’Dri"],
        mainSubs: [
          ["Willem Geubbels", "alternativa al centravanti; minuti/probabilità d'ingresso N/D"],
          ["Joël Monteiro", "alternativa sul fronte offensivo; minuti/probabilità d'ingresso N/D"],
          ["Konan N’Dri", "alternativa esterna; minuti/probabilità d'ingresso N/D"],
          ["Omri Gandelman", "alternativa tra centrocampo e trequarti; minuti/probabilità d'ingresso N/D"]
        ],
        unavailable: ["Medon Berisha", "Nikola Stulic", "Elliot Scott"]
      },
      {
        team: "Bologna", teamId: "bologna", formation: "3-4-2-1", coach: "Raffaele Palladino",
        starters: [
          ["Massimo Pessina", "Portiere"], ["Nicolo Casale", "Braccetto destro"], ["Nadir Zortea", "Difensore centrale"], ["Torbjørn Heggem", "Braccetto sinistro"], ["Matteo Darmian", "Esterno destro"],
          ["Lewis Ferguson", "Centrocampista"], ["Tommaso Pobega", "Centrocampista"], ["Juan Miranda", "Esterno sinistro"], ["Riccardo Orsolini", "Trequartista destro"], ["Nicolò Cambiaghi", "Trequartista sinistro"], ["Roberto Piccoli", "Centravanti"]
        ],
        bench: ["Happonen", "Skorupski", "Alhassane", "De Silvestri", "Helland", "Theate", "Vitík", "Amondarain", "El Azzouzi", "Libra", "Moro", "Bernardeschi", "Dovbyk", "Enem"],
        mainSubs: [
          ["Artem Dovbyk", "alternativa a Piccoli; minuti/probabilità d'ingresso N/D"],
          ["Federico Bernardeschi", "alternativa tra le linee; minuti/probabilità d'ingresso N/D"],
          ["Nikola Moro", "alternativa in mediana; minuti/probabilità d'ingresso N/D"],
          ["Arthur Theate", "alternativa nella linea a tre; minuti/probabilità d'ingresso N/D"]
        ],
        unavailable: ["Emil Holm", "Jens Odgaard", "Samuel Mbangula"]
      }
    ],
    lineupAnomaly: "Nell'immagine Diretta.it compaiono 12 etichette sul lato Bologna e Törnqvist è duplicato dal match del Monza. La ricostruzione coerente a 11 usa Pessina in porta e Casale–Zortea–Heggem nella linea a tre, incrociando modulo, numeri di maglia e convocati.",
    matchupNotes: [
      "Lecce: il 59,9% del volume passa dal lato destro, con Pierotti e Coulibaly come principali beneficiari; il centro vale solo 9,9%.",
      "Bologna: il 61,8% è orientato a sinistra, dove Cambiaghi, Ferguson/Pobega e Miranda attaccano il lato di Veiga; il Lecce mostra vulnerabilità corrente elevata su tiri e SOT.",
      "Il matchup aggiunge al Bologna +0,79% sui tiri e +0,78% sui SOT; il Lecce resta senza interazione avversaria attiva per copertura insufficiente.",
      "Darmian è titolare ufficiale ma non è censito nel dataset giocatori: il motore assegna un residuo generico di ruolo al totale squadra, che il report non trasforma in statistica individuale."
    ],
    volumePicks: ["Lecce Over 2,5 tiri in porta", "Lecce Over 3,5 corner", "Partita Over 7,5 corner", "Partita Over 21,5 tiri totali", "Bologna Over 10,5 tiri totali", "Bologna Over 3,5 tiri in porta"],
    playerPicks: [
      { player: "Roberto Piccoli", metric: "sot", threshold: 1, label: "Roberto Piccoli e suo eventuale sostituto 1+ tiri in porta (pali e traverse inclusi)", tier: "intermedio" },
      { player: "Roberto Piccoli", metric: "shots", threshold: 3, label: "Roberto Piccoli e suo eventuale sostituto 3+ tiri", tier: "outsider" },
      { player: "Lassana Coulibaly", metric: "sot", threshold: 1, label: "Lassana Coulibaly e suo eventuale sostituto 1+ tiri in porta (pali e traverse inclusi)", tier: "outsider" },
      { player: "Amar Fatah", metric: "shots", threshold: 2, label: null, tier: "outsider" },
      { player: "Riccardo Orsolini", metric: "shots", threshold: 2, label: null, tier: "intermedio" }
    ],
    solidIds: ["team-goal:SI:away", "double-chance:X2:main", "goals:UNDER:3.5", "double-chance:12:main", "goals:OVER:1.5", "draw-no-bet:2:main"],
    intermediateIds: ["1x2:2:main", "btts:NOGOAL:main", "goals:UNDER:2.5"],
    outsiderIds: ["1x2:1:main", "goals:OVER:3.5"]
  }
};

function reliability(player) {
  if (!player || player.playerId == null || player.dataStatus === "role-baseline") return "N/D";
  if (player.dataStatus === "strong-history" && ["high", "medium"].includes(player.playerBaselineStability?.level)) return "Alta";
  if (["strong-history", "verified-history"].includes(player.dataStatus) && player.playerBaselineStability?.level !== "unknown") return "Media";
  return "Bassa";
}

function marketId(prediction, id) {
  if (id === "team-goal:SI:home") return prediction.marketComparison.find(row => row.id === "team-goal:SI:main" && row.market === "Casa segna");
  if (id === "team-goal:SI:away") return prediction.marketComparison.find(row => row.id === "team-goal:SI:main" && row.market === "Ospite segna");
  return prediction.marketComparison.find(row => row.id === id);
}

function buildReport(matchId, config) {
  const prediction = input.predictions.find(row => row.matchId === matchId);
  const catalog = schedina.marketCatalog.matches.find(row => row.matchId === matchId);
  const allPlayers = prediction.shooters.allPlayers || [];
  const playerByName = name => allPlayers.find(row => norm(row.name) === norm(name));
  const starters = config.teams.flatMap(team => team.starters.map(([name, effectiveRole], index) => {
    const player = playerByName(name);
    const goalkeeper = index === 0;
    const unresolved = !goalkeeper && (!player || player.playerId == null || player.dataStatus === "role-baseline");
    const lambdaShots = unresolved || goalkeeper ? null : player.projectedShots;
    const lambdaSot = unresolved || goalkeeper ? null : player.projectedShotsOnTarget;
    return {
      teamId: team.teamId, team: team.team, name, effectiveRole, goalkeeper,
      playerId: player?.playerId ?? null,
      expectedMinutes: goalkeeper ? null : player?.expectedMinutes ?? null,
      projectedShots: lambdaShots,
      projectedShotsOnTarget: lambdaSot,
      internalFallbackShots: unresolved ? player?.projectedShots ?? null : null,
      internalFallbackShotsOnTarget: unresolved ? player?.projectedShotsOnTarget ?? null : null,
      probabilities: {
        shots1Plus: lambdaShots == null ? null : poissonAtLeast(lambdaShots, 1),
        shots2Plus: lambdaShots == null ? null : poissonAtLeast(lambdaShots, 2),
        shots3Plus: lambdaShots == null ? null : poissonAtLeast(lambdaShots, 3),
        shots4Plus: lambdaShots == null ? null : poissonAtLeast(lambdaShots, 4),
        sot1Plus: lambdaSot == null ? null : poissonAtLeast(lambdaSot, 1),
        sot2Plus: lambdaSot == null ? null : poissonAtLeast(lambdaSot, 2)
      },
      reliability: goalkeeper ? "N/D — portiere fuori Player Market V2" : unresolved ? "N/D — fallback generico non pubblicato come dato individuale" : `${reliability(player)} · ${player.dataStatus} · stabilità ${player.playerBaselineStability?.level || "N/D"}`,
      matchup: goalkeeper ? "Portiere escluso dal Player Market V2." : unresolved ? "Ruolo effettivo dalla distinta; matchup individuale non pubblicato per identità non risolta." : (player.matchupEvidence || []).join("; ")
    };
  }));
  const teamProjection = new Map(prediction.teamProjections.map(row => [row.teamId, row]));
  const collective = config.teams.map(team => {
    const projection = teamProjection.get(team.teamId);
    const playerRows = allPlayers.filter(row => row.teamId === team.teamId);
    const trusted = starters.filter(row => row.teamId === team.teamId && row.projectedShots != null);
    return {
      teamId: team.teamId, team: team.team,
      shots: projection.shotsTotal,
      shotsOnTarget: projection.shotsOnTarget,
      expectedGoals: projection.expectedGoals,
      corners: projection.corners,
      attackChannels: projection.attackChannels,
      possessionHistoricalProxyPct: projection.opponentMatchupInteraction?.abilityToExploit?.inputs?.possessionPct ?? null,
      territorialAbilityProxy: projection.opponentMatchupInteraction?.abilityToExploit?.territorial ?? null,
      opponentAdjustment: {
        direction: projection.opponentMatchupInteraction?.direction ?? "inactive",
        shotsPct: projection.opponentMatchupInteraction?.shotsAdjustmentPct ?? 0,
        shotsOnTargetPct: projection.opponentMatchupInteraction?.shotsOnTargetAdjustmentPct ?? 0
      },
      reconciliation: {
        enginePlayerShots: round(playerRows.reduce((sum, row) => sum + Number(row.projectedShots || 0), 0)),
        enginePlayerShotsOnTarget: round(playerRows.reduce((sum, row) => sum + Number(row.projectedShotsOnTarget || 0), 0)),
        publishedIndividualShots: round(trusted.reduce((sum, row) => sum + Number(row.projectedShots || 0), 0)),
        publishedIndividualShotsOnTarget: round(trusted.reduce((sum, row) => sum + Number(row.projectedShotsOnTarget || 0), 0)),
        unresolvedFallbackShots: round(starters.filter(row => row.teamId === team.teamId).reduce((sum, row) => sum + Number(row.internalFallbackShots || 0), 0)),
        unresolvedFallbackShotsOnTarget: round(starters.filter(row => row.teamId === team.teamId).reduce((sum, row) => sum + Number(row.internalFallbackShotsOnTarget || 0), 0))
      }
    };
  });
  const volumeMarkets = config.volumePicks.map(label => catalog.selections.find(row => row.label === label)).filter(Boolean).map(row => ({
    label: row.label,
    probabilityPct: row.betSelection.evaluation.modelProbabilityPct,
    odds: row.betSelection.quote.decimal,
    fairOdds: row.betSelection.evaluation.fairOdds,
    expectedValuePct: row.betSelection.evaluation.expectedValuePct,
    reliability: row.betSelection.operational.reliability.level,
    source: row.catalogOrigin,
    note: "Probabilità del modello statistico di volume già presente nel repository; separata dal Player Market V2."
  }));
  const resultMarket = (id, tier) => {
    const row = marketId(prediction, id);
    return row ? {
      tier, label: `${row.market} — ${row.selection}`,
      probabilityPct: row.modelProbabilityPct, odds: row.odds, fairOdds: row.fairOdds,
      expectedValuePct: row.expectedValuePct, reliability: row.confidence,
      note: row.classification
    } : null;
  };
  const individualMarkets = config.playerPicks.map(selection => {
    const player = playerByName(selection.player);
    const lambda = selection.metric === "sot" ? player?.projectedShotsOnTarget : player?.projectedShots;
    const probabilityPct = player && player.playerId != null && player.dataStatus !== "role-baseline" && Number.isFinite(lambda)
      ? round(poissonAtLeast(lambda, selection.threshold) * 100, 2)
      : null;
    const quoteRow = selection.label ? catalog.selections.find(row => row.label === selection.label) : null;
    return {
      tier: selection.tier,
      label: selection.label || `${selection.player} ${selection.threshold}+ ${selection.metric === "sot" ? "SOT" : "tiri"}`,
      individualReferenceProbabilityPct: probabilityPct,
      odds: quoteRow?.betSelection?.quote?.decimal ?? null,
      fairOdds: null,
      expectedValuePct: null,
      reliability: reliability(player),
      note: quoteRow
        ? "Quota Sisal DUO giocatore + eventuale sostituto; probabilità individuale mostrata solo come riferimento. Quota equa ed EV congiunti N/D."
        : "Quota compatibile non disponibile nel catalogo locale; nessun valore inventato."
    };
  });
  const recommendations = {
    solid: config.solidIds.map(id => resultMarket(id, "solido")).filter(Boolean),
    intermediate: [
      ...config.intermediateIds.map(id => resultMarket(id, "intermedio")).filter(Boolean),
      ...volumeMarkets.filter(row => Number(row.probabilityPct) >= 55),
      ...individualMarkets.filter(row => row.tier === "intermedio")
    ],
    outsiders: [
      ...config.outsiderIds.map(id => resultMarket(id, "outsider")).filter(Boolean),
      ...volumeMarkets.filter(row => Number(row.probabilityPct) < 55),
      ...individualMarkets.filter(row => row.tier === "outsider")
    ]
  };
  const report = {
    schemaVersion: 1,
    reportType: "serie-a-md06-official-pre-match-analysis",
    generatedAt: new Date().toISOString(),
    dataCutoff: "solo dati disponibili prima del kickoff; matchday 6 esclusa dagli actuals",
    matchId, fixture: config.fixture, kickoff: config.kickoff,
    engine: { version: prediction.engineVersion, playerMarketModelVersion: prediction.playerMarketModelVersion, parametersChanged: false, formulasChanged: false },
    sources: config.sources,
    oddsSnapshot: { provider: odds.provider, retrievedAt: odds.retrievedAt, beforeKickoff: new Date(odds.retrievedAt) < new Date(config.kickoff), sourceUrl: odds.sourceUrl },
    formations: config.teams.map(team => ({ team: team.team, teamId: team.teamId, formation: team.formation, coach: team.coach, starters: team.starters.map(([name, role]) => ({ name, role })), bench: team.bench, unavailable: team.unavailable })),
    lineupAnomaly: config.lineupAnomaly || null,
    outcomeProbabilities: prediction.probabilities.final,
    collective,
    starters,
    mainSubstitutes: config.teams.flatMap(team => team.mainSubs.map(([name, note]) => ({ team: team.team, name, starterProbabilityPct: 0, entryProbabilityPct: null, expectedMinutes: null, projectedShots: null, projectedShotsOnTarget: null, note }))),
    cards: {
      status: "COMPARATIVE_HEURISTIC_NOT_PROBABILITY",
      teamEstimates: prediction.teamProjections.map(team => ({ teamId: team.teamId, cards: team.cards })),
      ranking: prediction.likelyBooked.map(row => ({ rank: row.rank, player: row.name, teamId: row.teamId, riskScore: row.riskScore, calibratedProbability: null, directOpponent: row.directOpponent || null })),
      bettingFairOdds: null,
      bettingExpectedValue: null
    },
    matchupNotes: config.matchupNotes,
    recommendations,
    quality: {
      completenessPct: prediction.dataQuality.completenessPct,
      lineupResolved: prediction.dataQuality.lineupResolved,
      outfieldPlayersModeled: prediction.dataQuality.outfieldPlayersModeled,
      monotonicProbabilities: starters.filter(row => row.projectedShots != null).every(row => row.probabilities.shots1Plus >= row.probabilities.shots2Plus && row.probabilities.shots2Plus >= row.probabilities.shots3Plus && row.probabilities.shots3Plus >= row.probabilities.shots4Plus && row.probabilities.sot1Plus >= row.probabilities.sot2Plus),
      teamReconciliation: collective.map(row => ({ teamId: row.teamId, shotsDifference: round(row.reconciliation.enginePlayerShots - row.shots.central), shotsOnTargetDifference: round(row.reconciliation.enginePlayerShotsOnTarget - row.shotsOnTarget.central) }))
    },
    limitations: [
      "Possesso e territorialità sono proxy storici usati nel matchup, non previsioni puntuali della quota di possesso della gara.",
      "I portieri sono fuori dal Player Market V2: minuti, tiri e SOT restano N/D.",
      "Il modello non dispone di probabilità d'ingresso e minuti da subentrante calibrati; nessuna proiezione da titolare viene riutilizzata per la panchina.",
      "I mercati Sisal giocatore includono l'eventuale sostituto; la probabilità individuale V2 non è equivalente al contratto DUO e non genera quota equa o EV.",
      "Il mercato Sisal SOT DUO include pali e traverse; non coincide con il solo shots-on-target del Player Market V2.",
      "Il ranking cartellini è un indice comparativo 0–100, non una probabilità calibrata; quota equa ed EV restano N/D.",
      "N/D significa dato non disponibile, non zero."
    ]
  };

  const starterTable = teamId => table(
    ["Giocatore", "Ruolo", "Min", "xTiri", "xSOT", "1+ T", "2+ T", "3+ T", "4+ T", "1+ SOT", "2+ SOT", "Affidabilità"],
    starters.filter(row => row.teamId === teamId).map(row => [
      row.name, row.effectiveRole,
      row.playerId == null && row.expectedMinutes != null ? `${num(row.expectedMinutes)} (prior ruolo)` : num(row.expectedMinutes),
      num(row.projectedShots), num(row.projectedShotsOnTarget),
      pct(row.probabilities.shots1Plus), pct(row.probabilities.shots2Plus), pct(row.probabilities.shots3Plus), pct(row.probabilities.shots4Plus),
      pct(row.probabilities.sot1Plus), pct(row.probabilities.sot2Plus), row.reliability
    ])
  );
  const pickTable = rows => table(
    ["Pronostico", "Probabilità", "Quota", "Quota equa", "EV", "Affidabilità", "Nota"],
    rows.map(row => [
      row.label,
      pct(row.probabilityPct ?? row.individualReferenceProbabilityPct),
      row.odds ?? "N/D", row.fairOdds ?? "N/D",
      row.expectedValuePct == null ? "N/D" : `${row.expectedValuePct > 0 ? "+" : ""}${round(row.expectedValuePct, 2)}%`,
      row.reliability || "N/D", row.note || ""
    ])
  );
  const teamCollective = table(
    ["Squadra", "Tiri", "Intervallo", "SOT", "Intervallo", "xG", "Corner", "Canali S/C/D", "Possesso proxy"],
    collective.map(row => [
      row.team, num(row.shots.central), `${num(row.shots.min)}–${num(row.shots.max)}`,
      num(row.shotsOnTarget.central), `${num(row.shotsOnTarget.min)}–${num(row.shotsOnTarget.max)}`,
      num(row.expectedGoals), num(row.corners.central),
      `${num(row.attackChannels.left)}% / ${num(row.attackChannels.central)}% / ${num(row.attackChannels.right)}%`,
      row.possessionHistoricalProxyPct == null ? "N/D" : `${num(row.possessionHistoricalProxyPct)}% storico`
    ])
  );
  const outcome = prediction.probabilities.final;
  const markdown = [
    `# ${config.fixture} — analisi prepartita con formazioni ufficiali`,
    "",
    `Motore Serie A ${prediction.engineVersion} e Player Market V${prediction.playerMarketModelVersion}; parametri, pesi, calibrazione e formule invariati. Cutoff: esclusivamente dati pre-kickoff. Quote Sisal del ${odds.retrievedAt}.`,
    "",
    "## 1. Formazioni ufficiali",
    "",
    ...config.teams.flatMap(team => [
      `### ${team.team} · ${team.formation} · allenatore ${team.coach}`,
      "",
      `Titolari: ${team.starters.map(([name]) => name).join(", ")}.`,
      "",
      `Panchina: ${team.bench.join(", ")}.`,
      "",
      `Indisponibili verificati: ${team.unavailable.join("; ") || "N/D"}.`,
      ""
    ]),
    ...(config.lineupAnomaly ? ["### Anomalia della fonte grafica", "", config.lineupAnomaly, ""] : []),
    `Fonti: ${config.sources.map(source => `[${source.label}](${source.url})`).join("; ")}.`,
    "",
    "## 2. Previsione collettiva",
    "",
    teamCollective,
    "",
    `Esito: **1 ${pct(outcome["1"])} · X ${pct(outcome.X)} · 2 ${pct(outcome["2"])}**.`,
    "",
    "I canali S/C/D sono quote di produzione previste per zona. Il possesso, quando presente, è un input storico del matchup e non una previsione puntuale della partita.",
    "",
    "## 3. Tabelle individuali tiri e SOT",
    "",
    ...config.teams.flatMap(team => [`### ${team.team}`, "", starterTable(team.teamId), ""]),
    "Per i portieri il Player Market V2 non produce tiri/SOT. Le soglie individuali usano la distribuzione Poisson del modello; N/D non equivale a zero.",
    "",
    "## 4. Matchup decisivi",
    "",
    ...config.matchupNotes.map(note => `- ${note}`),
    "",
    "## 5. Principali possibili subentranti",
    "",
    table(["Squadra", "Giocatore", "P titolare", "P ingresso", "Minuti", "xTiri/xSOT", "Nota"], report.mainSubstitutes.map(row => [row.team, row.name, "0%", "N/D", "N/D", "N/D", row.note])),
    "",
    "## 6. Pronostici solidi",
    "",
    pickTable(recommendations.solid),
    "",
    "## 7. Pronostici intermedi",
    "",
    pickTable(recommendations.intermediate),
    "",
    "## 8. Outsider interessanti",
    "",
    pickTable(recommendations.outsiders),
    "",
    "Le righe DUO mostrano soltanto la probabilità individuale di riferimento. Poiché la quota copre giocatore più eventuale sostituto — e, nei SOT, anche pali/traverse — quota equa ed EV restano correttamente N/D.",
    "",
    "## 9. Cartellini",
    "",
    table(["#", "Giocatore", "Squadra", "Risk score", "Probabilità", "Quota equa/EV"], report.cards.ranking.map(row => [row.rank, row.player, row.teamId, `${row.riskScore}/100`, "N/D", "N/D"])),
    "",
    `Stima squadra: ${report.cards.teamEstimates.map(row => `${row.teamId} ${num(row.cards.central)} (${num(row.cards.min)}–${num(row.cards.max)})`).join("; ")}. È una gerarchia euristica, non una probabilità di ammonizione; nessun pronostico economico sui cartellini viene certificato.`,
    "",
    "## 10. Controlli di qualità, limiti e affidabilità",
    "",
    `- Identità titolari risolte: ${prediction.dataQuality.lineupResolved.resolved}/${prediction.dataQuality.lineupResolved.expected}; completezza generale ${prediction.dataQuality.completenessPct}%.`,
    `- Soglie monotone: ${report.quality.monotonicProbabilities ? "PASS" : "FAIL"}.`,
    `- Riconciliazione squadra: ${report.quality.teamReconciliation.map(row => `${row.teamId} Δtiri ${row.shotsDifference}, ΔSOT ${row.shotsOnTargetDifference}`).join("; ")}.`,
    ...(collective.some(row => row.reconciliation.unresolvedFallbackShots > 0) ? [
      `- Residuo fallback non attribuito come statistica personale: ${collective.filter(row => row.reconciliation.unresolvedFallbackShots > 0).map(row => `${row.team} ${row.reconciliation.unresolvedFallbackShots} tiri / ${row.reconciliation.unresolvedFallbackShotsOnTarget} SOT`).join("; ")}.`
    ] : []),
    ...report.limitations.map(item => `- ${item}`),
    ""
  ].join("\n");

  const base = `output/reports/${config.slug}-md06-official-pre-match-2026-10-11`;
  write(`${base}.json`, report);
  write(`${base}.md`, markdown);
  console.log(`OK ${config.fixture}: ${base}.{md,json}`);
}

for (const [matchId, config] of Object.entries(fixtures)) buildReport(matchId, config);
