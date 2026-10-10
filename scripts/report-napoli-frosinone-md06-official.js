"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { poissonAtLeast } = require("./predictions/engine");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const matchId = "napoli-frosinone-2026-27-md-06";
const kickoff = "2026-10-10T20:45:00+02:00";
const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(row => row.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const schedina = read("data/normalized/schedina-md06.json");
const catalog = schedina.marketCatalog.matches.find(row => row.matchId === matchId);
const odds = read("data/normalized/odds/sisal/serie-a.json");
const probable = read("data/sources/probable-lineups-md6-2026-27.json");

assert(official && prediction && catalog, "Napoli-Frosinone MD6: sorgenti canoniche incomplete");
assert.equal(prediction.engineVersion, "4.13.0");
assert.equal(prediction.playerMarketModelVersion, 2);
assert.equal(prediction.dataQuality.probableLineups, "22/22 titolari ufficiali confermati");

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const round = (value, digits = 2) => finite(value) ? Number(Number(value).toFixed(digits)) : null;
const pct = value => finite(value) ? `${round(Number(value) * (Number(value) <= 1 ? 100 : 1), 1)}%` : "N/D";
const num = value => finite(value) ? round(value, 2) : "N/D";
const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|")).join(" | ")} |`),
].join("\n");

const playerById = new Map(prediction.shooters.allPlayers.map(player => [player.playerId, player]));
const starters = official.teams.flatMap(team => team.players.map((entry, index) => {
  const player = playerById.get(entry.playerId);
  const goalkeeper = index === 0;
  if (!player) return {
    teamId: team.teamId, team: team.team, playerId: entry.playerId, sourceName: entry.sourceName,
    name: entry.currentName, goalkeeper, role: goalkeeper ? "Portiere" : "N/D",
    expectedMinutes: null, projectedShots: null, projectedShotsOnTarget: null,
    probabilities: { shots1Plus: null, shots2Plus: null, shots3Plus: null, shots4Plus: null, sot1Plus: null, sot2Plus: null },
    matchup: goalkeeper ? "Portiere escluso dal Player Market V2: tiri e SOT non modellati." : "Profilo non risolto dal modello.",
    reliability: "N/D",
  };
  return {
    teamId: team.teamId, team: team.team, playerId: player.playerId, sourceName: entry.sourceName,
    name: player.name, goalkeeper: false, role: `${player.role} · ${player.detailedRole || "ruolo specifico N/D"}`,
    expectedMinutes: player.expectedMinutes, projectedShots: player.projectedShots,
    projectedShotsOnTarget: player.projectedShotsOnTarget,
    probabilities: {
      shots1Plus: player.shotProbabilities.over05,
      shots2Plus: player.shotProbabilities.over15,
      shots3Plus: player.shotProbabilities.over25,
      shots4Plus: poissonAtLeast(player.projectedShots, 4),
      sot1Plus: player.shotOnTargetProbabilities.over05,
      sot2Plus: player.shotOnTargetProbabilities.over15,
    },
    matchup: player.matchupEvidence.join("; "),
    reliability: `${player.dataStatus}; stabilità ${player.playerBaselineStability?.level || "N/D"}`,
  };
}));

const mainBenchIds = new Set([
  "scott-mctominay", "matteo-politano", "billy-gilmour", "lorenzo-lucca", "sam-beukema",
  "tomas-bobcek", "alessio-zerbin", "seydou-fini", "ilario-monterisi", "kevin-akpoguma",
]);
const substitutes = official.teams.flatMap(team => team.substitutes.map(entry => ({
  teamId: team.teamId, team: team.team, playerId: entry.playerId, sourceName: entry.sourceName,
  name: entry.currentName, mainSubstitute: mainBenchIds.has(entry.playerId), starterProbabilityPct: 0,
  entryProbabilityPct: null, expectedMinutes: null, projectedShots: null, projectedShotsOnTarget: null,
  note: "Panchina ufficiale: il V2 non dispone di un modello validato di probabilità/minuti da subentrante; nessuna proiezione da titolare riutilizzata.",
})));

