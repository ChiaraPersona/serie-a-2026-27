const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const source = read("data/sources/schedina-serie-a-2026-27-md-01.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json");
const eventByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const predictionByMatch = new Map(predictions.predictions.map(prediction => [prediction.matchId, prediction]));
const round = (value, digits = 2) => Number(value.toFixed(digits));

function modelProbability(prediction, selection) {
  const final = prediction.probabilities?.final || {};
  if (selection.length === 1) return final[selection];
  return [...selection].reduce((sum, outcome) => sum + (final[outcome] || 0), 0);
}

function selectionLabel(event, selection) {
  if (selection === "1") return `${event.home.name} vincente`;
  if (selection === "2") return `${event.away.name} vincente`;
  if (selection === "X") return "Pareggio";
  if (selection === "1X") return `${event.home.name} o pareggio`;
  if (selection === "X2") return `${event.away.name} o pareggio`;
  if (selection === "12") return `${event.home.name} o ${event.away.name} (senza pareggio)`;
  throw new Error(`Selezione non supportata: ${selection}`);
}

function resolvePick(pick) {
  const event = eventByMatch.get(pick.matchId);
  const prediction = predictionByMatch.get(pick.matchId);
  if (!event || !prediction) throw new Error(`${pick.matchId}: evento o pronostico mancante`);
  const market = event.markets.find(item => item.marketName === pick.market && item.status === "open");
  const selection = market?.selections.find(item => item.name === pick.selection && item.status === "open");
  if (!market || !selection) throw new Error(`${pick.matchId}: ${pick.market} ${pick.selection} non disponibile`);
  if (![...pick.selection].includes(prediction.verdict.outcome)) {
    throw new Error(`${pick.matchId}: ${pick.selection} incoerente con il pronostico ${prediction.verdict.outcome}`);
  }
  return {
    matchId: pick.matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    selection: pick.selection,
    label: selectionLabel(event, pick.selection),
    odds: selection.odds,
    modelProbabilityPct: round(modelProbability(prediction, pick.selection), 1),
    predictedOutcome: prediction.verdict.outcome,
    predictedScore: prediction.scoreForecast?.primary?.score || null,
    providerSelectionId: selection.providerSelectionId
  };
}

const slips = source.slips.map((slip, index) => {
  const legs = slip.picks.map(resolvePick);
  const combinedOdds = legs.reduce((product, leg) => product * leg.odds, 1);
  const jointProbability = legs.reduce((product, leg) => product * leg.modelProbabilityPct / 100, 1);
  return {
    id: slip.id,
    number: index + 1,
    eyebrow: slip.eyebrow,
    name: slip.name,
    description: slip.description,
    combinedOdds: round(combinedOdds),
    jointModelProbabilityPct: round(jointProbability * 100),
    fairOdds: round(1 / jointProbability),
    expectedValuePct: round((jointProbability * combinedOdds - 1) * 100, 1),
    legs
  };
});

const output = {
  schemaVersion: 1,
  competition: source.competition,
  season: source.season,
  matchday: source.matchday,
  generatedAt: new Date().toISOString(),
  title: source.title,
  description: source.description,
  provider: odds.provider,
  sourceUrl: odds.sourceUrl,
  oddsRetrievedAt: odds.retrievedAt,
  modelVersion: predictions.engine?.version || predictions.predictions[0]?.engineVersion || null,
  methodology: "La probabilità congiunta moltiplica le probabilità del modello assumendo indipendenza tra partite; è una stima, non una garanzia. La quota Sisal non modifica il pronostico.",
  slips
};

fs.writeFileSync(path.join(root, "data/normalized/schedina.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Schedina MD1: ${slips.length} proposte, ${slips.reduce((sum, slip) => sum + slip.legs.length, 0)} selezioni validate.`);
