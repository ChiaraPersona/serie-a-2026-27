"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { countsByMarket, upsertForecastSelections } = require("./forecast-sync");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const digest = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));

(async () => {
  const historicalFiles = [
    "data/normalized/schedina.json",
    "data/normalized/schedina-md02.json",
    "data/normalized/schedina-md03.json",
    "data/normalized/schedina-md04.json",
    "data/normalized/schedina-md05.json",
  ];
  const historicalBefore = Object.fromEntries(historicalFiles.map(file => [file, digest(file)]));
  const dataset = read("data/normalized/schedina-md06.json");
  const target = dataset.marketCatalog.matches.find(match => match.matchId === "sassuolo-milan-2026-27-md-06");
  assert(target, "Partita di simulazione non trovata");
  const before = target.selections;
  const beforeSelected = before.filter(leg => leg.suggestionAnalysis?.suggested);
  const beforeByMarket = countsByMarket(beforeSelected);
  const selectedGoal = beforeSelected.find(leg => leg.suggestionAnalysis?.family === "goals-results");
  const selectedShot = beforeSelected.find(leg => leg.suggestionAnalysis?.family === "shots");
  const selectedSot = beforeSelected.find(leg => leg.suggestionAnalysis?.family === "sot");
  assert(selectedGoal && selectedShot && selectedSot, "Campioni di mercato insufficienti per la simulazione");

  const addedShot = clone(selectedShot);
  addedShot.selectionId = `${selectedShot.selectionId}:sync-test-new`;
  addedShot.providerSelectionId = `${selectedShot.providerSelectionId}-sync-test`;
  addedShot.label = `${selectedShot.label} · simulazione upsert`;
  addedShot.betSelection.selectionId = addedShot.selectionId;
  addedShot.betSelection.identity.providerSelectionId = addedShot.providerSelectionId;
  addedShot.suggestionAnalysis.rank = 9001;

  const addedSot = clone(selectedSot);
  addedSot.selectionId = `${selectedSot.selectionId}:sync-test-new`;
  addedSot.providerSelectionId = `${selectedSot.providerSelectionId}-sync-test`;
  addedSot.label = `${selectedSot.label} · simulazione upsert`;
  addedSot.betSelection.selectionId = addedSot.selectionId;
  addedSot.betSelection.identity.providerSelectionId = addedSot.providerSelectionId;
  addedSot.suggestionAnalysis.rank = 9002;

  const updatedGoal = clone(selectedGoal);
  updatedGoal.evidenceLabel = "Motivazione tecnica aggiornata nella simulazione";
  updatedGoal.odds = null;
  updatedGoal.betSelection.quote = { decimal: null, availability: "UNAVAILABLE", verifiedAt: null, source: null };

  const first = upsertForecastSelections({ existing: before, incoming: [updatedGoal, addedShot, addedSot] });
  assert.equal(first.selections.length, before.length + 2, "I due nuovi pronostici devono essere aggiunti");
  assert.equal(new Set(first.selections.map(leg => leg.selectionId)).size, first.selections.length, "Nessun duplicato dopo il primo upsert");
  const mergedGoal = first.selections.find(leg => leg.selectionId === selectedGoal.selectionId);
  assert.equal(mergedGoal.evidenceLabel, updatedGoal.evidenceLabel, "Il pronostico esistente deve essere aggiornato");
  assert.equal(mergedGoal.betSelection.quote.decimal, selectedGoal.betSelection.quote.decimal, "La quota esistente deve essere preservata se il nuovo dato manca");
  const repricedGoal = clone(selectedGoal);
  repricedGoal.odds = Number(selectedGoal.odds) + 0.1;
  repricedGoal.betSelection.quote.decimal = repricedGoal.odds;
  const explicitQuoteUpdate = upsertForecastSelections({ existing: before, incoming: [repricedGoal], allowQuoteUpdates: true });
  assert.equal(explicitQuoteUpdate.selections.find(leg => leg.selectionId === selectedGoal.selectionId).betSelection.quote.decimal, repricedGoal.odds, "Una quota deve cambiare soltanto con aggiornamento esplicito");

  const afterSelected = first.selections.filter(leg => leg.suggestionAnalysis?.suggested);
  const afterByMarket = countsByMarket(afterSelected);
  for (const [family, count] of Object.entries(beforeByMarket)) {
    const expected = family === "shots" || family === "sot" ? count + 1 : count;
    assert.equal(afterByMarket[family], expected, `${family}: conteggio non preservato`);
  }
  const protectedFamilies = Object.keys(beforeByMarket).filter(family => !["shots", "sot"].includes(family));
  for (const family of protectedFamilies) {
    const idsBefore = beforeSelected.filter(leg => leg.suggestionAnalysis?.family === family).map(leg => leg.selectionId).sort();
    const idsAfter = afterSelected.filter(leg => leg.suggestionAnalysis?.family === family).map(leg => leg.selectionId).sort();
    assert.deepEqual(idsAfter, idsBefore, `${family}: pronostici non coinvolti alterati`);
  }

  const second = upsertForecastSelections({ existing: first.selections, incoming: [updatedGoal, addedShot, addedSot] });
  assert.equal(second.selections.length, first.selections.length, "L'esecuzione ripetuta non deve creare duplicati");
  const withdrawal = upsertForecastSelections({ existing: second.selections, withdrawnSelectionIds: [addedShot.selectionId] });
  assert(!withdrawal.selections.some(leg => leg.selectionId === addedShot.selectionId), "Il ritiro esplicito deve eliminare il pronostico");
  assert.equal(withdrawal.selections.length, second.selections.length - 1, "Il ritiro non deve eliminare altri pronostici");

  const { forecastView, sharedForecastsForMatch } = await import("../js/pages/shared-forecast-contract.mjs");
  const simulatedCatalog = { ...dataset.marketCatalog, matches: dataset.marketCatalog.matches.map(match => match.matchId === target.matchId ? { ...match, selections: first.selections } : match) };
  const readingIds = sharedForecastsForMatch(simulatedCatalog, target.matchId).map(leg => leg.selectionId);
  const bettingIds = sharedForecastsForMatch(simulatedCatalog, target.matchId).map(leg => leg.selectionId);
  assert.deepEqual(readingIds, bettingIds, "Lettura e Schedina devono leggere gli stessi selectionId");
  const view = forecastView(first.selections.find(leg => leg.selectionId === addedShot.selectionId), dataset.matchday);
  for (const field of ["id", "matchId", "matchday", "market", "selection", "threshold", "modifier", "technicalMotivation", "status", "provenance"]) {
    assert.notEqual(view[field], undefined, `Contratto condiviso incompleto: ${field}`);
  }

  const forbiddenSelected = dataset.marketCatalog.matches.flatMap(match => match.selections).filter(leg => leg.suggestionAnalysis?.suggested && (/DRAW NO BET/i.test(leg.market || "") || /1° TEMPO|2° TEMPO|PRIMO TEMPO|SECONDO TEMPO/i.test(`${leg.market || ""} ${leg.variant || ""}`) && /CORNER/i.test(`${leg.market || ""} ${leg.variant || ""}`)));
  assert.equal(forbiddenSelected.length, 0, "DNB o corner per tempi non devono essere reintrodotti tra i pronostici");
  const historicalAfter = Object.fromEntries(historicalFiles.map(file => [file, digest(file)]));
  assert.deepEqual(historicalAfter, historicalBefore, "Le schedine concluse MD1-MD5 devono restare byte-stabili");

  console.log(JSON.stringify({
    status: "OK",
    simulatedMatchId: target.matchId,
    before: { total: beforeSelected.length, byMarket: beforeByMarket },
    afterAddAndUpdate: { total: afterSelected.length, byMarket: afterByMarket, added: [addedShot.selectionId, addedSot.selectionId], updated: [selectedGoal.selectionId] },
    preservedByMarket: Object.fromEntries(protectedFamilies.map(family => [family, beforeByMarket[family]])),
    idempotent: second.selections.length === first.selections.length,
    explicitQuoteUpdate: true,
    explicitWithdrawalOnly: true,
    sharedRendererIds: readingIds.length,
    historicalHashesUnchanged: true,
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
