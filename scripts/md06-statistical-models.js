"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const METRICS = Object.freeze({
  shots: { profile: "totalShots", current: "shots", maximum: 70, biasLimit: 2.5 },
  sot: { profile: "shotsOnTarget", current: "shotsOnTarget", maximum: 35, biasLimit: 1.25 },
  corners: { profile: "wonCorners", current: "corners", maximum: 35, biasLimit: 1.25 },
});
const MARKET_MODELS = Object.freeze({
  "15859": { family: "shots", subfamily: "shots-match-over", kind: "match-over" },
  "23334": { family: "shots", subfamily: "shots-team-over", kind: "team-over" },
  "15474": { family: "shots", subfamily: "shots-1x2", kind: "one-x-two" },
  "15481": { family: "sot", subfamily: "sot-match-over", kind: "match-over" },
  "23311": { family: "sot", subfamily: "sot-team-over", kind: "team-over" },
  "15475": { family: "sot", subfamily: "sot-1x2", kind: "one-x-two" },
  "975": { family: "corners", subfamily: "corners-match-over", kind: "match-over" },
  "23060": { family: "corners", subfamily: "corners-team-over", kind: "team-over" },
  "9905": { family: "corners", subfamily: "corners-1x2-fulltime", kind: "one-x-two" },
});

const read = relative => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const variance = values => {
  const center = mean(values);
  return center == null ? null : values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
};
const round = (value, digits = 4) => {
  if (value == null) return null;
  const rounded = Number(Number(value).toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
};
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));

function reconstructPriorSeason() {
  const schedule = read("data/normalized/referee-matches/2025-26/serie-a.json").matches.slice();
  const profiles = new Map(read("data/normalized/team-volume-profiles-2025-26.json").profiles.map(profile => [profile.teamId, profile]));
  const counters = new Map();
  const take = (teamId, venue, metric, direction) => {
    const key = `${teamId}:${venue}`;
    const index = counters.get(key) || 0;
    const values = profiles.get(teamId)?.venues?.[venue]?.[metric]?.[direction]?.values || [];
    if (!finite(values[index])) throw new Error(`Storico volume incompleto: ${key} ${metric} ${direction} #${index}`);
    return Number(values[index]);
  };
  const rows = schedule.map(match => {
    const homeTeam = match.homeTeam.slug, awayTeam = match.awayTeam.slug;
    const metrics = {};
    for (const [family, definition] of Object.entries(METRICS)) {
      const home = take(homeTeam, "home", definition.profile, "for");
      const away = take(awayTeam, "away", definition.profile, "for");
      const homeAgainst = take(homeTeam, "home", definition.profile, "against");
      const awayAgainst = take(awayTeam, "away", definition.profile, "against");
      if (home !== awayAgainst || away !== homeAgainst) throw new Error(`${match.id}: sequenza ${family} non riconciliata`);
      metrics[family] = { home, away };
    }
    counters.set(`${homeTeam}:home`, (counters.get(`${homeTeam}:home`) || 0) + 1);
    counters.set(`${awayTeam}:away`, (counters.get(`${awayTeam}:away`) || 0) + 1);
    return { matchId: match.id, matchday: Number(match.matchday), date: match.date, homeTeam, awayTeam, metrics };
  });
  if (rows.length !== 380) throw new Error(`Storico 2025/26 inatteso: ${rows.length} gare`);
  return rows;
}

function currentSeasonActuals() {
  return read("data/sources/match-results-2026-27.json").matches
    .filter(match => match.status === "finished" && match.teamStats?.home && match.teamStats?.away)
    .map(match => ({
      matchId: match.matchId,
      matchday: Number(String(match.matchId).match(/md-(\d+)$/)?.[1]),
      date: match.date || null,
      homeTeam: String(match.matchId).split("-")[0],
      awayTeam: null,
      metrics: Object.fromEntries(Object.entries(METRICS).map(([family, definition]) => [family, {
        home: Number(match.teamStats.home[definition.current]),
        away: Number(match.teamStats.away[definition.current]),
      }]))
    }))
    .map(row => {
      const fixture = read("data/normalized/matches.json").find(match => match.id === row.matchId);
      if (!fixture) throw new Error(`${row.matchId}: fixture corrente non trovata`);
      return { ...row, date: fixture.date, homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam };
    });
}