const probableByTeam = new Map(probable.teams.filter(team => ["napoli", "frosinone"].includes(team.teamId)).map(team => [team.teamId, team]));
const lineupChanges = official.teams.map(team => {
  const previous = probableByTeam.get(team.teamId)?.players.filter(player => player.lineupStatus === "starter").map(player => player.playerId) || [];
  const current = team.players.map(player => player.playerId);
  return {
    teamId: team.teamId,
    entered: team.players.filter(player => !previous.includes(player.playerId)).map(player => player.currentName),
    exited: (probableByTeam.get(team.teamId)?.players || []).filter(player => player.lineupStatus === "starter" && !current.includes(player.playerId)).map(player => player.currentName),
  };
});

const selected = catalog.selections.filter(leg => leg.suggestionAnalysis?.suggested).map(leg => {
  const probabilityPct = leg.betSelection.evaluation.modelProbabilityPct
    ?? leg.betSelection.evaluation.individualReference?.modelProbabilityPct ?? null;
  const playerContract = leg.catalogOrigin === "prediction-v2-player-forecast";
  return {
    rank: leg.suggestionAnalysis.rank, selectionId: leg.selectionId, label: leg.label,
    family: leg.suggestionAnalysis.family, probabilityPct,
    tier: probabilityPct >= 70 ? "solido" : probabilityPct >= 55 ? "intermedio" : "outsider",
    odds: leg.betSelection.quote.decimal, quoteAvailability: leg.betSelection.quote.availability,
    fairOdds: playerContract ? null : leg.betSelection.evaluation.fairOdds,
    expectedValuePct: playerContract ? null : leg.betSelection.evaluation.expectedValuePct,
    economicStatus: playerContract
      ? "NON_CALCOLABILE: probabilità individuale V2 e contratto Sisal DUO non sono semanticamente equivalenti"
      : finite(leg.betSelection.evaluation.expectedValuePct)
        ? Number(leg.betSelection.evaluation.expectedValuePct) > 0 ? "EV_POSITIVO_NEL_MODELLO" : "QUOTA_NON_CONVENIENTE"
        : "N/D",
    reliability: leg.betSelection.operational.reliability.level,
  };
}).sort((a, b) => Number(b.probabilityPct ?? -1) - Number(a.probabilityPct ?? -1));

const projectionByTeam = new Map(prediction.teamProjections.map(team => [team.teamId, team]));
const collective = official.teams.map(team => {
  const projection = projectionByTeam.get(team.teamId);
  const reconciled = prediction.shooters.teamTotals.find(row => row.teamId === team.teamId);
  return {
    teamId: team.teamId, team: team.team,
    shots: { ...projection.shotsTotal, reconciledPlayers: reconciled.projectedShots },
    shotsOnTarget: { ...projection.shotsOnTarget, reconciledPlayers: reconciled.projectedShotsOnTarget },
    expectedGoals: projection.expectedGoals, corners: projection.corners, attackChannels: projection.attackChannels,
    possessionProfilePct: projection.opponentMatchupInteraction?.abilityToExploit?.inputs?.possessionPct ?? null,
    territorialAbility: projection.opponentMatchupInteraction?.abilityToExploit?.territorial ?? null,
    ownOffensiveInteraction: {
      shotsAdjustmentPct: projection.ownOffensiveInteraction?.shotsAdjustmentPct ?? null,
      shotsOnTargetAdjustmentPct: projection.ownOffensiveInteraction?.shotsOnTargetAdjustmentPct ?? null,
    },
    opponentInteraction: {
      direction: projection.opponentMatchupInteraction?.direction || null,
      shotsAdjustmentPct: projection.opponentMatchupInteraction?.shotsAdjustmentPct ?? null,
      shotsOnTargetAdjustmentPct: projection.opponentMatchupInteraction?.shotsOnTargetAdjustmentPct ?? null,
    },
  };
});

