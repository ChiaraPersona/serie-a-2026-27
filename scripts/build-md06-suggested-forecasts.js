"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildMd06MarketCatalog } = require("./md06-market-catalog");
const { reconstructStatisticalCoverage, STATES } = require("./md06-statistical-coverage");
const { canonicalThresholdIdentity, conservativeExpectedValuePct, selectMatchSuggestions, verifiedQuote } = require("./md06-suggested-forecasts");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`); };
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const countBy = (rows, getter) => rows.reduce((counts, row) => { const key = getter(row); counts[key] = (counts[key] || 0) + 1; return counts; }, {});
const table = (headers, rows) => [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")).join(" | ")} |`)].join("\n");
const invariantProjection = leg => ({ selectionId: leg.selectionId, matchId: leg.matchId, quote: leg.betSelection?.quote, evaluation: leg.betSelection?.evaluation, market: leg.betSelection?.market, providerMarketId: leg.providerMarketId, providerSelectionId: leg.providerSelectionId });
const writeNormalized = process.argv.includes("--write");
const testsPassed = process.argv.includes("--tests-passed");
const baselineTotal = 32;
const baselinePerMatch = new Map(Object.entries({
  "genoa-fiorentina-2026-27-md-06": 2,
  "inter-parma-2026-27-md-06": 5,
  "napoli-frosinone-2026-27-md-06": 2,
  "como-roma-2026-27-md-06": 3,
  "lazio-monza-2026-27-md-06": 3,
  "lecce-bologna-2026-27-md-06": 4,
  "sassuolo-milan-2026-27-md-06": 4,
  "cagliari-juventus-2026-27-md-06": 5,
  "atalanta-venezia-2026-27-md-06": 1,
  "torino-udinese-2026-27-md-06": 3,
}));

const schedina = read("data/normalized/schedina-md06.json");
const statisticalModels = read("data/analysis/serie-a-md06-statistical-models-2026-10-10.json");
const predictionsData = read("data/normalized/predictions.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const matches = read("data/normalized/matches.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const currentRows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const certifiedRows = currentRows.filter(leg => !String(leg.catalogOrigin || "").startsWith("statistical-"));
assert.equal(certifiedRows.length, 383, "Il punto di partenza certificato deve contenere 383 selezioni");
const certifiedById = new Map(certifiedRows.map(leg => [leg.selectionId, leg]));
const invariantBefore = hash(certifiedRows.map(invariantProjection).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));

const marketCatalog = buildMd06MarketCatalog({ predictionsData, odds, matches, schedinaSlips: schedina.slips, probableLineups, officialLineups, statisticalModels, matchday: 6 });
const rows = marketCatalog.matches.flatMap(match => match.selections);
const rowById = new Map(rows.map(leg => [leg.selectionId, leg]));
assert.equal(rowById.size, rows.length, "Il catalogo contiene selectionId duplicati");
for (const id of certifiedById.keys()) assert(rowById.has(id), `Selezione certificata rimossa: ${id}`);
const invariantAfter = hash([...certifiedById.keys()].map(id => invariantProjection(rowById.get(id))).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));
assert.equal(invariantAfter, invariantBefore, "Quote, probabilità o contratti delle 383 selezioni certificate sono cambiati");

const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED" && verifiedQuote(leg)), "Pronostico senza modello o quota verificata");
const coverage = reconstructStatisticalCoverage({ odds, existingSelectionIds: new Set(certifiedById.keys()), statisticalModels });
const decisionLabel = reason => ({
  CANONICAL_THRESHOLD_ALREADY_SELECTED: "altra soglia canonica meglio classificata",
  EQUIVALENT_EVENT_ALREADY_SELECTED: "evento equivalente già selezionato",
  LOGICAL_IMPLICATION_WITH_HIGHER_RANKED_SELECTION: "implica o è implicato da una scelta meglio classificata",
  MUTUALLY_EXCLUSIVE_WITH_HIGHER_RANKED_SELECTION: "incompatibile con una scelta meglio classificata",
  NOT_COHERENT_WITH_PREVALENT_SCENARIO: "alternativo allo scenario prevalente",
  RELIABILITY_NOT_ASSESSED: "qualità non valutabile",
  SPORTS_SUPPORT_BELOW_MARKET_STANDARD: "supporto sportivo insufficiente per struttura del mercato e affidabilità",
  MARGINAL_SPORTS_SUPPORT_BELOW_PORTFOLIO_STANDARD: "supporto marginale insufficiente dopo il controllo di varietà",
  CANONICAL_THRESHOLD_BALANCE_NOT_SELECTED: "altra soglia offre un equilibrio sportivo migliore",
}[reason] || reason.toLowerCase().replace(/_/g, " "));

