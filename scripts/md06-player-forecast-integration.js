"use strict";

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const stabilityRank = value => ({ low: 1, medium: 2, high: 3 }[String(value || "").toLowerCase()] || 0);
const reliabilityLabel = value => ({ high: "Alta", medium: "Media", low: "Bassa" }[String(value || "").toLowerCase()] || "Non valutabile");
const playerKey = player => String(player?.playerId || player?.name || "");

function chooseShotsThreshold(player) {
  const probabilities = player?.shotProbabilities || {};
  if (finite(probabilities.over25) && Number(probabilities.over25) >= 0.4) return { count: 3, probability: Number(probabilities.over25), probabilityKey: "over25" };
  if (finite(probabilities.over15) && Number(probabilities.over15) >= 0.42) return { count: 2, probability: Number(probabilities.over15), probabilityKey: "over15" };
  if (finite(probabilities.over05) && Number(probabilities.over05) >= 0.58) return { count: 1, probability: Number(probabilities.over05), probabilityKey: "over05" };
  return null;
}

function chooseSotThreshold(player) {
  const probabilities = player?.shotOnTargetProbabilities || {};
  if (finite(probabilities.over15) && Number(probabilities.over15) >= 0.28) return { count: 2, probability: Number(probabilities.over15), probabilityKey: "over15" };
  if (finite(probabilities.over05) && Number(probabilities.over05) >= 0.4) return { count: 1, probability: Number(probabilities.over05), probabilityKey: "over05" };
  return null;
}

function candidatePool(shooters) {
  const allPlayers = new Map((shooters?.allPlayers || []).map(player => [playerKey(player), player]));
  const sources = new Map();
  const add = (label, players) => {
    for (const row of players || []) {
      const key = playerKey(row);
      if (!key) continue;
      const current = sources.get(key) || new Set();
      current.add(label);
      sources.set(key, current);
      if (!allPlayers.has(key)) allPlayers.set(key, row);
    }
  };
  add("primary-shots", shooters?.totalShots);
  add("primary-sot", shooters?.shotsOnTarget);
  add("qualified-shots-outsider", (shooters?.outsiders || []).filter(player => player.qualifiedOutsider === true));
  add("qualified-sot-outsider", (shooters?.sotOutsiders || []).filter(player => player.qualifiedSotOutsider === true));
  return [...sources].map(([key, labels]) => ({ player: allPlayers.get(key), sources: [...labels] }));
}

function lineupEligibility(player, matchId, probableLineups, officialLineups) {
  const official = (officialLineups?.fixtures || []).find(fixture => fixture.matchId === matchId);
  if (official) {
    const starter = official.teams.flatMap(team => team.players || []).find(row => row.playerId === player.playerId);
    return { eligible: Boolean(starter), status: starter ? "official-starter" : "official-nonstarter", source: officialLineups.provider || "official", sourceUpdatedAt: officialLineups.retrievedAt || null, playerId: player.playerId, playerName: player.name };
  }
  const probable = (probableLineups?.teams || []).flatMap(team => team.players || []).find(row => row.playerId === player.playerId);
  return {
    eligible: probable?.lineupStatus === "starter",
    status: probable?.lineupStatus === "starter" ? "probable-starter" : probable?.lineupStatus === "reserve" ? "reserve" : "unknown",
    source: probableLineups?.provider || null,
    sourceUpdatedAt: probableLineups?.importedAt || null,
    playerId: player.playerId,
    playerName: player.name,
  };
}

