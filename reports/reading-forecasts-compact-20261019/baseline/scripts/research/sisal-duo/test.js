"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  AVAILABILITY,
  UNAVAILABLE,
  SOT_NOT_CERTIFIED,
  aggregateScenarios,
  evaluateScenario,
  namedPlayerSensitivity,
  poissonAtLeast,
  validateParticipants,
} = require("./adapter");

const root = path.resolve(__dirname, "..", "..", "..");
let assertions = 0;
function check(condition, message) {
  assert(condition, message);
  assertions++;
}

function run({ includeReport = true } = {}) {
  assertions = 0;
  const base = {
    scenarioId: "starter-completes",
    minimumCount: 1,
    participants: [{ slotId: "slot-a", playerId: "starter", startMinute: 0, endMinute: 90, ratePer90: 2 }],
  };
  const full = evaluateScenario(base);
  check(full.status === "SCENARIO_ESTIMATE", "non-substituted player scenario");
  check(full.expectedCount === 2 && full.probability === poissonAtLeast(2, 1), "full-match exposure");

  const substituted = evaluateScenario({
    scenarioId: "starter-substituted",
    minimumCount: 2,
    participants: [
      { slotId: "slot-a", playerId: "starter", startMinute: 0, endMinute: 60, ratePer90: 3 },
      { slotId: "slot-a", playerId: "substitute", startMinute: 60, endMinute: 90, ratePer90: 1.5 },
    ],
  });
  check(substituted.expectedCount === 2.5, "substitute uses only assigned minutes");
  check(substituted.contributions.reduce((sum, row) => sum + row.minutes, 0) === 90, "slot minutes are not double counted");

  const substituteDidNotEnter = evaluateScenario(base);
  check(substituteDidNotEnter.expectedCount === full.expectedCount, "absent substitute adds no full-match projection");

  const benchEntry = evaluateScenario({
    scenarioId: "named-player-bench-entry",
    minimumCount: 1,
    participants: [{ slotId: "slot-a", playerId: "named", startMinute: 60, endMinute: 90, ratePer90: 2.7 }],
  });
  check(benchEntry.expectedCount === 0.9, "named bench player receives only entry minutes");

  const dnp = evaluateScenario({ ...base, namedPlayerParticipation: false });
  check(dnp.status === "REFUND" && dnp.probability === null, "named player DNP is refund, not zero");
  check(dnp.probability !== 0, "null is not converted to zero");

  const chain = evaluateScenario({
    scenarioId: "replacement-chain",
    minimumCount: 1,
    participants: [
      { slotId: "slot-a", playerId: "a", startMinute: 0, endMinute: 45, ratePer90: 2 },
      { slotId: "slot-a", playerId: "b", startMinute: 45, endMinute: 70, ratePer90: 1.8 },
      { slotId: "slot-a", playerId: "c", startMinute: 70, endMinute: 90, ratePer90: 0.9 },
    ],
  });
  check(chain.status === "SCENARIO_ESTIMATE" && chain.contributions.length === 3, "synthetic verified chain is representable");
  const unverifiedChain = evaluateScenario({ ...base, scenarioId: "unverified-chain", ruleVerified: false });
  check(unverifiedChain.reason === "RULE_UNVERIFIED" && unverifiedChain.probability === null, "unknown rule blocks probability");

  const overlap = validateParticipants([
    { slotId: "slot-a", playerId: "a", startMinute: 0, endMinute: 70, ratePer90: 2 },
    { slotId: "slot-a", playerId: "b", startMinute: 60, endMinute: 90, ratePer90: 2 },
  ], 90);
  check(overlap.some(reason => reason.includes("overlapping")), "overlapping slot minutes rejected");

  const twoPlayersUndeclared = evaluateScenario({
    scenarioId: "pair-undeclared-dependence",
    minimumCount: 3,
    participants: [
      { slotId: "slot-a", playerId: "a", startMinute: 0, endMinute: 90, ratePer90: 2 },
      { slotId: "slot-b", playerId: "b", startMinute: 0, endMinute: 90, ratePer90: 2 },
    ],
  });
  check(twoPlayersUndeclared.reason === "CROSS_PLAYER_DEPENDENCE_NOT_DECLARED", "pair independence is never implicit");
  const twoPlayersDeclared = evaluateScenario({
    scenarioId: "pair-declared-dependence",
    minimumCount: 3,
    crossPlayerIndependenceDeclared: true,
    participants: [
      { slotId: "slot-a", playerId: "a", startMinute: 0, endMinute: 90, ratePer90: 2 },
      { slotId: "slot-b", playerId: "b", startMinute: 0, endMinute: 90, ratePer90: 2 },
    ],
  });
  check(twoPlayersDeclared.expectedCount === 4, "declared pair assumption is explicit and additive");

  const incompatibleSot = evaluateScenario({ ...base, statisticalDefinitionCompatible: false });
  check(incompatibleSot.status === SOT_NOT_CERTIFIED && incompatibleSot.probability === null, "incompatible SOT definition blocked");

  const thresholds = [1, 2, 3].map(minimumCount => poissonAtLeast(2, minimumCount));
  check(thresholds.every(value => value >= 0 && value <= 1), "threshold probabilities bounded");
  check(thresholds[0] >= thresholds[1] && thresholds[1] >= thresholds[2], "1+/2+/3+ monotone");

  const normalized = aggregateScenarios([
    { ...evaluateScenario(base), weight: 0.6 },
    { ...evaluateScenario({ ...base, scenarioId: "second", participants: [{ slotId: "slot-a", playerId: "starter", startMinute: 0, endMinute: 75, ratePer90: 2 }] }), weight: 0.4 },
  ]);
  check(normalized.status === AVAILABILITY.RESEARCH_ESTIMATE && normalized.probability >= 0 && normalized.probability <= 1, "normalized scenarios aggregate");
  const notNormalized = aggregateScenarios([{ ...full, weight: 0.7 }, { ...full, weight: 0.2 }]);
  check(notNormalized.reason === "SCENARIO_WEIGHTS_NOT_NORMALIZED", "unnormalized scenarios rejected");
  const unweighted = aggregateScenarios([full]);
  check(unweighted.status === UNAVAILABLE && unweighted.reason === "SCENARIO_WEIGHTS_UNAVAILABLE", "missing scenario weights rejected");

  const sensitivity = namedPlayerSensitivity({ playerId: "starter", projectedCount: 1.5, expectedMinutes: 75, minimumCount: 2, metric: "shots" });
  check(sensitivity.status === AVAILABILITY.SENSITIVITY_ONLY && sensitivity.probability === null, "missing replacement stays sensitivity-only");
  check(sensitivity.scenarios.find(row => row.scenarioId === "PLAYER_60_PLUS_UNKNOWN_SUB").duoProbability === null, "unknown substitute does not become a number");

  const deterministicA = JSON.stringify(evaluateScenario(substitutedInput()));
  const deterministicB = JSON.stringify(evaluateScenario(substitutedInput()));
  check(deterministicA === deterministicB, "adapter deterministic");

  const source = fs.readFileSync(path.join(__dirname, "adapter.js"), "utf8");
  check(!/Date\.now|new Date|Math\.random|fetch\(|actual(Home|Away|Shots|SOT)|result/i.test(source), "adapter has no time, random, network or actual-result leakage");

  const reportPath = path.join(root, "output", "reports", "sisal-md06-duo-market-compatibility-2026-10-09.json");
  if (includeReport && fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    check(report.markets.length === 3771, "all MD6 DUO markets serialized");
    check(report.markets.every(row => row.marketId && row.selectionId), "marketId and selectionId preserved");
    check(report.markets.every(row => row.duoResearchProbability === null && row.evResearch === null), "no artificial MD6 DUO point probability or EV");
    check(report.markets.every(row => row.status !== AVAILABILITY.EXACT_TARGET_SUPPORTED), "no exact-target claim without replacement model");
    check(report.integrity.status === "PASS", "production integrity recorded");
  }

  return { status: "PASS", assertions };
}

function substitutedInput() {
  return {
    scenarioId: "deterministic",
    minimumCount: 2,
    participants: [
      { slotId: "slot-a", playerId: "starter", startMinute: 0, endMinute: 60, ratePer90: 3 },
      { slotId: "slot-a", playerId: "substitute", startMinute: 60, endMinute: 90, ratePer90: 1.5 },
    ],
  };
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(), null, 2)); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
