"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { signalPersistence, metricAgreement, signalStability, distributionShape, shooterStructure, roleDistributionBreadth } = require("./build-team-matchup-profiles");
const { applyOpponentTeamVolumeInteraction, teamOffensiveAllocation, teamProfilePlayerModifier } = require("./predictions/engine");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), "utf8"));
const matches = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/matches.json"), "utf8"));
assert.deepStrictEqual(data.coverage.teamIds, ["atalanta", "bologna", "cagliari", "como", "fiorentina", "frosinone", "genoa", "inter", "juventus", "lazio", "lecce", "roma"], "La copertura deve contenere esattamente le dodici squadre richieste");
const byTeam = new Map(data.profiles.map(profile => [profile.teamId, profile]));
const atalanta = byTeam.get("atalanta");
const bologna = byTeam.get("bologna");
const cagliari = byTeam.get("cagliari");
const como = byTeam.get("como");
const fiorentina = byTeam.get("fiorentina");
const frosinone = byTeam.get("frosinone");
const genoa = byTeam.get("genoa");
const inter = byTeam.get("inter");
const juventus = byTeam.get("juventus");
const lazio = byTeam.get("lazio");
const lecce = byTeam.get("lecce");
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

assert.strictEqual(frosinone.sampleSize, 5);
assert.strictEqual(frosinone.tacticalContext.current.coach, "Massimiliano Alvini");
assert.strictEqual(frosinone.tacticalContext.current.preferredFormation, "4-2-3-1");
assert.strictEqual(frosinone.tacticalContext.currentSeasonRegimes[0].matches, 5);
assert.strictEqual(frosinone.historicalBaseline.crossCompetitionHistoricalBaseline.competitionId, "serie-b");
assert.strictEqual(frosinone.historicalBaseline.crossCompetitionHistoricalBaseline.directComparability, false);
assert.strictEqual(frosinone.historicalBaseline.shotsAllowedPerGame, 14.5);
assert.strictEqual(frosinone.historicalBaseline.shotsOnTargetAllowedPerGame, 4.711);
assert.strictEqual(frosinone.historicalBaseline.possessionPct, 49.584);
assert.deepStrictEqual(frosinone.offense.teamShotVolume.rawValues, [11, 12, 13, 26, 22]);
assert.strictEqual(frosinone.offense.teamShotVolume.current.mean, 16.8);
assert.strictEqual(frosinone.offense.teamShotVolume.current.median, 13);
assert.strictEqual(frosinone.offense.teamShotVolume.robustCurrentPerGame, 16.16);
assert.strictEqual(frosinone.offense.teamShotVolume.shrunkPerGame, 16.902);
assert.strictEqual(frosinone.offense.teamSotVolume.current.mean, 5.6);
assert.strictEqual(frosinone.offense.teamSotVolume.robustCurrentPerGame, 5.28);
assert.strictEqual(frosinone.offense.possessionIndependentShotCreation.status, "watch");
assert.strictEqual(frosinone.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(frosinone.offense.primaryShooterConcentration.topShooterShare, 0.1667);
assert.strictEqual(frosinone.offense.primaryShooterConcentration.topTwoShooterShare, 0.3333);
assert.strictEqual(frosinone.offense.primaryShooterConcentration.concentrationIndex, 0.0981);
assert.strictEqual(frosinone.offense.shooterStructure.type, "multi-primary");
assert.deepStrictEqual(frosinone.offense.shooterStructure.primaryPlayerIds, ["antonio-raimondo", "giorgi-kvernadze"]);
assert.strictEqual(frosinone.offense.shotsForRoleDistribution.mappedShots, 84);
assert.strictEqual(frosinone.offense.sotForRoleDistribution.mappedShotsOnTarget, 28);
assert.strictEqual(frosinone.offense.shotsForRoleDistribution.roleDetails.FB.shots, 15);
assert.strictEqual(frosinone.offense.shotsForRoleDistribution.roleDetails.CB.shots, 10);
assert.strictEqual(frosinone.offense.volumeExpansionBreadth.level, "high");
assert.strictEqual(frosinone.offense.volumeExpansionBreadth.status, "watch");
assert.strictEqual(frosinone.offense.volumeExpansionBreadth.uniqueShooters, 12);
assert.strictEqual(frosinone.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");

assert.deepStrictEqual(frosinone.shotDefense.shotsAllowed.rawValues, [20, 25, 15, 17, 27]);
assert.strictEqual(frosinone.shotDefense.shotsAllowed.mean, 20.8);
assert.strictEqual(frosinone.shotDefense.shotsAllowed.median, 20);
assert.strictEqual(frosinone.shotDefense.shotsAllowed.robustCurrentMean, 20.48);
assert.strictEqual(frosinone.shotDefense.shotsAllowed.shrunkMean, 16.259);
assert.strictEqual(frosinone.shotDefense.shotsAllowed.signalPersistence.level, "high");
assert.strictEqual(frosinone.shotDefense.shotsAllowed.signalPersistence.matchesAboveBaseline, 5);
assert.strictEqual(frosinone.shotDefense.defensiveMetricSignals.shotsAllowed.level, "high");
assert.strictEqual(frosinone.shotDefense.defensiveMetricSignals.shotsAllowed.score, 0.7148);
assert.strictEqual(frosinone.vulnerabilities.signals.totalShotVulnerability.level, "very-high-current");
assert.strictEqual(frosinone.vulnerabilities.signals.totalShotVulnerability.status, "active");
assert.deepStrictEqual(frosinone.shotDefense.shotsOnTargetAllowed.rawValues, [5, 4, 4, 5, 8]);
assert.strictEqual(frosinone.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 4.72);
assert.strictEqual(frosinone.shotDefense.shotsOnTargetAllowed.shrunkMean, 4.714);
assert.strictEqual(frosinone.vulnerabilities.signals.sotVulnerability.level, "normal");
assert.strictEqual(frosinone.vulnerabilities.signals.sotVulnerability.status, "inactive");
assert.strictEqual(frosinone.shotDefense.opponentShotOnTargetRate.current, 0.25);
assert.strictEqual(frosinone.shotDefense.opponentShotRoleDistribution.mappedShots, 104);
assert.strictEqual(frosinone.shotDefense.opponentShotRoleDistribution.unmappedShots, 0);
assert(Object.values(frosinone.vulnerabilities.positionalShotVulnerability).every(role => role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Frosinone: broad access WATCH ha creato boost individuali");
assert.strictEqual(frosinone.resultsVsProcessDivergence.observedGoalsAgainstPerMatch, 0.8);
assert.strictEqual(frosinone.resultsVsProcessDivergence.expectedGoalsAgainstPerMatch, 2.068);
assert.strictEqual(frosinone.resultsVsProcessDivergence.resultProcessGap, 1.268);
assert.strictEqual(frosinone.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");
assert.strictEqual(frosinone.corners.currentAllowed.mean, 7.6);
assert.strictEqual(frosinone.corners.currentAllowed.median, 8);
assert.strictEqual(frosinone.discipline.current.foulsCommittedPerGame, 17.4);
assert.strictEqual(frosinone.discipline.current.yellowCardsPerGame, 2.4);
assert(frosinone.discipline.expectedDefensiveExposure.factor > 1 && frosinone.discipline.expectedDefensiveExposure.factor < 1.01);

const neutralOpponentShots = { min: 10, central: 14, max: 18 };
const neutralOpponentSot = { min: 3, central: 5, max: 7 };
const neutralOpponentCorners = { min: 3, central: 5, max: 7 };
const neutralVsFrosinone = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 14, possessionPct: 50, passSuccessPct: 80, aerialWonPerGame: 10 }, attackChannels: { left: 33, central: 34, right: 33 } },
  frosinone,
  neutralOpponentShots,
  neutralOpponentSot,
  neutralOpponentCorners
);
assert(neutralVsFrosinone.shotsAdjustmentPct > 0, "Frosinone: il segnale total shots ACTIVE non modifica un avversario neutrale");
assert.strictEqual(neutralVsFrosinone.shotsOnTargetAdjustmentPct, 0, "Frosinone: il segnale SOT NORMAL/INACTIVE non resta neutro");
assert.strictEqual(neutralOpponentCorners.central, 5, "Frosinone: la vulnerabilita tiri ha modificato i corner avversari");
assert(neutralVsFrosinone.metricEvidence.shots.magnitudeWeight > 0.8, "Frosinone: la magnitudine grezza viene attenuata prima di essere esposta");
assert.strictEqual(neutralVsFrosinone.metricEvidence.shots.maturityWeight, 0.5);
assert.strictEqual(neutralVsFrosinone.metricEvidence.shots.stabilityWeight, 0.7148);

const frosinoneAllocationRows = [
  { playerId: "antonio-raimondo", projectedShots: 2.7, teamProfileRole: "CF", baselineShots90: 3.56, playerBaselineStability: { score: 0.85 } },
  { playerId: "giorgi-kvernadze", projectedShots: 2.5, teamProfileRole: "W", baselineShots90: 2.62, playerBaselineStability: { score: 0.9 } },
  { playerId: "giacomo-calo", projectedShots: 1.5, teamProfileRole: "CM", baselineShots90: 1.78, playerBaselineStability: { score: 0.85 } },
  { playerId: "anthony-oyono", projectedShots: 1.1, teamProfileRole: "FB", baselineShots90: 0.74, playerBaselineStability: { score: 0.55 } },
  { playerId: "gabriele-bracaglia", projectedShots: 1, teamProfileRole: "FB", baselineShots90: 1.22, playerBaselineStability: { score: 0.75 } },
  { playerId: "fares-ghedjemis", projectedShots: 1.4, teamProfileRole: "W", baselineShots90: 3.15, playerBaselineStability: { score: 0.7 } },
  { playerId: "ilario-monterisi", projectedShots: 0.8, teamProfileRole: "CB", baselineShots90: 0.93, playerBaselineStability: { score: 0.6 } },
  { playerId: "secondary-low", projectedShots: 0.6, teamProfileRole: "CB", baselineShots90: 0.3, playerBaselineStability: { score: 0.3 } }
];
const frosinoneAllocation = teamOffensiveAllocation(frosinoneAllocationRows, "projectedShots", 16.902, frosinone);
assert(Math.abs(frosinoneAllocation.values.reduce((total, value) => total + value, 0) - 16.902) < 0.001, "Frosinone: riconciliazione sintetica incoerente");
assert(frosinoneAllocation.values[0] - frosinoneAllocationRows[0].projectedShots > frosinoneAllocation.values[7] - frosinoneAllocationRows[7].projectedShots, "Frosinone: extra-volume distribuito uniformemente ai low baseline");
assert(frosinoneAllocation.factors.every(factor => factor >= 0.85 && factor <= 1.15), "Frosinone: allocation oltre il clamp del profilo");

const broadSot = roleDistributionBreadth({ CF: 5, W: 0, AM: 0, CM: 5, DM: 0, FB: 4, CB: 1 }, 5, "medium");
const concentratedSot = roleDistributionBreadth({ CF: 12, W: 0, AM: 1, CM: 1, DM: 0, FB: 0, CB: 0 }, 5, "medium");
assert.strictEqual(broadSot.level, "high", "La distribuzione SOT sintetica ampia non viene riconosciuta");
assert(broadSot.score > concentratedSot.score, "Shot breadth e SOT breadth vengono confuse");

assert.strictEqual(genoa.sampleSize, 5);
assert.strictEqual(genoa.tacticalContext.current.coach, "Daniele De Rossi");
assert.deepStrictEqual(genoa.offense.teamShotVolume.rawValues, [11, 8, 11, 17, 12]);
assert.strictEqual(genoa.offense.teamShotVolume.current.mean, 11.8);
assert.strictEqual(genoa.offense.teamShotVolume.current.median, 11);
assert.strictEqual(genoa.offense.teamShotVolume.robustCurrentPerGame, 11);
assert.strictEqual(genoa.offense.teamShotVolume.shrunkPerGame, 11.316);
assert.strictEqual(genoa.offense.teamShotVolume.signalPersistence.level, "low");
assert.deepStrictEqual(genoa.offense.teamSotVolume.rawValues, [2, 1, 2, 5, 5]);
assert.strictEqual(genoa.offense.teamSotVolume.shrunkPerGame, 3.539);
assert.strictEqual(genoa.offense.offensiveShotQuality.xg, 4.36);
assert.strictEqual(genoa.offense.offensiveShotQuality.xgPerShot, 0.0739);
assert.strictEqual(genoa.offense.possessionIndependentShotCreation.status, "watch");
assert(genoa.offense.possessionIndependentShotCreation.leagueRelative < 0, "Genoa: il proxy possesso non falsifica la creazione indipendente");
assert.strictEqual(genoa.offense.primaryShooterConcentration.topShooterShare, 0.1864);
assert.strictEqual(genoa.offense.primaryShooterConcentration.topTwoShooterShare, 0.3559);
assert.strictEqual(genoa.offense.primaryShooterConcentration.concentrationIndex, 0.1135);
assert.strictEqual(genoa.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(genoa.offense.shooterStructure.type, "multi-primary");
assert.deepStrictEqual(genoa.offense.shooterStructure.primaryPlayerIds, ["junior-messias", "tommaso-baldanzi", "vitinha"]);
const genoaTiers = new Map(genoa.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(genoaTiers.get("tommaso-baldanzi").shotTier.tier, "primary");
assert.strictEqual(genoaTiers.get("tommaso-baldanzi").sotTier.tier, "secondary", "Baldanzi: il volume tiri e stato trasferito ai SOT");
assert.strictEqual(genoaTiers.get("junior-messias").shotTier.tier, "primary");
assert.strictEqual(genoaTiers.get("junior-messias").sotTier.tier, "primary");
assert.strictEqual(genoaTiers.get("junior-messias").shotTier.confidence, "medium-low", "Messias: 212 minuti current trattati come baseline consolidata");
assert.strictEqual(genoaTiers.get("junior-messias").evidence.shotsPer90, 4.67);
assert.strictEqual(genoaTiers.get("junior-messias").evidence.historicalShots90, 2.53);
assert.strictEqual(genoa.offense.volumeExpansionBreadth.status, "watch");
assert.strictEqual(genoa.offense.volumeExpansionBreadth.modelEffect, "allocation-shape-only-no-independent-volume-multiplier");
assert.strictEqual(genoa.offense.cbSetPieceShotParticipation.status, "watch");
assert.strictEqual(genoa.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");

assert.deepStrictEqual(genoa.shotDefense.shotsAllowed.rawValues, [13, 15, 20, 26, 5]);
assert.strictEqual(genoa.shotDefense.shotsAllowed.mean, 15.8);
assert.strictEqual(genoa.shotDefense.shotsAllowed.median, 15);
assert.strictEqual(genoa.shotDefense.shotsAllowed.standardDeviation, 7.026);
assert.strictEqual(genoa.shotDefense.shotsAllowed.robustCurrentMean, 14.84);
assert.strictEqual(genoa.shotDefense.shotsAllowed.shrunkMean, 13.392);
assert.strictEqual(genoa.volatility.shotsAllowed, "high");
assert.strictEqual((79 - 26) / 4, 13.25, "Genoa: impatto del massimo non verificato");
assert.strictEqual((79 - 5) / 4, 18.5, "Genoa: impatto del minimo non verificato");
assert.deepStrictEqual(genoa.shotDefense.shotsOnTargetAllowed.rawValues, [4, 2, 9, 6, 2]);
assert.strictEqual(genoa.shotDefense.shotsOnTargetAllowed.mean, 4.6);
assert.strictEqual(genoa.shotDefense.shotsOnTargetAllowed.median, 4);
assert.strictEqual(genoa.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 4.12);
assert.strictEqual(genoa.shotDefense.shotsOnTargetAllowed.shrunkMean, 4.221);
assert.strictEqual(genoa.shotDefense.shotsOnTargetAllowed.signalPersistence.level, "low");
assert.strictEqual(genoa.volatility.shotsOnTargetAllowed, "high");
assert.strictEqual(genoa.shotDefense.opponentShotOnTargetRate.current, 0.291);
assert.strictEqual(genoa.shotDefense.opponentShotOnTargetRate.historical, 0.333);
assert.strictEqual(genoa.shotDefense.opponentShotOnTargetRate.shrunk, 0.321);
assert.strictEqual(genoa.shotDefense.shotQualityProfile.against.xg, 6.41);
assert.strictEqual(genoa.vulnerabilities.signals.totalShotVulnerability.status, "watch");
assert.strictEqual(genoa.vulnerabilities.signals.totalShotVulnerability.modelEffect, "none");
assert.strictEqual(genoa.vulnerabilities.signals.sotVulnerability.status, "watch");
assert.strictEqual(genoa.vulnerabilities.signals.sotVulnerability.modelEffect, "none");
assert(Object.values(genoa.vulnerabilities.positionalShotVulnerability).every(role => role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Genoa: un ruolo WATCH ha prodotto un boost");
assert.strictEqual(genoa.corners.currentAllowed.mean, 4.8);
assert.strictEqual(genoa.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");

const neutralGenoaShots = { min: 10, central: 14, max: 18 };
const neutralGenoaSot = { min: 3, central: 5, max: 7 };
const neutralGenoaCorners = { min: 3, central: 5, max: 7 };
const neutralVsGenoa = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 14, possessionPct: 50, passSuccessPct: 80, aerialWonPerGame: 10 }, attackChannels: { left: 33, central: 34, right: 33 } },
  genoa,
  neutralGenoaShots,
  neutralGenoaSot,
  neutralGenoaCorners
);
assert.strictEqual(neutralVsGenoa.shotsAdjustmentPct, 0, "Genoa: total shots WATCH ha modificato l'avversario neutrale");
assert.strictEqual(neutralVsGenoa.shotsOnTargetAdjustmentPct, 0, "Genoa: i 9 SOT del Como hanno creato una vulnerabilita SOT strutturale");
assert.strictEqual(neutralGenoaShots.central, 14);
assert.strictEqual(neutralGenoaSot.central, 5);
assert.strictEqual(neutralGenoaCorners.central, 5);
const genoaShotsOnlyActive = JSON.parse(JSON.stringify(genoa));
genoaShotsOnlyActive.vulnerabilities.signals.totalShotVulnerability.status = "active";
const independentShots = { min: 10, central: 14, max: 18 };
const independentSot = { min: 3, central: 5, max: 7 };
const independentResult = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 14, possessionPct: 50, passSuccessPct: 80, aerialWonPerGame: 10 }, attackChannels: { left: 33, central: 34, right: 33 } },
  genoaShotsOnlyActive,
  independentShots,
  independentSot,
  { min: 3, central: 5, max: 7 }
);
assert(independentResult.shotsAdjustmentPct > 0, "Genoa sintetico: il segnale tiri ACTIVE non viene letto");
assert.strictEqual(independentResult.shotsOnTargetAdjustmentPct, 0, "Genoa sintetico: il segnale tiri e stato copiato sui SOT WATCH");
const stableSameMean = signalStability({ historical: 12.789, current: 15.8, historicalSampleSize: 38, currentValues: [15, 16, 15, 17, 16], direction: "elevation" });
const volatileSameMean = signalStability({ historical: 12.789, current: 15.8, historicalSampleSize: 38, currentValues: [5, 26, 13, 20, 15], direction: "elevation" });
assert(stableSameMean.score > volatileSameMean.score, "La stability non distingue sequenze a media simile con persistenza diversa");

assert.strictEqual(inter.sampleSize, 5);
assert.strictEqual(inter.tacticalContext.current.coach, "Cristian Chivu");
assert.strictEqual(inter.tacticalContext.historicalPrior.formation, "352");
assert.deepStrictEqual(inter.offense.teamShotVolume.rawValues, [13, 31, 29, 27, 16]);
assert.strictEqual(inter.offense.teamShotVolume.current.mean, 23.2);
assert.strictEqual(inter.offense.teamShotVolume.current.median, 27);
assert.strictEqual(inter.offense.teamShotVolume.robustCurrentPerGame, 22.88);
assert.strictEqual(inter.offense.teamShotVolume.shrunkPerGame, 18.804);
assert.strictEqual(inter.offense.teamShotVolume.signalPersistence.level, "medium");
assert.deepStrictEqual(inter.offense.teamSotVolume.rawValues, [5, 7, 8, 12, 5]);
assert.strictEqual(inter.offense.teamSotVolume.shrunkPerGame, 6.242);
assert.strictEqual(inter.offense.offensiveShotQuality.xg, 14.58);
assert.strictEqual(inter.offense.offensiveShotQuality.xgPerShot, 0.1257);
assert.strictEqual(inter.offense.possessionIndependentShotCreation.status, "watch");
assert.strictEqual(inter.offense.primaryShooterConcentration.topShooterShare, 0.1897);
assert.strictEqual(inter.offense.primaryShooterConcentration.topTwoShooterShare, 0.319);
assert.strictEqual(inter.offense.primaryShooterConcentration.concentrationIndex, 0.0938);
assert.strictEqual(inter.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(inter.offense.shooterStructure.type, "one-primary");
assert.deepStrictEqual(inter.offense.shooterStructure.primaryPlayerIds, ["lautaro-martinez"]);
assert(inter.offense.shooterStructure.primaryShare < 0.2 && inter.offense.secondaryShooterBreadth.secondaryShooterShare > 0.8, "Inter: primary individuale e dipendenza di squadra sono stati confusi");
const interTiers = new Map(inter.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(interTiers.get("lautaro-martinez").shotTier.tier, "primary");
assert.strictEqual(interTiers.get("lautaro-martinez").sotTier.tier, "primary");
assert.strictEqual(interTiers.get("marcus-thuram").shotTier.tier, "co-primary");
assert.strictEqual(interTiers.get("marcus-thuram").sotTier.tier, "primary");
assert.strictEqual(interTiers.get("pio-esposito").shotTier.tier, "co-primary");
assert.strictEqual(interTiers.get("pio-esposito").sotTier.tier, "primary");
assert.strictEqual(interTiers.get("nicolo-barella").shotTier.tier, "secondary");
assert.strictEqual(interTiers.get("nicolo-barella").sotTier.tier, "co-primary", "Inter: il tier tiri di Barella e stato copiato sui SOT");
assert.strictEqual(interTiers.get("manuel-akanji").shotTier.tier, "secondary");
assert.strictEqual(interTiers.get("manuel-akanji").sotTier.tier, "occasional", "Inter: la partecipazione tiri di Akanji e stata trasformata in volume SOT");
assert.strictEqual(interTiers.get("alessandro-bastoni").sotTier.tier, "low-volume");
assert.strictEqual(interTiers.get("henrikh-mkhitaryan").shotTier.confidence, "medium-low", "Inter: 61 minuti di Mkhitaryan trattati come evidenza consolidata");
assert.strictEqual(interTiers.get("pio-esposito").evidence.appearances, 5, "Inter: la presenza da un minuto di Pio Esposito e stata persa");
assert.strictEqual(interTiers.get("pio-esposito").evidence.shotsPer90, 4.03, "Inter: la presenza da un minuto ha corrotto il denominatore minuti");
assert.strictEqual(inter.offense.volumeExpansionBreadth.level, "medium");
assert.strictEqual(inter.offense.volumeExpansionBreadth.status, "active");
assert.strictEqual(inter.offense.volumeExpansionBreadth.modelEffect, "allocation-shape-only-no-independent-volume-multiplier");
assert.strictEqual(inter.offense.cbSetPieceShotParticipation.status, "watch");
assert.strictEqual(inter.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");
assert.strictEqual(inter.offense.cbSetPieceShotParticipation.shots, 20);

assert.deepStrictEqual(inter.shotDefense.shotsAllowed.rawValues, [7, 10, 16, 6, 18]);
assert.strictEqual(inter.shotDefense.shotsAllowed.mean, 11.4);
assert.strictEqual(inter.shotDefense.shotsAllowed.median, 10);
assert.strictEqual(inter.shotDefense.shotsAllowed.robustCurrentMean, 11.08);
assert.strictEqual(inter.shotDefense.shotsAllowed.shrunkMean, 9.705);
assert.deepStrictEqual(inter.shotDefense.shotsOnTargetAllowed.rawValues, [3, 0, 7, 5, 4]);
assert.strictEqual(inter.shotDefense.shotsOnTargetAllowed.mean, 3.8);
assert.strictEqual(inter.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 3.48);
assert.strictEqual(inter.shotDefense.shotsOnTargetAllowed.shrunkMean, 3.085);
assert.strictEqual(inter.shotDefense.opponentShotOnTargetRate.current, 0.333);
assert.strictEqual(inter.shotDefense.opponentShotOnTargetRate.historical, 0.32);
assert.strictEqual(inter.shotDefense.generalShotSuppression.status, "active");
assert.strictEqual(inter.shotDefense.generalSotSuppression.status, "inactive");
assert.strictEqual(inter.vulnerabilities.signals.totalShotVulnerability.status, "active");
assert.strictEqual(inter.vulnerabilities.signals.sotVulnerability.status, "watch");
assert(Object.values(inter.vulnerabilities.positionalShotVulnerability).every(role => role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Inter: un ruolo WATCH ha prodotto un boost");
assert.strictEqual(inter.modelPolicy.interactionPolicy.direction, "suppression");
assert.strictEqual(inter.modelPolicy.interactionPolicy.teamShotMaxAdjustmentPct, 6);
assert.strictEqual(inter.modelPolicy.interactionPolicy.teamSotMaxAdjustmentPct, 0, "Inter: la soppressione tiri e stata copiata sui SOT non provati");
assert.strictEqual(inter.resultsVsProcessDivergence.expectedGoalsAgainstPerMatch, 1.326, "Inter: la somma xGA canonica non e 6.63");
assert.strictEqual(inter.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");

const weakInterShots = { min: 8, central: 14, max: 18 };
const weakInterSot = { min: 2, central: 5, max: 7 };
const weakVsInter = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 10, possessionPct: 43, passSuccessPct: 79, aerialWonPerGame: 9 }, attackChannels: { left: 28, central: 44, right: 28 } },
  inter,
  weakInterShots,
  weakInterSot,
  { min: 2, central: 4, max: 6 }
);
const strongInterShots = { min: 14, central: 20, max: 25 };
const strongInterSot = { min: 4, central: 7, max: 10 };
const strongVsInter = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 20, possessionPct: 62, passSuccessPct: 89, aerialWonPerGame: 16 }, attackChannels: { left: 37, central: 26, right: 37 } },
  inter,
  strongInterShots,
  strongInterSot,
  { min: 5, central: 8, max: 11 }
);
assert(weakVsInter.shotsAdjustmentPct < 0 && strongVsInter.shotsAdjustmentPct < 0, "Inter: la soppressione tiri ACTIVE non raggiunge gli avversari sintetici");
assert(strongInterShots.central > weakInterShots.central, "Inter: la soppressione ha cancellato la differenza fra attacco forte e debole");
assert.strictEqual(weakVsInter.shotsOnTargetAdjustmentPct, 0, "Inter: il canale SOT WATCH modifica l'attacco debole");
assert.strictEqual(strongVsInter.shotsOnTargetAdjustmentPct, 0, "Inter: il canale SOT WATCH modifica l'attacco forte");
assert.strictEqual(weakInterSot.central, 5);
assert.strictEqual(strongInterSot.central, 7);

const interVsRomaShots = { min: 14, central: 18.804, max: 25 };
const interVsRomaSot = { min: 4, central: 6.242, max: 9 };
const interVsRomaCorners = { min: 3, central: 6.319, max: 10 };
const interVsRoma = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 23.2, possessionPct: 63.2, passSuccessPct: 90, aerialWonPerGame: 12 }, attackChannels: inter.historicalBaseline.attackChannels },
  roma,
  interVsRomaShots,
  interVsRomaSot,
  interVsRomaCorners
);
assert(interVsRoma.shotsAdjustmentPct < 0 && interVsRoma.shotsOnTargetAdjustmentPct < 0, "Inter-Roma sintetico: la suppression Roma non riduce il forte ambiente offensivo Inter");
assert(interVsRomaShots.central > 17.5, "Inter-Roma sintetico: la suppression cancella irragionevolmente l'ambiente offensivo Inter");
assert(interVsRomaShots.central > weakInterShots.central, "Inter-Roma sintetico: attacco forte e debole vengono appiattiti dalla suppression");

