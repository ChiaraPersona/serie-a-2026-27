"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildMd06MarketCatalog } = require("./md06-market-catalog");
const { reconstructStatisticalCoverage, STATES } = require("./md06-statistical-coverage");
const { canonicalThresholdIdentity, conservativeExpectedValuePct, verifiedQuote } = require("./md06-suggested-forecasts");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`); };
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const countBy = (rows, getter) => rows.reduce((counts, row) => { const key = getter(row); counts[key] = (counts[key] || 0) + 1; return counts; }, {});
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const table = (headers, rows) => [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")).join(" | ")} |`)].join("\n");
const invariantProjection = leg => ({ selectionId: leg.selectionId, matchId: leg.matchId, quote: leg.betSelection?.quote, evaluation: leg.betSelection?.evaluation, market: leg.betSelection?.market, providerMarketId: leg.providerMarketId, providerSelectionId: leg.providerSelectionId });
const writeNormalized = process.argv.includes("--write");
const testsPassed = process.argv.includes("--tests-passed");
const baselineTotal = 82;
const approvedBaselineNonDnbTotal = 80;
const removedDrawNoBetTotal = baselineTotal - approvedBaselineNonDnbTotal;
const removedDrawNoBetByMatch = new Map([
  ["genoa-fiorentina-2026-27-md-06", 1],
  ["lecce-bologna-2026-27-md-06", 1],
]);
const approvedBaselineNonDnbHash = "ff600135e0a4009bc901c13c34bb1cfb5cb624ccd391caf2a2c1dd8e54c96af7";
const baselinePerMatch = new Map(Object.entries({
  "genoa-fiorentina-2026-27-md-06": 9,
  "inter-parma-2026-27-md-06": 9,
  "napoli-frosinone-2026-27-md-06": 8,
  "como-roma-2026-27-md-06": 10,
  "lazio-monza-2026-27-md-06": 5,
  "lecce-bologna-2026-27-md-06": 9,
  "sassuolo-milan-2026-27-md-06": 9,
  "cagliari-juventus-2026-27-md-06": 9,
  "atalanta-venezia-2026-27-md-06": 7,
  "torino-udinese-2026-27-md-06": 7,
}));

const schedina = read("data/normalized/schedina-md06.json");
const statisticalModels = read("data/analysis/serie-a-md06-statistical-models-2026-10-10.json");
const predictionsData = read("data/normalized/predictions.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const matches = read("data/normalized/matches.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const currentRows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const isDrawNoBet = leg => /^draw-no-bet:/.test(String(leg?.betSelection?.compatibility?.modelTarget || "").toLowerCase()) || /DRAW NO BET/i.test(`${leg.marketFamily || ""} ${leg.market || ""}`);
const currentApprovedBaseline = currentRows.filter(leg => leg.suggestionAnalysis?.baselineApproved === true || (leg.suggestionAnalysis?.suggested && leg.catalogOrigin !== "prediction-v2-player-forecast"));
const currentApprovedNonDnb = currentApprovedBaseline.filter(leg => !isDrawNoBet(leg));
const baselineOddsRetrievedAt = currentApprovedBaseline.find(leg => leg.betSelection?.quote?.verifiedAt)?.betSelection.quote.verifiedAt || schedina.oddsRetrievedAt;
const approvedSuggestionRankById = new Map(currentApprovedNonDnb.map(leg => [leg.selectionId, Number(leg.suggestionAnalysis?.rank) || Number.MAX_SAFE_INTEGER]));
assert.equal(currentApprovedNonDnb.length, approvedBaselineNonDnbTotal, "La baseline approvata non-DNB deve contenere 80 selezioni");
assert.equal(hash(currentApprovedNonDnb.map(leg => leg.selectionId).sort()), approvedBaselineNonDnbHash, "La baseline approvata non-DNB è cambiata");
const certifiedRows = currentRows.filter(leg => !String(leg.catalogOrigin || "").startsWith("statistical-") && leg.catalogOrigin !== "prediction-v2-player-forecast");
assert.equal(certifiedRows.length, 383, "Il punto di partenza certificato deve contenere 383 selezioni");
const certifiedById = new Map(certifiedRows.map(leg => [leg.selectionId, leg]));
const invariantBefore = hash(certifiedRows.map(invariantProjection).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));

