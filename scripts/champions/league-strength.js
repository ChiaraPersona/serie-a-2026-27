"use strict";

const MIN_RATED_CLUBS = 3;

const ASSOCIATION_LEAGUES = {
  AUT: { leagueCode: "aut.1", league: "Bundesliga austriaca" },
  AZE: { leagueCode: "aze.1", league: "Premyer Liqa" },
  BEL: { leagueCode: "bel.1", league: "Pro League" },
  CZE: { leagueCode: "cze.1", league: "Czech First League" },
  ENG: { leagueCode: "eng.1", league: "Premier League" },
  ESP: { leagueCode: "esp.1", league: "LaLiga" },
  FRA: { leagueCode: "fra.1", league: "Ligue 1" },
  GER: { leagueCode: "ger.1", league: "Bundesliga" },
  GRE: { leagueCode: "gre.1", league: "Super League Greece" },
  ITA: { leagueCode: "ita.1", league: "Serie A" },
  NED: { leagueCode: "ned.1", league: "Eredivisie" },
  NOR: { leagueCode: "nor.1", league: "Eliteserien" },
  POR: { leagueCode: "por.1", league: "Primeira Liga" },
  SVK: { leagueCode: "svk.1", league: "Slovak Super Liga" },
  TUR: { leagueCode: "tur.1", league: "Süper Lig" },
  UKR: { leagueCode: "ukr.1", league: "Ukrainian Premier League" }
};

const finite = value => value === null || value === undefined || value === ""
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const round = (value, digits = 2) => value == null ? null : Number(Number(value).toFixed(digits));

function median(values) {
  const clean = values.map(finite).filter(value => value !== null).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

function rank(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const averageRank = (start + end - 1) / 2 + 1;
    for (let index = start; index < end; index += 1) result[sorted[index].index] = averageRank;
    start = end;
  }
  return result;
}

function correlation(left, right) {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0, leftSq = 0, rightSq = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] - leftMean, b = right[index] - rightMean;
    numerator += a * b;
    leftSq += a * a;
    rightSq += b * b;
  }
  return leftSq > 0 && rightSq > 0 ? numerator / Math.sqrt(leftSq * rightSq) : null;
}

function spearman(pairs) {
  const clean = pairs.filter(pair => finite(pair.left) !== null && finite(pair.right) !== null);
  return round(correlation(rank(clean.map(pair => Number(pair.left))), rank(clean.map(pair => Number(pair.right)))), 4);
}

function reliabilityForClubCount(clubsRated) {
  if (clubsRated < MIN_RATED_CLUBS) return "insufficient";
  if (clubsRated >= 8) return "high";
  if (clubsRated >= 5) return "medium";
  return "low";
}

function buildTeamDirectory(matches) {
  const teams = new Map();
  for (const match of matches || []) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!team?.id) continue;
      const current = teams.get(String(team.id));
      if (current && current.countryCode !== team.countryCode) throw new Error(`Country mismatch for UEFA team ${team.id}`);
      teams.set(String(team.id), { teamId: String(team.id), team: team.name, countryCode: team.countryCode || null });
    }
  }
  return teams;
}

