"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..", "..");
const scoreboardsRoot = path.join(root, "data", "raw", "head-to-head", "espn", "scoreboards");
const outputPath = path.join(root, "data", "generated", "prediction-backtest-multiseason.json");
const xgPath = path.join(root, "data", "normalized", "understat-serie-a-xg.json");
const seasons = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
const testSeasons = new Set(["2022-23", "2023-24", "2024-25", "2025-26"]);
const parameters = { venueWeight: 0.46, overallWeight: 0.25, recentWeight: 0.16, venueReliability: 0.7, overallReliability: 0.62, recentReliability: 0.48 };
const opponentRatingExponents = [0.1, 0.2, 0.25, 0.35, 0.5, 0.75];
const headToHeadConfiguration = { cap: 0.05, decay: 0.6, lowerDivisionWeight: 0.8, cupWeight: 0.72, tempoCap: 0.02 };
const xgDataset = fs.existsSync(xgPath) ? JSON.parse(fs.readFileSync(xgPath, "utf8")) : { matches: [] };

const normalizeTeamName = value => ({
  "as roma": "roma", inter: "internazionale", "parma calcio 1913": "parma", "spal 2013": "spal", verona: "hellas verona"
}[String(value).toLowerCase()] || String(value).toLowerCase());
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
  const selected = candidates.sort((a, b) => Math.abs(new Date(a.date).getTime() - matchTime) - Math.abs(new Date(b.date).getTime() - matchTime))[0];
  return Math.abs(new Date(selected.date).getTime() - matchTime) <= 172800000 ? selected.xg : null;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sum = values => values.reduce((total, value) => total + value, 0);
const mean = values => values.length ? sum(values) / values.length : null;
const round = (value, digits = 4) => Number(value.toFixed(digits));
const normalize = values => {
  const total = sum(values);
  return values.map(value => value / total);
};

function readScoreboard(season, competition = "ita.1") {
  const file = path.join(scoreboardsRoot, season, `${competition}.json.gz`);
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
  return (raw.payload?.events || []).filter(event => event.status?.type?.completed).map(event => {
    const competitors = event.competitions?.[0]?.competitors || [];
    const home = competitors.find(row => row.homeAway === "home"), away = competitors.find(row => row.homeAway === "away");
    const match = {
      id: String(event.id),
      season,
      date: event.date,
      homeTeam: { id: String(home?.team?.id || ""), name: home?.team?.displayName || home?.team?.name || "N/D" },
      awayTeam: { id: String(away?.team?.id || ""), name: away?.team?.displayName || away?.team?.name || "N/D" },
      score: { home: Number(home?.score), away: Number(away?.score) }
    };
    return { ...match, xg: competition === "ita.1" ? xgForMatch(match) : null };
  }).filter(match => match.date && match.homeTeam.id && match.awayTeam.id && Number.isFinite(match.score.home) && Number.isFinite(match.score.away))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
}

const seasonMatches = new Map(seasons.map(season => [season, readScoreboard(season)]));

function loadOfficialArchive() {
  const competitionNames = { "ita.1": "Serie A", "ita.2": "Serie B", "ita.coppa_italia": "Coppa Italia" };
  const events = new Map();
  for (const season of fs.readdirSync(scoreboardsRoot)) {
    for (const competition of Object.keys(competitionNames)) {
      for (const match of readScoreboard(season, competition)) {
        if (events.has(match.id)) continue;
        events.set(match.id, {
          ...match,
          competition: competitionNames[competition],
          pairKey: [match.homeTeam.id, match.awayTeam.id].sort().join("|")
        });
      }
    }
  }
  return [...events.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

const officialArchive = loadOfficialArchive();

function poisson(goals, lambda) {
  let factorial = 1;
  for (let index = 2; index <= goals; index += 1) factorial *= index;
  return Math.exp(-lambda) * (lambda ** goals) / factorial;
}

function dixonColesTau(home, away, homeLambda, awayLambda, rho) {
  if (home === 0 && away === 0) return 1 - homeLambda * awayLambda * rho;
  if (home === 0 && away === 1) return 1 + homeLambda * rho;
  if (home === 1 && away === 0) return 1 + awayLambda * rho;
  if (home === 1 && away === 1) return 1 - rho;
  return 1;
}

function scoreMatrix(homeLambda, awayLambda, options = {}, maxGoals = 8) {
  const rows = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      const empirical = options.calibration?.[`${home}-${away}`] || 1;
      const tau = Math.max(0.05, dixonColesTau(home, away, homeLambda, awayLambda, options.rho || 0));
      rows.push({ home, away, probability: poisson(home, homeLambda) * poisson(away, awayLambda) * empirical * tau });
    }
  }
  const total = sum(rows.map(row => row.probability));
  return rows.map(row => ({ ...row, probability: row.probability / total }));
}