const report = {
  schemaVersion: 1, reportType: "serie-a-md06-official-pre-match-analysis", generatedAt: new Date().toISOString(),
  matchId, fixture: "Napoli – Frosinone", kickoff,
  engine: { version: prediction.engineVersion, playerMarketModelVersion: prediction.playerMarketModelVersion, formulasChanged: false },
  source: {
    provider: official.provider, url: official.sourceUrl, secondaryUrls: official.secondarySourceUrls,
    requestedUrl: official.requestedSourceUrl, verificationNote: official.verificationNote, retrievedAt: official.retrievedAt,
  },
  oddsSnapshot: { provider: odds.provider, retrievedAt: odds.retrievedAt, sourceUrl: odds.sourceUrl, beforeKickoff: new Date(odds.retrievedAt) < new Date(kickoff) },
  dataCutoff: prediction.futureDataDiagnostics?.dataCutoff || "2026-10-10 pre-kickoff",
  outcomeProbabilities: prediction.probabilities.final,
  formations: official.teams, lineupChanges, collective, starters, substitutes, selectedForecasts: selected,
  limitations: [
    "La distinta Diretta.it fornita dall'utente è autoritativa per gli XI; le panchine sono il complemento degli undici sui convocati ufficiali dei due club.",
    "Milton Pereyra è presente nei convocati del Napoli ma non ha un'identità canonica verificata nel repository: playerId null, senza statistiche inventate.",
    "Possesso: il motore espone profili storici usati nel matchup, non una percentuale previsionale della singola partita.",
    "Portieri: tiri e SOT individuali non sono modellati; N/D non equivale a zero.",
    "Panchina: il V2 non calibra probabilità di ingresso e minuti da subentrante; le proiezioni precedenti da titolare non vengono riciclate.",
    "Mercati giocatore Sisal: i contratti DUO includono l'eventuale sostituto; probabilità individuale, quota equa ed EV congiunto restano non calcolabili.",
    ...prediction.dataQuality.missing.map(item => `Dato mancante dichiarato dal modello: ${item}.`),
  ],
};

const teamLine = team => {
  const row = collective.find(item => item.teamId === team.teamId);
  return `- ${team.team}: ${num(row.shots.central)} tiri (${num(row.shots.min)}–${num(row.shots.max)}), ${num(row.shotsOnTarget.central)} SOT (${num(row.shotsOnTarget.min)}–${num(row.shotsOnTarget.max)}), xG ${num(row.expectedGoals)}; canali sinistra/centro/destra ${num(row.attackChannels.left)}%/${num(row.attackChannels.central)}%/${num(row.attackChannels.right)}%.`;
};
const starterTable = teamId => table(
  ["Giocatore", "Ruolo", "Min", "xTiri", "xSOT", "1+ T", "2+ T", "3+ T", "4+ T", "1+ SOT", "2+ SOT", "Affidabilità"],
  starters.filter(row => row.teamId === teamId).map(row => [
    row.name, row.role, num(row.expectedMinutes), num(row.projectedShots), num(row.projectedShotsOnTarget),
    pct(row.probabilities.shots1Plus), pct(row.probabilities.shots2Plus), pct(row.probabilities.shots3Plus), pct(row.probabilities.shots4Plus),
    pct(row.probabilities.sot1Plus), pct(row.probabilities.sot2Plus), row.reliability,
  ]),
);
const recommendationTable = tier => table(
  ["Pronostico", "Probabilità", "Quota", "Quota equa", "EV", "Affidabilità", "Lettura economica"],
  selected.filter(row => row.tier === tier).map(row => [
    row.label, pct(row.probabilityPct), row.odds ?? "N/D", row.fairOdds ?? "N/D",
    row.expectedValuePct == null ? "N/D" : `${row.expectedValuePct > 0 ? "+" : ""}${row.expectedValuePct}%`, row.reliability, row.economicStatus,
  ]),
);
const benchTable = table(
  ["Squadra", "Giocatore", "P titolare", "P ingresso", "Minuti", "Nota"],
  substitutes.filter(row => row.mainSubstitute).map(row => [row.team, row.name, "0% (distinta ufficiale)", "N/D", "N/D", row.note]),
);

