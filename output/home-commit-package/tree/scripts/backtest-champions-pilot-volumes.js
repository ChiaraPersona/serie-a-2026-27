"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json"), "utf8"));
const outputPath = path.join(root, "data/normalized/champions-pilot-volume-backtest.json");
const metrics = ["totalShots", "shotsOnTarget", "wonCorners", "yellowCards"];
const thresholds = { totalShots: 10.5, shotsOnTarget: 3.5, wonCorners: 4.5, yellowCards: 1.5 };
const round = (value, digits = 3) => Number(value.toFixed(digits));

function mean(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

function sd(values) {
  const center = mean(values);
  if (center == null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length);
}

function poisson(k, lambda) {
  let factorial = 1;
  for (let n = 2; n <= k; n += 1) factorial *= n;
  return Math.exp(-lambda) * lambda ** k / factorial;
}

function countCdf(threshold, expected, variance) {
  const maximum = Math.floor(threshold);
  if (!(expected > 0)) return 1;
  if (!(variance > expected + 0.05)) return Array.from({ length: maximum + 1 }, (_, k) => poisson(k, expected)).reduce((sum, value) => sum + value, 0);
  const r = expected ** 2 / (variance - expected);
  const p = r / (r + expected);
  let pmf = p ** r, total = pmf;
  for (let k = 1; k <= maximum; k += 1) {
    pmf *= ((k - 1 + r) / k) * (1 - p);
    total += pmf;
  }
  return total;
}

const sideRows = matches => matches.flatMap(match => [
  { eventId: match.eventId, season: match.season, league: match.league, date: match.date, venue: "home", teamId: match.home.providerTeamId, opponentId: match.away.providerTeamId, for: match.home.statistics, against: match.away.statistics },
  { eventId: match.eventId, season: match.season, league: match.league, date: match.date, venue: "away", teamId: match.away.providerTeamId, opponentId: match.home.providerTeamId, for: match.away.statistics, against: match.home.statistics }
]);

function leagueValues(rows, league, venue, metric, direction) {
  return rows.filter(row => row.league === league && row.venue === venue).map(row => row[direction][metric]).filter(Number.isFinite);
}

function project(rows, target, metric) {
  const opposite = target.venue === "home" ? "away" : "home";
  const own = rows.filter(row => row.teamId === target.teamId);
  const opponent = rows.filter(row => row.teamId === target.opponentId);
  if (own.length < 8 || opponent.length < 8) return null;
  const ownVenue = own.filter(row => row.venue === target.venue);
  const opponentVenue = opponent.filter(row => row.venue === opposite);
  if (ownVenue.length < 3 || opponentVenue.length < 3) return null;
  const recent = own.slice(-8).reverse();
  let recentWeightTotal = 0;
  const recentExpected = recent.reduce((sum, row, index) => {
    const weight = 0.82 ** index;
    recentWeightTotal += weight;
    return sum + row.for[metric] * weight;
  }, 0) / recentWeightTotal;
  const ownBaselineValues = leagueValues(rows, target.league, target.venue, metric, "for");
  const opponentBaselineValues = leagueValues(rows, target.league, opposite, metric, "against");
  const overallBaselineValues = rows.filter(row => row.league === target.league).map(row => row.for[metric]).filter(Number.isFinite);
  const ownBaseline = mean(ownBaselineValues);
  const opponentBaseline = mean(opponentBaselineValues);
  const overallBaseline = mean(overallBaselineValues);
  const targetBaseline = (ownBaseline + opponentBaseline) / 2;
  const currentMatches = own.filter(row => row.season === target.season).length;
  const reliability = currentMatches / (currentMatches + 6);
  const recentWeight = 0.2 * reliability;
  const unused = 0.2 - recentWeight;
  const components = [
    { value: mean(ownVenue.map(row => row.for[metric])) / ownBaseline * targetBaseline, spread: sd(ownVenue.map(row => row.for[metric])) / ownBaseline * targetBaseline, weight: 0.45 + unused * 0.5625 },
    { value: mean(opponentVenue.map(row => row.against[metric])) / opponentBaseline * targetBaseline, spread: sd(opponentVenue.map(row => row.against[metric])) / opponentBaseline * targetBaseline, weight: 0.35 + unused * 0.4375 },
    { value: recentExpected / overallBaseline * targetBaseline, spread: sd(recent.map(row => row.for[metric])) / overallBaseline * targetBaseline, weight: recentWeight }
  ];
  const expected = components.reduce((sum, item) => sum + item.value * item.weight, 0);
  const spread = Math.max(0.45, components.reduce((sum, item) => sum + item.spread * item.weight, 0));
  const baselineExpected = targetBaseline;
  const baselineSpread = Math.max(0.45, sd(overallBaselineValues));
  return { expected, spread, baselineExpected, baselineSpread, reliability };
}

const matches = source.matches.filter(match => match.coverage === "complete").sort((a, b) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId));
const evaluations = Object.fromEntries(metrics.map(metric => [metric, []]));
const cardsMatches = [];

