"use strict";

const AVAILABILITY = Object.freeze({
  EXACT_TARGET_SUPPORTED: "EXACT_TARGET_SUPPORTED",
  RESEARCH_ESTIMATE: "RESEARCH_ESTIMATE",
  SENSITIVITY_ONLY: "SENSITIVITY_ONLY",
  UNAVAILABLE: "UNAVAILABLE",
});

const UNAVAILABLE = "DUO_PROBABILITY_UNAVAILABLE";
const SOT_NOT_CERTIFIED = "SISAL_SOT_PROBABILITY_NOT_CERTIFIED";

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function poissonAtLeast(lambda, minimumCount) {
  if (!Number.isFinite(lambda) || lambda < 0) return null;
  if (!Number.isInteger(minimumCount) || minimumCount < 1) return null;
  let term = Math.exp(-lambda);
  let below = term;
  for (let count = 1; count < minimumCount; count++) {
    term *= lambda / count;
    below += term;
  }
  return round(Math.max(0, Math.min(1, 1 - below)));
}

function ratePer90FromFrozenProjection(projectedCount, expectedMinutes) {
  if (!Number.isFinite(projectedCount) || projectedCount < 0) return null;
  if (!Number.isFinite(expectedMinutes) || expectedMinutes <= 0) return null;
  return projectedCount * 90 / expectedMinutes;
}

function validateParticipants(participants, matchMinutes) {
  if (!Array.isArray(participants)) return ["participants must be an array"];
  if (!Number.isFinite(matchMinutes) || matchMinutes <= 0) return ["invalid matchMinutes"];
  const failures = [];
  const bySlot = new Map();
  for (const participant of participants) {
    if (!participant || !participant.slotId) failures.push("missing slotId");
    if (!participant || !participant.playerId) failures.push("missing playerId");
    if (!Number.isFinite(participant?.startMinute) || !Number.isFinite(participant?.endMinute)) failures.push("invalid minute interval");
    else if (participant.startMinute < 0 || participant.endMinute <= participant.startMinute || participant.endMinute > matchMinutes) failures.push("minute interval outside match");
    if (!Number.isFinite(participant?.ratePer90) || participant.ratePer90 < 0) failures.push("invalid ratePer90");
    const rows = bySlot.get(participant?.slotId) || [];
    rows.push(participant);
    bySlot.set(participant?.slotId, rows);
  }
  for (const [slotId, rows] of bySlot) {
    const sorted = [...rows].sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
    for (let index = 1; index < sorted.length; index++) {
      if (sorted[index].startMinute < sorted[index - 1].endMinute) failures.push(`overlapping minutes in slot ${slotId}`);
    }
  }
  const identities = new Set();
  for (const participant of participants) {
    const identity = `${participant?.slotId}:${participant?.playerId}:${participant?.startMinute}:${participant?.endMinute}`;
    if (identities.has(identity)) failures.push("duplicate participant interval");
    identities.add(identity);
  }
  return [...new Set(failures)];
}

function evaluateScenario({
  scenarioId,
  participants,
  minimumCount,
  matchMinutes = 90,
  namedPlayerParticipation = true,
  ruleVerified = true,
  statisticalDefinitionCompatible = true,
  crossPlayerIndependenceDeclared = false,
  weight = null,
}) {
  if (!ruleVerified) return { scenarioId, probability: null, expectedCount: null, status: UNAVAILABLE, reason: "RULE_UNVERIFIED", weight };
  if (!statisticalDefinitionCompatible) return { scenarioId, probability: null, expectedCount: null, status: SOT_NOT_CERTIFIED, reason: "STATISTICAL_DEFINITION_INCOMPATIBLE", weight };
  if (!namedPlayerParticipation) return { scenarioId, probability: null, expectedCount: null, status: "REFUND", reason: "NAMED_PLAYER_DID_NOT_PARTICIPATE", weight };
  const failures = validateParticipants(participants, matchMinutes);
  if (failures.length) return { scenarioId, probability: null, expectedCount: null, status: UNAVAILABLE, reason: failures.join("; "), weight };
  const slots = new Set(participants.map(participant => participant.slotId));
  if (slots.size > 1 && !crossPlayerIndependenceDeclared) {
    return { scenarioId, probability: null, expectedCount: null, status: UNAVAILABLE, reason: "CROSS_PLAYER_DEPENDENCE_NOT_DECLARED", weight };
  }
  const contributions = participants.map(participant => ({
    slotId: participant.slotId,
    playerId: participant.playerId,
    startMinute: participant.startMinute,
    endMinute: participant.endMinute,
    minutes: participant.endMinute - participant.startMinute,
    ratePer90: participant.ratePer90,
    expectedCount: round(participant.ratePer90 * (participant.endMinute - participant.startMinute) / 90),
  }));
  const expectedCount = round(contributions.reduce((sum, participant) => sum + participant.expectedCount, 0));
  return {
    scenarioId,
    probability: poissonAtLeast(expectedCount, minimumCount),
    expectedCount,
    status: "SCENARIO_ESTIMATE",
    weight,
    contributions,
    assumptions: [
      "Poisson counts with rates scaled linearly by assigned minutes",
      "Disjoint minute intervals inside each substitution slot",
      ...(slots.size > 1 ? ["Conditional independence across named-player slots is explicitly declared"] : []),
    ],
  };
}

