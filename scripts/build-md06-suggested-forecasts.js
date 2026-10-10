"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildMd06MarketCatalog } = require("./md06-market-catalog");
const { reconstructStatisticalCoverage, STATES } = require("./md06-statistical-coverage");

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
const predictionsData = read("data/normalized/predictions.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const matches = read("data/normalized/matches.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const currentRows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const previousRows = currentRows.filter(leg => leg.catalogOrigin !== "statistical-b-not-modelled");
assert.equal(previousRows.length, 383, "Il punto di partenza certificato deve contenere 383 selezioni");
const previousById = new Map(previousRows.map(leg => [leg.selectionId, leg]));
const previousInvariantHash = hash([...previousById.values()].map(invariantProjection).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));

const marketCatalog = buildMd06MarketCatalog({ predictionsData, odds, matches, schedinaSlips: schedina.slips, probableLineups, officialLineups, matchday: 6 });
const rows = marketCatalog.matches.flatMap(match => match.selections);
const rowById = new Map(rows.map(leg => [leg.selectionId, leg]));
assert.equal(rowById.size, rows.length, "Il catalogo ampliato contiene selectionId duplicati");
for (const id of previousById.keys()) assert(rowById.has(id), `Selezione certificata rimossa: ${id}`);
const preservedHash = hash([...previousById.keys()].map(id => invariantProjection(rowById.get(id))).sort((a, b) => a.selectionId.localeCompare(b.selectionId)));
assert.equal(preservedHash, previousInvariantHash, "Quote, probabilità o contratti delle 383 selezioni certificate sono cambiati");

const coverage = reconstructStatisticalCoverage({ odds, existingSelectionIds: new Set(previousById.keys()) });
const added = rows.filter(leg => !previousById.has(leg.selectionId));
assert(added.every(leg => leg.catalogOrigin === "statistical-b-not-modelled" && leg.betSelection.evaluation.status === "NOT_MODELLED"), "Sono state aggiunte righe diverse dalla classe B NOT_MODELLED");
const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED" && Number.isFinite(leg.betSelection.quote.decimal)), "Suggerimento senza modello o quota");

const coverageByMatch = new Map();
for (const row of coverage.rows) {
  const bucket = coverageByMatch.get(row.matchId) || [];
  bucket.push(row);
  coverageByMatch.set(row.matchId, bucket);
}
const matchRows = marketCatalog.matches.map(match => {
  const audit = coverageByMatch.get(match.matchId) || [];
  const matchSuggestions = match.selections.filter(leg => leg.suggestionAnalysis?.suggested);
  const previous = match.selections.filter(leg => previousById.has(leg.selectionId));
  const newRows = match.selections.filter(leg => !previousById.has(leg.selectionId));
  return {
    matchId: match.matchId,
    fixture: match.selections[0]?.fixture || `${match.homeTeam} – ${match.awayTeam}`,
    sisalMarketsIdentified: new Set(audit.map(row => row.providerMarketId)).size,
    sisalOutcomesClassified: audit.length,
    previousCatalog: previous.length,
    added: newRows.length,
    states: { A: audit.filter(row => row.state === STATES.A).length, B: audit.filter(row => row.state === STATES.B).length, C: audit.filter(row => row.state === STATES.C).length, D: audit.filter(row => row.state === STATES.D).length },
    suggestions: matchSuggestions.length,
    suggestionsByFamily: countBy(matchSuggestions, leg => leg.suggestionAnalysis.family),
    excludedReasons: countBy(audit.filter(row => [STATES.C, STATES.D].includes(row.state)), row => row.reason),
  };
});

const familyRows = ["shots", "sot", "corners", "cards"].map(family => {
  const audit = coverage.rows.filter(row => row.family === family);
  const addedFamily = added.filter(leg => leg.statisticalFamily === family);
  return { family, identified: audit.length, A: audit.filter(row => row.state === STATES.A).length, B: audit.filter(row => row.state === STATES.B).length, C: audit.filter(row => row.state === STATES.C).length, D: audit.filter(row => row.state === STATES.D).length, addedNotModelled: addedFamily.length, suggested: suggestions.filter(leg => leg.suggestionAnalysis.family === family).length };
});

