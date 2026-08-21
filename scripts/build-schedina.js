const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const source = read("data/sources/schedina-serie-a-2026-27-md-01.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json");
const matches = read("data/normalized/matches.json");
const teamIndex = read("data/teams/index.json").teams;
const eventByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const predictionByMatch = new Map(predictions.predictions.map(prediction => [prediction.matchId, prediction]));
const matchById = new Map(matches.map(match => [match.id, match]));
const teamById = new Map(teamIndex.map(team => [team.id, read(`data/teams/${team.id}.json`)]));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function modelProbability(prediction, selection) {
  const final = prediction.probabilities?.final || {};
  if (selection.length === 1) return final[selection];
  return [...selection].reduce((sum, outcome) => sum + (final[outcome] || 0), 0);
}

function poissonRange(lambda, minimum, maximum) {
  let probability = Math.exp(-lambda);
  let total = minimum === 0 ? probability : 0;
  for (let goals = 1; goals <= maximum; goals += 1) {
    probability *= lambda / goals;
    if (goals >= minimum) total += probability;
  }
  return total;
}

function poissonPoint(lambda, goals) {
  let probability = Math.exp(-lambda);
  for (let index = 1; index <= goals; index += 1) probability *= lambda / index;
  return probability;
}

function exactScoreProbability(prediction, score) {
  const [homeGoals, awayGoals] = score.split("-").map(Number);
  if (![homeGoals, awayGoals].every(Number.isFinite)) return 0;
  return poissonPoint(Number(prediction.expectedGoals?.home), homeGoals)
    * poissonPoint(Number(prediction.expectedGoals?.away), awayGoals);
}

function playerContext(pick) {
  const match = matchById.get(pick.matchId);
  for (const [teamPosition, teamId] of [match?.homeTeam, match?.awayTeam].entries()) {
    const team = teamById.get(teamId);
    const isProjected = (team?.probableLineup?.players || []).some(name => clean(name) === clean(pick.player));
    const player = team?.squad?.find(item => clean(item.name) === clean(pick.player));
    if (isProjected && player) return { team, teamPosition, player, venue: teamPosition === 0 ? "home" : "away" };
  }
  return null;
}

function regularizedRate(per90, minutes, priorRate) {
  const exposure = minutes / 90;
  const priorExposure = 8;
  return (per90 * exposure + priorRate * priorExposure) / (exposure + priorExposure);
}

function poissonOverProbability(lambda, threshold) {
  return 1 - poissonRange(lambda, 0, Math.floor(threshold));
}