const interAllocationRows = [
  { playerId: "lautaro-martinez", projectedShots: 3.8, baselineShots90: 3.8, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "marcus-thuram", projectedShots: 3.2, baselineShots90: 3.48, teamProfileRole: "CF", playerBaselineStability: { score: 0.8 } },
  { playerId: "pio-esposito", projectedShots: 2.8, baselineShots90: 3.29, teamProfileRole: "CF", playerBaselineStability: { score: 0.8 } },
  { playerId: "nicolo-barella", projectedShots: 1.4, baselineShots90: 1.24, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "federico-dimarco", projectedShots: 1.6, baselineShots90: 2.16, teamProfileRole: "FB", playerBaselineStability: { score: 0.9 } },
  { playerId: "manuel-akanji", projectedShots: 1.2, baselineShots90: 0.73, teamProfileRole: "CB", playerBaselineStability: { score: 0.8 } }
];
const interWithLautaro = teamOffensiveAllocation(interAllocationRows, "projectedShots", 12, inter);
const interWithoutLautaroRows = interAllocationRows.filter(player => player.playerId !== "lautaro-martinez");
const interWithoutLautaro = teamOffensiveAllocation(interWithoutLautaroRows, "projectedShots", 12, inter);
assert.strictEqual(Number(interWithLautaro.values.reduce((total, value) => total + value, 0).toFixed(6)), 12);
assert.strictEqual(Number(interWithoutLautaro.values.reduce((total, value) => total + value, 0).toFixed(6)), 12, "Inter: l'assenza di Lautaro ha fatto collassare il target squadra invariato");
assert(interWithoutLautaro.values.filter((value, index) => value > interWithoutLautaroRows[index].projectedShots).length >= 3, "Inter: l'assenza del primary non redistribuisce il volume su piu profili credibili");
assert(interWithoutLautaro.factors.every(factor => factor >= 0.82 && factor <= 1.18), "Inter: redistribuzione senza Lautaro oltre il clamp del profilo");

