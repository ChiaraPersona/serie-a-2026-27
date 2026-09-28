"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { signalPersistence, metricAgreement, signalStability, distributionShape, shooterStructure, roleDistributionBreadth } = require("./build-team-matchup-profiles");
const { applyOpponentTeamVolumeInteraction, teamOffensiveAllocation, teamProfilePlayerModifier } = require("./predictions/engine");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), "utf8"));
assert.deepStrictEqual(data.coverage.teamIds, ["atalanta", "bologna", "cagliari", "como", "fiorentina", "roma"], "La copertura deve contenere esattamente le sei squadre richieste");
const byTeam = new Map(data.profiles.map(profile => [profile.teamId, profile]));
const atalanta = byTeam.get("atalanta");
const bologna = byTeam.get("bologna");
const cagliari = byTeam.get("cagliari");
const como = byTeam.get("como");
const fiorentina = byTeam.get("fiorentina");
const roma = byTeam.get("roma");

const isolatedSpike = signalPersistence([8, 9, 9, 10, 40], 12);
const persistentPressure = signalPersistence([13, 14, 15, 16, 17], 12);
assert(persistentPressure.shareAboveBaseline > isolatedSpike.shareAboveBaseline, "La persistenza non distingue una serie stabile da un picco isolato");
assert.strictEqual(persistentPressure.level, "high");
const primaryAndBreadth = distributionShape([28, 12, 12, 11, 10, 9, 8, 10]);
assert(primaryAndBreadth.topShooterShare >= 0.25 && primaryAndBreadth.topShooterShare <= 0.3, "Il dataset sintetico non rappresenta un primary shooter");
assert.strictEqual(primaryAndBreadth.primaryLevel, "high");
assert.strictEqual(primaryAndBreadth.secondaryLevel, "high", "Primary concentration e secondary breadth devono poter coesistere");

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

assert.strictEqual(cagliari.sampleSize, 5);
assert.strictEqual(cagliari.tacticalContext.current.coach, "Fabio Pisacane");
assert.strictEqual(cagliari.tacticalContext.currentSeasonRegimes.length, 1, "Il regime Pisacane deve restare unico e continuo");
assert.strictEqual(cagliari.tacticalContext.currentSeasonRegimes[0].matches, 5);
assert.strictEqual(cagliari.shotDefense.shotsAllowed.mean, 20.4);
assert.strictEqual(cagliari.shotDefense.shotsAllowed.signalPersistence.level, "high");
assert.strictEqual(cagliari.shotDefense.shotsAllowed.signalPersistence.matchesAboveBaseline, 4);
assert.strictEqual(cagliari.shotDefense.shotsAllowed.signalPersistence.matchesAboveElevatedThreshold, 3);
assert.strictEqual(cagliari.shotDefense.shotsAllowed.signalPersistence.longestRun, 2);
assert.strictEqual(cagliari.shotDefense.shotsOnTargetAllowed.mean, 4.2);
assert.strictEqual(cagliari.shotDefense.shotsOnTargetAllowed.signalPersistence.level, "low");
assert.strictEqual(cagliari.vulnerabilities.signals.totalShotVulnerability.level, "high");
assert.strictEqual(cagliari.vulnerabilities.signals.sotVulnerability.level, "normal");
assert.strictEqual(cagliari.shotDefense.opponentShotOnTargetRate.current, 0.206);
assert.strictEqual(cagliari.shotDefense.opponentShotOnTargetRate.historical, 0.358);
assert.strictEqual(cagliari.shotDefense.opponentShotOnTargetRate.shrunk, 0.314);
assert.strictEqual(cagliari.shotDefense.shotLocation.insideBox, null, "Una zona tiro mancante non deve diventare zero");
assert.strictEqual(cagliari.shotDefense.shotLocation.outsideBox, null);
assert.strictEqual(cagliari.shotDefense.shotLocation.insideBoxShare, null);
assert.strictEqual(cagliari.shotDefense.shotLocation.verificationStatus, "unavailable");
assert.strictEqual(cagliari.vulnerabilities.boxPenetration.sourceType, "qualitative-derived");

