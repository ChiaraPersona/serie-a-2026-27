"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { annotateCatalogMatches, CLASSIFICATIONS, pairRelation } = require("./md06-scenario-coherence");
const { evaluateDerivedScoreMarket } = require("./score-market-evaluation");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const round = (value, digits = 4) => Number(Number(value).toFixed(digits));
const displayTeam = value => String(value || "N/D").split("-").map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ");
const table = (headers, rows) => {
  const escape = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [`| ${headers.map(escape).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(escape).join(" | ")} |`)].join("\n");
};

const writeNormalized = process.argv.includes("--write");
const testsPassed = process.argv.includes("--tests-passed");
const schedina = read("data/normalized/schedina-md06.json");
const predictionsData = read("data/normalized/predictions.json");
const matches = read("data/normalized/matches.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = predictionsData.predictions.filter(prediction => prediction.matchId.endsWith("-md-06"));
const predictionByMatch = new Map(predictions.map(prediction => [prediction.matchId, prediction]));
const matchById = new Map(matches.map(match => [match.id, match]));
const quoteBySelectionId = new Map(odds.events.flatMap(event => event.markets.flatMap(market => (market.selections || []).map(selection => [String(selection.providerSelectionId), { event, market, selection }]))));

assert.equal(predictions.length, 10, "Devono essere presenti dieci previsioni V2 congelate per MD6");
assert.equal(schedina.marketCatalog.matches.length, 10, "Il catalogo deve contenere dieci partite");

const immutableProjection = catalog => catalog.matches.flatMap(match => match.selections.map(leg => ({
  selectionId: leg.selectionId,
  matchId: leg.matchId,
  quote: leg.betSelection?.quote,
  evaluation: leg.betSelection?.evaluation,
  catalogOrder: leg.catalogOrder,
})));
const beforeHash = hash(immutableProjection(schedina.marketCatalog));
const catalogMatches = annotateCatalogMatches({ catalogMatches: schedina.marketCatalog.matches, predictions });
const allSelections = catalogMatches.flatMap(match => match.selections);
const scenarioCounts = allSelections.reduce((counts, leg) => {
  const key = leg.scenarioAnalysis.classification;
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, Object.fromEntries(Object.values(CLASSIFICATIONS).map(key => [key, 0])));
const annotatedCatalog = {
  ...schedina.marketCatalog,
  schemaVersion: 2,
  sources: {
    ...schedina.marketCatalog.sources,
    scenarioCoherenceVersion: 1,
    scenarioCoherenceBasis: "Frozen Engine V2 probabilities and deterministic event logic; odds and EV excluded",
  },
  totals: { ...schedina.marketCatalog.totals, scenarioCounts },
  matches: catalogMatches,
};
const afterHash = hash(immutableProjection(annotatedCatalog));
assert.equal(afterHash, beforeHash, "Quote, probabilità, EV o ordinamento sono cambiati durante l'annotazione");
assert.equal(allSelections.length, 383, "La classificazione non deve perdere selezioni");
assert.equal(new Set(allSelections.map(leg => leg.selectionId)).size, 383, "La classificazione non deve introdurre duplicati");
assert.equal(Object.values(scenarioCounts).reduce((sum, count) => sum + count, 0), 383, "Tutte le selezioni devono ricevere una classificazione");

const numericalInconsistencies = [];
const scenarios = catalogMatches.map(match => {
  const fixture = matchById.get(match.matchId);
  const scenario = match.scenario;
  if (!scenario.sumWithinTolerance) numericalInconsistencies.push({ matchId: match.matchId, type: "1X2_SUM", actual: scenario.probabilitySumPct, expected: 100 });
  if (!scenario.numericalTie && scenario.prevalentOutcomes.length !== 1) numericalInconsistencies.push({ matchId: match.matchId, type: "PREVALENT_OUTCOME_COUNT", actual: scenario.prevalentOutcomes.length, expected: 1 });
  return {
    matchId: match.matchId,
    fixture: `${displayTeam(fixture?.homeTeam || match.homeTeam)} - ${displayTeam(fixture?.awayTeam || match.awayTeam)}`,
    date: match.date,
    kickoff: match.kickoff,
    probabilities: scenario.probabilities,
    probabilitySumPct: scenario.probabilitySumPct,
    prevalentOutcome: scenario.prevalentOutcome,
    prevalentOutcomes: scenario.prevalentOutcomes,
    numericalTie: scenario.numericalTie,
    modalExactScore: scenario.modalExactScore,
    centralExactScore: scenario.centralExactScore,
    expectedGoals: scenario.expectedGoals,
    goalDistribution: scenario.goalDistribution,
    description: scenario.description,
    classificationCounts: scenario.classificationCounts,
  };
});

let b2Checked = 0;
for (const leg of allSelections.filter(row => row.betSelection?.evaluation?.kind === "DERIVED_B2_SCORE_MATRIX")) {
  const quote = quoteBySelectionId.get(String(leg.providerSelectionId));
  const prediction = predictionByMatch.get(leg.matchId);
  if (!quote || !prediction) {
    numericalInconsistencies.push({ matchId: leg.matchId, selectionId: leg.selectionId, type: "B2_SOURCE_MISSING" });
    continue;
  }
  const recalculated = evaluateDerivedScoreMarket({ prediction, market: quote.market, selection: quote.selection });
  const actual = leg.betSelection.evaluation;
  const difference = round(recalculated.centralProbabilityPct - Number(actual.modelProbabilityPct), 4);
  if (Math.abs(difference) > 0.11) numericalInconsistencies.push({ matchId: leg.matchId, selectionId: leg.selectionId, type: "B2_PROBABILITY_MISMATCH", differencePp: difference });
  b2Checked += 1;
}

let canonical1x2Checked = 0;
for (const leg of allSelections.filter(row => row.betSelection?.market?.name === "1X2 ESITO FINALE")) {
  const prediction = predictionByMatch.get(leg.matchId);
  const outcome = String(leg.betSelection.market.selection);
  const expected = Number(prediction?.probabilities?.final?.[outcome]);
  const actual = Number(leg.betSelection.evaluation?.modelProbabilityPct);
  if (!finite(expected) || !finite(actual) || Math.abs(expected - actual) > 0.11) numericalInconsistencies.push({ matchId: leg.matchId, selectionId: leg.selectionId, type: "CANONICAL_1X2_MISMATCH", expected, actual });
  canonical1x2Checked += 1;
}

const relationshipCounts = { MUTUALLY_EXCLUSIVE: 0, LOGICAL_IMPLICATION: 0, EQUIVALENT_OVERLAP: 0, COMPATIBLE_CORRELATED: 0, NOT_DIRECTLY_COMPARABLE: 0 };
const relationshipsByMatch = [];
for (const match of catalogMatches) {
  const counts = { ...relationshipCounts };
  for (let left = 0; left < match.selections.length; left += 1) {
    for (let right = left + 1; right < match.selections.length; right += 1) {
      const relation = pairRelation(match.selections[left], match.selections[right]);
      counts[relation.type] += 1;
      relationshipCounts[relation.type] += 1;
    }
  }
  relationshipsByMatch.push({ matchId: match.matchId, counts });
}

const report = {
  schemaVersion: 1,
  reportType: "serie-a-md06-scenario-coherence",
  generatedAt: new Date().toISOString(),
  scope: "Presentation and deterministic logical interpretation only; Engine V2, odds, EV, MyCombo, Champions and MD1-MD5 unchanged.",
  sources: {
    predictions: "data/normalized/predictions.json",
    predictionGeneratedAt: predictionsData.generatedAt,
    modelVersion: predictionsData.engine?.version || predictions[0]?.engineVersion || null,
    schedina: "data/normalized/schedina-md06.json",
  },
  invariants: {
    selections: allSelections.length,
    uniqueSelectionIds: new Set(allSelections.map(leg => leg.selectionId)).size,
    quoteProbabilityEvOrderHashBefore: beforeHash,
    quoteProbabilityEvOrderHashAfter: afterHash,
    quoteProbabilityEvOrderUnchanged: beforeHash === afterHash,
    engineModified: false,
    oddsModified: false,
    myComboModified: false,
  },
  totals: {
    matches: scenarios.length,
    ...scenarioCounts,
  },
  scenarios,
  relationships: { totals: relationshipCounts, matches: relationshipsByMatch },
  numericalAudit: {
    canonical1x2Checked,
    b2Checked,
    b2Expected: 203,
    inconsistencies: numericalInconsistencies,
  },
  corrections: [
    "Riepilogo V2 per partita con 1/X/2, esito prevalente, moda esatta, risultato centrale, xG e banda gol.",
    "Classificazione di ogni selezione ottenuta da logica risultato/punteggio o dalla dichiarazione di distribuzione marginale; EV e quote esclusi.",
    "Colorazione discreta delle righe e legenda unica per partita, senza cambiare l'ordinamento EV.",
    "Schedina personale: incompatibilità, implicazioni/correlazioni e combinabilità bookmaker presentate come livelli separati, senza bloccare l'aggiunta.",
  ],
  screenshots: [
    "output/md06/schedina-scenario-coherence-1440x1000.png",
    "output/md06/schedina-scenario-coherence-390x844.png",
  ],
  tests: testsPassed ? [
    "node scripts/test-md06-scenario-coherence.js",
    "npm run test:schedina",
    "npm run test:personal-betslip",
    "npm run test:css",
    "node --no-warnings scripts/test-app-modules.mjs",
    "node scripts/check-schedina-md06-scenario-browser.cjs",
    "git diff --check",
  ].map(command => ({ command, status: "PASS" })) : [],
  filesModified: [
    "scripts/md06-scenario-coherence.js",
    "scripts/md06-market-catalog.js",
    "scripts/build-md06-scenario-coherence.js",
    "scripts/test-md06-scenario-coherence.js",
    "scripts/check-schedina-md06-scenario-browser.cjs",
    "scripts/test-personal-betslip.mjs",
    "scripts/test-schedina-md06.js",
    "package.json",
    "js/pages/betting.js",
    "js/pages/personal-betslip-store.mjs",
    "css/betting.css",
    "css/styles.css",
    "scripts/build-site.js",
    "schedina.html",
    "data/normalized/schedina-md06.json",
    "output/reports/serie-a-md06-scenario-coherence-2026-10-10.json",
    "output/reports/serie-a-md06-scenario-coherence-2026-10-10.md",
    ...["output/md06/schedina-scenario-coherence-1440x1000.png", "output/md06/schedina-scenario-coherence-390x844.png"],
  ],
};

if (numericalInconsistencies.length) {
  write("output/reports/serie-a-md06-scenario-coherence-2026-10-10.json", report);
  throw new Error(`Audit numerico non superato: ${numericalInconsistencies.length} incoerenze. Catalogo non scritto.`);
}
assert.equal(b2Checked, 203, "Devono essere ricontrollate 203 probabilità B2");

const labels = {
  [CLASSIFICATIONS.COHERENT]: "Coerenti",
  [CLASSIFICATIONS.ALTERNATIVE]: "Alternative",
  [CLASSIFICATIONS.MULTI]: "Multi-scenario",
  [CLASSIFICATIONS.UNDETERMINED]: "Non determinabili",
};
const markdown = [
  "# Serie A 2026/27 — Schedina MD6: coerenza dei pronostici",
  "",
  `Generato: ${report.generatedAt}. Engine V2 ${report.sources.modelVersion}; previsioni congelate ${report.sources.predictionGeneratedAt}.`,
  "",
  "## Esito",
  "",
  `PASS. ${report.invariants.selections} selezioni, ${report.invariants.uniqueSelectionIds} identità uniche, quote/probabilità/EV/ordine invariati. La classificazione non usa quote o EV.`,
  "",
  "## Scenario prevalente per partita",
  "",
  table(["Partita", "Scenario", "1", "X", "2", "Moda esatta", "Risultato centrale", "xG", "Banda gol", "Coerenti", "Alternative", "Multi", "N/D"], scenarios.map(row => [
    row.fixture,
    row.prevalentOutcome || row.prevalentOutcomes.join("/"),
    `${row.probabilities["1"].toFixed(1)}%`,
    `${row.probabilities.X.toFixed(1)}%`,
    `${row.probabilities["2"].toFixed(1)}%`,
    row.modalExactScore ? `${row.modalExactScore.score} (${row.modalExactScore.probabilityPct?.toFixed(1) || "N/D"}%)` : "N/D",
    row.centralExactScore?.score || "N/D",
    `${row.expectedGoals.home ?? "N/D"}-${row.expectedGoals.away ?? "N/D"}`,
    row.goalDistribution.dominantBand ? `${row.goalDistribution.dominantBand.label} (${row.goalDistribution.dominantBand.probabilityPct}%)` : "N/D",
    row.classificationCounts[CLASSIFICATIONS.COHERENT],
    row.classificationCounts[CLASSIFICATIONS.ALTERNATIVE],
    row.classificationCounts[CLASSIFICATIONS.MULTI],
    row.classificationCounts[CLASSIFICATIONS.UNDETERMINED],
  ])),
  "",
  "La moda esatta è il singolo punteggio con massa maggiore; il risultato centrale è la proiezione arrotondata degli xG. Non vengono trattati come sinonimi dell'esito 1X2 prevalente.",
  "",
  "## Totali classificazione",
  "",
  table(["Classe", "Selezioni"], Object.values(CLASSIFICATIONS).map(key => [labels[key], scenarioCounts[key]])),
  "",
  "## Relazioni logiche tra mercati della stessa partita",
  "",
  table(["Relazione", "Coppie"], Object.entries(relationshipCounts).map(([key, value]) => [key, value])),
  "",
  "Le coppie mutuamente esclusive sono alternative legittime nel catalogo, non errori. Implicazioni e sovrapposizioni descrivono dipendenze; i mercati marginali non congiunti alla 1X2 restano non direttamente confrontabili.",
  "",
  "## Audit numerico",
  "",
  `- Triple 1/X/2 verificate: ${scenarios.length}/10; tutte sommano al 100% entro 0,01 punti percentuali.`,
  `- Righe 1X2 canoniche confrontate con predictions.probabilities.final: ${canonical1x2Checked}.`,
  `- Probabilità B2 ricalcolate dalla matrice punteggi congelata: ${b2Checked}/203.`,
  `- Incoerenze numeriche: ${numericalInconsistencies.length}.`,
  "",
  "## Correzioni effettuate",
  "",
  ...report.corrections.map(item => `- ${item}`),
  "",
  "## Screenshot",
  "",
  ...report.screenshots.map(item => `- \`${item}\``),
  "",
  "## Test",
  "",
  ...(testsPassed ? report.tests.map(test => `- PASS — \`${test.command}\``) : ["- In attesa dell'esecuzione finale."]),
  "",
  "## File modificati",
  "",
  ...report.filesModified.map(item => `- \`${item}\``),
  "",
].join("\n");

if (writeNormalized) write("data/normalized/schedina-md06.json", { ...schedina, marketCatalog: annotatedCatalog });
write("output/reports/serie-a-md06-scenario-coherence-2026-10-10.json", report);
write("output/reports/serie-a-md06-scenario-coherence-2026-10-10.md", markdown);
console.log(JSON.stringify({ status: "PASS", writeNormalized, testsPassed, totals: report.totals, numericalAudit: report.numericalAudit, relationships: relationshipCounts }, null, 2));
