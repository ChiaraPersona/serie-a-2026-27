"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..", "..");
const scoreboardsRoot = path.join(root, "data", "raw", "head-to-head", "espn", "scoreboards");
const outputPath = path.join(root, "data", "generated", "prediction-backtest-opening-rounds.json");
const xgPath = path.join(root, "data", "normalized", "understat-serie-a-xg.json");
const testSeasons = ["2013-14", "2014-15", "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
const trainingSeasons = new Set(testSeasons.slice(0, -3));
const validationSeasons = new Set(["2023-24", "2024-25", "2025-26"]);
const weights = { venue: 0.46, overall: 0.25, recent: 0.16 };

const sum = values => values.reduce((total, value) => total + value, 0);
const mean = values => values.length ? sum(values) / values.length : null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 4) => Number(value.toFixed(digits));
const priorSeason = season => `${Number(season.slice(0, 4)) - 1}-${String(Number(season.slice(0, 4))).slice(-2)}`;
const normalizeTeamName = value => ({
  "ac milan": "milan", "as roma": "roma", inter: "internazionale", "parma calcio 1913": "parma", verona: "hellas verona"
}[String(value).toLowerCase()] || String(value).toLowerCase());
const xgDataset = fs.existsSync(xgPath) ? JSON.parse(fs.readFileSync(xgPath, "utf8")) : { matches: [] };
const xgBySeason = new Map();
for (const match of xgDataset.matches) {
  if (!xgBySeason.has(match.season)) xgBySeason.set(match.season, []);
  xgBySeason.get(match.season).push(match);
}

function xgForMatch(match) {
  const candidates = (xgBySeason.get(match.season) || []).filter(candidate =>
    normalizeTeamName(candidate.homeTeam.name) === normalizeTeamName(match.homeTeam.name)
    && normalizeTeamName(candidate.awayTeam.name) === normalizeTeamName(match.awayTeam.name));
  if (!candidates.length) return null;
  const matchTime = new Date(match.date).getTime();
  const selected = candidates.sort((left, right) => Math.abs(new Date(left.date).getTime() - matchTime) - Math.abs(new Date(right.date).getTime() - matchTime))[0];
  return Math.abs(new Date(selected.date).getTime() - matchTime) <= 172800000 ? selected.xg : null;
}

const competitorStats = competitor => Object.fromEntries((competitor?.statistics || []).map(stat => [stat.name, Number(stat.displayValue)]));

function readMatches(season, competition) {
  const file = path.join(scoreboardsRoot, season, `${competition}.json.gz`);
  if (!fs.existsSync(file)) return [];
  const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
  return (payload.payload?.events || []).filter(event => event.status?.type?.completed).map(event => {
    const competitors = event.competitions?.[0]?.competitors || [];
    const home = competitors.find(row => row.homeAway === "home"), away = competitors.find(row => row.homeAway === "away");
    const match = {
      id: String(event.id), season, date: event.date,
      homeTeam: { id: String(home?.team?.id || ""), name: home?.team?.displayName || "N/D" },
      awayTeam: { id: String(away?.team?.id || ""), name: away?.team?.displayName || "N/D" },
      score: { home: Number(home?.score), away: Number(away?.score) },
      teamStats: { home: competitorStats(home), away: competitorStats(away) }
    };
    return { ...match, xg: competition === "ita.1" ? xgForMatch(match) : null };
  }).filter(match => match.homeTeam.id && match.awayTeam.id && Number.isFinite(match.score.home) && Number.isFinite(match.score.away))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
}

function leagueRates(matches) {
  return { home: mean(matches.map(match => match.score.home)), away: mean(matches.map(match => match.score.away)) };
}

function teamMatches(matches, teamId, venue = null) {
  return matches.filter(match => venue === "home" ? match.homeTeam.id === teamId : venue === "away" ? match.awayTeam.id === teamId : match.homeTeam.id === teamId || match.awayTeam.id === teamId);
}

function rate(matches, teamId, venue, type) {
  const rows = teamMatches(matches, teamId, venue);
  if (!rows.length) return null;
  return mean(rows.map(match => {
    const atHome = match.homeTeam.id === teamId;
    return type === "for" ? (atHome ? match.score.home : match.score.away) : (atHome ? match.score.away : match.score.home);
  }));
}