const interRomaAllocationRows = [
  { playerId: "lautaro-martinez", projectedShots: 3.9, baselineShots90: 3.8, teamProfileRole: "AM", playerBaselineStability: { score: 0.9 } },
  { playerId: "marcus-thuram", projectedShots: 3.37, baselineShots90: 3.48, teamProfileRole: "AM", playerBaselineStability: { score: 0.8 } },
  { playerId: "federico-dimarco", projectedShots: 1.81, baselineShots90: 2.16, teamProfileRole: "FB", playerBaselineStability: { score: 0.9 } },
  { playerId: "piotr-zielinski", projectedShots: 1.58, baselineShots90: 1.28, teamProfileRole: "AM", playerBaselineStability: { score: 0.6 } },
  { playerId: "nicolo-barella", projectedShots: 1.38, baselineShots90: 1.24, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "yann-bisseck", projectedShots: 1.17, baselineShots90: 1.17, teamProfileRole: "CB", playerBaselineStability: { score: 0.8 } },
  { playerId: "andy-diouf", projectedShots: 1.17, baselineShots90: 1.88, teamProfileRole: "CM", playerBaselineStability: { score: 0.6 } },
  { playerId: "curtis-jones", projectedShots: 1.12, baselineShots90: 1.07, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "manuel-akanji", projectedShots: 0.93, baselineShots90: 0.73, teamProfileRole: "CB", playerBaselineStability: { score: 0.8 } },
  { playerId: "alessandro-bastoni", projectedShots: 0.67, baselineShots90: 0.68, teamProfileRole: "CB", playerBaselineStability: { score: 0.9 } }
];
const interAfterRomaAllocation = teamOffensiveAllocation(interRomaAllocationRows, "projectedShots", interVsRomaShots.central, inter);
assert(Math.abs(interAfterRomaAllocation.values.reduce((total, value) => total + value, 0) - interVsRomaShots.central) < 0.001, "Inter-Roma sintetico: post-allocation non riconcilia il target soppresso");
assert(interAfterRomaAllocation.factors.every(factor => factor >= 0.82 && factor <= 1.18), "Inter-Roma sintetico: allocation oltre clamp");

