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
const matchId = "inter-parma-2026-27-md-06";
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const predictions = read("data/normalized/predictions.json");
const schedina = read("data/normalized/schedina-md06.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");

const official = officialLineups.fixtures.find(fixture => fixture.matchId === matchId);
const prediction = predictions.predictions.find(row => row.matchId === matchId);
const catalog = schedina.marketCatalog.matches.find(row => row.matchId === matchId);
assert(official && prediction && catalog, "Inter-Parma MD6: sorgenti canoniche incomplete");
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
const starterRows = official.teams.flatMap(team => team.players.map((entry, index) => {
  const player = playerById.get(entry.playerId);
  const goalkeeper = index === 0;
  if (!player) return {
    teamId: team.teamId,
    team: team.team,
    playerId: entry.playerId,
    sourceName: entry.sourceName,
    name: entry.currentName,
    goalkeeper,
    role: goalkeeper ? "Portiere" : "N/D",
    expectedMinutes: goalkeeper ? null : null,
    projectedShots: null,
    projectedShotsOnTarget: null,
    probabilities: { shots1Plus: null, shots2Plus: null, shots3Plus: null, shots4Plus: null, sot1Plus: null, sot2Plus: null },
    matchup: goalkeeper ? "Portiere escluso dal Player Market V2: valori tiri/SOT non modellati." : "Profilo non risolto dal modello.",
    reliability: "N/D",
  };
  return {
    teamId: team.teamId,
    team: team.team,
    playerId: player.playerId,
    sourceName: entry.sourceName,
    name: player.name,
    goalkeeper: false,
    role: `${player.role} · ${player.detailedRole || "ruolo specifico N/D"}`,
    expectedMinutes: player.expectedMinutes,
    projectedShots: player.projectedShots,
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
  "lautaro-martinez", "nicolo-barella", "ange-yoan-bonny", "piotr-zielinski", "djed-spence",
  "jose-david-romero", "adrian-bernabe", "matija-frigan", "sascha-britschgi", "simone-lontani",
]);
const benchRows = official.teams.flatMap(team => team.substitutes.map(entry => ({
  teamId: team.teamId,
  team: team.team,
  playerId: entry.playerId,
  sourceName: entry.sourceName,
  name: entry.currentName,
  mainSubstitute: mainBenchIds.has(entry.playerId),
  starterProbabilityPct: 0,
  entryProbabilityPct: null,
  expectedMinutes: null,
  projectedShots: null,
  projectedShotsOnTarget: null,
  note: entry.playerId
    ? "Panchina ufficiale: il V2 non dispone di un modello validato di probabilità/minuti da subentrante; nessuna proiezione da titolare riutilizzata."
    : "Identità non risolta: nessuna statistica o proiezione attribuita.",
})));

const oldProbableByTeam = new Map(probableLineups.teams.filter(team => ["inter", "parma"].includes(team.teamId)).map(team => [team.teamId, team]));
const lineupChanges = official.teams.map(team => {
  const previous = oldProbableByTeam.get(team.teamId)?.players.filter(player => player.lineupStatus === "starter").map(player => player.playerId) || [];
  const current = team.players.map(player => player.playerId);
  return {
    teamId: team.teamId,
    entered: team.players.filter(player => !previous.includes(player.playerId)).map(player => player.currentName),
    exited: (oldProbableByTeam.get(team.teamId)?.players || []).filter(player => player.lineupStatus === "starter" && !current.includes(player.playerId)).map(player => player.currentName),
  };
});

const selected = catalog.selections
  .filter(leg => leg.suggestionAnalysis?.suggested)
  .map(leg => {
    const probabilityPct = leg.betSelection.evaluation.modelProbabilityPct
      ?? leg.betSelection.evaluation.individualReference?.modelProbabilityPct
      ?? null;
    const playerContract = leg.catalogOrigin === "prediction-v2-player-forecast";
    return {
      rank: leg.suggestionAnalysis.rank,
      selectionId: leg.selectionId,
      label: leg.label,
      family: leg.suggestionAnalysis.family,
      probabilityPct,
      tier: probabilityPct >= 70 ? "solido" : probabilityPct >= 55 ? "intermedio" : "outsider",
      odds: leg.betSelection.quote.decimal,
      quoteAvailability: leg.betSelection.quote.availability,
      fairOdds: playerContract ? null : leg.betSelection.evaluation.fairOdds,
      expectedValuePct: playerContract ? null : leg.betSelection.evaluation.expectedValuePct,
      economicStatus: playerContract
        ? "NON_CALCOLABILE: probabilità individuale V2 e contratto Sisal DUO non sono semanticamente equivalenti"
        : Number.isFinite(leg.betSelection.evaluation.expectedValuePct)
          ? leg.betSelection.evaluation.expectedValuePct > 0 ? "EV_POSITIVO_NEL_MODELLO" : "QUOTA_NON_CONVENIENTE"
          : "N/D",
      reliability: leg.betSelection.operational.reliability.level,
    };
  })
  .sort((left, right) => Number(right.probabilityPct || -1) - Number(left.probabilityPct || -1));

const projectionByTeam = new Map(prediction.teamProjections.map(team => [team.teamId, team]));
const collective = official.teams.map(team => {
  const projection = projectionByTeam.get(team.teamId);
  const reconciled = prediction.shooters.teamTotals.find(row => row.teamId === team.teamId);
  return {
    teamId: team.teamId,
    team: team.team,
    shots: { ...projection.shotsTotal, reconciledPlayers: reconciled.projectedShots },
    shotsOnTarget: { ...projection.shotsOnTarget, reconciledPlayers: reconciled.projectedShotsOnTarget },
    expectedGoals: projection.expectedGoals,
    corners: projection.corners,
    attackChannels: projection.attackChannels,
    possessionProfilePct: projection.opponentMatchupInteraction?.abilityToExploit?.inputs?.possessionPct ?? null,
    territorialAbility: projection.opponentMatchupInteraction?.abilityToExploit?.territorial ?? null,
    opponentInteraction: {
      direction: projection.opponentMatchupInteraction?.direction || null,
      shotsAdjustmentPct: projection.opponentMatchupInteraction?.shotsAdjustmentPct ?? null,
      shotsOnTargetAdjustmentPct: projection.opponentMatchupInteraction?.shotsOnTargetAdjustmentPct ?? null,
    },
  };
});

const report = {
  schemaVersion: 1,
  reportType: "serie-a-md06-official-pre-match-analysis",
  generatedAt: new Date().toISOString(),
  matchId,
  fixture: "Inter – Parma",
  kickoff: "2026-10-10T18:00:00+02:00",
  engine: { version: prediction.engineVersion, playerMarketModelVersion: prediction.playerMarketModelVersion, formulasChanged: false },
  source: { provider: official.provider, url: official.sourceUrl, retrievedAt: official.retrievedAt, suppliedLineupsTreatedAsAuthoritative: true },
  oddsSnapshot: { provider: odds.provider, retrievedAt: odds.retrievedAt, sourceUrl: odds.sourceUrl, beforeKickoff: new Date(odds.retrievedAt) < new Date("2026-10-10T18:00:00+02:00") },
  dataCutoff: prediction.futureDataDiagnostics?.dataCutoff || "2026-10-10 pre-kickoff",
  formations: official.teams,
  lineupChanges,
  collective,
  starters: starterRows,
  substitutes: benchRows,
  selectedForecasts: selected,
  limitations: [
    "Possesso: il motore espone il profilo storico usato nel matchup, non una percentuale previsionale della singola partita.",
    "Portieri: tiri e SOT individuali non sono modellati; N/D non equivale a zero.",
    "Panchina: il V2 non calibra probabilità di ingresso e minuti da subentrante; le vecchie proiezioni da titolare non vengono riciclate.",
    "Mercati giocatore Sisal: i contratti DUO includono l'eventuale sostituto; probabilità individuale, quota equa ed EV congiunto restano non calcolabili.",
    "D. Diallo resta con playerId null perché l'identità non è risolta in modo univoco.",
    ...prediction.dataQuality.missing.map(item => `Dato mancante dichiarato dal modello: ${item}.`),
  ],
};

const teamLine = team => {
  const row = collective.find(item => item.teamId === team.teamId);
  return `- ${team.team}: ${num(row.shots.central)} tiri (${num(row.shots.min)}–${num(row.shots.max)}), ${num(row.shotsOnTarget.central)} SOT (${num(row.shotsOnTarget.min)}–${num(row.shotsOnTarget.max)}), xG ${num(row.expectedGoals)}; canali sinistra/centro/destra ${num(row.attackChannels.left)}%/${num(row.attackChannels.central)}%/${num(row.attackChannels.right)}%.`;
};
const starterTable = teamId => table(
  ["Giocatore", "Ruolo", "Min", "xTiri", "xSOT", "1+ T", "2+ T", "3+ T", "4+ T", "1+ SOT", "2+ SOT", "Affidabilità"],
  starterRows.filter(row => row.teamId === teamId).map(row => [
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
const mainBenchTable = table(
  ["Squadra", "Giocatore", "P titolare", "P ingresso", "Minuti", "Nota"],
  benchRows.filter(row => row.mainSubstitute).map(row => [row.team, row.name, "0% (distinta ufficiale)", "N/D", "N/D", row.note]),
);

const markdown = [
  "# Inter–Parma — analisi prepartita con formazioni ufficiali",
  "",
  `Generato il ${report.generatedAt}. Motore ${prediction.engineVersion}, Player Market V${prediction.playerMarketModelVersion}; parametri, pesi, calibrazione e formule invariati.`,
  "",
  "## 1. Formazioni ufficiali",
  "",
  ...official.teams.flatMap(team => [
    `### ${team.team} · ${team.formation}`,
    "",
    `Titolari: ${team.players.map(player => player.sourceName).join(", ")}.`,
    "",
    `Panchina: ${team.substitutes.map(player => player.sourceName).join(", ")}.`,
    "",
  ]),
  `Cambi rispetto alla proiezione precedente: ${lineupChanges.map(change => `${change.teamId}: entrano ${change.entered.join(", ") || "nessuno"}; escono ${change.exited.join(", ") || "nessuno"}`).join(" | ")}.`,
  "",
  "## 2. Previsione collettiva",
  "",
  ...official.teams.map(teamLine),
  "",
  "Il profilo di possesso usato dal matchup è 59,7% per l’Inter e 43,7% per il Parma: sono riferimenti storici separati, non una previsione della quota di possesso della gara. La lettura territoriale è quindi qualitativa: controllo Inter elevato (proxy 0,906) contro capacità territoriale Parma bassa (0,132).",
  "",
  "L’Inter concentra la produzione a sinistra e al centro (Dimarco, Mkhitaryan/Sucic e le due punte); il lato destro pesa meno. Il Parma ha un profilo molto largo e simmetrico, con il centro poco usato: Valeri/Carboni e Touré sono i principali canali di uscita. La vulnerabilità del Parma aggiunge nel modello +1,43% ai tiri Inter e +2,05% ai SOT; l’Inter riduce invece dell’1,19% il volume tiri Parma, mentre il segnale sui SOT ospiti resta neutrale/watch.",
  "",
  "## 3. Tiri e SOT individuali",
  "",
  "### Inter",
  "",
  starterTable("inter"),
  "",
  "### Parma",
  "",
  starterTable("parma"),
  "",
  "Le probabilità 4+ tiri sono calcolate con la stessa distribuzione di Poisson già usata dal V2 per le altre soglie. Per i portieri il dato resta N/D.",
  "",
  "## 4. Matchup decisivi",
  "",
  "- Dimarco contro il lato destro del blocco Parma: 2,08 tiri attesi, 61,5% di 2+; è anche l’outsider qualificato più solido tra difensori/centrocampisti.",
  "- Thuram ed Esposito occupano il canale centrale Inter: 3,54 e 3,39 tiri attesi; il 3+ vale rispettivamente 68,7% e 65,8%.",
  "- Touré è il riferimento Parma più resistente al matchup: 2,43 tiri e 1,09 SOT attesi, ma contro una difesa che concede soltanto 8,7 tiri/gara nel campione di sede.",
  "- L’assenza dall’XI di Lautaro, Barella, Akanji, Bastoni e Bonny redistribuisce il volume su Esposito, Thuram, Dimarco e Bisseck; non cambia le formule del modello.",
  "- Nel Parma Carboni, Fabbian ed Elphege sostituiscono Britschgi, Bernabé e Romero: il totale squadra resta quasi invariato, ma la distribuzione individuale si sposta verso Touré ed Elphege.",
  "",
  "### Principali possibili subentranti",
  "",
  mainBenchTable,
  "",
  "## 5. Pronostici più solidi",
  "",
  recommendationTable("solido"),
  "",
  "Alta probabilità non significa quota conveniente: Inter vincente e i primati Inter per tiri/SOT/corner hanno EV negativo alle quote disponibili.",
  "",
  "## 6. Pronostici intermedi e outsider",
  "",
  "### Intermedi",
  "",
  recommendationTable("intermedio"),
  "",
  "### Outsider",
  "",
  recommendationTable("outsider"),
  "",
  "Tra i mercati squadra, il valore modellato più alto è Parma Over 2,5 SOT (+14,02%), seguito da Parma Over 2,5 corner (+8,65%) e Inter multigoal 1–3 (+6,50%). Sono stime soggette a errore di modello, non garanzie. Per i mercati giocatore la quota è mostrata, ma quota equa ed EV restano N/D perché Sisal quota un contratto DUO mentre il V2 produce una probabilità individuale.",
  "",
  "## 7. Limiti e affidabilità",
  "",
  ...report.limitations.map(item => `- ${item}`),
  "",
  `Affidabilità complessiva del motore sulla gara: ${prediction.confidence.level} (${prediction.confidence.value}/100). Completezza dati dichiarata: ${prediction.dataQuality.completenessPct}%. Snapshot quote: ${odds.retrievedAt}, precedente al calcio d’inizio: ${report.oddsSnapshot.beforeKickoff ? "sì" : "no"}.`,
  "",
];

write("output/reports/inter-parma-md06-official-pre-match-2026-10-10.json", report);
write("output/reports/inter-parma-md06-official-pre-match-2026-10-10.md", markdown.join("\n"));
console.log(JSON.stringify({ matchId, starters: starterRows.length, modeledOutfield: starterRows.filter(row => !row.goalkeeper && row.projectedShots !== null).length, substitutes: benchRows.length, selectedForecasts: selected.length, output: "output/reports/inter-parma-md06-official-pre-match-2026-10-10.md" }, null, 2));