const matchAudit = marketCatalog.matches.map(match => {
  const evaluated = match.selections.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED");
  const selected = match.selections.filter(leg => leg.suggestionAnalysis?.suggested).sort((a, b) => a.suggestionAnalysis.rank - b.suggestionAnalysis.rank);
  const exclusions = match.selections.filter(leg => !leg.suggestionAnalysis?.suggested).flatMap(leg => leg.suggestionAnalysis?.reasons || []);
  return {
    matchId: match.matchId,
    fixture: match.selections[0]?.fixture || `${match.homeTeam} – ${match.awayTeam}`,
    catalog: match.selections.length,
    quoted: match.selections.filter(verifiedQuote).length,
    evaluated: evaluated.length,
    notModelled: match.selections.length - evaluated.length,
    positiveEv: evaluated.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) > 0).length,
    previousSuggestions: baselinePerMatch.get(match.matchId) || 0,
    selected: selected.length,
    exclusions: countBy(exclusions, reason => reason),
    selectionIds: selected.map(leg => leg.selectionId),
  };
});

const thresholdGroups = new Map();
for (const leg of rows.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED" && verifiedQuote(leg))) {
  const identity = canonicalThresholdIdentity(leg);
  if (!identity) continue;
  const key = `${leg.matchId}:${identity}`, group = thresholdGroups.get(key) || [];
  group.push(leg); thresholdGroups.set(key, group);
}
const thresholdCases = [...thresholdGroups.entries()].filter(([, group]) => group.length > 1 && group.some(leg => leg.suggestionAnalysis.suggested)).map(([key, group]) => ({
  key,
  matchId: group[0].matchId,
  fixture: group[0].fixture,
  canonicalIdentity: canonicalThresholdIdentity(group[0]),
  alternatives: group.map(leg => ({ selectionId: leg.selectionId, label: leg.label, probabilityPct: leg.betSelection.evaluation.modelProbabilityPct, prudentProbabilityPct: leg.betSelection.evaluation.prudentProbabilityPct, odds: leg.betSelection.quote.decimal, expectedValuePct: leg.betSelection.evaluation.expectedValuePct, expectedValueBasis: leg.betSelection.evaluation.expectedValueBasis, conservativeExpectedValuePct: conservativeExpectedValuePct(leg), reliability: leg.betSelection.operational.reliability.level, selected: leg.suggestionAnalysis.suggested, exclusionReasons: leg.suggestionAnalysis.reasons, decision: leg.suggestionAnalysis.suggested ? "Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza" : (leg.suggestionAnalysis.reasons || []).map(decisionLabel).join("; ") })),
})).slice(0, 8);

const balancedIds = new Set(suggestions.map(leg => leg.selectionId));
const sensitivity = ["probability-first", "solidity-first"].map(mode => {
  const ids = new Set(marketCatalog.matches.flatMap(match => selectMatchSuggestions(match, { rankingMode: mode }).suggestions));
  const changed = [...new Set([...balancedIds, ...ids])].filter(id => balancedIds.has(id) !== ids.has(id));
  return { mode, total: ids.size, changedSelectionsVsBalanced: changed.length, unchangedSelections: [...balancedIds].filter(id => ids.has(id)).length };
});

