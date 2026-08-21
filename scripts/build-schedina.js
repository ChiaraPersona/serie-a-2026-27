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

function pickAnalysis(pick, market, prediction) {
  const score = String(prediction.scoreForecast?.primary?.score || "").split("-").map(Number);
  const outcomeSelections = new Set(["1", "X", "2", "1X", "X2", "12"]);
  if (outcomeSelections.has(pick.selection)) {
    return {
      coherent: [...pick.selection].includes(prediction.verdict.outcome),
      modelProbabilityPct: round(modelProbability(prediction, pick.selection), 1),
      evidenceLabel: `Pronostico ${prediction.verdict.outcome} · ${prediction.scoreForecast?.primary?.score || "N/D"}`
    };
  }
  if (market.marketName === "GOAL/NOGOAL") {
    const expected = score[0] > 0 && score[1] > 0 ? "GOAL" : "NOGOAL";
    return { coherent: pick.selection === expected, modelProbabilityPct: null, evidenceLabel: `Risultato previsto ${score.join("-")}` };
  }
  if (["CASA: SEGNA GOAL", "OSPITE: SEGNA GOAL"].includes(market.marketName)) {
    const teamIndex = market.marketName.startsWith("CASA") ? 0 : 1;
    const expected = score[teamIndex] > 0 ? "SI" : "NO";
    return { coherent: pick.selection === expected, modelProbabilityPct: null, evidenceLabel: `Risultato previsto ${score.join("-")}` };
  }
  if (market.marketName === "ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA") {
    const threshold = Number(market.variantName.match(/ALMENO ([0-9]+(?:\.[0-9]+)?)/)?.[1]);
    const central = prediction.teamProjections?.map(team => Number(team.shotsOnTarget?.central)) || [];
    const coherent = pick.selection === "SI" && central.length === 2 && central.every(value => Number.isFinite(value) && value >= threshold);
    return { coherent, modelProbabilityPct: null, evidenceLabel: `Volumi centrali ${central.map(value => String(value).replace(".", ",")).join(" + ")}` };
  }
  if (/TIRI TOTALI|TIRI IN PORTA/.test(market.marketName)) {
    const metricKey = /TIRI IN PORTA/.test(market.marketName) ? "shotsOnTarget" : "shotsTotal";
    const teamMatch = market.variantName.match(/^SQUADRA ([12]):/);
    const metric = teamMatch ? prediction.teamProjections?.[Number(teamMatch[1]) - 1]?.[metricKey] : prediction.matchProjection?.[metricKey];
    const threshold = Number(market.threshold);
    const central = Number(metric?.central);
    const coherent = Number.isFinite(central) && Number.isFinite(threshold) && (pick.selection === "OVER" ? central > threshold : central < threshold);
    return { coherent, modelProbabilityPct: null, evidenceLabel: `Volume centrale ${String(central).replace(".", ",")}` };
  }
  throw new Error(`${pick.matchId}: mercato non validabile ${market.marketName}`);
}

function marketFamily(marketName) {
  if (/1X2|DOPPIA CHANCE/.test(marketName)) return "Esito";
  if (/GOAL/.test(marketName)) return "Gol";
  if (/TIRI IN PORTA/.test(marketName)) return "Tiri in porta";
  if (/TIRI TOTALI/.test(marketName)) return "Tiri totali";
  return marketName;
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
  const market = event.markets.find(item => item.marketName === pick.market && (!pick.variant || item.variantName === pick.variant) && item.status === "open");
  const selection = market?.selections.find(item => item.name === pick.selection && item.status === "open");
  if (!market || !selection) throw new Error(`${pick.matchId}: ${pick.market} ${pick.selection} non disponibile`);
  const analysis = pickAnalysis(pick, market, prediction);
  if (!analysis.coherent) throw new Error(`${pick.matchId}: ${pick.label || pick.selection} incoerente con il pronostico o i volumi del modello`);
  return {
    matchId: pick.matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    marketFamily: marketFamily(market.marketName),
    selection: pick.selection,
    label: pick.label || selectionLabel(event, pick.selection),
    odds: selection.odds,
    modelProbabilityPct: analysis.modelProbabilityPct,
    evidenceLabel: analysis.evidenceLabel,
    coherent: analysis.coherent,
    predictedOutcome: prediction.verdict.outcome,
    predictedScore: prediction.scoreForecast?.primary?.score || null,
    providerSelectionId: selection.providerSelectionId
  };
}

const slips = source.slips.map((slip, index) => {
  const legs = slip.picks.map(resolvePick);
  const families = [...new Set(legs.map(leg => leg.marketFamily))];
  if (families.length < 3) throw new Error(`${slip.id}: servono almeno tre famiglie di mercato, trovate ${families.join(", ")}`);
  const combinedOdds = legs.reduce((product, leg) => product * leg.odds, 1);
  const hasJointProbability = legs.every(leg => Number.isFinite(leg.modelProbabilityPct));
  const jointProbability = hasJointProbability ? legs.reduce((product, leg) => product * leg.modelProbabilityPct / 100, 1) : null;
  return {
    id: slip.id,
    number: index + 1,
    eyebrow: slip.eyebrow,
    name: slip.name,
    description: slip.description,
    marketFamilies: families,
    combinedOdds: round(combinedOdds),
    jointModelProbabilityPct: hasJointProbability ? round(jointProbability * 100) : null,
    fairOdds: hasJointProbability ? round(1 / jointProbability) : null,
    expectedValuePct: hasJointProbability ? round((jointProbability * combinedOdds - 1) * 100, 1) : null,
    legs
  };
});

const allSelections = slips.flatMap(slip => slip.legs.map(leg => ({ slipId: slip.id, ...leg })));
const repeatedSelections = allSelections.filter((leg, index) => allSelections.findIndex(item => item.providerSelectionId === leg.providerSelectionId) !== index);
if (repeatedSelections.length) {
  throw new Error(`Selezioni ripetute tra schedine: ${repeatedSelections.map(leg => `${leg.slipId}/${leg.matchId}/${leg.label}`).join("; ")}`);
}

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
  methodology: "Ogni schedina usa almeno tre famiglie di mercato e nessuna selezione Sisal viene ripetuta in un'altra proposta. Il motore valida esiti e gol sul risultato previsto, tiri e tiri in porta sui volumi centrali. Probabilità, quota equa ed EV restano a N/D quando manca una probabilità calibrata per una soglia. La quota Sisal non modifica il pronostico.",
  slips
};

fs.writeFileSync(path.join(root, "data/normalized/schedina.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Schedina MD1: ${slips.length} proposte, ${slips.reduce((sum, slip) => sum + slip.legs.length, 0)} selezioni validate.`);
