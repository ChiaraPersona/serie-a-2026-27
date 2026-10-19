"use strict";
// Internal preparation gate only; production builders do not consume this module yet.
const TEAM_ONLY = Object.freeze(["slavia-praha", "sabah", "slovan-bratislava", "shakhtar-donetsk"]);
function individualPolicy(teamId) {
  return {mode: TEAM_ONLY.includes(teamId) ? "collective-only" : "individual-evidence-review", individualForecastsAllowed: !TEAM_ONLY.includes(teamId)};
}
function readiness({teamId, lineupCount, benchCount, exactIdentities, evidenceReady, engineLinkApproved, oddsReady}) {
  const policy = individualPolicy(teamId);
  const blockers = [];
  if (!policy.individualForecastsAllowed) blockers.push("COLLECTIVE_ONLY_BY_USER");
  if (lineupCount !== 11) blockers.push("MD3_LINEUP_MISSING_OR_INCOMPLETE");
  if (!benchCount) blockers.push("MD3_BENCH_UNAVAILABLE");
  if (!exactIdentities) blockers.push("CANONICAL_IDENTITIES_REQUIRED");
  if (!evidenceReady) blockers.push("INDIVIDUAL_EVIDENCE_NOT_SUFFICIENT");
  if (!engineLinkApproved) blockers.push("CURRENT_SEASON_ENGINE_LINK_AWAITING_APPROVAL");
  if (!oddsReady) blockers.push("VERIFIED_PROVIDER_CONTRACT_REQUIRED");
  return {...policy, blockers, individualGenerationReady: blockers.length === 0};
}
module.exports = {TEAM_ONLY, individualPolicy, readiness};
