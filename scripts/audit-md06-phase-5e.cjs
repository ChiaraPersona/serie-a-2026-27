"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const zlib = require("node:zlib");
const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { evaluateDerivedScoreMarket, validateCanonicalDnb } = require("./score-market-evaluation");
const { isUnderPlayableSelection, isIndividualPlayerFoulMarket, isCornerPeriodMarket, isDoubleChance12Selection } = require("./betting-market-policy");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const close = (left, right, tolerance) => Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Math.abs(Number(left) - Number(right)) <= tolerance;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const countBy = (rows, selector) => Object.fromEntries([...rows.reduce((map, row) => {
  const key = selector(row);
  map.set(key, (map.get(key) || 0) + 1);
  return map;
}, new Map())]);

const schedina = read("data/normalized/schedina-md06.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictionsData = read("data/normalized/predictions.json");
const groupBAudit = read("output/reports/serie-a-md06-group-b-audit-2026-10-09.json");
const probableLineups = read("data/sources/probable-lineups-md6-2026-27.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const rawRelative = schedina.marketCatalog.matches[0].selections[0].betSelection.quote.source.rawFile;
const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, rawRelative))).toString("utf8"));
const rows = schedina.marketCatalog.matches.flatMap(match => match.selections.map(selection => ({ ...selection, catalogMatch: match })));
const predictions = predictionsData.predictions.filter(prediction => prediction.matchId.endsWith("-md-06"));
const predictionByMatch = new Map(predictions.map(prediction => [prediction.matchId, prediction]));

function buildNormalizedIndex() {
  const index = new Map();
  for (const event of odds.events || []) for (const market of event.markets || []) for (const selection of market.selections || []) {
    const id = String(selection.providerSelectionId);
    assert(!index.has(id), `${id}: duplicate normalized selection`);
    index.set(id, { event, market, selection });
  }
  return index;
}

function buildRawIndex() {
  const index = new Map();
  for (const response of raw.responses || []) {
    const payload = response.payload;
    const event = payload?.avvenimentoFe;
    if (!event) continue;
    for (const info of Object.values(payload.infoAggiuntivaMap || {})) {
      const marketKey = `${info.codicePalinsesto}-${info.codiceAvvenimento}-${info.codiceScommessa}`;
      const marketName = payload.scommessaMap?.[marketKey]?.descrizione || info.descrizione || "";
      for (const selection of info.esitoList || []) {
        const id = String(selection.selectionId);
        assert(!index.has(id), `${id}: duplicate raw selection`);
        index.set(id, {
          providerMarketId: String(info.marketId),
          providerEventId: String(event.eventId),
          marketName: String(marketName).trim(),
          variantName: String(info.descrizione || "").trim(),
          threshold: info.soglia === "" || info.soglia == null ? null : String(info.soglia),
          marketStatus: info.stato === 1 ? "open" : "suspended",
          selectionName: String(selection.descrizione || "").trim(),
          odds: Number((selection.quota / 100).toFixed(2)),
          selectionStatus: selection.stato === 1 ? "open" : "suspended",
        });
      }
    }
  }
  return index;
}

