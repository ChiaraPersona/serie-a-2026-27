"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictionData = read("data/normalized/predictions.json");
const matches = read("data/normalized/matches.json");
const teams = read("data/teams/index.json").teams;
const requestedMatchdayIndex = process.argv.indexOf("--matchday");
const matchday = requestedMatchdayIndex >= 0 ? Number(process.argv[requestedMatchdayIndex + 1]) : 1;
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) throw new Error("--matchday deve essere compreso tra 1 e 38.");

const referenceOdds = { Safe: 5, Balanced: 10, Aggressive: 20 };
const minimumLegOdds = 1.1;
const maximumLegOdds = 1.85;
const tierLimits = {
  Safe: { minimum: 3, maximum: 6, preferred: 3 },
  Balanced: { minimum: 4, maximum: 7, preferred: 4 },
  Aggressive: { minimum: 5, maximum: 8, preferred: 5 }
};
const teamById = new Map(teams.map(team => [team.id, team]));
const matchById = new Map(matches.map(match => [match.id, match]));
const predictionById = new Map(predictionData.predictions.map(prediction => [prediction.matchId, prediction]));
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const round = value => Math.round(value * 100) / 100;

function selectedPlayer(variantName, match) {
  const variant = clean(variantName);
  if (!variant) return false;
  const projected = [match.homeTeam, match.awayTeam].flatMap(teamId => teamById.get(teamId)?.probableLineup?.players || []);
  return projected.some(player => {
    const tokens = clean(player.name || player).split(" ").filter(Boolean);
    if (tokens.length < 2) return false;
    const surname = tokens.at(-1);
    const first = tokens[0];
    return variant.includes(surname) && (variant.includes(first) || variant.includes(`${surname} ${first[0]}`));
  });
}

function commonLabel(row, match) {
  const home = teamById.get(match.homeTeam)?.name || match.homeTeam;
  const away = teamById.get(match.awayTeam)?.name || match.awayTeam;
  if (row.family === "1x2") return row.selection === "1" ? `${home} vincente` : row.selection === "2" ? `${away} vincente` : "Pareggio";
  if (row.family === "double-chance") return row.selection === "1X" ? `${home} o pareggio (1X)` : row.selection === "X2" ? `${away} o pareggio (X2)` : "Nessun pareggio (12)";
  if (row.family === "draw-no-bet") return `${row.selection === "1" ? home : away} Draw No Bet`;
  if (row.family === "goals") return `${row.selection === "OVER" ? "Over" : "Under"} ${row.market.match(/[0-9.]+/)?.[0] || ""} gol`.replace(".5", ",5");
  if (row.family === "btts") return row.selection === "GOAL" ? "Entrambe le squadre segnano" : "Almeno una squadra non segna";
  if (row.family === "team-goal") {
    const teamName = row.market.startsWith("Casa") ? home : away;
    return row.selection === "SI" ? `${teamName} segna almeno un gol` : `${teamName} non segna`;
  }
  return `${row.market}: ${row.selection}`;
}

function projectedMetric(prediction, market) {
  const metric = market.marketName.includes("TIRI IN PORTA") ? "shotsOnTarget"
    : market.marketName.includes("TIRI TOTALI") ? "shotsTotal"
      : market.marketName.includes("CORNER") ? "corners" : null;
  if (!metric) return null;
  const side = /SQUADRA 1\b/.test(market.variantName) ? 0 : /SQUADRA 2\b/.test(market.variantName) ? 1 : null;
  return side == null ? prediction.matchProjection?.[metric] : prediction.teamProjections?.[side]?.[metric];
}