const report = {
  schemaVersion: 1,
  reportType: "SERIE_A_MD06_SUGGESTED_FORECASTS_AND_STATISTICAL_COVERAGE",
  generatedAt: new Date().toISOString(),
  sources: { oddsSnapshot: "data/normalized/odds/sisal/serie-a.json", oddsRetrievedAt: odds.retrievedAt, rawFile: odds.rawFile, predictionSnapshot: "data/normalized/predictions.json", predictionGeneratedAt: predictionsData.generatedAt, engineVersion: predictionsData.engine?.version || null, phase5C: "data/analysis/serie-a-md06-phase-5c-volume-validation-2026-10-09.json", phase5D: "output/reports/serie-a-md06-phase-5d-duo-audit-2026-10-09.json" },
  availabilityDisclosure: "Le quote erano aperte e verificate nello snapshot del 9 ottobre 2026. La disponibilità corrente non è stata verificata e non viene dichiarata.",
  invariants: { previousSelections: previousRows.length, previousSelectionIdsPreserved: [...previousById.keys()].every(id => rowById.has(id)), previousQuoteProbabilityContractHashBefore: previousInvariantHash, previousQuoteProbabilityContractHashAfter: preservedHash, previousQuoteProbabilityContractUnchanged: previousInvariantHash === preservedHash, evaluatedSelections: rows.filter(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED").length },
  catalog: { total: rows.length, added: added.length, addedA: added.filter(leg => leg.coverageClassification === "A").length, addedBNotModelled: added.filter(leg => leg.coverageClassification === "B").length, notModelled: rows.filter(leg => leg.betSelection.evaluation.status === "NOT_MODELLED").length },
  coverage: { candidates: coverage.summary.candidates, stateTotals: { A: coverage.rows.filter(row => row.state === STATES.A).length, B: coverage.rows.filter(row => row.state === STATES.B).length, C: coverage.rows.filter(row => row.state === STATES.C).length, D: coverage.rows.filter(row => row.state === STATES.D).length }, families: familyRows, perMatch: matchRows },
  suggestions: { total: suggestions.length, byFamily: countBy(suggestions, leg => leg.suggestionAnalysis.family), perMatch: matchRows.map(row => ({ matchId: row.matchId, fixture: row.fixture, total: row.suggestions, byFamily: row.suggestionsByFamily })), selections: suggestions.map(leg => ({ matchId: leg.matchId, fixture: leg.fixture, selectionId: leg.selectionId, family: leg.suggestionAnalysis.family, market: leg.market, label: leg.label, probabilityPct: leg.betSelection.evaluation.modelProbabilityPct, prudentProbabilityPct: leg.betSelection.evaluation.prudentProbabilityPct, odds: leg.betSelection.quote.decimal, quoteVerifiedAt: leg.betSelection.quote.verifiedAt, motivation: leg.suggestionAnalysis.motivation })) },
  unresolvedLimits: [
    "Tiri giocatore: i contratti Sisal sono DUO e includono il sostituto; la probabilità individuale V2 non è pertinente.",
    "SOT giocatore: DUO, sostituto e pali/traverse non coincidono con il target V2 individuale.",
    "SOT e corner squadra/partita: Fase 5C non ha superato il gate; le righe quotate restano NOT_MODELLED.",
    "Over cartellini: i mercati sono punti cartellini; regole complete su gialli, rossi, doppie ammonizioni, panchina e settlement non sono documentate nello snapshot e la distribuzione non è calibrata.",
    "Disponibilità corrente: non verificata dopo lo snapshot Sisal del 9 ottobre 2026.",
  ],
  tests: testsPassed ? ["npm run test:schedina", "npm run test:personal-betslip", "npm run test:css", "node --no-warnings scripts/test-app-modules.mjs", "node scripts/check-schedina-md06-suggestions-browser.cjs", "git diff --check"].map(command => ({ command, status: "PASS" })) : [],
  filesModified: ["scripts/md06-statistical-coverage.js", "scripts/md06-suggested-forecasts.js", "scripts/md06-market-catalog.js", "scripts/build-md06-suggested-forecasts.js", "scripts/test-md06-suggested-forecasts.js", "scripts/test-md06-scenario-coherence.js", "scripts/test-schedina-md06.js", "scripts/check-schedina-md06-suggestions-browser.cjs", "js/pages/betting.js", "css/betting.css", "css/styles.css", "scripts/build-site.js", "package.json", "schedina.html", "data/normalized/schedina-md06.json", "output/reports/serie-a-md06-suggested-forecasts-2026-10-10.json", "output/reports/serie-a-md06-suggested-forecasts-2026-10-10.md"],
};

const labels = { shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri" };
const markdown = [
  "# Serie A 2026/27 — Schedina MD6: pronostici suggeriti e copertura statistica",
  "",
  `Generato: ${report.generatedAt}. Engine V2 ${report.sources.engineVersion}; quote Sisal snapshot ${report.sources.oddsRetrievedAt}.`,
  "",
  "## Esito",
  "",
  `Catalogo: **${report.catalog.total}** selezioni. Le **383** precedenti sono rimaste identiche nei contratti, nelle quote e nelle valutazioni; aggiunte **${report.catalog.addedBNotModelled}** righe B esclusivamente NOT_MODELLED. Nuove righe A: **${report.catalog.addedA}**. Pronostici suggeriti: **${report.suggestions.total}**.`,
  "",
  `> ${report.availabilityDisclosure}`,
  "",
  "## Copertura per partita",
  "",
  table(["Partita", "Mercati Sisal", "Esiti classificati", "Precedenti", "Aggiunti", "A", "B", "C", "D", "Suggeriti"], matchRows.map(row => [row.fixture, row.sisalMarketsIdentified, row.sisalOutcomesClassified, row.previousCatalog, row.added, row.states.A, row.states.B, row.states.C, row.states.D, row.suggestions])),
  "",
  "## Copertura delle famiglie richieste",
  "",
  table(["Famiglia", "Esiti individuati", "A", "B", "C", "D", "Aggiunti N/D", "Suggeriti"], familyRows.map(row => [labels[row.family], row.identified, row.A, row.B, row.C, row.D, row.addedNotModelled, row.suggested])),
  "",
  "Le righe B ampliano soltanto la consultazione del catalogo completo; non costituiscono copertura predittiva e non sono conteggiate come suggerimenti.",
  "",
  "## Pronostici suggeriti",
  "",
  ...matchRows.flatMap(row => {
    const picks = report.suggestions.selections.filter(item => item.matchId === row.matchId);
    return [`### ${row.fixture}`, "", ...(picks.length ? picks.map(item => `- **${item.label}** — P ${item.probabilityPct.toFixed(1)}%; prudente ${item.prudentProbabilityPct.toFixed(1)}%; quota Sisal ${item.odds.toFixed(2)}. ${item.motivation}`) : ["- Nessun pronostico supera tutti i criteri deterministici."]), ""];
  }),
  "## Criterio deterministico",
  "",
  "Un suggerimento richiede contemporaneamente: identità e quota Sisal verificate nello snapshot; probabilità assoluta V2 già modellata; affidabilità esistente Alta/Media; probabilità centrale e prudente almeno 50%; scenario coerente o multi-scenario; evento rappresentabile nella matrice punteggi. Quote ed EV non partecipano alla scelta. Gli equivalenti e i supersets più deboli sono rimossi; eventuali coppie mutuamente esclusive sono risolte a favore del margine prudente maggiore.",
  "",
  "## Limiti non risolti",
  "",
  ...report.unresolvedLimits.map(item => `- ${item}`),
  "",
  "## Test",
  "",
  ...(testsPassed ? report.tests.map(item => `- PASS — \`${item.command}\``) : ["- In attesa dell'esecuzione finale."]),
  "",
  "## File modificati",
  "",
  ...report.filesModified.map(item => `- \`${item}\``),
  "",
].join("\n");

if (writeNormalized) write("data/normalized/schedina-md06.json", { ...schedina, marketCatalog });
write("output/reports/serie-a-md06-suggested-forecasts-2026-10-10.json", report);
write("output/reports/serie-a-md06-suggested-forecasts-2026-10-10.md", markdown);
console.log(JSON.stringify({ status: "PASS", writeNormalized, testsPassed, catalog: report.catalog, coverage: report.coverage.stateTotals, suggestions: report.suggestions.total, suggestionsByFamily: report.suggestions.byFamily }, null, 2));
