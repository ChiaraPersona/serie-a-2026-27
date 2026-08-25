"use strict";

const fs = require("fs");
const path = require("path");
const { marketPredicate } = require("./decision-layer");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const predictions = read("data/normalized/predictions.json").predictions;
const matches = read("data/normalized/matches.json");
const matchById = new Map(matches.map(match => [match.id, match]));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const resultOutcome = score => score.home > score.away ? "1" : score.home < score.away ? "2" : "X";

function rate(rows, field) {
  const resolved = rows.filter(row => row[field] === true || row[field] === false);
  return resolved.length ? { resolved: resolved.length, won: resolved.filter(row => row[field]).length, hitRatePct: round(resolved.filter(row => row[field]).length / resolved.length * 100) } : { resolved: 0, won: 0, hitRatePct: null };
}

function settleMarketRow(row, score) {
  if (row.family === "draw-no-bet" && resultOutcome(score) === "X") return null;
  const predicate = row.family === "goals"
    ? marketPredicate("goals", row.selection, row.market.match(/(\d+(?:\.\d+)?)/)?.[1])
    : row.family === "team-goal"
      ? marketPredicate("team-goal", row.selection, null, row.market)
      : marketPredicate(row.family, row.selection, row.threshold, row.market);
  return predicate ? predicate(score) : null;
}

function settlePortfolio(combo, score) {
  if (!combo?.legs?.length) return "not-generated";
  const predicates = combo.legs.map(leg => marketPredicate(leg.market, leg.selection, leg.threshold, leg.variant));
  if (predicates.some(predicate => !predicate)) return "unavailable";
  return predicates.every(predicate => predicate(score)) ? "won" : "lost";
}

const records = predictions.map(prediction => {
  const match = matchById.get(prediction.matchId);
  if (match?.status !== "finished" || !match.score) return null;
  const actualScore = { home: Number(match.score.home), away: Number(match.score.away) };
  const actual = `${actualScore.home}-${actualScore.away}`;
  const marketRows = (prediction.marketComparison || []).map(row => ({
    family: row.family,
    qualifies: row.qualifies,
    expectedValuePct: row.expectedValuePct,
    won: settleMarketRow(row, actualScore)
  }));
  return {
    matchId: prediction.matchId,
    matchday: match.matchday,
    actualScore: actual,
    actualOutcome: resultOutcome(actualScore),
    predictedOutcome: prediction.verdict.outcome,
    outcomeWon: prediction.verdict.outcome === resultOutcome(actualScore),
    primaryScore: prediction.scoreForecast.primary.score,
    primaryScoreWon: prediction.scoreForecast.primary.score === actual,
    modalScore: prediction.scoreForecast.modal.score,
    modalScoreWon: prediction.scoreForecast.modal.score === actual,
    topThreeWon: prediction.scoreForecast.display.some(item => item.score === actual),
    confidence: prediction.confidence.value,
    marketRows,
    portfolios: Object.fromEntries((prediction.combinations || []).map(combo => [combo.tier, settlePortfolio(combo, actualScore)]))
  };
}).filter(Boolean);

const marketFamilies = [...new Set(records.flatMap(record => record.marketRows.map(row => row.family)))];
const marketPerformance = Object.fromEntries(marketFamilies.map(family => {
  const rows = records.flatMap(record => record.marketRows).filter(row => row.family === family && row.won !== null);
  const qualified = rows.filter(row => row.qualifies);
  return [family, {
    all: rate(rows, "won"),
    qualified: rate(qualified, "won"),
    averageExpectedValuePct: qualified.length ? round(qualified.reduce((total, row) => total + row.expectedValuePct, 0) / qualified.length, 1) : null
  }];
}));

const profilePerformance = Object.fromEntries(["Safe", "Balanced", "Aggressive"].map(tier => {
  const outcomes = records.map(record => record.portfolios[tier]).filter(status => status && status !== "not-generated");
  const resolved = outcomes.filter(status => status === "won" || status === "lost");
  return [tier, {
    generated: outcomes.length,
    resolved: resolved.length,
    unavailable: outcomes.filter(status => status === "unavailable").length,
    won: resolved.filter(status => status === "won").length,
    successRatePct: resolved.length ? round(resolved.filter(status => status === "won").length / resolved.length * 100) : null
  }];
}));

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: {
    scope: "Solo partite concluse con pronostico archiviato; nessun ricalcolo retroattivo.",
    scoreMetrics: "Esito 1X2, risultato principale, moda assoluta e copertura dei tre punteggi mostrati.",
    marketMetrics: "Settlement dei mercati determinabili dal risultato finale; mercati giocatore e volume senza dato finale restano indisponibili.",
    warning: "Il tasso di successo descrive il campione osservato e non dimostra da solo un vantaggio futuro."
  },
  matches: records.length,
  predictionPerformance: {
    outcome: rate(records, "outcomeWon"),
    primaryScore: rate(records, "primaryScoreWon"),
    modalScore: rate(records, "modalScoreWon"),
    topThreeScores: rate(records, "topThreeWon")
  },
  marketPerformance,
  profilePerformance,
  records
};

const outputPath = path.join(root, "data/generated/prediction-performance-dashboard.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`OK dashboard pronostici: ${records.length} partite concluse · ${path.relative(root, outputPath)}`);