function volumeLabel(market, selection, match) {
  const home = teamById.get(match.homeTeam)?.name || match.homeTeam;
  const away = teamById.get(match.awayTeam)?.name || match.awayTeam;
  const team = /SQUADRA 1\b/.test(market.variantName) ? home : /SQUADRA 2\b/.test(market.variantName) ? away : null;
  const direction = selection.name === "OVER" ? "almeno" : "meno di";
  const minimum = selection.name === "OVER" ? Math.floor(Number(market.threshold)) + 1 : Number(market.threshold) + 0.5;
  const value = String(minimum).replace(".5", ",5");
  const metric = market.marketName.includes("TIRI IN PORTA") ? "tiri in porta" : market.marketName.includes("TIRI TOTALI") ? "tiri totali" : "corner";
  return `${team ? `${team} ` : "Partita "}${direction} ${value} ${metric}`;
}

function riskyHomeUnderAgainstPromoted(market, selection, prediction, match) {
  const awayPromoted = Boolean(teamById.get(match.awayTeam)?.previousSeason?.promoted);
  const homeFavorite = prediction.probabilities.final["1"] > Math.max(prediction.probabilities.final.X, prediction.probabilities.final["2"]);
  if (!awayPromoted || !homeFavorite || !String(selection.name).toUpperCase().includes("UNDER")) return false;
  const thresholds = [...String(market.variantName || "").matchAll(/U\/O\s+(\d+(?:\.\d+)?)\s+(?:TEAM|SQUADRA)\s+1/gi)].map(item => Number(item[1]));
  if (!thresholds.some(threshold => threshold <= 1.5)) return false;
  if (market.marketName === "COMBO: U/O CASA + U/O OSPITE") return String(selection.name).toUpperCase().split("+")[0] === "UNDER";
  return /SQUADRA 1\b|TEAM 1\b/i.test(market.variantName);
}

function preferredDoubleChance(prediction) {
  const probabilities = prediction.probabilities.final;
  return [["1X", probabilities["1"] + probabilities.X], ["X2", probabilities.X + probabilities["2"]], ["12", probabilities["1"] + probabilities["2"]]]
    .sort((left, right) => right[1] - left[1])[0][0];
}

function scoreMarketCandidate(market, selection, prediction, match) {
  const [homeGoals, awayGoals] = prediction.scoreForecast.primary.score.split("-").map(Number);
  const total = homeGoals + awayGoals;
  const outcome = homeGoals > awayGoals ? "1" : homeGoals < awayGoals ? "2" : "X";
  const compact = String(selection.name).replace(/\s+/g, "").toUpperCase();
  if (market.marketName.startsWith("COMBO: DC +") && compact.split("+")[0] !== preferredDoubleChance(prediction)) return null;
  let compatible = false;
  if (market.marketName === "MULTIGOAL") {
    const range = compact.match(/^(\d+)-(\d+)$/);
    compatible = Boolean(range && total >= Number(range[1]) && total <= Number(range[2]));
  } else if (market.marketName === "MULTIGOAL SQUADRA X") {
    const range = compact.match(/^(\d+)-(\d+)$/);
    const goals = /SQUADRA 1\b/.test(market.variantName) ? homeGoals : awayGoals;
    compatible = Boolean(range && goals >= Number(range[1]) && goals <= Number(range[2]));
  } else if (market.marketName === "U/O SQUADRA X") {
    const goals = /SQUADRA 1\b/.test(market.variantName) ? homeGoals : awayGoals;
    const threshold = Number(market.threshold);
    compatible = selection.name === "OVER" ? goals > threshold : selection.name === "UNDER" ? goals < threshold : false;
  } else if (["COMBO: DC + U/O", "COMBO: 1X2 + U/O"].includes(market.marketName)) {
    const [resultPart, goalsPart] = compact.split("+");
    const threshold = Number(market.threshold);
    const resultOk = resultPart === outcome || resultPart?.includes(outcome);
    const goalsOk = goalsPart === "OVER" ? total > threshold : goalsPart === "UNDER" ? total < threshold : false;
    compatible = resultOk && goalsOk;
  } else if (market.marketName === "COMBO: DC + GOAL/NOGOAL") {
    const [resultPart, goalsPart] = compact.split("+");
    const resultOk = resultPart?.includes(outcome);
    const btts = homeGoals > 0 && awayGoals > 0;
    compatible = resultOk && (goalsPart === "GOAL" ? btts : goalsPart === "NOGOAL" ? !btts : false);
  } else if (market.marketName === "COMBO: U/O CASA + U/O OSPITE") {
    const thresholds = [...market.variantName.matchAll(/U\/O\s+(\d+(?:\.\d+)?)/gi)].map(match => Number(match[1]));
    const parts = compact.split("+");
    compatible = thresholds.length === 2 && parts.length === 2 && [homeGoals, awayGoals].every((goals, index) => parts[index] === "OVER" ? goals > thresholds[index] : parts[index] === "UNDER" ? goals < thresholds[index] : false);
  }
  if (!compatible) return null;
  const home = teamById.get(match.homeTeam)?.name || match.homeTeam;
  const away = teamById.get(match.awayTeam)?.name || match.awayTeam;
  return {
    providerSelectionId: String(selection.providerSelectionId),
    overlapKey: `market-${clean(market.marketName)}`,
    label: `${market.variantName} · ${selection.name}`.replace(/SQUADRA 1|TEAM 1/g, home).replace(/SQUADRA 2|TEAM 2/g, away),
    odds: selection.odds,
    quality: 125 + selection.odds * 5,
    anchor: true
  };
}