assert.strictEqual(juventus.sampleSize, 5);
assert.strictEqual(juventus.tacticalContext.current.coach, "Luciano Spalletti");
assert.strictEqual(juventus.tacticalContext.historicalPrior.formation, "3421");
assert.deepStrictEqual(juventus.offense.teamShotVolume.rawValues, [20, 21, 14, 19, 14]);
assert.strictEqual(juventus.offense.teamShotVolume.current.mean, 17.6);
assert.strictEqual(juventus.offense.teamShotVolume.current.median, 19);
assert.strictEqual(juventus.offense.teamShotVolume.robustCurrentPerGame, 17.44);
assert.strictEqual(juventus.offense.teamShotVolume.shrunkPerGame, 17);
assert.strictEqual(juventus.offense.teamShotVolume.signalPersistence.level, "medium");
assert.strictEqual(juventus.offense.teamShotVolume.matchesAtOrAbove20, 2);
assert.deepStrictEqual(juventus.offense.teamSotVolume.rawValues, [5, 6, 5, 8, 5]);
assert.strictEqual(juventus.offense.teamSotVolume.current.mean, 5.8);
assert.strictEqual(juventus.offense.teamSotVolume.shrunkPerGame, 5.829);
assert.strictEqual(juventus.offense.teamSotVolume.signalPersistence.level, "low", "Juventus: il floor SOT non deve diventare persistenza elevata contro uno storico gia alto");
assert.strictEqual(juventus.offense.offensiveShotQuality.xg, 7.84);
assert.strictEqual(juventus.offense.offensiveShotQuality.xgPerShot, 0.0891);
assert.strictEqual(juventus.offense.offensiveShotQuality.level, "low", "Juventus: il volume non deve trasformare una qualita per tiro sotto media in good");
assert.strictEqual(juventus.offense.primaryShooterConcentration.playerId, "francisco-conceicao");
assert.strictEqual(juventus.offense.primaryShooterConcentration.topShooterShare, 0.1364);
assert.strictEqual(juventus.offense.primaryShooterConcentration.topTwoShooterShare, 0.2614);
assert.strictEqual(juventus.offense.primaryShooterConcentration.concentrationIndex, 0.0873);
assert.strictEqual(juventus.offense.primaryShooterConcentration.level, "low");
assert.strictEqual(juventus.offense.secondaryShooterBreadth.level, "high");
assert.strictEqual(juventus.offense.secondaryShooterBreadth.secondaryShooters, 19);
const juventusTiers = new Map(juventus.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(juventusTiers.get("francisco-conceicao").shotTier.tier, "primary");
assert.strictEqual(juventusTiers.get("francisco-conceicao").sotTier.tier, "co-primary", "Juventus: Conceicao tiri e SOT sono stati confusi");
assert.strictEqual(juventusTiers.get("douglas-luiz").shotTier.tier, "co-primary");
assert.strictEqual(juventusTiers.get("douglas-luiz").sotTier.tier, "secondary");
assert.strictEqual(juventusTiers.get("teun-koopmeiners").shotTier.tier, "secondary");
assert.strictEqual(juventusTiers.get("teun-koopmeiners").sotTier.tier, "occasional");
assert.strictEqual(juventusTiers.get("bremer").shotTier.tier, "secondary");
assert.strictEqual(juventusTiers.get("bremer").sotTier.tier, "secondary");
assert.strictEqual(juventusTiers.get("federico-gatti").shotTier.confidence, "medium-low", "Juventus: tre minuti e un tiro di Gatti trattati come evidenza consolidata");
assert.strictEqual(juventusTiers.get("jonathan-david").evidence.historicalShots90, null, "Juventus: baseline storica mancante inventata per Jonathan David");
assert.strictEqual(juventus.offense.shotsForRoleDistribution.mappedShots, 86);
assert.strictEqual(juventus.offense.shotsForRoleDistribution.shotsByRole.CF, 19);
assert.strictEqual(juventus.offense.shotsForRoleDistribution.shotsByRole.W, 19);
assert.strictEqual(juventus.offense.shotsForRoleDistribution.shotsByRole.AM, 15);
assert.strictEqual(juventus.offense.teamSetPieceOpportunityVolume.currentCorners.mean, 8.6);
assert.strictEqual(juventus.offense.teamSetPieceOpportunityVolume.shrunkCornersPerGame, 6.299);

assert.deepStrictEqual(juventus.shotDefense.shotsAllowed.rawValues, [11, 4, 3, 10, 11]);
assert.strictEqual(juventus.shotDefense.shotsAllowed.mean, 7.8);
assert.strictEqual(juventus.shotDefense.shotsAllowed.shrunkMean, 9.502);
assert.strictEqual(juventus.shotDefense.shotsAllowed.signalPersistence.level, "low");
assert.deepStrictEqual(juventus.shotDefense.shotsOnTargetAllowed.rawValues, [2, 3, 1, 6, 2]);
assert.strictEqual(juventus.shotDefense.shotsOnTargetAllowed.mean, 2.8);
assert.strictEqual(juventus.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 2.32, "Juventus: il picco di 6 SOT concessi non e stato attenuato");
assert.strictEqual(juventus.shotDefense.shotsOnTargetAllowed.shrunkMean, 2.67);
assert.strictEqual(juventus.shotDefense.shotsOnTargetAllowed.signalPersistence.level, "low");
assert.strictEqual(juventus.shotDefense.opponentShotOnTargetRate.current, 0.359);
assert.strictEqual(juventus.shotDefense.opponentShotOnTargetRate.shrunk, 0.3);
assert.strictEqual(juventus.shotDefense.shotQualityProfile.against.xgPerShot, 0.0615);
assert.strictEqual(juventus.vulnerabilities.signals.totalShotVulnerability.status, "active");
assert.strictEqual(juventus.vulnerabilities.signals.totalShotVulnerability.level, "strongly-suppressed");
assert.strictEqual(juventus.vulnerabilities.signals.sotVulnerability.status, "active");
assert.strictEqual(juventus.vulnerabilities.signals.sotVulnerability.level, "suppressed-with-current-volatility");
assert.strictEqual(juventus.vulnerabilities.signals.centralForwardShotAccess.status, "watch");
assert.strictEqual(juventus.vulnerabilities.signals.centralForwardShotAccess.level, "suppressed-candidate");
assert.strictEqual(juventus.vulnerabilities.signals.wingerAttackingMidfielderShotAccess.level, "less-suppressed-not-elevated");
assert(Object.values(juventus.vulnerabilities.positionalShotVulnerability).every(role => role.status === "watch" && role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Juventus: LESS SUPPRESSED ha prodotto un boost implicito");
assert.strictEqual(juventus.modelPolicy.interactionPolicy.direction, "suppression");
assert.strictEqual(juventus.modelPolicy.interactionPolicy.teamShotMaxAdjustmentPct, 8);
assert.strictEqual(juventus.modelPolicy.interactionPolicy.teamSotMaxAdjustmentPct, 6);
assert.strictEqual(juventus.dataQuality.playerRoleCoverage.explicitShare, 0.7386);
assert(juventus.dataQuality.missingHistoricalPlayerBaselines.includes("jonathan-david"));

const normalJuventusAttack = { summary: { shotsPerGame: 14, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 33, central: 34, right: 33 } };
const normalVsJuventusShots = { min: 9, central: 14, max: 19 };
const normalVsJuventusSot = { min: 2, central: 5, max: 8 };
const normalVsJuventus = applyOpponentTeamVolumeInteraction(normalJuventusAttack, juventus, normalVsJuventusShots, normalVsJuventusSot, { min: 2, central: 5, max: 8 });
assert(normalVsJuventus.shotsAdjustmentPct < 0 && normalVsJuventus.shotsOnTargetAdjustmentPct < 0, "Juventus: la soppressione generale non raggiunge un attacco normale");
assert(Math.abs(normalVsJuventus.shotsAdjustmentPct) <= 8 && Math.abs(normalVsJuventus.shotsOnTargetAdjustmentPct) <= 6, "Juventus: soppressione oltre i cap dichiarati");

const cfHeavyShots = { min: 9, central: 14, max: 19 };
const cfHeavySot = { min: 2, central: 5, max: 8 };
const cfHeavy = applyOpponentTeamVolumeInteraction({ ...normalJuventusAttack, attackChannels: { left: 15, central: 70, right: 15 } }, juventus, cfHeavyShots, cfHeavySot, { min: 2, central: 5, max: 8 });
const wamHeavyShots = { min: 9, central: 14, max: 19 };
const wamHeavySot = { min: 2, central: 5, max: 8 };
const wamHeavy = applyOpponentTeamVolumeInteraction({ ...normalJuventusAttack, attackChannels: { left: 42.5, central: 15, right: 42.5 } }, juventus, wamHeavyShots, wamHeavySot, { min: 2, central: 5, max: 8 });
assert.strictEqual(cfHeavy.shotsAdjustmentPct, wamHeavy.shotsAdjustmentPct, "Juventus: il ruolo relativo ha alterato indebitamente la soppressione team");
assert.strictEqual(cfHeavy.shotsOnTargetAdjustmentPct, wamHeavy.shotsOnTargetAdjustmentPct, "Juventus: il ruolo relativo ha alterato indebitamente la soppressione SOT team");
const cfRole = teamProfilePlayerModifier({ role: "Attaccante", detailedRole: "Punta centrale" }, 3, 1, juventus, { general: 0.8, territorial: 0.8, wide: 0.3, setPiece: 0.4 });
const wingerRole = teamProfilePlayerModifier({ role: "Attaccante", detailedRole: "Ala destra" }, 3, 1, juventus, { general: 0.8, territorial: 0.8, wide: 0.8, setPiece: 0.4 });
const amRole = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "Trequartista" }, 3, 1, juventus, { general: 0.8, territorial: 0.8, wide: 0.6, setPiece: 0.4 });
for (const roleResult of [cfRole, wingerRole, amRole]) {
  assert.strictEqual(roleResult.shotFactor, 1, "Juventus: un segnale WATCH ha modificato i tiri del ruolo");
  assert.strictEqual(roleResult.sotFactor, 1, "Juventus: un segnale WATCH ha modificato i SOT del ruolo");
}

const juventusAllocationRows = [
  { playerId: "francisco-conceicao", projectedShots: 3.1, baselineShots90: 3.13, teamProfileRole: "W", playerBaselineStability: { score: 0.8 } },
  { playerId: "douglas-luiz", projectedShots: 2.3, baselineShots90: 1.07, teamProfileRole: "CM", playerBaselineStability: { score: 0.7 } },
  { playerId: "randal-kolo-muani", projectedShots: 2.4, baselineShots90: 1.08, teamProfileRole: "CF", playerBaselineStability: { score: 0.7 } },
  { playerId: "kerim-alajbegovic", projectedShots: 2.1, baselineShots90: 4.14, teamProfileRole: "AM", playerBaselineStability: { score: 0.5 } },
  { playerId: "teun-koopmeiners", projectedShots: 1.5, baselineShots90: 1.39, teamProfileRole: "CM", playerBaselineStability: { score: 0.6 } },
  { playerId: "bremer", projectedShots: 0.8, baselineShots90: 0.95, teamProfileRole: "CB", playerBaselineStability: { score: 0.8 } }
];
const juventusAllocation = teamOffensiveAllocation(juventusAllocationRows, "projectedShots", 14.5, juventus);
assert(Math.abs(juventusAllocation.values.reduce((total, value) => total + value, 0) - 14.5) < 0.001, "Juventus: allocation non riconcilia il target squadra");
assert(juventusAllocation.factors.every(factor => factor >= 0.82 && factor <= 1.18), "Juventus: allocation oltre clamp");
assert(Math.max(...juventusAllocation.values) < 4, "Juventus: l'espansione distribuita ha creato un primary enorme");

assert.strictEqual(lazio.sampleSize, 5);
assert.strictEqual(lazio.tacticalContext.current.coach, "Gennaro Gattuso");
assert.strictEqual(lazio.tacticalContext.current.preferredFormation, "4-3-3");
assert.strictEqual(lazio.tacticalContext.historicalPrior.formation, "433");
assert.strictEqual(lazio.currentSeason.possessionPct, 46.4);
assert.strictEqual(lazio.currentSeason.shotsForPerGame, 12.8);
assert.strictEqual(lazio.currentSeason.shotsOnTargetForPerGame, 3.8);
assert.strictEqual(lazio.currentSeason.cornersForPerGame, 4.4);
assert.deepStrictEqual(lazio.offense.teamShotVolume.rawValues, [10, 15, 19, 8, 12]);
assert.strictEqual(lazio.offense.teamShotVolume.current.median, 12);
assert.strictEqual(lazio.offense.teamShotVolume.robustCurrentPerGame, 12.16);
assert.strictEqual(lazio.offense.teamShotVolume.shrunkPerGame, 11.323);
assert.strictEqual(lazio.offense.teamShotVolume.signalPersistence.level, "medium");
assert.deepStrictEqual(lazio.offense.teamSotVolume.rawValues, [3, 2, 6, 6, 2]);
assert.strictEqual(lazio.offense.teamSotVolume.current.standardDeviation, 1.833);
assert.strictEqual(lazio.offense.teamSotVolume.shrunkPerGame, 3.997);
assert.strictEqual(lazio.offense.teamSotVolume.signalPersistence.level, "low");
assert.strictEqual(lazio.offense.shotAccuracyVolatility.level, "high");
assert.strictEqual(lazio.offense.shotAccuracyVolatility.coefficientOfVariation, 0.6607);
assert.strictEqual(lazio.offense.offensiveShotQuality.xg, 7.98);
assert.strictEqual(lazio.offense.offensiveShotQuality.xgPerShot, 0.1247);
assert.strictEqual(lazio.offense.offensiveShotQuality.level, "high");
assert(lazio.offense.offensiveShotQuality.leagueRelative > 0.22 && lazio.offense.offensiveShotQuality.leagueRelative < 0.23);
assert.strictEqual(lazio.offense.offensiveShotQuality.modelEffect, "quality-context-only-separate-from-shot-and-sot-volume");
assert.strictEqual(lazio.offense.possessionIndependentShotCreation.status, "watch");
assert(lazio.offense.possessionIndependentShotCreation.leagueRelative < 0, "Lazio: Lazio-Milan ha creato un falso boost universale di possesso indipendente");
assert.strictEqual(lazio.offense.teamSetPieceOpportunityVolume.currentCorners.mean, 4.4);
assert.strictEqual(lazio.offense.teamSetPieceOpportunityVolume.currentCorners.median, 4);
assert.strictEqual(lazio.offense.teamSetPieceOpportunityVolume.shrunkCornersPerGame, 3.894);

assert.strictEqual(lazio.offense.primaryShooterConcentration.playerId, "mattia-zaccagni");
assert.strictEqual(lazio.offense.primaryShooterConcentration.topShooterShare, 0.25);
assert.strictEqual(lazio.offense.primaryShooterConcentration.topTwoShooterShare, 0.375);
assert.strictEqual(lazio.offense.primaryShooterConcentration.concentrationIndex, 0.1221);
assert.strictEqual(lazio.offense.shooterStructure.type, "one-primary");
assert.deepStrictEqual(lazio.offense.shooterStructure.primaryPlayerIds, ["mattia-zaccagni"]);
assert.strictEqual(lazio.offense.secondaryShooterBreadth.secondaryShooterShare, 0.75);
assert.strictEqual(lazio.offense.secondaryShooterBreadth.secondaryShooters, 15);
const lazioTiers = new Map(lazio.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(lazioTiers.get("mattia-zaccagni").shotTier.tier, "primary");
assert.strictEqual(lazioTiers.get("mattia-zaccagni").sotTier.tier, "primary");
assert.strictEqual(lazioTiers.get("mattia-zaccagni").evidence.shotsPer90, 3.24);
assert.strictEqual(lazioTiers.get("mattia-zaccagni").evidence.historicalShots90, 1.42);
assert.strictEqual(lazioTiers.get("davide-frattesi").shotTier.tier, "co-primary");
assert.strictEqual(lazioTiers.get("matteo-cancellieri").shotTier.tier, "co-primary");
assert.strictEqual(lazioTiers.get("matteo-cancellieri").sotTier.tier, "co-primary");
assert.strictEqual(lazioTiers.get("tijjani-noslin").shotTier.confidence, "medium-low", "Lazio: il campione ridotto di Noslin e stato trattato come consolidato");
assert.strictEqual(lazioTiers.get("nuno-tavares").shotTier.tier, "secondary");
assert.strictEqual(lazioTiers.get("nuno-tavares").sotTier.tier, "occasional");
assert.strictEqual(lazioTiers.get("kenneth-taylor").shotTier.tier, "secondary");
assert.strictEqual(lazioTiers.get("kenneth-taylor").sotTier.tier, "low-volume", "Lazio: 5 tiri e 0 SOT di Taylor sono stati confusi");
assert.strictEqual(lazioTiers.get("danilho-doekhi").shotTier.tier, "secondary");
assert.strictEqual(lazioTiers.get("danilho-doekhi").sotTier.tier, "low-volume");
assert.strictEqual(lazio.offense.cbSetPieceShotParticipation.status, "watch");
assert.strictEqual(lazio.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");
assert.strictEqual(lazio.offense.cbSetPieceShotParticipation.shots, 1, "Lazio: Doekhi con ruolo Difensore generico e stato assunto automaticamente come CB piazzato");

const lazioRows = matches.filter(match => ["bologna-lazio-2026-27-md-01", "lazio-genoa-2026-27-md-02", "udinese-lazio-2026-27-md-03", "lazio-milan-2026-27-md-04", "venezia-lazio-2026-27-md-05"].includes(match.id));
const lazioPlayerRows = playerId => lazioRows.map(match => {
  const side = match.homeTeam === "lazio" ? "home" : "away";
  return match.playerStats[side].find(player => player.playerId === playerId) || { shots: 0, shotsOnTarget: 0, expectedGoals: 0, minutes: 0 };
});
assert.deepStrictEqual(lazioPlayerRows("mattia-zaccagni").map(row => row.shots), [3, 3, 4, 3, 3]);
assert.deepStrictEqual(lazioPlayerRows("mattia-zaccagni").map(row => row.shotsOnTarget), [1, 0, 2, 3, 1]);
assert.deepStrictEqual(lazioPlayerRows("matteo-cancellieri").map(row => row.shots), [2, 1, 2, 1, 1]);
assert.deepStrictEqual(lazioPlayerRows("nuno-tavares").map(row => row.shots), [0, 5, 2, 0, 0]);
assert.deepStrictEqual(lazioPlayerRows("kenneth-taylor").map(row => row.shotsOnTarget), [0, 0, 0, 0, 0]);
const frattesiVenezia = lazioPlayerRows("davide-frattesi")[4];
assert.strictEqual(frattesiVenezia.shots, 0);
assert.strictEqual(frattesiVenezia.expectedGoals, 0.17, "Lazio: la discrepanza canonica 0 tiri/0.17 xG di Frattesi e stata corretta arbitrariamente");

assert.deepStrictEqual(lazio.shotDefense.shotsAllowed.rawValues, [14, 8, 10, 16, 17]);
assert.strictEqual(lazio.shotDefense.shotsAllowed.mean, 13);
assert.strictEqual(lazio.shotDefense.shotsAllowed.robustCurrentMean, 12.84);
assert.strictEqual(lazio.shotDefense.shotsAllowed.shrunkMean, 13.176);
assert.strictEqual(lazio.shotDefense.shotsAllowed.historicalMean, 13.316);
assert.deepStrictEqual(lazio.shotDefense.shotsOnTargetAllowed.rawValues, [5, 1, 6, 7, 6]);
assert.strictEqual(lazio.shotDefense.shotsOnTargetAllowed.mean, 5);
assert.strictEqual(lazio.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 4.84);
assert.strictEqual(lazio.shotDefense.shotsOnTargetAllowed.shrunkMean, 4.396);
assert.strictEqual(lazio.shotDefense.opponentShotOnTargetRate.shrunk, 0.336);
assert.strictEqual(lazio.shotDefense.shotQualityProfile.against.xg, 6.21);
assert.strictEqual(lazio.shotDefense.shotQualityProfile.against.xgPerShot, 0.0955);
assert.strictEqual(lazio.resultsVsProcessDivergence.observedGoalsAgainstPerMatch, 0.6);
assert.strictEqual(lazio.resultsVsProcessDivergence.expectedGoalsAgainstPerMatch, 1.242);
assert.strictEqual(lazio.resultsVsProcessDivergence.resultProcessGap, 0.642);
assert.strictEqual(lazio.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");
assert.strictEqual(lazio.vulnerabilities.signals.totalShotVulnerability.level, "normal");
assert.strictEqual(lazio.vulnerabilities.signals.sotVulnerability.status, "watch");
assert(Object.values(lazio.vulnerabilities.positionalShotVulnerability).every(role => role.status === "watch" && role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Lazio: un accesso di ruolo WATCH ha prodotto un modifier");
assert.strictEqual(lazio.shotDefense.opponentShotRoleDistribution.shotsByRole.CF, 8);
assert.strictEqual(lazio.shotDefense.opponentShotRoleDistribution.shotsByRole.W, 10);
assert.strictEqual(lazio.shotDefense.opponentShotRoleDistribution.shotsByRole.AM, 23);
assert.strictEqual(lazio.shotDefense.opponentShotRoleDistribution.shotsByRole.FB, 6);
assert.strictEqual(lazio.shotDefense.opponentShotRoleDistribution.shotsByRole.CB, 11);

const neutralVsLazioShots = { min: 9, central: 13, max: 18 };
const neutralVsLazioSot = { min: 2, central: 4.5, max: 7 };
const neutralVsLazio = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 13, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 33, central: 34, right: 33 } },
  lazio,
  neutralVsLazioShots,
  neutralVsLazioSot,
  { min: 2, central: 4, max: 7 }
);
assert.strictEqual(neutralVsLazio.shotsAdjustmentPct, 0, "Lazio: ambiente tiri neutro trasformato in vulnerability");
assert.strictEqual(neutralVsLazio.shotsOnTargetAdjustmentPct, 0, "Lazio: SOT WATCH ha modificato il volume avversario");

const cfHeavyVsLazioShots = { min: 9, central: 13, max: 18 };
const cfHeavyVsLazioSot = { min: 2, central: 4.5, max: 7 };
const cfHeavyVsLazio = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 13, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 15, central: 70, right: 15 } },
  lazio,
  cfHeavyVsLazioShots,
  cfHeavyVsLazioSot,
  { min: 2, central: 4, max: 7 }
);
const wideHeavyVsLazioShots = { min: 9, central: 13, max: 18 };
const wideHeavyVsLazioSot = { min: 2, central: 4.5, max: 7 };
const wideHeavyVsLazio = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 13, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 45, central: 10, right: 45 } },
  lazio,
  wideHeavyVsLazioShots,
  wideHeavyVsLazioSot,
  { min: 2, central: 4, max: 7 }
);
assert.strictEqual(cfHeavyVsLazio.shotsAdjustmentPct, 0, "Lazio: CF artificialmente soppresso");
assert.strictEqual(wideHeavyVsLazio.shotsAdjustmentPct, 0, "Lazio: wide WATCH trasformato in boost");
for (const candidate of [
  { role: "Attaccante", detailedRole: "Centravanti" },
  { role: "Attaccante", detailedRole: "Ala destra" },
  { role: "Difensore", detailedRole: "Terzino sinistro" },
  { role: "Difensore", detailedRole: "Difensore centrale" }
]) {
  const modifier = teamProfilePlayerModifier(candidate, 2, 0.6, lazio, { general: 0.8, territorial: 0.8, wide: 0.8, setPiece: 0.8 });
  assert.strictEqual(modifier.shotFactor, 1, "Lazio: role WATCH ha modificato il giocatore");
  assert.strictEqual(modifier.sotFactor, 1, "Lazio: role WATCH ha modificato i SOT del giocatore");
}

