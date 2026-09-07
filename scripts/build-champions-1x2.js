"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const model = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/uefa-1x2-model-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const teamMap = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-team-history-map-2026-27.json"), "utf8"));
const outputPath = path.join(root, "data/normalized/champions-1x2-2026-27.json");
const motivationPath = path.join(root, "data/normalized/champions-motivation-md01-2026-27.json");
const motivation = fs.existsSync(motivationPath) ? JSON.parse(fs.readFileSync(motivationPath, "utf8")) : null;
const motivationByFixture = new Map((motivation?.fixtures || []).map(item => [item.matchId, item]));

const fail = message => { throw new Error(`Pronostici Champions 1X2: ${message}`); };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 4) => Number(value.toFixed(digits));
const displayPercentages = probability => {
  const home = Math.round(probability.home * 1000) / 10;
  const draw = Math.round(probability.draw * 1000) / 10;
  const away = Math.round((100 - home - draw) * 10) / 10;
  return { home, draw, away };
};

if (model.status !== "eligible-for-current-fixture-prototype" || !model.probabilityGate?.passed) fail("gate del backtest non superato");
if (calendar.summary?.fixtures !== 144 || !Array.isArray(teamMap.teams) || teamMap.teams.length !== 36) fail("calendario o mappa squadre non validi");
const idsByTeam = new Map(teamMap.teams.map(item => [item.team, item.uefaTeamId]));
if ([...idsByTeam.values()].some(id => !id)) fail("identificativo UEFA corrente mancante");
const ratings = new Map(model.ratings.map(item => [item.teamId, item.rating]));
const params = model.parameters;

const fixtures = calendar.fixtures.map(fixture => {
  const homeTeamId = idsByTeam.get(fixture.homeTeam), awayTeamId = idsByTeam.get(fixture.awayTeam);
  if (!homeTeamId || !awayTeamId) fail(`${fixture.id}: mappa squadra mancante`);
  const homeRating = ratings.get(homeTeamId) ?? 1500;
  const awayRating = ratings.get(awayTeamId) ?? 1500;
  const ratingGap = homeRating - awayRating + params.homeAdvantage;
  const homeShare = 1 / (1 + 10 ** (-ratingGap / 400));
  const draw = clamp(params.drawBase * Math.exp(-Math.abs(ratingGap) / params.drawScale), 0.12, 0.34);
  const baseProbability = { home: (1 - draw) * homeShare, draw, away: (1 - draw) * (1 - homeShare) };
  const fixtureMotivation = motivationByFixture.get(fixture.id) || null;
  const homeAdjustment = fixtureMotivation?.home?.motivation?.modelAdjustments?.netStrengthAdjustment || 0;
  const awayAdjustment = fixtureMotivation?.away?.motivation?.modelAdjustments?.netStrengthAdjustment || 0;
  const adjustedHomeWeight = homeShare * (1 + homeAdjustment);
  const adjustedAwayWeight = (1 - homeShare) * (1 + awayAdjustment);
  const adjustedHomeShare = adjustedHomeWeight / (adjustedHomeWeight + adjustedAwayWeight);
  const probability = { home: (1 - draw) * adjustedHomeShare, draw, away: 0 };
  probability.away = 1 - probability.home - probability.draw;
  const values = [probability.home, probability.draw, probability.away];
  const labels = ["1", "X", "2"];
  const ordered = values.map((value, index) => ({ value, label: labels[index] })).sort((a, b) => b.value - a.value);
  const top = ordered[0].value;
  const confidence = top >= 0.6 ? "high" : top >= 0.5 ? "medium" : "low";
  return {
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeTeamId,
    awayTeamId,
    ratings: { home: round(homeRating, 2), away: round(awayRating, 2), homeAdvantage: params.homeAdvantage, gapAfterHomeAdvantage: round(ratingGap, 2) },
    probabilities: { home: round(probability.home), draw: round(probability.draw), away: round(probability.away) },
    baseProbabilities: { home: round(baseProbability.home), draw: round(baseProbability.draw), away: round(baseProbability.away) },
    displayPercentages: displayPercentages(probability),
    favorite: ordered[0].label,
    confidence,
    confidenceLabel: confidence === "high" ? "alta" : confidence === "medium" ? "media" : "bassa",
    edgePct: round((ordered[0].value - ordered[1].value) * 100, 1),
    motivationAdjustment: fixtureMotivation ? {
      status: "applied-to-relative-strength",
      home: { motivation: fixtureMotivation.home.motivation.score, rotationRisk: fixtureMotivation.home.motivation.rotationRisk, netStrengthAdjustment: homeAdjustment },
      away: { motivation: fixtureMotivation.away.motivation.score, rotationRisk: fixtureMotivation.away.motivation.rotationRisk, netStrengthAdjustment: awayAdjustment },
      probabilityDeltaPctPoints: { home: round((probability.home - baseProbability.home) * 100, 2), draw: 0, away: round((probability.away - baseProbability.away) * 100, 2) }
    } : { status: "unavailable", home: null, away: null, probabilityDeltaPctPoints: { home: 0, draw: 0, away: 0 } },
    status: "experimental"
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify({
  schemaVersion: 1,
  season: "2026-27",
  generatedAt: "2026-09-02",
  status: "experimental-backtested",
  modelVersion: "uefa-elo-1x2-1.1.0-motivation",
  warning: "Percentuali sperimentali: il rating europeo resta la base; per la MD1 Motivation Index e Rotation Risk correggono solo la forza relativa entro limiti prudenziali. Forma domestica finale, assenze e formazioni restano incomplete.",
  methodology: {
    trainingMatches: model.trainingMatches,
    historyThrough: model.historyThrough,
    parameters: params,
    newTeamPrior: 1500,
    probabilityGate: model.probabilityGate,
    motivation: { availableFixtures: motivationByFixture.size, formula: motivation?.methodology?.motivationStrengthFormula || null, rotationFormula: motivation?.methodology?.rotationFormula || null }
  },
  validation: model.holdoutSummary,
  summary: {
    fixtures: fixtures.length,
    highConfidence: fixtures.filter(item => item.confidence === "high").length,
    mediumConfidence: fixtures.filter(item => item.confidence === "medium").length,
    lowConfidence: fixtures.filter(item => item.confidence === "low").length,
    motivationAdjustedFixtures: fixtures.filter(item => item.motivationAdjustment.status === "applied-to-relative-strength").length
  },
  fixtures
}, null, 2)}\n`);

console.log(`OK pronostici Champions 1X2: ${fixtures.length} gare · ${fixtures.filter(item => item.confidence === "high").length} alta · ${fixtures.filter(item => item.confidence === "medium").length} media · ${fixtures.filter(item => item.confidence === "low").length} bassa`);