function candidatePool(event, prediction, match) {
  const marketIndex = new Map();
  for (const market of event.markets || []) for (const selection of market.selections || []) marketIndex.set(String(selection.providerSelectionId), { market, selection });
  const candidates = [];
  const bestDoubleChanceProbability = Math.max(0, ...(prediction.marketComparison || []).filter(row => row.family === "double-chance" && row.scenarioCompatible).map(row => row.modelProbabilityPct));
  for (const row of prediction.marketComparison || []) {
    if (!row.scenarioCompatible || row.modelProbabilityPct < 45) continue;
    if (row.family === "double-chance" && row.modelProbabilityPct < bestDoubleChanceProbability) continue;
    if (!["1x2", "double-chance", "goals", "btts", "team-goal"].includes(row.family)) continue;
    const resolved = marketIndex.get(String(row.providerSelectionId));
    if (!resolved) continue;
    if (riskyHomeUnderAgainstPromoted(resolved.market, resolved.selection, prediction, match)) continue;
    candidates.push({
      providerSelectionId: String(row.providerSelectionId),
      overlapKey: `market-${clean(resolved.market.marketName)}`,
      label: commonLabel(row, match),
      odds: row.odds,
      quality: 130 + row.modelProbabilityPct,
      anchor: true,
      modelSupported: true
    });
  }

  const supportedVolumes = new Set(["U/O TIRI TOTALI", "U/O TIRI IN PORTA", "U/O CORNER", "U/O TIRI TOTALI SQUADRA X", "U/O TIRI IN PORTA SQUADRA X", "U/O CORNER SQUADRA X"]);
  for (const market of event.markets || []) {
    const projection = projectedMetric(prediction, market);
    if (!supportedVolumes.has(market.marketName) || !projection || !Number.isFinite(Number(market.threshold))) continue;
    const threshold = Number(market.threshold);
    const metricMargin = market.marketName.includes("TIRI TOTALI") ? 1.8 : 0.8;
    const side = /SQUADRA 1\b/.test(market.variantName) ? "home" : /SQUADRA 2\b/.test(market.variantName) ? "away" : "match";
    const metric = market.marketName.includes("TIRI IN PORTA") ? "shots-on-target" : market.marketName.includes("TIRI TOTALI") ? "shots-total" : "corners";
    for (const selection of market.selections || []) {
      if (selection.status !== "open" || !["OVER", "UNDER"].includes(selection.name)) continue;
      if (riskyHomeUnderAgainstPromoted(market, selection, prediction, match)) continue;
      const coherent = selection.name === "OVER" ? projection.central >= threshold + metricMargin : projection.central <= threshold - metricMargin;
      if (!coherent) continue;
      candidates.push({
        providerSelectionId: String(selection.providerSelectionId),
        overlapKey: `market-${clean(market.marketName)}`,
        label: volumeLabel(market, selection, match),
        odds: selection.odds,
        quality: 105 + Math.min(20, Math.abs(projection.central - threshold) * 3),
        anchor: false,
        modelSupported: true
      });
    }
  }

  for (const market of event.markets || []) {
    for (const selection of market.selections || []) {
      if (selection.status !== "open") continue;
      if (riskyHomeUnderAgainstPromoted(market, selection, prediction, match)) continue;
      const candidate = scoreMarketCandidate(market, selection, prediction, match);
      if (candidate) candidates.push({ ...candidate, modelSupported: true });
    }
  }

  for (const market of event.markets || []) {
    const isShots = market.marketName === "ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA";
    const isCorners = market.marketName === "ENTRAMBE ALMENO X CORNER";
    if (!isShots && !isCorners) continue;
    const threshold = Number(market.variantName.match(/ALMENO\s+(\d+(?:\.\d+)?)/i)?.[1]);
    const metric = isShots ? "shotsOnTarget" : "corners";
    if (!Number.isFinite(threshold) || prediction.teamProjections.some(team => team?.[metric]?.central < threshold + 0.4)) continue;
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "SI");
    if (!selection) continue;
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: `market-${clean(market.marketName)}`,
      label: `Entrambe almeno ${threshold} ${isShots ? "tiri in porta" : "corner"}`,
      odds: selection.odds,
      quality: 108 + selection.odds * 4,
      anchor: false,
      modelSupported: true
    });
  }

  for (const market of event.markets || []) {
    const homeCorners = prediction.teamProjections?.[0]?.corners?.central;
    const awayCorners = prediction.teamProjections?.[1]?.corners?.central;
    if (!Number.isFinite(homeCorners) || !Number.isFinite(awayCorners)) continue;
    const higherSide = homeCorners >= awayCorners ? "TEAM 1" : "TEAM 2";
    const supported = new Set(["PRIMA A X CORNER", "1X2 CORNER", "1 TEMPO: 1X2 CORNER", "SQUADRA X ALMENO Y CORNER IN ENTRAMBI I TEMPI", "ALMENO X CORNER IN ENTRAMBI I TEMPI", "ENTRAMBE ALMENO X CORNER IN ENTRAMBI I TEMPI"]);
    if (!supported.has(market.marketName)) continue;
    for (const selection of market.selections || []) {
      if (selection.status !== "open") continue;
      let coherent = false;
      let overlapKey = `market-${clean(market.marketName)}`;
      if (["PRIMA A X CORNER", "1X2 CORNER", "1 TEMPO: 1X2 CORNER"].includes(market.marketName)) {
        const side = selection.name === "1" ? "TEAM 1" : selection.name === "2" ? "TEAM 2" : selection.name;
        coherent = Math.abs(homeCorners - awayCorners) >= 0.5 && side === higherSide;
      } else {
        const threshold = Number(market.variantName.match(/ALMENO\s+(\d+)/i)?.[1]);
        if (!Number.isFinite(threshold) || selection.name !== "SI") continue;
        if (market.marketName === "SQUADRA X ALMENO Y CORNER IN ENTRAMBI I TEMPI") {
          const central = /SQUADRA 1\b/.test(market.variantName) ? homeCorners : awayCorners;
          coherent = central >= threshold * 2 + 0.5;
        } else if (market.marketName === "ENTRAMBE ALMENO X CORNER IN ENTRAMBI I TEMPI") {
          coherent = Math.min(homeCorners, awayCorners) >= threshold * 2 + 0.5;
        } else coherent = homeCorners + awayCorners >= threshold * 2 + 1;
      }
      if (!coherent) continue;
      candidates.push({
        providerSelectionId: String(selection.providerSelectionId),
        overlapKey,
        label: `${market.variantName} · ${selection.name}`.replace(/TEAM 1|SQUADRA 1/g, teamById.get(match.homeTeam)?.name || match.homeTeam).replace(/TEAM 2|SQUADRA 2/g, teamById.get(match.awayTeam)?.name || match.awayTeam),
        odds: selection.odds,
        quality: 102 + selection.odds * 4,
        anchor: false
      });
    }
  }

  for (const market of event.markets || []) {
    if (!["X o Y GOL O PALO (DUO) INC TS", "GIOCATORE SEGNA O ASSIST O CARTELLINO INC TS"].includes(market.marketName) || !selectedPlayer(market.variantName, match)) continue;
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "SI");
    if (!selection) continue;
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: `market-${clean(market.marketName)}`,
      label: `${market.variantName} · sì`,
      odds: selection.odds,
      quality: 82 + selection.odds * 4,
      anchor: false,
      minimumTier: "Aggressive"
    });
  }

  const playerMarkets = new Map([
    ["U/O TIRI TOTALI GIOCATORE (DUO) INC TS", { metric: "tiri totali", maximum: 3.5, key: "shots-total", substituteIncluded: true }],
    ["U/O  TIRI IN PORTA GIOCATORE (DUO) INC PALI TRAVERSE INC TS", { metric: "tiri in porta", maximum: 1.5, key: "shots-on-target", substituteIncluded: true }],
    ["U/O FALLI COMMESSI GIOCATORE", { metric: "falli commessi", maximum: 1.5, key: "fouls-committed", substituteIncluded: false }],
    ["U/O FALLI SUBITI GIOCATORE", { metric: "falli subiti", maximum: 1.5, key: "fouls-won", substituteIncluded: false }]
  ]);
  for (const market of event.markets || []) {
    const kind = playerMarkets.get(market.marketName);
    const threshold = Number(market.threshold);
    if (!kind || threshold > kind.maximum || !selectedPlayer(market.variantName, match)) continue;
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "OVER");
    if (!selection) continue;
    const player = market.variantName.split(/ U\/O /i)[0].trim();
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: `market-${clean(market.marketName)}`,
      label: `${player} almeno ${Math.floor(threshold) + 1} ${kind.metric}${kind.substituteIncluded ? ", sostituto incluso" : ""}`,
      odds: selection.odds,
      quality: 95 + selection.odds * 5,
      anchor: false
    });
  }

  return [...new Map(candidates.map(candidate => [candidate.providerSelectionId, candidate])).values()]
    .filter(candidate => candidate.odds >= minimumLegOdds && candidate.odds <= maximumLegOdds)
    .sort((left, right) => right.quality - left.quality || right.odds - left.odds);
}