const lazioAllocationRows = [
  { playerId: "mattia-zaccagni", projectedShots: 2.4, baselineShots90: 1.42, teamProfileRole: "W", playerBaselineStability: { score: 0.5 } },
  { playerId: "davide-frattesi", projectedShots: 1.7, baselineShots90: 2.61, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "matteo-cancellieri", projectedShots: 1.8, baselineShots90: 2.13, teamProfileRole: "W", playerBaselineStability: { score: 1 } },
  { playerId: "tijjani-noslin", projectedShots: 1.7, baselineShots90: 2.75, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "kenneth-taylor", projectedShots: 1.1, baselineShots90: 1.03, teamProfileRole: "CM", playerBaselineStability: { score: 1 } },
  { playerId: "danilho-doekhi", projectedShots: 0.8, baselineShots90: 1.35, teamProfileRole: "CB", playerBaselineStability: { score: 0.7 } }
];
const lazioWithZaccagni = teamOffensiveAllocation(lazioAllocationRows, "projectedShots", 11.3, lazio);
const lazioWithoutZaccagniRows = lazioAllocationRows.filter(player => player.playerId !== "mattia-zaccagni");
const lazioWithoutZaccagni = teamOffensiveAllocation(lazioWithoutZaccagniRows, "projectedShots", 11.3, lazio);
assert(Math.abs(lazioWithZaccagni.values.reduce((total, value) => total + value, 0) - 11.3) < 0.001);
assert(Math.abs(lazioWithoutZaccagni.values.reduce((total, value) => total + value, 0) - 11.3) < 0.001, "Lazio: assenza Zaccagni ha fatto collassare il team total");
assert(lazioWithZaccagni.values[0] / 11.3 < 0.3, "Lazio: Zaccagni assorbe artificialmente troppo volume");
assert(lazioWithoutZaccagni.values.filter((value, index) => value > lazioWithoutZaccagniRows[index].projectedShots).length >= 3, "Lazio: volume senza Zaccagni non redistribuito su piu profili");
assert(lazioWithZaccagni.factors.every(factor => factor >= 0.82 && factor <= 1.18));
assert(lazioWithoutZaccagni.factors.every(factor => factor >= 0.82 && factor <= 1.18));

