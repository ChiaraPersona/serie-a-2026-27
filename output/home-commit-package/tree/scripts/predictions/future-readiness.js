"use strict";

const FINISHED_STATUSES = new Set(["finished"]);

function compareCanonicalMatches(left, right) {
  const matchdayDifference = Number(left?.matchday || 0) - Number(right?.matchday || 0);
  if (matchdayDifference) return matchdayDifference;
  const dateDifference = String(left?.date || "").localeCompare(String(right?.date || ""));
  if (dateDifference) return dateDifference;
  return String(left?.id || "").localeCompare(String(right?.id || ""));
}

function assertUniqueMatchIds(matches) {
  const seen = new Map();
  for (const match of matches || []) {
    const id = String(match?.id || "").trim();
    if (!id) throw new Error("Partita senza canonical match ID");
    if (seen.has(id)) throw new Error(`Canonical match ID duplicato: ${id}`);
    seen.set(id, match);
  }
  return true;
}

function beforeCutoff(match, options = {}) {
  if (options.excludeMatchId && match.id === options.excludeMatchId) return false;
  if (Number.isInteger(options.asOfMatchday) && !(Number(match.matchday) < options.asOfMatchday)) return false;
  if (options.asOfDate) {
    const matchTime = Date.parse(match.date);
    const cutoffTime = Date.parse(options.asOfDate);
    if (Number.isFinite(matchTime) && Number.isFinite(cutoffTime) && !(matchTime < cutoffTime)) return false;
  }
  return true;
}

function selectCompletedMatches(matches, options = {}) {
  assertUniqueMatchIds(matches);
  return [...(matches || [])]
    .filter(match => match?.competition === (options.competition || "serie-a"))
    .filter(match => match?.season === options.season)
    .filter(match => FINISHED_STATUSES.has(match?.status))
    .filter(match => match?.score && Number.isFinite(match.score.home) && Number.isFinite(match.score.away))
    .filter(match => !options.teamId || match.homeTeam === options.teamId || match.awayTeam === options.teamId)
    .filter(match => beforeCutoff(match, options))
    .sort(compareCanonicalMatches);
}

function sampleMaturity(matches, maturityMatches) {
  const denominator = Math.max(1, Number(maturityMatches || 10));
  return Math.max(0, Math.min(1, Number(matches || 0) / denominator));
}

function confidenceFromSample(matches, historicalMatches = 0, crossCompetition = false) {
  let confidence = matches >= 25 ? "high" : matches >= 15 ? "medium-high" : matches >= 8 ? "medium" : matches >= 4 ? "medium-low" : "low";
  if (historicalMatches < 20 && ["high", "medium-high"].includes(confidence)) confidence = "medium";
  if (crossCompetition && confidence === "high") confidence = "medium-high";
  return confidence;
}

function signalStatusTransition({
  configuredStatus = "watch",
  sampleSize = 0,
  initialEvidenceMatches = 5,
  evidenceMatches = sampleSize,
  persistence = null,
  stability = null,
  normalizedMagnitude = null,
  activeMinimumPersistence = 0.6,
  activeMinimumStability = 0.62,
  activeMinimumMagnitude = 0.08,
  inactiveMaximumPersistence = 0.25,
  inactiveMaximumMagnitude = 0.03
} = {}) {
  if (sampleSize <= initialEvidenceMatches) return { status: configuredStatus, transition: "initial-evidence", automatic: false };
  if (!(evidenceMatches > 0) || !Number.isFinite(persistence) || !Number.isFinite(normalizedMagnitude)) return { status: "unknown", transition: `${configuredStatus}->unknown`, automatic: true };
  const stableEnough = !Number.isFinite(stability) || stability >= activeMinimumStability;
  if (evidenceMatches >= 4 && persistence >= activeMinimumPersistence && normalizedMagnitude >= activeMinimumMagnitude && stableEnough) {
    return { status: "active", transition: configuredStatus === "active" ? "confirmed-active" : `${configuredStatus}->active`, automatic: true };
  }
  if (evidenceMatches >= 6 && persistence <= inactiveMaximumPersistence && normalizedMagnitude <= inactiveMaximumMagnitude) {
    return { status: "inactive", transition: configuredStatus === "inactive" ? "confirmed-inactive" : `${configuredStatus}->inactive`, automatic: true };
  }
  return { status: "watch", transition: configuredStatus === "watch" ? "confirmed-watch" : `${configuredStatus}->watch`, automatic: true };
}

module.exports = {
  FINISHED_STATUSES,
  assertUniqueMatchIds,
  beforeCutoff,
  compareCanonicalMatches,
  confidenceFromSample,
  sampleMaturity,
  selectCompletedMatches,
  signalStatusTransition
};