function selectPortfolio(pool, tier) {
  const reference = referenceOdds[tier];
  const limits = tierLimits[tier];
  const available = pool.slice(0, 120);
  let beam = [{ product: 1, legs: [], overlapKeys: new Set(), quality: 0 }];
  for (let depth = 0; depth < limits.maximum; depth += 1) {
    const expanded = [...beam];
    for (const state of beam) {
      for (const candidate of available) {
        if (state.legs.some(leg => leg.providerSelectionId === candidate.providerSelectionId) || state.overlapKeys.has(candidate.overlapKey)) continue;
        const product = state.product * candidate.odds;
        expanded.push({
          product,
          legs: [...state.legs, candidate],
          overlapKeys: new Set([...state.overlapKeys, candidate.overlapKey]),
          quality: state.quality + candidate.quality
        });
      }
    }
    const buckets = new Map();
    for (const state of expanded) {
      const key = `${state.legs.length}:${Math.round(Math.log(state.product) * 60)}`;
      const legDistance = Math.abs(state.legs.length - limits.preferred);
      const referenceDistance = Math.abs(Math.log(state.product / reference));
      const score = referenceDistance * 1000 + legDistance * 10 - state.quality / Math.max(1, state.legs.length) / 100;
      if (!buckets.has(key) || score < buckets.get(key).score) buckets.set(key, { state, score });
    }
    beam = [...buckets.values()].sort((a, b) => a.score - b.score).slice(0, 500).map(item => item.state);
  }
  const eligible = beam.filter(state => state.legs.length >= limits.minimum
    && state.legs.length <= limits.maximum);
  eligible.sort((left, right) => {
    const referenceDistance = Math.abs(Math.log(left.product / reference)) - Math.abs(Math.log(right.product / reference));
    const legDistance = Math.abs(left.legs.length - limits.preferred) - Math.abs(right.legs.length - limits.preferred);
    const quality = right.quality / right.legs.length - left.quality / left.legs.length;
    return referenceDistance || legDistance || quality || left.legs.length - right.legs.length;
  });
  if (!eligible[0]) return null;
  return eligible[0];
}