const markdown = [
  "# Napoli–Frosinone — analisi prepartita con formazioni ufficiali", "",
  `Generato il ${report.generatedAt}. Motore ${prediction.engineVersion}, Player Market V${prediction.playerMarketModelVersion}; parametri, pesi, calibrazione e formule invariati.`, "",
  "## 1. Formazioni ufficiali", "",
  ...official.teams.flatMap(team => [
    `### ${team.team} · ${team.formation}`, "",
    `Titolari: ${team.players.map(player => player.sourceName).join(", ")}.`, "",
    `Panchina: ${team.substitutes.map(player => player.sourceName).join(", ")}.`, "",
  ]),
  `Cambi rispetto alla proiezione precedente: ${lineupChanges.map(change => `${change.teamId}: entrano ${change.entered.join(", ") || "nessuno"}; escono ${change.exited.join(", ") || "nessuno"}`).join(" | ")}.`, "",
  "Verifica fonti: la distinta Diretta.it fornita dall’utente alle 20:24 CEST è autoritativa per gli XI; le panchine sono state ricavate sottraendo gli undici dai convocati ufficiali pubblicati dai due club.", "",
  "## 2. Previsione collettiva", "", ...official.teams.map(teamLine), "",
  `Esito finale V2: Napoli ${pct(prediction.probabilities.final["1"])} · pareggio ${pct(prediction.probabilities.final.X)} · Frosinone ${pct(prediction.probabilities.final["2"])}. Sono probabilità del modello; la distribuzione no-margin ricavata dal mercato (${pct(prediction.probabilities.marketNoMargin["1"])} / ${pct(prediction.probabilities.marketNoMargin.X)} / ${pct(prediction.probabilities.marketNoMargin["2"])}) è una fonte distinta.`, "",
  "I profili di possesso utilizzati dal matchup sono 59% Napoli e 50% Frosinone: sono riferimenti storici, non una previsione del possesso della gara. Il proxy territoriale è 0,687 per il Napoli e 0,358 per il Frosinone.", "",
  "Il Napoli concentra il 52,4% della produzione nel corridoio centrale, con David Neres e Lang alle spalle di Højlund e De Bruyne nella linea a quattro. Il Frosinone è quasi speculare sulle fasce (43% a sinistra e 43% a destra) e produce soltanto il 14,1% centralmente. La vulnerabilità tiri del Frosinone aggiunge +0,88% al volume Napoli ma non ai SOT; i segnali difensivi del Napoli verso il Frosinone restano in watch e quindi neutrali nel coefficiente centrale.", "",
  "## 3. Tiri e SOT individuali", "", "### Napoli", "", starterTable("napoli"), "", "### Frosinone", "", starterTable("frosinone"), "",
  "Le probabilità 4+ tiri usano la stessa distribuzione di Poisson del V2. Per i portieri i valori restano N/D.", "",
  "## 4. Matchup decisivi", "",
  "- Højlund è il riferimento centrale Napoli: 2,77 tiri e 1,23 SOT attesi; il 3+ tiri vale circa 52,3%.",
  "- David Neres, De Bruyne e Lang sostengono Højlund nel 3-4-2-1; il ricalcolo assegna loro soltanto i volumi coerenti con l’undici ufficiale.",
  "- Kvernadze e Ghedjemis restano i principali sbocchi larghi del Frosinone, mentre Raimondo riceve minuti e volumi da titolare al posto di Bobček.",
  "- Meret, Badiashile e David Neres entrano nell’XI Napoli; Milinković-Savić, Gilmour e Politano passano in panchina. Il ricalcolo non modifica formule o pesi.",
  "- Rrahmani, Lobotka, De Bruyne, Calò e Bracaglia restano valutati: difensori e centrocampisti non sono esclusi automaticamente dai mercati tiri.", "",
  "## 5. Principali possibili subentranti", "", benchTable, "",
  "## 6. Pronostici solidi", "", recommendationTable("solido"), "",
  "Alta probabilità e convenienza economica restano concetti separati: ogni quota va confrontata con la quota equa e con l’EV, quando semanticamente calcolabile.", "",
  "## 7. Pronostici intermedi e outsider", "", "### Intermedi", "", recommendationTable("intermedio"), "", "### Outsider", "", recommendationTable("outsider"), "",
  "Per i mercati giocatore la quota Sisal è mostrata, ma quota equa ed EV rimangono N/D: il bookmaker quota il giocatore e il suo eventuale sostituto, mentre il V2 produce una probabilità individuale.", "",
  "## 8. Limiti e affidabilità", "", ...report.limitations.map(item => `- ${item}`), "",
  `Affidabilità complessiva: ${prediction.confidence.level} (${prediction.confidence.value}/100). Completezza dati: ${prediction.dataQuality.completenessPct}%. Snapshot quote: ${odds.retrievedAt}, precedente al calcio d’inizio: ${report.oddsSnapshot.beforeKickoff ? "sì" : "no"}.`, "",
];

write("output/reports/napoli-frosinone-md06-official-pre-match-2026-10-10.json", report);
write("output/reports/napoli-frosinone-md06-official-pre-match-2026-10-10.md", markdown.join("\n"));
console.log(JSON.stringify({ matchId, starters: starters.length, modeledOutfield: starters.filter(row => !row.goalkeeper && row.projectedShots !== null).length, substitutes: substitutes.length, selectedForecasts: selected.length, output: "output/reports/napoli-frosinone-md06-official-pre-match-2026-10-10.md" }, null, 2));