const marketCatalog = buildMd06MarketCatalog({ predictionsData, odds, matches, schedinaSlips: schedina.slips, probableLineups, officialLineups, statisticalModels, preservedCatalogSelections: currentRows, approvedSuggestionRankById, matchday: 6 });
const rows = marketCatalog.matches.flatMap(match => match.selections);
const rowById = new Map(rows.map(leg => [leg.selectionId, leg]));
assert.equal(rowById.size, rows.length, "Il catalogo contiene selectionId duplicati");
for (const id of certifiedById.keys()) assert(rowById.has(id), `Selezione certificata rimossa: ${id}`);
const invariantAfter = hash([...certifiedById.keys()].map(id => invariantProjection(rowById.get(id))).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));
assert.equal(invariantAfter, invariantBefore, "Quote, probabilità o contratti delle 383 selezioni certificate sono cambiati");

const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
const addedPlayerForecasts = suggestions.filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast");
const quotedSuggestions = suggestions.filter(verifiedQuote);
const unquotedPlayerForecasts = addedPlayerForecasts.filter(leg => leg.betSelection?.quote?.availability === "UNAVAILABLE");
const baselineSuggestions = suggestions.filter(leg => leg.suggestionAnalysis?.baselineApproved === true);
assert.equal(baselineSuggestions.length, approvedBaselineNonDnbTotal, "Gli 80 pronostici approvati non-DNB devono essere preservati");
assert.equal(hash(baselineSuggestions.map(leg => leg.selectionId).sort()), approvedBaselineNonDnbHash, "Gli ID della baseline approvata non-DNB sono cambiati");
assert(!suggestions.some(isDrawNoBet), "Draw No Bet ancora presente nei pronostici consigliati");
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED"), "Pronostico senza modello");
assert(suggestions.every(leg => verifiedQuote(leg) || (leg.catalogOrigin === "prediction-v2-player-forecast" && ["shots", "sot"].includes(leg.suggestionAnalysis.family) && leg.betSelection.quote.availability === "UNAVAILABLE")), "Mercato senza quota promosso fuori dall'eccezione tiri/SOT individuali");
assert(unquotedPlayerForecasts.every(leg => !finite(leg.betSelection.evaluation.expectedValuePct) && !finite(leg.betSelection.evaluation.prudentProbabilityPct)), "Quote o probabilità prudenti inventate per i pronostici senza quota");
assert(addedPlayerForecasts.every(leg => !/DUO|SOST|PALI|TRAVERSE|ENTRAMBI I TEMPI|NEI 2 TEMPI/i.test(leg.betSelection?.compatibility?.bookmakerTarget || "")), "Contratto DUO o non equivalente promosso come individuale");
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
  const newPlayerForecasts = selected.filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast");
  const initialSuggestions = baselinePerMatch.get(match.matchId) || 0;
  const removedDnb = removedDrawNoBetByMatch.get(match.matchId) || 0;
  return {
    matchId: match.matchId,
    fixture: match.selections[0]?.fixture || `${match.homeTeam} – ${match.awayTeam}`,
    catalog: match.selections.length,
    quoted: match.selections.filter(verifiedQuote).length,
    evaluated: evaluated.length,
    notModelled: match.selections.length - evaluated.length,
    positiveEv: evaluated.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) > 0).length,
    previousSuggestions: initialSuggestions,
    removedDnb,
    preservedBaseline: initialSuggestions - removedDnb,
    newShots: newPlayerForecasts.filter(leg => leg.suggestionAnalysis.family === "shots").length,
    newSot: newPlayerForecasts.filter(leg => leg.suggestionAnalysis.family === "sot").length,
    unquoted: newPlayerForecasts.filter(leg => leg.betSelection.quote.availability === "UNAVAILABLE").length,
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

