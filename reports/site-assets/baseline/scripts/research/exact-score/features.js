"use strict";

const { FEATURE_DEFINITIONS, validateFeatureVector } = require("./contracts");
const { toKickoffUtc, validateSnapshot } = require("../../predictions/snapshot-core");
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const validGoals = score => score && [score.home, score.away].every(value => Number.isInteger(value) && value >= 0);
const currentSource = "data/normalized/matches.json";
const historicalSource = "data/normalized/standings-2025-26.json";

function makeFeatureVector({ target, matches, prior, snapshot = null, sourceHashes, historicalXG = null }) {
  const roundKickoffs = matches.filter(m => m.competition === "serie-a" && m.season === "2026-27" && m.matchday === target.matchday).map(toKickoffUtc).filter(Number.isFinite);
  if (!roundKickoffs.length) throw new Error("Unknown matchday kickoff cutoff");
  const cutoffTime = Math.min(...roundKickoffs);
  const cutoff = { mode: "asOfMatchday", matchdayExclusive: target.matchday, targetMatchIdExcluded: target.id, completedOnly: true, effectiveDateExclusive: new Date(cutoffTime).toISOString() };
  const historicalAvailable = prior?.season === "2025-26" && prior.competition === "serie-a" && prior.status === "final" && Number.isFinite(Date.parse(prior.retrievedAt)) && Date.parse(prior.retrievedAt) < cutoffTime;
  const history = matches.filter(m => m.competition === "serie-a" && m.season === "2026-27" && m.id !== target.id && m.matchday < target.matchday && m.status === "finished" && !m.resultCoverage?.awarded && validGoals(m.score) && m.date && Date.parse(`${m.date}T23:59:59Z`) < cutoffTime);
  const features = {};
  const vector = { schemaVersion: 1, matchId: target.id, homeTeam: target.homeTeam, awayTeam: target.awayTeam, targetMatchday: target.matchday,
    generationClass: snapshot ? "PROSPECTIVE" : "RETROSPECTIVE", retrospective: !snapshot, dataCutoff: cutoff, scenario: "PREDICTED PROCESS", predictionEligible: true, features,
    diagnostics: { promotedTeams: [], historicalCompetitionPolicy: "Serie B never equivalent to Serie A; explicit league fallback when Serie A prior absent", warnings: [] } };
  const put = (key, value, options = {}) => {
    if (!FEATURE_DEFINITIONS[key]) throw new Error(`Unknown feature ${key}`);
    const source = options.source || currentSource, available = Number.isFinite(value);
    const used = options.rows || [];
    features[key] = { value: available ? value : null, group: FEATURE_DEFINITIONS[key].group, provenance: { source, sourceHash: options.sourceHash || sourceHashes[source], cutoff,
      period: options.period || "CURRENT", kind: options.kind || "OBSERVED", availability: available ? "AVAILABLE" : "UNAVAILABLE", matchesUsed: used.map(row => row.id),
      sample: options.sample ?? used.length, availableBefore: options.availableBefore || null, competition: options.competition ?? "serie-a", season: options.season ?? "2026-27", note: options.note || null,
      ...(options.historicalMatchesUsed ? { historicalMatchesUsed: options.historicalMatchesUsed } : {}) } };
  };
  for (const key of Object.keys(FEATURE_DEFINITIONS)) put(key, null, { period: "UNAVAILABLE", kind: "UNAVAILABLE", note: "Unavailable at the target cutoff; never imputed as zero" });
  const stat = (row, teamId, name, against = false) => {
    const side = row.homeTeam === teamId ? "home" : "away";
    return row.teamStats?.[against ? (side === "home" ? "away" : "home") : side]?.[name];
  };
  const historicPut = (key, value, sample) => put(key, historicalAvailable ? value : null, { source: historicalSource, period: "HISTORICAL", sample: sample || 0, season: "2025-26", availableBefore: historicalAvailable ? prior.retrievedAt : null, note: "Previous completed Serie A season only; no cross-competition substitution" });
  const observedAverage = (key, rows, getter) => {
    const available = rows.filter(row => Number.isFinite(getter(row)));
    put(key, mean(available.map(getter)), { rows: available });
  };
  for (const side of ["home", "away"]) {
    const teamId = target[`${side}Team`], rows = history.filter(m => m.homeTeam === teamId || m.awayTeam === teamId);
    const venueRows = rows.filter(m => m[`${side}Team`] === teamId);
    const gf = m => m.homeTeam === teamId ? m.score.home : m.score.away;
    const ga = m => m.homeTeam === teamId ? m.score.away : m.score.home;
    for (const [name, getter] of Object.entries({ goalsFor: gf, goalsAgainst: ga, failedToScoreRate: m => Number(gf(m) === 0), cleanSheetRate: m => Number(ga(m) === 0), bttsRate: m => Number(gf(m) > 0 && ga(m) > 0), over15Rate: m => Number(gf(m) + ga(m) > 1.5), over25Rate: m => Number(gf(m) + ga(m) > 2.5), over35Rate: m => Number(gf(m) + ga(m) > 3.5) })) observedAverage(`${side}.${name}`, rows, getter);
    observedAverage(`${side}.venueGoalsFor`, venueRows, gf);
    observedAverage(`${side}.venueGoalsAgainst`, venueRows, ga);
    for (const [name, field, against, sourceRows] of [
      ["currentXGF", "expectedGoals", false, rows], ["currentXGA", "expectedGoals", true, rows], ["venueXGF", "expectedGoals", false, venueRows], ["venueXGA", "expectedGoals", true, venueRows],
      ["baselineShots", "shots", false, rows], ["shotsAllowed", "shots", true, rows], ["baselineSOT", "shotsOnTarget", false, rows], ["sotAllowed", "shotsOnTarget", true, rows]
    ]) observedAverage(`${side}.${name}`, sourceRows, m => stat(m, teamId, field, against));
    // Paired observations: numerator/denominator never come from different coverage sets.
    for (const [name, against] of [["xGPerShot", false], ["xGAllowedPerShot", true]]) {
      const paired = rows.filter(m => Number.isFinite(stat(m, teamId, "expectedGoals", against)) && Number.isFinite(stat(m, teamId, "shots", against)) && stat(m, teamId, "shots", against) > 0);
      const denominator = paired.reduce((n, m) => n + stat(m, teamId, "shots", against), 0);
      put(`${side}.${name}`, denominator ? paired.reduce((n, m) => n + stat(m, teamId, "expectedGoals", against), 0) / denominator : null, { rows: paired, note: "Ratio of paired sums, not an independent shot-quality measurement" });
    }
    const pairedGF = rows.filter(m => Number.isFinite(stat(m, teamId, "expectedGoals")));
    const pairedGA = rows.filter(m => Number.isFinite(stat(m, teamId, "expectedGoals", true)));
    put(`${side}.finishingResidual`, mean(pairedGF.map(m => gf(m) - stat(m, teamId, "expectedGoals"))), { rows: pairedGF, note: "DIAGNOSTIC ONLY: raw Goals - xG; shrinkage policy undecided, no persistence assumed" });
    put(`${side}.goalkeepingResidual`, mean(pairedGA.map(m => ga(m) - stat(m, teamId, "expectedGoals", true))), { rows: pairedGA, note: "DIAGNOSTIC ONLY: GA - xGA does not establish goalkeeper skill" });
    put(`${side}.isHome`, side === "home" ? 1 : 0, { period: "CONTEXT", kind: "CONTEXT" });
    put(`${side}.currentMatches`, rows.length, { rows });
    put(`${side}.venueMatches`, venueRows.length, { rows: venueRows });
    put(`${side}.xgCoverage`, rows.length ? pairedGF.length / rows.length : null, { rows });
    put(`${side}.xgaCoverage`, rows.length ? pairedGA.length / rows.length : null, { rows });
    put(`${side}.venueXgCoverage`, venueRows.length ? venueRows.filter(m => Number.isFinite(stat(m, teamId, "expectedGoals"))).length / venueRows.length : null, { rows: venueRows });
    put(`${side}.venueXgaCoverage`, venueRows.length ? venueRows.filter(m => Number.isFinite(stat(m, teamId, "expectedGoals", true))).length / venueRows.length : null, { rows: venueRows });
    const historic = historicalAvailable ? prior.rows?.find(row => row.team === teamId) : null;
    const historicVenue = historicalAvailable ? prior[`${side}Rows`]?.find(row => row.team === teamId) : null;
    const rate = (record, field) => record?.played > 0 && Number.isFinite(record[field]) ? record[field] / record.played : null;
    historicPut(`${side}.historicalGoalsFor`, rate(historic, "goalsFor"), historic?.played);
    historicPut(`${side}.historicalGoalsAgainst`, rate(historic, "goalsAgainst"), historic?.played);
    historicPut(`${side}.historicalVenueGoalsFor`, rate(historicVenue, "goalsFor"), historicVenue?.played);
    historicPut(`${side}.historicalVenueGoalsAgainst`, rate(historicVenue, "goalsAgainst"), historicVenue?.played);
    if (historicalAvailable && !historic) vector.diagnostics.promotedTeams.push(teamId);
    if (!snapshot) vector.diagnostics.warnings.push(`${side}: retrospective V2 process/matchup/maturity unavailable; latest profiles are deliberately not replayed`);
  }
  for (const [name, getter] of Object.entries({ homeGoalsAverage: m => m.score.home, awayGoalsAverage: m => m.score.away, totalGoalsAverage: m => m.score.home + m.score.away, homeAdvantage: m => m.score.home - m.score.away, homeXGAverage: m => m.teamStats?.home?.expectedGoals, awayXGAverage: m => m.teamStats?.away?.expectedGoals })) observedAverage(`league.${name}`, history, getter);
  put("league.currentMatches", history.length, { rows: history });
  for (const side of ["home", "away"]) {
    const rows = historicalAvailable ? prior[`${side}Rows`] || [] : [];
    const played = rows.reduce((n, row) => n + row.played, 0);
    historicPut(`league.historical${side === "home" ? "Home" : "Away"}GoalsAverage`, played ? rows.reduce((n, row) => n + row.goalsFor, 0) / played : null, played);
  }
  put("context.matchday", target.matchday, { kind: "CONTEXT", period: "CONTEXT" });
  if (historicalXG && historicalXG.competition === "serie-a" && historicalXG.season === "2025-26" && Date.parse(historicalXG.retrievedAt) < cutoffTime && historicalXG.rows.every(row => Date.parse(row.date) < cutoffTime)) {
    const histXGPut = (key, rate) => put(key, rate?.value, { source: historicalXG.source, sourceHash: historicalXG.sourceHash, period: "HISTORICAL", kind: "OBSERVED", sample: rate?.sample || 0, historicalMatchesUsed: rate?.matchIds || [], season: "2025-26", availableBefore: historicalXG.retrievedAt, note: "Understat previous completed Serie A season; cross-provider scale comparability with current StatMuse xG unverified" });
    for (const side of ["home", "away"]) {
      const team = historicalXG.teams[target[`${side}Team`]];
      histXGPut(`${side}.historicalXGF`, team?.overallFor);
      histXGPut(`${side}.historicalXGA`, team?.overallAgainst);
      histXGPut(`${side}.historicalVenueXGF`, team?.[`${side}For`]);
      histXGPut(`${side}.historicalVenueXGA`, team?.[`${side}Against`]);
    }
    histXGPut("league.historicalHomeXGAverage", historicalXG.league.home);
    histXGPut("league.historicalAwayXGAverage", historicalXG.league.away);
    vector.diagnostics.historicalXG = historicalXG.audit;
  }
  if (snapshot) {
    const failures = validateSnapshot(snapshot);
    if (failures.length || snapshot.matchId !== target.id || snapshot.matchday !== target.matchday || Date.parse(snapshot.generatedAt) >= cutoffTime || JSON.stringify(snapshot.dataCutoff) !== JSON.stringify(cutoff)) throw new Error(`Invalid prospective snapshot/cutoff: ${failures.join(",")}`);
    const snapshotSource = `data/predictions/snapshots/2026-27/md-${String(target.matchday).padStart(2, "0")}.json`;
    for (const side of ["home", "away"]) {
      const projection = snapshot.prediction.teamProjections.find(team => team.venue === side && team.teamId === target[`${side}Team`]);
      if (!projection) throw new Error("Snapshot team identity mismatch");
      const snapOptions = { source: snapshotSource, kind: "PREDICTED", period: "MIXED", availableBefore: snapshot.generatedAt, note: `Immutable team output ${snapshot.snapshotId}; no individual player inputs` };
      for (const [name, value] of Object.entries({ predictedTeamShots: projection.predictedTeamShots, predictedTeamSOT: projection.predictedTeamSOT, sampleMaturity: projection.maturity, offensiveMaturity: projection.outcomeInputs?.offensiveMaturity, defensiveMaturity: projection.outcomeInputs?.opponentDefensiveMaturity, ownShotAdjustmentPct: projection.ownOffensiveSignal?.shotsAdjustmentPct, ownSotAdjustmentPct: projection.ownOffensiveSignal?.shotsOnTargetAdjustmentPct, opponentShotAdjustmentPct: projection.opponentVulnerabilitySignal?.shotsAdjustmentPct, opponentSotAdjustmentPct: projection.opponentVulnerabilitySignal?.shotsOnTargetAdjustmentPct })) put(`${side}.${name}`, value, snapOptions);
      // Goal features frozen with the snapshot override live/revised aggregates for prospective rows.
      const mapping = { goalsFor: "seasonGoalsScoredPerMatch", goalsAgainst: "seasonGoalsConcededPerMatch", currentXGF: "currentXGF", currentXGA: "currentXGA", failedToScoreRate: "failedToScoreRate", cleanSheetRate: "cleanSheetRate", bttsRate: "bttsRate", finishingResidual: "finishingResidualGoalsMinusXG" };
      const frozenRows = (projection.goalFeatures?.matchesUsed || []).map(id => matches.find(m => m.id === id));
      if (frozenRows.some(m => !m)) throw new Error("Unknown frozen history identity");
      for (const [name, field] of Object.entries(mapping)) put(`${side}.${name}`, projection.goalFeatures?.[field], { ...snapOptions, kind: "OBSERVED", period: "CURRENT", rows: frozenRows });
      const direction = projection.opponentVulnerabilitySignal?.direction;
      for (const [metric, prefix] of [["shots", "shot"], ["shotsOnTarget", "sot"]]) {
        const evidence = projection.opponentVulnerabilitySignal?.metricEvidence?.[metric];
        if (evidence?.active && ["vulnerability", "suppression"].includes(direction)) put(`${side}.${prefix}${direction === "vulnerability" ? "Vulnerability" : "Suppression"}`, evidence.positiveDeviationPct, { ...snapOptions, note: `${snapOptions.note}; metricEvidence.${metric}.positiveDeviationPct, direction=${direction}; serialized signal only` });
      }
    }
    vector.diagnostics.warnings.push("Prospective team-process outputs frozen; supplemental observed features reconstructed as-of and separately labelled, not a new exact-score prediction");
  } else vector.diagnostics.warnings.push("RETROSPECTIVE AS-OF: event-time reconstruction from revised reports; original pre-match source availability/revisions cannot be proven");
  validateFeatureVector(vector, matches);
  return vector;
}

