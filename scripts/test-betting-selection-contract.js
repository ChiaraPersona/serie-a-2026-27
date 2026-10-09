"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { selectionIdFor, createBetSelection } = require("./betting-selection-contract");
const { isUnderPlayableSelection } = require("./betting-market-policy");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/schedina-serie-a-2026-27-md-06.json");
const normalized = read("data/normalized/schedina-md06.json");
const myCombo = read("data/sources/mycombo-serie-a-2026-27-md-06.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(row => row.matchId.endsWith("-md-06"));
const assessments = read("data/sources/betting-selection-assessments-md06.json");
const packageJson = read("package.json");

const identity = { matchId: "match-1", provider: "Sisal", providerSelectionId: "123" };
assert.equal(selectionIdFor(identity), selectionIdFor({ ...identity, label: "etichetta diversa" }));
assert.equal(selectionIdFor({ ...identity, providerSelectionId: null }), null, "ID provider mancante non deve produrre equivalenze arbitrarie");

const fallback = createBetSelection({ ...identity, market: { marketName: "DOPPIA CHANCE" }, selection: { name: "1X", status: "open" } });
assert.equal(fallback.operational.reliability.level, "Non valutabile");
assert(fallback.operational.reliability.reason);

const duoUnit = createBetSelection({
  ...identity,
  market: { marketName: "U/O TIRI TOTALI GIOCATORE (DUO) INC TS", variantName: "Mario Rossi" },
  selection: { name: "OVER", odds: 1.5, status: "open" },
  modelProbabilityPct: 70,
  fairOdds: 1.43,
  expectedValuePct: 5,
  individualModelProbabilityPct: 70,
  compatibility: "INCOMPATIBILE_DUO",
});
assert.equal(duoUnit.evaluation.modelProbabilityPct, null);
assert.equal(duoUnit.evaluation.fairOdds, null);
assert.equal(duoUnit.evaluation.expectedValuePct, null);
assert.equal(duoUnit.evaluation.individualModelProbabilityPct, 70);
assert.equal(duoUnit.market.subject.type, "player-plus-substitute");

const sourceLegs = source.slips.flatMap(slip => slip.picks);
const normalizedLegs = normalized.slips.flatMap(slip => slip.legs);
const myComboLegs = Object.values(myCombo.matches).flatMap(portfolios => portfolios.flatMap(portfolio => portfolio.legs || []));
const predictionLegs = predictions.flatMap(prediction => prediction.combinations.flatMap(portfolio => portfolio.legs || []));
for (const [label, legs] of [["source schedina", sourceLegs], ["schedina normalizzata", normalizedLegs], ["MyCombo", myComboLegs], ["predictions", predictionLegs]]) {
  assert(legs.length, `${label}: nessuna selezione`);
  for (const leg of legs) {
    assert(leg.selectionId && leg.betSelection, `${label}: contratto mancante`);
    assert.equal(leg.selectionId, leg.betSelection.selectionId, `${label}: selectionId incoerente`);
    assert.equal(leg.selectionId, selectionIdFor({ matchId: leg.betSelection.identity.matchId, provider: leg.betSelection.identity.provider, providerSelectionId: leg.providerSelectionId }));
    assert(leg.betSelection.quote.verifiedAt, `${label}: timestamp snapshot mancante`);
    assert(leg.betSelection.quote.source.snapshotPath, `${label}: provenienza snapshot mancante`);
    assert(leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT", `${label}: disponibilità non riferita allo snapshot`);
  }
}

const predictionByMatch = new Map(predictions.map(row => [row.matchId, row]));
for (const [matchId, portfolios] of Object.entries(myCombo.matches)) {
  for (const portfolio of portfolios) {
    const ids = (portfolio.legs || []).map(leg => leg.selectionId);
    assert.equal(new Set(ids).size, ids.length, `${matchId}/${portfolio.tier}: duplicato nel portafoglio`);
    const rendered = predictionByMatch.get(matchId)?.combinations.find(item => item.tier === portfolio.tier);
    assert.deepEqual((rendered?.legs || []).map(leg => leg.selectionId), ids, `${matchId}/${portfolio.tier}: identità non propagata`);
  }
}

const duoSlip = normalized.slips.find(slip => slip.validationStatus === "EV_NON_CALCOLABILE");
assert(duoSlip, "Schedina DUO mancante");
assert.deepEqual(duoSlip.legs.map(leg => leg.betSelection.operational.classification), ["PRINCIPALE", "OUTSIDER", "OUTSIDER"]);
assert(!normalizedLegs.some(leg => leg.betSelection.operational.classification === "WATCH"), "WATCH promosso automaticamente in schedina");
assert(assessments.assessments.some(item => item.classification === "WATCH"), "I WATCH devono restare tracciati nel livello decisionale");
for (const leg of duoSlip.legs) {
  assert.equal(leg.betSelection.evaluation.modelProbabilityPct, null);
  assert.equal(leg.betSelection.evaluation.fairOdds, null);
  assert.equal(leg.betSelection.evaluation.expectedValuePct, null);
  assert(Number.isFinite(leg.betSelection.evaluation.individualModelProbabilityPct));
}

assert(!normalizedLegs.some(isUnderPlayableSelection));
assert(!myComboLegs.some(isUnderPlayableSelection));
assert(!predictionLegs.some(isUnderPlayableSelection));
assert.equal(normalized.coverage.profilesEvaluated, normalized.slips.length, "Il test non deve imporre un numero fisso di schedine");
assert(packageJson.scripts["build:betting:md06"].includes("--matchday 6"));
assert(packageJson.scripts["test:schedina"].includes("test-schedina-md06.js"));

const settlementPath = "js/pages/betting-settlement.mjs";
const currentSettlement = fs.readFileSync(path.join(root, settlementPath), "utf8");
const headSettlement = execFileSync("git", ["show", `HEAD:${settlementPath}`], { cwd: root, encoding: "utf8" });
assert.equal(currentSettlement, headSettlement, "Le chiavi di settlement storico sono state alterate");

console.log(`OK BetSelection v1: ${normalizedLegs.length} schedina, ${myComboLegs.length} MyCombo e ${predictionLegs.length} prediction legs verificate`);
