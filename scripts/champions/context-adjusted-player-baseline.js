"use strict";

const CURRENT_RELIABILITY_K = 900;
const CURRENT_RELIABILITY_CAP = 0.35;
const HISTORICAL_RELIABILITY_K = 900;
const HISTORICAL_RELIABILITY_CAP = 0.82;
const OPPONENT_SAMPLE_K = 6;
const TRANSFER_REGRESSION = 0.2;
const TRANSFER_FACTOR_MIN = 0.85;
const TRANSFER_FACTOR_MAX = 1.15;
const ROLE_PRIORS = {
  goalkeeper: { shots: 0.01, shotsOnTarget: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42 },
  forward: { shots: 2.35, shotsOnTarget: 0.86 }
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const finite = value => value === null || value === undefined || value === ""
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;

function ratePer90(total, minutes) {
  const value = finite(total), sample = finite(minutes);
  return value === null || !(sample > 0) ? null : value * 90 / sample;
}

function currentReliabilityWeight(minutes) {
  const sample = Math.max(0, finite(minutes) || 0);
  return clamp(sample / (sample + CURRENT_RELIABILITY_K), 0, CURRENT_RELIABILITY_CAP);
}

function historicalReliabilityWeight(minutes) {
  const sample = Math.max(0, finite(minutes) || 0);
  return clamp(sample / (sample + HISTORICAL_RELIABILITY_K), 0, HISTORICAL_RELIABILITY_CAP);
}

function historicalBaseline(rawRate, minutes, rolePrior) {
  const observed = finite(rawRate);
  const prior = finite(rolePrior);
  if (prior === null) return observed;
  if (observed === null) return prior;
  const weight = historicalReliabilityWeight(minutes);
  return observed * weight + prior * (1 - weight);
}

function aggregateEntries(entries) {
  const sumNullable = key => {
    const values = entries.map(entry => finite(entry[key])).filter(value => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const minutes = sumNullable("minutes");
  const shots = sumNullable("shots");
  const shotsOnTarget = sumNullable("shotsOnTarget");
  return {
    entries: entries.length,
    minutes,
    shots,
    shotsOnTarget,
    shotsPer90: ratePer90(shots, minutes),
    sotPer90: ratePer90(shotsOnTarget, minutes),
    matchIds: [...new Set(entries.flatMap(entry => (entry.matches || []).map(match => String(match.matchId))))]
  };
}

function buildStandings(events, { from, asOf }) {
  const standings = new Map();
  const included = [];
  const team = side => {
    const id = String(side?.team?.id || "");
    if (!standings.has(id)) standings.set(id, { providerTeamId: id, team: side?.team?.displayName || side?.team?.name || "N/D", matches: 0, points: 0, goalsFor: 0, goalsAgainst: 0 });
    return standings.get(id);
  };
  for (const event of events || []) {
    const date = event.date?.slice(0, 10) || null;
    if (!date || date < from || date > asOf || !event.status?.type?.completed) continue;
    const competitors = event.competitions?.[0]?.competitors || [];
    if (competitors.length !== 2) continue;
    const home = competitors.find(side => side.homeAway === "home") || competitors[0];
    const away = competitors.find(side => side.homeAway === "away") || competitors[1];
    const homeScore = finite(home.score), awayScore = finite(away.score);
    if (homeScore === null || awayScore === null) continue;
    const homeRow = team(home), awayRow = team(away);
    homeRow.matches += 1; awayRow.matches += 1;
    homeRow.goalsFor += homeScore; homeRow.goalsAgainst += awayScore;
    awayRow.goalsFor += awayScore; awayRow.goalsAgainst += homeScore;
    if (homeScore > awayScore) homeRow.points += 3;
    else if (homeScore < awayScore) awayRow.points += 3;
    else { homeRow.points += 1; awayRow.points += 1; }
    included.push({ eventId: String(event.id), date });
  }
  const rows = [...standings.values()].map(row => ({ ...row, pointsPerMatch: row.matches ? row.points / row.matches : null }));
  const totalMatches = rows.reduce((sum, row) => sum + row.matches, 0);
  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0);
  return { rows, included, leagueAveragePointsPerMatch: totalMatches ? totalPoints / totalMatches : null };
}

function deriveLeagueStrengthFallback(leagueCode, teamConfigs, strengthTeams) {
  const strengthByName = new Map(strengthTeams.map(team => [team.team, team.europeanStrengthIndex]));
  const contributors = teamConfigs
    .filter(team => team.league === leagueCode)
    .map(team => ({ team: team.name, value: finite(strengthByName.get(team.name)) }))
    .filter(item => item.value !== null);
  return {
    value: contributors.length ? contributors.reduce((sum, item) => sum + item.value, 0) / contributors.length : null,
    contributors
  };
}

function neutralStrength(strengthTeams) {
  const values = strengthTeams.map(team => finite(team.europeanStrengthIndex)).filter(value => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function opponentStrength({ opponent, standings, directStrengthByTeam, leagueFallback, neutralFallback }) {
  const direct = finite(directStrengthByTeam.get(opponent.team));
  if (direct !== null) return { value: direct, source: "opponent-specific-european-strength", rawPointsPerMatch: null, matches: null, reliability: 1 };
  const row = standings.rows.find(item => item.providerTeamId === String(opponent.providerTeamId) || item.team === opponent.team);
  const leagueAverage = finite(standings.leagueAveragePointsPerMatch);
  if (row?.matches > 0 && leagueAverage > 0 && finite(leagueFallback) !== null) {
    const reliability = row.matches / (row.matches + OPPONENT_SAMPLE_K);
    const shrunkPpg = leagueAverage + (row.pointsPerMatch - leagueAverage) * reliability;
    return {
      value: clamp(leagueFallback * shrunkPpg / leagueAverage, 0, 100),
      source: "opponent-domestic-ppg-anchored-to-derived-league-strength",
      rawPointsPerMatch: row.pointsPerMatch,
      shrunkPointsPerMatch: shrunkPpg,
      leagueAveragePointsPerMatch: leagueAverage,
      matches: row.matches,
      reliability
    };
  }
  if (finite(leagueFallback) !== null) return { value: leagueFallback, source: "derived-league-strength-fallback", rawPointsPerMatch: null, matches: row?.matches ?? null, reliability: 0 };
  return { value: finite(neutralFallback), source: "neutral-champions-reference-fallback", rawPointsPerMatch: null, matches: row?.matches ?? null, reliability: 0 };
}

function transferFactor(sampleStrength, targetReferenceStrength) {
  const sample = finite(sampleStrength), target = finite(targetReferenceStrength);
  if (sample === null || !(target > 0)) return 1;
  const ratio = sample / target;
  return clamp(1 + (ratio - 1) * TRANSFER_REGRESSION, TRANSFER_FACTOR_MIN, TRANSFER_FACTOR_MAX);
}

function blendRates({ historicalRaw, historicalMinutes, rolePrior, domesticRaw, domesticMinutes, domesticStrengthFactor = 1, europeanRaw = null, europeanMinutes = 0 }) {
  const prior = historicalBaseline(historicalRaw, historicalMinutes, rolePrior);
  const adjustedDomestic = finite(domesticRaw) === null ? null : domesticRaw * domesticStrengthFactor;
  const domesticReliability = adjustedDomestic === null ? 0 : currentReliabilityWeight(domesticMinutes);
  const europeanReliability = finite(europeanRaw) === null ? 0 : currentReliabilityWeight(europeanMinutes);
  const europeanWeight = europeanReliability;
  const domesticWeight = domesticReliability * (1 - europeanWeight);
  const historicalWeight = 1 - domesticWeight - europeanWeight;
  const blended = prior === null
    ? adjustedDomestic === null ? finite(europeanRaw) : adjustedDomestic
    : prior * historicalWeight + (adjustedDomestic ?? prior) * domesticWeight + (finite(europeanRaw) ?? prior) * europeanWeight;
  return {
    historicalBaseline: prior,
    adjustedDomestic,
    currentReliabilityWeight: domesticReliability,
    currentEuropeanReliabilityWeight: europeanReliability,
    domesticWeight,
    europeanWeight,
    historicalWeight,
    blended
  };
}

module.exports = {
  CURRENT_RELIABILITY_K,
  CURRENT_RELIABILITY_CAP,
  OPPONENT_SAMPLE_K,
  TRANSFER_REGRESSION,
  TRANSFER_FACTOR_MIN,
  TRANSFER_FACTOR_MAX,
  ROLE_PRIORS,
  ratePer90,
  currentReliabilityWeight,
  historicalReliabilityWeight,
  historicalBaseline,
  aggregateEntries,
  buildStandings,
  deriveLeagueStrengthFallback,
  neutralStrength,
  opponentStrength,
  transferFactor,
  blendRates,
  round
};