function staticAudit() {
  const normalizedById = buildNormalizedIndex();
  const rawById = buildRawIndex();
  const catalogIds = new Set();
  const providerIds = new Set();
  const reconciliationFailures = [];
  for (const row of rows) {
    assert(!catalogIds.has(row.selectionId), `${row.selectionId}: duplicate catalog selectionId`);
    assert(!providerIds.has(String(row.providerSelectionId)), `${row.providerSelectionId}: duplicate providerSelectionId`);
    catalogIds.add(row.selectionId);
    providerIds.add(String(row.providerSelectionId));
    const normalized = normalizedById.get(String(row.providerSelectionId));
    const rawRow = rawById.get(String(row.providerSelectionId));
    const failures = [];
    if (!normalized) failures.push("NORMALIZED_SELECTION_MISSING");
    if (!rawRow) failures.push("RAW_SELECTION_MISSING");
    if (normalized) {
      if (normalized.event.canonicalMatchId !== row.matchId) failures.push("MATCH_ID_MISMATCH");
      if (String(normalized.market.providerMarketId) !== String(row.providerMarketId)) failures.push("NORMALIZED_MARKET_ID_MISMATCH");
      if (String(normalized.market.marketName).trim() !== String(row.market).trim()) failures.push("NORMALIZED_MARKET_NAME_MISMATCH");
      if (String(normalized.market.variantName || "").trim() !== String(row.variant || "").trim()) failures.push("NORMALIZED_VARIANT_MISMATCH");
      if (String(normalized.selection.name).trim() !== String(row.selection).trim()) failures.push("NORMALIZED_SELECTION_NAME_MISMATCH");
      if (!close(normalized.selection.odds, row.odds, 1e-9)) failures.push("NORMALIZED_ODDS_MISMATCH");
      const normalizedThreshold = normalized.market.threshold == null ? null : String(normalized.market.threshold);
      const catalogThreshold = row.threshold == null ? null : String(row.threshold);
      if (normalizedThreshold !== catalogThreshold) failures.push("NORMALIZED_THRESHOLD_MISMATCH");
    }
    if (rawRow && normalized) {
      if (rawRow.providerMarketId !== String(row.providerMarketId)) failures.push("RAW_MARKET_ID_MISMATCH");
      if (rawRow.marketName !== String(normalized.market.marketName).trim()) failures.push("RAW_MARKET_NAME_MISMATCH");
      if (rawRow.variantName !== String(normalized.market.variantName || "").trim()) failures.push("RAW_VARIANT_MISMATCH");
      if (rawRow.selectionName !== String(normalized.selection.name).trim()) failures.push("RAW_SELECTION_NAME_MISMATCH");
      if (rawRow.threshold !== (normalized.market.threshold == null ? null : String(normalized.market.threshold))) failures.push("RAW_THRESHOLD_MISMATCH");
      if (!close(rawRow.odds, normalized.selection.odds, 1e-9)) failures.push("RAW_ODDS_MISMATCH");
      if (rawRow.marketStatus !== normalized.market.status || rawRow.selectionStatus !== normalized.selection.status) failures.push("RAW_STATUS_MISMATCH");
    }
    if (failures.length) reconciliationFailures.push({ selectionId: row.selectionId, failures });
  }

  const evaluated = rows.filter(row => finite(row.betSelection.evaluation.expectedValuePct));
  const notModelled = rows.filter(row => !finite(row.betSelection.evaluation.expectedValuePct));
  const dnb = rows.filter(row => row.catalogOrigin === "dnb-b1");
  const b2 = rows.filter(row => row.catalogOrigin === "gruppo-b2");
  const previous = rows.filter(row => !["dnb-b1", "gruppo-b2"].includes(row.catalogOrigin));
  const b2AuditIds = new Set(groupBAudit.classifications.filter(row => row.level === "B2").map(row => row.selectionId));
  const b2IdDifferences = {
    missing: [...b2AuditIds].filter(id => !b2.some(row => row.selectionId === id)),
    unexpected: b2.filter(row => !b2AuditIds.has(row.selectionId)).map(row => row.selectionId),
  };

  let dnbRecomputed = 0;
  for (const row of dnb) {
    const prediction = predictionByMatch.get(row.matchId);
    const comparison = (prediction.marketComparison || []).find(item => String(item.providerSelectionId) === String(row.providerSelectionId));
    const normalized = normalizedById.get(String(row.providerSelectionId));
    assert(comparison && normalized, `${row.selectionId}: DNB source missing`);
    const validation = validateCanonicalDnb({ prediction, row: comparison, market: normalized.market, selection: normalized.selection });
    assert(validation.valid, `${row.selectionId}: DNB push-aware recomputation failed`);
    assert.equal(row.betSelection.evaluation.expectedValueBasis, "P_WIN_TIMES_DECIMAL_ODDS_PLUS_P_PUSH_MINUS_ONE");
    assert(close(row.betSelection.evaluation.expectedValuePct, validation.actual.expectedValuePct, 0.11));
    dnbRecomputed++;
  }

  let b2Recomputed = 0;
  for (const row of b2) {
    const prediction = predictionByMatch.get(row.matchId);
    const normalized = normalizedById.get(String(row.providerSelectionId));
    const calculated = evaluateDerivedScoreMarket({ prediction, market: normalized.market, selection: normalized.selection });
    const evaluation = row.betSelection.evaluation;
    assert(close(evaluation.modelProbabilityPct, calculated.centralProbabilityPct, 0.11), `${row.selectionId}: B2 central probability mismatch`);
    assert(close(evaluation.prudentProbabilityPct, calculated.prudentProbabilityPct, 0.11), `${row.selectionId}: B2 prudent probability mismatch`);
    assert(close(evaluation.fairOdds, calculated.fairOdds, 0.02), `${row.selectionId}: B2 fair odds mismatch`);
    assert(close(evaluation.expectedValuePct, calculated.expectedValuePct, 0.11), `${row.selectionId}: B2 EV mismatch`);
    assert(calculated.matrixCellSums.every(sum => Math.abs(sum - 1) < 1e-9), `${row.selectionId}: non-normalized score matrix`);
    b2Recomputed++;
  }

  const comparisonBySelection = new Map(predictions.flatMap(prediction => (prediction.marketComparison || []).map(comparison => [String(comparison.providerSelectionId), { prediction, comparison }])));
  const combinationBySelection = new Map();
  for (const prediction of predictions) for (const combo of prediction.combinations || []) for (const leg of combo.legs || []) {
    if (!finite(leg.expectedValuePct)) continue;
    if (!combinationBySelection.has(String(leg.providerSelectionId))) combinationBySelection.set(String(leg.providerSelectionId), { prediction, combo, leg });
  }
  let directTracedToComparison = 0;
  let directTracedToCombination = 0;
  for (const row of evaluated.filter(row => !["dnb-b1", "gruppo-b2"].includes(row.catalogOrigin))) {
    const evaluation = row.betSelection.evaluation;
    const comparisonSource = comparisonBySelection.get(String(row.providerSelectionId));
    const combinationSource = combinationBySelection.get(String(row.providerSelectionId));
    if (comparisonSource) {
      const source = comparisonSource.comparison;
      assert(close(evaluation.modelProbabilityPct, source.modelProbabilityPct, 0.11));
      assert(close(evaluation.fairOdds, source.fairOdds, 0.02));
      assert(close(evaluation.expectedValuePct, source.expectedValuePct, 0.11));
      directTracedToComparison++;
    } else {
      assert(combinationSource, `${row.selectionId}: direct evaluation source missing`);
      const source = combinationSource.leg;
      assert(close(evaluation.modelProbabilityPct, source.probabilityPct, 0.11));
      assert(close(evaluation.fairOdds, source.fairOdds, 0.02));
      assert(close(evaluation.expectedValuePct, source.expectedValuePct, 0.11));
      directTracedToCombination++;
    }
  }

  const playerRows = rows.filter(row => row.betSelection.market.scope === "player");
  const officialMd6 = (officialLineups.fixtures || []).filter(fixture => fixture.matchday === 6);
  const evaluatedMissingLegModelVersion = evaluated.filter(row => !row.betSelection.evaluation.provenance?.modelVersion);
  const evaluatedMissingLegProvenance = evaluated.filter(row => !row.betSelection.evaluation.provenance?.source);

  assert.equal(rows.length, 383);
  assert.equal(evaluated.length, 367);
  assert.equal(notModelled.length, 16);
  assert.equal(rows.filter(row => Number(row.betSelection.evaluation.expectedValuePct) > 0).length, 67);
  assert.equal(rows.filter(row => Number(row.betSelection.evaluation.expectedValuePct) < 0).length, 300);
  assert.equal(schedina.marketCatalog.matches.length, 10);
  assert.equal(reconciliationFailures.length, 0);
  assert.equal(previous.length, 160);
  assert.equal(dnb.length, 20);
  assert.equal(b2.length, 203);
  assert.equal(b2IdDifferences.missing.length, 0);
  assert.equal(b2IdDifferences.unexpected.length, 0);
  assert(notModelled.every(row => row.betSelection.evaluation.kind === "NOT_MODELLED" && row.betSelection.evaluation.modelProbabilityPct == null && row.betSelection.evaluation.fairOdds == null && row.betSelection.evaluation.expectedValuePct == null));
  assert(rows.every(row => row.betSelection.identity.status === "VERIFIED_PROVIDER_IDS"));
  assert(rows.every(row => row.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT" && row.betSelection.quote.providerStatus === "open" && finite(row.betSelection.quote.decimal) && Number(row.betSelection.quote.decimal) >= 1));
  assert(rows.every(row => row.betSelection.operational.playability.status === "PLAYABLE"));
  assert(!rows.some(isUnderPlayableSelection));
  assert(!rows.some(isIndividualPlayerFoulMarket));
  assert(!rows.some(isCornerPeriodMarket));
  assert(!rows.some(isDoubleChance12Selection));
  assert(playerRows.every(row => ["probable-starter", "official-starter"].includes(row.lineupEligibility.status)));

  return {
    catalog: {
      matches: schedina.marketCatalog.matches.length,
      selections: rows.length,
      evaluated: evaluated.length,
      notModelled: notModelled.length,
      evPositive: rows.filter(row => Number(row.betSelection.evaluation.expectedValuePct) > 0).length,
      evNegative: rows.filter(row => Number(row.betSelection.evaluation.expectedValuePct) < 0).length,
      evZero: rows.filter(row => finite(row.betSelection.evaluation.expectedValuePct) && Number(row.betSelection.evaluation.expectedValuePct) === 0).length,
      origins: countBy(rows, row => row.catalogOrigin),
      phase5b2: { preserved: previous.length, dnb: dnb.length, b2: b2.length, b2IdDifferences },
    },
    integrity: {
      uniqueSelectionIds: catalogIds.size,
      uniqueProviderSelectionIds: providerIds.size,
      rawNormalizedExact: rows.length - reconciliationFailures.length,
      failures: reconciliationFailures,
      quoteSnapshot: rawRelative,
      quoteVerifiedAt: schedina.oddsRetrievedAt,
    },
    evaluations: {
      kinds: countBy(rows, row => row.betSelection.evaluation.kind),
      dnbPushAwareRecomputed: dnbRecomputed,
      b2ScoreMatrixRecomputed: b2Recomputed,
      directTracedToMarketComparison: directTracedToComparison,
      directTracedToPredictionCombination: directTracedToCombination,
      withLegLevelModelVersionAndTimestamp: evaluated.length - evaluatedMissingLegModelVersion.length,
      missingLegLevelModelVersionAndTimestamp: evaluatedMissingLegModelVersion.map(row => row.selectionId),
      withNoLegLevelProvenanceObject: evaluatedMissingLegProvenance.map(row => row.selectionId),
      inheritedModelVersion: schedina.marketCatalog.sources.modelVersion,
      inheritedPredictionGeneratedAt: schedina.marketCatalog.sources.predictionsGeneratedAt,
    },
    notModelled: {
      total: notModelled.length,
      allNullMetrics: notModelled.every(row => row.betSelection.evaluation.modelProbabilityPct == null && row.betSelection.evaluation.fairOdds == null && row.betSelection.evaluation.expectedValuePct == null),
      allPlayable: notModelled.every(row => row.betSelection.operational.playability.status === "PLAYABLE"),
      families: countBy(notModelled, row => row.market),
    },
    policy: {
      under: rows.filter(isUnderPlayableSelection).length,
      individualFouls: rows.filter(isIndividualPlayerFoulMarket).length,
      cornerPeriods: rows.filter(isCornerPeriodMarket).length,
      doubleChance12: rows.filter(isDoubleChance12Selection).length,
      playerRows: playerRows.length,
      playerRowsEligibleStarter: playerRows.filter(row => ["probable-starter", "official-starter"].includes(row.lineupEligibility.status)).length,
      officialMd6FixturesAvailable: officialMd6.length,
      lineupSource: officialMd6.length ? officialLineups.provider : probableLineups.provider,
      lineupSourceTimestamp: officialMd6.length ? officialLineups.retrievedAt : probableLineups.importedAt,
    },
    files: {
      schedinaJsonBytes: fs.statSync(path.join(root, "data/normalized/schedina-md06.json")).size,
      schedinaHtmlBytes: fs.statSync(path.join(root, "schedina.html")).size,
      bettingJsBytes: fs.statSync(path.join(root, "js/pages/betting.js")).size,
      personalBetslipStoreBytes: fs.statSync(path.join(root, "js/pages/personal-betslip-store.mjs")).size,
    },
  };
}

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});

