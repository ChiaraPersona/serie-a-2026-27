"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/team-matchup-profiles-2026-27.json");
const matches = read("data/normalized/matches.json");
const volumeProfiles = new Map(read("data/normalized/team-volume-profiles-2025-26.json").profiles.map(profile => [profile.teamId, profile]));
const styleProfiles = new Map(read("data/normalized/team-style-profiles.json").profiles.map(profile => [profile.teamId, profile]));
const historicalMatchesByCompetition = new Map([
  ["serie-a", read("data/normalized/referee-matches/2025-26/serie-a.json").matches],
  ["serie-b", read("data/normalized/referee-matches/2025-26/serie-b.json").matches]
]);
const teamIndex = read("data/teams/index.json").teams;
const teams = new Map(teamIndex.map(team => [team.id, read(`data/teams/${team.id}.json`)]));
const players = new Map(teamIndex.flatMap(team => (teams.get(team.id).squad || []).map(player => [player.id, player])));
const leaguePossessionShotRates = matches.filter(match => match.competition === "serie-a" && match.season === source.season && match.status === "finished").flatMap(match => ["home", "away"].map(side => {
  const stats = match.teamStats?.[side];
  return stats?.possessionPct > 0 && Number.isFinite(stats.shots) ? stats.shots / (stats.possessionPct / 10) : null;
})).filter(Number.isFinite);

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
const statNumber = value => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