function valuesFor(history, family, { teamId = null, venue = null, direction = "for" } = {}) {
  const values = [];
  for (const match of history) {
    if (!teamId) {
      values.push(match.metrics[family].home, match.metrics[family].away);
      continue;
    }
    if ((!venue || venue === "home") && match.homeTeam === teamId) values.push(match.metrics[family][direction === "for" ? "home" : "away"]);
    if ((!venue || venue === "away") && match.awayTeam === teamId) values.push(match.metrics[family][direction === "for" ? "away" : "home"]);
  }
  return values.filter(finite).map(Number);
}

function shrunkMean(values, priorMean, priorMatches = 6) {
  return (values.reduce((sum, value) => sum + value, 0) + priorMean * priorMatches) / (values.length + priorMatches);
}

function forecastMean(history, family, homeTeam, awayTeam) {
  const leagueHome = mean(history.map(match => match.metrics[family].home));
  const leagueAway = mean(history.map(match => match.metrics[family].away));
  const leagueAll = mean([leagueHome, leagueAway]);
  const side = (teamId, opponentId, venue) => {
    const opponentVenue = venue === "home" ? "away" : "home";
    const leagueVenue = venue === "home" ? leagueHome : leagueAway;
    const own = valuesFor(history, family, { teamId, venue, direction: "for" });
    const opponentAgainst = valuesFor(history, family, { teamId: opponentId, venue: opponentVenue, direction: "against" });
    const recent = valuesFor(history, family, { teamId, direction: "for" }).slice(-8);
    return 0.45 * shrunkMean(own, leagueVenue) + 0.35 * shrunkMean(opponentAgainst, leagueVenue) + 0.20 * shrunkMean(recent, leagueAll, 4);
  };
  return { home: side(homeTeam, awayTeam, "home"), away: side(awayTeam, homeTeam, "away"), baselineHome: leagueHome, baselineAway: leagueAway };
}

function dispersionSize(history, family) {
  const values = valuesFor(history, family);
  const center = mean(values), spread = variance(values);
  if (!(spread > center + 0.05)) return Infinity;
  return clamp(center ** 2 / (spread - center), 0.5, 200);
}

function countPmf(mu, size, maximum) {
  const result = [];
  if (!Number.isFinite(size)) {
    let probability = Math.exp(-mu);
    result.push(probability);
    for (let value = 1; value <= maximum; value += 1) {
      probability *= mu / value;
      result.push(probability);
    }
  } else {
    const q = mu / (size + mu);
    let probability = (size / (size + mu)) ** size;
    result.push(probability);
    for (let value = 1; value <= maximum; value += 1) {
      probability *= ((value - 1 + size) / value) * q;
      result.push(probability);
    }
  }
  const total = result.reduce((sum, value) => sum + value, 0);
  return result.map(value => value / total);
}

function convolve(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);
  for (let first = 0; first < left.length; first += 1) for (let second = 0; second < right.length; second += 1) result[first + second] += left[first] * right[second];
  return result;
}

function probabilities(mu, size, family) {
  const maximum = METRICS[family].maximum;
  const home = countPmf(mu.home, size, maximum), away = countPmf(mu.away, size, maximum);
  const total = convolve(home, away);
  const result = { home, away, total, oneXTwo: { "1": 0, X: 0, "2": 0 } };
  for (let h = 0; h < home.length; h += 1) for (let a = 0; a < away.length; a += 1) result.oneXTwo[h > a ? "1" : h < a ? "2" : "X"] += home[h] * away[a];
  return result;
}

function overProbability(pmf, threshold) {
  return pmf.reduce((sum, probability, value) => sum + (value > Number(threshold) ? probability : 0), 0);
}

function brier(rows) {
  return mean(rows.map(row => (row.probability - row.outcome) ** 2));
}

function ece(rows) {
  const bins = Array.from({ length: 10 }, () => []);
  for (const row of rows) bins[Math.min(9, Math.floor(row.probability * 10))].push(row);
  return bins.reduce((sum, bin) => sum + (bin.length ? bin.length / rows.length * Math.abs(mean(bin.map(row => row.probability)) - mean(bin.map(row => row.outcome))) : 0), 0);
}