function actualForResearch(target) {
  // MD6+ actuals are outside this phase, regardless of later source updates.
  if (target.matchday >= 6) return { actualHomeGoals: null, actualAwayGoals: null, availability: "UNAVAILABLE", reason: "MD6+ actuals prohibited in this framework phase" };
  if (target.status !== "finished" || target.resultCoverage?.awarded || !validGoals(target.score)) return { actualHomeGoals: null, actualAwayGoals: null, availability: "UNAVAILABLE", reason: "Pending, non-sporting, or invalid result" };
  const readStat = (side, field) => Number.isFinite(target.teamStats?.[side]?.[field]) ? target.teamStats[side][field] : null;
  const redFields = [readStat("home", "straightRedCards"), readStat("home", "secondYellowCards"), readStat("away", "straightRedCards"), readStat("away", "secondYellowCards")];
  const reds = redFields.every(Number.isFinite) ? redFields.reduce((a, b) => a + b, 0) : null;
  return { actualHomeGoals: target.score.home, actualAwayGoals: target.score.away, availability: "AVAILABLE", source: currentSource, completedBy: target.date ? `${target.date}T23:59:59Z` : null,
    homeShots: readStat("home", "shots"), awayShots: readStat("away", "shots"), homeSOT: readStat("home", "shotsOnTarget"), awaySOT: readStat("away", "shotsOnTarget"), homeXG: readStat("home", "expectedGoals"), awayXG: readStat("away", "expectedGoals"),
    context: { redCards: reds, gameState: reds > 0 ? "GAME_STATE_DISTORTED" : null, gameStateTimeline: null, homePenalties: readStat("home", "penaltiesFor"), awayPenalties: readStat("away", "penaltiesFor"), openPlayXG: null, excludedFromEvaluation: false } };
}

module.exports = { makeFeatureVector, actualForResearch };
