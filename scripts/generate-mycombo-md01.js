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

const targets = { Safe: 5, Balanced: 10, Aggressive: 20 };
const tierLimits = {
  Safe: { minimum: 3, maximum: 6 },
  Balanced: { minimum: 4, maximum: 7 },
  Aggressive: { minimum: 5, maximum: 8 }
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

function scoreMarketCandidate(market, selection, prediction, match) {
  const [homeGoals, awayGoals] = prediction.scoreForecast.primary.score.split("-").map(Number);
  const total = homeGoals + awayGoals;
  const outcome = homeGoals > awayGoals ? "1" : homeGoals < awayGoals ? "2" : "X";
  const compact = String(selection.name).replace(/\s+/g, "").toUpperCase();
  if (compact.split("+").includes("12")) return null;
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
    overlapKey: "model-score-scenario",
    label: `${market.variantName} · ${selection.name}`.replace(/SQUADRA 1/g, home).replace(/SQUADRA 2/g, away),
    odds: selection.odds,
    quality: 125 + selection.odds * 5,
    anchor: true
  };
}

function candidatePool(event, prediction, match) {
  const marketIndex = new Map();
  for (const market of event.markets || []) for (const selection of market.selections || []) marketIndex.set(String(selection.providerSelectionId), { market, selection });
  const candidates = [];
  for (const row of prediction.marketComparison || []) {
    if (row.selection === "12") continue;
    if (!row.scenarioCompatible || row.modelProbabilityPct < 45 || row.odds < 1.1 || row.odds >= 1.8) continue;
    if (!["1x2", "double-chance", "goals", "btts", "team-goal"].includes(row.family)) continue;
    const resolved = marketIndex.get(String(row.providerSelectionId));
    if (!resolved) continue;
    candidates.push({
      providerSelectionId: String(row.providerSelectionId),
      overlapKey: `model-${row.family}`,
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
      if (selection.status !== "open" || selection.odds < 1.1 || selection.odds >= 1.8 || !["OVER", "UNDER"].includes(selection.name)) continue;
      const coherent = selection.name === "OVER" ? projection.central >= threshold + metricMargin : projection.central <= threshold - metricMargin;
      if (!coherent) continue;
      candidates.push({
        providerSelectionId: String(selection.providerSelectionId),
        overlapKey: `${side}-${metric}`,
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
      if (selection.status !== "open" || selection.odds < 1.1 || selection.odds >= 1.8) continue;
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
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "SI" && item.odds >= 1.1 && item.odds < 1.8);
    if (!selection) continue;
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: `both-teams-${isShots ? "shots-on-target" : "corners"}`,
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
      if (selection.status !== "open" || selection.odds < 1.1 || selection.odds >= 1.8) continue;
      let coherent = false;
      let overlapKey = clean(market.marketName);
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
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "SI" && item.odds >= 1.1 && item.odds < 1.8);
    if (!selection) continue;
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: "player-special-event",
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
    const selection = (market.selections || []).find(item => item.status === "open" && item.name === "OVER" && item.odds >= 1.1 && item.odds < 1.8);
    if (!selection) continue;
    const player = market.variantName.split(/ U\/O /i)[0].trim();
    candidates.push({
      providerSelectionId: String(selection.providerSelectionId),
      overlapKey: `player-${clean(player)}-${kind.key}`,
      label: `${player} almeno ${Math.floor(threshold) + 1} ${kind.metric}${kind.substituteIncluded ? ", sostituto incluso" : ""}`,
      odds: selection.odds,
      quality: 95 + selection.odds * 5,
      anchor: false
    });
  }

  return [...new Map(candidates.map(candidate => [candidate.providerSelectionId, candidate])).values()]
    .filter(candidate => candidate.modelSupported && candidate.quality >= 105)
    .sort((left, right) => right.quality - left.quality || right.odds - left.odds);
}

function selectPortfolio(pool, usedIds, tier, matchId) {
  const target = targets[tier];
  const limits = tierLimits[tier];
  const tierRank = { Safe: 0, Balanced: 1, Aggressive: 2 };
  const available = pool.filter(candidate => !usedIds.has(candidate.providerSelectionId) && tierRank[tier] >= tierRank[candidate.minimumTier || "Safe"]).slice(0, 120);
  let beam = [{ product: 1, legs: [], keys: new Set(), anchor: false, quality: 0 }];
  for (let depth = 0; depth < limits.maximum; depth += 1) {
    const expanded = [...beam];
    for (const state of beam) {
      for (const candidate of available) {
        if (state.keys.has(candidate.overlapKey) || state.legs.some(leg => leg.providerSelectionId === candidate.providerSelectionId)) continue;
        const product = state.product * candidate.odds;
        if (product > target * 1.2) continue;
        expanded.push({
          product,
          legs: [...state.legs, candidate],
          keys: new Set([...state.keys, candidate.overlapKey]),
          anchor: state.anchor || candidate.anchor,
          quality: state.quality + candidate.quality
        });
      }
    }
    const buckets = new Map();
    for (const state of expanded) {
      const key = `${state.legs.length}:${Math.round(Math.log(state.product) * 35)}:${state.anchor ? 1 : 0}`;
      const score = Math.abs(Math.log(state.product / target)) * 1000 - state.quality / Math.max(1, state.legs.length);
      if (!buckets.has(key) || score < buckets.get(key).score) buckets.set(key, { state, score });
    }
    beam = [...buckets.values()].sort((a, b) => a.score - b.score).slice(0, 500).map(item => item.state);
  }
  const eligible = beam.filter(state => state.anchor
    && state.legs.length >= limits.minimum
    && state.legs.length <= limits.maximum
    && Math.abs(state.product - target) / target <= 0.2);
  eligible.sort((left, right) => {
    const distance = Math.abs(left.product - target) - Math.abs(right.product - target);
    return distance || right.quality - left.quality || left.legs.length - right.legs.length;
  });
  if (!eligible[0]) return null;
  eligible[0].legs.forEach(leg => usedIds.add(leg.providerSelectionId));
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
    minLegOddsInclusive: 1.1,
    maxLegOddsExclusive: 1.8,
    targets,
    tierLimits,
    targetTolerancePct: 20,
    overlapPolicy: "Una sola gamba per overlapKey nella stessa MyCombo; vietate soglie annidate, esiti equivalenti e selezione 12, anche dentro le combo. Ogni portafoglio contiene almeno una selezione verificata contro il risultato principale del modello."
  },
  matches: {}
};

for (const event of odds.events) {
  const prediction = predictionById.get(event.canonicalMatchId);
  const match = matchById.get(event.canonicalMatchId);
  if (!prediction || !match || match.matchday !== matchday) continue;
  const pool = candidatePool(event, prediction, match);
  console.log(`${event.canonicalMatchId}: ${pool.length} candidati modellati · ${pool.filter(candidate => candidate.anchor).length} ancore · ${new Set(pool.map(candidate => candidate.overlapKey)).size} gruppi`);
  const usedIds = new Set();
  const planned = new Map(["Aggressive", "Balanced", "Safe"].map(tier => {
    const portfolio = selectPortfolio(pool, usedIds, tier, event.canonicalMatchId);
    if (!portfolio) return [tier, {
      tier,
      status: "N/D",
      reason: `Nessuna combinazione raggiunge il target ${targets[tier]} rispettando qualita, unicita e limite di ${tierLimits[tier].maximum} gambe.`,
      legs: []
    }];
    return [tier, {
      tier,
      logic: `Profilo ${tier.toLowerCase()} costruito sulle quote Sisal del ${output.updatedAt}: almeno una gamba segue il risultato principale ${prediction.scoreForecast.primary.score} (${prediction.verdict.outcome}); le altre seguono i volumi centrali o i titolari proiettati senza introdurre un esito opposto.`,
      legs: portfolio.legs.map(({ providerSelectionId, overlapKey, label }) => ({ providerSelectionId, overlapKey, label }))
    }];
}));
  output.matches[event.canonicalMatchId] = ["Safe", "Balanced", "Aggressive"].map(tier => planned.get(tier));
}

if (Object.keys(output.matches).length !== 10) throw new Error(`Copertura MyCombo incompleta: ${Object.keys(output.matches).length}/10`);
const outputFilename = `mycombo-serie-a-2026-27-md-${String(matchday).padStart(2, "0")}.json`;
fs.writeFileSync(path.join(root, "data/sources", outputFilename), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK MyCombo giornata ${matchday}: ${Object.keys(output.matches).length} partite · 30 portafogli · snapshot ${output.updatedAt}`);