function logLoss(rows) {
  return mean(rows.map(row => {
    const probability = clamp(row.probability, 1e-12, 1 - 1e-12);
    return -(row.outcome * Math.log(probability) + (1 - row.outcome) * Math.log(1 - probability));
  }));
}

function validationThresholds(odds, marketCode) {
  return [...new Set(odds.events.flatMap(event => event.markets.filter(market => String(market.marketCode) === String(marketCode)).map(market => Number(market.threshold))).filter(finite))].sort((a, b) => a - b);
}

function validateSubfamily({ definition, marketCode, thresholds, forecasts }) {
  const modelRows = [], baselineRows = [], thresholdRows = new Map();
  const add = (key, model, baseline, outcome) => {
    modelRows.push({ probability: model, outcome });
    baselineRows.push({ probability: baseline, outcome });
    if (!thresholdRows.has(key)) thresholdRows.set(key, { model: [], baseline: [] });
    thresholdRows.get(key).model.push({ probability: model, outcome });
    thresholdRows.get(key).baseline.push({ probability: baseline, outcome });
  };
  if (definition.kind === "team-over") {
    for (const forecast of forecasts) for (const side of ["home", "away"]) for (const threshold of thresholds) {
      const outcome = Number(forecast.actual[side] > threshold);
      add(String(threshold), overProbability(forecast.model[side], threshold), overProbability(forecast.baseline[side], threshold), outcome);
    }
  } else if (definition.kind === "match-over") {
    for (const forecast of forecasts) for (const threshold of thresholds) {
      const outcome = Number(forecast.actual.home + forecast.actual.away > threshold);
      add(String(threshold), overProbability(forecast.model.total, threshold), overProbability(forecast.baseline.total, threshold), outcome);
    }
  } else {
    for (const forecast of forecasts) {
      const actual = forecast.actual.home > forecast.actual.away ? "1" : forecast.actual.home < forecast.actual.away ? "2" : "X";
      for (const outcome of ["1", "X", "2"]) {
        add("overall", forecast.model.oneXTwo[outcome], forecast.baseline.oneXTwo[outcome], Number(actual === outcome));
      }
    }
  }
  const errors = forecasts.flatMap(forecast => definition.kind === "match-over"
    ? [forecast.mean.home + forecast.mean.away - forecast.actual.home - forecast.actual.away]
    : [forecast.mean.home - forecast.actual.home, forecast.mean.away - forecast.actual.away]);
  const metrics = {
    matchClusters: forecasts.length,
    probabilityObservations: modelRows.length,
    brier: round(brier(modelRows)),
    baselineBrier: round(brier(baselineRows)),
    deltaBrier: round(brier(modelRows) - brier(baselineRows)),
    logLoss: round(logLoss(modelRows)),
    ece: round(ece(modelRows)),
    meanBias: round(mean(errors)),
    mae: round(mean(errors.map(Math.abs))),
  };
  const thresholdValidation = Object.fromEntries([...thresholdRows.entries()].map(([key, rows]) => {
    const positives = rows.model.reduce((sum, row) => sum + row.outcome, 0), negatives = rows.model.length - positives;
    const row = {
      observations: rows.model.length,
      positives,
      negatives,
      brier: round(brier(rows.model)),
      baselineBrier: round(brier(rows.baseline)),
      deltaBrier: round(brier(rows.model) - brier(rows.baseline)),
      ece: round(ece(rows.model)),
    };
    const enoughOutcomes = definition.kind === "one-x-two" ? positives >= 60 && negatives >= 120 : positives >= 30 && negatives >= 30;
    return [key, { ...row, gate: enoughOutcomes && row.deltaBrier <= 0.015 && row.ece <= 0.10 ? "PASS" : "FAIL" }];
  }));
  const passed = metrics.matchClusters >= 180
    && metrics.deltaBrier <= 0.005
    && metrics.ece <= 0.08
    && Math.abs(metrics.meanBias) <= METRICS[definition.family].biasLimit
    && Object.values(thresholdValidation).some(row => row.gate === "PASS");
  return { ...metrics, gate: passed ? "PASS" : "FAIL", gateCriteria: "clusters>=180; deltaBrier<=0.005; ECE<=0.08; absolute bias within family limit; exact threshold must have >=30 positive and >=30 negative holdout outcomes", thresholds: thresholdValidation };
}