function weightedGeometric(items) {
  const usable = items.filter(item => Number.isFinite(item.value));
  const totalWeight = sum(usable.map(item => item.weight));
  return Math.exp(sum(usable.map(item => Math.log(clamp(item.value, 0.35, 2.4)) * item.weight)) / totalWeight);
}

function teamStrength(profileMatches, teamId, venue, type, venueBaseline, overallBaseline, promoted, configuration) {
  const adjust = value => promoted ? value * (type === "for" ? configuration.promotedAttack : configuration.promotedDefence) : value;
  const ratio = (value, baseline, reliability) => 1 + (adjust(value) / baseline - 1) * reliability * configuration.carryStrength;
  const recent = teamMatches(profileMatches, teamId).slice(-8);
  const recentRate = mean(recent.map(match => {
    const atHome = match.homeTeam.id === teamId;
    return type === "for" ? (atHome ? match.score.home : match.score.away) : (atHome ? match.score.away : match.score.home);
  }));
  return weightedGeometric([
    { value: ratio(rate(profileMatches, teamId, venue, type), venueBaseline, 0.7), weight: weights.venue },
    { value: ratio(rate(profileMatches, teamId, null, type), overallBaseline, 0.62), weight: weights.overall },
    { value: ratio(recentRate, overallBaseline, 0.48), weight: weights.recent }
  ]);
}

function processProfile(history, teamId, type, league) {
  const rows = teamMatches(history, teamId).slice(-2);
  if (!rows.length) return null;
  const observations = rows.map(match => {
    const atHome = match.homeTeam.id === teamId;
    const ownSide = atHome ? "home" : "away", opponentSide = atHome ? "away" : "home";
    const side = type === "for" ? ownSide : opponentSide;
    return {
      goals: match.score[side],
      xg: Number(match.xg?.[side]),
      shotsOnTarget: Number(match.teamStats?.[side]?.shotsOnTarget),
      shots: Number(match.teamStats?.[side]?.totalShots)
    };
  });
  const metricRate = metric => mean(observations.map(row => row[metric]).filter(Number.isFinite));
  const components = [
    { key: "xg", value: metricRate("xg"), baseline: league.xg, weight: 0.7 },
    { key: "shotsOnTarget", value: metricRate("shotsOnTarget"), baseline: league.shotsOnTarget, weight: 0.2 },
    { key: "shots", value: metricRate("shots"), baseline: league.shots, weight: 0.1 }
  ].filter(component => Number.isFinite(component.value) && component.baseline > 0);
  if (!components.length) return null;
  const weightTotal = sum(components.map(component => component.weight));
  const ratio = Math.exp(sum(components.map(component => Math.log(clamp(component.value / component.baseline, 0.35, 2.4)) * component.weight)) / weightTotal);
  return {
    matches: rows.length,
    ratio,
    ratios: {
      ...Object.fromEntries(components.map(component => [component.key, clamp(component.value / component.baseline, 0.35, 2.4)])),
      goals: league.goals > 0 ? clamp(metricRate("goals") / league.goals, 0.35, 2.4) : null
    },
    goals: metricRate("goals"),
    xg: metricRate("xg"),
    shotsOnTarget: metricRate("shotsOnTarget"),
    shots: metricRate("shots")
  };
}

function processLeague(previousMatches) {
  const teamRows = previousMatches.flatMap(match => ["home", "away"].map(side => ({
    goals: Number(match.score?.[side]),
    xg: Number(match.xg?.[side]),
    shotsOnTarget: Number(match.teamStats?.[side]?.shotsOnTarget),
    shots: Number(match.teamStats?.[side]?.totalShots)
  })));
  return {
    goals: mean(teamRows.map(row => row.goals).filter(Number.isFinite)),
    xg: mean(teamRows.map(row => row.xg).filter(Number.isFinite)),
    shotsOnTarget: mean(teamRows.map(row => row.shotsOnTarget).filter(Number.isFinite)),
    shots: mean(teamRows.map(row => row.shots).filter(Number.isFinite))
  };
}

