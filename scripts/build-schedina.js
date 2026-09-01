const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const matchdayIndex = process.argv.indexOf("--matchday");
const matchday = matchdayIndex >= 0 ? Number(process.argv[matchdayIndex + 1]) : 1;
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) throw new Error("--matchday deve essere compreso tra 1 e 38.");
const matchdayCode = String(matchday).padStart(2, "0");
const outputFilename = matchday === 1 ? "schedina.json" : `schedina-md${matchdayCode}.json`;
const outputPath = path.join(root, "data", "normalized", outputFilename);
const source = read(`data/sources/schedina-serie-a-2026-27-md-${matchdayCode}.json`);
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json");
const matches = read("data/normalized/matches.json");
const archivePath = path.join(root, "data/sources/schedina-archive-md1-2026-27.json");
const roundMatches = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === matchday);
if (roundMatches.length === 10 && roundMatches.every(match => match.status === "finished" && match.score)) {
  if (matchday === 1 && fs.existsSync(archivePath)) {
    const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
    fs.writeFileSync(outputPath, `${JSON.stringify(archive, null, 2)}\n`);
  } else if (!fs.existsSync(outputPath)) {
    throw new Error(`Schedina MD${matchdayCode} conclusa ma archivio normalizzato assente.`);
  }
  console.log(`Schedina MD${matchdayCode} congelata: giornata conclusa, nessun ricalcolo retroattivo.`);
  process.exit(0);
}
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

function poissonQuantile(lambda, target) {
  let term = Math.exp(-lambda), cumulative = term;
  if (cumulative >= target) return 0;
  for (let goals = 1; goals <= 8; goals += 1) {
    term *= lambda / goals;
    cumulative += term;
    if (cumulative >= target) return goals;
  }
  return 8;
}

function multigoalLabel(selection) {
  const ranges = selection.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/)?.slice(1).map(Number);
  if (!ranges) return selection;
  return `Casa ${ranges[0]}–${ranges[1]} gol · Ospite ${ranges[2]}–${ranges[3]} gol`;
}

function resolveAutomaticMultigoal(pick, policy = {}) {
  if (pick.selection !== "AUTO" || pick.market !== "MULTIGOAL CASA + MULTIGOAL OSPITE") return pick;
  const event = eventByMatch.get(pick.matchId), prediction = predictionByMatch.get(pick.matchId);
  const market = event?.markets.find(item => item.marketName === pick.market && (!pick.variant || item.variantName === pick.variant) && item.status === "open");
  if (!market || !prediction) throw new Error(`${pick.matchId}: mercato Multigol automatico non disponibile`);
  const central = String(prediction.scoreForecast?.primary?.score || "").split("-").map(Number);
  const quantile = Number(policy.quantile ?? 0.9);
  const maximumWidth = Number(policy.maxTeamRangeWidth ?? 2);
  const minimumProbability = Number(policy.minModelProbability ?? 0.55);
  const minimumOdds = Number(policy.minLegOdds ?? 1.1), maximumOdds = Number(policy.maxLegOdds ?? 1.8);
  const upperBounds = [poissonQuantile(Number(prediction.expectedGoals.home), quantile), poissonQuantile(Number(prediction.expectedGoals.away), quantile)];
  const candidates = (market.selections || []).filter(selection => selection.status === "open" && selection.odds >= minimumOdds && selection.odds <= maximumOdds).map(selection => {
    const ranges = selection.name.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/)?.slice(1).map(Number);
    if (!ranges) return null;
    const [homeMin, homeMax, awayMin, awayMax] = ranges;
    if (central[0] < homeMin || central[0] > homeMax || central[1] < awayMin || central[1] > awayMax) return null;
    if (homeMax - homeMin > maximumWidth || awayMax - awayMin > maximumWidth) return null;
    if (homeMax > upperBounds[0] || awayMax > upperBounds[1]) return null;
    const probability = poissonRange(Number(prediction.expectedGoals.home), homeMin, homeMax)
      * poissonRange(Number(prediction.expectedGoals.away), awayMin, awayMax);
    if (probability < minimumProbability) return null;
    return { selection, probability, expectedValue: probability * selection.odds - 1 };
  }).filter(Boolean).sort((left, right) => right.expectedValue - left.expectedValue || right.probability - left.probability || right.selection.odds - left.selection.odds);
  if (!candidates[0]) throw new Error(`${pick.matchId}: nessun intervallo Multigol rispetta la policy prudenziale`);
  return { ...pick, selection: candidates[0].selection.name, label: multigoalLabel(candidates[0].selection.name) };
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

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function overUnderProbability(metric, threshold, selection) {
  const mean = Number(metric?.central);
  const sd = Number(metric?.sd);
  if (!Number.isFinite(mean) || !Number.isFinite(threshold)) return null;
  const under = Number.isFinite(sd) && sd > 0
    ? normalCdf((threshold - mean) / sd)
    : poissonRange(mean, 0, Math.floor(threshold));
  return selection === "OVER" ? 1 - under : selection === "UNDER" ? under : null;
}