function evaluateCandidate(player, metric, sources, lineup) {
  const expectedMinutes = finite(player?.expectedMinutes) ? Number(player.expectedMinutes) : null;
  const isPrimary = sources.includes(metric === "shots" ? "primary-shots" : "primary-sot");
  const isOutsider = sources.includes(metric === "shots" ? "qualified-shots-outsider" : "qualified-sot-outsider");
  const threshold = metric === "shots" ? chooseShotsThreshold(player) : chooseSotThreshold(player);
  const reasons = [];
  if (!player?.playerId) reasons.push("PLAYER_ID_MISSING");
  if (!lineup.eligible) reasons.push(`LINEUP_${String(lineup.status).toUpperCase().replace(/-/g, "_")}`);
  if (!threshold) reasons.push("MODEL_THRESHOLD_NOT_SUPPORTED");
  if (metric === "shots") {
    const outsiderStrong = isOutsider
      && expectedMinutes >= 70
      && Number(player?.shotProbabilities?.over05) >= 0.55
      && (player.outsiderConfidence === "high" || Number(player.outsiderScore) >= 52);
    const primaryStrong = isPrimary
      && expectedMinutes >= 55
      && (stabilityRank(player?.playerBaselineStability?.level) >= 2 || Number(player?.projectedShots) >= 2);
    if (!primaryStrong && !outsiderStrong) reasons.push("READING_SUPPORT_BELOW_SHOTS_STANDARD");
  } else {
    const outsiderStrong = isOutsider
      && expectedMinutes >= 70
      && Number(player?.shotOnTargetProbabilities?.over05) >= 0.3
      && (player.sotOutsiderConfidence === "high" || Number(player.sotOutsiderScore) >= 44);
    const primaryStrong = isPrimary
      && expectedMinutes >= 60
      && (stabilityRank(player?.playerSotBaselineStability?.level) >= 2 || Number(player?.shotOnTargetProbabilities?.over05) >= 0.55)
      && (Number(player?.shotOnTargetProbabilities?.over15) >= 0.28 || Number(player?.shotOnTargetProbabilities?.over05) >= 0.4);
    if (!primaryStrong && !outsiderStrong) reasons.push("READING_SUPPORT_BELOW_SOT_STANDARD");
  }
  return { eligible: reasons.length === 0, reasons, threshold, expectedMinutes, isPrimary, isOutsider };
}

function buildProviderPlayerMap(predictions, odds) {
  const eventByMatch = new Map((odds?.events || []).map(event => [event.canonicalMatchId, event]));
  const map = new Map();
  for (const prediction of predictions || []) {
    const event = eventByMatch.get(prediction.matchId);
    const marketById = new Map((event?.markets || []).map(market => [String(market.providerMarketId), market]));
    for (const player of prediction.shooters?.allPlayers || []) for (const quote of Object.values(player.markets || {}).filter(Boolean)) {
      const market = marketById.get(String(quote.providerMarketId));
      for (const providerPlayerId of market?.providerPlayerIds || []) {
        const key = `${prediction.matchId}:${providerPlayerId}`;
        const previous = map.get(key);
        if (!previous || previous.playerId === player.playerId) map.set(key, { playerId: player.playerId, playerName: player.name, teamId: player.teamId });
      }
    }
  }
  return map;
}

function isCompatibleIndividualMarket(market, metric) {
  const descriptor = `${market?.marketName || ""} ${market?.variantName || ""}`.toUpperCase();
  if (market?.marketScope !== "player") return false;
  if (/DUO|SOST(?:ITUT)?|ENTRAMBI I TEMPI|NEI 2 TEMPI|PALI|TRAVERSE/.test(descriptor)) return false;
  return metric === "shots"
    ? /TIRI TOTALI/.test(descriptor) && !/TIRI IN PORTA/.test(descriptor)
    : /TIRI IN PORTA/.test(descriptor);
}