for (let index = 0; index < matches.length; index += 1) {
  const match = matches[index];
  if (match.season !== "2026-27") continue;
  const history = sideRows(matches.slice(0, index));
  const targets = [
    { season: match.season, league: match.league, venue: "home", teamId: match.home.providerTeamId, opponentId: match.away.providerTeamId, actual: match.home.statistics },
    { season: match.season, league: match.league, venue: "away", teamId: match.away.providerTeamId, opponentId: match.home.providerTeamId, actual: match.away.statistics }
  ];
  const projected = targets.map(target => Object.fromEntries(metrics.map(metric => [metric, project(history, target, metric)])));
  targets.forEach((target, sideIndex) => metrics.forEach(metric => {
    const forecast = projected[sideIndex][metric];
    if (!forecast || !Number.isFinite(target.actual[metric])) return;
    const threshold = thresholds[metric];
    const probability = 1 - countCdf(threshold, forecast.expected, Math.max(forecast.expected, forecast.spread ** 2));
    const baselineProbability = 1 - countCdf(threshold, forecast.baselineExpected, Math.max(forecast.baselineExpected, forecast.baselineSpread ** 2));
    const outcome = target.actual[metric] > threshold ? 1 : 0;
    evaluations[metric].push({ actual: target.actual[metric], expected: forecast.expected, baselineExpected: forecast.baselineExpected, covered: target.actual[metric] >= forecast.expected - 0.84 * forecast.spread && target.actual[metric] <= forecast.expected + 0.84 * forecast.spread, brier: (probability - outcome) ** 2, baselineBrier: (baselineProbability - outcome) ** 2, reliability: forecast.reliability });
  }));
  const homeCards = projected[0].yellowCards;
  const awayCards = projected[1].yellowCards;
  if (homeCards && awayCards) {
    const expected = homeCards.expected + awayCards.expected;
    const variance = Math.max(expected, homeCards.spread ** 2 + awayCards.spread ** 2);
    const baselineExpected = homeCards.baselineExpected + awayCards.baselineExpected;
    const baselineVariance = Math.max(baselineExpected, homeCards.baselineSpread ** 2 + awayCards.baselineSpread ** 2);
    const actual = match.home.statistics.yellowCards + match.away.statistics.yellowCards;
    const outcome = actual > 3.5 ? 1 : 0;
    cardsMatches.push({ actual, expected, baselineExpected, brier: ((1 - countCdf(3.5, expected, variance)) - outcome) ** 2, baselineBrier: ((1 - countCdf(3.5, baselineExpected, baselineVariance)) - outcome) ** 2 });
  }
}

function report(rows) {
  const mae = mean(rows.map(row => Math.abs(row.expected - row.actual)));
  const baselineMae = mean(rows.map(row => Math.abs(row.baselineExpected - row.actual)));
  return {
    samples: rows.length,
    mae: round(mae),
    baselineMae: round(baselineMae),
    maeImprovementPct: round((baselineMae - mae) / baselineMae * 100, 1),
    rmse: round(Math.sqrt(mean(rows.map(row => (row.expected - row.actual) ** 2)))),
    baselineRmse: round(Math.sqrt(mean(rows.map(row => (row.baselineExpected - row.actual) ** 2)))),
    intervalCoveragePct: rows.some(row => "covered" in row) ? round(mean(rows.map(row => row.covered ? 1 : 0)) * 100, 1) : null,
    brier: rows.some(row => "brier" in row) ? round(mean(rows.map(row => row.brier))) : null,
    baselineBrier: rows.some(row => "baselineBrier" in row) ? round(mean(rows.map(row => row.baselineBrier))) : null
  };
}

const output = {
  schemaVersion: 1,
  generatedAt: source.retrievedAt,
  method: "Walk-forward sulle gare domestiche 2026/27; per ogni gara usa soltanto referti precedenti. Baseline di confronto: media del campionato per sede.",
  thresholds,
  metrics: Object.fromEntries(metrics.map(metric => [metric, report(evaluations[metric])])),
  matchCardsOver35: report(cardsMatches)
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
for (const [metric, result] of Object.entries(output.metrics)) console.log(`${metric}: n=${result.samples} MAE ${result.mae} vs ${result.baselineMae} (${result.maeImprovementPct}%) · Brier ${result.brier} vs ${result.baselineBrier}`);
console.log(`cartellini partita O3.5: n=${output.matchCardsOver35.samples} Brier ${output.matchCardsOver35.brier} vs ${output.matchCardsOver35.baselineBrier}`);