function processFactor(profile, strength, mode = "combined") {
  if (!profile || !(strength > 0)) return 1;
  const reliability = profile.matches / (profile.matches + 6);
  const ratio = mode === "xg-only" ? profile.ratios?.xg
    : mode === "xg-sot" && profile.ratios?.xg && profile.ratios?.shotsOnTarget
      ? profile.ratios.xg ** 0.78 * profile.ratios.shotsOnTarget ** 0.22
      : profile.ratio;
  if (!Number.isFinite(ratio)) return 1;
  return clamp(1 + (ratio - 1) * reliability * strength, 0.85, 1.15);
}

function recentReplacementFactor(profile, processShare = 0) {
  if (!profile || profile.matches < 2) return 1;
  const goalRatio = profile.ratios?.goals;
  const processRatio = Number.isFinite(profile.ratios?.xg)
    ? profile.ratios.xg
    : profile.ratios?.shotsOnTarget;
  if (!Number.isFinite(goalRatio)) return 1;
  const usableProcessShare = Number.isFinite(processRatio) ? clamp(processShare, 0, 1) : 0;
  const blendedRatio = Math.exp(
    Math.log(goalRatio) * (1 - usableProcessShare)
    + Math.log(processRatio || goalRatio) * usableProcessShare
  );
  const reliability = profile.matches / (profile.matches + 6);
  const recentLambdaShare = weights.recent / sum(Object.values(weights));
  return clamp(1 + (blendedRatio - 1) * reliability * recentLambdaShare, 0.97, 1.03);
}

function lambdas(sample, configuration) {
  const league = leagueRates(sample.previousA);
  const overall = (league.home + league.away) / 2;
  const homeRows = sample.homeDivision === "Serie A" ? sample.previousA : sample.previousB;
  const awayRows = sample.awayDivision === "Serie A" ? sample.previousA : sample.previousB;
  const homePromoted = sample.homeDivision === "Serie B", awayPromoted = sample.awayDivision === "Serie B";
  const homeAttack = teamStrength(homeRows, sample.match.homeTeam.id, "home", "for", league.home, overall, homePromoted, configuration);
  const homeDefence = teamStrength(homeRows, sample.match.homeTeam.id, "home", "against", league.away, overall, homePromoted, configuration);
  const awayAttack = teamStrength(awayRows, sample.match.awayTeam.id, "away", "for", league.away, overall, awayPromoted, configuration);
  const awayDefence = teamStrength(awayRows, sample.match.awayTeam.id, "away", "against", league.home, overall, awayPromoted, configuration);
  let home = league.home * homeAttack * awayDefence;
  let away = league.away * awayAttack * homeDefence;
  const { homeAttack: homeAttackProcess, homeDefence: homeDefenceProcess, awayAttack: awayAttackProcess, awayDefence: awayDefenceProcess } = sample.processProfiles;
  if (configuration.processStrategy === "recent-replacement") {
    home *= recentReplacementFactor(homeAttackProcess, configuration.processShare) * recentReplacementFactor(awayDefenceProcess, configuration.processShare);
    away *= recentReplacementFactor(awayAttackProcess, configuration.processShare) * recentReplacementFactor(homeDefenceProcess, configuration.processShare);
  } else {
    home *= processFactor(homeAttackProcess, configuration.processStrength, configuration.processMode) * processFactor(awayDefenceProcess, configuration.processStrength, configuration.processMode);
    away *= processFactor(awayAttackProcess, configuration.processStrength, configuration.processMode) * processFactor(homeDefenceProcess, configuration.processStrength, configuration.processMode);
  }
  return { home: clamp(home, 0.3, 3.5), away: clamp(away, 0.25, 3.3) };
}

function poisson(goals, lambda) {
  let factorial = 1;
  for (let value = 2; value <= goals; value += 1) factorial *= value;
  return Math.exp(-lambda) * lambda ** goals / factorial;
}

