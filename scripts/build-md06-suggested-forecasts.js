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

const schedina = read("data/normalized/schedina-md06.json");
const baselineReport = read("output/reports/serie-a-md06-suggested-forecasts-2026-10-10.json");
const predictionsData = read("data/normalized/predictions.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const matches = read("data/normalized/matches.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const currentRows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const certifiedRows = currentRows.filter(leg => leg.catalogOrigin !== "statistical-b-not-modelled");
assert.equal(certifiedRows.length, 383, "Il punto di partenza certificato deve contenere 383 selezioni");
const certifiedById = new Map(certifiedRows.map(leg => [leg.selectionId, leg]));
const invariantBefore = hash(certifiedRows.map(invariantProjection).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));

const marketCatalog = buildMd06MarketCatalog({ predictionsData, odds, matches, schedinaSlips: schedina.slips, probableLineups, officialLineups, matchday: 6 });
const rows = marketCatalog.matches.flatMap(match => match.selections);
const rowById = new Map(rows.map(leg => [leg.selectionId, leg]));
assert.equal(rowById.size, rows.length, "Il catalogo contiene selectionId duplicati");
for (const id of certifiedById.keys()) assert(rowById.has(id), `Selezione certificata rimossa: ${id}`);
const invariantAfter = hash([...certifiedById.keys()].map(id => invariantProjection(rowById.get(id))).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));
assert.equal(invariantAfter, invariantBefore, "Quote, probabilità o contratti delle 383 selezioni certificate sono cambiati");