function uncertainScoreMatrix(homeLambda, awayLambda, sigma, options = {}, maxGoals = 8) {
  const nodes = [
    { z: -2, weight: 0.06136 },
    { z: -1, weight: 0.24477 },
    { z: 0, weight: 0.38774 },
    { z: 1, weight: 0.24477 },
    { z: 2, weight: 0.06136 }
  ];
  const combined = new Map();
  for (const homeNode of nodes) for (const awayNode of nodes) {
    const adjustedHome = homeLambda * Math.exp(sigma * homeNode.z - 0.5 * sigma ** 2);
    const adjustedAway = awayLambda * Math.exp(sigma * awayNode.z - 0.5 * sigma ** 2);
    const weight = homeNode.weight * awayNode.weight;
    for (const row of scoreMatrix(adjustedHome, adjustedAway, options, maxGoals)) {
      const key = `${row.home}-${row.away}`;
      combined.set(key, (combined.get(key) || 0) + row.probability * weight);
    }
  }
  const rows = [...combined.entries()].map(([key, probability]) => {
    const [home, away] = key.split("-").map(Number);
    return { home, away, probability };
  });
  const total = sum(rows.map(row => row.probability));
  return rows.map(row => ({ ...row, probability: row.probability / total }));
}

function matchMetric(match, side, metric) {
  return metric === "xg" && Number.isFinite(match.xg?.[side]) ? match.xg[side] : match.score[side];
}

function leagueRates(history, metric = "score") {
  const priorMatches = 80;
  return {
    home: (sum(history.map(match => matchMetric(match, "home", metric))) + priorMatches * 1.45) / (history.length + priorMatches),
    away: (sum(history.map(match => matchMetric(match, "away", metric))) + priorMatches * 1.15) / (history.length + priorMatches)
  };
}

function teamRows(history, teamId, venue = null) {
  return history.filter(match => venue === "home" ? match.homeTeam.id === teamId : venue === "away" ? match.awayTeam.id === teamId : match.homeTeam.id === teamId || match.awayTeam.id === teamId);
}

function teamRate(history, teamId, venue, type, baseline, priorMatches, metric = "score") {
  const rows = teamRows(history, teamId, venue);
  const goals = sum(rows.map(match => {
    const atHome = match.homeTeam.id === teamId;
    return type === "for" ? (atHome ? matchMetric(match, "home", metric) : matchMetric(match, "away", metric)) : (atHome ? matchMetric(match, "away", metric) : matchMetric(match, "home", metric));
  }));
  return (goals + baseline * priorMatches) / (rows.length + priorMatches);
}

function pointsBefore(history) {
  const table = new Map();
  const row = team => {
    if (!table.has(team)) table.set(team, { played: 0, points: 0 });
    return table.get(team);
  };
  history.forEach(match => {
    const home = row(match.homeTeam.id), away = row(match.awayTeam.id);
    home.played += 1;
    away.played += 1;
    if (match.score.home > match.score.away) home.points += 3;
    else if (match.score.home < match.score.away) away.points += 3;
    else { home.points += 1; away.points += 1; }
  });
  return table;
}

function opponentRatings(history, baseline, metric = "score") {
  const ids = new Set(history.flatMap(match => [match.homeTeam.id, match.awayTeam.id]));
  return new Map([...ids].map(teamId => {
    const rows = teamRows(history, teamId);
    const goalsFor = sum(rows.map(match => match.homeTeam.id === teamId ? matchMetric(match, "home", metric) : matchMetric(match, "away", metric)));
    const goalsAgainst = sum(rows.map(match => match.homeTeam.id === teamId ? matchMetric(match, "away", metric) : matchMetric(match, "home", metric)));
    const priorMatches = 8;
    return [teamId, {
      attack: clamp(((goalsFor + baseline * priorMatches) / (rows.length + priorMatches)) / baseline, 0.72, 1.32),
      defenceWeakness: clamp(((goalsAgainst + baseline * priorMatches) / (rows.length + priorMatches)) / baseline, 0.72, 1.32)
    }];
  }));
}