function evaluate(samples, configuration) {
  const rows = samples.map(sample => {
    const expected = lambdas(sample, configuration);
    const scores = [];
    for (let home = 0; home <= 8; home += 1) for (let away = 0; away <= 8; away += 1) scores.push({ home, away, probability: poisson(home, expected.home) * poisson(away, expected.away) });
    const total = sum(scores.map(score => score.probability));
    scores.forEach(score => { score.probability /= total; });
    const probabilities = [sum(scores.filter(score => score.home > score.away).map(score => score.probability)), sum(scores.filter(score => score.home === score.away).map(score => score.probability)), sum(scores.filter(score => score.home < score.away).map(score => score.probability))];
    const outcome = sample.match.score.home > sample.match.score.away ? 0 : sample.match.score.home === sample.match.score.away ? 1 : 2;
    const scoreProbability = scores.find(score => score.home === sample.match.score.home && score.away === sample.match.score.away)?.probability || 1e-10;
    const ordered = [...scores].sort((a, b) => b.probability - a.probability);
    return {
      season: sample.match.season,
      openingIndex: sample.openingIndex,
      promotedMatch: sample.homeDivision === "Serie B" || sample.awayDivision === "Serie B",
      oneXTwoLogLoss: -Math.log(clamp(probabilities[outcome], 1e-10, 1)),
      oneXTwoBrier: sum(probabilities.map((probability, index) => (probability - Number(index === outcome)) ** 2)),
      accuracy: Number(probabilities.indexOf(Math.max(...probabilities)) === outcome),
      scoreLogLoss: -Math.log(clamp(scoreProbability, 1e-10, 1)),
      topThree: Number(ordered.slice(0, 3).some(score => score.home === sample.match.score.home && score.away === sample.match.score.away))
    };
  });
  return { rows, metrics: metrics(rows) };
}

function metrics(rows) {
  return {
    matches: rows.length,
    promotedMatches: rows.filter(row => row.promotedMatch).length,
    oneXTwoLogLoss: round(mean(rows.map(row => row.oneXTwoLogLoss))),
    oneXTwoBrier: round(mean(rows.map(row => row.oneXTwoBrier))),
    oneXTwoAccuracyPct: round(mean(rows.map(row => row.accuracy)) * 100, 1),
    scoreLogLoss: round(mean(rows.map(row => row.scoreLogLoss))),
    exactTopThreeHitPct: round(mean(rows.map(row => row.topThree)) * 100, 1)
  };
}

function bootstrap(candidate, baseline, metric, iterations = 3000) {
  let state = 20260806;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  const differences = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let difference = 0;
    for (let index = 0; index < candidate.length; index += 1) {
      const sampled = Math.floor(random() * candidate.length);
      difference += baseline[sampled][metric] - candidate[sampled][metric];
    }
    differences.push(difference / candidate.length);
  }
  differences.sort((a, b) => a - b);
  return { meanImprovement: round(mean(differences)), confidenceInterval95: [round(differences[Math.floor(iterations * 0.025)]), round(differences[Math.floor(iterations * 0.975)])] };
}

const samples = [];
for (const season of testSeasons) {
  const previous = priorSeason(season), previousA = readMatches(previous, "ita.1"), previousB = readMatches(previous, "ita.2"), current = readMatches(season, "ita.1");
  const previousATeams = new Set(previousA.flatMap(match => [match.homeTeam.id, match.awayTeam.id]));
  const previousBTeams = new Set(previousB.flatMap(match => [match.homeTeam.id, match.awayTeam.id]));
  const appearances = new Map();
  for (const match of current) {
    const homeIndex = appearances.get(match.homeTeam.id) || 0, awayIndex = appearances.get(match.awayTeam.id) || 0;
    const homeDivision = previousATeams.has(match.homeTeam.id) ? "Serie A" : previousBTeams.has(match.homeTeam.id) ? "Serie B" : null;
    const awayDivision = previousATeams.has(match.awayTeam.id) ? "Serie A" : previousBTeams.has(match.awayTeam.id) ? "Serie B" : null;
    if (homeIndex < 3 && awayIndex < 3 && homeDivision && awayDivision) {
      const currentHistory = current.filter(row => new Date(row.date) < new Date(match.date));
      const process = processLeague(previousA);
      samples.push({
        match, previousA, previousB, currentHistory, homeDivision, awayDivision,
        openingIndex: Math.max(homeIndex, awayIndex) + 1,
        processProfiles: {
          homeAttack: processProfile(currentHistory, match.homeTeam.id, "for", process),
          homeDefence: processProfile(currentHistory, match.homeTeam.id, "against", process),
          awayAttack: processProfile(currentHistory, match.awayTeam.id, "for", process),
          awayDefence: processProfile(currentHistory, match.awayTeam.id, "against", process)
        }
      });
    }
    appearances.set(match.homeTeam.id, homeIndex + 1);
    appearances.set(match.awayTeam.id, awayIndex + 1);
  }
}