function aggregateScenarios(scenarios) {
  if (!Array.isArray(scenarios) || !scenarios.length) return { probability: null, status: UNAVAILABLE, reason: "NO_SCENARIOS" };
  if (scenarios.some(scenario => !Number.isFinite(scenario.weight))) return { probability: null, status: UNAVAILABLE, reason: "SCENARIO_WEIGHTS_UNAVAILABLE" };
  if (scenarios.some(scenario => scenario.weight < 0)) return { probability: null, status: UNAVAILABLE, reason: "NEGATIVE_SCENARIO_WEIGHT" };
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  if (Math.abs(totalWeight - 1) > 1e-9) return { probability: null, status: UNAVAILABLE, reason: "SCENARIO_WEIGHTS_NOT_NORMALIZED", totalWeight: round(totalWeight) };
  if (scenarios.some(scenario => scenario.status === "REFUND")) return { probability: null, status: UNAVAILABLE, reason: "REFUND_STATE_MUST_BE_PRICED_SEPARATELY" };
  if (scenarios.some(scenario => !Number.isFinite(scenario.probability))) return { probability: null, status: UNAVAILABLE, reason: "SCENARIO_PROBABILITY_UNAVAILABLE" };
  return {
    probability: round(scenarios.reduce((sum, scenario) => sum + scenario.weight * scenario.probability, 0)),
    status: AVAILABILITY.RESEARCH_ESTIMATE,
    totalWeight: round(totalWeight),
    aggregation: "weighted mutually exclusive participation scenarios",
  };
}

function namedPlayerSensitivity({ playerId, projectedCount, expectedMinutes, minimumCount, metric }) {
  const ratePer90 = ratePer90FromFrozenProjection(projectedCount, expectedMinutes);
  if (!Number.isFinite(ratePer90)) return { status: AVAILABILITY.UNAVAILABLE, reason: "FROZEN_PLAYER_RATE_UNAVAILABLE", scenarios: [] };
  const playerOnly = minutes => {
    const lambda = ratePer90 * minutes / 90;
    return { expectedCount: round(lambda), probability: poissonAtLeast(lambda, minimumCount) };
  };
  return {
    status: AVAILABILITY.SENSITIVITY_ONLY,
    metric,
    minimumCount,
    ratePer90: round(ratePer90),
    scenarios: [
      { scenarioId: "PLAYER_90", namedPlayerMinutes: 90, replacementMinutes: 0, replacementIdentity: null, completeDuoScenario: true, ...playerOnly(90), duoProbability: playerOnly(90).probability, note: "No substitution; the named player's 90-minute exposure is the entire DUO slot." },
      { scenarioId: "PLAYER_75_PLUS_UNKNOWN_SUB", namedPlayerMinutes: 75, replacementMinutes: 15, replacementIdentity: null, completeDuoScenario: false, namedPlayerComponent: playerOnly(75), expectedCount: null, duoProbability: null, reason: "REPLACEMENT_IDENTITY_AND_RATE_UNAVAILABLE" },
      { scenarioId: "PLAYER_60_PLUS_UNKNOWN_SUB", namedPlayerMinutes: 60, replacementMinutes: 30, replacementIdentity: null, completeDuoScenario: false, namedPlayerComponent: playerOnly(60), expectedCount: null, duoProbability: null, reason: "REPLACEMENT_IDENTITY_AND_RATE_UNAVAILABLE" },
      { scenarioId: "PLAYER_45_PLUS_UNKNOWN_SUB", namedPlayerMinutes: 45, replacementMinutes: 45, replacementIdentity: null, completeDuoScenario: false, namedPlayerComponent: playerOnly(45), expectedCount: null, duoProbability: null, reason: "REPLACEMENT_IDENTITY_AND_RATE_UNAVAILABLE" },
      { scenarioId: "NAMED_PLAYER_DNP", namedPlayerMinutes: 0, replacementMinutes: null, replacementIdentity: null, completeDuoScenario: false, expectedCount: null, duoProbability: null, settlement: "REFUND", note: "Single-player DUO rule: refund when the named player does not participate." },
    ],
    playerId,
    aggregation: null,
    probability: null,
    reason: "SCENARIO_WEIGHTS_AND_REPLACEMENT_DISTRIBUTION_UNAVAILABLE",
  };
}

module.exports = {
  AVAILABILITY,
  UNAVAILABLE,
  SOT_NOT_CERTIFIED,
  aggregateScenarios,
  evaluateScenario,
  namedPlayerSensitivity,
  poissonAtLeast,
  ratePer90FromFrozenProjection,
  validateParticipants,
};