const lazioSuppressedShots = { min: 8, central: 11.3, max: 15 };
const lazioSuppressedSot = { min: 2, central: 4, max: 6 };
const lazioVsJuventusSuppression = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 12.8, possessionPct: 46.4, passSuccessPct: 85.4, aerialWonPerGame: 11.5 }, attackChannels: lazio.historicalBaseline.attackChannels },
  juventus,
  lazioSuppressedShots,
  lazioSuppressedSot,
  { min: 2, central: 3.9, max: 7 }
);
assert(lazioVsJuventusSuppression.shotsAdjustmentPct < 0 && lazioVsJuventusSuppression.shotsOnTargetAdjustmentPct < 0, "Lazio: strong suppression non riduce il team environment");
const lazioAfterSuppression = teamOffensiveAllocation(lazioAllocationRows, "projectedShots", lazioSuppressedShots.central, lazio);
assert(Math.abs(lazioAfterSuppression.values.reduce((total, value) => total + value, 0) - lazioSuppressedShots.central) < 0.001, "Lazio: allocation non riconcilia il target soppresso");
assert(lazioAfterSuppression.values[0] < lazioWithZaccagni.values[0], "Lazio: il primary non scende insieme al team environment");

assert.strictEqual(lecce.sampleSize, 5);
assert.strictEqual(lecce.tacticalContext.current.coach, "Eusebio Di Francesco");
assert.deepStrictEqual(lecce.currentSeason, {
  matches: 5,
  record: { wins: 2, draws: 0, losses: 3, points: 6, goalsFor: 5, goalsAgainst: 10, cleanSheets: 1, failedToScore: 3 },
  shotsForPerGame: 8.4,
  shotsOnTargetForPerGame: 3.4,
  shotOnTargetRate: 0.405,
  cornersForPerGame: 3.4,
  possessionPct: 38.6,
  passAccuracyPct: 77.8
});
assert.deepStrictEqual(lecce.offense.teamShotVolume.rawValues, [12, 7, 10, 7, 6]);
assert.strictEqual(lecce.offense.teamShotVolume.current.median, 7);
assert.strictEqual(lecce.offense.teamShotVolume.robustCurrentPerGame, 8.08);
assert.strictEqual(lecce.offense.teamShotVolume.shrunkPerGame, 9.305);
assert.strictEqual(lecce.offense.teamShotVolume.signalPersistence.level, "low");
assert.deepStrictEqual(lecce.offense.teamSotVolume.rawValues, [5, 3, 3, 3, 3]);
assert.strictEqual(lecce.offense.teamSotVolume.robustCurrentPerGame, 3.08);
assert.strictEqual(lecce.offense.teamSotVolume.shrunkPerGame, 2.708);
assert.strictEqual(lecce.offense.teamSotVolume.signalPersistence.level, "medium");
assert.strictEqual(lecce.offense.offensiveShotQuality.xg, 5.24);
assert.strictEqual(lecce.offense.offensiveShotQuality.xgPerShot, 0.1248);
assert.strictEqual(lecce.offense.offensiveShotQuality.modelEffect, "quality-context-only-separate-from-shot-and-sot-volume");
assert.strictEqual(lecce.offense.primaryShooterConcentration.topShooterShare, 0.1429);
assert.strictEqual(lecce.offense.primaryShooterConcentration.topTwoShooterShare, 0.2619);
assert.strictEqual(lecce.offense.primaryShooterConcentration.concentrationIndex, 0.0816);
assert.strictEqual(lecce.offense.primaryShooterConcentration.level, "low");
assert.strictEqual(lecce.offense.shooterStructure.type, "distributed");
assert.strictEqual(lecce.offense.shooterStructure.primaryCount, 0, "Lecce: il motore ha forzato un primary");
assert.strictEqual(lecce.offense.secondaryShooterBreadth.secondaryShooters, 15);
assert.strictEqual(lecce.offense.secondaryShooterBreadth.level, "high");
const lecceTiers = new Map(lecce.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(lecceTiers.get("nikola-stulic").shotTier.tier, "co-primary");
assert.strictEqual(lecceTiers.get("nikola-stulic").sotTier.tier, "secondary");
assert.strictEqual(lecceTiers.get("oumar-ngom").shotTier.tier, "secondary");
assert.strictEqual(lecceTiers.get("oumar-ngom").sotTier.tier, "occasional", "Lecce: Ngom tiri e SOT sono stati confusi");
assert.strictEqual(lecceTiers.get("konan-n-dri").sotTier.tier, "low-volume");
assert.strictEqual(lecceTiers.get("ivan-ilic").sotTier.tier, "low-volume");
assert.strictEqual(lecceTiers.get("joel-monteiro").sotTier.tier, "low-volume");
assert.strictEqual(lecce.offense.cbSetPieceShotParticipation.status, "watch");
assert.strictEqual(lecce.offense.cbSetPieceShotParticipation.modelEffect, "none");
assert.strictEqual(lecce.offense.cbSetPieceShotParticipation.setPieceOriginCoverage, "unavailable");

const lecceRows = matches.filter(match => ["venezia-lecce-2026-27-md-01", "lecce-roma-2026-27-md-02", "cagliari-lecce-2026-27-md-03", "lecce-monza-2026-27-md-04", "milan-lecce-2026-27-md-05"].includes(match.id));
const leccePlayerRows = playerId => lecceRows.map(match => {
  const side = match.homeTeam === "lecce" ? "home" : "away";
  return match.playerStats[side].find(player => player.playerId === playerId) || { shots: 0, shotsOnTarget: 0, expectedGoals: 0, minutes: 0 };
});
assert.deepStrictEqual(leccePlayerRows("lassana-coulibaly").map(row => row.shots), [1, 0, 1, 3, 1]);
assert.strictEqual(leccePlayerRows("lassana-coulibaly")[3].expectedGoals, 0.78, "Lecce: concentrazione xG di Coulibaly non preservata");
assert.deepStrictEqual(leccePlayerRows("nikola-stulic").map(row => row.shots), [3, 0, 2, 0, 0]);
assert.strictEqual(leccePlayerRows("nikola-stulic")[0].minutes, 17);
assert.strictEqual(leccePlayerRows("nikola-stulic")[0].expectedGoals, 0.97, "Lecce: outlier small-minute di Stulic non preservato");
assert.deepStrictEqual(leccePlayerRows("santiago-pierotti").map(row => row.shots), [2, 1, 0, 0, 0]);
assert.deepStrictEqual(leccePlayerRows("oumar-ngom").map(row => row.shotsOnTarget), [0, 0, 0, 0, 1]);
assert.strictEqual(lecceTiers.get("amar-fatah").evidence.appearances, 4);
assert.strictEqual(lecceTiers.get("amar-fatah").evidence.shotsPer90, 2.65);

assert.deepStrictEqual(lecce.shotDefense.shotsAllowed.rawValues, [19, 15, 20, 19, 10]);
assert.strictEqual(lecce.shotDefense.shotsAllowed.mean, 16.6);
assert.strictEqual(lecce.shotDefense.shotsAllowed.median, 19);
assert.strictEqual(lecce.shotDefense.shotsAllowed.robustCurrentMean, 16.44);
assert.strictEqual(lecce.shotDefense.shotsAllowed.shrunkMean, 13.826);
assert.strictEqual(lecce.shotDefense.shotsAllowed.signalPersistence.level, "high");
assert.deepStrictEqual(lecce.shotDefense.shotsOnTargetAllowed.rawValues, [7, 8, 9, 11, 4]);
assert.strictEqual(lecce.shotDefense.shotsOnTargetAllowed.mean, 7.8);
assert.strictEqual(lecce.shotDefense.shotsOnTargetAllowed.robustCurrentMean, 7.48);
assert.strictEqual(lecce.shotDefense.shotsOnTargetAllowed.shrunkMean, 5.209);
assert.strictEqual(lecce.shotDefense.shotsOnTargetAllowed.signalPersistence.level, "high");
assert.strictEqual(lecce.shotDefense.defensiveMetricSignals.shotsAllowed.level, "high");
assert.strictEqual(lecce.shotDefense.defensiveMetricSignals.shotsOnTargetAllowed.level, "medium");
assert.strictEqual(lecce.shotDefense.shotQualityProfile.against.xg, 11.82);
assert.strictEqual(lecce.shotDefense.shotQualityProfile.against.xgPerShot, 0.1424);
assert.strictEqual(lecce.resultsVsProcessDivergence.observedGoalsAgainstPerMatch, 2);
assert.strictEqual(lecce.resultsVsProcessDivergence.expectedGoalsAgainstPerMatch, 2.364);
assert.strictEqual(lecce.resultsVsProcessDivergence.modelStatus, "regression-warning-only-no-automatic-goal-compensation");
assert.strictEqual(lecce.vulnerabilities.signals.totalShotVulnerability.status, "active");
assert.strictEqual(lecce.vulnerabilities.signals.sotVulnerability.status, "active");
assert(Object.values(lecce.vulnerabilities.positionalShotVulnerability).every(role => role.status === "watch" && role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Lecce: un accesso di ruolo WATCH ha prodotto un modifier residuo");
assert.strictEqual(lecce.shotDefense.opponentShotRoleDistribution.mappedShots, 82);
assert.strictEqual(lecce.shotDefense.opponentShotRoleDistribution.unmappedShots, 1);
assert.strictEqual(lecce.dataQuality.shotLocation, "unavailable");
assert.strictEqual(lecce.dataQuality.setPieceOriginCoverage, "unavailable");

// A - Lecce contro avversario neutro: team target prima dell'allocation e nessun primary inventato.
const lecceAllocationRows = [
  { playerId: "lassana-coulibaly", projectedShots: 1.2, projectedShotsOnTarget: 0.55, baselineShots90: 0.93, baselineShotsOnTarget90: 0.27, teamProfileRole: "CM", playerBaselineStability: { score: 0.9 } },
  { playerId: "nikola-stulic", projectedShots: 1.4, projectedShotsOnTarget: 0.5, baselineShots90: 1.73, baselineShotsOnTarget90: 0.47, teamProfileRole: "CF", playerBaselineStability: { score: 0.5 } },
  { playerId: "youssef-maleh", projectedShots: 1.1, projectedShotsOnTarget: 0.3, baselineShots90: 1.26, baselineShotsOnTarget90: 0.23, teamProfileRole: "CM", playerBaselineStability: { score: 0.7 } },
  { playerId: "oumar-ngom", projectedShots: 1, projectedShotsOnTarget: 0.2, baselineShots90: 0.54, baselineShotsOnTarget90: 0.21, teamProfileRole: "AM", playerBaselineStability: { score: 0.4 } },
  { playerId: "santiago-pierotti", projectedShots: 0.8, projectedShotsOnTarget: 0.35, baselineShots90: 1.14, baselineShotsOnTarget90: 0.28, teamProfileRole: "AM", playerBaselineStability: { score: 0.6 } },
  { playerId: "amar-fatah", projectedShots: 0.55, projectedShotsOnTarget: 0.18, baselineShots90: 2.42, baselineShotsOnTarget90: 1.16, teamProfileRole: "W", playerBaselineStability: { score: 0.2 } },
  { playerId: "kialonda-gaspar", projectedShots: 0.45, projectedShotsOnTarget: 0.1, baselineShots90: 0.44, baselineShotsOnTarget90: 0.05, teamProfileRole: "CB", playerBaselineStability: { score: 0.8 } }
];
const lecceNeutralAllocation = teamOffensiveAllocation(lecceAllocationRows, "projectedShots", 9.305, lecce);
assert(Math.abs(lecceNeutralAllocation.values.reduce((total, value) => total + value, 0) - 9.305) < 0.001);
assert(Math.max(...lecceNeutralAllocation.values) / 9.305 < 0.25, "Lecce A: allocation low-volume ha inventato un primary");
assert(lecceNeutralAllocation.factors.every(factor => factor >= 0.82 && factor <= 1.18));

// B - Cambi di XI: lo stesso target squadra viene redistribuito usando baseline e stabilita.
const lecceChangedLineupRows = lecceAllocationRows.filter(player => !["nikola-stulic", "santiago-pierotti"].includes(player.playerId)).concat([
  { playerId: "willem-geubbels", projectedShots: 1.05, projectedShotsOnTarget: 0.4, baselineShots90: 3.05, baselineShotsOnTarget90: 1.31, teamProfileRole: "CF", playerBaselineStability: { score: 0.35 } },
  { playerId: "joel-monteiro", projectedShots: 0.75, projectedShotsOnTarget: 0.12, baselineShots90: 1.53, baselineShotsOnTarget90: 0.57, teamProfileRole: "AM", playerBaselineStability: { score: 0.45 } }
]);
const lecceChangedLineup = teamOffensiveAllocation(lecceChangedLineupRows, "projectedShots", 9.305, lecce);
assert(Math.abs(lecceChangedLineup.values.reduce((total, value) => total + value, 0) - 9.305) < 0.001, "Lecce B: il cambio XI ha alterato il team target");
assert.notDeepStrictEqual(lecceChangedLineup.values, lecceNeutralAllocation.values, "Lecce B: allocation non reagisce al cambio XI");

// C - Una strong suppression puo ridurre ancora il basso volume senza rompere la riconciliazione.
const lecceSuppressedShots = { min: 6, central: 9.305, max: 13 };
const lecceSuppressedSot = { min: 1, central: 2.708, max: 5 };
const lecceVsJuventus = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 9.816, possessionPct: 41.2, passSuccessPct: 75, aerialWonPerGame: 17.1 }, attackChannels: lecce.historicalBaseline.attackChannels },
  juventus,
  lecceSuppressedShots,
  lecceSuppressedSot,
  { min: 1, central: 4.018, max: 7 }
);
assert(lecceVsJuventus.shotsAdjustmentPct < 0 && lecceVsJuventus.shotsOnTargetAdjustmentPct < 0);
const lecceSuppressedAllocation = teamOffensiveAllocation(lecceAllocationRows, "projectedShots", lecceSuppressedShots.central, lecce);
assert(Math.abs(lecceSuppressedAllocation.values.reduce((total, value) => total + value, 0) - lecceSuppressedShots.central) < 0.001);
assert(lecceSuppressedAllocation.values.every(Number.isFinite));