const training = samples.filter(sample => trainingSeasons.has(sample.match.season));
const validation = samples.filter(sample => validationSeasons.has(sample.match.season));
const currentConfiguration = { promotedAttack: 0.62, promotedDefence: 1.18, carryStrength: 1 };
const candidates = [];
for (const promotedAttack of [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]) for (const promotedDefence of [1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4]) for (const carryStrength of [0.75, 0.9, 1]) {
  const configuration = { promotedAttack, promotedDefence, carryStrength };
  const result = evaluate(training, configuration);
  candidates.push({ configuration, score: result.metrics.oneXTwoLogLoss + result.metrics.scoreLogLoss, metrics: result.metrics });
}
candidates.sort((a, b) => a.score - b.score);
const selectedConfiguration = candidates[0].configuration;
const regularizedConfiguration = {
  promotedAttack: round((currentConfiguration.promotedAttack + selectedConfiguration.promotedAttack) / 2, 2),
  promotedDefence: round((currentConfiguration.promotedDefence + selectedConfiguration.promotedDefence) / 2, 2),
  carryStrength: 1
};
const currentTraining = evaluate(training, currentConfiguration);
const current = evaluate(validation, currentConfiguration), selected = evaluate(validation, selectedConfiguration), regularized = evaluate(validation, regularizedConfiguration);
const firstRoundCurrent = { rows: current.rows.filter(row => row.openingIndex === 1) };
const firstRoundSelected = { rows: selected.rows.filter(row => row.openingIndex === 1) };
const firstRoundRegularized = { rows: regularized.rows.filter(row => row.openingIndex === 1) };
firstRoundCurrent.metrics = metrics(firstRoundCurrent.rows);
firstRoundSelected.metrics = metrics(firstRoundSelected.rows);
firstRoundRegularized.metrics = metrics(firstRoundRegularized.rows);
const processCandidates = ["xg-only", "xg-sot", "combined"].flatMap(processMode => [0.1, 0.25, 0.5, 0.75, 1].map(processStrength => {
  const configuration = { ...regularizedConfiguration, processStrength, processMode };
  const result = evaluate(training, configuration);
  return { configuration, score: result.metrics.oneXTwoLogLoss + result.metrics.scoreLogLoss, metrics: result.metrics };
})).sort((left, right) => left.score - right.score);
const processConfiguration = processCandidates[0].configuration;
const processRegression = evaluate(validation, processConfiguration);
const firstRoundProcess = { rows: processRegression.rows.filter(row => row.openingIndex === 1) };
firstRoundProcess.metrics = metrics(firstRoundProcess.rows);
const recentGoalsConfiguration = { ...regularizedConfiguration, processStrategy: "recent-replacement", processShare: 0 };
const recentGoalsTraining = evaluate(training, recentGoalsConfiguration);
const recentGoals = evaluate(validation, recentGoalsConfiguration);
const replacementCandidates = [0.25, 0.5, 0.75, 1].map(processShare => {
  const configuration = { ...regularizedConfiguration, processStrategy: "recent-replacement", processShare };
  const result = evaluate(training, configuration);
  return { configuration, score: result.metrics.oneXTwoLogLoss + result.metrics.scoreLogLoss, metrics: result.metrics };
}).sort((left, right) => left.score - right.score);
const replacementConfiguration = replacementCandidates[0].configuration;
const processReplacement = evaluate(validation, replacementConfiguration);
const firstRoundRecentGoals = { rows: recentGoals.rows.filter(row => row.openingIndex === 1) };
const firstRoundReplacement = { rows: processReplacement.rows.filter(row => row.openingIndex === 1) };
firstRoundRecentGoals.metrics = metrics(firstRoundRecentGoals.rows);
firstRoundReplacement.metrics = metrics(firstRoundReplacement.rows);
const improvement = (baseline, candidate) => round((baseline - candidate) / baseline * 100, 2);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: {
    type: "opening-rounds-walk-forward",
    trainingSeasons: [...trainingSeasons],
    validationSeasons: [...validationSeasons],
    scope: "Prime tre presenze stagionali per squadra: prior dalla stagione precedente e correttivo corrente su xG, tiri in porta e tiri, ristretto per il campione disponibile; Serie B inclusa per le neopromosse.",
    selection: "Griglia scelta sulle stagioni di training e valutata senza riottimizzazione sulle tre stagioni successive."
  },
  samples: { training: training.length, validation: validation.length, firstRoundValidation: firstRoundSelected.rows.length },
  current: { configuration: currentConfiguration, training: currentTraining.metrics, validation: current.metrics, firstRound: firstRoundCurrent.metrics },
  trainingShortlist: candidates.slice(0, 12),
  selected: { configuration: selectedConfiguration, training: candidates[0].metrics, validation: selected.metrics, firstRound: firstRoundSelected.metrics },
  regularized: { configuration: regularizedConfiguration, validation: regularized.metrics, firstRound: firstRoundRegularized.metrics },
  processRegression: {
    configuration: processConfiguration,
    trainingShortlist: processCandidates,
    validation: processRegression.metrics,
    firstRound: firstRoundProcess.metrics,
    improvementVsRegularizedPct: {
      oneXTwoLogLoss: improvement(regularized.metrics.oneXTwoLogLoss, processRegression.metrics.oneXTwoLogLoss),
      oneXTwoBrier: improvement(regularized.metrics.oneXTwoBrier, processRegression.metrics.oneXTwoBrier),
      scoreLogLoss: improvement(regularized.metrics.scoreLogLoss, processRegression.metrics.scoreLogLoss),
      firstRoundOneXTwoLogLoss: improvement(firstRoundRegularized.metrics.oneXTwoLogLoss, firstRoundProcess.metrics.oneXTwoLogLoss),
      firstRoundScoreLogLoss: improvement(firstRoundRegularized.metrics.scoreLogLoss, firstRoundProcess.metrics.scoreLogLoss)
    },
    pairedBootstrap: {
      oneXTwoLogLoss: bootstrap(processRegression.rows, regularized.rows, "oneXTwoLogLoss"),
      oneXTwoBrier: bootstrap(processRegression.rows, regularized.rows, "oneXTwoBrier"),
      scoreLogLoss: bootstrap(processRegression.rows, regularized.rows, "scoreLogLoss")
    }
  },
  processReplacement: {
    design: {
      comparator: "recent-goals-only",
      processSignal: "xG, con tiri in porta solo come fallback",
      minimumCurrentSeasonMatches: 2,
      reliability: "n / (n + 6)",
      recentLambdaShare: round(weights.recent / sum(Object.values(weights))),
      maximumLambdaImpactPerComponent: 0.03,
      limitation: "Lo storico usato non separa npxG, rigori ed espulsioni: queste correzioni non vengono attivate senza una validazione dedicata."
    },
    goalsBaseline: {
      configuration: recentGoalsConfiguration,
      training: recentGoalsTraining.metrics,
      validation: recentGoals.metrics,
      firstRound: firstRoundRecentGoals.metrics
    },
    configuration: replacementConfiguration,
    trainingShortlist: replacementCandidates,
    validation: processReplacement.metrics,
    firstRound: firstRoundReplacement.metrics,
    improvementVsGoalsBaselinePct: {
      oneXTwoLogLoss: improvement(recentGoals.metrics.oneXTwoLogLoss, processReplacement.metrics.oneXTwoLogLoss),
      oneXTwoBrier: improvement(recentGoals.metrics.oneXTwoBrier, processReplacement.metrics.oneXTwoBrier),
      scoreLogLoss: improvement(recentGoals.metrics.scoreLogLoss, processReplacement.metrics.scoreLogLoss),
      firstRoundOneXTwoLogLoss: improvement(firstRoundRecentGoals.metrics.oneXTwoLogLoss, firstRoundReplacement.metrics.oneXTwoLogLoss),
      firstRoundScoreLogLoss: improvement(firstRoundRecentGoals.metrics.scoreLogLoss, firstRoundReplacement.metrics.scoreLogLoss)
    },
    improvementVsRegularizedPct: {
      oneXTwoLogLoss: improvement(regularized.metrics.oneXTwoLogLoss, processReplacement.metrics.oneXTwoLogLoss),
      oneXTwoBrier: improvement(regularized.metrics.oneXTwoBrier, processReplacement.metrics.oneXTwoBrier),
      scoreLogLoss: improvement(regularized.metrics.scoreLogLoss, processReplacement.metrics.scoreLogLoss)
    },
    pairedBootstrap: {
      oneXTwoLogLoss: bootstrap(processReplacement.rows, recentGoals.rows, "oneXTwoLogLoss"),
      oneXTwoBrier: bootstrap(processReplacement.rows, recentGoals.rows, "oneXTwoBrier"),
      scoreLogLoss: bootstrap(processReplacement.rows, recentGoals.rows, "scoreLogLoss")
    }
  },
  improvementVsCurrentPct: {
    oneXTwoLogLoss: improvement(current.metrics.oneXTwoLogLoss, selected.metrics.oneXTwoLogLoss),
    oneXTwoBrier: improvement(current.metrics.oneXTwoBrier, selected.metrics.oneXTwoBrier),
    scoreLogLoss: improvement(current.metrics.scoreLogLoss, selected.metrics.scoreLogLoss),
    firstRoundOneXTwoLogLoss: improvement(firstRoundCurrent.metrics.oneXTwoLogLoss, firstRoundSelected.metrics.oneXTwoLogLoss),
    firstRoundScoreLogLoss: improvement(firstRoundCurrent.metrics.scoreLogLoss, firstRoundSelected.metrics.scoreLogLoss)
  },
  pairedBootstrap: {
    oneXTwoLogLoss: bootstrap(selected.rows, current.rows, "oneXTwoLogLoss"),
    scoreLogLoss: bootstrap(selected.rows, current.rows, "scoreLogLoss"),
    regularizedOneXTwoLogLoss: bootstrap(regularized.rows, current.rows, "oneXTwoLogLoss"),
    regularizedScoreLogLoss: bootstrap(regularized.rows, current.rows, "scoreLogLoss")
  }
};
output.regularizedImprovementVsCurrentPct = {
  oneXTwoLogLoss: improvement(current.metrics.oneXTwoLogLoss, regularized.metrics.oneXTwoLogLoss),
  oneXTwoBrier: improvement(current.metrics.oneXTwoBrier, regularized.metrics.oneXTwoBrier),
  scoreLogLoss: improvement(current.metrics.scoreLogLoss, regularized.metrics.scoreLogLoss),
  firstRoundOneXTwoLogLoss: improvement(firstRoundCurrent.metrics.oneXTwoLogLoss, firstRoundRegularized.metrics.oneXTwoLogLoss),
  firstRoundScoreLogLoss: improvement(firstRoundCurrent.metrics.scoreLogLoss, firstRoundRegularized.metrics.scoreLogLoss)
};
const carryOverAdopt = output.regularizedImprovementVsCurrentPct.oneXTwoLogLoss > 0 && output.regularizedImprovementVsCurrentPct.scoreLogLoss > 0;
output.recommendation = carryOverAdopt ? "adopt-regularized-carry-over" : "keep-current-carry-over";
const processDecision = output.processRegression;
const processAdopt = processDecision.improvementVsRegularizedPct.oneXTwoLogLoss > 0
  && processDecision.improvementVsRegularizedPct.oneXTwoBrier >= 0
  && processDecision.improvementVsRegularizedPct.scoreLogLoss > 0
  && processDecision.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] >= 0;
output.processRegression.recommendation = processAdopt ? "adopt-process-regression" : "keep-process-regression-disabled";
const replacementDecision = output.processReplacement;
const replacementAdopt = replacementDecision.improvementVsGoalsBaselinePct.oneXTwoLogLoss > 0
  && replacementDecision.improvementVsGoalsBaselinePct.oneXTwoBrier >= 0
  && replacementDecision.improvementVsGoalsBaselinePct.scoreLogLoss > 0
  && replacementDecision.validation.exactTopThreeHitPct >= replacementDecision.goalsBaseline.validation.exactTopThreeHitPct
  && replacementDecision.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] >= 0;
output.processReplacement.recommendation = replacementAdopt ? "adopt-process-replacement" : "keep-process-replacement-disabled";
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK opening rounds: ${validation.length} gare validation, ${output.recommendation}`);