function recentRate(history, teamId, type, baseline, metric = "score", adjustment = null) {
  const table = adjustment ? null : pointsBefore(history);
  const leaguePpg = table ? sum([...table.values()].map(row => row.points)) / Math.max(1, sum([...table.values()].map(row => row.played))) : null;
  const ratings = adjustment ? opponentRatings(history, baseline, metric) : null;
  const rows = teamRows(history, teamId).slice(-8).reverse();
  let weighted = 0, weights = 0;
  rows.forEach((match, index) => {
    const atHome = match.homeTeam.id === teamId;
    const opponent = atHome ? match.awayTeam.id : match.homeTeam.id;
    const raw = type === "for" ? (atHome ? matchMetric(match, "home", metric) : matchMetric(match, "away", metric)) : (atHome ? matchMetric(match, "away", metric) : matchMetric(match, "home", metric));
    let goals;
    if (adjustment) {
      const rating = ratings.get(opponent) || { attack: 1, defenceWeakness: 1 };
      const opponentFactor = type === "for" ? rating.defenceWeakness : rating.attack;
      goals = raw / (opponentFactor ** adjustment.exponent);
    } else {
      const opponentRow = table.get(opponent);
      const opponentPpg = opponentRow ? (opponentRow.points + 4.5) / (opponentRow.played + 3) : leaguePpg;
      const opponentFactor = clamp((opponentPpg / Math.max(0.5, leaguePpg)) ** 0.2, 0.82, 1.18);
      goals = type === "for" ? raw * opponentFactor : raw / opponentFactor;
    }
    const weight = 0.82 ** index;
    weighted += goals * weight;
    weights += weight;
  });
  return weights ? (weighted + baseline * 2.5) / (weights + 2.5) : baseline;
}

function weightedGeometric(items) {
  const totalWeight = sum(items.map(item => item.weight));
  return Math.exp(sum(items.map(item => Math.log(clamp(item.value, 0.35, 2.4)) * item.weight)) / totalWeight);
}

function headToHeadFactors(match, league) {
  const pairKey = [match.homeTeam.id, match.awayTeam.id].sort().join("|");
  const cutoff = new Date(match.date).getTime();
  const meetings = officialArchive.filter(event => event.pairKey === pairKey && new Date(event.date).getTime() < cutoff).slice(-5).reverse();
  if (!meetings.length) return { home: 1, away: 1 };
  const competitionWeights = { "Serie A": 1, "Serie B": headToHeadConfiguration.lowerDivisionWeight, "Coppa Italia": headToHeadConfiguration.cupWeight };
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0;
  meetings.forEach((meeting, index) => {
    const currentHomeWasHome = meeting.homeTeam.id === match.homeTeam.id;
    const weight = (headToHeadConfiguration.decay ** index) * competitionWeights[meeting.competition];
    weightTotal += weight;
    goalsFor += (currentHomeWasHome ? meeting.score.home : meeting.score.away) * weight;
    goalsAgainst += (currentHomeWasHome ? meeting.score.away : meeting.score.home) * weight;
  });
  const weightedFor = goalsFor / weightTotal, weightedAgainst = goalsAgainst / weightTotal;
  const reliability = meetings.length / 5;
  const balance = clamp((weightedFor - weightedAgainst) / Math.max(1, weightedFor + weightedAgainst), -0.6, 0.6);
  const averageTotal = (goalsFor + goalsAgainst) / weightTotal;
  const edge = balance * headToHeadConfiguration.cap * reliability;
  const tempo = clamp((averageTotal / (league.home + league.away) - 1) * 0.02 * reliability, -0.02, 0.02);
  return { home: clamp((1 + edge) * (1 + tempo), 0.95, 1.05), away: clamp((1 - edge) * (1 + tempo), 0.95, 1.05) };
}