// D - Attacco neutro distribuito: vulnerability sul team, ruoli ancora neutrali.
const distributedVsLecceShots = { min: 8, central: 12, max: 17 };
const distributedVsLecceSot = { min: 2, central: 4, max: 7 };
const distributedVsLecce = applyOpponentTeamVolumeInteraction(
  { summary: { shotsPerGame: 13, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 33, central: 34, right: 33 } },
  lecce,
  distributedVsLecceShots,
  distributedVsLecceSot,
  { min: 2, central: 4, max: 7 }
);
assert(distributedVsLecce.shotsAdjustmentPct > 0 && distributedVsLecce.shotsOnTargetAdjustmentPct > 0, "Lecce D: broad vulnerability non raggiunge il team avversario");
assert.strictEqual(distributedVsLecce.metricEvidence.shots.persistenceWeight, 0.8);
assert.strictEqual(distributedVsLecce.metricEvidence.shotsOnTarget.persistenceWeight, 0.8);
for (const role of ["Centravanti", "Ala destra", "Centrocampista centrale", "Terzino sinistro", "Difensore centrale"]) {
  const modifier = teamProfilePlayerModifier({ role: role.includes("Terzino") || role.includes("Difensore") ? "Difensore" : role === "Centrocampista centrale" ? "Centrocampista" : "Attaccante", detailedRole: role }, 2, 0.5, lecce, distributedVsLecce.abilityToExploit);
  assert.strictEqual(modifier.shotFactor, 1, `Lecce D: ${role} ha ricevuto un boost di ruolo`);
  assert.strictEqual(modifier.sotFactor, 1, `Lecce D: ${role} ha ricevuto un boost SOT di ruolo`);
}

