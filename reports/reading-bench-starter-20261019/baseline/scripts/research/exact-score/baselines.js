"use strict";
const v = (vector, key) => vector.features[key]?.value ?? null;
function stabilizedRate(current, n, prior, k) {
  if (![n, prior, k].every(Number.isFinite) || n < 0 || prior < 0 || k <= 0 || (current != null && (!Number.isFinite(current) || current < 0))) throw new Error("Invalid baseline shrinkage input");
  const currentWeight = current == null || n === 0 ? 0 : n / (n + k);
  return { value: currentWeight * (current ?? 0) + (1 - currentWeight) * prior, currentWeight, priorWeight: 1 - currentWeight };
}
function predictStrengthBaseline(vector, kind, config) {
  if (vector.generationClass !== "RETROSPECTIVE" || vector.targetMatchday > 5) throw new Error("M1/M2 study is restricted to retrospective MD1–MD5");
  const xg = kind === "XG_BASELINE", k = config.priorEquivalentMatches;
  const environment = side => {
    const title = side === "home" ? "Home" : "Away";
    const currentKey = `league.${side}${xg ? "XG" : "Goals"}Average`, historicalKey = `league.historical${title}${xg ? "XG" : "Goals"}Average`;
    const current = vector.features[currentKey], prior = vector.features[historicalKey];
    const total = v(vector, "league.currentMatches");
    const coverage = total ? current.provenance.sample / total : null;
    const usableCurrent = current.value != null && (!xg || coverage >= config.minimumXGCoverage);
    const chosen = usableCurrent ? current : prior;
    return { rate: chosen.value, currentCoverage: coverage, source: chosen.provenance, fallback: usableCurrent ? null : (prior.value != null ? "HISTORICAL_LEAGUE" : "NO_AVAILABLE_LEAGUE_PRIOR"), xg };
  };
  const homeEnvironment = environment("home"), awayEnvironment = environment("away");
  const lh = homeEnvironment.rate, la = awayEnvironment.rate;
  if (!(lh > 0) || !(la > 0)) return null; // unavailable normalization, never arbitrary lambda clamping
  const component = (side, attack) => {
    const base = (side === "home") === attack ? lh : la, oppositeBase = (side === "home") === attack ? la : lh;
    const suffix = attack ? "For" : "Against";
    const allKey = `${side}.${xg ? (attack ? "currentXGF" : "currentXGA") : `goals${suffix}`}`;
    const venueKey = `${side}.${xg ? (attack ? "venueXGF" : "venueXGA") : `venueGoals${suffix}`}`;
    const historicalVenueKey = `${side}.${xg ? (attack ? "historicalVenueXGF" : "historicalVenueXGA") : `historicalVenueGoals${suffix}`}`;
    const historicalAllKey = `${side}.${xg ? (attack ? "historicalXGF" : "historicalXGA") : `historicalGoals${suffix}`}`;
    const all = vector.features[allKey], venue = vector.features[venueKey], historicalVenue = vector.features[historicalVenueKey], historicalAll = vector.features[historicalAllKey];
    const coverage = { overall: xg ? v(vector, `${side}.${attack ? "xgCoverage" : "xgaCoverage"}`) : null, venue: xg ? v(vector, `${side}.${attack ? "venueXgCoverage" : "venueXgaCoverage"}`) : null };
    const currentAllowed = !xg || v(vector, `${side}.currentMatches`) === 0 || (coverage.overall != null && coverage.overall >= config.minimumXGCoverage);
    const nAll = currentAllowed && all.value != null ? all.provenance.sample : 0;
    const nVenue = currentAllowed && venue.value != null ? venue.provenance.sample : 0;
    if (nVenue > nAll) throw new Error("Venue observations are not a subset of season-to-date evidence");
    const nOther = nAll - nVenue;
    const otherRaw = nOther ? (all.value * nAll - (venue.value ?? 0) * nVenue) / nOther : null;
    if (otherRaw != null && otherRaw < -1e-10) throw new Error("Inconsistent disjoint current evidence");
    let prior = base, priorFeature = null, fallback = "LEAGUE_PRIOR_NO_SERIE_A_TEAM_PRIOR";
    if (historicalVenue.value != null) { prior = historicalVenue.value; priorFeature = historicalVenue; fallback = "HISTORICAL_TEAM_VENUE"; }
    else if (historicalAll.value != null) { prior = historicalAll.value * base / ((lh + la) / 2); priorFeature = historicalAll; fallback = "HISTORICAL_TEAM_OVERALL_VENUE_ADJUSTED"; }
    const otherVenueEquivalent = otherRaw == null ? null : otherRaw * base / oppositeBase;
    const borrowed = stabilizedRate(otherVenueEquivalent, nOther, prior, k);
    const final = stabilizedRate(currentAllowed ? venue.value : null, nVenue, borrowed.value, k);
    const priorWeight = final.priorWeight * borrowed.priorWeight, currentWeight = 1 - priorWeight;
    const sourceMatches = currentAllowed ? all.provenance.matchesUsed : [];
    const venueMatches = currentAllowed ? venue.provenance.matchesUsed : [];
    const nonVenueMatches = sourceMatches.filter(id => !venueMatches.includes(id));
    const label = nAll === 0 ? "PRIOR_ONLY" : priorWeight >= currentWeight ? "PRIOR_DOMINATED" : nAll < k ? "EARLY_CURRENT_EVIDENCE" : "DEVELOPING_EVIDENCE";
    return { rawRate: venue.value, rawOverallRate: all.value, rawStrength: venue.value == null ? null : venue.value / base, stabilizedRate: final.value, stabilizedStrength: final.value / base, leagueNormalization: base,
      nonVenueRawRate: otherRaw, nonVenueVenueEquivalent: otherVenueEquivalent, priorRate: prior, borrowedPriorRate: borrowed.value,
      priorWeight, currentWeight, venueCurrentWeight: final.currentWeight, nonVenueCurrentWeight: final.priorWeight * borrowed.currentWeight,
      sample: { all: nAll, venue: nVenue, nonVenue: nOther, availableTeamMatches: v(vector, `${side}.currentMatches`) }, xgCoverage: coverage, currentCoverageAccepted: currentAllowed,
      fallback, coverageFallback: currentAllowed ? null : "CURRENT_XG_COVERAGE_INSUFFICIENT_USING_PRIOR", maturity: { value: currentWeight, label },
      provenance: { cutoff: vector.dataCutoff, currentSource: all.provenance.source, currentSourceHash: all.provenance.sourceHash, sourceMatches, venueMatches, nonVenueMatches,
        priorSource: priorFeature?.provenance ?? ((side === "home") === attack ? homeEnvironment.source : awayEnvironment.source), historicalPriorUsed: Boolean(priorFeature), priorMatches: priorFeature?.provenance.historicalMatchesUsed ?? null, priorMatchIdentityAvailability: priorFeature?.provenance.historicalMatchesUsed ? "MATCH_LEVEL" : "AGGREGATE_ONLY_OR_LEAGUE", reconstructionClass: "RETROSPECTIVE_RECONSTRUCTION" } };
  };
  const components = { homeAttack: component("home", true), awayAttack: component("away", true), homeDefense: component("home", false), awayDefense: component("away", false) };
  const lambdaHome = lh * components.homeAttack.stabilizedStrength * components.awayDefense.stabilizedStrength;
  const lambdaAway = la * components.awayAttack.stabilizedStrength * components.homeDefense.stabilizedStrength;
  const trace = { targetMatchday: vector.targetMatchday, cutoffMatchday: vector.targetMatchday - 1, cutoffMatchdayExclusive: vector.targetMatchday, dataCutoff: vector.dataCutoff,
    matchesAvailable: v(vector, "league.currentMatches"), teamSample: { home: v(vector, "home.currentMatches"), away: v(vector, "away.currentMatches") }, opponentSample: { home: v(vector, "away.currentMatches"), away: v(vector, "home.currentMatches") },
    leagueHomeRate: lh, leagueAwayRate: la, ...(xg ? { leagueHomeXG: lh, leagueAwayXG: la } : {}), leagueEnvironment: { home: homeEnvironment, away: awayEnvironment }, lambdaHome, lambdaAway, components,
    priorWeight: Object.fromEntries(Object.entries(components).map(([name, c]) => [name, c.priorWeight])), currentWeight: Object.fromEntries(Object.entries(components).map(([name, c]) => [name, c.currentWeight])),
    historicalPriorUsed: Object.fromEntries(Object.entries(components).map(([name, c]) => [name, c.provenance.historicalPriorUsed])), fallback: Object.fromEntries(Object.entries(components).map(([name, c]) => [name, { prior: c.fallback, coverage: c.coverageFallback }])),
    maturity: Object.fromEntries(Object.entries(components).map(([name, c]) => [name, c.maturity])), label: "RETROSPECTIVE RESEARCH ONLY", configuration: config, training: null, currentEvidenceUsedOnce: true,
    layers: { goalStrength: Object.fromEntries(Object.entries(components).map(([name, c]) => [`${name}Strength`, c.stabilizedStrength])), processAdjustment: "NOT_APPLIED", goalDistribution: "INDEPENDENT_POISSON" } };
  for (const [name, c] of Object.entries(components)) {
    const title = name[0].toUpperCase() + name.slice(1);
    trace[`raw${title}`] = c.rawStrength; trace[`stabilized${title}`] = c.stabilizedStrength;
  }
  return { lambdaHome, lambdaAway, diagnostics: trace };
}
module.exports = { stabilizedRate, predictStrengthBaseline };