const targetPredictions = predictionData.predictions.filter(prediction => matchById.get(prediction.matchId)?.matchday === matchday);
if (targetPredictions.length !== 10) throw new Error(`Pronostici giornata ${matchday} incompleti: ${targetPredictions.length}/10.`);
if (targetPredictions.some(prediction => prediction.market?.status !== "available" || String(prediction.market.retrievedAt) !== String(odds.retrievedAt))) {
  throw new Error(`I pronostici della giornata ${matchday} devono essere rigenerati sullo stesso snapshot Sisal prima di creare i portafogli.`);
}

const output = {
  provider: "Sisal",
  oddsSnapshot: "data/normalized/odds/sisal/serie-a.json",
  updatedAt: String(odds.retrievedAt).slice(0, 10),
  constraints: {
    referenceOdds,
    quotaPolicy: "orientativa",
    tierLimits,
    minLegOddsInclusive: minimumLegOdds,
    maxLegOddsInclusive: maximumLegOdds,
    uniqueMarketFamilyWithinPortfolio: true,
    allowCrossTierSelectionReuse: true,
    promotedOpponentCaution: true,
    riskPolicy: "informativa",
    eligibilityPolicy: "validita-tecnica-e-intervalli"
  },
  matches: {}
};

for (const event of odds.events) {
  const prediction = predictionById.get(event.canonicalMatchId);
  const match = matchById.get(event.canonicalMatchId);
  if (!prediction || !match || match.matchday !== matchday) continue;
  const pool = candidatePool(event, prediction, match);
  console.log(`${event.canonicalMatchId}: ${pool.length} candidati modellati · ${pool.filter(candidate => candidate.anchor).length} ancore · ${new Set(pool.map(candidate => candidate.overlapKey)).size} gruppi`);
  const planned = new Map(["Aggressive", "Balanced", "Safe"].map(tier => {
    const portfolio = selectPortfolio(pool, tier);
    if (!portfolio) return [tier, {
      tier,
      status: "N/D",
      reason: `Candidati insufficienti per il profilo ${tier}: servono almeno ${tierLimits[tier].minimum} mercati distinti con quota tra ${minimumLegOdds.toFixed(2)} e ${maximumLegOdds.toFixed(2)}.`,
      legs: []
    }];
    return [tier, {
      tier,
      logic: `Profilo ${tier.toLowerCase()} costruito sulle quote Sisal del ${output.updatedAt}: quota ${referenceOdds[tier]} orientativa, ${tierLimits[tier].minimum}-${tierLimits[tier].maximum} gambe, mercati distinti e quote singole ${minimumLegOdds.toFixed(2)}-${maximumLegOdds.toFixed(2)}. Il rischio resta informativo.`,
      legs: portfolio.legs.map(({ providerSelectionId, overlapKey, label }) => ({ providerSelectionId, overlapKey, label }))
    }];
}));
  output.matches[event.canonicalMatchId] = ["Safe", "Balanced", "Aggressive"].map(tier => planned.get(tier));
}

if (Object.keys(output.matches).length !== 10) throw new Error(`Copertura MyCombo incompleta: ${Object.keys(output.matches).length}/10`);
const outputFilename = `mycombo-serie-a-2026-27-md-${String(matchday).padStart(2, "0")}.json`;
fs.writeFileSync(path.join(root, "data/sources", outputFilename), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK MyCombo giornata ${matchday}: ${Object.keys(output.matches).length} partite · 30 portafogli · snapshot ${output.updatedAt}`);
