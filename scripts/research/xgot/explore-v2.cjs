"use strict";
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib"), crypto = require("node:crypto");
const { ROOT, read, save } = require("../../xgot-validation.cjs");
const { loadRows, buildInput, metrics } = require("./run.cjs");
const { predictScenario, scoreMatrix } = require("../../predictions/engine.js");
const { evaluate } = require("./run.cjs");
const { CONFIG, earlier, predict } = require("./model-v2.cjs");
function baselineRows() {
  const rows = loadRows();
  const xg = read("data/normalized/understat-serie-a-xg.json").matches;
  const aliases = { "AC Milan": "Milan", "Parma Calcio 1913": "Parma", "Verona": "Hellas Verona" };
  for (const competition of ["serie-a", "champions-league"]) {
    const file = `data/normalized/xgot-extended-seasons/${competition}-2023-2024.json`;
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    for (const m of read(file).matches) {
      const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, m.source.rawPath)))).payload;
      if (m.hasExtraTimeShotEvents || raw.content?.shotmap?.shots?.some(s => !["FirstHalf", "SecondHalf"].includes(s.period))) continue;
      const score = { home: raw.header.teams[0].score, away: raw.header.teams[1].score };
      if (![score.home, score.away].every(v => Number.isInteger(v) && v >= 0)) continue;
      const candidate = xg.filter(x => x.season === "2023-24" && x.date.slice(0, 10) === m.date &&
        (aliases[x.homeTeam.name] || x.homeTeam.name) === m.teams[0].name && (aliases[x.awayTeam.name] || x.awayTeam.name) === m.teams[1].name);
      rows.push({ ...m, kickoffUtc: raw.general.matchTimeUTCDate, season: "2023-24", score,
        teams: m.teams.map((t, i) => ({ ...t, baselineXg: candidate.length === 1 ? [candidate[0].xg.home, candidate[0].xg.away][i] : null })) });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.providerMatchId.localeCompare(b.providerMatchId));
}
function run() {
  const all = baselineRows(), research = read("data/normalized/xgot-team-research-v2.json").matches;
  const forecasts = [], summary = [];
  for (const competition of ["serie-a", "champions-league"]) {
    const targets = all.filter(m => m.competition === competition && ["2024-25", "2025-26"].includes(m.season));
    let unavailableBaseline = 0, unavailableFeatures = 0;
    for (const target of targets) {
      const history = earlier(all, target).filter(m => m.competition === competition);
      const input = buildInput(target, history);
      if (!input) { unavailableBaseline++; continue; }
      const featureHistory = earlier(research, target);
      const baseline = predictScenario(input);
      const execution = predict(baseline.expected, target, featureHistory, "execution");
      const quality = predict(baseline.expected, target, featureHistory, "quality");
      if (!execution.goals || !quality.goals) { unavailableFeatures++; continue; }
      forecasts.push({ providerMatchId: target.providerMatchId, competition, season: target.season, date: target.date,
        latestHistoryDate: featureHistory.at(-1)?.date, baseline: evaluate(scoreMatrix(baseline.expected.home, baseline.expected.away, 7), target.score),
        execution: { ...execution.evaluation, feature: execution.feature, goals: execution.goals },
        quality: { ...quality.evaluation, feature: quality.feature, goals: quality.goals } });
    }
    for (const season of ["2024-25", "2025-26"]) {
      const sample = forecasts.filter(m => m.competition === competition && m.season === season);
      summary.push({ competition, season, n: sample.length, baseline: metrics(sample.map(m => m.baseline)),
        execution: metrics(sample.map(m => m.execution)), quality: metrics(sample.map(m => m.quality)),
        matchesUsingDomesticEvidence: competition === "champions-league" ? sample.filter(m => m.execution.feature.domesticMatches.some(n => n > 0)).length : 0,
        matchesUsingCrossCompetitionEvidence: sample.filter(m => m.execution.feature.crossCompetitionMatches.some(n => n > 0)).length,
        unavailableBaselineAcrossBothSeasons: unavailableBaseline, unavailableFeaturesAcrossBothSeasons: unavailableFeatures });
    }
  }
  const inputs = ["docs/xgot-protocol-v2.json", "data/normalized/xgot-team-research-v2.json", "scripts/research/xgot/model-v2.cjs",
    "scripts/research/xgot/explore-v2.cjs", "scripts/predictions/engine.js"].map(file => ({ path: file,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex") }));
  const report = { schemaVersion: 2, mode: "exploratory-development-only", newIndependentTest: false,
    predictiveUseApproved: false, protocol: CONFIG, inputs, summary };
  save("data/analysis/xgot/exploration-v2/report.json", report);
  save("data/analysis/xgot/exploration-v2/predictions.json", { schemaVersion: 2, forecasts });
  console.log(JSON.stringify(summary.map(s => ({ competition: s.competition, season: s.season, n: s.n,
    base: s.baseline?.logLoss, execution: s.execution?.logLoss, quality: s.quality?.logLoss, domestic: s.matchesUsingDomesticEvidence }))));
  return report;
}
if (require.main === module) run();
module.exports = { baselineRows, run };