function compatibleQuote({ odds, prediction, player, metric, threshold, providerPlayerMap }) {
  const event = (odds?.events || []).find(row => row.canonicalMatchId === prediction.matchId);
  if (!event) return null;
  const bookmakerThreshold = threshold.count - 0.5;
  const candidates = [];
  for (const market of event.markets || []) {
    if (!isCompatibleIndividualMarket(market, metric) || Number(market.threshold) !== bookmakerThreshold || market.status !== "open") continue;
    const identities = [...new Set((market.providerPlayerIds || []).map(id => providerPlayerMap.get(`${prediction.matchId}:${id}`)?.playerId).filter(Boolean))];
    if (identities.length !== 1 || identities[0] !== player.playerId) continue;
    for (const selection of market.selections || []) {
      if (!/^(OVER|SI)$/.test(String(selection.name || "").toUpperCase()) || selection.status !== "open" || !finite(selection.odds) || Number(selection.odds) < 1) continue;
      candidates.push({ event, market, selection });
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}

function playerForecastLeg({ prediction, player, metric, threshold, lineup, quoteRow, odds, sources, fixture }) {
  const probabilityPct = round(threshold.probability * 100, 2);
  const quoted = Boolean(quoteRow);
  const quote = quoted ? Number(quoteRow.selection.odds) : null;
  const expectedValuePct = quoted ? round(threshold.probability * quote * 100 - 100, 2) : null;
  const metricLabel = metric === "shots" ? "tiri" : "SOT";
  const marketFamily = metric === "shots" ? "Tiri totali giocatore" : "Tiri in porta giocatore";
  const selectionId = `forecast:v2:${prediction.matchId}:${player.playerId}:${metric}:${threshold.count}`;
  const reliabilitySource = metric === "shots" ? player.playerBaselineStability : player.playerSotBaselineStability;
  const providerMarketId = quoted ? String(quoteRow.market.providerMarketId) : null;
  const providerSelectionId = quoted ? String(quoteRow.selection.providerSelectionId) : null;
  const quoteSource = quoted ? {
    provider: odds.provider,
    url: odds.sourceUrl,
    snapshotPath: "data/normalized/odds/sisal/serie-a.json",
    rawFile: quoteRow.event.rawFile || odds.rawFile,
    acquisition: odds.acquisition,
  } : null;
  return {
    matchId: prediction.matchId,
    fixture,
    startsAt: quoteRow?.event?.startsAt || null,
    market: metric === "shots" ? "TIRI TOTALI GIOCATORE" : "TIRI IN PORTA GIOCATORE",
    variant: `${player.name} ${threshold.count}+ ${metricLabel}`,
    marketScope: "player",
    marketFamily,
    threshold: threshold.count - 0.5,
    selection: "OVER",
    label: `${player.name} ${threshold.count}+ ${metricLabel}`,
    odds: quote,
    modelProbabilityPct: probabilityPct,
    fairOdds: null,
    expectedValuePct,
    evidenceLabel: `Prediction Engine V2 ${prediction.engineVersion || "N/D"} · lettura strutturata`,
    providerMarketId,
    providerSelectionId,
    marketUpdatedAt: quoteRow?.market?.updatedAt || null,
    compatibility: quoted ? "COMPATIBILE" : "QUOTA_NON_DISPONIBILE",
    evStatus: quoted ? "EV_CALCOLABILE" : "EV_NON_CALCOLABILE",
    overlapKey: `player-forecast:${prediction.matchId}:${player.playerId}:${metric}`,
    semanticKeys: [`prediction-v2-player:${prediction.matchId}:${player.playerId}:${metric}`],
    selectionId,
    playerId: player.playerId,
    playerName: player.name,
    teamId: player.teamId,
    lineupEligibility: lineup,
    catalogOrigin: "prediction-v2-player-forecast",
    betSelection: {
      schemaVersion: 1,
      selectionId,
      identity: {
        status: quoted ? "VERIFIED_PROVIDER_IDS" : "NO_COMPATIBLE_PROVIDER_CONTRACT",
        matchId: prediction.matchId,
        provider: quoted ? odds.provider : null,
        providerMarketId,
        providerSelectionId,
      },
      market: {
        name: metric === "shots" ? "TIRI TOTALI GIOCATORE" : "TIRI IN PORTA GIOCATORE",
        variant: `${player.name} ${threshold.count}+ ${metricLabel}`,
        scope: "player",
        family: marketFamily,
        threshold: threshold.count - 0.5,
        selection: "OVER",
        subject: { type: "player", id: player.playerId, name: player.name, teamId: player.teamId },
        bookmakerSemantics: quoted ? {
          marketName: quoteRow.market.marketName,
          variantName: quoteRow.market.variantName,
          selectionName: quoteRow.selection.name,
          duo: false,
          substituteIncluded: false,
          postsAndCrossbarIncluded: false,
          extraTimeIncluded: false,
          subjectType: "player",
        } : null,
      },
      quote: {
        decimal: quote,
        verifiedAt: quoted ? (quoteRow.event.retrievedAt || odds.retrievedAt) : null,
        marketUpdatedAt: quoteRow?.market?.updatedAt || null,
        availability: quoted ? "AVAILABLE_AT_SNAPSHOT" : "UNAVAILABLE",
        providerStatus: quoted ? quoteRow.selection.status : null,
        source: quoteSource,
      },
      operational: {
        classification: sources.some(source => source.includes("outsider")) ? "OUTSIDER" : "INTERESSANTE",
        classificationReason: "Profilo presente nella lettura V2 strutturata e ammesso dai criteri specifici per metrica.",
        reliability: { level: reliabilityLabel(reliabilitySource?.level), reason: reliabilitySource?.evidence?.join("; ") || "Stabilità V2 non disponibile." },
        playability: quoted ? { status: "PLAYABLE", code: null, reason: null } : { status: "NOT_PLAYABLE", code: "QUOTE_UNAVAILABLE", reason: "Nessun contratto individuale full-match Sisal compatibile nello snapshot." },
      },
      evaluation: {
        modelProbabilityPct: probabilityPct,
        fairOdds: null,
        expectedValuePct,
        status: quoted ? "EV_CALCOLABILE" : "MODELLED_QUOTE_UNAVAILABLE",
        kind: "PREDICTION_ENGINE_V2_PLAYER_THRESHOLD",
        prudentProbabilityPct: null,
        conservativeExpectedValuePct: null,
        probabilitySemantics: "ABSOLUTE_EVENT",
        fairOddsBasis: null,
        expectedValueBasis: quoted ? "CENTRAL_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE" : null,
        provenance: {
          source: `predictions.shooters.allPlayers.${metric === "shots" ? "shotProbabilities" : "shotOnTargetProbabilities"}.${threshold.probabilityKey}`,
          modelVersion: prediction.engineVersion || null,
          playerMarketModelVersion: prediction.playerMarketModelVersion || null,
          predictionGeneratedAt: prediction.generatedAt || null,
          modelTarget: `player:${player.playerId}:${metric}:${threshold.count}+`,
        },
      },
      compatibility: {
        status: quoted ? "COMPATIBILE" : "NO_COMPATIBLE_QUOTE",
        reason: quoted ? "Contratto individuale full-match riconciliato per playerId, metrica e soglia." : "DUO, sostituto incluso, pali/traverse e contratti nei due tempi non sono equivalenti alla previsione individuale V2.",
        modelTarget: `player:${player.playerId}:${metric}:${threshold.count}+`,
        bookmakerTarget: quoted ? `${quoteRow.market.marketName} · ${quoteRow.market.variantName}` : null,
      },
      overlap: { overlapKey: `player-forecast:${prediction.matchId}:${player.playerId}:${metric}`, semanticKeys: [`prediction-v2-player:${prediction.matchId}:${player.playerId}:${metric}`] },
      warnings: quoted ? [] : ["QUOTE_UNAVAILABLE", "DUO_CONTRACTS_EXCLUDED"],
      risks: [],
    },
    forecastEvidence: {
      sources,
      role: player.role || null,
      detailedRole: player.detailedRole || null,
      expectedMinutes: finite(player.expectedMinutes) ? Number(player.expectedMinutes) : null,
      projectedShots: finite(player.projectedShots) ? Number(player.projectedShots) : null,
      projectedShotsOnTarget: finite(player.projectedShotsOnTarget) ? Number(player.projectedShotsOnTarget) : null,
      stability: reliabilitySource?.level || null,
      matchupEvidence: player.matchupEvidence || [],
      outsiderScore: metric === "shots" ? player.outsiderScore : player.sotOutsiderScore,
      outsiderConfidence: metric === "shots" ? player.outsiderConfidence : player.sotOutsiderConfidence,
    },
    suggestionAnalysis: {
      version: 3,
      suggested: true,
      rank: null,
      family: metric,
      familyLabel: metric === "shots" ? "Tiri totali" : "Tiri in porta",
      criteria: "APPROVED_BASELINE_PLUS_STRUCTURED_READING_V2_NO_EV_GATE",
      reasons: [],
      conservativeExpectedValuePct: null,
      canonicalThresholdIdentity: `${metric}:player:${player.playerId}:over`,
      resultThesisIdentity: null,
      rankingMode: "reading-v2-structured",
      rankingTuple: null,
      heuristicDisclosure: "Soglia letta dalle probabilità individuali serializzate dal Prediction Engine V2; nessuna probabilità ricostruita nel selettore.",
      quoteAvailability: quoted ? "AVAILABLE_AT_SNAPSHOT" : "UNAVAILABLE",
      baselineApproved: false,
    },
  };
}

function applyApprovedBaseline(catalogMatches, approvedSuggestionRankById) {
  const approved = approvedSuggestionRankById instanceof Map ? approvedSuggestionRankById : new Map(Object.entries(approvedSuggestionRankById || {}));
  return catalogMatches.map(match => {
    const selected = match.selections.filter(leg => approved.has(leg.selectionId)).sort((left, right) => Number(approved.get(left.selectionId)) - Number(approved.get(right.selectionId)) || String(left.selectionId).localeCompare(String(right.selectionId)));
    const rank = new Map(selected.map((leg, index) => [leg.selectionId, index + 1]));
    const selections = match.selections.map(leg => ({
      ...leg,
      suggestionAnalysis: {
        ...leg.suggestionAnalysis,
        suggested: rank.has(leg.selectionId),
        rank: rank.get(leg.selectionId) || null,
        baselineApproved: rank.has(leg.selectionId),
        reasons: rank.has(leg.selectionId) ? [] : leg.suggestionAnalysis?.reasons || ["NOT_IN_APPROVED_BASELINE"],
      },
    }));
    return { ...match, selections, suggestions: selected.map(leg => leg.selectionId), suggestionSummary: { ...match.suggestionSummary, total: selected.length } };
  });
}

function integratePlayerForecasts({ catalogMatches, predictions, odds, probableLineups, officialLineups, approvedSuggestionRankById }) {
  const baselineMatches = applyApprovedBaseline(catalogMatches, approvedSuggestionRankById);
  const providerPlayerMap = buildProviderPlayerMap(predictions, odds);
  const predictionByMatch = new Map((predictions || []).map(prediction => [prediction.matchId, prediction]));
  const excluded = [];
  const added = [];
  const matches = baselineMatches.map(match => {
    const prediction = predictionByMatch.get(match.matchId);
    if (!prediction?.shooters) return match;
    const fixture = match.selections[0]?.fixture || `${match.homeTeam} – ${match.awayTeam}`;
    const additions = [];
    for (const { player, sources } of candidatePool(prediction.shooters)) for (const metric of ["shots", "sot"]) {
      const relevant = sources.includes(metric === "shots" ? "primary-shots" : "primary-sot") || sources.includes(metric === "shots" ? "qualified-shots-outsider" : "qualified-sot-outsider");
      if (!relevant) continue;
      const lineup = lineupEligibility(player, prediction.matchId, probableLineups, officialLineups);
      const assessment = evaluateCandidate(player, metric, sources, lineup);
      if (!assessment.eligible) {
        excluded.push({ matchId: prediction.matchId, playerId: player.playerId || null, playerName: player.name || null, metric, sources, reasons: assessment.reasons });
        continue;
      }
      const quoteRow = compatibleQuote({ odds, prediction, player, metric, threshold: assessment.threshold, providerPlayerMap });
      const leg = playerForecastLeg({ prediction, player, metric, threshold: assessment.threshold, lineup, quoteRow, odds, sources, fixture });
      additions.push(leg);
      added.push(leg);
    }
    additions.sort((left, right) => (left.suggestionAnalysis.family === right.suggestionAnalysis.family ? 0 : left.suggestionAnalysis.family === "shots" ? -1 : 1)
      || Number(right.modelProbabilityPct) - Number(left.modelProbabilityPct)
      || String(left.playerName).localeCompare(String(right.playerName), "it"));
    const baseline = match.selections.filter(leg => leg.suggestionAnalysis?.suggested).sort((left, right) => Number(left.suggestionAnalysis.rank) - Number(right.suggestionAnalysis.rank));
    const ranks = new Map([...baseline, ...additions].map((leg, index) => [leg.selectionId, index + 1]));
    const selections = [...match.selections.map(leg => ranks.has(leg.selectionId) ? { ...leg, suggestionAnalysis: { ...leg.suggestionAnalysis, rank: ranks.get(leg.selectionId) } } : leg), ...additions.map(leg => ({ ...leg, suggestionAnalysis: { ...leg.suggestionAnalysis, rank: ranks.get(leg.selectionId) } }))];
    const suggestions = [...baseline, ...additions].map(leg => leg.selectionId);
    const byFamily = suggestions.map(id => selections.find(leg => leg.selectionId === id)).reduce((counts, leg) => { const family = leg.suggestionAnalysis.family; counts[family] = (counts[family] || 0) + 1; return counts; }, {});
    return { ...match, selections, total: selections.length, evaluated: selections.filter(leg => finite(leg.betSelection?.evaluation?.modelProbabilityPct)).length, notModelled: selections.filter(leg => !finite(leg.betSelection?.evaluation?.modelProbabilityPct)).length, suggestions, suggestionSummary: { total: suggestions.length, byFamily } };
  });
  return {
    matches,
    summary: {
      source: "data/normalized/predictions.json#predictions[].shooters",
      readingsConsumer: "js/pages/readings.js",
      sharedStructuredData: true,
      added: added.length,
      shots: added.filter(leg => leg.suggestionAnalysis.family === "shots").length,
      sot: added.filter(leg => leg.suggestionAnalysis.family === "sot").length,
      quoted: added.filter(leg => leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT").length,
      unquoted: added.filter(leg => leg.betSelection.quote.availability === "UNAVAILABLE").length,
      duoPromoted: 0,
      excluded,
      quotedSelectionIds: added.filter(leg => leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT").map(leg => leg.selectionId),
    },
  };
}

module.exports = {
  chooseShotsThreshold,
  chooseSotThreshold,
  candidatePool,
  evaluateCandidate,
  isCompatibleIndividualMarket,
  integratePlayerForecasts,
  applyApprovedBaseline,
};