function expectedGoals(history, match, metric = "score", recentAdjustment = null) {
  const league = leagueRates(history, metric);
  const overall = (league.home + league.away) / 2;
  const strength = (rate, baseline, reliability) => 1 + (rate / baseline - 1) * reliability;
  const component = (teamId, venue, type, venueBaseline) => weightedGeometric([
    { value: strength(teamRate(history, teamId, venue, type, venueBaseline, 4, metric), venueBaseline, parameters.venueReliability), weight: parameters.venueWeight },
    { value: strength(teamRate(history, teamId, null, type, overall, 7, metric), overall, parameters.overallReliability), weight: parameters.overallWeight },
    { value: strength(recentRate(history, teamId, type, overall, metric, recentAdjustment), overall, parameters.recentReliability), weight: parameters.recentWeight }
  ]);
  const homeAttack = component(match.homeTeam.id, "home", "for", league.home);
  const homeDefence = component(match.homeTeam.id, "home", "against", league.away);
  const awayAttack = component(match.awayTeam.id, "away", "for", league.away);
  const awayDefence = component(match.awayTeam.id, "away", "against", league.home);
  const h2h = headToHeadFactors(match, league);
  return { home: clamp(league.home * homeAttack * awayDefence * h2h.home, 0.3, 3.5), away: clamp(league.away * awayAttack * homeDefence * h2h.away, 0.25, 3.3) };
}

function scoreCalibration(history, league) {
  const counts = new Map();
  history.forEach(match => counts.set(`${match.score.home}-${match.score.away}`, (counts.get(`${match.score.home}-${match.score.away}`) || 0) + 1));
  const factors = {};
  for (let home = 0; home <= 8; home += 1) for (let away = 0; away <= 8; away += 1) {
    const key = `${home}-${away}`;
    const expected = history.length * poisson(home, league.home) * poisson(away, league.away);
    factors[key] = clamp(((counts.get(key) || 0) + 4) / (expected + 4), 0.45, 2.2) ** 0.55;
  }
  return factors;
}

function estimateRho(samples, cutoff) {
  const cutoffTime = new Date(cutoff).getTime();
  const eligible = samples.filter(sample => {
    const age = (cutoffTime - new Date(sample.date).getTime()) / 86400000;
    return age > 0 && age <= 1095;
  });
  let best = { rho: 0, loss: Infinity };
  for (let rho = -0.2; rho <= 0.2001; rho += 0.005) {
    let weightedLoss = 0, weights = 0;
    for (const sample of eligible) {
      const age = (cutoffTime - new Date(sample.date).getTime()) / 86400000;
      const weight = 0.5 ** (age / 365);
      const tau = Math.max(0.05, dixonColesTau(sample.score.home, sample.score.away, sample.homeLambda, sample.awayLambda, rho));
      weightedLoss += -Math.log(clamp(poisson(sample.score.home, sample.homeLambda) * poisson(sample.score.away, sample.awayLambda) * tau, 1e-10, 1)) * weight;
      weights += weight;
    }
    const loss = weights ? weightedLoss / weights : Infinity;
    if (loss < best.loss) best = { rho: round(rho, 3), loss };
  }
  return { rho: best.rho, sample: eligible.length };
}

const predictionSamples = [];
for (const season of seasons) {
  const history = [];
  for (const match of seasonMatches.get(season)) {
    const homeMatches = teamRows(history, match.homeTeam.id).length;
    const awayMatches = teamRows(history, match.awayTeam.id).length;
    if (homeMatches >= 8 && awayMatches >= 8) {
      const expected = expectedGoals(history, match);
      const xgExpected = expectedGoals(history, match, "xg");
      const opponentRatingLambdas = Object.fromEntries(opponentRatingExponents.map(exponent => {
        const adjustment = { type: "separate-attack-defence", exponent };
        const scoreExpected = expectedGoals(history, match, "score", adjustment);
        const adjustedXgExpected = expectedGoals(history, match, "xg", adjustment);
        return [String(exponent), {
          home: scoreExpected.home,
          away: scoreExpected.away,
          xgHome: adjustedXgExpected.home,
          xgAway: adjustedXgExpected.away
        }];
      }));
      predictionSamples.push({ ...match, homeLambda: expected.home, awayLambda: expected.away, xgHomeLambda: xgExpected.home, xgAwayLambda: xgExpected.away, opponentRatingLambdas, calibration: scoreCalibration(history, leagueRates(history)) });
    }
    history.push(match);
  }
}

function outcomeProbabilities(rows) {
  return normalize([
    sum(rows.filter(row => row.home > row.away).map(row => row.probability)),
    sum(rows.filter(row => row.home === row.away).map(row => row.probability)),
    sum(rows.filter(row => row.home < row.away).map(row => row.probability))
  ]);
}