function pathHitProbability(homeGoals, awayGoals, teamIndex, margin) {
  const memo = new Map();
  const visit = (homeUsed, awayUsed) => {
    const lead = teamIndex === 0 ? homeUsed - awayUsed : awayUsed - homeUsed;
    if (lead >= margin) return 1;
    if (homeUsed === homeGoals && awayUsed === awayGoals) return 0;
    const key = `${homeUsed}:${awayUsed}`;
    if (memo.has(key)) return memo.get(key);
    const homeRemaining = homeGoals - homeUsed;
    const awayRemaining = awayGoals - awayUsed;
    const totalRemaining = homeRemaining + awayRemaining;
    const probability = (homeRemaining ? homeRemaining / totalRemaining * visit(homeUsed + 1, awayUsed) : 0)
      + (awayRemaining ? awayRemaining / totalRemaining * visit(homeUsed, awayUsed + 1) : 0);
    memo.set(key, probability);
    return probability;
  };
  return visit(0, 0);
}

function winOrLeadProbability(prediction, teamIndex, margin) {
  const homeLambda = Number(prediction.expectedGoals?.home);
  const awayLambda = Number(prediction.expectedGoals?.away);
  let probability = 0;
  let coveredMass = 0;
  for (let homeGoals = 0; homeGoals <= 10; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 10; awayGoals += 1) {
      const scoreProbability = poissonPoint(homeLambda, homeGoals) * poissonPoint(awayLambda, awayGoals);
      const finalWin = teamIndex === 0 ? homeGoals > awayGoals : awayGoals > homeGoals;
      const eventProbability = finalWin ? 1 : pathHitProbability(homeGoals, awayGoals, teamIndex, margin);
      probability += scoreProbability * eventProbability;
      coveredMass += scoreProbability;
    }
  }
  return coveredMass > 0 ? probability / coveredMass : null;
}