function buildValidation(odds, priorMatches) {
  const training = priorMatches.filter(match => match.matchday <= 19);
  const holdout = priorMatches.filter(match => match.matchday > 19);
  const history = training.slice();
  const forecastsByFamily = Object.fromEntries(Object.keys(METRICS).map(family => [family, []]));
  const sizeByFamily = Object.fromEntries(Object.keys(METRICS).map(family => [family, dispersionSize(training, family)]));
  for (const matchday of [...new Set(holdout.map(match => match.matchday))].sort((a, b) => a - b)) {
    const roundMatches = holdout.filter(match => match.matchday === matchday);
    for (const match of roundMatches) for (const family of Object.keys(METRICS)) {
      const mu = forecastMean(history, family, match.homeTeam, match.awayTeam);
      forecastsByFamily[family].push({
        matchId: match.matchId,
        actual: match.metrics[family],
        mean: mu,
        model: probabilities(mu, sizeByFamily[family], family),
        baseline: probabilities({ home: mu.baselineHome, away: mu.baselineAway }, sizeByFamily[family], family),
      });
    }
    history.push(...roundMatches);
  }
  const subfamilies = {};
  for (const [marketCode, definition] of Object.entries(MARKET_MODELS)) {
    subfamilies[definition.subfamily] = validateSubfamily({ definition, marketCode, thresholds: validationThresholds(odds, marketCode), forecasts: forecastsByFamily[definition.family] });
  }
  return {
    design: "Walk-forward temporale: MD1-MD19 training iniziale; MD20-MD38 holdout, aggiornato solo con giornate precedenti.",
    trainingMatches: training.length,
    holdoutMatches: holdout.length,
    distribution: Object.fromEntries(Object.entries(sizeByFamily).map(([family, size]) => [family, { family: Number.isFinite(size) ? "NEGATIVE_BINOMIAL" : "POISSON", size: Number.isFinite(size) ? round(size) : null }])),
    subfamilies,
  };
}

function sideFromVariant(variant) {
  const value = String(variant || "").toUpperCase();
  return /SQUADRA\s*1\b|CASA/.test(value) ? "home" : /SQUADRA\s*2\b|OSPITE/.test(value) ? "away" : null;
}

