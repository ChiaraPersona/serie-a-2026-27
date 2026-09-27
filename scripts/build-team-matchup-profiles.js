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
const teams = new Map(read("data/teams/index.json").teams.map(team => [team.id, team]));

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
  const cap = quantile(values, source.methodology.upperWinsorQuantile);
  return { value: round(mean(values.map(value => Math.min(value, cap)))), cap: round(cap), method: `upper-winsor-p${source.methodology.upperWinsorQuantile * 100}` };
};
const shrink = (historicalMean, currentRobustMean, sampleSize) => {
  const prior = source.methodology.priorEquivalentMatches;
  const currentWeight = sampleSize / (sampleSize + prior);
  return { value: round(historicalMean * (1 - currentWeight) + currentRobustMean * currentWeight), historicalWeight: round(1 - currentWeight), currentWeight: round(currentWeight), priorEquivalentMatches: prior };
};
const confidenceWeight = confidence => ({ high: 1, medium: 0.75, "medium-low": 0.55, low: 0.3 }[confidence] || 0);
const volatilityLevel = stats => stats.mean && stats.standardDeviation / stats.mean >= 0.35 ? "high" : stats.mean && stats.standardDeviation / stats.mean >= 0.22 ? "medium" : "low";
const correlation = (left, right) => {
  const leftMean = mean(left), rightMean = mean(right);
  const numerator = left.reduce((total, value, index) => total + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(left.reduce((total, value) => total + (value - leftMean) ** 2, 0) * right.reduce((total, value) => total + (value - rightMean) ** 2, 0));
  return denominator ? round(numerator / denominator) : null;
};

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
    return { matchId: match.id, venue: side, own: match.teamStats?.[side] || null, opponent: match.teamStats?.[opponentSide] || null, goalsFor: side === "home" ? match.score.home : match.score.away, goalsAgainst: side === "home" ? match.score.away : match.score.home };
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
  const shotsVolatility = volatilityLevel(shotsAllowed), sotVolatility = volatilityLevel(sotAllowed);
  const possession = values("own.possessionPct");
  const maturity = Math.min(1, rows.length / source.methodology.currentSeasonMaturityMatches);
  const positional = Object.fromEntries(Object.entries(config.positionalShotVulnerability).map(([role, item]) => [role, {
    ...item,
    sampleSize: rows.length,
    season: source.season,
    sourceType: "derived-positional-evidence",
    confidenceWeight: confidenceWeight(item.confidence),
    maturityWeight: round(maturity),
    volatilityDiscount: shotsVolatility === "high" ? 0.85 : shotsVolatility === "medium" ? 0.93 : 1,
    effectiveMaxBoostPct: round(item.maxBoostPct * confidenceWeight(item.confidence) * maturity * (shotsVolatility === "high" ? 0.85 : shotsVolatility === "medium" ? 0.93 : 1), 2)
  }]));
  const current = {
    matches: rows.length,
    record: { wins: rows.filter(row => row.goalsFor > row.goalsAgainst).length, draws: rows.filter(row => row.goalsFor === row.goalsAgainst).length, losses: rows.filter(row => row.goalsFor < row.goalsAgainst).length, goalsFor: rows.reduce((total, row) => total + row.goalsFor, 0), goalsAgainst: rows.reduce((total, row) => total + row.goalsAgainst, 0), cleanSheets: rows.filter(row => row.goalsAgainst === 0).length },
    shotsForPerGame: round(mean(values("own.shots"))), shotsOnTargetForPerGame: round(mean(values("own.shotsOnTarget"))), cornersForPerGame: round(mean(values("own.corners"))), possessionPct: round(mean(possession)), passAccuracyPct: round(mean(values("own.passAccuracyPct")))
  };
  const historicalDisciplineValues = historicalDiscipline(teamId);
  const currentDiscipline = { matches: rows.length, foulsCommitted: values("own.fouls").reduce((a, b) => a + b, 0), foulsCommittedPerGame: round(mean(values("own.fouls"))), foulsWon: values("opponent.fouls").reduce((a, b) => a + b, 0), foulsWonPerGame: round(mean(values("opponent.fouls"))), yellowCards: values("own.yellowCards").reduce((a, b) => a + b, 0), yellowCardsPerGame: round(mean(values("own.yellowCards"))), straightRedCards: values("own.straightRedCards").reduce((a, b) => a + b, 0) };
  const shrunkFouls = shrink(historicalDisciplineValues.foulsCommittedPerGame, currentDiscipline.foulsCommittedPerGame, rows.length);
  const shrunkYellows = shrink(historicalDisciplineValues.yellowCardsPerGame, currentDiscipline.yellowCardsPerGame, rows.length);
  const disciplineRatio = 0.6 * (shrunkFouls.value / historicalDisciplineValues.foulsCommittedPerGame) + 0.4 * (shrunkYellows.value / historicalDisciplineValues.yellowCardsPerGame);
  return {
    teamId,
    teamName: team.name,
    season: source.season,
    sampleSize: rows.length,
    tacticalContext: {
      current: { coach: team.coach, preferredFormation: team.preferredFormation, status: config.currentTacticalContext.status },
      historicalPrior: { season: historicalStyle.season, formation: historicalStyle.formation?.code || null, formationAppearances: historicalStyle.formation?.appearances || null, note: config.currentTacticalContext.historicalPriorNote }
    },
    historicalBaseline: {
      season: "2025-26", matches: historicalVolume.matches,
      shotsForPerGame: historicalVolume.venues.overall.totalShots.for.mean, shotsAllowedPerGame: historicalShotsAllowed,
      shotsOnTargetForPerGame: historicalVolume.venues.overall.shotsOnTarget.for.mean, shotsOnTargetAllowedPerGame: historicalSotAllowed,
      cornersForPerGame: historicalVolume.venues.overall.wonCorners.for.mean, cornersAllowedPerGame: historicalVolume.venues.overall.wonCorners.against.mean,
      possessionPct: historicalStyle.summary.possessionPct, passAccuracyPct: historicalStyle.summary.passSuccessPct, goalsPerGame: historicalStyle.derived.goalsPerGame,
      discipline: historicalDisciplineValues, attackChannels: historicalStyle.attackChannels, tacticalProfileStatus: "historical-prior"
    },
    currentSeason: current,
    shotDefense: {
      shotsAllowed: { ...shotsAllowed, historicalMean: round(historicalShotsAllowed), robustCurrentMean: robustShots.value, robustMethod: robustShots.method, upperCap: robustShots.cap, shrunkMean: shrunkShots.value, shrinkage: shrunkShots, rawValues: shotsAllowedValues, outliers: rows.filter((row, index) => shotsAllowedValues[index] > robustShots.cap).map((row, index) => ({ matchId: row.matchId, value: shotsAllowedValues[rows.indexOf(row)], matchupFailure: true })) },
      shotsOnTargetAllowed: { ...sotAllowed, historicalMean: round(historicalSotAllowed), robustCurrentMean: robustSot.value, robustMethod: robustSot.method, upperCap: robustSot.cap, shrunkMean: shrunkSot.value, shrinkage: shrunkSot, rawValues: sotAllowedValues },
      shotLocation: { insideBox, outsideBox, insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), sampleSize: locationRows.length, confidence: "medium", sourceType: "derived", verificationStatus: locationRows.some(row => row.status === "partial-estimate") ? "partially-verified" : "verified", evidence: locationRows }
    },
    vulnerabilities: {
      boxPenetration: { insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), level: "high", sampleSize: locationRows.length, confidence: "medium", sourceType: "derived", modelStatus: "evidence-only" },
      territorialPressure: { level: "elevated", sampleSize: rows.length, confidence: "medium-low", possessionVsShotsAllowedCorrelation: correlation(possession, shotsAllowedValues), fieldTilt: null, causalClaim: false, modelStatus: "experimental" },
      secondLineShooters: { level: "elevated", sampleSize: rows.length, confidence: "medium-low", modelStatus: "active-positional-allocation", note: "Segnale distribuito fra ali, trequartisti, centrocampisti e alcuni terzini; non equivale a debolezza definitiva contro un singolo ruolo." },
      positionalShotVulnerability: positional
    },
    discipline: {
      historical: historicalDisciplineValues,
      current: currentDiscipline,
      shrunk: { foulsCommittedPerGame: shrunkFouls.value, yellowCardsPerGame: shrunkYellows.value, foulShrinkage: shrunkFouls, yellowCardShrinkage: shrunkYellows },
      modelFactor: round(Math.max(0.95, Math.min(1.05, 1 + (disciplineRatio - 1) * source.methodology.teamDisciplineSensitivity))),
      modelStatus: "available-for-card-context-with-shrinkage"
    },
    corners: {
      historicalForPerGame: historicalVolume.venues.overall.wonCorners.for.mean, currentForPerGame: current.cornersForPerGame,
      shrunkForPerGame: shrink(historicalVolume.venues.overall.wonCorners.for.mean, current.cornersForPerGame, rows.length).value,
      historicalAllowedPerGame: historicalVolume.venues.overall.wonCorners.against.mean, currentAllowed: summary(values("opponent.corners")),
      territorialPressureLink: { status: "experimental", reason: "Cinque gare non consentono di stimare separatamente una relazione stabile." }
    },
    volatility: { shotsAllowed: shotsVolatility, shotsOnTargetAllowed: sotVolatility, effect: "confidence-and-uncertainty-only", changesCentralMean: false },
    confidence: { overall: "medium-low", sampleSize: rows.length, maturityWeight: round(maturity), reason: "Cinque gare, cambio allenatore/modulo e forte dispersione dei volumi concessi." },
    modelPolicy: { active: ["positional-shot-allocation"], experimental: ["box-penetration", "territorial-pressure", "corner-pressure-link"], inactiveForCentralTeamVolume: true },
    dataQuality: { status: "partial-current-season", internalMatchStats: "verified", shotLocation: locationRows.some(row => row.status === "partial-estimate") ? "partially-verified" : "verified", missing: ["field tilt", "tocchi in area strutturati per tutte le gare", "zone tiro native nel dataset interno", "ingressi in area individuali"] },
    evidence: config.evidence
  };
}

const profiles = source.profiles.map(buildProfile);
const output = { schemaVersion: 1, competition: source.competition, season: source.season, generatedAt: matches.filter(match => match.status === "finished").flatMap(match => match.sources || []).map(item => item.retrievedAt).filter(Boolean).sort().at(-1) || null, methodology: source.methodology, coverage: { teams: profiles.length, teamIds: profiles.map(profile => profile.teamId), scope: "Atalanta pilot; le altre 19 squadre non sono compilate." }, profiles };
fs.writeFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK profili matchup squadra: ${profiles.length} (${profiles.map(profile => profile.teamId).join(", ")})`);