// E/F - Lo stesso team scaling conserva rispettivamente concentrazione e distribuzione dell'attacco.
const concentratedRows = [
  { playerId: "primary-a", projectedShots: 4.5, baselineShots90: 4.2, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "primary-b", projectedShots: 3.5, baselineShots90: 3.6, teamProfileRole: "AM", playerBaselineStability: { score: 0.85 } },
  { playerId: "secondary-a", projectedShots: 1.5, baselineShots90: 1.2, teamProfileRole: "CM", playerBaselineStability: { score: 0.7 } },
  { playerId: "secondary-b", projectedShots: 1, baselineShots90: 0.7, teamProfileRole: "FB", playerBaselineStability: { score: 0.6 } }
];
const distributedRows = [
  { playerId: "d1", projectedShots: 2.5, baselineShots90: 2.2, teamProfileRole: "CF", playerBaselineStability: { score: 0.8 } },
  { playerId: "d2", projectedShots: 2.3, baselineShots90: 2, teamProfileRole: "AM", playerBaselineStability: { score: 0.8 } },
  { playerId: "d3", projectedShots: 2.1, baselineShots90: 1.8, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "d4", projectedShots: 1.9, baselineShots90: 1.6, teamProfileRole: "W", playerBaselineStability: { score: 0.8 } },
  { playerId: "d5", projectedShots: 1.7, baselineShots90: 1.4, teamProfileRole: "FB", playerBaselineStability: { score: 0.8 } }
];
const concentratedAfterLecce = teamOffensiveAllocation(concentratedRows, "projectedShots", 12, roma);
const distributedAfterLecce = teamOffensiveAllocation(distributedRows, "projectedShots", 12, cagliari);
assert(concentratedAfterLecce.values.slice(0, 2).reduce((a, b) => a + b, 0) / 12 > distributedAfterLecce.values.slice(0, 2).reduce((a, b) => a + b, 0) / 12, "Lecce E/F: struttura avversaria cancellata dal team scaling");
assert(distributedAfterLecce.values.filter((value, index) => value > distributedRows[index].projectedShots).length >= 4, "Lecce F: extra-volume non distribuito");

// G/H - Baseline forti possono assorbire extra-volume; baseline deboli non ricevono bonus arbitrari.
const mixedRows = [
  { playerId: "strong-cf", projectedShots: 3.5, baselineShots90: 3.8, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "qualified-mf", projectedShots: 1.8, baselineShots90: 2.1, teamProfileRole: "CM", playerBaselineStability: { score: 0.85 } },
  { playerId: "qualified-fb", projectedShots: 1.2, baselineShots90: 1.3, teamProfileRole: "FB", playerBaselineStability: { score: 0.8 } },
  { playerId: "weak-mf", projectedShots: 0.3, baselineShots90: 0.25, teamProfileRole: "CM", playerBaselineStability: { score: 0.25 } },
  { playerId: "weak-fb", projectedShots: 0.2, baselineShots90: 0.15, teamProfileRole: "FB", playerBaselineStability: { score: 0.2 } }
];
const mixedAfterLecce = teamOffensiveAllocation(mixedRows, "projectedShots", 8.2, cagliari);
assert(mixedAfterLecce.values[0] - mixedRows[0].projectedShots > mixedAfterLecce.values[3] - mixedRows[3].projectedShots, "Lecce G: weak secondary riceve lo stesso extra del CF forte");
assert(mixedAfterLecce.values[1] - mixedRows[1].projectedShots > mixedAfterLecce.values[3] - mixedRows[3].projectedShots, "Lecce H: MF qualificato non distinto dal low-baseline");
assert(mixedAfterLecce.values[2] - mixedRows[2].projectedShots > mixedAfterLecce.values[4] - mixedRows[4].projectedShots, "Lecce H: FB qualificato non distinto dal low-baseline");

// I - Pipeline SOT separata: high-shots/low-SOT non diventa automaticamente un tiratore nello specchio.
const separatedRows = [
  { playerId: "high-shot-low-sot", projectedShots: 2.5, projectedShotsOnTarget: 0.15, baselineShots90: 3.5, baselineShotsOnTarget90: 0.12, teamProfileRole: "CM", playerBaselineStability: { score: 0.9 } },
  { playerId: "balanced", projectedShots: 1.8, projectedShotsOnTarget: 0.75, baselineShots90: 2, baselineShotsOnTarget90: 0.8, teamProfileRole: "AM", playerBaselineStability: { score: 0.8 } },
  { playerId: "finisher", projectedShots: 1.5, projectedShotsOnTarget: 0.7, baselineShots90: 1.8, baselineShotsOnTarget90: 0.9, teamProfileRole: "CF", playerBaselineStability: { score: 0.8 } }
];
const separatedShots = teamOffensiveAllocation(separatedRows, "projectedShots", 7, cagliari);
const separatedSot = teamOffensiveAllocation(separatedRows, "projectedShotsOnTarget", 2.5, cagliari);
assert(separatedShots.values[0] > separatedShots.values[1], "Lecce I: high shots baseline non preservata");
assert(separatedSot.values[0] < separatedSot.values[1], "Lecce I: SOT vulnerability ha cancellato la debole baseline SOT");
assert(Math.abs(separatedSot.values.reduce((total, value) => total + value, 0) - 2.5) < 0.001);

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

console.log(`OK profili matchup: 12 squadre; Lecce vulnerability ${distributedVsLecce.shotsAdjustmentPct}% tiri/${distributedVsLecce.shotsOnTargetAdjustmentPct}% SOT con ruoli WATCH; Lazio neutral ${neutralVsLazio.shotsAdjustmentPct}% tiri/${neutralVsLazio.shotsOnTargetAdjustmentPct}% SOT; Juventus suppression ${normalVsJuventus.shotsAdjustmentPct}% tiri/${normalVsJuventus.shotsOnTargetAdjustmentPct}% SOT; Inter suppression ${weakVsInter.shotsAdjustmentPct}% tiri/${weakVsInter.shotsOnTargetAdjustmentPct}% SOT; Genoa WATCH ${neutralVsGenoa.shotsAdjustmentPct}% tiri/${neutralVsGenoa.shotsOnTargetAdjustmentPct}% SOT; Frosinone ACTIVE ${neutralVsFrosinone.shotsAdjustmentPct}% tiri`);