function goalBand(home, away) {
  return home + away <= 1 ? 0 : home + away <= 3 ? 1 : 2;
}

function evaluateRows(samples, variant) {
  const rhoByDay = new Map();
  const rows = samples.map(sample => {
    const day = sample.date.slice(0, 10);
    if (variant.includes("dixon-coles") && !rhoByDay.has(day)) rhoByDay.set(day, estimateRho(predictionSamples, `${day}T00:00:00Z`));
    const rhoEstimate = variant.includes("dixon-coles") ? rhoByDay.get(day) : { rho: 0, sample: 0 };
    const xgWeight = variant.includes("xg-blend-25") ? 0.25 : variant === "xg-blend-50" ? 0.5 : variant === "xg-blend-75" ? 0.75 : variant === "xg-only" ? 1 : 0;
    const opponentMatch = variant.match(/^opponent-ratings-([0-9.]+)-/);
    const opponentLambdas = opponentMatch ? sample.opponentRatingLambdas[opponentMatch[1]] : null;
    const scoreHomeLambda = opponentLambdas?.home ?? sample.homeLambda;
    const scoreAwayLambda = opponentLambdas?.away ?? sample.awayLambda;
    const xgHomeLambda = opponentLambdas?.xgHome ?? sample.xgHomeLambda;
    const xgAwayLambda = opponentLambdas?.xgAway ?? sample.xgAwayLambda;
    const homeLambda = scoreHomeLambda ** (1 - xgWeight) * xgHomeLambda ** xgWeight;
    const awayLambda = scoreAwayLambda ** (1 - xgWeight) * xgAwayLambda ** xgWeight;
    const options = {
      calibration: variant.includes("empirical") ? sample.calibration : null,
      rho: rhoEstimate.rho
    };
    const sigma = variant.endsWith("mix-10") ? 0.1 : variant.endsWith("mix-15") ? 0.15 : variant.endsWith("mix-20") ? 0.2 : variant.endsWith("mix-25") ? 0.25 : 0;
    const matrix = sigma ? uncertainScoreMatrix(homeLambda, awayLambda, sigma, options) : scoreMatrix(homeLambda, awayLambda, options);
    const probabilities = outcomeProbabilities(matrix);
    const outcome = sample.score.home > sample.score.away ? 0 : sample.score.home === sample.score.away ? 1 : 2;
    const ordered = [...matrix].sort((a, b) => b.probability - a.probability);
    const scoreProbability = matrix.find(score => score.home === sample.score.home && score.away === sample.score.away)?.probability || 1e-10;
    const bandProbabilities = [0, 0, 0];
    matrix.forEach(score => { bandProbabilities[goalBand(score.home, score.away)] += score.probability; });
    const actualBand = goalBand(sample.score.home, sample.score.away);
    return {
      season: sample.season,
      oneXTwoLogLoss: -Math.log(clamp(probabilities[outcome], 1e-10, 1)),
      oneXTwoBrier: sum(probabilities.map((probability, index) => (probability - Number(index === outcome)) ** 2)),
      oneXTwoHit: Number(probabilities.indexOf(Math.max(...probabilities)) === outcome),
      scoreLogLoss: -Math.log(clamp(scoreProbability, 1e-10, 1)),
      modeHit: Number(ordered[0].home === sample.score.home && ordered[0].away === sample.score.away),
      topThreeHit: Number(ordered.slice(0, 3).some(score => score.home === sample.score.home && score.away === sample.score.away)),
      goalBandBrier: sum(bandProbabilities.map((probability, index) => (probability - Number(index === actualBand)) ** 2)),
      goalBandHit: Number(bandProbabilities.indexOf(Math.max(...bandProbabilities)) === actualBand),
      rho: rhoEstimate.rho,
      rhoSample: rhoEstimate.sample
    };
  });
  return { metrics: metrics(rows), rows };
}

function metrics(rows) {
  return {
    matches: rows.length,
    oneXTwoLogLoss: round(mean(rows.map(row => row.oneXTwoLogLoss))),
    oneXTwoBrier: round(mean(rows.map(row => row.oneXTwoBrier))),
    oneXTwoAccuracyPct: round(mean(rows.map(row => row.oneXTwoHit)) * 100, 1),
    scoreLogLoss: round(mean(rows.map(row => row.scoreLogLoss))),
    exactModeHitPct: round(mean(rows.map(row => row.modeHit)) * 100, 1),
    exactTopThreeHitPct: round(mean(rows.map(row => row.topThreeHit)) * 100, 1),
    goalBandBrier: round(mean(rows.map(row => row.goalBandBrier))),
    goalBandAccuracyPct: round(mean(rows.map(row => row.goalBandHit)) * 100, 1),
    averageRho: round(mean(rows.map(row => row.rho))),
    averageRhoSample: round(mean(rows.map(row => row.rhoSample)), 1)
  };
}