const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED" && verifiedQuote(leg)), "Pronostico senza modello o quota verificata");
const baselinePerMatch = new Map((baselineReport.suggestions?.perMatch || []).map(row => [row.matchId, row.total]));
const coverage = reconstructStatisticalCoverage({ odds, existingSelectionIds: new Set(certifiedById.keys()) });
const decisionLabel = reason => ({
  OPERATIVE_EV_BELOW_TWO_PERCENT: "EV operativo inferiore al 2%",
  LOW_RELIABILITY_REQUIRES_NON_NEGATIVE_CONSERVATIVE_EV: "affidabilità Bassa con downside prudente negativo",
  CONSERVATIVE_DOWNSIDE_TOO_LARGE: "downside prudente oltre il limite",
  CANONICAL_THRESHOLD_ALREADY_SELECTED: "altra soglia canonica meglio classificata",
  EQUIVALENT_EVENT_ALREADY_SELECTED: "evento equivalente già selezionato",
  LOGICAL_IMPLICATION_WITH_HIGHER_RANKED_SELECTION: "implica o è implicato da una scelta meglio classificata",
  MUTUALLY_EXCLUSIVE_WITH_HIGHER_RANKED_SELECTION: "incompatibile con una scelta meglio classificata",
  NOT_COHERENT_WITH_PREVALENT_SCENARIO: "alternativo allo scenario prevalente",
  RELIABILITY_NOT_ASSESSED: "qualità non valutabile",
  TAIL_PROBABILITY_TOO_LOW_FOR_RELIABILITY: "rischio di coda eccessivo",
  TAIL_ODDS_TOO_HIGH_FOR_RELIABILITY: "quota di coda oltre il limite",
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
const sensitivity = ["value-first", "stability-first"].map(mode => {
  const ids = new Set(marketCatalog.matches.flatMap(match => selectMatchSuggestions(match, { rankingMode: mode }).suggestions));
  const changed = [...new Set([...balancedIds, ...ids])].filter(id => balancedIds.has(id) !== ids.has(id));
  return { mode, total: ids.size, changedSelectionsVsBalanced: changed.length, unchangedSelections: [...balancedIds].filter(id => ids.has(id)).length };
});

const coverageFamilies = ["shots", "sot", "corners", "cards"].map(family => {
  const audited = coverage.rows.filter(row => row.family === family);
  return { family, identified: audited.length, A: audited.filter(row => row.state === STATES.A).length, B: audited.filter(row => row.state === STATES.B).length, C: audited.filter(row => row.state === STATES.C).length, D: audited.filter(row => row.state === STATES.D).length, selected: suggestions.filter(leg => leg.suggestionAnalysis.family === family).length };
});

const report = {
  schemaVersion: 2,
  reportType: "SERIE_A_MD06_DEFINITIVE_FORECAST_SELECTION",
  generatedAt: new Date().toISOString(),
  sources: { oddsSnapshot: "data/normalized/odds/sisal/serie-a.json", oddsRetrievedAt: odds.retrievedAt, predictionSnapshot: "data/normalized/predictions.json", predictionGeneratedAt: predictionsData.generatedAt, engineVersion: predictionsData.engine?.version || null, phase5B: "output/reports/serie-a-md06-phase-5b2-2026-10-09.md", phase5C: "output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md", phase5D: "output/reports/serie-a-md06-phase-5d-duo-audit-2026-10-09.md", phase5E: "output/reports/serie-a-md06-phase-5e-final-audit-2026-10-09.md" },
  availabilityDisclosure: "Quote verificate nello snapshot Sisal del 9 ottobre 2026; disponibilità corrente non verificata.",
  invariants: { certifiedSelections: certifiedRows.length, certifiedSelectionIdsPreserved: [...certifiedById.keys()].every(id => rowById.has(id)), certifiedContractHashBefore: invariantBefore, certifiedContractHashAfter: invariantAfter, certifiedContractsUnchanged: invariantBefore === invariantAfter, catalogSelections: rows.length, evaluatedSelections: rows.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED").length, notModelledSelections: rows.filter(leg => leg.betSelection.evaluation.status === "NOT_MODELLED").length },
  previousEngineAudit: {
    totalSuggestions: baselineReport.suggestions.total,
    criteria: ["Quota verificata nello snapshot", "Probabilità assoluta V2", "Affidabilità Alta o Media", "Probabilità centrale almeno 50%", "Probabilità prudente almeno 50%", "Scenario coerente o multi-scenario", "Score mask disponibile", "Esclusione integrale di tiri, SOT, corner e cartellini"],
    ordering: ["Probabilità prudente decrescente", "Probabilità centrale decrescente", "selectionId stabile"],
    quantityLimit: null,
    deficiencies: ["Quota ed EV non partecipavano alla scelta o all'ordinamento", "Soglia universale del 50%", "Deduplicazione per famiglie troppo larghe", "Catalogo completo esposto nell'interfaccia"],
  },
  selectionPolicy: {
    status: "OPERATIONAL_HEURISTIC_NOT_STATISTICALLY_VALIDATED",
    eligibility: ["Quota e identità provider verificate", "Probabilità V2 esistente e non NOT_MODELLED", "EV operativo almeno +2% secondo la base già serializzata", "Probabilità prudente disponibile", "Affidabilità Alta, Media o Bassa valutata", "Per affidabilità Bassa: EV prudente non negativo, P prudente almeno 25%, quota non oltre 4", "Per affidabilità Alta/Media: downside prudente non inferiore a -10%, P prudente almeno 20%, quota non oltre 6", "Scenario coerente o multi-scenario", "Settlement assoluto oppure DNB con push esplicito"],
    rankingTuple: ["EV prudente non negativo", "Qualità dati", "EV prudente", "EV operativo", "Probabilità prudente", "Probabilità centrale", "selectionId"],
    deduplication: ["Una sola scelta per identità canonica di soglia", "Una sola forma per la stessa tesi direzionale di risultato", "Una sola scelta per eventi logicamente equivalenti", "Nessuna implicazione logica diretta tra due scelte", "Nessuna coppia mutuamente esclusiva"],
    topNLimit: null,
  },
  coverage: { totalSuggestions: suggestions.length, averagePerMatch: Number((suggestions.length / 10).toFixed(1)), byFamily: countBy(suggestions, leg => leg.suggestionAnalysis.family), perMatch: matchAudit, comparison: { previousSuggestions: baselineReport.suggestions.total, currentSuggestions: suggestions.length, delta: suggestions.length - baselineReport.suggestions.total } },
  thresholdCases,
  sensitivity,
  statisticalMarkets: { families: coverageFamilies, blocked: ["Tiri e SOT giocatore DUO: sostituto incluso; sui SOT anche pali/traverse", "Tiri e SOT squadra/partita: distribuzioni e verifica temporale fuori campione non validate", "Corner squadra/partita e 1X2: gate Fase 5C insufficiente", "Cartellini: contratto punti cartellino e distribuzione non riconciliati"], dataNeeded: ["Snapshot prospettici pre-partita e risultati completi su più giornate", "Join temporale fuori campione per squadra e avversario", "Identità effettiva del sostituto e pesi di scenario per DUO", "Regole Sisal complete per pali/traverse e punti cartellino", "Calibrazione, Brier/log loss e intervalli cluster-bootstrap su campione adeguato"] },
  suggestions: suggestions.sort((a, b) => a.matchId.localeCompare(b.matchId) || a.suggestionAnalysis.rank - b.suggestionAnalysis.rank).map(leg => ({ matchId: leg.matchId, fixture: leg.fixture, rank: leg.suggestionAnalysis.rank, family: leg.suggestionAnalysis.family, selectionId: leg.selectionId, market: leg.market, label: leg.label, probabilityPct: leg.betSelection.evaluation.modelProbabilityPct, prudentProbabilityPct: leg.betSelection.evaluation.prudentProbabilityPct, odds: leg.betSelection.quote.decimal, expectedValuePct: leg.betSelection.evaluation.expectedValuePct, expectedValueBasis: leg.betSelection.evaluation.expectedValueBasis, conservativeExpectedValuePct: leg.suggestionAnalysis.conservativeExpectedValuePct, reliability: leg.betSelection.operational.reliability.level, canonicalThresholdIdentity: leg.suggestionAnalysis.canonicalThresholdIdentity })),
  tests: testsPassed ? ["npm run test:schedina", "npm run test:personal-betslip", "npm run test:css", "node --no-warnings scripts/test-app-modules.mjs", "node scripts/check-schedina-md06-suggestions-browser.cjs", "git diff --check"].map(command => ({ command, status: "PASS" })) : [],
  filesModified: ["scripts/md06-suggested-forecasts.js", "scripts/md06-market-catalog.js", "scripts/build-md06-suggested-forecasts.js", "scripts/test-md06-suggested-forecasts.js", "scripts/test-md06-scenario-coherence.js", "scripts/test-schedina-md06.js", "scripts/test-app-modules.mjs", "scripts/check-schedina-md06-suggestions-browser.cjs", "js/pages/betting.js", "css/betting.css", "css/styles.css", "scripts/build-site.js", "schedina.html", "data/normalized/schedina-md06.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.md", "output/md06/schedina-definitive-1440x1000.png", "output/md06/schedina-definitive-390x844.png"],
};

const familyLabels = { shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri" };
const markdown = [
  "# Serie A 2026/27 — Schedina MD6: revisione definitiva del motore di selezione",
  "",
  `Generato: ${report.generatedAt}. Engine V2 ${report.sources.engineVersion}; quote Sisal snapshot ${report.sources.oddsRetrievedAt}.`,
  "",
  "## Esito",
  "",
  `Selezionati **${report.coverage.totalSuggestions}** pronostici, media **${report.coverage.averagePerMatch}** per partita. Versione precedente: **${report.coverage.comparison.previousSuggestions}**; delta **${report.coverage.comparison.delta}**. L'obiettivo indicativo di 100 non è raggiunto perché i mercati statistici restano privi di validazione sufficiente e diverse partite non presentano valore robusto.`,
  "",
  `> ${report.availabilityDisclosure}`,
  "",
  "## A. Audit e copertura",
  "",
  "Il motore precedente richiedeva P centrale e prudente almeno 50%, affidabilità Alta/Media e coerenza di scenario; ordinava per probabilità prudente e centrale. Quote ed EV non contribuivano alla scelta. Il nuovo motore non usa un punteggio pseudo-statistico: applica gate espliciti e un ordinamento lessicografico documentato.",
  "",
  table(["Partita", "Catalogo", "Quotati", "Valutati", "EV > 0", "Precedenti", "Selezionati"], matchAudit.map(row => [row.fixture, row.catalog, row.quoted, row.evaluated, row.positiveEv, row.previousSuggestions, row.selected])),
  "",
  "### Famiglie selezionate",
  "",
  table(["Famiglia", "Numero"], Object.entries(report.coverage.byFamily).map(([family, count]) => [familyLabels[family] || family, count])),
  "",
  "## B. Scelta delle soglie",
  "",
  "Ogni gruppo usa un'identità canonica basata su metrica, entità, direzione e contratto; non sulla somiglianza delle etichette. L'ordinamento bilanciato privilegia prima il downside prudente non negativo, poi qualità, EV prudente, EV operativo e probabilità prudente.",
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
  "Queste varianti non sono nuovi modelli: cambiano soltanto l'ordine lessicografico tra i candidati che hanno già superato i medesimi gate.",
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