const cagliariRoles = cagliari.shotDefense.opponentShotRoleDistribution;
assert.strictEqual(cagliariRoles.mappedShots, 101);
assert.strictEqual(cagliariRoles.unmappedShots, 1);
assert.strictEqual(cagliariRoles.shotDistributionBreadth.activeRoles, 7);
assert(cagliariRoles.shotDistributionBreadth.score > 85, "La breadth Cagliari deve restare ampia");
assert(cagliariRoles.roleConcentrationIndex.value > 0.15 && cagliariRoles.roleConcentrationIndex.value < 0.16);
assert(cagliariRoles.shotDistributionBreadth.shooterConcentrationIndex < cagliariRoles.roleConcentrationIndex.value);

assert.strictEqual(cagliari.discipline.current.foulsCommittedDistribution.median, 8);
assert.strictEqual(cagliari.discipline.historicalCurrentAgreement.level, "low");
assert(cagliari.discipline.modelFactor < 1, "La disciplina corrente piu bassa non deve creare un aumento automatico");
assert.strictEqual(cagliari.resultsVsProcessDivergence.observedGoalsAgainstPerMatch, 0.4);
assert.strictEqual(cagliari.resultsVsProcessDivergence.expectedGoalsAgainstPerMatch, 1.752);
assert.strictEqual(cagliari.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");
assert.strictEqual(cagliari.vulnerabilities.positionalShotVulnerability.CF.effectiveMaxBoostPct, 3.44);
assert.strictEqual(cagliari.vulnerabilities.positionalShotVulnerability.CF.effectiveMaxSotBoostPct, 1.15);
assert.strictEqual(cagliari.vulnerabilities.positionalShotVulnerability.FB.status, "watch");
assert.strictEqual(cagliari.vulnerabilities.positionalShotVulnerability.FB.effectiveMaxBoostPct, 0);
assert.strictEqual(cagliari.vulnerabilities.positionalShotVulnerability.CB.effectiveMaxBoostPct, 0);
assert.strictEqual(cagliari.modelPolicy.interactionPolicy.method, "single-dampened-budget");

assert.strictEqual(como.sampleSize, 5);
assert.strictEqual(como.tacticalContext.current.coach, "Cesc Fàbregas");
assert.strictEqual(como.tacticalContext.currentSeasonRegimes.length, 1);
assert.strictEqual(como.currentSeason.record.points, 10);
assert.strictEqual(como.currentSeason.shotsForPerGame, 23.4);
assert.strictEqual(como.currentSeason.shotsOnTargetForPerGame, 7.2);
assert.strictEqual(como.currentSeason.cornersForPerGame, 8);
assert.deepStrictEqual(como.offense.teamShotVolume.rawValues, [20, 21, 20, 29, 27]);
assert.strictEqual(como.offense.teamShotVolume.signalPersistence.level, "very-high");
assert.strictEqual(como.offense.teamShotVolume.signalPersistence.matchesAboveBaseline, 5);
assert.strictEqual(como.offense.teamShotVolume.matchesAtOrAbove20, 5);
assert.strictEqual(como.offense.teamShotVolume.shrunkPerGame, 16.986);
assert.strictEqual(como.offense.teamSotVolume.shrunkPerGame, 5.674);
assert.strictEqual(como.offense.shotsForRoleDistribution.mappedShots, 117);
assert.strictEqual(como.offense.shotsForRoleDistribution.shotsOnTargetByRole.CF, 11);
assert.strictEqual(como.offense.primaryShooterConcentration.playerId, "nico-paz");
assert.strictEqual(como.offense.primaryShooterConcentration.topShooterShare, 0.2308);
assert.strictEqual(como.offense.primaryShooterConcentration.level, "high");
assert.strictEqual(como.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(como.offense.offensiveShotDistributionBreadth.level, "high");
assert.strictEqual(como.offense.teamSetPieceOpportunityVolume.currentCorners.mean, 8);
assert.strictEqual(como.offense.teamSetPieceOpportunityVolume.shrunkCornersPerGame, 5.501);
assert.strictEqual(como.offense.teamOffensiveAllocation.factorClamp[0], 0.85);
assert.strictEqual(como.offense.teamOffensiveAllocation.factorClamp[1], 1.15);

assert.strictEqual(como.shotDefense.shotsAllowed.mean, 15);
assert.strictEqual(como.shotDefense.shotsOnTargetAllowed.mean, 3.4);
assert.strictEqual(como.shotDefense.opponentShotOnTargetRate.current, 0.227);
assert.strictEqual(como.vulnerabilities.signals.totalShotVulnerability.level, "elevated");
assert.strictEqual(como.vulnerabilities.signals.sotVulnerability.level, "normal");
assert.strictEqual(como.vulnerabilities.signals.transitionShotVulnerability.status, "watch");
assert.strictEqual(como.vulnerabilities.signals.centralForwardShotAccess.status, "watch");
assert.strictEqual(como.vulnerabilities.signals.secondLineShotAccess.status, "watch");
assert(Object.values(como.vulnerabilities.positionalShotVulnerability).every(role => role.effectiveMaxBoostPct === 0), "Como: un ruolo WATCH/INACTIVE ha prodotto boost difensivo");
assert.notDeepStrictEqual(como.offense.shotsForRoleDistribution.shotsByRole, como.shotDefense.shotsAllowedRoleDistribution.shotsByRole, "Tiri prodotti e concessi sono stati confusi");
const frosinoneTransition = como.vulnerabilities.transitionShotEfficiencyProxy.rows.find(row => row.opponentTeamId === "frosinone");
const genoaTransition = como.vulnerabilities.transitionShotEfficiencyProxy.rows.find(row => row.opponentTeamId === "genoa");
assert(frosinoneTransition.shotsPer10PctPossession > genoaTransition.shotsPer10PctPossession, "Il proxy transizione confonde basso possesso e produzione di tiri");
assert.strictEqual(como.vulnerabilities.transitionShotEfficiencyProxy.modelStatus, "experimental-watch-no-central-effect");

assert.strictEqual(como.discipline.current.foulsCommittedPerGame, 7.8);
assert.strictEqual(como.discipline.current.yellowCardsPerGame, 0.8);
assert.strictEqual(como.discipline.shrunk.foulsCommittedPerGame, 11.768);
assert.strictEqual(como.discipline.shrunk.yellowCardsPerGame, 1.703);
assert.strictEqual(como.discipline.historicalCurrentAgreement.level, "low");
assert(como.discipline.expectedDefensiveExposure.factor < 1 && como.discipline.expectedDefensiveExposure.factor > 0.97);
assert.strictEqual(como.shotDefense.shotPermissionProfile.highQualityShotAccess.value, null);
assert.strictEqual(como.shotDefense.shotLocation.insideBox, null);

assert.strictEqual(fiorentina.sampleSize, 5);
assert.strictEqual(fiorentina.tacticalContext.current.coach, "Fabio Grosso");
assert.strictEqual(fiorentina.historicalBaseline.shotsForPerGame, 12.868);
assert.strictEqual(fiorentina.historicalBaseline.shotsOnTargetForPerGame, 3.447);
assert.strictEqual(fiorentina.currentSeason.shotsForPerGame, 16.8);
assert.strictEqual(fiorentina.currentSeason.shotsOnTargetForPerGame, 5.6);
assert.strictEqual(fiorentina.currentSeason.shotOnTargetRate, 0.333);
assert.strictEqual(fiorentina.currentSeason.possessionPct, 43.4);
assert.strictEqual(fiorentina.offense.teamShotVolume.shrunkPerGame, 13.742);
assert.strictEqual(fiorentina.offense.teamSotVolume.shrunkPerGame, 3.892);
assert.strictEqual(fiorentina.offense.shotAccuracyVolatility.level, "high");
assert(fiorentina.offense.shotAccuracyVolatility.coefficientOfVariation > 0.35);
assert.strictEqual(fiorentina.offense.possessionIndependentShotCreation.status, "active");
assert(fiorentina.offense.possessionIndependentShotCreation.leagueRelative > 0.3);
assert.strictEqual(fiorentina.offense.primaryShooterConcentration.playerId, "franco-mastantuono");
assert.strictEqual(fiorentina.offense.primaryShooterConcentration.level, "high");
assert.strictEqual(fiorentina.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(fiorentina.offense.sotForRoleDistribution.mappedShotsOnTarget, 28);
assert.strictEqual(fiorentina.offense.sotForRoleDistribution.roleDetails.CM.shotsOnTarget, 8);
assert.strictEqual(fiorentina.shotDefense.shotsAllowed.mean, 11.8);
assert.strictEqual(fiorentina.shotDefense.shotsOnTargetAllowed.mean, 5.2);
assert.strictEqual(fiorentina.shotDefense.opponentShotOnTargetRate.current, 0.441);
assert.strictEqual(fiorentina.shotDefense.opponentShotOnTargetRate.shrunk, 0.373);
assert.strictEqual(fiorentina.shotDefense.defensiveShotDistributionBreadth.level, "high");
assert.strictEqual(fiorentina.shotDefense.defensiveSotDistributionBreadth.level, "high");
assert.strictEqual(fiorentina.shotDefense.sotAllowedRoleDistribution.roleDetails.FB.shotsOnTarget, 5);
assert.strictEqual(fiorentina.shotDefense.shotQualityProfile.against.xgPerShot, 0.1125);
assert.strictEqual(fiorentina.shotDefense.shotQualityProfile.highQualityChanceVulnerability.status, "watch");
assert.strictEqual(fiorentina.shotDefense.shotPermissionProfile.insideBoxAccess.value, null);
assert.strictEqual(fiorentina.offense.gameStateAdjustedVolume.status, "watch");
assert.strictEqual(fiorentina.offense.gameStateAdjustedVolume.shotTimestampsAvailable, false);
assert.strictEqual(fiorentina.vulnerabilities.positionalShotVulnerability.CB.status, "watch");
assert.strictEqual(fiorentina.vulnerabilities.positionalShotVulnerability.CB.effectiveMaxSotBoostPct, 0);

const broadSot = roleDistributionBreadth({ CF: 5, W: 0, AM: 0, CM: 5, DM: 0, FB: 4, CB: 1 }, 5, "medium");
const concentratedSot = roleDistributionBreadth({ CF: 12, W: 0, AM: 1, CM: 1, DM: 0, FB: 0, CB: 0 }, 5, "medium");
assert.strictEqual(broadSot.level, "high", "La distribuzione SOT sintetica ampia non viene riconosciuta");
assert(broadSot.score > concentratedSot.score, "Shot breadth e SOT breadth vengono confuse");

assert.strictEqual(roma.sampleSize, 5);
assert.strictEqual(roma.tacticalContext.current.coach, "Gian Piero Gasperini");
assert.strictEqual(roma.historicalBaseline.shotsForPerGame, 13.237);
assert.strictEqual(roma.currentSeason.shotsForPerGame, 20.6);
assert.strictEqual(roma.offense.teamShotVolume.robustCurrentPerGame, 17.24);
assert.strictEqual(roma.offense.teamShotVolume.shrunkPerGame, 14.414);
assert.strictEqual(roma.historicalBaseline.shotsOnTargetForPerGame, 4.684);
assert.strictEqual(roma.currentSeason.shotsOnTargetForPerGame, 7);
assert.strictEqual(roma.offense.teamSotVolume.robustCurrentPerGame, 6.68);
assert.strictEqual(roma.offense.teamSotVolume.shrunkPerGame, 5.271);
assert.strictEqual(roma.offense.offensiveShotQuality.xg, 12.99);
assert.strictEqual(roma.offense.offensiveShotQuality.xgPerShot, 0.1261);
assert.strictEqual(roma.offense.offensiveShotQuality.leagueXgPerShot, 0.1017);
assert(roma.offense.offensiveShotQuality.leagueRelative > 0.23 && roma.offense.offensiveShotQuality.leagueRelative < 0.25);
assert.strictEqual(roma.offense.offensiveShotQuality.leagueSample.matches, 50);
assert.strictEqual(roma.offense.shotVolumeCeiling.value, 39);
assert.strictEqual(roma.offense.shotVolumeCeiling.level, "very-high");
assert.strictEqual(roma.offense.shotVolumeVolatility.level, "high");
assert.strictEqual(roma.offense.shooterStructure.type, "multi-primary");
assert.strictEqual(roma.offense.shooterStructure.primaryCount, 3);
assert.deepStrictEqual(roma.offense.shooterStructure.primaryPlayerIds, ["donyell-malen", "paulo-dybala", "matias-soule"]);
const romaTiers = new Map(roma.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(romaTiers.get("donyell-malen").shotTier.tier, "primary");
assert.strictEqual(romaTiers.get("donyell-malen").sotTier.tier, "primary");
assert.strictEqual(romaTiers.get("matias-soule").shotTier.tier, "primary");
assert.strictEqual(romaTiers.get("matias-soule").sotTier.tier, "primary");
assert.strictEqual(romaTiers.get("paulo-dybala").shotTier.tier, "primary");
assert.strictEqual(romaTiers.get("paulo-dybala").sotTier.tier, "co-primary", "Il tier SOT di Dybala non deve essere copiato dal tier tiri");
assert.strictEqual(romaTiers.get("bryan-cristante").shotTier.tier, "secondary");
assert.strictEqual(romaTiers.get("bryan-cristante").sotTier.tier, "occasional", "Cristante: il tier SOT non deve essere copiato dal tier tiri");
assert.strictEqual(roma.offense.offensiveShotDistributionBreadth.level, "high");
assert.strictEqual(roma.offense.offensiveSotDistributionBreadth.level, "high");
assert.strictEqual(roma.offense.volumeExpansionBreadth.level, "high");
assert.strictEqual(roma.offense.volumeExpansionBreadth.uniqueShooters, 10);
assert.strictEqual(roma.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");
assert.strictEqual(roma.offense.cbSetPieceShotParticipation.shots, 9, "Il ruolo generico Difensore di Lulli non deve diventare automaticamente CB");
assert.strictEqual(roma.offense.cbSetPieceShotParticipation.excludedGenericRoleShots, 1);
assert.deepStrictEqual(roma.offense.cbSetPieceShotParticipation.excludedGenericRolePlayers, ["emanuele-lulli"]);
assert.strictEqual(roma.shotDefense.shotsAllowed.mean, 9.2);
assert.strictEqual(roma.shotDefense.shotsOnTargetAllowed.mean, 3.4);
assert.strictEqual(roma.shotDefense.defensiveMetricSignals.shotsAllowed.historicalCurrentAgreement.level, "very-high");
assert.strictEqual(roma.shotDefense.defensiveMetricSignals.shotsOnTargetAllowed.historicalCurrentAgreement.level, "very-high");
assert.strictEqual(roma.shotDefense.defensiveMetricSignals.shotsAllowed.level, "very-high");
assert.strictEqual(roma.shotDefense.defensiveMetricSignals.shotsOnTargetAllowed.level, "very-high");
assert(roma.shotDefense.defensiveMetricSignals.shotsAllowed.score > cagliari.shotDefense.defensiveMetricSignals.shotsAllowed.score, "Stabilita Roma-like e divergenza Cagliari-like non distinte");
assert.strictEqual(roma.shotDefense.generalShotSuppression.status, "active");
assert.strictEqual(roma.shotDefense.generalSotSuppression.status, "active");
assert.strictEqual(roma.vulnerabilities.signals.centralForwardShotAccess.level, "normal");
assert.strictEqual(roma.vulnerabilities.signals.secondLineShotAccess.level, "normal");
assert.strictEqual(roma.vulnerabilities.signals.roleSpecificSotVulnerability.status, "inactive");
assert.strictEqual(roma.vulnerabilities.positionalShotVulnerability.CB.status, "watch");
assert.strictEqual(roma.shotDefense.shotLocation.insideBox, null);
assert.strictEqual(roma.shotDefense.shotLocation.sourceType, "unavailable");
assert.strictEqual(roma.dataQuality.playerRoleCoverage.totalPlayerShots, 103);
assert.strictEqual(roma.dataQuality.playerRoleCoverage.explicitRoleShots, 102);
assert.strictEqual(roma.dataQuality.playerRoleCoverage.genericRoleFallbackShots, 1);
assert(roma.dataQuality.playerRoleCoverage.unresolvedParticipants.some(player => player.playerId === "neil-el-aynaoui" && player.shots === 0));
assert.deepStrictEqual(roma.dataQuality.missingHistoricalPlayerBaselines, ["emanuele-lulli"]);
assert.strictEqual(roma.resultsVsProcessDivergence.offensiveLevel, "low");
assert.strictEqual(roma.discipline.metricSignals.foulsCommitted.historicalCurrentAgreement.level, "very-high");
assert.strictEqual(roma.discipline.metricSignals.foulsWon.historicalCurrentAgreement.level, "medium");
assert(roma.discipline.metricSignals.foulsCommitted.historicalCurrentAgreement.score > roma.discipline.metricSignals.foulsWon.historicalCurrentAgreement.score);
assert.strictEqual(roma.corners.currentDistribution.mean, 5.8);
assert.strictEqual(roma.corners.currentDistribution.median, 4);
assert.strictEqual(roma.corners.robustCurrentForPerGame, 4.84);
assert.strictEqual(roma.corners.shrunkForPerGame, 5.12);

const syntheticStructure = shooterStructure([
  { playerId: "a", name: "A", shots: 20, shotsOnTarget: 10, shotsShare: 0.2, shotsOnTargetShare: 0.29, shotsPer90: 5, shotsOnTargetPer90: 2.5, historicalShots90: 4, historicalShotsOnTarget90: 2, appearances: 5, minutes: 360 },
  { playerId: "b", name: "B", shots: 18, shotsOnTarget: 4, shotsShare: 0.18, shotsOnTargetShare: 0.11, shotsPer90: 4.5, shotsOnTargetPer90: 1, historicalShots90: 3, historicalShotsOnTarget90: 1.2, appearances: 5, minutes: 360 },
  { playerId: "c", name: "C", shots: 16, shotsOnTarget: 8, shotsShare: 0.16, shotsOnTargetShare: 0.23, shotsPer90: 4.8, shotsOnTargetPer90: 2.4, historicalShots90: 2.5, historicalShotsOnTarget90: 0.8, appearances: 5, minutes: 300 },
  { playerId: "d", name: "D", shots: 8, shotsOnTarget: 1, shotsShare: 0.08, shotsOnTargetShare: 0.03, shotsPer90: 1.7, shotsOnTargetPer90: 0.2, historicalShots90: 1.3, historicalShotsOnTarget90: 0.25, appearances: 5, minutes: 420 }
], 5);
assert.strictEqual(syntheticStructure.type, "multi-primary");
assert(syntheticStructure.playerTiers.find(player => player.playerId === "b").shotTier.score > syntheticStructure.playerTiers.find(player => player.playerId === "b").sotTier.score, "Il test sintetico non separa shot tier e SOT tier");
const romaLikeStability = signalStability({ historical: 9.74, current: 9.2, historicalSampleSize: 38, currentValues: [9, 7, 6, 8, 16], direction: "suppression" });
const divergentPersistent = signalStability({ historical: 10, current: 20.4, historicalSampleSize: 38, currentValues: [13, 22, 21, 24, 22], direction: "elevation" });
assert(romaLikeStability.score > divergentPersistent.score, "Agreement e persistenza non contribuiscono distintamente alla stability");
assert.strictEqual(metricAgreement(13.763, 13).level, "very-high");
assert.strictEqual(metricAgreement(14.079, 8.8).level, "medium");

const neutralCandidate = { role: "Attaccante", detailedRole: "Punta centrale" };
const neutralRole = teamProfilePlayerModifier(neutralCandidate, 2, 0.8, roma, { general: 0.8, territorial: 0.8, wide: 0.5, setPiece: 0.5 });
assert.strictEqual(neutralRole.shotFactor, 1, "La soppressione generale ha creato un boost/malus di ruolo");
assert.strictEqual(neutralRole.sotFactor, 1, "NONE_PROVEN non lascia neutro il fattore SOT di ruolo");
const teamShots = { min: 14, central: 18, max: 22 };
const teamSot = { min: 4, central: 6, max: 8 };
const suppressionResult = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 16, possessionPct: 55, passSuccessPct: 84 }, attackChannels: { left: 33, central: 34, right: 33 } }, roma, teamShots, teamSot, { central: 5 });
assert(suppressionResult.shotsAdjustmentPct < 0 && suppressionResult.shotsOnTargetAdjustmentPct < 0, "La difesa Roma non riduce il volume team prima dell'allocation");
assert(teamShots.central < 18 && teamSot.central < 6);

const allocationRows = [
  { playerId: "donyell-malen", projectedShots: 5, teamProfileRole: "CF", baselineShots90: 4.2, playerBaselineStability: { score: 0.9 } },
  { playerId: "paulo-dybala", projectedShots: 4.5, teamProfileRole: "AM", baselineShots90: 2.9, playerBaselineStability: { score: 0.8 } },
  { playerId: "bryan-cristante", projectedShots: 3, teamProfileRole: "CM", baselineShots90: 1.3, playerBaselineStability: { score: 0.85 } },
  { playerId: "unknown-low", projectedShots: 1.5, teamProfileRole: "FB", baselineShots90: 0.3, playerBaselineStability: { score: 0.3 } }
];
const expanded = teamOffensiveAllocation(allocationRows, "projectedShots", 19, roma);
assert(Math.abs(expanded.values.reduce((total, value) => total + value, 0) - 19) < 0.001);
assert(expanded.values.every((value, index) => value >= allocationRows[index].projectedShots), "L'espansione ha sostituito o ridotto una baseline individuale");
assert(expanded.values[0] - allocationRows[0].projectedShots > expanded.values[3] - allocationRows[3].projectedShots, "L'extra-volume e stato distribuito uniformemente");
const contracted = teamOffensiveAllocation(allocationRows, "projectedShots", 10, roma);
assert(Math.abs(contracted.values.reduce((total, value) => total + value, 0) - 10) < 0.001);
assert(contracted.factors[0] > contracted.factors[3], "In soppressione il primary non conserva piu quota del low-volume");
const syntheticSetPieceProfile = {
  offense: {
    shotsForRoleDistribution: { shotsOnTargetShareByRole: { CB: 1 }, shareByRole: { CB: 1 }, playerDistribution: [] },
    shooterStructure: { playerTiers: [] },
    teamSetPieceOpportunityVolume: { shrunkCornersPerGame: 8 },
    teamOffensiveAllocation: { enabled: true, method: "test", playerWeight: 0, roleWeight: 0, setPieceWeight: 1, expansionBreadthWeight: 0, currentEvidenceWeight: 0.5, factorClamp: [0.5, 1.5] }
  }
};
const setPieceSotRows = [
  { playerId: "cb-high-sot", projectedShotsOnTarget: 1, teamProfileRole: "CB", detailedRole: "Difensore centrale", baselineShots90: 2, baselineShotsOnTarget90: 0.8, playerBaselineStability: { score: 0.7 } },
  { playerId: "cb-low-sot", projectedShotsOnTarget: 1, teamProfileRole: "CB", detailedRole: "Difensore centrale", baselineShots90: 2, baselineShotsOnTarget90: 0.08, playerBaselineStability: { score: 0.7 } }
];
const setPieceSotAllocation = teamOffensiveAllocation(setPieceSotRows, "projectedShotsOnTarget", 3, syntheticSetPieceProfile);
assert(setPieceSotAllocation.values[0] > setPieceSotAllocation.values[1], "L'allocazione piazzati SOT sta usando la baseline tiri invece della baseline SOT");

for (const profile of data.profiles) {
  assert(!JSON.stringify(profile).includes("NaN"), `${profile.teamId}: NaN nel profilo`);
  assert(Object.values(profile.shotDefense.opponentShotRoleDistribution.shareByRole).every(value => value == null || Number.isFinite(value)));
}

console.log(`OK profili matchup: 6 squadre; Roma ${roma.currentSeason.shotsForPerGame} tiri, ${roma.currentSeason.shotsOnTargetForPerGame} SOT, stability ${roma.shotDefense.defensiveMetricSignals.shotsAllowed.level}`);