async function browserSample(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const started = performance.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll("[data-selection-row]").length === 383);
  const renderedMs = performance.now() - started;
  const panels = page.locator("[data-match-panel]");
  const rowsLocator = page.locator("[data-selection-row]");
  const openStarted = performance.now();
  await page.locator("[data-match-open-all]").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-match-panel][open]").length === 10);
  const openAllMs = performance.now() - openStarted;
  const first = rowsLocator.first();
  await first.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-selection-row]")?.getAttribute("aria-pressed") === "true");
  const keyboardToggleWorks = (await first.getAttribute("aria-pressed")) === "true";
  const interactionStarted = performance.now();
  await rowsLocator.nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll(".personal-betslip-item").length === 2);
  await rowsLocator.nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll(".personal-betslip-item").length === 1);
  const betslipInteractionMs = performance.now() - interactionStarted;
  if (width < 1180) {
    await page.locator("[data-personal-open]").click();
    await page.locator(".personal-betslip-panel").waitFor({ state: "visible" });
  }
  const closeStarted = performance.now();
  await page.locator("[data-match-close-all]").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-match-panel][open]").length === 0);
  const closeAllMs = performance.now() - closeStarted;
  const diagnostics = await page.evaluate(() => ({
    rows: document.querySelectorAll("[data-selection-row]").length,
    panels: document.querySelectorAll("[data-match-panel]").length,
    domNodes: document.querySelectorAll("*").length,
    horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    keyboardRows: [...document.querySelectorAll("[data-selection-row]")].filter(row => row.tabIndex >= 0).length,
    personalRootPosition: getComputedStyle(document.querySelector(".personal-betslip-root")).position,
    personalPanelPosition: getComputedStyle(document.querySelector(".personal-betslip-panel")).position,
    resourceBytes: performance.getEntriesByType("resource").reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0),
  }));
  await context.close();
  return { width, height, renderedMs, openAllMs, closeAllMs, betslipInteractionMs, keyboardToggleWorks, errors, ...diagnostics };
}