function bootstrapDifference(candidate, baseline, metric, iterations = 2000) {
  let state = 20260805;
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

const testSamples = predictionSamples.filter(sample => testSeasons.has(sample.season));
const selectionSamples = predictionSamples.filter(sample => !testSeasons.has(sample.season));
const uncertaintyVariants = ["xg-blend-25-mix-10", "xg-blend-25-mix-15", "xg-blend-25-mix-20", "xg-blend-25-mix-25"];
const opponentRatingVariants = opponentRatingExponents.map(exponent => `opponent-ratings-${exponent}-xg-blend-25`);
const opponentRatingSelection = opponentRatingVariants.map(variant => {
  const result = evaluateRows(selectionSamples, variant);
  return { variant, metrics: result.metrics, selectionScore: result.metrics.oneXTwoLogLoss * 0.7 + result.metrics.goalBandBrier * 0.3 };
}).sort((a, b) => a.selectionScore - b.selectionScore);
const selectedOpponentRatingVariant = opponentRatingSelection[0].variant;
const variants = ["poisson", "empirical", "dixon-coles", "empirical+dixon-coles", "xg-blend-25", "xg-blend-50", "xg-blend-75", "xg-only", ...uncertaintyVariants, ...opponentRatingVariants];
const results = Object.fromEntries(variants.map(variant => [variant, evaluateRows(testSamples, variant)]));
const current = results.empirical;
const candidate = results["dixon-coles"];
const improvement = (baseline, next) => round((baseline - next) / baseline * 100, 2);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  competition: "serie-a",
  methodology: {
    type: "multi-season-walk-forward",
    sourceSeasons: seasons,
    testSeasons: [...testSeasons],
    warmup: "Almeno otto gare stagionali precedenti per entrambe le squadre.",
    leakageControl: "Lambda, xG, calibrazione empirica, H2H e rho usano esclusivamente eventi antecedenti alla partita stimata.",
    xg: "Dati partita Understat; confronto tra Poisson sui gol, fusione geometrica 50% gol/50% xG e solo xG.",
    dixonColes: "Correzione dei risultati 0-0, 0-1, 1-0 e 1-1; rho selezionato per ogni data su tre anni precedenti con emivita 365 giorni.",
    scope: "Nucleo statistico retrodatabile con correttivo H2H; probabili XI, indisponibili e tattica non sono inclusi per assenza di snapshot storici."
  },
  archive: {
    serieAMatches: sum([...seasonMatches.values()].map(rows => rows.length)),
    officialMatchesForHeadToHead: officialArchive.length,
    eligiblePredictions: predictionSamples.length,
    outOfSamplePredictions: testSamples.length
  },
  variants: Object.fromEntries(variants.map(variant => [variant, {
    aggregate: results[variant].metrics,
    bySeason: Object.fromEntries([...testSeasons].map(season => [season, metrics(results[variant].rows.filter(row => row.season === season))]))
  }])),
  decision: {
    current: "empirical",
    candidate: "dixon-coles",
    improvementVsCurrentPct: {
      oneXTwoLogLoss: improvement(current.metrics.oneXTwoLogLoss, candidate.metrics.oneXTwoLogLoss),
      oneXTwoBrier: improvement(current.metrics.oneXTwoBrier, candidate.metrics.oneXTwoBrier),
      scoreLogLoss: improvement(current.metrics.scoreLogLoss, candidate.metrics.scoreLogLoss),
      goalBandBrier: improvement(current.metrics.goalBandBrier, candidate.metrics.goalBandBrier)
    },
    pairedBootstrap: {
      oneXTwoLogLoss: bootstrapDifference(candidate.rows, current.rows, "oneXTwoLogLoss"),
      oneXTwoBrier: bootstrapDifference(candidate.rows, current.rows, "oneXTwoBrier"),
      scoreLogLoss: bootstrapDifference(candidate.rows, current.rows, "scoreLogLoss"),
      goalBandBrier: bootstrapDifference(candidate.rows, current.rows, "goalBandBrier")
    },
    calibrationComparison: {
      candidate: "poisson",
      baseline: "empirical",
      improvementVsEmpiricalPct: {
        oneXTwoLogLoss: improvement(current.metrics.oneXTwoLogLoss, results.poisson.metrics.oneXTwoLogLoss),
        oneXTwoBrier: improvement(current.metrics.oneXTwoBrier, results.poisson.metrics.oneXTwoBrier),
        scoreLogLoss: improvement(current.metrics.scoreLogLoss, results.poisson.metrics.scoreLogLoss),
        goalBandBrier: improvement(current.metrics.goalBandBrier, results.poisson.metrics.goalBandBrier)
      },
      pairedBootstrap: {
        oneXTwoLogLoss: bootstrapDifference(results.poisson.rows, current.rows, "oneXTwoLogLoss"),
        oneXTwoBrier: bootstrapDifference(results.poisson.rows, current.rows, "oneXTwoBrier"),
        scoreLogLoss: bootstrapDifference(results.poisson.rows, current.rows, "scoreLogLoss"),
        goalBandBrier: bootstrapDifference(results.poisson.rows, current.rows, "goalBandBrier")
      }
    },
    xgComparison: Object.fromEntries(["xg-blend-25", "xg-blend-50", "xg-blend-75", "xg-only"].map(variant => [variant, {
      improvementVsPoissonPct: {
        oneXTwoLogLoss: improvement(results.poisson.metrics.oneXTwoLogLoss, results[variant].metrics.oneXTwoLogLoss),
        oneXTwoBrier: improvement(results.poisson.metrics.oneXTwoBrier, results[variant].metrics.oneXTwoBrier),
        scoreLogLoss: improvement(results.poisson.metrics.scoreLogLoss, results[variant].metrics.scoreLogLoss),
        goalBandBrier: improvement(results.poisson.metrics.goalBandBrier, results[variant].metrics.goalBandBrier)
      },
      pairedBootstrap: {
        oneXTwoLogLoss: bootstrapDifference(results[variant].rows, results.poisson.rows, "oneXTwoLogLoss"),
        scoreLogLoss: bootstrapDifference(results[variant].rows, results.poisson.rows, "scoreLogLoss")
      }
    }])),
    uncertaintyComparison: Object.fromEntries(uncertaintyVariants.map(variant => [variant, {
      improvementVsFixedLambdaPct: {
        oneXTwoLogLoss: improvement(results["xg-blend-25"].metrics.oneXTwoLogLoss, results[variant].metrics.oneXTwoLogLoss),
        oneXTwoBrier: improvement(results["xg-blend-25"].metrics.oneXTwoBrier, results[variant].metrics.oneXTwoBrier),
        scoreLogLoss: improvement(results["xg-blend-25"].metrics.scoreLogLoss, results[variant].metrics.scoreLogLoss),
        goalBandBrier: improvement(results["xg-blend-25"].metrics.goalBandBrier, results[variant].metrics.goalBandBrier)
      },
      pairedBootstrap: {
        oneXTwoLogLoss: bootstrapDifference(results[variant].rows, results["xg-blend-25"].rows, "oneXTwoLogLoss"),
        scoreLogLoss: bootstrapDifference(results[variant].rows, results["xg-blend-25"].rows, "scoreLogLoss")
      }
    }])),
    opponentRatingComparison: {
      baseline: "xg-blend-25",
      candidate: selectedOpponentRatingVariant,
      configuration: {
        type: "separate-attack-defence",
        exponent: Number(selectedOpponentRatingVariant.match(/^opponent-ratings-([0-9.]+)-/)[1]),
        priorMatches: 8,
        recentMatches: 8,
        recentDecay: 0.82
      },
      selection: {
        seasons: seasons.filter(season => !testSeasons.has(season)),
        matches: selectionSamples.length,
        metric: "70% log-loss 1X2 + 30% Brier fasce gol",
        selected: opponentRatingSelection[0]
      },
      outOfSample: {
        seasons: [...testSeasons],
        matches: testSamples.length,
        baseline: results["xg-blend-25"].metrics,
        candidate: results[selectedOpponentRatingVariant].metrics,
        improvementVsBaselinePct: {
          oneXTwoLogLoss: improvement(results["xg-blend-25"].metrics.oneXTwoLogLoss, results[selectedOpponentRatingVariant].metrics.oneXTwoLogLoss),
          oneXTwoBrier: improvement(results["xg-blend-25"].metrics.oneXTwoBrier, results[selectedOpponentRatingVariant].metrics.oneXTwoBrier),
          scoreLogLoss: improvement(results["xg-blend-25"].metrics.scoreLogLoss, results[selectedOpponentRatingVariant].metrics.scoreLogLoss),
          goalBandBrier: improvement(results["xg-blend-25"].metrics.goalBandBrier, results[selectedOpponentRatingVariant].metrics.goalBandBrier)
        },
        pairedBootstrap: {
          oneXTwoLogLoss: bootstrapDifference(results[selectedOpponentRatingVariant].rows, results["xg-blend-25"].rows, "oneXTwoLogLoss"),
          oneXTwoBrier: bootstrapDifference(results[selectedOpponentRatingVariant].rows, results["xg-blend-25"].rows, "oneXTwoBrier"),
          scoreLogLoss: bootstrapDifference(results[selectedOpponentRatingVariant].rows, results["xg-blend-25"].rows, "scoreLogLoss"),
          goalBandBrier: bootstrapDifference(results[selectedOpponentRatingVariant].rows, results["xg-blend-25"].rows, "goalBandBrier")
        }
      }
    }
  }
};

