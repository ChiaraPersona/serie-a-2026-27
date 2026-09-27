"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), "utf8"));
assert.deepStrictEqual(data.coverage.teamIds, ["atalanta"], "Il pilot deve contenere soltanto Atalanta");
const profile = data.profiles[0];
assert.strictEqual(profile.sampleSize, 5, "Campione Atalanta corrente inatteso");
assert.strictEqual(profile.tacticalContext.current.coach, "Maurizio Sarri");
assert.strictEqual(profile.tacticalContext.current.preferredFormation, "4-3-3");
assert.strictEqual(profile.tacticalContext.historicalPrior.formation, "3421");
assert.strictEqual(profile.shotDefense.shotsAllowed.mean, 19.2);
assert.strictEqual(profile.shotDefense.shotsAllowed.median, 16);
assert(profile.shotDefense.shotsAllowed.robustCurrentMean < profile.shotDefense.shotsAllowed.mean, "L'outlier Roma non e stato attenuato");
assert(profile.shotDefense.shotsAllowed.shrunkMean < profile.shotDefense.shotsAllowed.robustCurrentMean, "Shrinkage storico assente");
assert(profile.shotDefense.shotsAllowed.shrunkMean < 14, "Il campione corrente domina eccessivamente il prior");
assert(profile.shotDefense.shotsAllowed.outliers.some(item => item.matchId === "roma-atalanta-2026-27-md-03" && item.matchupFailure), "Matchup failure Roma non segnalato");
assert.strictEqual(profile.shotDefense.shotLocation.verificationStatus, "partially-verified");
assert(profile.shotDefense.shotLocation.insideBoxShare > 0.65 && profile.shotDefense.shotLocation.insideBoxShare < 0.67);
assert.strictEqual(profile.volatility.shotsAllowed, "high");
assert.strictEqual(profile.volatility.changesCentralMean, false);
assert(profile.discipline.shrunk.foulsCommittedPerGame > profile.discipline.current.foulsCommittedPerGame && profile.discipline.shrunk.foulsCommittedPerGame < profile.discipline.historical.foulsCommittedPerGame, "Shrinkage falli non valido");
assert(profile.discipline.modelFactor >= 0.95 && profile.discipline.modelFactor <= 1.05, "Fattore disciplina squadra non prudente");
assert.strictEqual(profile.vulnerabilities.territorialPressure.fieldTilt, null);
for (const item of Object.values(profile.vulnerabilities.positionalShotVulnerability)) {
  assert(item.effectiveMaxBoostPct >= 0 && item.effectiveMaxBoostPct <= 3, "Boost posizionale non prudente");
  if (item.active) assert(item.minimumBaselineShots90 > 0, "Soglia baseline outsider assente");
}
for (const value of [profile.shotDefense.shotsAllowed.shrunkMean, profile.shotDefense.shotsOnTargetAllowed.shrunkMean, profile.corners.shrunkForPerGame]) assert(Number.isFinite(value), "Valore shrinkage non numerico");
assert(!JSON.stringify(profile).includes("NaN"), "NaN nel profilo Atalanta");
console.log(`OK profilo matchup Atalanta: tiri concessi ${profile.shotDefense.shotsAllowed.mean} grezzi -> ${profile.shotDefense.shotsAllowed.robustCurrentMean} robusti -> ${profile.shotDefense.shotsAllowed.shrunkMean} regolarizzati`);
