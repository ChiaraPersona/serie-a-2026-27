"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/team-matchup-profiles-2026-27.json");
const matches = read("data/normalized/matches.json");
const volumeProfiles = new Map(read("data/normalized/team-volume-profiles-2025-26.json").profiles.map(profile => [profile.teamId, profile]));
const styleProfiles = new Map(read("data/normalized/team-style-profiles.json").profiles.map(profile => [profile.teamId, profile]));
const historicalMatches = read("data/normalized/referee-matches/2025-26/serie-a.json").matches;
const teamIndex = read("data/teams/index.json").teams;
const teams = new Map(teamIndex.map(team => [team.id, read(`data/teams/${team.id}.json`)]));
const players = new Map(teamIndex.flatMap(team => (teams.get(team.id).squad || []).map(player => [player.id, player])));

const round = (value, digits = 3) => Number(value.toFixed(digits));
const mean = values => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const summary = values => {
  if (!values.length) return { mean: null, median: null, variance: null, standardDeviation: null, min: null, max: null, sampleSize: 0 };
  const average = mean(values);
  const variance = mean(values.map(value => (value - average) ** 2));
  return { mean: round(average), median: round(quantile(values, 0.5)), variance: round(variance), standardDeviation: round(Math.sqrt(variance)), min: Math.min(...values), max: Math.max(...values), sampleSize: values.length };
};
const robustUpperMean = values => {
  if (!values.length) return { value: null, cap: null, method: `upper-winsor-p${source.methodology.upperWinsorQuantile * 100}` };
  const cap = quantile(values, source.methodology.upperWinsorQuantile);
  return { value: round(mean(values.map(value => Math.min(value, cap)))), cap: round(cap), method: `upper-winsor-p${source.methodology.upperWinsorQuantile * 100}` };
};
const shrink = (historicalMean, currentRobustMean, sampleSize, priorEquivalentMatches = source.methodology.priorEquivalentMatches) => {
  if (!Number.isFinite(currentRobustMean) || sampleSize === 0) return { value: round(historicalMean), historicalWeight: 1, currentWeight: 0, priorEquivalentMatches, fallback: "historical-current-missing" };
  const prior = priorEquivalentMatches;
  const currentWeight = sampleSize / (sampleSize + prior);
  return { value: round(historicalMean * (1 - currentWeight) + currentRobustMean * currentWeight), historicalWeight: round(1 - currentWeight), currentWeight: round(currentWeight), priorEquivalentMatches: prior };
};
const confidenceWeight = confidence => ({ high: 1, "medium-high": 0.9, medium: 0.75, "medium-low": 0.55, low: 0.3, "very-low": 0.15 }[confidence] || 0);
const volatilityLevel = stats => stats.mean && stats.standardDeviation / stats.mean >= 0.35 ? "high" : stats.mean && stats.standardDeviation / stats.mean >= 0.22 ? "medium" : "low";
const sumAvailable = values => values.length ? values.reduce((total, value) => total + value, 0) : null;
const correlation = (left, right) => {
  const leftMean = mean(left), rightMean = mean(right);
  const numerator = left.reduce((total, value, index) => total + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(left.reduce((total, value) => total + (value - leftMean) ** 2, 0) * right.reduce((total, value) => total + (value - rightMean) ** 2, 0));
  return denominator ? round(numerator / denominator) : null;
};

function matchupRole(player) {
  const detail = String(player?.detailedRole || "").toLocaleLowerCase("it");
  if (/punta centrale|centravanti/.test(detail)) return "CF";
  if (/seconda punta|trequartista/.test(detail)) return "AM";
  if (/ala/.test(detail) || (player?.role === "Attaccante" && /esterno/.test(detail))) return "W";
  if (/mediano/.test(detail)) return "DM";
  if (/terzino/.test(detail) || (player?.role === "Difensore" && /esterno/.test(detail))) return "FB";
  if (/difensore centrale|centrale difensivo/.test(detail) || player?.role === "Difensore") return "CB";
  if (player?.role === "Centrocampista") return "CM";
  if (player?.role === "Attaccante") return "CF";
  return null;
}

function roleShotDistribution(rows) {
  const roles = ["CF", "W", "AM", "CM", "DM", "FB", "CB"];
  const shotsByRole = Object.fromEntries(roles.map(role => [role, 0]));
  let mappedShots = 0, unmappedShots = 0;
  for (const row of rows) {
    for (const stat of row.opponentPlayers || []) {
      if (!(stat.shots > 0)) continue;
      const role = matchupRole(players.get(stat.playerId));
      if (role) {
        shotsByRole[role] += stat.shots;
        mappedShots += stat.shots;
      } else unmappedShots += stat.shots;
    }
  }
  const shares = Object.fromEntries(roles.map(role => [role, mappedShots ? round(shotsByRole[role] / mappedShots, 4) : null]));
  const hhi = mappedShots ? roles.reduce((total, role) => total + shares[role] ** 2, 0) : null;
  const normalizedHhi = hhi == null ? null : round((hhi - 1 / roles.length) / (1 - 1 / roles.length), 4);
  return {
    taxonomy: roles,
    shotsByRole,
    shareByRole: shares,
    mappedShots,
    unmappedShots,
    sampleSize: rows.length,
    sourceType: "derived-from-player-match-stats-and-roster-roles",
    confidence: rows.length >= 8 ? "medium" : "low",
    modelStatus: "evidence-only",
    roleConcentrationIndex: { method: "normalized-HHI", value: normalizedHhi, range: [0, 1], interpretation: "0 = volume distribuito uniformemente; 1 = volume concentrato su un solo ruolo", modelWeight: 0 }
  };
}

function historicalDiscipline(teamId) {
  const rows = historicalMatches.filter(match => match.homeTeam.slug === teamId || match.awayTeam.slug === teamId);
  const own = rows.map(match => match.homeTeam.slug === teamId ? match.teamStats.home : match.teamStats.away);
  const opponents = rows.map(match => match.homeTeam.slug === teamId ? match.teamStats.away : match.teamStats.home);
  return { matches: rows.length, foulsCommittedPerGame: round(mean(own.map(row => row.fouls))), foulsWonPerGame: round(mean(opponents.map(row => row.fouls))), yellowCardsPerGame: round(mean(own.map(row => row.yellowCards))) };
}

function buildProfile(config) {
  const teamId = config.teamId;
  const historicalVolume = volumeProfiles.get(teamId);
  const historicalStyle = styleProfiles.get(teamId);
  const team = teams.get(teamId);
  if (!historicalVolume || !historicalStyle || !team) throw new Error(`${teamId}: baseline storica o squadra mancante`);
  const currentMatches = matches.filter(match => match.competition === "serie-a" && match.season === source.season && match.status === "finished" && (match.homeTeam === teamId || match.awayTeam === teamId)).sort((a, b) => a.matchday - b.matchday);
  const rows = currentMatches.map(match => {
    const side = match.homeTeam === teamId ? "home" : "away";
    const opponentSide = side === "home" ? "away" : "home";
    return { matchId: match.id, venue: side, own: match.teamStats?.[side] || null, opponent: match.teamStats?.[opponentSide] || null, opponentPlayers: match.playerStats?.[opponentSide] || [], goalsFor: side === "home" ? match.score.home : match.score.away, goalsAgainst: side === "home" ? match.score.away : match.score.home };
  });
  if (rows.some(row => !row.own || !row.opponent)) throw new Error(`${teamId}: statistiche squadra 2026/27 incomplete`);
  const values = key => rows.map(row => row[key.split(".")[0]][key.split(".")[1]]).filter(Number.isFinite);
  const shotsAllowedValues = values("opponent.shots");
  const sotAllowedValues = values("opponent.shotsOnTarget");
  const shotsAllowed = summary(shotsAllowedValues), sotAllowed = summary(sotAllowedValues);
  const robustShots = robustUpperMean(shotsAllowedValues), robustSot = robustUpperMean(sotAllowedValues);
  const historicalShotsAllowed = historicalVolume.venues.overall.totalShots.against.mean;
  const historicalSotAllowed = historicalVolume.venues.overall.shotsOnTarget.against.mean;
  const shrunkShots = shrink(historicalShotsAllowed, robustShots.value, rows.length);
  const shrunkSot = shrink(historicalSotAllowed, robustSot.value, rows.length);
  const locationRows = config.shotLocationEvidence.filter(entry => currentMatches.some(match => match.id === entry.matchId));
  const insideBox = locationRows.reduce((total, entry) => total + entry.insideBox, 0);
  const outsideBox = locationRows.reduce((total, entry) => total + entry.outsideBox, 0);
  const insideBoxShare = insideBox + outsideBox ? insideBox / (insideBox + outsideBox) : null;
  const insideBoxShotsAllowedPerMatch = locationRows.length ? insideBox / locationRows.length : null;
  const roleDistribution = roleShotDistribution(rows);
  const shotsVolatility = volatilityLevel(shotsAllowed), sotVolatility = volatilityLevel(sotAllowed);
  const possession = values("own.possessionPct");
  const maturity = Math.min(1, rows.length / source.methodology.currentSeasonMaturityMatches);
  const positional = Object.fromEntries(Object.entries(config.positionalShotVulnerability).map(([role, item]) => {
    const status = item.status || (item.active ? "active" : "inactive");
    return [role, {
    ...item,
    status,
    active: status === "active",
    sampleSize: rows.length,
    season: source.season,
    sourceType: "derived-positional-evidence",
    confidenceWeight: confidenceWeight(item.confidence),
    maturityWeight: round(maturity),
    volatilityDiscount: shotsVolatility === "high" ? 0.85 : shotsVolatility === "medium" ? 0.93 : 1,
    effectiveMaxBoostPct: status === "active" ? round(item.maxBoostPct * confidenceWeight(item.confidence) * maturity * (shotsVolatility === "high" ? 0.85 : shotsVolatility === "medium" ? 0.93 : 1), 2) : 0
  }];
  }));
  const regimes = (config.currentSeasonRegimes || []).map(regime => {
    const regimeRows = rows.filter(row => regime.matchIds.includes(row.matchId));
    const locationByMatch = new Map(locationRows.map(item => [item.matchId, item]));
    const regimeLocations = regimeRows.map(row => locationByMatch.get(row.matchId)).filter(Boolean);
    return {
      id: regime.id,
      coach: regime.coach,
      status: regime.status,
      formation: regime.formation,
      matchIds: regimeRows.map(row => row.matchId),
      matches: regimeRows.length,
      tacticalConfidence: regime.tacticalConfidence,
      tacticalWeightPerMatch: source.methodology.coachEraTacticalWeights[regime.status] ?? 0,
      volumeUse: "retained-for-structural-and-player-baselines",
      tacticalUse: regime.status === "closed" ? "downweighted-after-coach-change" : "active-era-very-small-sample",
      shotsAllowedPerGame: round(mean(regimeRows.map(row => row.opponent.shots))),
      shotsOnTargetAllowedPerGame: round(mean(regimeRows.map(row => row.opponent.shotsOnTarget))),
      possessionPct: round(mean(regimeRows.map(row => row.own.possessionPct))),
      insideBoxShotsAllowedPerMatch: regimeLocations.length ? round(mean(regimeLocations.map(item => item.insideBox))) : null
    };
  });
  const effectiveTacticalSampleSize = round(regimes.reduce((total, regime) => total + regime.matches * regime.tacticalWeightPerMatch, 0));
  const activeEra = regimes.find(regime => regime.status === "active") || null;
  const activeEraTacticalShrinkage = activeEra ? {
    priorEquivalentMatches: source.methodology.tacticalPriorEquivalentMatchesAfterCoachChange,
    shotsAllowedPerGame: shrink(historicalShotsAllowed, activeEra.shotsAllowedPerGame, activeEra.matches, source.methodology.tacticalPriorEquivalentMatchesAfterCoachChange),
    shotsOnTargetAllowedPerGame: shrink(historicalSotAllowed, activeEra.shotsOnTargetAllowedPerGame, activeEra.matches, source.methodology.tacticalPriorEquivalentMatchesAfterCoachChange),
    possessionPct: shrink(historicalStyle.summary.possessionPct, activeEra.possessionPct, activeEra.matches, source.methodology.tacticalPriorEquivalentMatchesAfterCoachChange),
    modelStatus: "diagnostic-prior-not-a-new-baseline"
  } : null;
  const current = {
    matches: rows.length,
    record: { wins: rows.filter(row => row.goalsFor > row.goalsAgainst).length, draws: rows.filter(row => row.goalsFor === row.goalsAgainst).length, losses: rows.filter(row => row.goalsFor < row.goalsAgainst).length, goalsFor: rows.reduce((total, row) => total + row.goalsFor, 0), goalsAgainst: rows.reduce((total, row) => total + row.goalsAgainst, 0), cleanSheets: rows.filter(row => row.goalsAgainst === 0).length },
    shotsForPerGame: round(mean(values("own.shots"))), shotsOnTargetForPerGame: round(mean(values("own.shotsOnTarget"))), shotOnTargetRate: round(sumAvailable(values("own.shotsOnTarget")) / sumAvailable(values("own.shots"))), cornersForPerGame: round(mean(values("own.corners"))), possessionPct: round(mean(possession)), passAccuracyPct: round(mean(values("own.passAccuracyPct")))
  };
  const historicalDisciplineValues = historicalDiscipline(teamId);
  const currentDiscipline = { matches: rows.length, foulsCommitted: sumAvailable(values("own.fouls")), foulsCommittedPerGame: round(mean(values("own.fouls"))), foulsWon: sumAvailable(values("opponent.fouls")), foulsWonPerGame: round(mean(values("opponent.fouls"))), yellowCards: sumAvailable(values("own.yellowCards")), yellowCardsPerGame: round(mean(values("own.yellowCards"))), straightRedCards: sumAvailable(values("own.straightRedCards")) };
  const shrunkFouls = shrink(historicalDisciplineValues.foulsCommittedPerGame, currentDiscipline.foulsCommittedPerGame, rows.length);
  const shrunkFoulsWon = shrink(historicalDisciplineValues.foulsWonPerGame, currentDiscipline.foulsWonPerGame, rows.length);
  const shrunkYellows = shrink(historicalDisciplineValues.yellowCardsPerGame, currentDiscipline.yellowCardsPerGame, rows.length);
  const disciplineRatio = 0.6 * (shrunkFouls.value / historicalDisciplineValues.foulsCommittedPerGame) + 0.4 * (shrunkYellows.value / historicalDisciplineValues.yellowCardsPerGame);
  const duelSignal = config.disciplineSignal?.foulIntensity;
  const duelEvidenceWeight = historicalDisciplineValues.matches + rows.length > 0 ? (historicalDisciplineValues.matches + rows.length) / (historicalDisciplineValues.matches + rows.length + 12) : 0;
  const directDuelEnvironmentFactor = duelSignal?.status === "active" ? round(1 + duelSignal.directDuelMaxImpactPct / 100 * confidenceWeight(duelSignal.confidence) * duelEvidenceWeight, 4) : 1;
  const signalEntries = Object.entries(config.vulnerabilitySignals || {});
  return {
    teamId,
    teamName: team.name,
    season: source.season,
    sampleSize: rows.length,
    tacticalContext: {
      current: { coach: config.currentTacticalContext.coach, preferredFormation: config.currentTacticalContext.preferredFormation, status: config.currentTacticalContext.status, repositoryTeamCoach: team.coach },
      historicalPrior: { season: historicalStyle.season, formation: historicalStyle.formation?.code || null, formationAppearances: historicalStyle.formation?.appearances || null, note: config.currentTacticalContext.historicalPriorNote },
      currentSeasonRegimes: regimes,
      effectiveTacticalSampleSize,
      activeEraTacticalShrinkage,
      regimeWeighting: { closedEraPerMatch: source.methodology.coachEraTacticalWeights.closed, activeEraPerMatch: source.methodology.coachEraTacticalWeights.active, structuralStatisticsRetainAllMatchesAtFullWeight: true, tacticalStatisticsUseDownweightedClosedEra: true }
    },
    historicalBaseline: {
      season: "2025-26", matches: historicalVolume.matches,
      results: team.teamStats?.results || null,
      shotsForPerGame: historicalVolume.venues.overall.totalShots.for.mean, shotsAllowedPerGame: historicalShotsAllowed,
      shotsOnTargetForPerGame: historicalVolume.venues.overall.shotsOnTarget.for.mean, shotsOnTargetAllowedPerGame: historicalSotAllowed,
      cornersForPerGame: historicalVolume.venues.overall.wonCorners.for.mean, cornersAllowedPerGame: historicalVolume.venues.overall.wonCorners.against.mean,
      possessionPct: historicalStyle.summary.possessionPct, passAccuracyPct: historicalStyle.summary.passSuccessPct, goalsPerGame: historicalStyle.derived.goalsPerGame,
      homeAwayShotDefense: {
        home: { shotsAllowedPerGame: historicalVolume.venues.home.totalShots.against.mean, shotsOnTargetAllowedPerGame: historicalVolume.venues.home.shotsOnTarget.against.mean },
        away: { shotsAllowedPerGame: historicalVolume.venues.away.totalShots.against.mean, shotsOnTargetAllowedPerGame: historicalVolume.venues.away.shotsOnTarget.against.mean },
        modelStatus: "historical-prior-referenced-by-existing-venue-model-not-assumed-current"
      },
      discipline: { ...historicalDisciplineValues, totals: team.teamStats?.discipline || null }, attackChannels: historicalStyle.attackChannels, tacticalProfileStatus: "historical-prior"
    },
    currentSeason: current,
    attackProjectionContext: {
      shots: { historicalPerGame: historicalVolume.venues.overall.totalShots.for.mean, currentPerGame: current.shotsForPerGame, shrunkPerGame: shrink(historicalVolume.venues.overall.totalShots.for.mean, current.shotsForPerGame, rows.length).value },
      shotsOnTarget: { historicalPerGame: historicalVolume.venues.overall.shotsOnTarget.for.mean, currentPerGame: current.shotsOnTargetForPerGame, shrunkPerGame: shrink(historicalVolume.venues.overall.shotsOnTarget.for.mean, current.shotsOnTargetForPerGame, rows.length).value },
      shotOnTargetRate: { current: current.shotOnTargetRate, historical: round(historicalVolume.venues.overall.shotsOnTarget.for.mean / historicalVolume.venues.overall.totalShots.for.mean), modelStatus: "diagnostic-only-separate-shot-and-sot-projections" },
      modelStatus: "existing-team-volume-engine-remains-authoritative"
    },
    shotDefense: {
      shotsAllowed: { ...shotsAllowed, historicalMean: round(historicalShotsAllowed), robustCurrentMean: robustShots.value, robustMethod: robustShots.method, upperCap: robustShots.cap, shrunkMean: shrunkShots.value, shrinkage: shrunkShots, rawValues: shotsAllowedValues, outliers: rows.filter((row, index) => shotsAllowedValues[index] > robustShots.cap).map((row, index) => ({ matchId: row.matchId, value: shotsAllowedValues[rows.indexOf(row)], matchupFailure: true })) },
      shotsOnTargetAllowed: { ...sotAllowed, historicalMean: round(historicalSotAllowed), robustCurrentMean: robustSot.value, robustMethod: robustSot.method, upperCap: robustSot.cap, shrunkMean: shrunkSot.value, shrinkage: shrunkSot, rawValues: sotAllowedValues },
      shotLocation: { insideBox, outsideBox, insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), insideBoxShotsAllowedPerMatch: insideBoxShotsAllowedPerMatch == null ? null : round(insideBoxShotsAllowedPerMatch), sampleSize: locationRows.length, confidence: config.teamId === "bologna" ? "low" : "medium", sourceType: "derived", verificationStatus: locationRows.some(row => ["partial-estimate", "estimated"].includes(row.status)) ? "estimated-or-partially-verified" : "verified", evidence: locationRows },
      opponentShotRoleDistribution: roleDistribution
    },
    vulnerabilities: {
      signals: Object.fromEntries(signalEntries.map(([key, signal]) => [key, { ...signal, sampleSize: rows.length, season: source.season, modelEffect: signal.status === "active" && !["centralForwardShotAccess", "secondLineShotAccess", "territorialPressureSensitivity"].includes(key) ? "classification-only" : signal.status === "active" ? "active-through-positional-policy" : "none" }])),
      boxPenetration: { insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), insideBoxShotsAllowedPerMatch: insideBoxShotsAllowedPerMatch == null ? null : round(insideBoxShotsAllowedPerMatch), level: config.vulnerabilitySignals?.boxPenetration?.level || "unconfirmed", status: config.vulnerabilitySignals?.boxPenetration?.status || "inactive", sampleSize: locationRows.length, confidence: config.vulnerabilitySignals?.boxPenetration?.confidence || "low", sourceType: "derived", modelStatus: "evidence-only" },
      territorialPressure: { level: config.vulnerabilitySignals?.territorialPressureSensitivity?.level || "unconfirmed", status: config.vulnerabilitySignals?.territorialPressureSensitivity?.status || "inactive", sampleSize: rows.length, confidence: config.vulnerabilitySignals?.territorialPressureSensitivity?.confidence || "low", possessionVsShotsAllowedCorrelation: correlation(possession, shotsAllowedValues), fieldTilt: null, causalClaim: false, modelStatus: "experimental" },
      secondLineShooters: { level: config.vulnerabilitySignals?.secondLineShotAccess?.level || "unconfirmed", status: config.vulnerabilitySignals?.secondLineShotAccess?.status || "inactive", sampleSize: rows.length, confidence: config.vulnerabilitySignals?.secondLineShotAccess?.confidence || "low", modelStatus: config.vulnerabilitySignals?.secondLineShotAccess?.status === "active" ? "active-positional-allocation" : "watch-no-model-effect", note: "Segnale distribuito fra ali, trequartisti e centrocampisti; non equivale a debolezza definitiva contro un singolo ruolo." },
      positionalShotVulnerability: positional
    },
    discipline: {
      historical: historicalDisciplineValues,
      current: currentDiscipline,
      shrunk: { foulsCommittedPerGame: shrunkFouls.value, foulsWonPerGame: shrunkFoulsWon.value, yellowCardsPerGame: shrunkYellows.value, foulShrinkage: shrunkFouls, foulsWonShrinkage: shrunkFoulsWon, yellowCardShrinkage: shrunkYellows },
      modelFactor: round(Math.max(0.95, Math.min(1.05, 1 + (disciplineRatio - 1) * source.methodology.teamDisciplineSensitivity))),
      modelStatus: "available-for-card-context-with-shrinkage",
      foulIntensity: duelSignal ? { ...duelSignal, evidenceWeight: round(duelEvidenceWeight), directDuelEnvironmentFactor, application: "only-when-an-individual-direct-opponent-is-identified" } : { level: "unclassified", status: "inactive", confidence: "low", directDuelEnvironmentFactor: 1 }
    },
    corners: {
      historicalForPerGame: historicalVolume.venues.overall.wonCorners.for.mean, currentForPerGame: current.cornersForPerGame,
      shrunkForPerGame: shrink(historicalVolume.venues.overall.wonCorners.for.mean, current.cornersForPerGame, rows.length).value,
      historicalAllowedPerGame: historicalVolume.venues.overall.wonCorners.against.mean, currentAllowed: summary(values("opponent.corners")),
      territorialPressureLink: { status: "experimental", reason: "Cinque gare non consentono di stimare separatamente una relazione stabile." }
    },
    volatility: { shotsAllowed: shotsVolatility, shotsOnTargetAllowed: sotVolatility, effect: "confidence-and-uncertainty-only", changesCentralMean: false },
    confidence: { overall: config.teamId === "bologna" ? "low" : "medium-low", sampleSize: rows.length, maturityWeight: round(maturity), effectiveTacticalSampleSize, reason: config.teamId === "bologna" ? "Cinque gare divise fra due allenatori; la nuova era Palladino contiene una sola partita." : "Cinque gare e forte dispersione dei volumi concessi." },
    modelPolicy: { active: [...signalEntries.filter(([, item]) => item.status === "active").map(([key]) => key), ...(Object.values(positional).some(item => item.status === "active") ? ["positional-shot-allocation"] : [])], watch: [...signalEntries.filter(([, item]) => item.status === "watch").map(([key]) => key), ...Object.entries(positional).filter(([, item]) => item.status === "watch").map(([role]) => `role-${role}`)], inactive: Object.entries(positional).filter(([, item]) => item.status === "inactive").map(([role]) => `role-${role}`), watchActivationCriteria: source.methodology.watchActivationCriteria, inactiveForCentralTeamVolume: true },
    dataQuality: { status: "partial-current-season", internalMatchStats: "verified", missingStatisticPolicy: "null-never-zero", shotLocation: locationRows.some(row => ["partial-estimate", "estimated"].includes(row.status)) ? "estimated-or-partially-verified" : "verified", missing: ["field tilt", "tocchi in area strutturati per tutte le gare", "zone tiro native nel dataset interno", "ingressi in area individuali", ...(config.teamId === "bologna" ? ["coach prior Palladino affidabile e separabile dal contesto della squadra precedente"] : [])] },
    evidence: config.evidence
  };
}

const profiles = source.profiles.map(buildProfile);
const output = { schemaVersion: 1, competition: source.competition, season: source.season, generatedAt: matches.filter(match => match.status === "finished").flatMap(match => match.sources || []).map(item => item.retrievedAt).filter(Boolean).sort().at(-1) || null, methodology: source.methodology, coverage: { teams: profiles.length, teamIds: profiles.map(profile => profile.teamId), scope: "Profili comparabili Atalanta e Bologna; le altre 18 squadre non sono compilate." }, profiles };
fs.writeFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK profili matchup squadra: ${profiles.length} (${profiles.map(profile => profile.teamId).join(", ")})`);