function pickAnalysis(pick, market, prediction, selection) {
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
  if (market.marketName === "UNDER/OVER") {
    const threshold = Number(market.threshold ?? market.variantName.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1]);
    const lambda = Number(prediction.expectedGoals?.home) + Number(prediction.expectedGoals?.away);
    const under = poissonRange(lambda, 0, Math.floor(threshold));
    const probability = pick.selection === "OVER" ? 1 - under : pick.selection === "UNDER" ? under : null;
    const coherent = Number.isFinite(probability) && probability > 0;
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Totale xG ${String(round(lambda, 2)).replace(".", ",")} · soglia ${String(threshold).replace(".", ",")}`
    };
  }
  if (market.marketName === "MULTIGOAL") {
    const range = pick.selection.match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
    const lambda = Number(prediction.expectedGoals?.home) + Number(prediction.expectedGoals?.away);
    const probability = range ? poissonRange(lambda, range[0], range[1]) : null;
    const predictedTotal = score[0] + score[1];
    const coherent = Boolean(range) && predictedTotal >= range[0] && predictedTotal <= range[1] && Number.isFinite(probability);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Totale previsto ${predictedTotal} · xG complessivi ${String(round(lambda, 2)).replace(".", ",")}`
    };
  }
  if (market.marketName === "VINCE O QUASI (1UP/2UP)") {
    const teamNumber = Number(market.variantName.match(/SQUADRA ([12])/i)?.[1]);
    const margin = Number(market.variantName.match(/\(([12])UP\)/i)?.[1]);
    const teamIndex = teamNumber - 1;
    const yesProbability = winOrLeadProbability(prediction, teamIndex, margin);
    const probability = pick.selection === "SI" ? yesProbability : pick.selection === "NO" ? 1 - yesProbability : null;
    const coherent = [1, 2].includes(teamNumber) && [1, 2].includes(margin) && Number.isFinite(probability) && probability > 0
      && (pick.selection === "NO" || prediction.verdict.outcome === String(teamNumber));
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Pronostico ${prediction.verdict.outcome} · vittoria o vantaggio di ${margin} gol`
    };
  }
  if (["DRAW NO BET", "GOAL/NOGOAL", "CASA: SEGNA GOAL", "OSPITE: SEGNA GOAL"].includes(market.marketName)) {
    const comparison = (prediction.marketComparison || []).find(row => String(row.providerSelectionId) === String(selection.providerSelectionId));
    const coherent = Boolean(comparison?.scenarioCompatible) && Number.isFinite(Number(comparison?.modelProbabilityPct));
    return {
      coherent,
      modelProbabilityPct: coherent ? round(Number(comparison.modelProbabilityPct), 2) : null,
      evidenceLabel: coherent ? `Scenario ${prediction.scoreForecast?.primary?.score || "N/D"} · probabilità modello ${String(round(Number(comparison.modelProbabilityPct), 1)).replace(".", ",")}%` : "Scenario non coerente"
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
  if (["ASSIST (DUO) INC TS", "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS"].includes(market.marketName)) {
    const context = playerContext(pick);
    const totals = context?.player?.previousSeason?.totals;
    const minutes = Number(totals?.minutes);
    const goalsPer90 = Number(totals?.per90?.goals);
    const assistsPer90 = Number(totals?.per90?.assists);
    const venueStats = context?.team?.teamStats?.homeAway?.[context?.venue];
    const historicalTeamRate = Number(venueStats?.goalsFor) / Number(venueStats?.played);
    const expectedTeamGoals = Number(context && (context.teamPosition === 0 ? prediction.expectedGoals?.home : prediction.expectedGoals?.away));
    const matchupFactor = clamp(expectedTeamGoals / historicalTeamRate, 0.65, 1.5);
    const assistLambda = regularizedRate(assistsPer90, minutes, 0.18) * matchupFactor;
    const goalLambda = regularizedRate(goalsPer90, minutes, 0.25) * matchupFactor;
    const isGoalOrAssist = market.marketName === "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS";
    const lambda = assistLambda + (isGoalOrAssist ? goalLambda : 0);
    const probability = 1 - Math.exp(-lambda);
    const coherent = pick.selection === "SI" && context && score[context.teamPosition] > 0
      && Number.isFinite(minutes) && minutes >= 700 && Number.isFinite(assistsPer90)
      && (!isGoalOrAssist || Number.isFinite(goalsPer90)) && Number.isFinite(probability);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Titolare previsto · ${String(round(goalsPer90, 2)).replace(".", ",")} gol/90 · ${String(round(assistsPer90, 2)).replace(".", ",")} assist/90 · λ ${String(round(lambda, 2)).replace(".", ",")}`
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
  if (/^U\/O CORNER(?: SQUADRA X)?$/.test(market.marketName)) {
    const teamMatch = market.variantName.match(/SQUADRA ([12])/);
    const metric = teamMatch ? prediction.teamProjections?.[Number(teamMatch[1]) - 1]?.corners : prediction.matchProjection?.corners;
    const threshold = Number(market.threshold ?? market.variantName.match(/U\/O ([0-9]+(?:\.[0-9]+)?)/)?.[1]);
    const central = Number(metric?.central);
    const probability = overUnderProbability(metric, threshold, pick.selection);
    const coherent = Number.isFinite(probability) && probability > 0 && Number.isFinite(central)
      && (pick.selection === "OVER" ? central > threshold : pick.selection === "UNDER" && central < threshold);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Corner centrali ${String(central).replace(".", ",")} · deviazione ${String(round(Number(metric?.sd), 2)).replace(".", ",")}`
    };
  }
  if (market.marketName === "U/O PARATE SQUADRA X") {
    const teamNumber = Number(market.variantName.match(/SQUADRA ([12])/i)?.[1]);
    const threshold = Number(market.variantName.match(/U\/O ([0-9]+(?:\.[0-9]+)?)/)?.[1]);
    const opponentIndex = teamNumber === 1 ? 1 : 0;
    const opponentShotsOnTarget = Number(prediction.teamProjections?.[opponentIndex]?.shotsOnTarget?.central);
    const opponentGoals = Number(opponentIndex === 0 ? prediction.expectedGoals?.home : prediction.expectedGoals?.away);
    const lambda = Math.max(0.25, opponentShotsOnTarget - opponentGoals);
    const probability = pick.selection === "OVER" ? poissonOverProbability(lambda, threshold) : poissonRange(lambda, 0, Math.floor(threshold));
    const coherent = [1, 2].includes(teamNumber) && Number.isFinite(probability) && probability > 0
      && (pick.selection === "OVER" ? lambda > threshold : pick.selection === "UNDER" && lambda < threshold);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Parate attese squadra ${teamNumber} · λ ${String(round(lambda, 2)).replace(".", ",")}`
    };
  }
  if (/^U\/O PUNTI CARTELLINI(?: SQUADRA)?$/.test(market.marketName)) {
    const teamMatch = market.variantName.match(/SQUADRA ([12])/);
    const threshold = Number(market.variantName.match(/U\/O ([0-9]+(?:\.[0-9]+)?)/)?.[1]);
    const lambda = teamMatch
      ? Number(prediction.teamProjections?.[Number(teamMatch[1]) - 1]?.cards?.central)
      : prediction.teamProjections.reduce((sum, team) => sum + Number(team.cards?.central || 0), 0);
    const probability = pick.selection === "OVER" ? poissonOverProbability(lambda, threshold) : poissonRange(lambda, 0, Math.floor(threshold));
    const coherent = Number.isFinite(probability) && probability > 0
      && (pick.selection === "OVER" ? lambda > threshold : pick.selection === "UNDER" && lambda < threshold);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Punti cartellini centrali ${String(round(lambda, 2)).replace(".", ",")} · modello Poisson`
    };
  }
  if (/TIRI TOTALI|TIRI IN PORTA/.test(market.marketName)) {
    const metricKey = /TIRI IN PORTA/.test(market.marketName) ? "shotsOnTarget" : "shotsTotal";
    const teamMatch = market.variantName.match(/^SQUADRA ([12]):/);
    const metric = teamMatch ? prediction.teamProjections?.[Number(teamMatch[1]) - 1]?.[metricKey] : prediction.matchProjection?.[metricKey];
    const threshold = Number(market.threshold);
    const central = Number(metric?.central);
    const probability = overUnderProbability(metric, threshold, pick.selection);
    const coherent = Number.isFinite(probability) && probability > 0 && Number.isFinite(central) && Number.isFinite(threshold)
      && (pick.selection === "OVER" ? central > threshold : pick.selection === "UNDER" && central < threshold);
    return {
      coherent,
      modelProbabilityPct: coherent ? round(probability * 100, 2) : null,
      evidenceLabel: `Volume centrale ${String(central).replace(".", ",")} · deviazione ${String(round(Number(metric?.sd), 2)).replace(".", ",")}`
    };
  }
  throw new Error(`${pick.matchId}: mercato non validabile ${market.marketName}`);
}

function marketFamily(marketName) {
  if (marketName === "VINCE O QUASI (1UP/2UP)") return "Vince o quasi";
  if (/1X2|DOPPIA CHANCE/.test(marketName)) return "Esito";
  if (/MULTIGOAL CASA \+ MULTIGOAL OSPITE/.test(marketName)) return "Multigol casa/ospite";
  if (marketName === "MULTIGOAL") return "Multigol";
  if (marketName === "UNDER/OVER") return "Under/Over";
  if (/^RISULTATO ESATTO MULTI ESITI/.test(marketName)) return "Risultato esatto multiesito";
  if (/^RISULTATO ESATTO 26 ESITI/.test(marketName)) return "Risultato esatto";
  if (marketName === "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS") return "Gol o assist giocatore";
  if (marketName === "ASSIST (DUO) INC TS") return "Assist giocatore";
  if (/MARCATORE/.test(marketName)) return "Marcatori";
  if (/TIRI IN PORTA GIOCATORE/.test(marketName)) return "Tiri in porta giocatore";
  if (/TIRI TOTALI GIOCATORE/.test(marketName)) return "Tiri giocatore";
  if (/CORNER/.test(marketName)) return "Corner";
  if (/PARATE/.test(marketName)) return "Parate squadra";
  if (/CARTELLINI/.test(marketName)) return "Cartellini";
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
  const analysis = pickAnalysis(pick, market, prediction, selection);
  if (!analysis.coherent) throw new Error(`${pick.matchId}: ${pick.label || pick.selection} incoerente con il pronostico o i volumi del modello`);
  const expectedValuePct = Number.isFinite(analysis.modelProbabilityPct)
    ? round((analysis.modelProbabilityPct / 100 * selection.odds - 1) * 100, 1)
    : null;
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
    fairOdds: Number.isFinite(analysis.modelProbabilityPct) && analysis.modelProbabilityPct > 0 ? round(100 / analysis.modelProbabilityPct) : null,
    expectedValuePct,
    reliability: market.marketScope === "player" ? "media" : /RISULTATO ESATTO/.test(market.marketName) ? "sperimentale" : "alta",
    evidenceLabel: analysis.evidenceLabel,
    coherent: analysis.coherent,
    predictedOutcome: prediction.verdict.outcome,
    predictedScore: prediction.scoreForecast?.primary?.score || null,
    providerSelectionId: selection.providerSelectionId
  };
}

const slips = source.slips.map((slip, index) => {
  if (slip.status === "N/D") {
    return {
      id: slip.id,
      type: slip.type || "mixed-markets",
      number: index + 1,
      eyebrow: slip.eyebrow,
      name: slip.name,
      description: slip.description,
      selectionPolicy: slip.selectionPolicy || null,
      marketFamilies: [],
      combinedOdds: null,
      jointModelProbabilityPct: null,
      fairOdds: null,
      expectedValuePct: null,
      qualityStatus: "nd",
      qualityLabel: "N/D",
      excludedLegsCount: 0,
      filterNote: slip.reason || "Dati insufficienti per una proposta prudenziale.",
      weakestLeg: null,
      legs: []
    };
  }
  const resolvedLegs = slip.picks.map(pick => resolvePick(resolveAutomaticMultigoal(pick, slip.selectionPolicy)));
  const filterable = !slip.type || slip.type === "mixed-markets";
  const legs = filterable ? resolvedLegs.filter(leg => leg.expectedValuePct >= -10) : resolvedLegs;
  const excludedLegs = resolvedLegs.filter(leg => !legs.includes(leg));
  if (filterable && legs.length < 3) throw new Error(`${slip.id}: il filtro prudenziale lascia meno di tre selezioni`);
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
  const expectedValuePct = hasJointProbability ? round((jointProbability * combinedOdds - 1) * 100, 1) : null;
  const weakestLeg = legs.filter(leg => Number.isFinite(leg.expectedValuePct)).sort((a, b) => a.expectedValuePct - b.expectedValuePct)[0] || null;
  const qualityStatus = !hasJointProbability ? "nd"
    : expectedValuePct >= 0 && legs.every(leg => leg.expectedValuePct >= -10) ? "qualificata"
      : expectedValuePct >= -40 ? "editoriale" : "laboratorio";
  return {
    id: slip.id,
    type: slip.type || "mixed-markets",
    number: index + 1,
    eyebrow: slip.eyebrow,
    name: slip.name,
    description: slip.description,
    selectionPolicy: slip.selectionPolicy || null,
    marketFamilies: families,
    combinedOdds: round(combinedOdds),
    jointModelProbabilityPct: hasJointProbability ? round(jointProbability * 100, 6) : null,
    fairOdds: hasJointProbability ? round(1 / jointProbability) : null,
    expectedValuePct,
    qualityStatus,
    qualityLabel: qualityStatus === "qualificata" ? "Supera il filtro prudenziale" : qualityStatus === "editoriale" ? "Lettura editoriale" : qualityStatus === "laboratorio" ? "Laboratorio ad alto rischio" : "N/D",
    excludedLegsCount: excludedLegs.length,
    filterNote: excludedLegs.length ? `${excludedLegs.length} ${excludedLegs.length === 1 ? "gamba esclusa" : "gambe escluse"} perché sotto −10% di EV individuale.` : null,
    weakestLeg: weakestLeg ? { fixture: weakestLeg.fixture, label: weakestLeg.label, expectedValuePct: weakestLeg.expectedValuePct } : null,
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
  methodology: "Le probabilità sono indipendenti dalle quote Sisal. Esiti, Under/Over gol, Multigol e risultati esatti derivano dal modello Poisson sugli xG; Vince o quasi considera anche i possibili ordini dei gol e il raggiungimento del vantaggio richiesto. Corner, tiri totali e tiri in porta di squadra usano media e deviazione dei volumi previsti; parate e punti cartellini usano una distribuzione Poisson sui rispettivi valori centrali. Per marcatori, gol o assist, assist, tiri e tiri in porta giocatore il motore usa soltanto titolari previsti con almeno 700 minuti: regolarizza la frequenza storica per 90 minuti con un prior prudente e la adatta agli xG o ai volumi di squadra previsti. Le probabilità delle gambe, appartenenti a partite diverse, vengono moltiplicate; quota equa = 1/probabilità ed EV = probabilità × quota Sisal − 1. Una schedina è qualificata soltanto con EV non negativo e nessuna gamba sotto −10% di EV individuale; le altre restano letture editoriali o di laboratorio. Nessuna quota entra nel pronostico.",
  slips
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Schedina MD${matchdayCode}: ${slips.length} proposte, ${slips.reduce((sum, slip) => sum + slip.legs.length, 0)} selezioni validate.`);
