const STAT_FIELDS = {
  results: ["played", "won", "drawn", "lost", "points", "pointsPerGame", "goalsFor", "goalsAgainst", "goalDifference", "cleanSheets", "failedToScore", "winPercentage", "drawPercentage", "lossPercentage"],
  attack: ["shots", "shotsPerGame", "shotsOnTarget", "shotsOnTargetPerGame", "shotAccuracy", "goalsPerGame", "shotConversion", "bigChancesCreated", "bigChancesMissed", "expectedGoals", "expectedGoalsPerGame", "goalsVsExpectedGoals", "corners", "cornersPerGame", "offsides", "offsidesPerGame"],
  defence: ["shotsConceded", "shotsOnTargetConceded", "goalsAgainstPerGame", "expectedGoalsAgainst", "cleanSheets", "saves", "savePercentage", "tackles", "interceptions", "clearances", "errorsLeadingToShot", "errorsLeadingToGoal"],
  discipline: ["foulsCommitted", "foulsCommittedPerGame", "foulsWon", "foulsWonPerGame", "yellowCards", "yellowCardsPerGame", "secondYellowCards", "straightRedCards", "dismissals", "penaltiesConceded", "penaltiesWon", "disciplineIndex"],
  possession: ["averagePossession", "passesAttempted", "passesCompleted", "passAccuracy", "progressivePasses", "crosses", "crossAccuracy", "longBalls", "longBallAccuracy"]
};

const PLAYER_FIELDS = [
  "appearances", "starts", "substituteAppearances", "minutes", "minutesPerAppearance", "completeMatches", "substitutedOff",
  "goals", "assists", "shots", "shotsOnTarget", "penaltiesTaken", "penaltiesScored", "offsides",
  "keyPasses", "chancesCreated", "passAccuracy", "crosses",
  "foulsCommitted", "foulsWon", "yellowCards", "secondYellowCards", "straightRedCards",
  "tackles", "interceptions", "clearances", "duels", "duelsWon",
  "goalsConceded", "cleanSheets", "saves", "savePercentage", "penaltiesFaced", "penaltiesSaved"
];

const round = (value, digits = 2) => value == null ? null : Number(Number(value).toFixed(digits));
const rate = (value, divisor) => divisor ? round(value / divisor) : null;
const percentage = (value, divisor) => divisor ? round(value * 100 / divisor, 1) : null;

function nullObject(fields) {
  return Object.fromEntries(fields.map(field => [field, null]));
}

function per90(value, minutes) {
  return value == null || !minutes ? null : round(value * 90 / minutes);
}

function playerEntry(entry = {}) {
  const normalized = { ...nullObject(PLAYER_FIELDS), ...entry };
  const cardValues = [normalized.yellowCards, normalized.secondYellowCards, normalized.straightRedCards];
  const totalCards = cardValues.every(value => value == null) ? null : cardValues.reduce((total, value) => total + (value ?? 0), 0);
  normalized.per90 = {
    ...Object.fromEntries(
    ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon", "yellowCards"]
      .map(field => [field, per90(normalized[field], normalized.minutes)])
    ),
    cards: per90(totalCards, normalized.minutes)
  };
  return normalized;
}

module.exports = { STAT_FIELDS, PLAYER_FIELDS, nullObject, per90, rate, percentage, round, playerEntry };