const coverageFamilies = ["shots", "sot", "corners", "cards"].map(family => {
  const audited = coverage.rows.filter(row => row.family === family);
  const validated = rows.filter(leg => leg.statisticalFamily === family && leg.coverageClassification === "A").length;
  return { family, identified: audited.length, A: validated, B: Math.max(0, audited.filter(row => row.state === STATES.B).length - validated), C: audited.filter(row => row.state === STATES.C).length, D: audited.filter(row => row.state === STATES.D).length, selected: suggestions.filter(leg => leg.suggestionAnalysis.family === family).length };
});

const report = {
  schemaVersion: 2,
  reportType: "SERIE_A_MD06_DEFINITIVE_FORECAST_SELECTION",
  generatedAt: new Date().toISOString(),
  sources: { oddsSnapshot: "data/normalized/odds/sisal/serie-a.json", oddsRetrievedAt: odds.retrievedAt, predictionSnapshot: "data/normalized/predictions.json", predictionGeneratedAt: predictionsData.generatedAt, engineVersion: predictionsData.engine?.version || null, statisticalModels: "data/analysis/serie-a-md06-statistical-models-2026-10-10.json", phase5B: "output/reports/serie-a-md06-phase-5b2-2026-10-09.md", phase5C: "output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md", phase5D: "output/reports/serie-a-md06-phase-5d-duo-audit-2026-10-09.md", phase5E: "output/reports/serie-a-md06-phase-5e-final-audit-2026-10-09.md" },
  availabilityDisclosure: "Quote verificate nello snapshot Sisal del 9 ottobre 2026; disponibilità corrente non verificata.",
  invariants: { certifiedSelections: certifiedRows.length, certifiedSelectionIdsPreserved: [...certifiedById.keys()].every(id => rowById.has(id)), certifiedContractHashBefore: invariantBefore, certifiedContractHashAfter: invariantAfter, certifiedContractsUnchanged: invariantBefore === invariantAfter, catalogSelections: rows.length, evaluatedSelections: rows.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED").length, notModelledSelections: rows.filter(leg => leg.betSelection.evaluation.status === "NOT_MODELLED").length },
  previousEngineAudit: {
    totalSuggestions: baselineTotal,
    criteria: ["Quota verificata nello snapshot", "Probabilità validata", "EV operativo almeno +2%", "EV prudente non negativo per i mercati statistici", "Limiti economici sulle quote", "Scenario coerente o multi-scenario"],
    ordering: ["Segno dell'EV prudente", "Affidabilità", "EV prudente", "EV centrale", "Probabilità prudente", "selectionId stabile"],
    quantityLimit: null,
    deficiencies: ["L'EV determinava ammissione e ordinamento", "Esiti coerenti con EV negativo venivano esclusi", "Quote elevate potevano dominare la selezione statistica"],
  },
  selectionPolicy: {
    status: "SPORTS_COHERENCE_PRIMARY_EV_INFORMATION_ONLY",
    eligibility: ["Quota e identità provider verificate", "Probabilità V2 esistente oppure modello discreto validato", "Probabilità prudente disponibile", "Affidabilità valutata", "Scenario coerente o compatibile con più scenari", "Supporto minimo differenziato per struttura del mercato e affidabilità", "Settlement supportato", "EV non usato come gate"],
    rankingTuple: ["Coerenza con lo scenario prevalente", "Forma diretta della previsione di risultato", "Probabilità prudente", "Solidità del modello", "Probabilità centrale", "selectionId"],
    deduplication: ["Una sola scelta per identità canonica di soglia", "Una sola forma per la stessa tesi direzionale di risultato", "Una sola scelta per eventi logicamente equivalenti", "Nessuna implicazione logica diretta tra due scelte", "Nessuna coppia mutuamente esclusiva"],
    topNLimit: null,
  },
  coverage: { totalSuggestions: suggestions.length, averagePerMatch: Number((suggestions.length / 10).toFixed(1)), byFamily: countBy(suggestions, leg => leg.suggestionAnalysis.family), negativeEvSuggestions: suggestions.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) < 0).length, recoveredFromEconomicExclusion: suggestions.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) < 2).length, perMatch: matchAudit, comparison: { previousSuggestions: baselineTotal, currentSuggestions: suggestions.length, delta: suggestions.length - baselineTotal } },
  thresholdCases,
  sensitivity,
  statisticalMarkets: { families: coverageFamilies, validated: ["Tiri squadra/partita e 1X2", "Tiri in porta squadra/partita e 1X2", "Corner squadra/partita e 1X2"], blocked: ["Tiri e SOT giocatore DUO: sostituto incluso; sui SOT anche pali/traverse", "Tiri e SOT giocatore standard: il contratto richiede almeno una occorrenza in entrambi i tempi e non equivale al totale full-match V2", "Cartellini: le regole Sisal escludono panchina, staff, post-partita e già sostituiti; gli actuals aggregati disponibili non certificano queste esclusioni"], dataNeeded: ["Identità effettiva del sostituto, minuti e pesi di scenario per DUO", "Actuals cartellini event-level con stato del giocatore e timestamp", "Ulteriori snapshot prospettici per monitorare calibrazione e drift senza riusare MD6"] },
  suggestions: suggestions.sort((a, b) => a.matchId.localeCompare(b.matchId) || a.suggestionAnalysis.rank - b.suggestionAnalysis.rank).map(leg => ({ matchId: leg.matchId, fixture: leg.fixture, rank: leg.suggestionAnalysis.rank, family: leg.suggestionAnalysis.family, selectionId: leg.selectionId, market: leg.market, label: leg.label, probabilityPct: leg.betSelection.evaluation.modelProbabilityPct, prudentProbabilityPct: leg.betSelection.evaluation.prudentProbabilityPct, odds: leg.betSelection.quote.decimal, expectedValuePct: leg.betSelection.evaluation.expectedValuePct, expectedValueBasis: leg.betSelection.evaluation.expectedValueBasis, conservativeExpectedValuePct: leg.suggestionAnalysis.conservativeExpectedValuePct, reliability: leg.betSelection.operational.reliability.level, canonicalThresholdIdentity: leg.suggestionAnalysis.canonicalThresholdIdentity })),
  tests: testsPassed ? ["npm run test:schedina:md06", "node scripts/check-schedina-md06-suggestions-browser.cjs", "git diff --check"].map(command => ({ command, status: "PASS" })) : [],
  testLimitations: [],
  filesModified: ["scripts/md06-suggested-forecasts.js", "scripts/build-md06-suggested-forecasts.js", "scripts/test-md06-suggested-forecasts.js", "scripts/test-schedina-md06.js", "scripts/check-schedina-md06-suggestions-browser.cjs", "data/normalized/schedina-md06.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.md", "output/md06/schedina-definitive-1440x1000.png", "output/md06/schedina-definitive-390x844.png"],
};

