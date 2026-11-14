"use strict";
const { read } = require("../../xgot-validation.cjs");
const { scoreMatrix } = require("../../predictions/engine.js");
const { evaluate } = require("./run.cjs");
const CONFIG = read("docs/xgot-protocol-v2.json");
const sum = a => a.reduce((n, v) => n + v, 0);
const finite = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
function earlier(rows, target, capturedAt = null) {
  const lower = Date.parse(target.date) - CONFIG.historyWindowDays * 86400000;
  return rows.filter(m => m.date < target.date && Date.parse(m.date) >= lower &&
    (!capturedAt || m.availableAt && Date.parse(m.availableAt) <= Date.parse(capturedAt) &&
      m.kickoffUtc && Date.parse(m.kickoffUtc) < Date.parse(capturedAt)));
}
function featureFactors(target, history, variant) {
  if (!["quality", "execution"].includes(variant)) throw Error("Unknown xGOT variant");
  const denominator = variant === "quality" ? "shotsOnTarget" : "xg";
  const peerRatios = new Map();
  for (const competition of new Set(history.map(m => m.competition))) {
    const teams = history.filter(m => m.competition === competition).flatMap(m => m.teams)
      .filter(t => finite(t.xgot) && finite(t[denominator]));
    const exposure = sum(teams.map(t => t[denominator]));
    const rate = exposure > 0 ? sum(teams.map(t => t.xgot)) / exposure : null;
    if (rate > 0) peerRatios.set(competition, rate);
  }
  const teamRows = target.teams.map(t => history.filter(m => peerRatios.has(m.competition) &&
    m.teams.some(p => p.providerTeamId === t.providerTeamId)).slice(-CONFIG.maximumTeamAppearances));
  const sample = teamRows.map(rr => rr.length);
  if (sample.some(n => n < CONFIG.minimumTeamAppearances)) return { factors: null, sample, reason: "insufficient-acquired-history" };
  const ratios = teamRows.map((rr, i) => {
    const id = target.teams[i].providerTeamId;
    return ["for", "against"].map(side => {
      let numerator = 0, exposure = 0, count = 0;
      for (const m of rr) {
        const own = m.teams.findIndex(t => t.providerTeamId === id), index = side === "for" ? own : 1 - own;
        const t = m.teams[index];
        if (!finite(t.xgot) || !finite(t[denominator])) continue;
        numerator += t.xgot / peerRatios.get(m.competition); exposure += t[denominator]; count++;
      }
      if (count < CONFIG.minimumTeamAppearances) return null;
      const prior = CONFIG.priorExposure[variant];
      return (numerator + prior) / (exposure + prior);
    });
  });
  if (ratios.flat().some(r => r === null)) return { factors: null, sample, reason: "missing-feature-denominators" };
  return { factors: [Math.sqrt(ratios[0][0] * ratios[1][1]), Math.sqrt(ratios[1][0] * ratios[0][1])], sample,
    reason: null, domesticMatches: teamRows.map(rr => rr.filter(m => m.competition !== "champions-league").length),
    crossCompetitionMatches: teamRows.map(rr => rr.filter(m => m.competition !== target.competition).length),
    historyMatchIds: [...new Set(teamRows.flat().map(m => m.providerMatchId))], latestHistoryDate: history.at(-1)?.date || null };
}
function candidateGoals(baseline, factors) {
  if (!factors) return null;
  return [baseline.home, baseline.away].map((v, i) => Math.max(i ? 0.24 : 0.28,
    Math.min(i ? 3.3 : 3.5, v * factors[i] ** CONFIG.weight)));
}
function predict(baseline, target, history, variant) {
  const feature = featureFactors(target, history, variant), goals = candidateGoals(baseline, feature.factors);
  if (!goals) return { feature, goals: null, evaluation: null };
  const matrix = scoreMatrix(goals[0], goals[1], 7);
  return { feature, goals, matrix, evaluation: target.score ? evaluate(matrix, target.score) : null };
}
module.exports = { CONFIG, earlier, featureFactors, candidateGoals, predict };