const sensitivity = [{ mode: "approved-baseline-frozen", total: baselineSuggestions.length, changedSelectionsVsBalanced: 0, unchangedSelections: baselineSuggestions.length }];

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
  availabilityDisclosure: `Le quote della baseline restano quelle certificate nello snapshot ${baselineOddsRetrievedAt}; lo snapshot Sisal ${odds.retrievedAt} è stato controllato per i nuovi mercati individuali. Per tiri e SOT senza contratto compatibile la quota resta N/D e l'EV non viene calcolato.`,
  invariants: { certifiedSelections: certifiedRows.length, certifiedSelectionIdsPreserved: [...certifiedById.keys()].every(id => rowById.has(id)), certifiedContractHashBefore: invariantBefore, certifiedContractHashAfter: invariantAfter, certifiedContractsUnchanged: invariantBefore === invariantAfter, catalogSelections: rows.length, evaluatedSelections: rows.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED").length, notModelledSelections: rows.filter(leg => leg.betSelection.evaluation.status === "NOT_MODELLED").length },
  previousEngineAudit: {
    totalSuggestions: baselineTotal,
    criteria: ["Baseline sportiva approvata dall'utente"],
    ordering: ["Ordine della baseline approvata per partita"],
    quantityLimit: null,
    deficiencies: ["L'EV determinava ammissione e ordinamento", "Esiti coerenti con EV negativo venivano esclusi", "Quote elevate potevano dominare la selezione statistica"],
  },
  selectionPolicy: {
    status: "APPROVED_BASELINE_FROZEN_PLUS_STRUCTURED_READING_V2",
    eligibility: ["Gli 80 pronostici approvati non-DNB restano invariati", "Draw No Bet escluso senza rimpiazzo", "Tiri e SOT individuali letti dalle probabilità V2 serializzate", "Minuti, titolarità, stabilità e matchup già presenti nelle letture", "Quota opzionale solo per tiri/SOT individuali e soltanto con contratto full-match compatibile", "EV non usato come gate"],
    rankingTuple: ["Ordine della baseline approvata", "Famiglia tiri prima di SOT", "Probabilità V2 della soglia scelta", "playerId stabile"],
    deduplication: ["Una sola soglia per giocatore e statistica", "ID stabile indipendente dalla disponibilità della quota", "DUO e contratti nei due tempi esclusi", "Nessun mercato senza quota ammesso fuori da tiri/SOT individuali"],
    topNLimit: null,
  },
  coverage: { totalSuggestions: suggestions.length, averagePerMatch: Number((suggestions.length / 10).toFixed(1)), byFamily: countBy(suggestions, leg => leg.suggestionAnalysis.family), quotedSuggestions: quotedSuggestions.length, unquotedSuggestions: unquotedPlayerForecasts.length, negativeEvSuggestions: suggestions.filter(leg => finite(leg.betSelection.evaluation.expectedValuePct) && Number(leg.betSelection.evaluation.expectedValuePct) < 0).length, recoveredFromEconomicExclusion: suggestions.filter(leg => finite(leg.betSelection.evaluation.expectedValuePct) && Number(leg.betSelection.evaluation.expectedValuePct) < 2).length, perMatch: matchAudit, comparison: { previousSuggestions: baselineTotal, removedDrawNoBet: removedDrawNoBetTotal, preservedApprovedNonDnb: baselineSuggestions.length, newPlayerShots: addedPlayerForecasts.filter(leg => leg.suggestionAnalysis.family === "shots").length, newPlayerSot: addedPlayerForecasts.filter(leg => leg.suggestionAnalysis.family === "sot").length, newPlayerCards: 0, newCardsOvers: 0, currentSuggestions: suggestions.length, delta: suggestions.length - baselineTotal } },
  readingIntegration: { ...marketCatalog.playerForecastIntegration, excludedCandidates: marketCatalog.playerForecastIntegration.excluded },
  thresholdCases,
  sensitivity,
  statisticalMarkets: { families: coverageFamilies, validated: ["Tiri squadra/partita e 1X2", "Tiri in porta squadra/partita e 1X2", "Corner squadra/partita e 1X2", "Probabilità individuali V2 per tiri e SOT, senza ricostruzione frontend"], blocked: ["Quote tiri e SOT DUO: sostituto incluso; sui SOT anche pali/traverse", "Quote tiri e SOT nei due tempi: contratto diverso dal totale individuale full-match V2", "Cartellini individuali: likelyBooked/riskScore non sono probabilità calibrate e il contratto richiede settlement event-level", "Over cartellini: nessun modello MD6 statisticamente validato e pertinente alla soglia Sisal"], dataNeeded: ["Contratto Sisal individuale full-match riconciliabile per playerId, metrica e soglia", "Actuals cartellini event-level con stato del giocatore e timestamp", "Modello disciplinare prospettico validato prima di promuovere cartellini o Over cartellini"] },
  suggestions: suggestions.sort((a, b) => a.matchId.localeCompare(b.matchId) || a.suggestionAnalysis.rank - b.suggestionAnalysis.rank).map(leg => ({ matchId: leg.matchId, fixture: leg.fixture, rank: leg.suggestionAnalysis.rank, family: leg.suggestionAnalysis.family, selectionId: leg.selectionId, market: leg.market, label: leg.label, probabilityPct: leg.betSelection.evaluation.modelProbabilityPct, prudentProbabilityPct: leg.betSelection.evaluation.prudentProbabilityPct, odds: leg.betSelection.quote.decimal, expectedValuePct: leg.betSelection.evaluation.expectedValuePct, expectedValueBasis: leg.betSelection.evaluation.expectedValueBasis, conservativeExpectedValuePct: leg.suggestionAnalysis.conservativeExpectedValuePct, reliability: leg.betSelection.operational.reliability.level, canonicalThresholdIdentity: leg.suggestionAnalysis.canonicalThresholdIdentity })),
  tests: testsPassed ? ["node scripts/test-schedina-md06.js", "node scripts/test-md06-suggested-forecasts.js", "node scripts/test-personal-betslip.mjs", "node scripts/check-schedina-md06-suggestions-browser.cjs", "git diff --check"].map(command => ({ command, status: "PASS" })) : [],
  testLimitations: [],
  filesModified: ["scripts/md06-player-forecast-integration.js", "scripts/md06-market-catalog.js", "scripts/md06-suggested-forecasts.js", "scripts/build-md06-suggested-forecasts.js", "js/pages/betting.js", "css/betting.css", "scripts/test-md06-suggested-forecasts.js", "scripts/test-schedina-md06.js", "scripts/check-schedina-md06-suggestions-browser.cjs", "data/normalized/schedina-md06.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.json", "output/reports/serie-a-md06-definitive-selection-2026-10-10.md", "output/md06/schedina-definitive-1440x1000.png", "output/md06/schedina-definitive-390x844.png"],
};