const familyLabels = { shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri" };
const markdown = [
  "# Serie A 2026/27 — Schedina MD6: revisione definitiva del motore di selezione",
  "",
  `Generato: ${report.generatedAt}. Engine V2 ${report.sources.engineVersion}; quote Sisal snapshot ${report.sources.oddsRetrievedAt}.`,
  "",
  "## Esito",
  "",
  `Selezionati **${report.coverage.totalSuggestions}** pronostici, media **${report.coverage.averagePerMatch}** per partita. Versione precedente: **${report.coverage.comparison.previousSuggestions}**; delta **${report.coverage.comparison.delta}**. I pronostici con EV negativo ora selezionati sono **${report.coverage.negativeEvSuggestions}**: l'EV resta esposto ma non determina ammissione o ordinamento.`,
  "",
  `> ${report.availabilityDisclosure}`,
  "",
  "## A. Audit e copertura",
  "",
  "Il motore precedente escludeva i mercati con EV centrale sotto +2% e, per le famiglie statistiche, con EV prudente negativo. La selezione ora usa coerenza sportiva, probabilità pertinente, solidità e varietà; quota ed EV non partecipano al gate o all'ordinamento generale.",
  "",
  table(["Partita", "Catalogo", "Quotati", "Valutati", "EV > 0", "Precedenti", "Selezionati"], matchAudit.map(row => [row.fixture, row.catalog, row.quoted, row.evaluated, row.positiveEv, row.previousSuggestions, row.selected])),
  "",
  "### Famiglie selezionate",
  "",
  table(["Famiglia", "Numero"], Object.entries(report.coverage.byFamily).map(([family, count]) => [familyLabels[family] || family, count])),
  "",
  "## B. Scelta delle soglie",
  "",
  "Ogni gruppo usa un'identità canonica basata su metrica, entità, direzione e contratto; non sulla somiglianza delle etichette. La soglia è scelta con un obiettivo di probabilità differenziato per tipo di mercato, solidità del modello e un contributo secondario della quota; l'EV non entra nel confronto.",
  "",
  ...thresholdCases.flatMap(item => [
    `### ${item.fixture} — ${item.canonicalIdentity}`,
    "",
    table(["Soglia", "P", "P prudente", "Quota", "EV", "EV prudente", "Affidabilità", "Scelta", "Decisione"], item.alternatives.map(leg => [leg.label, `${leg.probabilityPct}%`, `${leg.prudentProbabilityPct}%`, leg.odds, `${leg.expectedValuePct}%`, `${leg.conservativeExpectedValuePct}%`, leg.reliability, leg.selected ? "SÌ" : "NO", leg.decision])),
    "",
  ]),
  "### Sensibilità dell'euristica",
  "",
  table(["Variante", "Totale", "Scelte cambiate", "Scelte confermate"], sensitivity.map(item => [item.mode, item.total, item.changedSelectionsVsBalanced, item.unchangedSelections])),
  "",
  "Queste varianti non sono nuovi modelli: confrontano priorità alla probabilità o alla solidità senza utilizzare EV o quota nell'ordinamento generale.",
  "",
  "## C. Mercati statistici",
  "",
  table(["Famiglia", "Individuati", "A", "B", "C", "D", "Selezionati"], coverageFamilies.map(row => [familyLabels[row.family], row.identified, row.A, row.B, row.C, row.D, row.selected])),
  "",
  ...report.statisticalMarkets.blocked.map(item => `- ${item}`),
  "",
  "Dati necessari per lo sblocco:",
  "",
  ...report.statisticalMarkets.dataNeeded.map(item => `- ${item}`),
  "",
  "## D. Qualità",
  "",
  `Le 383 selezioni certificate e i loro contratti sono invariati: **${report.invariants.certifiedContractsUnchanged ? "SÌ" : "NO"}**. Il catalogo interno conserva ${report.invariants.catalogSelections} righe, di cui ${report.invariants.notModelledSelections} NOT_MODELLED; la UI mostra soltanto le selezioni del motore.`,
  "",
  ...(testsPassed ? report.tests.map(item => `- PASS — \`${item.command}\``) : ["- Test finali da eseguire dopo la rigenerazione."]),
  ...(testsPassed ? report.testLimitations.map(item => `- ${item.status} — \`${item.command}\`: ${item.detail}`) : []),
  "",
  "## File modificati",
  "",
  ...report.filesModified.map(item => `- \`${item}\``),
  "",
].join("\n");

if (writeNormalized) write("data/normalized/schedina-md06.json", { ...schedina, marketCatalog });
write("output/reports/serie-a-md06-definitive-selection-2026-10-10.json", report);
write("output/reports/serie-a-md06-definitive-selection-2026-10-10.md", markdown);
console.log(JSON.stringify({ status: "PASS", writeNormalized, testsPassed, catalog: report.invariants.catalogSelections, suggestions: report.coverage.totalSuggestions, averagePerMatch: report.coverage.averagePerMatch, byFamily: report.coverage.byFamily, perMatch: matchAudit.map(row => ({ matchId: row.matchId, selected: row.selected })) }, null, 2));