function buildLeagueStrengthDataset({ history, model, championsStrength, championsTeamMap, asOf }) {
  if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("--as-of YYYY-MM-DD richiesto");
  if (model.generatedAt > asOf || model.historyThrough >= asOf) throw new Error(`AS_OF_SNAPSHOT_UNAVAILABLE: model ${model.generatedAt}, history through ${model.historyThrough}, as-of ${asOf}`);
  if (history.matches.some(match => match.date > model.historyThrough)) throw new Error("UEFA history extends beyond the frozen Elo model");

  const directory = buildTeamDirectory(history.matches);
  const ratingById = new Map(model.ratings.map(item => [String(item.teamId), finite(item.rating)]));
  const ratedClubs = model.ratings.map(item => {
    const team = directory.get(String(item.teamId));
    return team && finite(item.rating) !== null ? { ...team, rating: finite(item.rating) } : null;
  }).filter(Boolean);
  const neutralClubRating = median(ratedClubs.map(item => item.rating));
  const participantAssociations = [...new Set(championsStrength.teams.map(team => team.association))].sort();
  const participantCount = new Map();
  championsStrength.teams.forEach(team => participantCount.set(team.association, (participantCount.get(team.association) || 0) + 1));

  const leagues = participantAssociations.map(association => {
    const clubs = ratedClubs.filter(team => team.countryCode === association).sort((a, b) => b.rating - a.rating || a.team.localeCompare(b.team));
    const clubIds = new Set(clubs.map(club => club.teamId));
    const observedMatches = new Set(history.matches.filter(match => clubIds.has(String(match.homeTeam.id)) || clubIds.has(String(match.awayTeam.id))).map(match => match.id)).size;
    const evidenceStatus = clubs.length >= MIN_RATED_CLUBS ? "estimated" : "insufficient_evidence";
    const leagueStrength = evidenceStatus === "estimated" ? median(clubs.map(club => club.rating)) : null;
    const metadata = ASSOCIATION_LEAGUES[association] || { leagueCode: null, league: association };
    return {
      association,
      ...metadata,
      championsParticipants: participantCount.get(association) || 0,
      clubsRated: clubs.length,
      observedMatches,
      evidenceSource: "UEFA main-tournament match results 2023/24-2025/26",
      scale: "UEFA cross-competition Elo",
      aggregation: "median club rating",
      selectionCoverage: "European main-stage clubs only; domestic-league denominator unavailable",
      coveragePct: null,
      selectionBias: "European qualifiers are selected above the domestic-league average; no numeric correction is applied.",
      leagueStrength: round(leagueStrength),
      evidenceStatus,
      reliability: reliabilityForClubCount(clubs.length),
      fallback: evidenceStatus === "estimated" ? null : { type: "neutral", value: round(neutralClubRating), status: "fallback" },
      clubs: clubs.map(club => ({ teamId: club.teamId, team: club.team, rating: round(club.rating) }))
    };
  });

  const championRatingRows = championsTeamMap.teams.map(mapping => {
    const profile = championsStrength.teams.find(team => team.team === mapping.team);
    const rating = mapping.uefaTeamId == null ? null : ratingById.get(String(mapping.uefaTeamId)) ?? null;
    return { team: mapping.team, association: profile?.association || null, uefaTeamId: mapping.uefaTeamId, rating };
  });
  const championRatings = championRatingRows.map(item => item.rating).filter(value => value !== null);
  const esiPairs = championRatingRows.map(item => ({
    left: item.rating,
    right: championsStrength.teams.find(team => team.team === item.team)?.europeanStrengthIndex
  })).filter(pair => finite(pair.left) !== null && finite(pair.right) !== null);

  return {
    schemaVersion: 1,
    status: leagues.some(league => league.evidenceStatus === "insufficient_evidence") ? "partial" : "estimated",
    asOf,
    generatedAt: asOf,
    method: {
      metric: "UEFA cross-competition Elo",
      scaleOrientation: "higher means stronger",
      commonScale: true,
      trainingMatches: model.trainingMatches,
      historyFrom: history.matches.map(match => match.date).sort()[0],
      historyThrough: model.historyThrough,
      competitions: ["ucl", "uel", "uecl"],
      competitionUpdateWeights: model.parameters.competitionUpdateWeights,
      leagueAggregator: "median of all association clubs rated by the frozen UEFA Elo model",
      minimumRatedClubs: MIN_RATED_CLUBS,
      selectionPolicy: "No Champions-only league average. All rated clubs from the association are included; European-selection bias remains explicit and uncorrected.",
      temporalPolicy: "The frozen model may be used only when generatedAt <= asOf and historyThrough < asOf.",
      shotTransferPolicy: "diagnostic-only; no Elo-to-shots conversion is calibrated or applied"
    },
    sources: [
      { path: "data/normalized/uefa-europe-history-2023-26.json", provider: "UEFA match feed", observations: history.matches.length, through: model.historyThrough },
      { path: "data/normalized/uefa-1x2-model-2026-27.json", method: model.method || "Nested chronological walk-forward Elo 1X2", observations: model.trainingMatches, generatedAt: model.generatedAt },
      { path: "data/normalized/champions-team-strength-2026-27.json", role: "ESI coherence diagnostic only; not mixed numerically with Elo" }
    ],
    neutralFallback: {
      type: "neutral",
      status: "fallback",
      method: "median of all clubs rated by the frozen UEFA Elo model",
      value: round(neutralClubRating),
      observations: ratedClubs.length
    },
    championsReference: {
      method: "median direct Elo of 2026/27 Champions participants with a frozen rating",
      value: round(median(championRatings)),
      clubsRated: championRatings.length,
      clubsTotal: championsTeamMap.teams.length
    },
    esiCoherence: {
      status: "diagnostic_only",
      comparablePairs: esiPairs.length,
      spearmanRankCorrelation: spearman(esiPairs),
      note: "ESI and Elo are not combined or treated as linearly interchangeable."
    },
    leagues,
    directClubRatings: ratedClubs.map(club => ({ ...club, rating: round(club.rating), evidenceStatus: "direct", source: "frozen UEFA Elo" }))
  };
}

function resolveOpponentStrength({ opponent, league, directClub }) {
  if (directClub?.rating != null) {
    return { value: directClub.rating, evidenceStatus: "direct", source: "opponent-specific frozen UEFA Elo", fallbackUsed: false };
  }
  if (league?.evidenceStatus === "estimated" && league.leagueStrength != null) {
    return {
      value: league.leagueStrength,
      evidenceStatus: "fallback",
      source: "association median UEFA Elo",
      fallbackUsed: true,
      withinLeagueAdjustmentStatus: "insufficient_calibration",
      withinLeagueEvidence: opponent?.pointsPerMatch == null ? null : { pointsPerMatch: opponent.pointsPerMatch, matches: opponent.matches ?? null }
    };
  }
  return {
    value: league?.fallback?.value ?? null,
    evidenceStatus: league?.fallback?.value == null ? "insufficient_evidence" : "fallback",
    source: league?.fallback?.value == null ? "unavailable" : "neutral UEFA Elo",
    fallbackUsed: league?.fallback?.value != null,
    withinLeagueAdjustmentStatus: "insufficient_evidence"
  };
}

module.exports = {
  MIN_RATED_CLUBS,
  ASSOCIATION_LEAGUES,
  median,
  spearman,
  reliabilityForClubCount,
  buildTeamDirectory,
  buildLeagueStrengthDataset,
  resolveOpponentStrength,
  round
};