function buildCurrentEvaluations({ odds, fixtures, history, validation, priorTeamIds }) {
  const fixtureById = new Map(fixtures.filter(match => match.matchday === 6 && match.competition === "serie-a").map(match => [match.id, match]));
  const sizeByFamily = Object.fromEntries(Object.keys(METRICS).map(family => [family, dispersionSize(history, family)]));
  const forecasts = new Map();
  for (const event of odds.events) {
    const fixture = fixtureById.get(event.canonicalMatchId);
    if (!fixture) continue;
    const limitedHistoryTeams = [fixture.homeTeam, fixture.awayTeam].filter(teamId => !priorTeamIds.has(teamId));
    const byFamily = {};
    for (const family of Object.keys(METRICS)) {
      const mu = forecastMean(history, family, fixture.homeTeam, fixture.awayTeam);
      byFamily[family] = { mean: mu, probabilities: probabilities(mu, sizeByFamily[family], family), limitedHistoryTeams };
    }
    forecasts.set(event.canonicalMatchId, byFamily);
  }
  const evaluations = {};
  for (const event of odds.events) for (const market of event.markets || []) {
    const definition = MARKET_MODELS[String(market.marketCode || "")];
    if (!definition) continue;
    const gate = validation.subfamilies[definition.subfamily];
    if (gate?.gate !== "PASS") continue;
    const forecast = forecasts.get(event.canonicalMatchId)?.[definition.family];
    if (!forecast) continue;
    for (const selection of market.selections || []) {
      if (selection.status !== "open") continue;
      const pick = String(selection.name).toUpperCase();
      if (definition.kind !== "one-x-two" && pick !== "OVER") continue;
      const thresholdGate = gate.thresholds[definition.kind === "one-x-two" ? "overall" : String(Number(market.threshold))];
      if (thresholdGate?.gate !== "PASS") continue;
      let probability = null;
      if (definition.kind === "match-over") probability = overProbability(forecast.probabilities.total, Number(market.threshold));
      else if (definition.kind === "team-over") {
        const side = sideFromVariant(market.variantName);
        if (side) probability = overProbability(forecast.probabilities[side], Number(market.threshold));
      } else probability = forecast.probabilities.oneXTwo[pick];
      if (!finite(probability)) continue;
      const limitedHistory = forecast.limitedHistoryTeams.length > 0;
      const uncertainty = clamp(Math.max(limitedHistory ? 0.05 : 0.02, thresholdGate.ece / 2), 0.02, 0.06);
      const prudentProbability = clamp(probability - uncertainty, 0, 1);
      const oddsDecimal = Number(selection.odds);
      const { thresholds: _thresholds, ...validationSummary } = gate;
      evaluations[String(selection.providerSelectionId)] = {
        family: definition.family,
        subfamily: definition.subfamily,
        distribution: validation.distribution[definition.family].family,
        mean: { home: round(forecast.mean.home, 3), away: round(forecast.mean.away, 3) },
        modelProbabilityPct: round(probability * 100, 2),
        prudentProbabilityPct: round(prudentProbability * 100, 2),
        fairOdds: round(1 / probability, 2),
        expectedValuePct: round((probability * oddsDecimal - 1) * 100, 2),
        conservativeExpectedValuePct: round((prudentProbability * oddsDecimal - 1) * 100, 2),
        uncertaintyDeductionPp: round(uncertainty * 100, 2),
        reliability: limitedHistory ? "Bassa" : "Media",
        limitedHistoryTeams: forecast.limitedHistoryTeams,
        validation: { ...validationSummary, exactThreshold: thresholdGate },
      };
    }
  }
  return { evaluations, forecasts: Object.fromEntries(forecasts) };
}

function buildStatisticalModelArtifact() {
  const odds = read("data/normalized/odds/sisal/serie-a.json");
  const fixtures = read("data/normalized/matches.json");
  const priorMatches = reconstructPriorSeason();
  const currentMatches = currentSeasonActuals().filter(match => Object.values(match.metrics).every(metric => finite(metric.home) && finite(metric.away)));
  const validation = buildValidation(odds, priorMatches);
  const priorTeamIds = new Set(priorMatches.flatMap(match => [match.homeTeam, match.awayTeam]));
  const current = buildCurrentEvaluations({ odds, fixtures, history: [...priorMatches, ...currentMatches], validation, priorTeamIds });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: "Serie A 2026/27 Schedina MD6",
    sources: {
      historicalVolumes: "data/normalized/team-volume-profiles-2025-26.json",
      historicalSchedule: "data/normalized/referee-matches/2025-26/serie-a.json",
      currentActuals: "data/sources/match-results-2026-27.json",
      odds: "data/normalized/odds/sisal/serie-a.json",
      sisalRules: "https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf",
    },
    dataCoverage: { historicalMatches: priorMatches.length, currentMatches: currentMatches.length, historicalTeamPerformances: priorMatches.length * 2 },
    methodology: "Modello gerarchico casa/trasferta con attacco squadra, concessioni avversarie e forma recente; distribuzioni discrete Poisson/negative-binomial scelte dalla dispersione del solo training; somme e differenziali ottenuti per convoluzione discreta.",
    validation,
    currentForecasts: current.forecasts,
    evaluations: current.evaluations,
    blocked: {
      playerShotsAndSot: "I mercati individuali totali sono DUO; i soli mercati standard disponibili richiedono successo in entrambi i tempi e non sono equivalenti alle probabilita V2 full-match.",
      duo: "Identita del sostituto, minuti e dipendenza non disponibili; SOT DUO include inoltre pali/traverse.",
      cards: "Regole Sisal verificate, ma gli actuals storici aggregati non certificano l'esclusione di panchina, staff, post-partita e giocatori gia sostituiti.",
    },
  };
}

module.exports = { METRICS, MARKET_MODELS, reconstructPriorSeason, currentSeasonActuals, forecastMean, dispersionSize, countPmf, convolve, probabilities, overProbability, buildStatisticalModelArtifact };