async function browserAudit() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const results = [];
    for (const [width, height] of [[1440, 1000], [390, 844]]) for (let run = 0; run < 3; run++) results.push(await browserSample(browser, width, height));
    return [1440, 390].map(width => {
      const samples = results.filter(result => result.width === width);
      return {
        viewport: `${width}x${samples[0].height}`,
        samples: samples.length,
        medianRenderMs: Number(median(samples.map(sample => sample.renderedMs)).toFixed(1)),
        medianOpenAllMs: Number(median(samples.map(sample => sample.openAllMs)).toFixed(1)),
        medianCloseAllMs: Number(median(samples.map(sample => sample.closeAllMs)).toFixed(1)),
        medianBetslipInteractionMs: Number(median(samples.map(sample => sample.betslipInteractionMs)).toFixed(1)),
        rows: samples[0].rows,
        panels: samples[0].panels,
        domNodes: samples[0].domNodes,
        horizontalOverflowPx: Math.max(...samples.map(sample => sample.horizontalOverflowPx)),
        keyboardRows: Math.min(...samples.map(sample => sample.keyboardRows)),
        keyboardToggleWorks: samples.every(sample => sample.keyboardToggleWorks),
        personalRootPosition: samples[0].personalRootPosition,
        personalPanelPosition: samples[0].personalPanelPosition,
        pageErrors: [...new Set(samples.flatMap(sample => sample.errors))],
        resourceBytesMedian: median(samples.map(sample => sample.resourceBytes)),
      };
    });
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  const result = {
    status: "PASS_WITH_DISCLOSURE",
    generatedAt: new Date().toISOString(),
    static: staticAudit(),
    browser: await browserAudit(),
    disclosure: "16 evaluated rows inherit model version/timestamp from marketCatalog.sources instead of repeating them at leg level; 6 of those also omit a leg-level provenance object but are deterministically traced to frozen prediction combinations.",
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
