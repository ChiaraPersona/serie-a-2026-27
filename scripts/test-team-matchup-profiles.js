"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), "utf8"));
assert.deepStrictEqual(data.coverage.teamIds, ["atalanta", "bologna"], "La copertura deve contenere soltanto Atalanta e Bologna");
const byTeam = new Map(data.profiles.map(profile => [profile.teamId, profile]));
const atalanta = byTeam.get("atalanta");
const bologna = byTeam.get("bologna");

assert.strictEqual(atalanta.sampleSize, 5);
assert.strictEqual(atalanta.tacticalContext.current.coach, "Maurizio Sarri");
assert.strictEqual(atalanta.tacticalContext.historicalPrior.formation, "3421");
assert.strictEqual(atalanta.shotDefense.shotsAllowed.mean, 19.2);
assert(atalanta.shotDefense.shotsAllowed.robustCurrentMean < atalanta.shotDefense.shotsAllowed.mean, "L'outlier Roma non e stato attenuato");
assert(atalanta.shotDefense.shotsAllowed.shrunkMean < 14, "Il campione Atalanta domina eccessivamente il prior");
assert(atalanta.shotDefense.shotsAllowed.outliers.some(item => item.matchId === "roma-atalanta-2026-27-md-03" && item.matchupFailure));
assert.strictEqual(atalanta.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch, 12.6);
assert(atalanta.shotDefense.shotLocation.insideBoxShare > 0.65 && atalanta.shotDefense.shotLocation.insideBoxShare < 0.67);
assert.strictEqual(atalanta.volatility.shotsAllowed, "high");
assert.strictEqual(atalanta.vulnerabilities.positionalShotVulnerability.W.effectiveMaxBoostPct, 1.87, "Coefficienti Atalanta alterati dall'estensione Bologna");

assert.strictEqual(bologna.sampleSize, 5);
assert.strictEqual(bologna.tacticalContext.current.coach, "Raffaele Palladino");
assert.strictEqual(bologna.tacticalContext.current.repositoryTeamCoach, "Domenico Tedesco", "La divergenza anagrafica del repository deve restare visibile");
assert.strictEqual(bologna.tacticalContext.historicalPrior.formation, "4231");
const tedesco = bologna.tacticalContext.currentSeasonRegimes.find(era => era.id === "tedesco");
const palladino = bologna.tacticalContext.currentSeasonRegimes.find(era => era.id === "palladino");
assert.strictEqual(tedesco.matches, 4, "Le quattro gare Tedesco non devono essere cancellate");
assert.strictEqual(tedesco.status, "closed");
assert.strictEqual(tedesco.tacticalWeightPerMatch, 0.35);
assert.strictEqual(palladino.matches, 1);
assert.strictEqual(palladino.status, "active");
assert.strictEqual(palladino.tacticalConfidence, "very-low");
assert(bologna.tacticalContext.activeEraTacticalShrinkage.shotsAllowedPerGame.currentWeight < 0.05, "Una gara Palladino domina il prior tattico");
assert.strictEqual(bologna.tacticalContext.effectiveTacticalSampleSize, 2.4);

assert.strictEqual(bologna.historicalBaseline.shotsAllowedPerGame, 10.237);
assert.strictEqual(bologna.historicalBaseline.homeAwayShotDefense.home.shotsAllowedPerGame, 8.842);
assert.strictEqual(bologna.shotDefense.shotsAllowed.mean, 12);
assert(bologna.shotDefense.shotsAllowed.shrunkMean > 10.2 && bologna.shotDefense.shotsAllowed.shrunkMean < 11, "Shrinkage Bologna non prudente");
assert.strictEqual(bologna.shotDefense.shotsOnTargetAllowed.mean, 3.4);
assert.notStrictEqual(bologna.shotDefense.shotsAllowed.shrunkMean, atalanta.shotDefense.shotsAllowed.shrunkMean, "Bologna ha ereditato il coefficiente Atalanta");

assert.strictEqual(bologna.shotDefense.shotLocation.insideBox, 37);
assert.strictEqual(bologna.shotDefense.shotLocation.outsideBox, 23);
assert.strictEqual(bologna.shotDefense.shotLocation.insideBoxShare, 0.617);
assert.strictEqual(bologna.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch, 7.4);
assert(bologna.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch < atalanta.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch, "Quota e volume assoluto dentro area non distinti");

const roleDistribution = bologna.shotDefense.opponentShotRoleDistribution;
assert.strictEqual(roleDistribution.mappedShots, 60);
assert.strictEqual(roleDistribution.unmappedShots, 0);
assert(Math.abs(Object.values(roleDistribution.shareByRole).reduce((total, value) => total + value, 0) - 1) < 0.001);
assert(roleDistribution.roleConcentrationIndex.value >= 0 && roleDistribution.roleConcentrationIndex.value <= 1);
assert.strictEqual(roleDistribution.roleConcentrationIndex.modelWeight, 0, "La concentrazione preliminare non deve dominare il modello");

for (const item of Object.values(bologna.vulnerabilities.positionalShotVulnerability)) {
  assert.strictEqual(item.effectiveMaxBoostPct, 0, "Un segnale Bologna watch/inactive ha prodotto un boost");
  assert.notStrictEqual(item.status, "active", "Nessun ruolo Bologna deve essere active");
}
assert.deepStrictEqual(bologna.modelPolicy.active, ["totalShotVulnerability", "sotVulnerability", "boxPenetration"]);
assert(bologna.modelPolicy.watch.includes("centralForwardShotAccess"));
assert(bologna.modelPolicy.watch.includes("secondLineShotAccess"));
assert.strictEqual(bologna.modelPolicy.watchActivationCriteria.automaticActivation, false);

assert.strictEqual(bologna.currentSeason.shotsForPerGame, 13.4);
assert.strictEqual(bologna.currentSeason.shotsOnTargetForPerGame, 3.2);
assert.strictEqual(bologna.attackProjectionContext.shots.shrunkPerGame, 13.044);
assert.strictEqual(bologna.attackProjectionContext.shotsOnTarget.shrunkPerGame, 3.635);
assert.strictEqual(bologna.discipline.current.foulsCommitted, 73);
assert.strictEqual(bologna.discipline.current.foulsWon, 64);
assert.strictEqual(bologna.discipline.foulIntensity.status, "active");
assert(bologna.discipline.foulIntensity.directDuelEnvironmentFactor > 1 && bologna.discipline.foulIntensity.directDuelEnvironmentFactor < 1.02);
assert.strictEqual(bologna.dataQuality.missingStatisticPolicy, "null-never-zero");
assert.strictEqual(bologna.volatility.changesCentralMean, false);

for (const profile of data.profiles) {
  assert(!JSON.stringify(profile).includes("NaN"), `${profile.teamId}: NaN nel profilo`);
  assert(Object.values(profile.shotDefense.opponentShotRoleDistribution.shareByRole).every(value => value == null || Number.isFinite(value)));
}

console.log(`OK profili matchup: Atalanta ${atalanta.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch} vs Bologna ${bologna.shotDefense.shotLocation.insideBoxShotsAllowedPerMatch} tiri in area concessi/gara; Bologna role boost 0%`);