function pickAnalysis(pick, market, prediction) {
  const score = String(prediction.scoreForecast?.primary?.score || "").split("-").map(Number);
  if (market.marketName === "MULTIGOAL CASA + MULTIGOAL OSPITE") {
    const ranges = pick.selection.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/)?.slice(1).map(Number);
    if (!ranges) return { coherent: false, modelProbabilityPct: null, evidenceLabel: "Intervalli non validi" };
    const [homeMin, homeMax, awayMin, awayMax] = ranges;
    const coherent = score[0] >= homeMin && score[0] <= homeMax && score[1] >= awayMin && score[1] <= awayMax;
    const probability = poissonRange(Number(prediction.expectedGoals?.home), homeMin, homeMax)
      * poissonRange(Number(prediction.expectedGoals?.away), awayMin, awayMax);
    return {
      coherent,
      modelProbabilityPct: round(probability * 100, 2),
      evidenceLabel: `Risultato previsto ${score.join("-")} · xG ${String(prediction.expectedGoals.home).replace(".", ",")}–${String(prediction.expectedGoals.away).replace(".", ",")}`
    };
  }
  if (market.marketName === "RISULTATO ESATTO 26 ESITI") {
    const predictedScore = score.join("-");
    return {
      coherent: pick.selection === predictedScore,
      modelProbabilityPct: round(exactScoreProbability(prediction, pick.selection) * 100, 2),
      evidenceLabel: `Risultato centrale del modello · ${predictedScore}`
    };
  }
  if (/^RISULTATO ESATTO MULTI ESITI [1-5]$/.test(market.marketName)) {
    const outcomes = pick.selection.split("/").map(item => item.trim()).filter(item => /^\d+-\d+$/.test(item));
    const predictedScore = score.join("-");
    return {
      coherent: outcomes.includes(predictedScore),
      modelProbabilityPct: round(outcomes.reduce((sum, outcome) => sum + exactScoreProbability(prediction, outcome), 0) * 100, 2),
      evidenceLabel: `Include il risultato previsto · ${predictedScore}`
    };
  }
  const outcomeSelections = new Set(["1", "X", "2", "1X", "X2", "12"]);
  if (outcomeSelections.has(pick.selection)) {
    return {
      coherent: [...pick.selection].includes(prediction.verdict.outcome),
      modelProbabilityPct: round(modelProbability(prediction, pick.selection), 1),
      evidenceLabel: `Pronostico ${prediction.verdict.outcome} · ${prediction.scoreForecast?.primary?.score || "N/D"}`
    };
  }
  if (market.marketName === "MARCATORE SI/NO (DUO) INC TS") {
    const teamIndex = pick.teamSide === "home" ? 0 : pick.teamSide === "away" ? 1 : -1;
    const context = playerContext(pick);
    const per90 = Number(context?.player?.previousSeason?.totals?.per90?.goals);
    const minutes = Number(context?.player?.previousSeason?.totals?.minutes);
    const venueStats = context?.team?.teamStats?.homeAway?.[context?.venue];
    const historicalTeamRate = Number(venueStats?.goalsFor) / Number(venueStats?.played);
    const expectedTeamGoals = Number(context && (context.teamPosition === 0 ? prediction.expectedGoals?.home : prediction.expectedGoals?.away));
    const matchupFactor = clamp(expectedTeamGoals / historicalTeamRate, 0.65, 1.5);
    const lambda = regularizedRate(per90, minutes, 0.25) * matchupFactor;
    const probability = 1 - Math.exp(-lambda);
    const coherent = pick.selection === "SI" && teamIndex >= 0 && context?.teamPosition === teamIndex && score[teamIndex] > 0
      && Number.isFinite(per90) && Number.isFinite(minutes) && minutes >= 700 && Number.isFinite(probability);
    const isModelMvp = prediction.mvpCandidate?.name === pick.player;
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `${isModelMvp ? "MVP previsto" : "Titolare previsto"} · ${String(round(per90, 2)).replace(".", ",")} gol/90 · λ ${String(round(lambda, 2)).replace(".", ",")}`
    };
  }
  if (/TIRI.*GIOCATORE/.test(market.marketName)) {
    const context = playerContext(pick);
    const metricKey = /TIRI IN PORTA/.test(market.marketName) ? "shotsOnTarget" : "shots";
    const projectionKey = metricKey === "shotsOnTarget" ? "shotsOnTarget" : "shotsTotal";
    const metricLabel = metricKey === "shotsOnTarget" ? "tiri in porta" : "tiri";
    const per90 = Number(context?.player?.previousSeason?.totals?.per90?.[metricKey]);
    const minutes = Number(context?.player?.previousSeason?.totals?.minutes);
    const threshold = Number(market.threshold);
    const projection = context && prediction.teamProjections?.[context.teamPosition]?.[projectionKey];
    const selfVolumeInput = projection?.inputs?.find(input => input.source === `${context?.venue}-for`)
      || projection?.inputs?.find(input => input.source === (metricKey === "shotsOnTarget" ? "lineup-accuracy-prior" : "team-style-prior"));
    const historicalTeamMean = Number(selfVolumeInput?.mean ?? projection?.central);
    const matchupFactor = clamp(Number(projection?.central) / historicalTeamMean, 0.75, 1.25);
    const lambda = regularizedRate(per90, minutes, metricKey === "shotsOnTarget" ? 0.7 : 2) * matchupFactor;
    const probability = poissonOverProbability(lambda, threshold);
    const coherent = pick.selection === "OVER" && Number.isFinite(per90) && Number.isFinite(threshold)
      && minutes >= 700 && Number.isFinite(probability) && probability > 0;
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Titolare previsto · ${String(round(per90, 2)).replace(".", ",")} ${metricLabel}/90 · λ ${String(round(lambda, 2)).replace(".", ",")}`
    };
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
  if (/MULTIGOAL CASA \+ MULTIGOAL OSPITE/.test(marketName)) return "Multigol casa/ospite";
  if (/^RISULTATO ESATTO MULTI ESITI/.test(marketName)) return "Risultato esatto multiesito";
  if (/^RISULTATO ESATTO 26 ESITI/.test(marketName)) return "Risultato esatto";
  if (/MARCATORE/.test(marketName)) return "Marcatori";
  if (/TIRI IN PORTA GIOCATORE/.test(marketName)) return "Tiri in porta giocatore";
  if (/TIRI TOTALI GIOCATORE/.test(marketName)) return "Tiri giocatore";
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
    marketScope: market.marketScope || null,
    marketFamily: marketFamily(market.marketName),
    player: pick.player || null,
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
  const specializedTypes = new Set(["single-market-full-round", "exact-score", "exact-score-multi"]);
  if (!specializedTypes.has(slip.type) && families.length < 3) throw new Error(`${slip.id}: servono almeno tre famiglie di mercato, trovate ${families.join(", ")}`);
  if (slip.type === "player-only" && legs.some(leg => leg.marketScope !== "player")) {
    throw new Error(`${slip.id}: tutte le selezioni devono essere mercati giocatore`);
  }
  if (slip.type === "single-market-full-round" && (legs.length !== 10 || new Set(legs.map(leg => leg.matchId)).size !== 10)) {
    throw new Error(`${slip.id}: la schedina monomercato deve coprire tutte le dieci partite`);
  }
  if (slip.type === "exact-score" && (legs.length !== 4 || legs.some(leg => leg.market !== "RISULTATO ESATTO 26 ESITI"))) {
    throw new Error(`${slip.id}: servono quattro risultati esatti singoli`);
  }
  if (slip.type === "exact-score-multi" && (legs.length !== 6 || legs.some(leg => !/^RISULTATO ESATTO MULTI ESITI/.test(leg.market)))) {
    throw new Error(`${slip.id}: servono sei risultati esatti multiesito`);
  }
  const combinedOdds = legs.reduce((product, leg) => product * leg.odds, 1);
  const hasJointProbability = legs.every(leg => Number.isFinite(leg.modelProbabilityPct));
  const jointProbability = hasJointProbability ? legs.reduce((product, leg) => product * leg.modelProbabilityPct / 100, 1) : null;
  return {
    id: slip.id,
    type: slip.type || "mixed-markets",
    number: index + 1,
    eyebrow: slip.eyebrow,
    name: slip.name,
    description: slip.description,
    marketFamilies: families,
    combinedOdds: round(combinedOdds),
    jointModelProbabilityPct: hasJointProbability ? round(jointProbability * 100, 6) : null,
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
  methodology: "Le probabilità sono indipendenti dalle quote Sisal. Esiti, Multigol e risultati esatti derivano dal modello Poisson sugli xG. Per marcatori, tiri e tiri in porta il motore usa soltanto titolari previsti con almeno 700 minuti: regolarizza la frequenza storica per 90 minuti con un prior prudente, la adatta agli xG o ai volumi di squadra previsti e tratta il mercato duo come esposizione dell'intero ruolo nei 90 minuti. Le probabilità delle gambe, appartenenti a partite diverse, vengono moltiplicate per ottenere la probabilità congiunta; quota equa = 1/probabilità ed EV = probabilità × quota Sisal − 1. Nessuna quota entra nel pronostico. La dicitura sostituto incluso compare soltanto quando prevista dal mercato e non viene applicata ai falli.",
  slips
};

fs.writeFileSync(path.join(root, "data/normalized/schedina.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Schedina MD1: ${slips.length} proposte, ${slips.reduce((sum, slip) => sum + slip.legs.length, 0)} selezioni validate.`);