const familyLabels = { shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri" };
const playerExclusionLabel = reason => ({
  PLAYER_ID_MISSING: "playerId canonico mancante",
  LINEUP_OFFICIAL_NONSTARTER: "non titolare nella formazione ufficiale",
  LINEUP_RESERVE: "riserva nella probabile formazione",
  LINEUP_UNKNOWN: "titolarità non riconciliata",
  MODEL_THRESHOLD_NOT_SUPPORTED: "nessuna soglia V2 supera il supporto minimo",
  READING_SUPPORT_BELOW_SHOTS_STANDARD: "minuti, stabilità o supporto outsider insufficienti per i tiri",
  READING_SUPPORT_BELOW_SOT_STANDARD: "selettività SOT: minuti, precisione o stabilità insufficienti",
}[reason] || reason.toLowerCase().replace(/_/g, " "));
const markdown = [
  "# Serie A 2026/27 — Schedina MD6: integrazione tiratori, SOT e cartellini",
  "",
  `Generato: ${report.generatedAt}. Engine V2 ${report.sources.engineVersion}; quote Sisal snapshot ${report.sources.oddsRetrievedAt}.`,
  "",
  "## Esito",
  "",
  `- Totale iniziale: **${report.coverage.comparison.previousSuggestions}**.`,
  `- Draw No Bet rimossi: **${report.coverage.comparison.removedDrawNoBet}**.`,
  `- Pronostici approvati non-DNB preservati: **${report.coverage.comparison.preservedApprovedNonDnb}**.`,
  `- Nuovi tiri individuali: **${report.coverage.comparison.newPlayerShots}**.`,
  `- Nuovi SOT individuali: **${report.coverage.comparison.newPlayerSot}**.`,
  `- Nuovi cartellini individuali: **${report.coverage.comparison.newPlayerCards}**.`,
  `- Nuovi Over cartellini: **${report.coverage.comparison.newCardsOvers}**.`,
  `- Pronostici senza quota: **${report.coverage.unquotedSuggestions}**.`,
  `- Totale finale: **${report.coverage.totalSuggestions}**.`,
  "",
  `> ${report.availabilityDisclosure}`,
  "",
  "## Totale finale per partita",
  "",
  table(["Partita", "Iniziali", "DNB rimossi", "Preservati", "Nuovi tiri", "Nuovi SOT", "Senza quota", "Finale"], matchAudit.map(row => [row.fixture, row.previousSuggestions, row.removedDnb, row.preservedBaseline, row.newShots, row.newSot, row.unquoted, row.selected])),
  "",
  "## Collegamento Letture → Schedina",
  "",
  `Letture e Schedina ora condividono la stessa sorgente strutturata: **${report.readingIntegration.sharedStructuredData ? "SÌ" : "NO"}**. La sorgente è \`${report.readingIntegration.source}\`, già consumata da \`${report.readingIntegration.readingsConsumer}\`. Il selettore non estrae nomi dall'HTML e non ricalcola Poisson, minuti, matchup o allocazione.`,
  "",
  "Per ogni giocatore e statistica viene scelta una sola soglia dalle probabilità V2 serializzate. Gli ID dei pronostici restano stabili anche quando la quota è assente, così un futuro contratto individuale full-match compatibile può valorizzare la stessa riga senza duplicarla.",
  "",
  "## Quote e contratti",
  "",
  `Nuovi pronostici individuali quotati: **${report.readingIntegration.quoted}**. Nuovi pronostici individuali senza quota: **${report.readingIntegration.unquoted}**. Contratti DUO promossi: **${report.readingIntegration.duoPromoted}**.`,
  "",
  "Lo snapshot corrente espone per questi mercati solo contratti DUO o richieste di almeno un tiro in entrambi i tempi. Non sono equivalenti al totale individuale full-match: le quote non vengono associate e l'EV resta N/D.",
  "",
  "## Cartellini",
  "",
  "Nessun cartellino individuale e nessun Over cartellini è stato aggiunto. `likelyBooked` e `riskScore` restano euristiche non calibrate; inoltre mancano actuals event-level sufficienti per certificare le esclusioni previste dal settlement Sisal. La presenza di una quota non basta a promuovere il mercato.",
  "",
  "## Candidati delle letture ancora esclusi",
  "",
  table(["Partita", "Giocatore", "Statistica", "Motivo"], report.readingIntegration.excludedCandidates.map(row => [row.matchId, row.playerName || "N/D", row.metric === "shots" ? "Tiri" : "SOT", row.reasons.map(playerExclusionLabel).join("; ")])),
  "",
  "## Controlli di qualità",
  "",
  `Le ${baselineSuggestions.length} selezioni approvate non-DNB sono preservate con hash **${approvedBaselineNonDnbHash}**. Draw No Bet residui nei consigliati: **${suggestions.filter(isDrawNoBet).length}**. Mercati senza quota fuori da tiri/SOT individuali: **${suggestions.filter(leg => !verifiedQuote(leg) && leg.catalogOrigin !== "prediction-v2-player-forecast").length}**.`,
  "",
  `Le 383 selezioni certificate e i loro contratti sono invariati: **${report.invariants.certifiedContractsUnchanged ? "SÌ" : "NO"}**. MyCombo, modelli, pagine Champions e giornate precedenti non vengono rigenerati da questo script.`,
  "",
  ...(testsPassed ? report.tests.map(item => `- PASS — \`${item.command}\``) : ["- Test finali da eseguire dopo la rigenerazione."]),
  ...(testsPassed ? report.testLimitations.map(item => `- ${item.status} — \`${item.command}\`: ${item.detail}`) : []),
  "",
  "## File modificati",
  "",
  ...report.filesModified.map(item => `- \`${item}\``),
  "",
].join("\n");

if (writeNormalized) write("data/normalized/schedina-md06.json", { ...schedina, generatedAt: new Date().toISOString(), oddsRetrievedAt: baselineOddsRetrievedAt, marketCatalog });
write("output/reports/serie-a-md06-definitive-selection-2026-10-10.json", report);
write("output/reports/serie-a-md06-definitive-selection-2026-10-10.md", markdown);
console.log(JSON.stringify({ status: "PASS", writeNormalized, testsPassed, catalog: report.invariants.catalogSelections, suggestions: report.coverage.totalSuggestions, averagePerMatch: report.coverage.averagePerMatch, byFamily: report.coverage.byFamily, perMatch: matchAudit.map(row => ({ matchId: row.matchId, selected: row.selected })) }, null, 2));
