"use strict";
const fs = require("node:fs"), path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
let cache;
function load() {
  if (cache) return cache;
  const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  cache = { policy: read("data/sources/xgot-operational-policy.json"),
    history: read("data/normalized/xgot-team-research-v2.json").matches,
    identities: read("data/predictions/xgot-prospective/identity-registry.json").mappings };
  return cache;
}
function contextFor({ homeTeamId, awayTeamId, date, generatedAt, eligible = true, competition = "serie-a" }) {
  const { policy, history, identities } = load();
  const result = { status: "insufficient-data", weight: policy.weight, statisticallyValidated: false,
    activation: policy.activation, sample: [0, 0], factors: null };
  if (!policy.enabled || !eligible || policy.activatedAt && Date.parse(generatedAt) < Date.parse(policy.activatedAt)) return { ...result, status: "not-applied" };
  const ids = [homeTeamId, awayTeamId].map(id => identities[id]);
  if (!ids.every(Boolean)) return result;
  // Lazy import: the operational engine itself never imports research runners.
  const { earlier, featureFactors } = require("../research/xgot/model-v2.cjs");
  const target = { competition, date, teams: ids.map(providerTeamId => ({ providerTeamId })) };
  const before = earlier(history, target, generatedAt);
  const feature = featureFactors(target, before, policy.variant);
  return { ...result, status: feature.factors ? "experimental-user-authorized" : "insufficient-data",
    factors: feature.factors, sample: feature.sample, latestHistoryDate: feature.latestHistoryDate || null,
    historyMatchIds: feature.historyMatchIds || [], variant: policy.variant };
}
module.exports = { contextFor };
