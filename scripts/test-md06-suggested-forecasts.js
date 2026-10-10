"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pairRelation } = require("./md06-scenario-coherence");

const root = path.resolve(__dirname, "..");
const schedina = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina-md06.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(root, "output/reports/serie-a-md06-suggested-forecasts-2026-10-10.json"), "utf8"));
const rows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
const added = rows.filter(leg => leg.catalogOrigin === "statistical-b-not-modelled");

assert.equal(schedina.marketCatalog.schemaVersion, 3);
assert.equal(rows.length, 1446);
assert.equal(new Set(rows.map(leg => leg.selectionId)).size, rows.length);
assert.equal(added.length, 1063);
assert(added.every(leg => leg.coverageClassification === "B" && leg.betSelection.evaluation.status === "NOT_MODELLED"));
assert(added.every(leg => leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT" && Number.isFinite(leg.betSelection.quote.decimal)));
assert(!added.some(leg => /DUO|SOSTITUT|PUNTI CARTELLINI/i.test(`${leg.market} ${leg.variant}`)), "DUO o punti cartellini non devono entrare nel catalogo");
assert.equal(suggestions.length, 24);
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED"));
assert(suggestions.every(leg => Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT"));
assert(suggestions.every(leg => leg.betSelection.evaluation.modelProbabilityPct >= 50 && leg.betSelection.evaluation.prudentProbabilityPct >= 50));
assert(suggestions.every(leg => ["Alta", "Media"].includes(leg.betSelection.operational.reliability.level)));
assert(suggestions.every(leg => leg.betSelection.evaluation.probabilitySemantics === "ABSOLUTE_EVENT"));
assert(!suggestions.some(leg => ["shots", "sot", "corners", "cards"].includes(leg.suggestionAnalysis.family)));
for (const match of schedina.marketCatalog.matches) {
  const picks = match.selections.filter(leg => leg.suggestionAnalysis?.suggested);
  for (let left = 0; left < picks.length; left += 1) for (let right = left + 1; right < picks.length; right += 1) assert.notEqual(pairRelation(picks[left], picks[right]).type, "MUTUALLY_EXCLUSIVE", `${match.matchId}: suggerimenti incompatibili`);
}
const inter = schedina.marketCatalog.matches.find(match => match.matchId === "inter-parma-2026-27-md-06");
assert(inter.selections.find(leg => leg.label === "Inter vincente").suggestionAnalysis.suggested);
assert(!inter.selections.find(leg => leg.label === "Parma vincente").suggestionAnalysis.suggested);
assert.equal(report.invariants.previousSelections, 383);
assert(report.invariants.previousSelectionIdsPreserved && report.invariants.previousQuoteProbabilityContractUnchanged);
assert.equal(report.catalog.addedA, 0);
assert.equal(report.catalog.addedBNotModelled, 1063);
assert.equal(report.suggestions.total, 24);
console.log("OK suggerimenti MD06: 383 preservate, 1063 B NOT_MODELLED aggiunte, 24 suggerimenti coerenti e quotati");