const candidateWins = output.decision.improvementVsCurrentPct.oneXTwoLogLoss > 0
  && output.decision.improvementVsCurrentPct.scoreLogLoss > 0
  && output.decision.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95[0] >= 0;
output.decision.recommendation = candidateWins ? "adopt-dixon-coles" : "keep-current";
const calibration = output.decision.calibrationComparison;
const poissonWins = calibration.improvementVsEmpiricalPct.oneXTwoLogLoss >= 0
  && calibration.improvementVsEmpiricalPct.scoreLogLoss > 0
  && calibration.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] >= 0;
output.decision.calibrationRecommendation = poissonWins ? "adopt-poisson" : "keep-empirical";
const xgCandidate = output.decision.xgComparison["xg-blend-25"];
const xgWins = xgCandidate.improvementVsPoissonPct.oneXTwoLogLoss >= 0
  && xgCandidate.improvementVsPoissonPct.oneXTwoBrier > 0
  && xgCandidate.improvementVsPoissonPct.scoreLogLoss > 0
  && xgCandidate.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] > 0;
output.decision.xgRecommendation = xgWins ? "adopt-xg-blend-25" : "keep-goals-only";
const bestUncertainty = uncertaintyVariants
  .map(variant => ({ variant, scoreLogLoss: results[variant].metrics.scoreLogLoss }))
  .sort((a, b) => a.scoreLogLoss - b.scoreLogLoss)[0];