function crossCompetitionVolumeProfile(config) {
  const context = config.crossCompetitionHistoricalBaseline;
  if (!context?.enabled) return null;
  const competition = context.competitionId;
  const competitionMatches = historicalMatchesByCompetition.get(competition) || [];
  const selected = competitionMatches.filter(match => match.homeTeam.slug === config.teamId || match.awayTeam.slug === config.teamId);
  if (!selected.length) return null;
  const metricMap = { totalShots: "totalShots", shotsOnTarget: "shotsOnTarget", wonCorners: "wonCorners" };
  const emptyVenue = () => Object.fromEntries(Object.keys(metricMap).map(metric => [metric, { for: [], against: [] }]));
  const venues = { overall: emptyVenue(), home: emptyVenue(), away: emptyVenue() };
  const possession = [];
  for (const match of selected) {
    const side = match.homeTeam.slug === config.teamId ? "home" : "away";
    const opponentSide = side === "home" ? "away" : "home";
    const rawPath = path.join(root, context.rawDirectory, `${match.providerFixtureId}.json.gz`);
    if (!fs.existsSync(rawPath)) throw new Error(`${config.teamId}: referto storico ${competition} mancante ${match.providerFixtureId}`);
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(rawPath)).toString("utf8"));
    const boxscore = raw.bundle?.summary?.boxscore?.teams || [];
    const stats = homeAway => Object.fromEntries((boxscore.find(team => team.homeAway === homeAway)?.statistics || []).map(stat => [stat.name, statNumber(stat.displayValue)]));
    const own = stats(side), opponent = stats(opponentSide);
    for (const [metric, providerMetric] of Object.entries(metricMap)) {
      if (!Number.isFinite(own[providerMetric]) || !Number.isFinite(opponent[providerMetric])) throw new Error(`${config.teamId}: volume storico ${metric} incompleto in ${match.id}`);
      venues.overall[metric].for.push(own[providerMetric]);
      venues.overall[metric].against.push(opponent[providerMetric]);
      venues[side][metric].for.push(own[providerMetric]);
      venues[side][metric].against.push(opponent[providerMetric]);
    }
    if (Number.isFinite(own.possessionPct)) possession.push(own.possessionPct);
  }
  const summarizedVenues = Object.fromEntries(Object.entries(venues).map(([venue, metrics]) => [venue, Object.fromEntries(Object.entries(metrics).map(([metric, sides]) => [metric, { for: summary(sides.for), against: summary(sides.against) }]))]));
  return { teamId: config.teamId, season: context.season, competition, matches: selected.length, venues: summarizedVenues, possessionPct: round(mean(possession)), sourceType: "cross-competition-observed-team-stats" };
}
const leagueXgShotRows = matches.filter(match => match.competition === "serie-a" && match.season === source.season && match.status === "finished").flatMap(match => [match.teamStats?.home, match.teamStats?.away]).filter(row => Number.isFinite(row?.expectedGoals) && row.shots > 0);
const leagueXgTotal = leagueXgShotRows.reduce((total, row) => total + row.expectedGoals, 0);
const leagueShotTotal = leagueXgShotRows.reduce((total, row) => total + row.shots, 0);
const leagueXgPerShot = leagueShotTotal ? leagueXgTotal / leagueShotTotal : null;
const correlation = (left, right) => {
  const leftMean = mean(left), rightMean = mean(right);
  const numerator = left.reduce((total, value, index) => total + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(left.reduce((total, value) => total + (value - leftMean) ** 2, 0) * right.reduce((total, value) => total + (value - rightMean) ** 2, 0));
  return denominator ? round(numerator / denominator) : null;
};

function signalPersistence(values, baseline, elevatedThresholdMultiplier = source.methodology.signalPersistence.elevatedThresholdMultiplier) {
  const aboveBaseline = values.map(value => value > baseline);
  const elevatedThreshold = baseline * elevatedThresholdMultiplier;
  const aboveElevated = values.map(value => value > elevatedThreshold);
  const longestRun = flags => flags.reduce((state, flag) => flag ? { current: state.current + 1, longest: Math.max(state.longest, state.current + 1) } : { current: 0, longest: state.longest }, { current: 0, longest: 0 }).longest;
  const matchesAboveBaseline = aboveBaseline.filter(Boolean).length;
  const matchesAboveElevatedThreshold = aboveElevated.filter(Boolean).length;
  const shareAboveBaseline = values.length ? matchesAboveBaseline / values.length : null;
  const shareAboveElevatedThreshold = values.length ? matchesAboveElevatedThreshold / values.length : null;
  const rules = source.methodology.signalPersistence;
  const currentMean = mean(values);
  const level = shareAboveBaseline === 1 && shareAboveElevatedThreshold >= 0.8 && currentMean >= baseline * 1.5 ? "very-high" : shareAboveBaseline >= rules.highMinimumShareAboveBaseline && shareAboveElevatedThreshold >= rules.highMinimumShareAboveElevatedThreshold ? "high" : shareAboveBaseline >= rules.mediumMinimumShareAboveBaseline ? "medium" : "low";
  return { baseline: round(baseline), elevatedThreshold: round(elevatedThreshold), elevatedThresholdMultiplier, matchesAboveBaseline, shareAboveBaseline: round(shareAboveBaseline), matchesAboveElevatedThreshold, shareAboveElevatedThreshold: round(shareAboveElevatedThreshold), longestRun: longestRun(aboveBaseline), sampleSize: values.length, level };
}

function metricAgreement(historical, current, floor = 0.1) {
  if (!Number.isFinite(historical) || !Number.isFinite(current)) return { score: null, level: "unknown", difference: null, relativeDifference: null };
  const relativeDifference = Math.abs(current - historical) / Math.max(Math.abs(historical), Math.abs(current), floor);
  const score = Math.max(0, 1 - relativeDifference);
  return { score: round(score, 4), level: score >= 0.9 ? "very-high" : score >= 0.8 ? "high" : score >= 0.6 ? "medium" : "low", difference: round(current - historical), relativeDifference: round(relativeDifference, 4) };
}

function signalStability({ historical, current, historicalSampleSize = 38, currentValues = [], direction = "neutral" }) {
  const policy = source.methodology.signalStability;
  const agreement = metricAgreement(historical, current);
  const currentSampleSize = currentValues.length;
  const historicalSampleReliability = historicalSampleSize / (historicalSampleSize + policy.equivalentMatches);
  const currentSampleReliability = currentSampleSize / (currentSampleSize + policy.equivalentMatches);
  const directionalFlags = currentValues.map(value => direction === "suppression" ? value <= historical : direction === "elevation" ? value >= historical : Math.abs(value - historical) / Math.max(Math.abs(historical), 0.1) <= 0.2);
  const persistence = directionalFlags.length ? directionalFlags.filter(Boolean).length / directionalFlags.length : 0;
  const score = agreement.score == null ? null : policy.agreementWeight * agreement.score + policy.persistenceWeight * persistence + policy.historicalSampleReliabilityWeight * historicalSampleReliability + policy.currentSampleReliabilityWeight * currentSampleReliability;
  const level = score == null ? "unknown" : score >= policy.veryHighMinimumScore ? "very-high" : score >= policy.highMinimumScore ? "high" : score >= policy.mediumMinimumScore ? "medium" : "low";
  const confidence = currentSampleSize >= 8 ? "high" : currentSampleSize >= 5 && historicalSampleSize >= 30 ? "medium-high" : currentSampleSize >= 3 ? "medium" : "low";
  return {
    score: score == null ? null : round(score, 4), level, direction,
    historicalCurrentAgreement: agreement,
    persistence: { shareInSignalDirection: round(persistence, 4), matchesInSignalDirection: directionalFlags.filter(Boolean).length, sampleSize: currentSampleSize },
    historicalSampleReliability: round(historicalSampleReliability, 4),
    currentSampleReliability: round(currentSampleReliability, 4),
    confidence,
    formula: `${policy.agreementWeight}*agreement + ${policy.persistenceWeight}*directionalPersistence + ${policy.historicalSampleReliabilityWeight}*historicalSampleReliability + ${policy.currentSampleReliabilityWeight}*currentSampleReliability`
  };
}

function shooterStructure(playerDistribution, sampleSize) {
  const policy = source.methodology.shooterStructure;
  const candidates = playerDistribution.filter(player => player.shots > 0);
  const topShotsPer90 = Math.max(0, ...candidates.map(player => player.shotsPer90 || 0));
  const topSotPer90 = Math.max(0, ...candidates.map(player => player.shotsOnTargetPer90 || 0));
  const topShotShare = Math.max(0, ...candidates.map(player => player.shotsShare || 0));
  const topSotShare = Math.max(0, ...candidates.map(player => player.shotsOnTargetShare || 0));
  const scoreTier = (score, hasVolume, secondaryMinimumScore = policy.secondaryMinimumScore) => !hasVolume ? "low-volume" : score >= policy.primaryMinimumScore ? "primary" : score >= policy.coPrimaryMinimumScore ? "co-primary" : score >= secondaryMinimumScore ? "secondary" : "occasional";
  const tiers = candidates.map(player => {
    const historicalShots90 = player.historicalShots90;
    const historicalSot90 = player.historicalShotsOnTarget90;
    const shotAgreement = metricAgreement(historicalShots90, player.shotsPer90, 0.4).score;
    const sotAgreement = metricAgreement(historicalSot90, player.shotsOnTargetPer90, 0.15).score;
    const representation = Math.min(1, player.appearances / Math.max(1, sampleSize));
    const shotScore = 0.35 * ((player.shotsShare || 0) / Math.max(topShotShare, 0.001)) + 0.2 * ((player.shotsPer90 || 0) / Math.max(topShotsPer90, 0.001)) + 0.15 * Math.min(1, (historicalShots90 || 0) / 4) + 0.15 * representation + 0.15 * (shotAgreement ?? 0.5);
    const sotScore = 0.35 * ((player.shotsOnTargetShare || 0) / Math.max(topSotShare, 0.001)) + 0.2 * ((player.shotsOnTargetPer90 || 0) / Math.max(topSotPer90, 0.001)) + 0.15 * Math.min(1, (historicalSot90 || 0) / 2) + 0.15 * representation + 0.15 * (sotAgreement ?? 0.5);
    return {
      playerId: player.playerId, name: player.name,
      shotTier: { score: round(shotScore, 4), tier: scoreTier(shotScore, player.shots > 0), confidence: player.minutes >= 270 ? "medium" : "medium-low" },
      sotTier: { score: round(sotScore, 4), tier: scoreTier(sotScore, player.shotsOnTarget > 0, policy.sotSecondaryMinimumScore ?? policy.secondaryMinimumScore), confidence: player.minutes >= 270 ? "medium" : "medium-low" },
      evidence: { shots: player.shots, shotsOnTarget: player.shotsOnTarget, shotsShare: player.shotsShare, shotsOnTargetShare: player.shotsOnTargetShare, shotsPer90: player.shotsPer90, shotsOnTargetPer90: player.shotsOnTargetPer90, appearances: player.appearances, historicalShots90, historicalShotsOnTarget90: historicalSot90 }
    };
  });
  const primaryCluster = tiers.filter(player => player.shotTier.tier === "primary");
  const primaryShare = primaryCluster.reduce((total, player) => total + (player.evidence.shotsShare || 0), 0);
  return {
    type: primaryCluster.length >= 2 ? "multi-primary" : primaryCluster.length === 1 ? "one-primary" : "distributed",
    primaryCount: primaryCluster.length,
    primaryShare: round(primaryShare, 4),
    primaryPlayerIds: primaryCluster.map(player => player.playerId),
    confidence: sampleSize >= 5 ? "medium" : "low",
    method: "continuous-current-share-per90-history-representation-agreement-score",
    playerTiers: tiers
  };
}

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

function matchupRoleResolution(player) {
  const role = matchupRole(player);
  if (!player) return { role, source: "unavailable", explicit: false };
  const detail = String(player.detailedRole || "").trim().toLocaleLowerCase("it");
  const genericRole = String(player.role || "").trim().toLocaleLowerCase("it");
  const generic = !detail || detail === genericRole || ["difensore", "centrocampista", "attaccante"].includes(detail);
  return { role, source: generic ? "generic-role-fallback" : "detailed-role", explicit: Boolean(role) && !generic };
}

function distributionShape(values) {
  const positive = values.filter(value => Number.isFinite(value) && value > 0);
  const total = sumAvailable(positive) || 0;
  const shares = total ? positive.map(value => value / total).sort((a, b) => b - a) : [];
  const topShooterShare = shares[0] ?? null;
  const topTwoShooterShare = shares.length ? shares.slice(0, 2).reduce((sum, value) => sum + value, 0) : null;
  const concentrationIndex = shares.length ? shares.reduce((sum, value) => sum + value ** 2, 0) : null;
  const secondaryShooterShare = topShooterShare == null ? null : 1 - topShooterShare;
  const secondaryShooters = Math.max(0, shares.length - 1);
  return {
    topShooterShare: topShooterShare == null ? null : round(topShooterShare, 4),
    topTwoShooterShare: topTwoShooterShare == null ? null : round(topTwoShooterShare, 4),
    concentrationIndex: concentrationIndex == null ? null : round(concentrationIndex, 4),
    primaryLevel: topShooterShare >= 0.22 ? "high" : topShooterShare >= 0.15 ? "medium" : "low",
    secondaryShooterShare: secondaryShooterShare == null ? null : round(secondaryShooterShare, 4),
    secondaryShooters,
    secondaryLevel: secondaryShooterShare >= 0.65 && secondaryShooters >= 6 ? "high" : secondaryShooterShare >= 0.5 && secondaryShooters >= 4 ? "medium" : "low"
  };
}

function roleDistributionBreadth(valuesByRole, sampleSize, confidence = "low") {
  const roles = Object.keys(valuesByRole);
  const total = sumAvailable(Object.values(valuesByRole)) || 0;
  const shares = Object.fromEntries(roles.map(role => [role, total ? valuesByRole[role] / total : 0]));
  const activeRoles = roles.filter(role => valuesByRole[role] > 0).length;
  const rawHhi = total ? roles.reduce((sum, role) => sum + shares[role] ** 2, 0) : null;
  const normalizedHhi = rawHhi == null ? null : Math.max(0, (rawHhi - 1 / roles.length) / (1 - 1 / roles.length));
  const score = normalizedHhi == null ? null : round(((1 - normalizedHhi) * 0.7 + activeRoles / roles.length * 0.3) * 100, 1);
  return { score, level: score >= 70 ? "high" : score >= 55 ? "medium" : "low", activeRoles, topRoleShare: total ? round(Math.max(...Object.values(shares)), 4) : null, concentrationIndex: normalizedHhi == null ? null : round(normalizedHhi, 4), sampleSize, confidence, method: "normalized-role-HHI-plus-active-role-coverage" };
}

function roleShotDistribution(rows, playerField = "opponentPlayers") {
  const roles = ["CF", "W", "AM", "CM", "DM", "FB", "CB"];
  const shotsByRole = Object.fromEntries(roles.map(role => [role, 0]));
  const shotsOnTargetByRole = Object.fromEntries(roles.map(role => [role, 0]));
  const playerTotals = new Map();
  const uniqueShootersByRole = Object.fromEntries(roles.map(role => [role, new Set()]));
  const matchesRepresentedByRole = Object.fromEntries(roles.map(role => [role, new Set()]));
  const sotMatchesRepresentedByRole = Object.fromEntries(roles.map(role => [role, new Set()]));
  let mappedShots = 0, unmappedShots = 0;
  const unresolvedParticipants = new Map();
  const perMatchShooters = [];
  const shooterConcentrations = [];
  for (const row of rows) {
    const playerRows = row[playerField] || [];
    const shooters = playerRows.filter(stat => stat.shots > 0);
    perMatchShooters.push(shooters.length);
    const matchShots = sumAvailable(shooters.map(stat => stat.shots)) || 0;
    const rawHhi = matchShots ? shooters.reduce((total, stat) => total + (stat.shots / matchShots) ** 2, 0) : null;
    const minimumHhi = shooters.length ? 1 / shooters.length : null;
    shooterConcentrations.push(rawHhi == null ? null : shooters.length === 1 ? 1 : (rawHhi - minimumHhi) / (1 - minimumHhi));
    for (const stat of playerRows) {
      const rosterPlayer = players.get(stat.playerId);
      const roleResolution = matchupRoleResolution(rosterPlayer);
      const current = playerTotals.get(stat.playerId) || { playerId: stat.playerId, name: rosterPlayer?.name || stat.player || stat.playerId, role: roleResolution.role, roleResolution, shots: 0, shotsOnTarget: 0, minutes: 0, appearances: 0 };
      current.shots += stat.shots || 0;
      current.shotsOnTarget += stat.shotsOnTarget || 0;
      current.minutes += stat.minutes || 0;
      current.appearances += 1;
      playerTotals.set(stat.playerId, current);
      if (!rosterPlayer) unresolvedParticipants.set(stat.playerId || stat.player, { playerId: stat.playerId || null, name: stat.player || stat.playerId, shots: (unresolvedParticipants.get(stat.playerId || stat.player)?.shots || 0) + (stat.shots || 0), shotsOnTarget: (unresolvedParticipants.get(stat.playerId || stat.player)?.shotsOnTarget || 0) + (stat.shotsOnTarget || 0) });
      if (!(stat.shots > 0)) continue;
      const role = matchupRole(players.get(stat.playerId));
      if (role) {
        shotsByRole[role] += stat.shots;
        shotsOnTargetByRole[role] += stat.shotsOnTarget || 0;
        uniqueShootersByRole[role].add(stat.playerId || stat.player);
        matchesRepresentedByRole[role].add(row.matchId);
        if (stat.shotsOnTarget > 0) sotMatchesRepresentedByRole[role].add(row.matchId);
        mappedShots += stat.shots;
      } else unmappedShots += stat.shots;
    }
  }
  const shares = Object.fromEntries(roles.map(role => [role, mappedShots ? round(shotsByRole[role] / mappedShots, 4) : null]));
  const mappedSot = Object.values(shotsOnTargetByRole).reduce((total, value) => total + value, 0);
  const sotShares = Object.fromEntries(roles.map(role => [role, mappedSot ? round(shotsOnTargetByRole[role] / mappedSot, 4) : null]));
  const hhi = mappedShots ? roles.reduce((total, role) => total + shares[role] ** 2, 0) : null;
  const normalizedHhi = hhi == null ? null : round((hhi - 1 / roles.length) / (1 - 1 / roles.length), 4);
  const shooterConcentrationIndex = round(mean(shooterConcentrations.filter(Number.isFinite)), 4);
  const activeRoles = roles.filter(role => shotsByRole[role] > 0).length;
  const breadthScore = normalizedHhi == null || shooterConcentrationIndex == null ? null : round((1 - (normalizedHhi + shooterConcentrationIndex) / 2) * 100, 1);
  const playerDistribution = [...playerTotals.values()].filter(player => player.shots > 0 || player.shotsOnTarget > 0).map(player => ({
    ...player,
    historicalShots90: players.get(player.playerId)?.previousSeason?.totals?.per90?.shots ?? null,
    historicalShotsOnTarget90: players.get(player.playerId)?.previousSeason?.totals?.per90?.shotsOnTarget ?? null,
    historicalMinutes: players.get(player.playerId)?.previousSeason?.totals?.minutes ?? 0,
    shotsShare: mappedShots && player.shots ? round(player.shots / mappedShots, 4) : 0,
    shotsOnTargetShare: mappedSot && player.shotsOnTarget ? round(player.shotsOnTarget / mappedSot, 4) : 0,
    shotsPer90: player.minutes ? round(player.shots * 90 / player.minutes, 2) : null,
    shotsOnTargetPer90: player.minutes ? round(player.shotsOnTarget * 90 / player.minutes, 2) : null
  })).sort((left, right) => right.shots - left.shots || left.name.localeCompare(right.name, "it"));
  const topShooter = playerDistribution[0] || null;
  const totalPlayerShots = playerDistribution.reduce((total, player) => total + player.shots, 0);
  const explicitRoleShots = playerDistribution.filter(player => player.roleResolution?.explicit).reduce((total, player) => total + player.shots, 0);
  const genericRoleFallbackShots = playerDistribution.filter(player => player.roleResolution?.source === "generic-role-fallback").reduce((total, player) => total + player.shots, 0);
  const structure = shooterStructure(playerDistribution, rows.length);
  const shape = distributionShape(playerDistribution.map(player => player.shots));
  const topShooterShare = shape.topShooterShare;
  const topTwoShooterShare = shape.topTwoShooterShare;
  const aggregateShooterHhi = shape.concentrationIndex;
  const secondaryShooters = playerDistribution.filter(player => player.playerId !== topShooter?.playerId && player.shots > 0);
  const secondaryShare = shape.secondaryShooterShare;
  const roleDetails = Object.fromEntries(roles.map(role => [role, {
    shots: shotsByRole[role], shotsOnTarget: shotsOnTargetByRole[role],
    shotShare: shares[role], shotsOnTargetShare: sotShares[role],
    shotOnTargetRate: shotsByRole[role] ? round(shotsOnTargetByRole[role] / shotsByRole[role], 4) : null,
    uniqueShooters: uniqueShootersByRole[role].size,
    matchesRepresented: matchesRepresentedByRole[role].size,
    sotMatchesRepresented: sotMatchesRepresentedByRole[role].size
  }]));
  const shotRoleBreadth = roleDistributionBreadth(shotsByRole, rows.length, rows.length >= 5 ? "medium" : "low");
  const sotRoleBreadth = roleDistributionBreadth(shotsOnTargetByRole, rows.length, rows.length >= 5 ? "medium" : "low");
  return {
    taxonomy: roles,
    shotsByRole,
    shotsOnTargetByRole,
    shareByRole: shares,
    shotsOnTargetShareByRole: sotShares,
    roleDetails,
    uniqueShootersByRole: Object.fromEntries(roles.map(role => [role, uniqueShootersByRole[role].size])),
    matchesRepresentedByRole: Object.fromEntries(roles.map(role => [role, matchesRepresentedByRole[role].size])),
    mappedShots,
    unmappedShots,
    roleCoverage: { totalPlayerShots, explicitRoleShots, genericRoleFallbackShots, mappedRoleShots: mappedShots, explicitShare: totalPlayerShots ? round(explicitRoleShots / totalPlayerShots, 4) : null, unresolvedParticipants: [...unresolvedParticipants.values()] },
    sampleSize: rows.length,
    sourceType: "derived-from-player-match-stats-and-roster-roles",
    confidence: rows.length >= 8 ? "medium" : "low",
    modelStatus: "evidence-only",
    roleConcentrationIndex: { method: "normalized-HHI", value: normalizedHhi, range: [0, 1], interpretation: "0 = volume distribuito uniformemente; 1 = volume concentrato su un solo ruolo", modelWeight: 0 },
    shooterConcentrationIndex: { method: "aggregate-HHI", value: aggregateShooterHhi, modelWeight: 0 },
    primaryShooterConcentration: { playerId: topShooter?.playerId || null, playerName: topShooter?.name || null, topShooterShare, topTwoShooterShare, concentrationIndex: aggregateShooterHhi, level: shape.primaryLevel, sampleSize: rows.length, confidence: rows.length >= 8 ? "medium-high" : "medium" },
    secondaryShooterBreadth: { secondaryShooterShare: secondaryShare, secondaryShooters: secondaryShooters.length, level: shape.secondaryLevel, sampleSize: rows.length, confidence: rows.length >= 8 ? "medium" : "medium-low" },
    shooterStructure: structure,
    playerDistribution,
    shotDistributionBreadth: { score: breadthScore, uniqueShootersPerMatch: round(mean(perMatchShooters)), activeRoles, roleConcentrationIndex: normalizedHhi, shooterConcentrationIndex, primaryShooterShare: topShooterShare, secondaryShooterShare: secondaryShare, sampleSize: rows.length, confidence: rows.length >= 8 ? "medium" : "low", modelStatus: "outsider-evidence-only" },
    roleShotDistributionBreadth: shotRoleBreadth,
    roleSotDistributionBreadth: sotRoleBreadth,
    sotRoleDistribution: { taxonomy: roles, shotsByRole, shotsOnTargetByRole, shareOfShotsByRole: shares, shareOfSotByRole: sotShares, roleDetails, mappedShotsOnTarget: mappedSot, sampleSize: rows.length, confidence: rows.length >= 5 ? "medium" : "low", sourceType: "derived-from-player-match-stats-and-roster-roles", breadth: sotRoleBreadth, modelStatus: "separate-sot-evidence" }
  };
}

function historicalDiscipline(teamId, competition = "serie-a") {
  const rows = (historicalMatchesByCompetition.get(competition) || []).filter(match => match.homeTeam.slug === teamId || match.awayTeam.slug === teamId);
  const own = rows.map(match => match.homeTeam.slug === teamId ? match.teamStats.home : match.teamStats.away);
  const opponents = rows.map(match => match.homeTeam.slug === teamId ? match.teamStats.away : match.teamStats.home);
  return { matches: rows.length, foulsCommittedPerGame: round(mean(own.map(row => row.fouls))), foulsWonPerGame: round(mean(opponents.map(row => row.fouls))), yellowCardsPerGame: round(mean(own.map(row => row.yellowCards))) };
}

function buildProfile(config) {
  const teamId = config.teamId;
  const historicalVolume = volumeProfiles.get(teamId) || crossCompetitionVolumeProfile(config);
  const historicalStyle = styleProfiles.get(teamId);
  const team = teams.get(teamId);
  if (!historicalVolume || !historicalStyle || !team) throw new Error(`${teamId}: baseline storica o squadra mancante`);
  const currentMatches = matches.filter(match => match.competition === "serie-a" && match.season === source.season && match.status === "finished" && (match.homeTeam === teamId || match.awayTeam === teamId)).sort((a, b) => a.matchday - b.matchday);
  const rows = currentMatches.map(match => {
    const side = match.homeTeam === teamId ? "home" : "away";
    const opponentSide = side === "home" ? "away" : "home";
    return { matchId: match.id, venue: side, opponentTeamId: match[`${opponentSide}Team`], own: match.teamStats?.[side] || null, opponent: match.teamStats?.[opponentSide] || null, ownPlayers: match.playerStats?.[side] || [], opponentPlayers: match.playerStats?.[opponentSide] || [], goalsFor: side === "home" ? match.score.home : match.score.away, goalsAgainst: side === "home" ? match.score.away : match.score.home };
  });
  if (rows.some(row => !row.own || !row.opponent)) throw new Error(`${teamId}: statistiche squadra 2026/27 incomplete`);
  const values = key => rows.map(row => row[key.split(".")[0]][key.split(".")[1]]).filter(Number.isFinite);
  const shotsAllowedValues = values("opponent.shots");
  const sotAllowedValues = values("opponent.shotsOnTarget");
  const shotsAllowed = summary(shotsAllowedValues), sotAllowed = summary(sotAllowedValues);
  const robustShots = robustUpperMean(shotsAllowedValues), robustSot = robustUpperMean(sotAllowedValues);
  const historicalShotsAllowed = historicalVolume.venues.overall.totalShots.against.mean;
  const historicalSotAllowed = historicalVolume.venues.overall.shotsOnTarget.against.mean;
  const historicalPossessionPct = Number.isFinite(historicalStyle.summary.possessionPct) ? historicalStyle.summary.possessionPct : historicalVolume.possessionPct;
  const shrunkShots = shrink(historicalShotsAllowed, robustShots.value, rows.length);
  const shrunkSot = shrink(historicalSotAllowed, robustSot.value, rows.length);
  const shotsPersistence = signalPersistence(shotsAllowedValues, historicalShotsAllowed);
  const sotPersistence = signalPersistence(sotAllowedValues, historicalSotAllowed);
  const historicalOpponentShotOnTargetRate = historicalSotAllowed / historicalShotsAllowed;
  const currentOpponentShotOnTargetRate = sumAvailable(sotAllowedValues) / sumAvailable(shotsAllowedValues);
  const shrunkOpponentShotOnTargetRate = shrink(historicalOpponentShotOnTargetRate, currentOpponentShotOnTargetRate, rows.length);
  const locationRows = config.shotLocationEvidence.filter(entry => currentMatches.some(match => match.id === entry.matchId));
  const insideBox = locationRows.length ? locationRows.reduce((total, entry) => total + entry.insideBox, 0) : null;
  const outsideBox = locationRows.length ? locationRows.reduce((total, entry) => total + entry.outsideBox, 0) : null;
  const insideBoxShare = insideBox != null && outsideBox != null && insideBox + outsideBox ? insideBox / (insideBox + outsideBox) : null;
  const insideBoxShotsAllowedPerMatch = locationRows.length ? insideBox / locationRows.length : null;
  const shotsForRoleDistribution = roleShotDistribution(rows, "ownPlayers");
  const shotsAllowedRoleDistribution = roleShotDistribution(rows, "opponentPlayers");
  const sotForRoleDistribution = shotsForRoleDistribution.sotRoleDistribution;
  const sotAllowedRoleDistribution = shotsAllowedRoleDistribution.sotRoleDistribution;
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
    effectiveMaxBoostPct: status === "active" ? round(item.maxBoostPct * confidenceWeight(item.confidence) * maturity * (shotsVolatility === "high" ? 0.85 : shotsVolatility === "medium" ? 0.93 : 1), 2) : 0,
    effectiveMaxSotBoostPct: status === "active" ? round((item.maxSotBoostPct ?? item.maxBoostPct) * confidenceWeight(item.confidence) * maturity * (sotVolatility === "high" ? 0.85 : sotVolatility === "medium" ? 0.93 : 1), 2) : 0
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
    possessionPct: shrink(historicalPossessionPct, activeEra.possessionPct, activeEra.matches, source.methodology.tacticalPriorEquivalentMatchesAfterCoachChange),
    modelStatus: "diagnostic-prior-not-a-new-baseline"
  } : null;
  const current = {
    matches: rows.length,
    record: { wins: rows.filter(row => row.goalsFor > row.goalsAgainst).length, draws: rows.filter(row => row.goalsFor === row.goalsAgainst).length, losses: rows.filter(row => row.goalsFor < row.goalsAgainst).length, points: rows.reduce((total, row) => total + (row.goalsFor > row.goalsAgainst ? 3 : row.goalsFor === row.goalsAgainst ? 1 : 0), 0), goalsFor: rows.reduce((total, row) => total + row.goalsFor, 0), goalsAgainst: rows.reduce((total, row) => total + row.goalsAgainst, 0), cleanSheets: rows.filter(row => row.goalsAgainst === 0).length, failedToScore: rows.filter(row => row.goalsFor === 0).length },
    shotsForPerGame: round(mean(values("own.shots"))), shotsOnTargetForPerGame: round(mean(values("own.shotsOnTarget"))), shotOnTargetRate: round(sumAvailable(values("own.shotsOnTarget")) / sumAvailable(values("own.shots"))), cornersForPerGame: round(mean(values("own.corners"))), possessionPct: round(mean(possession)), passAccuracyPct: round(mean(values("own.passAccuracyPct")))
  };
  const shotsForValues = values("own.shots");
  const sotForValues = values("own.shotsOnTarget");
  const cornersForValues = values("own.corners");
  const historicalShotsFor = historicalVolume.venues.overall.totalShots.for.mean;
  const historicalSotFor = historicalVolume.venues.overall.shotsOnTarget.for.mean;
  const historicalCornersFor = historicalVolume.venues.overall.wonCorners.for.mean;
  const robustShotsFor = robustUpperMean(shotsForValues);
  const robustSotFor = robustUpperMean(sotForValues);
  const offensiveShotsShrinkage = shrink(historicalShotsFor, robustShotsFor.value, rows.length);
  const offensiveSotShrinkage = shrink(historicalSotFor, robustSotFor.value, rows.length);
  const cornerProductionShrinkage = shrink(historicalCornersFor, robustUpperMean(cornersForValues).value, rows.length);
  const offensiveShotsPersistence = signalPersistence(shotsForValues, historicalShotsFor);
  const offensiveSotPersistence = signalPersistence(sotForValues, historicalSotFor);
  const cornerProductionPersistence = signalPersistence(cornersForValues, historicalCornersFor);
  const leagueShotPossessionMean = mean(leaguePossessionShotRates);
  const leagueShotPossessionSd = Math.sqrt(mean(leaguePossessionShotRates.map(value => (value - leagueShotPossessionMean) ** 2)));
  const transitionRows = rows.map(row => {
    const shotsPer10PctPossession = row.opponent.possessionPct > 0 ? row.opponent.shots / (row.opponent.possessionPct / 10) : null;
    return { matchId: row.matchId, opponentTeamId: row.opponentTeamId, opponentPossessionPct: row.opponent.possessionPct, opponentShots: row.opponent.shots, shotsPer10PctPossession: round(shotsPer10PctPossession), leagueNormalizedZ: leagueShotPossessionSd ? round((shotsPer10PctPossession - leagueShotPossessionMean) / leagueShotPossessionSd) : null };
  });
  const transitionMean = mean(transitionRows.map(row => row.shotsPer10PctPossession));
  const ownPossessionShotRows = rows.map(row => ({ matchId: row.matchId, possessionPct: row.own.possessionPct, shots: row.own.shots, shotsPer10PctPossession: row.own.possessionPct > 0 ? round(row.own.shots / (row.own.possessionPct / 10)) : null }));
  const ownPossessionShotMean = mean(ownPossessionShotRows.map(row => row.shotsPer10PctPossession).filter(Number.isFinite));
  const shotAccuracyRates = rows.map(row => row.own.shots > 0 ? row.own.shotsOnTarget / row.own.shots : null).filter(Number.isFinite);
  const shotAccuracyStats = summary(shotAccuracyRates);
  const shotAccuracyCoefficientOfVariation = shotAccuracyStats.mean ? shotAccuracyStats.standardDeviation / shotAccuracyStats.mean : null;
  const shotAccuracyVolatility = shotAccuracyCoefficientOfVariation == null ? "unavailable" : shotAccuracyCoefficientOfVariation >= 0.35 ? "high" : shotAccuracyCoefficientOfVariation >= 0.22 ? "medium" : "low";
  const xgForRows = rows.filter(row => Number.isFinite(row.own.expectedGoals));
  const xgAgainstRows = rows.filter(row => Number.isFinite(row.opponent.expectedGoals));
  const aggregateShotQuality = (selectedRows, side) => {
    const xg = sumAvailable(selectedRows.map(row => row[side].expectedGoals));
    const shots = sumAvailable(selectedRows.map(row => row[side].shots));
    const sot = sumAvailable(selectedRows.map(row => row[side].shotsOnTarget));
    return { xg: round(xg), shots, shotsOnTarget: sot, xgPerShot: shots ? round(xg / shots, 4) : null, aggregateXgPerSot: sot ? round(xg / sot, 4) : null, coverageMatches: selectedRows.length, totalMatches: rows.length, coverage: rows.length ? round(selectedRows.length / rows.length, 3) : 0, confidence: selectedRows.length === rows.length && rows.length >= 5 ? "medium" : "low", sourceType: "derived-from-team-xg-and-shot-totals", caveat: "xG/SOT e un rapporto aggregato: il dataset non attribuisce l'xG ai soli tiri nello specchio." };
  };
  const gameStateVolume = { status: config.gameStateVolumeInflation?.status || "inactive", confidence: config.gameStateVolumeInflation?.confidence || "low", goalTimestampsAvailable: rows.every(row => currentMatches.find(match => match.id === row.matchId)?.scorers?.every(scorer => Number.isFinite(scorer.minute))), shotTimestampsAvailable: false, tied: null, leading: null, trailing: null, modelEffect: "confidence-only-no-volume-adjustment", reason: "I minuti dei gol sono disponibili, ma i tiri non hanno timestamp: impossibile attribuire correttamente il volume agli stati tied/leading/trailing." };
  const shotQualityFor = aggregateShotQuality(xgForRows, "own");
  const shotQualityLeagueRelative = Number.isFinite(shotQualityFor.xgPerShot) && Number.isFinite(leagueXgPerShot) ? shotQualityFor.xgPerShot / leagueXgPerShot - 1 : null;
  const offensiveShotQuality = { ...shotQualityFor, leagueXgPerShot: leagueXgPerShot == null ? null : round(leagueXgPerShot, 4), leagueRelative: shotQualityLeagueRelative == null ? null : round(shotQualityLeagueRelative, 4), leagueSample: { matches: leagueXgShotRows.length / 2, teamMatchRows: leagueXgShotRows.length }, level: shotQualityLeagueRelative == null ? "unknown" : shotQualityLeagueRelative >= 0.2 ? "high" : shotQualityLeagueRelative >= 0.05 ? "elevated" : shotQualityLeagueRelative <= -0.1 ? "low" : "normal", status: xgForRows.length === rows.length ? "active" : "watch", confidence: xgForRows.length === rows.length ? "medium-high" : "low", modelEffect: "quality-context-only-separate-from-shot-and-sot-volume" };
  const maxShotRow = rows.reduce((best, row) => !best || row.own.shots > best.own.shots ? row : best, null);
  const expandedDistribution = maxShotRow ? roleShotDistribution([maxShotRow], "ownPlayers") : null;
  const volumeExpansionBreadth = {
    level: expandedDistribution && expandedDistribution.playerDistribution.length >= 8 && expandedDistribution.primaryShooterConcentration.topShooterShare <= 0.22 ? "high" : expandedDistribution && expandedDistribution.playerDistribution.length >= 5 ? "medium" : "low",
    status: config.offensiveSignals?.volumeExpansionBreadth?.status || "inactive",
    confidence: config.offensiveSignals?.volumeExpansionBreadth?.confidence || "low",
    matchId: maxShotRow?.matchId || null,
    teamShots: maxShotRow?.own.shots ?? null,
    centralMedian: summary(shotsForValues).median,
    expansionAboveMedian: maxShotRow ? round(maxShotRow.own.shots - summary(shotsForValues).median) : null,
    uniqueShooters: expandedDistribution?.playerDistribution.length ?? null,
    topShooterShare: expandedDistribution?.primaryShooterConcentration.topShooterShare ?? null,
    secondaryShooterShare: expandedDistribution?.secondaryShooterBreadth.secondaryShooterShare ?? null,
    modelEffect: "allocation-shape-only-no-independent-volume-multiplier"
  };
  const possessionShrinkage = shrink(historicalPossessionPct, current.possessionPct, rows.length);
  const defensiveShare = 1 - possessionShrinkage.value / 100;
  const defensiveLeagueRelative = defensiveShare / 0.5 - 1;
  const defensiveExposurePolicy = config.defensiveExposurePolicy || { enabled: false, maxImpactPct: 0, confidence: "low" };
  const defensiveExposureFactor = defensiveExposurePolicy.enabled ? Math.max(0.97, Math.min(1.03, 1 + defensiveLeagueRelative * defensiveExposurePolicy.maxImpactPct / 100 * confidenceWeight(defensiveExposurePolicy.confidence) * maturity)) : 1;
  const historicalCompetition = config.crossCompetitionHistoricalBaseline?.enabled ? config.crossCompetitionHistoricalBaseline.competitionId : "serie-a";
  const historicalDisciplineValues = historicalDiscipline(teamId, historicalCompetition);
  const currentDiscipline = { matches: rows.length, foulsCommitted: sumAvailable(values("own.fouls")), foulsCommittedPerGame: round(mean(values("own.fouls"))), foulsWon: sumAvailable(values("opponent.fouls")), foulsWonPerGame: round(mean(values("opponent.fouls"))), yellowCards: sumAvailable(values("own.yellowCards")), yellowCardsPerGame: round(mean(values("own.yellowCards"))), straightRedCards: sumAvailable(values("own.straightRedCards")) };
  currentDiscipline.foulsCommittedDistribution = summary(values("own.fouls"));
  currentDiscipline.foulsWonDistribution = summary(values("opponent.fouls"));
  currentDiscipline.yellowCardsDistribution = summary(values("own.yellowCards"));
  const shrunkFouls = shrink(historicalDisciplineValues.foulsCommittedPerGame, currentDiscipline.foulsCommittedPerGame, rows.length);
  const shrunkFoulsWon = shrink(historicalDisciplineValues.foulsWonPerGame, currentDiscipline.foulsWonPerGame, rows.length);
  const shrunkYellows = shrink(historicalDisciplineValues.yellowCardsPerGame, currentDiscipline.yellowCardsPerGame, rows.length);
  const disciplineRatio = 0.6 * (shrunkFouls.value / historicalDisciplineValues.foulsCommittedPerGame) + 0.4 * (shrunkYellows.value / historicalDisciplineValues.yellowCardsPerGame);
  const disciplineAgreementScore = round(Math.max(0, 1 - mean([
    Math.abs(currentDiscipline.foulsCommittedPerGame - historicalDisciplineValues.foulsCommittedPerGame) / historicalDisciplineValues.foulsCommittedPerGame,
    Math.abs(currentDiscipline.foulsWonPerGame - historicalDisciplineValues.foulsWonPerGame) / historicalDisciplineValues.foulsWonPerGame,
    Math.abs(currentDiscipline.yellowCardsPerGame - historicalDisciplineValues.yellowCardsPerGame) / historicalDisciplineValues.yellowCardsPerGame
  ])));
  const disciplineAgreement = disciplineAgreementScore >= 0.85 ? "high" : disciplineAgreementScore >= 0.65 ? "medium" : "low";
  const disciplineMetricSignals = {
    foulsCommitted: { historicalCurrentAgreement: metricAgreement(historicalDisciplineValues.foulsCommittedPerGame, currentDiscipline.foulsCommittedPerGame), signalStability: signalStability({ historical: historicalDisciplineValues.foulsCommittedPerGame, current: currentDiscipline.foulsCommittedPerGame, historicalSampleSize: historicalDisciplineValues.matches, currentValues: values("own.fouls"), direction: "neutral" }) },
    foulsWon: { historicalCurrentAgreement: metricAgreement(historicalDisciplineValues.foulsWonPerGame, currentDiscipline.foulsWonPerGame), signalStability: signalStability({ historical: historicalDisciplineValues.foulsWonPerGame, current: currentDiscipline.foulsWonPerGame, historicalSampleSize: historicalDisciplineValues.matches, currentValues: values("opponent.fouls"), direction: "neutral" }) },
    yellowCards: { historicalCurrentAgreement: metricAgreement(historicalDisciplineValues.yellowCardsPerGame, currentDiscipline.yellowCardsPerGame), signalStability: signalStability({ historical: historicalDisciplineValues.yellowCardsPerGame, current: currentDiscipline.yellowCardsPerGame, historicalSampleSize: historicalDisciplineValues.matches, currentValues: values("own.yellowCards"), direction: "neutral" }) }
  };
  const duelSignal = config.disciplineSignal?.foulIntensity;
  const duelEvidenceWeight = historicalDisciplineValues.matches + rows.length > 0 ? (historicalDisciplineValues.matches + rows.length) / (historicalDisciplineValues.matches + rows.length + 12) : 0;
  const directDuelEnvironmentFactor = duelSignal?.status === "active" ? round(1 + duelSignal.directDuelMaxImpactPct / 100 * confidenceWeight(duelSignal.confidence) * duelEvidenceWeight, 4) : 1;
  const signalEntries = Object.entries(config.vulnerabilitySignals || {});
  const goalsAgainstPerGame = current.record.goalsAgainst / rows.length;
  const expectedGoalsAgainstMean = mean(values("opponent.expectedGoals"));
  const expectedGoalsAgainstPerGame = Number.isFinite(expectedGoalsAgainstMean) ? round(expectedGoalsAgainstMean) : null;
  const resultProcessGap = expectedGoalsAgainstPerGame == null ? null : round(expectedGoalsAgainstPerGame - goalsAgainstPerGame);
  const divergenceScore = resultProcessGap == null ? null : round(Math.max(0, resultProcessGap) / (1 + Math.max(0, resultProcessGap)));
  const expectedGoalsForMean = mean(values("own.expectedGoals"));
  const expectedGoalsForPerGame = Number.isFinite(expectedGoalsForMean) ? round(expectedGoalsForMean) : null;
  const goalsForPerGame = round(current.record.goalsFor / rows.length);
  const offensiveResultProcessGap = expectedGoalsForPerGame == null ? null : round(goalsForPerGame - expectedGoalsForPerGame);
  const defensiveSignalDirection = config.interactionPolicy?.direction === "suppression" ? "suppression" : "elevation";
  const defensiveMetricSignals = {
    shotsAllowed: signalStability({ historical: historicalShotsAllowed, current: shotsAllowed.mean, historicalSampleSize: historicalVolume.matches, currentValues: shotsAllowedValues, direction: defensiveSignalDirection }),
    shotsOnTargetAllowed: signalStability({ historical: historicalSotAllowed, current: sotAllowed.mean, historicalSampleSize: historicalVolume.matches, currentValues: sotAllowedValues, direction: defensiveSignalDirection })
  };
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
      possessionPct: historicalPossessionPct, passAccuracyPct: historicalStyle.summary.passSuccessPct, goalsPerGame: historicalStyle.derived.goalsPerGame,
      ...(config.crossCompetitionHistoricalBaseline?.enabled ? { crossCompetitionHistoricalBaseline: { ...config.crossCompetitionHistoricalBaseline, sourceType: historicalVolume.sourceType, directComparability: false, modelUse: "existing-shrinkage-and-confidence-only" } } : {}),
      homeAwayShotDefense: {
        home: { shotsAllowedPerGame: historicalVolume.venues.home.totalShots.against.mean, shotsOnTargetAllowedPerGame: historicalVolume.venues.home.shotsOnTarget.against.mean },
        away: { shotsAllowedPerGame: historicalVolume.venues.away.totalShots.against.mean, shotsOnTargetAllowedPerGame: historicalVolume.venues.away.shotsOnTarget.against.mean },
        modelStatus: "historical-prior-referenced-by-existing-venue-model-not-assumed-current"
      },
      discipline: { ...historicalDisciplineValues, totals: team.teamStats?.discipline || null }, attackChannels: historicalStyle.attackChannels, tacticalProfileStatus: "historical-prior"
    },
    currentSeason: current,
    offense: {
      signals: Object.fromEntries(Object.entries(config.offensiveSignals || {}).map(([key, signal]) => [key, { ...signal, season: source.season, sampleSize: rows.length, sourceType: "derived-from-observed-team-stats", modelEffect: signal.modelEffect || (signal.status === "active" ? "team-offensive-allocation" : "none") }])),
      teamShotVolume: { historicalPerGame: round(historicalShotsFor), current: summary(shotsForValues), robustCurrentPerGame: robustShotsFor.value, shrunkPerGame: offensiveShotsShrinkage.value, shrinkage: offensiveShotsShrinkage, signalPersistence: offensiveShotsPersistence, matchesAtOrAbove20: shotsForValues.filter(value => value >= 20).length, shareAtOrAbove20: round(shotsForValues.filter(value => value >= 20).length / rows.length), rawValues: shotsForValues, modelStatus: "active-through-v2-team-volume-and-allocation" },
      teamSotVolume: { historicalPerGame: round(historicalSotFor), current: summary(sotForValues), robustCurrentPerGame: robustSotFor.value, shrunkPerGame: offensiveSotShrinkage.value, shrinkage: offensiveSotShrinkage, signalPersistence: offensiveSotPersistence, rawValues: sotForValues, modelStatus: "separate-from-total-shots" },
      shotsForRoleDistribution,
      sotForRoleDistribution,
      primaryShooterConcentration: shotsForRoleDistribution.primaryShooterConcentration,
      secondaryShooterBreadth: shotsForRoleDistribution.secondaryShooterBreadth,
      shooterStructure: shotsForRoleDistribution.shooterStructure,
      playerShotAndSotTiers: shotsForRoleDistribution.shooterStructure.playerTiers,
      offensiveShotDistributionBreadth: { ...shotsForRoleDistribution.shotDistributionBreadth, level: shotsForRoleDistribution.shotDistributionBreadth.score >= 80 ? "high" : shotsForRoleDistribution.shotDistributionBreadth.score >= 65 ? "medium" : "low", status: "active", sourceType: "derived-from-current-player-match-stats" },
      offensiveSotDistributionBreadth: { ...shotsForRoleDistribution.roleSotDistributionBreadth, status: config.offensiveSignals?.sotDistributionBreadth?.status || "inactive", confidence: config.offensiveSignals?.sotDistributionBreadth?.confidence || shotsForRoleDistribution.roleSotDistributionBreadth.confidence, sourceType: "derived-from-current-player-match-stats" },
      shotAccuracyVolatility: { level: shotAccuracyVolatility, status: config.offensiveSignals?.shotAccuracyVolatility?.status || "inactive", confidence: config.offensiveSignals?.shotAccuracyVolatility?.confidence || "low", rates: shotAccuracyRates.map(value => round(value, 4)), distribution: shotAccuracyStats, coefficientOfVariation: shotAccuracyCoefficientOfVariation == null ? null : round(shotAccuracyCoefficientOfVariation, 4), sampleSize: rows.length, modelEffect: "confidence-only-separate-shot-and-sot-pipelines" },
      possessionIndependentShotCreation: { level: config.offensiveSignals?.possessionIndependentShotCreation?.level || "unclassified", status: config.offensiveSignals?.possessionIndependentShotCreation?.status || "inactive", confidence: config.offensiveSignals?.possessionIndependentShotCreation?.confidence || "low", value: round(ownPossessionShotMean), leagueMean: round(leagueShotPossessionMean), leagueRelative: round(ownPossessionShotMean / leagueShotPossessionMean - 1), metric: "shots-per-10-percentage-points-of-possession", causalClaim: false, rows: ownPossessionShotRows, sampleSize: rows.length, modelEffect: "opponent-ability-context-not-universal-boost" },
      offensiveShotQuality,
      shotVolumeCeiling: { value: Math.max(...shotsForValues), historicalMean: round(historicalShotsFor), ratioToHistoricalMean: round(Math.max(...shotsForValues) / historicalShotsFor), level: Math.max(...shotsForValues) >= historicalShotsFor * 2.5 ? "very-high" : Math.max(...shotsForValues) >= historicalShotsFor * 1.75 ? "high" : "normal", status: config.offensiveSignals?.shotVolumeCeiling?.status || "inactive", confidence: config.offensiveSignals?.shotVolumeCeiling?.confidence || "low", modelEffect: "range-and-uncertainty-only" },
      shotVolumeVolatility: { ...summary(shotsForValues), coefficientOfVariation: round(summary(shotsForValues).standardDeviation / summary(shotsForValues).mean, 4), level: volatilityLevel(summary(shotsForValues)), status: config.offensiveSignals?.shotVolumeVolatility?.status || "inactive", confidence: config.offensiveSignals?.shotVolumeVolatility?.confidence || "low", modelEffect: "confidence-and-range-only" },
      volumeExpansionBreadth,
      cbSetPieceShotParticipation: (() => {
        const explicitCentreBacks = shotsForRoleDistribution.playerDistribution.filter(player => player.role === "CB" && player.roleResolution?.explicit);
        const genericDefenderFallbacks = shotsForRoleDistribution.playerDistribution.filter(player => player.role === "CB" && player.roleResolution?.source === "generic-role-fallback");
        return { shots: explicitCentreBacks.reduce((total, player) => total + player.shots, 0), shotsOnTarget: explicitCentreBacks.reduce((total, player) => total + player.shotsOnTarget, 0), explicitPlayers: explicitCentreBacks.map(player => player.playerId), excludedGenericRoleShots: genericDefenderFallbacks.reduce((total, player) => total + player.shots, 0), excludedGenericRolePlayers: genericDefenderFallbacks.map(player => player.playerId), historicalTeamSetPieceStrength: historicalStyle.strengths?.some(item => item.id === "attaccare-sui-calci-piazzati") || false, setPieceOriginCoverage: "unavailable", status: config.offensiveSignals?.cbSetPieceShotParticipation?.status || "inactive", confidence: config.offensiveSignals?.cbSetPieceShotParticipation?.confidence || "low", modelEffect: config.offensiveSignals?.cbSetPieceShotParticipation?.status === "active" ? "existing-set-piece-allocation-proxy-only" : "none", caveat: "Solo i difensori centrali con ruolo dettagliato alimentano questo proxy; il ruolo generico Difensore e l'origine del tiro non vengono interpretati come prova di piazzato." };
      })(),
      gameStateAdjustedVolume: gameStateVolume,
      teamOffensiveAllocation: { enabled: Boolean(config.offensiveAllocationPolicy?.enabled), method: config.offensiveAllocationPolicy?.method || "inactive", currentEvidenceWeight: offensiveShotsShrinkage.currentWeight, roleWeight: config.offensiveAllocationPolicy?.roleWeight ?? 0, playerWeight: config.offensiveAllocationPolicy?.playerWeight ?? 0, setPieceWeight: config.offensiveAllocationPolicy?.setPieceWeight ?? 0, expansionBreadthWeight: config.offensiveAllocationPolicy?.expansionBreadthWeight ?? 0, factorClamp: config.offensiveAllocationPolicy?.factorClamp || [1, 1], teamShotMaxAdjustmentPct: config.offensiveAllocationPolicy?.teamShotMaxAdjustmentPct || 0, teamSotMaxAdjustmentPct: config.offensiveAllocationPolicy?.teamSotMaxAdjustmentPct || 0, cornerMaxAdjustmentPct: config.offensiveAllocationPolicy?.cornerMaxAdjustmentPct ?? config.offensiveAllocationPolicy?.teamShotMaxAdjustmentPct ?? 0, note: config.offensiveAllocationPolicy?.note || "Profilo offensivo specifico non attivo." },
      teamSetPieceOpportunityVolume: { historicalCornersPerGame: round(historicalCornersFor), currentCorners: summary(cornersForValues), shrunkCornersPerGame: cornerProductionShrinkage.value, shrinkage: cornerProductionShrinkage, signalPersistence: cornerProductionPersistence, status: config.offensiveSignals?.cornerProduction?.status || "inactive", confidence: config.offensiveSignals?.cornerProduction?.confidence || "low", sourceType: "observed-team-stats", modelStatus: config.offensiveAllocationPolicy?.enabled ? "integrated-in-allocation-budget" : "diagnostic-only" }
    },
    attackProjectionContext: {
      shots: { historicalPerGame: historicalVolume.venues.overall.totalShots.for.mean, currentPerGame: current.shotsForPerGame, shrunkPerGame: shrink(historicalVolume.venues.overall.totalShots.for.mean, current.shotsForPerGame, rows.length).value },
      shotsOnTarget: { historicalPerGame: historicalVolume.venues.overall.shotsOnTarget.for.mean, currentPerGame: current.shotsOnTargetForPerGame, shrunkPerGame: shrink(historicalVolume.venues.overall.shotsOnTarget.for.mean, current.shotsOnTargetForPerGame, rows.length).value },
      shotOnTargetRate: { current: current.shotOnTargetRate, historical: round(historicalVolume.venues.overall.shotsOnTarget.for.mean / historicalVolume.venues.overall.totalShots.for.mean), modelStatus: "diagnostic-only-separate-shot-and-sot-projections" },
      modelStatus: "existing-team-volume-engine-remains-authoritative"
    },
    shotDefense: {
      shotsAllowed: { ...shotsAllowed, historicalMean: round(historicalShotsAllowed), robustCurrentMean: robustShots.value, robustMethod: robustShots.method, upperCap: robustShots.cap, shrunkMean: shrunkShots.value, shrinkage: shrunkShots, signalPersistence: shotsPersistence, rawValues: shotsAllowedValues, outliers: rows.filter((row, index) => shotsAllowedValues[index] > robustShots.cap).map((row, index) => ({ matchId: row.matchId, value: shotsAllowedValues[rows.indexOf(row)], matchupFailure: true })) },
      shotsOnTargetAllowed: { ...sotAllowed, historicalMean: round(historicalSotAllowed), robustCurrentMean: robustSot.value, robustMethod: robustSot.method, upperCap: robustSot.cap, shrunkMean: shrunkSot.value, shrinkage: shrunkSot, signalPersistence: sotPersistence, rawValues: sotAllowedValues },
      opponentShotOnTargetRate: { historical: round(historicalOpponentShotOnTargetRate), current: round(currentOpponentShotOnTargetRate), shrunk: shrunkOpponentShotOnTargetRate.value, shrinkage: shrunkOpponentShotOnTargetRate, sampleSize: rows.length, sourceType: "derived-from-observed-team-totals", modelStatus: "diagnostic-separate-from-total-shots" },
      shotLocation: { insideBox, outsideBox, insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), insideBoxShotsAllowedPerMatch: insideBoxShotsAllowedPerMatch == null ? null : round(insideBoxShotsAllowedPerMatch), sampleSize: locationRows.length, confidence: locationRows.length ? (config.teamId === "bologna" ? "low" : "medium") : "low", sourceType: locationRows.length ? "derived" : "unavailable", verificationStatus: locationRows.length ? (locationRows.some(row => ["partial-estimate", "estimated"].includes(row.status)) ? "estimated-or-partially-verified" : "verified") : "unavailable", evidence: locationRows },
      opponentShotRoleDistribution: shotsAllowedRoleDistribution,
      shotsAllowedRoleDistribution,
      sotAllowedRoleDistribution,
      defensiveShotDistributionBreadth: { ...shotsAllowedRoleDistribution.roleShotDistributionBreadth, status: config.vulnerabilitySignals?.defensiveShotDistributionBreadth?.status || "inactive", confidence: config.vulnerabilitySignals?.defensiveShotDistributionBreadth?.confidence || shotsAllowedRoleDistribution.roleShotDistributionBreadth.confidence },
      defensiveSotDistributionBreadth: { ...shotsAllowedRoleDistribution.roleSotDistributionBreadth, status: config.vulnerabilitySignals?.defensiveSotDistributionBreadth?.status || "inactive", confidence: config.vulnerabilitySignals?.defensiveSotDistributionBreadth?.confidence || shotsAllowedRoleDistribution.roleSotDistributionBreadth.confidence },
      shotQualityProfile: { for: aggregateShotQuality(xgForRows, "own"), against: aggregateShotQuality(xgAgainstRows, "opponent"), highQualityChanceVulnerability: { level: config.vulnerabilitySignals?.highQualityChanceVulnerability?.level || "not-proven", status: config.vulnerabilitySignals?.highQualityChanceVulnerability?.status || "watch", confidence: config.vulnerabilitySignals?.highQualityChanceVulnerability?.confidence || "low", modelEffect: "none" } },
      shotPermissionProfile: { totalShotAccess: { value: shotsAllowed.mean, shrunkValue: shrunkShots.value, status: config.vulnerabilitySignals?.totalShotVulnerability?.status || "inactive", confidence: config.vulnerabilitySignals?.totalShotVulnerability?.confidence || "low" }, shotOnTargetAccess: { value: sotAllowed.mean, shrunkValue: shrunkSot.value, status: config.vulnerabilitySignals?.sotVulnerability?.status || "inactive", confidence: config.vulnerabilitySignals?.sotVulnerability?.confidence || "low" }, insideBoxAccess: { value: insideBoxShotsAllowedPerMatch == null ? null : round(insideBoxShotsAllowedPerMatch), sourceType: locationRows.length ? "derived" : "unavailable" }, highQualityShotAccess: { value: config.vulnerabilitySignals?.highQualityChanceVulnerability && xgAgainstRows.length === rows.length ? aggregateShotQuality(xgAgainstRows, "opponent").xgPerShot : null, sourceType: config.vulnerabilitySignals?.highQualityChanceVulnerability && xgAgainstRows.length === rows.length ? "derived-from-team-xg" : "unavailable", status: config.vulnerabilitySignals?.highQualityChanceVulnerability?.status || "watch", reason: "I SOT restano separati dalla qualita: l'xG/shot aggregato non dimostra da solo una vulnerabilita alle grandi occasioni." } },
      defensiveMetricSignals,
      generalShotSuppression: { level: config.vulnerabilitySignals?.generalShotSuppression?.level || "normal", status: config.vulnerabilitySignals?.generalShotSuppression?.status || "inactive", confidence: config.vulnerabilitySignals?.generalShotSuppression?.confidence || "low", centralRatio: round(shrunkShots.value / historicalShotsAllowed, 4), signalStability: defensiveMetricSignals.shotsAllowed, modelEffect: config.interactionPolicy?.direction === "suppression" ? "evidence-weighted-team-volume-before-player-allocation" : "none" },
      generalSotSuppression: { level: config.vulnerabilitySignals?.generalSotSuppression?.level || "normal", status: config.vulnerabilitySignals?.generalSotSuppression?.status || "inactive", confidence: config.vulnerabilitySignals?.generalSotSuppression?.confidence || "low", centralRatio: round(shrunkSot.value / historicalSotAllowed, 4), signalStability: defensiveMetricSignals.shotsOnTargetAllowed, modelEffect: config.interactionPolicy?.direction === "suppression" ? "evidence-weighted-team-volume-before-player-allocation" : "none" }
    },
    vulnerabilities: {
      signals: Object.fromEntries(signalEntries.map(([key, signal]) => [key, { ...signal, sampleSize: rows.length, season: source.season, modelEffect: signal.status !== "active" ? "none" : config.interactionPolicy?.enabled ? "single-dampened-interaction-budget" : !["centralForwardShotAccess", "secondLineShotAccess", "territorialPressureSensitivity"].includes(key) ? "classification-only" : "active-through-positional-policy" }])),
      boxPenetration: { insideBoxShare: insideBoxShare == null ? null : round(insideBoxShare), insideBoxShotsAllowedPerMatch: insideBoxShotsAllowedPerMatch == null ? null : round(insideBoxShotsAllowedPerMatch), level: config.vulnerabilitySignals?.boxPenetration?.level || "unconfirmed", status: config.vulnerabilitySignals?.boxPenetration?.status || "inactive", sampleSize: locationRows.length, confidence: config.vulnerabilitySignals?.boxPenetration?.confidence || "low", sourceType: locationRows.length ? "derived" : (config.vulnerabilitySignals?.boxPenetration?.sourceType || "unavailable"), modelStatus: "evidence-only" },
      territorialPressure: { level: config.vulnerabilitySignals?.territorialPressureSensitivity?.level || "unconfirmed", status: config.vulnerabilitySignals?.territorialPressureSensitivity?.status || "inactive", sampleSize: rows.length, confidence: config.vulnerabilitySignals?.territorialPressureSensitivity?.confidence || "low", possessionVsShotsAllowedCorrelation: correlation(possession, shotsAllowedValues), fieldTilt: null, causalClaim: false, modelStatus: "experimental" },
      secondLineShooters: { level: config.vulnerabilitySignals?.secondLineShotAccess?.level || "unconfirmed", status: config.vulnerabilitySignals?.secondLineShotAccess?.status || "inactive", sampleSize: rows.length, confidence: config.vulnerabilitySignals?.secondLineShotAccess?.confidence || "low", modelStatus: config.vulnerabilitySignals?.secondLineShotAccess?.status === "active" ? "active-positional-allocation" : "watch-no-model-effect", note: "Segnale distribuito fra ali, trequartisti e centrocampisti; non equivale a debolezza definitiva contro un singolo ruolo." },
      transitionShotEfficiencyProxy: { value: round(transitionMean), leagueMean: round(leagueShotPossessionMean), leagueRelative: round(transitionMean / leagueShotPossessionMean - 1), metric: "opponent-shots-per-10-percentage-points-of-possession", status: config.vulnerabilitySignals?.transitionShotVulnerability?.status || "inactive", confidence: config.vulnerabilitySignals?.transitionShotVulnerability?.confidence || "low", causalClaim: false, modelStatus: "experimental-watch-no-central-effect", sampleSize: rows.length, rows: transitionRows },
      positionalShotVulnerability: positional
    },
    discipline: {
      historical: historicalDisciplineValues,
      current: currentDiscipline,
      shrunk: { foulsCommittedPerGame: shrunkFouls.value, foulsWonPerGame: shrunkFoulsWon.value, yellowCardsPerGame: shrunkYellows.value, foulShrinkage: shrunkFouls, foulsWonShrinkage: shrunkFoulsWon, yellowCardShrinkage: shrunkYellows },
      modelFactor: round(Math.max(0.95, Math.min(1.05, 1 + (disciplineRatio - 1) * source.methodology.teamDisciplineSensitivity))),
      modelStatus: "available-for-card-context-with-shrinkage",
      historicalCurrentAgreement: { score: disciplineAgreementScore, level: disciplineAgreement, sampleSize: rows.length, method: "one-minus-mean-relative-difference-across-fouls-committed-fouls-won-yellow-cards" },
      metricSignals: disciplineMetricSignals,
      expectedDefensiveExposure: { value: round(defensiveShare), expectedPossessionPct: possessionShrinkage.value, leagueRelative: round(defensiveLeagueRelative), factor: round(defensiveExposureFactor, 4), confidence: defensiveExposurePolicy.confidence, sampleSize: rows.length, sourceType: "derived-possession-proxy", evidence: [`possesso storico ${round(historicalPossessionPct)}%`, `possesso current ${current.possessionPct}%`, `possesso shrinkato ${possessionShrinkage.value}%`], modelStatus: defensiveExposurePolicy.enabled ? "small-card-model-context-factor" : "inactive", doubleCountControl: "Il fattore viene attenuato ulteriormente dalla copertura current del giocatore nel card model." },
      foulIntensity: duelSignal ? { ...duelSignal, evidenceWeight: round(duelEvidenceWeight), directDuelEnvironmentFactor, application: "only-when-an-individual-direct-opponent-is-identified" } : { level: "unclassified", status: "inactive", confidence: "low", directDuelEnvironmentFactor: 1 }
    },
    corners: {
      historicalForPerGame: historicalVolume.venues.overall.wonCorners.for.mean, currentForPerGame: current.cornersForPerGame,
      currentDistribution: summary(cornersForValues), robustCurrentForPerGame: robustUpperMean(cornersForValues).value, robustMethod: robustUpperMean(cornersForValues).method,
      shrunkForPerGame: cornerProductionShrinkage.value,
      historicalAllowedPerGame: historicalVolume.venues.overall.wonCorners.against.mean, currentAllowed: summary(values("opponent.corners")),
      territorialPressureLink: { status: "experimental", reason: "Cinque gare non consentono di stimare separatamente una relazione stabile." }
    },
    volatility: { shotsAllowed: shotsVolatility, shotsOnTargetAllowed: sotVolatility, effect: "confidence-and-uncertainty-only", changesCentralMean: false },
    resultsVsProcessDivergence: { observedGoalsAgainstPerMatch: round(goalsAgainstPerGame), expectedGoalsAgainstPerMatch: expectedGoalsAgainstPerGame, observedGoalsForPerMatch: goalsForPerGame, expectedGoalsForPerMatch: expectedGoalsForPerGame, offensiveResultProcessGap, offensiveLevel: offensiveResultProcessGap == null ? "unknown" : Math.abs(offensiveResultProcessGap) <= 0.3 ? "low" : Math.abs(offensiveResultProcessGap) <= 0.6 ? "medium" : "high", shotsAllowedPerMatch: shotsAllowed.mean, shotsOnTargetAllowedPerMatch: sotAllowed.mean, resultProcessGap, divergenceScore, sampleSize: rows.length, confidence: "medium", modelStatus: "regression-warning-only-no-automatic-goal-compensation", sourceType: expectedGoalsAgainstPerGame == null ? "partial" : "observed-team-stats" },
    confidence: { overall: config.overallConfidence || (config.teamId === "bologna" ? "low" : "medium-low"), sampleSize: rows.length, maturityWeight: round(maturity), effectiveTacticalSampleSize, reason: config.confidenceReason || (config.teamId === "bologna" ? "Cinque gare divise fra due allenatori; la nuova era Palladino contiene una sola partita." : "Cinque gare e forte dispersione dei volumi concessi.") },
    modelPolicy: { active: [...signalEntries.filter(([, item]) => item.status === "active").map(([key]) => key), ...Object.entries(config.offensiveSignals || {}).filter(([, item]) => item.status === "active").map(([key]) => `offense-${key}`), ...(Object.values(positional).some(item => item.status === "active") ? ["positional-shot-allocation"] : []), ...(config.offensiveAllocationPolicy?.enabled ? ["team-offensive-allocation"] : [])], watch: [...signalEntries.filter(([, item]) => item.status === "watch").map(([key]) => key), ...Object.entries(positional).filter(([, item]) => item.status === "watch").map(([role]) => `role-${role}`)], inactive: Object.entries(positional).filter(([, item]) => item.status === "inactive").map(([role]) => `role-${role}`), watchActivationCriteria: source.methodology.watchActivationCriteria, interactionPolicy: config.interactionPolicy || { enabled: false, method: "legacy-single-role-factor" }, offensiveAllocationPolicy: config.offensiveAllocationPolicy || { enabled: false, method: "legacy-uniform-reconciliation" }, inactiveForCentralTeamVolume: !config.interactionPolicy?.enabled },
    dataQuality: { status: "partial-current-season", internalMatchStats: "verified", missingStatisticPolicy: "null-never-zero", shotLocation: locationRows.length ? (locationRows.some(row => ["partial-estimate", "estimated"].includes(row.status)) ? "estimated-or-partially-verified" : "verified") : "unavailable", setPieceOriginCoverage: "unavailable", gameStateShotTimestamps: "unavailable", xgCoverage: { for: xgForRows.length, against: xgAgainstRows.length, matches: rows.length }, playerRoleCoverage: shotsForRoleDistribution.roleCoverage, missingHistoricalPlayerBaselines: shotsForRoleDistribution.playerDistribution.filter(player => player.historicalShots90 == null || player.historicalShotsOnTarget90 == null).map(player => player.playerId), missing: ["field tilt", "tocchi in area strutturati per tutte le gare", "zone tiro native nel dataset interno", "origine open-play/corner/punizione dei singoli tiri", "ingressi in area individuali", "timestamp dei singoli tiri per volume tied/leading/trailing", ...(shotsForRoleDistribution.roleCoverage.genericRoleFallbackShots > 0 ? [`ruolo dettagliato per ${shotsForRoleDistribution.roleCoverage.genericRoleFallbackShots} ${shotsForRoleDistribution.roleCoverage.genericRoleFallbackShots === 1 ? "tiro attribuito" : "tiri attribuiti"} tramite fallback generico`] : []), ...(shotsForRoleDistribution.roleCoverage.unresolvedParticipants.length ? [`${shotsForRoleDistribution.roleCoverage.unresolvedParticipants.length} ${shotsForRoleDistribution.roleCoverage.unresolvedParticipants.length === 1 ? "partecipante current non presente" : "partecipanti current non presenti"} nella rosa corrente`] : []), ...(config.teamId === "bologna" ? ["coach prior Palladino affidabile e separabile dal contesto della squadra precedente"] : [])] },
    evidence: config.evidence
  };
}

function main() {
  const profiles = source.profiles.map(buildProfile);
  const output = { schemaVersion: 1, competition: source.competition, season: source.season, generatedAt: matches.filter(match => match.status === "finished").flatMap(match => match.sources || []).map(item => item.retrievedAt).filter(Boolean).sort().at(-1) || null, methodology: source.methodology, coverage: { teams: profiles.length, teamIds: profiles.map(profile => profile.teamId), scope: `Profili comparabili ${profiles.map(profile => profile.teamName).join(", ")}; le altre ${20 - profiles.length} squadre non sono compilate.` }, profiles };
  fs.writeFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK profili matchup squadra: ${profiles.length} (${profiles.map(profile => profile.teamId).join(", ")})`);
}

if (require.main === module) main();
module.exports = { signalPersistence, metricAgreement, signalStability, distributionShape, shooterStructure, roleDistributionBreadth, matchupRoleResolution };