const uncertaintyCandidate = output.decision.uncertaintyComparison[bestUncertainty.variant];
const uncertaintyWins = uncertaintyCandidate.improvementVsFixedLambdaPct.oneXTwoLogLoss >= 0
  && uncertaintyCandidate.improvementVsFixedLambdaPct.scoreLogLoss > 0
  && uncertaintyCandidate.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] > 0;
output.decision.uncertaintyRecommendation = uncertaintyWins ? `adopt-${bestUncertainty.variant}` : "keep-fixed-lambda";
const opponentRating = output.decision.opponentRatingComparison.outOfSample;
const opponentRatingWins = opponentRating.improvementVsBaselinePct.oneXTwoLogLoss > 0
  && opponentRating.improvementVsBaselinePct.oneXTwoBrier >= 0
  && opponentRating.improvementVsBaselinePct.scoreLogLoss > 0
  && opponentRating.improvementVsBaselinePct.goalBandBrier >= 0
  && opponentRating.candidate.exactTopThreeHitPct >= opponentRating.baseline.exactTopThreeHitPct
  && opponentRating.pairedBootstrap.oneXTwoLogLoss.confidenceInterval95[0] >= 0
  && opponentRating.pairedBootstrap.scoreLogLoss.confidenceInterval95[0] >= 0;
output.decision.opponentRatingRecommendation = opponentRatingWins ? "adopt-separate-attack-defence" : "keep-points-ranking";
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK backtest pluristagionale: ${testSamples.length} gare, decisione ${output.decision.recommendation}`);
