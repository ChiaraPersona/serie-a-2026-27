"use strict";

const { attachBetSelection } = require("./betting-selection-contract");
const { isPlayableSelection, playablePolicyFor } = require("./betting-market-policy");
const { b2FamilyForMarket, isPrimaryScoreCompatible, evaluateDerivedScoreMarket, validateCanonicalDnb } = require("./score-market-evaluation");
const { annotateCatalogMatches, CLASSIFICATIONS } = require("./md06-scenario-coherence");
const { reconstructStatisticalCoverage } = require("./md06-statistical-coverage");
const { annotateSuggestedForecasts } = require("./md06-suggested-forecasts");

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const matchdayCode = value => String(value).padStart(2, "0");

function playerAliases(player) {
  const aliases = new Set([player?.sourceName, player?.currentName].map(clean).filter(Boolean));
  const tokens = clean(player?.currentName).split(" ").filter(Boolean);
  if (tokens.length === 1) aliases.add(tokens[0]);
  if (tokens.length > 1) aliases.add(`${tokens.slice(1).join(" ")} ${tokens[0][0]}`);
  return aliases;
}

function playerTokenFromLeg(leg) {
  if (leg.player) return clean(leg.player);
  const variant = String(leg?.betSelection?.market?.variant || leg.variant || "");
  return clean(variant.match(/^(.+?)\s+U\/O\b/i)?.[1] || "");
}

function findUniquePlayer(players, token) {
  const matches = (players || []).filter(player => playerAliases(player).has(token));
  return matches.length === 1 ? matches[0] : null;
}

function isPlayerLeg(leg) {
  const market = String(leg?.betSelection?.market?.name || leg.market || "").toUpperCase();
  return leg?.betSelection?.market?.scope === "player" || leg.marketScope === "player" || /GIOCATORE|MARCATORE|ASSIST|CARTELLINO/.test(market);
}

function resolveLineupEligibility({ leg, matchId, matchById, probableLineups, officialLineups }) {
  if (!isPlayerLeg(leg)) return { eligible: true, status: "not-applicable", source: null, sourceUpdatedAt: null, playerId: null, playerName: null };
  const match = matchById.get(matchId);
  const teamIds = new Set([match?.homeTeam, match?.awayTeam].filter(Boolean));
  const probablePlayers = (probableLineups?.teams || []).filter(team => teamIds.has(team.teamId)).flatMap(team => team.players || []);
  const token = playerTokenFromLeg(leg);
  const probablePlayer = findUniquePlayer(probablePlayers, token);
  const officialFixture = (officialLineups?.fixtures || []).find(fixture => fixture.matchId === matchId);

  if (officialFixture) {
    const officialPlayers = officialFixture.teams.flatMap(team => (team.players || []).map(player => ({ ...player, sourceName: player.currentName, lineupStatus: "starter", teamId: team.teamId })));
    const officialPlayer = findUniquePlayer(officialPlayers, token)
      || (probablePlayer?.playerId ? officialPlayers.find(player => player.playerId === probablePlayer.playerId) : null);
    if (officialPlayer) return { eligible: true, status: "official-starter", source: officialLineups.provider || "official", sourceUpdatedAt: officialLineups.retrievedAt || null, playerId: officialPlayer.playerId || null, playerName: officialPlayer.currentName || probablePlayer?.currentName || null };
    return { eligible: false, status: probablePlayer ? "official-nonstarter" : "unknown", source: officialLineups.provider || "official", sourceUpdatedAt: officialLineups.retrievedAt || null, playerId: probablePlayer?.playerId || null, playerName: probablePlayer?.currentName || null };
  }

  if (!probablePlayer) return { eligible: false, status: "unknown", source: probableLineups?.provider || null, sourceUpdatedAt: probableLineups?.importedAt || null, playerId: null, playerName: null };
  return {
    eligible: probablePlayer.lineupStatus === "starter",
    status: probablePlayer.lineupStatus === "starter" ? "probable-starter" : probablePlayer.lineupStatus === "reserve" ? "reserve" : "not-projected-starter",
    source: probableLineups.provider,
    sourceUpdatedAt: probableLineups.importedAt,
    playerId: probablePlayer.playerId || null,
    playerName: probablePlayer.currentName || probablePlayer.sourceName || null,
  };
}

function verifiedContract(leg) {
  const contract = leg?.betSelection;
  const quote = contract?.quote || {};
  const compatibility = String(contract?.compatibility?.status || "");
  return contract?.selectionId === leg?.selectionId
    && contract?.identity?.status === "VERIFIED_PROVIDER_IDS"
    && Boolean(contract.identity.providerMarketId)
    && Boolean(contract.identity.providerSelectionId)
    && finite(quote.decimal)
    && Number(quote.decimal) >= 1
    && Boolean(quote.verifiedAt)
    && Boolean(quote.source?.provider)
    && quote.availability === "AVAILABLE_AT_SNAPSHOT"
    && !/^INCOMPATIBILE/.test(compatibility)
    && compatibility !== "INCOMPATIBLE";
}

function familyLabel(family) {
  return family === "1x2" || family === "double-chance" ? "Esito"
    : family === "draw-no-bet" ? "Draw No Bet"
    : family === "goals" ? "Under/Over"
      : family === "btts" ? "Gol/No Gol"
        : family === "team-goal" ? "Gol squadra"
          : family === "multigoal-match" ? "Multigoal partita"
            : family === "multigoal-team" ? "Multigoal squadra"
              : family === "team-goals-over" ? "Gol squadra · Over"
          : family || "Mercato";
}

function selectionLabel(event, market, selection, row) {
  if (row.family === "1x2") return selection.name === "1" ? `${event.home.name} vincente` : selection.name === "2" ? `${event.away.name} vincente` : "Pareggio";
  if (row.family === "draw-no-bet") return selection.name === "1" ? `${event.home.name} Draw No Bet` : `${event.away.name} Draw No Bet`;
  if (row.family === "double-chance") return selection.name === "1X" ? `${event.home.name} o pareggio (1X)` : selection.name === "X2" ? `${event.away.name} o pareggio (X2)` : "Nessun pareggio (12)";
  if (row.family === "btts") return selection.name === "GOAL" ? "Entrambe le squadre segnano" : "Almeno una squadra non segna";
  if (row.family === "goals") return `${selection.name === "OVER" ? "Over" : "Under"} ${String(market.threshold).replace(".", ",")} gol`;
  if (row.family === "team-goal") {
    const team = /^CASA:/.test(market.marketName) ? event.home.name : event.away.name;
    return `${team} ${selection.name === "SI" ? "segna" : "non segna"}`;
  }
  if (row.family === "multigoal-match") return `Multigoal ${selection.name}`;
  if (row.family === "multigoal-team") {
    const team = /SQUADRA 1\b/.test(market.variantName || "") ? event.home.name : event.away.name;
    return `${team} multigoal ${selection.name}`;
  }
  if (row.family === "team-goals-over") {
    const team = /SQUADRA 1\b/.test(market.variantName || "") ? event.home.name : event.away.name;
    return `${team} Over ${String(market.threshold).replace(".", ",")} gol`;
  }
  return `${market.variantName || market.marketName} · ${selection.name}`;
}

function quoteSource(odds, event) {
  return { provider: odds.provider, retrievedAt: event.retrievedAt || odds.retrievedAt, sourceUrl: odds.sourceUrl, snapshotPath: "data/normalized/odds/sisal/serie-a.json", rawFile: odds.rawFile, acquisition: odds.acquisition };
}

function canonicalLeg({ prediction, row, quoteRow, odds, dnbValidation = null }) {
  const { event, market, selection } = quoteRow;
  const legacy = {
    matchId: prediction.matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: market.marketScope || "match",
    marketFamily: familyLabel(row.family),
    threshold: market.threshold ?? null,
    selection: selection.name,
    label: selectionLabel(event, market, selection, row),
    odds: Number(selection.odds),
    modelProbabilityPct: Number(row.modelProbabilityPct),
    fairOdds: Number(row.fairOdds),
    expectedValuePct: Number(row.expectedValuePct),
    evidenceLabel: `Prediction Engine V2 ${prediction.engineVersion || "N/D"} · confronto canonico`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "COMPATIBILE",
    evStatus: "EV_CALCOLABILE",
    overlapKey: `${row.family}:${row.selection}:${market.threshold ?? market.variantName ?? "main"}`,
    semanticKeys: [`canonical:${row.id}`],
  };
  return attachBetSelection(legacy, {
    provider: odds.provider,
    marketObject: market,
    selectionObject: selection,
    quoteSource: quoteSource(odds, event),
    classification: null,
    reliability: { level: row.confidence || "Non valutabile", reason: "Valutazione già serializzata nel confronto canonico V2." },
    compatibility: { status: "COMPATIBILE", reason: "Target bookmaker e riga canonica V2 associati tramite providerSelectionId.", modelTarget: row.id, bookmakerTarget: `${market.marketName} · ${market.variantName || selection.name}` },
    modelProbabilityPct: row.modelProbabilityPct,
    fairOdds: row.fairOdds,
    expectedValuePct: row.expectedValuePct,
    evaluationStatus: "EV_CALCOLABILE",
    evaluationKind: "CANONICAL_DIRECT",
    prudentProbabilityPct: row.conservativeProbabilityPct,
    conservativeExpectedValuePct: row.conservativeExpectedValuePct,
    probabilitySemantics: dnbValidation?.probabilitySemantics || "ABSOLUTE_EVENT",
    fairOddsBasis: dnbValidation?.fairOddsBasis || "CENTRAL_PROBABILITY",
    expectedValueBasis: dnbValidation?.expectedValueBasis || "CENTRAL_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE",
    provenance: {
      source: "predictions.marketComparison",
      modelVersion: prediction.engineVersion || null,
      predictionGeneratedAt: prediction.generatedAt || null,
      modelTarget: row.id,
    },
    settlement: dnbValidation?.settlement,
  });
}

function derivedB2Leg({ prediction, family, evaluation, quoteRow, odds }) {
  const { event, market, selection } = quoteRow;
  const legacy = {
    matchId: prediction.matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: market.marketScope || "match",
    marketFamily: familyLabel(family),
    threshold: market.threshold ?? null,
    selection: selection.name,
    label: selectionLabel(event, market, selection, { family }),
    odds: Number(selection.odds),
    modelProbabilityPct: evaluation.centralProbabilityPct,
    fairOdds: evaluation.fairOdds,
    expectedValuePct: evaluation.expectedValuePct,
    evidenceLabel: `Prediction Engine V2 ${prediction.engineVersion || "N/D"} · derivazione B2 matrice punteggi`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "COMPATIBILE",
    evStatus: "EV_CALCOLABILE",
    overlapKey: `${family}:${market.variantName || "main"}:${market.threshold ?? selection.name}`,
    semanticKeys: [`derived-b2:${evaluation.predicateId}`],
  };
  return attachBetSelection(legacy, {
    provider: odds.provider,
    marketObject: market,
    selectionObject: selection,
    quoteSource: quoteSource(odds, event),
    classification: null,
    reliability: { level: "Bassa", reason: "Derivazione deterministica dalla matrice punteggi V2 e dalla sensibilità già esistente; nessuna nuova distribuzione." },
    compatibility: { status: "COMPATIBILE", reason: "Il predicato bookmaker coincide con il predicato discreto applicato alla matrice punteggi.", modelTarget: evaluation.predicateId, bookmakerTarget: `${market.marketName} · ${market.variantName || selection.name}` },
    modelProbabilityPct: evaluation.centralProbabilityPct,
    prudentProbabilityPct: evaluation.prudentProbabilityPct,
    fairOdds: evaluation.fairOdds,
    expectedValuePct: evaluation.expectedValuePct,
    evaluationStatus: "EV_CALCOLABILE",
    evaluationKind: evaluation.kind,
    probabilitySemantics: evaluation.probabilitySemantics,
    fairOddsBasis: evaluation.fairOddsBasis,
    expectedValueBasis: evaluation.expectedValueBasis,
    provenance: {
      source: "predictions.expectedGoals",
      predicateId: evaluation.predicateId,
      predicateTarget: { market: market.marketName, variant: market.variantName || null, threshold: market.threshold ?? null, selection: selection.name },
      modelVersion: prediction.engineVersion || null,
      predictionGeneratedAt: prediction.generatedAt || null,
      sensitivity: "central plus four lambda perturbations +/-10%; prudent probability is the minimum",
      sensitivityProbabilityPct: evaluation.sensitivityProbabilityPct,
    },
  });
}

function cloneWithPolicyAndLineup(leg, lineupEligibility) {
  const copy = JSON.parse(JSON.stringify(leg));
  copy.lineupEligibility = lineupEligibility;
  copy.betSelection.operational.playability = playablePolicyFor(copy, { matchday: 6 });
  return copy;
}

function applyCanonicalEvaluation(leg, row) {
  const copy = JSON.parse(JSON.stringify(leg));
  if (!row) {
    copy.betSelection.evaluation.kind = copy.betSelection.evaluation.status === "NOT_MODELLED" ? "NOT_MODELLED" : "CANONICAL_DIRECT";
    return copy;
  }
  copy.modelProbabilityPct = Number(row.modelProbabilityPct);
  copy.fairOdds = Number(row.fairOdds);
  copy.expectedValuePct = Number(row.expectedValuePct);
  copy.evStatus = "EV_CALCOLABILE";
  copy.betSelection.evaluation = {
    ...copy.betSelection.evaluation,
    modelProbabilityPct: Number(row.modelProbabilityPct),
    fairOdds: Number(row.fairOdds),
    expectedValuePct: Number(row.expectedValuePct),
    status: "EV_CALCOLABILE",
    kind: "CANONICAL_DIRECT",
    probabilitySemantics: "ABSOLUTE_EVENT",
    fairOddsBasis: "CENTRAL_PROBABILITY",
    expectedValueBasis: "CENTRAL_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE",
    provenance: {
      source: "predictions.marketComparison",
      modelTarget: row.id,
    },
  };
  copy.betSelection.compatibility = { status: "COMPATIBILE", reason: "Target collegato al confronto canonico V2 tramite providerSelectionId.", modelTarget: row.id, bookmakerTarget: copy.betSelection.compatibility?.bookmakerTarget || null };
  return copy;
}

function stableSort(left, right) {
  const leftEv = left.betSelection?.evaluation?.expectedValuePct;
  const rightEv = right.betSelection?.evaluation?.expectedValuePct;
  const leftModelled = finite(leftEv), rightModelled = finite(rightEv);
  if (leftModelled !== rightModelled) return leftModelled ? -1 : 1;
  if (leftModelled && Number(leftEv) !== Number(rightEv)) return Number(rightEv) - Number(leftEv);
  return `${left.betSelection?.market?.family || ""}|${left.label || ""}|${left.selectionId}`.localeCompare(`${right.betSelection?.market?.family || ""}|${right.label || ""}|${right.selectionId}`, "it");
}

function buildMd06MarketCatalog({ predictionsData, odds, matches, schedinaSlips, probableLineups, officialLineups, matchday = 6 }) {
  const code = matchdayCode(matchday);
  const predictions = predictionsData.predictions.filter(prediction => prediction.matchId.endsWith(`-md-${code}`));
  const matchById = new Map(matches.map(match => [match.id, match]));
  const quoteBySelectionId = new Map(odds.events.flatMap(event => event.markets.flatMap(market => (market.selections || []).map(selection => [String(selection.providerSelectionId), { event, market, selection }]))));
  const comparisonBySelectionId = new Map(predictions.flatMap(prediction => (prediction.marketComparison || []).map(row => [String(row.providerSelectionId), { prediction, row }])));

  const modelLegs = (schedinaSlips || []).flatMap(slip => slip.legs || []).filter(leg => {
    const evaluation = leg?.betSelection?.evaluation;
    return verifiedContract(leg) && evaluation?.status !== "NOT_MODELLED" && [evaluation?.modelProbabilityPct, evaluation?.fairOdds, evaluation?.expectedValuePct].every(finite);
  }).map(leg => ({ leg, origin: "schedina-modello" }));
  const safeLegs = predictions.flatMap(prediction => {
    const combo = prediction.combinations?.find(item => item.tier === "Safe");
    return (combo?.legs || []).filter(verifiedContract).map(leg => ({ leg: { ...leg, matchId: prediction.matchId }, origin: "mycombo-safe" }));
  });
  const initial = [];
  const initialIds = new Set();
  for (const entry of [...modelLegs, ...safeLegs]) {
    if (!entry.leg.selectionId || initialIds.has(entry.leg.selectionId)) continue;
    initialIds.add(entry.leg.selectionId);
    initial.push(entry);
  }

  const excluded = [];
  const retained = [];
  for (const entry of initial) {
    const policy = playablePolicyFor(entry.leg, { matchday });
    if (policy.status !== "PLAYABLE") {
      excluded.push({ selectionId: entry.leg.selectionId, matchId: entry.leg.matchId, label: entry.leg.label, reason: policy.code, stage: "policy" });
      continue;
    }
    const lineup = resolveLineupEligibility({ leg: entry.leg, matchId: entry.leg.matchId, matchById, probableLineups, officialLineups });
    if (!lineup.eligible) {
      excluded.push({ selectionId: entry.leg.selectionId, matchId: entry.leg.matchId, label: entry.leg.label, reason: `LINEUP_${lineup.status.toUpperCase().replace(/-/g, "_")}`, stage: "lineup", lineup });
      continue;
    }
    const comparison = comparisonBySelectionId.get(String(entry.leg.providerSelectionId));
    const enriched = applyCanonicalEvaluation(cloneWithPolicyAndLineup(entry.leg, lineup), comparison?.row);
    enriched.catalogOrigin = entry.origin;
    retained.push(enriched);
  }

  const retainedIds = new Set(retained.map(leg => leg.selectionId));
  const groupA = [];
  const groupARejected = [];
  for (const prediction of predictions) for (const row of prediction.marketComparison || []) {
    if (row.family === "draw-no-bet") continue;
    const quoteRow = quoteBySelectionId.get(String(row.providerSelectionId));
    const policyInput = { matchId: prediction.matchId, market: quoteRow?.market?.marketName || row.market, variant: quoteRow?.market?.variantName, selection: quoteRow?.selection?.name || row.selection };
    if (!isPlayableSelection(policyInput, { matchday })) continue;
    const selectionId = `bet:${String(odds.provider).toLowerCase()}:${prediction.matchId}:${row.providerSelectionId}`;
    if (initialIds.has(selectionId) || retainedIds.has(selectionId)) continue;
    const reasons = [];
    if (!quoteRow || quoteRow.event.canonicalMatchId !== prediction.matchId) reasons.push("QUOTE_IDENTITY_MISMATCH");
    if (quoteRow && (quoteRow.market.status !== "open" || quoteRow.selection.status !== "open" || !finite(quoteRow.selection.odds) || Number(quoteRow.selection.odds) < 1)) reasons.push("QUOTE_NOT_AVAILABLE");
    if (![row.modelProbabilityPct, row.fairOdds, row.expectedValuePct].every(finite)) reasons.push("EVALUATION_INCOMPLETE");
    if (finite(row.modelProbabilityPct) && Math.abs(Number(row.fairOdds) - 100 / Number(row.modelProbabilityPct)) > 0.06) reasons.push("FAIR_ODDS_INCOHERENT");
    if (quoteRow && finite(row.modelProbabilityPct)) {
      const serializedProbabilityEv = (Number(row.modelProbabilityPct) / 100 * Number(quoteRow.selection.odds) - 1) * 100;
      const roundingTolerance = Math.max(0.2, Number(quoteRow.selection.odds) * 0.06);
      if (Math.abs(Number(row.expectedValuePct) - serializedProbabilityEv) > roundingTolerance) reasons.push("EV_INCOHERENT");
    }
    if (reasons.length) {
      groupARejected.push({ matchId: prediction.matchId, providerSelectionId: row.providerSelectionId, reasons });
      continue;
    }
    const leg = canonicalLeg({ prediction, row, quoteRow, odds });
    leg.lineupEligibility = { eligible: true, status: "not-applicable", source: null, sourceUpdatedAt: null, playerId: null, playerName: null };
    leg.catalogOrigin = "gruppo-a";
    groupA.push(leg);
    retainedIds.add(leg.selectionId);
  }

  const dnb = [];
  const dnbRejected = [];
  for (const prediction of predictions) for (const row of prediction.marketComparison || []) {
    if (row.family !== "draw-no-bet") continue;
    const quoteRow = quoteBySelectionId.get(String(row.providerSelectionId));
    const selectionId = `bet:${String(odds.provider).toLowerCase()}:${prediction.matchId}:${row.providerSelectionId}`;
    if (initialIds.has(selectionId) || retainedIds.has(selectionId)) continue;
    const reasons = [];
    if (!quoteRow || quoteRow.event.canonicalMatchId !== prediction.matchId) reasons.push("QUOTE_IDENTITY_MISMATCH");
    if (quoteRow && (quoteRow.market.marketName !== "DRAW NO BET" || quoteRow.market.status !== "open" || quoteRow.selection.status !== "open" || !finite(quoteRow.selection.odds) || Number(quoteRow.selection.odds) < 1)) reasons.push("QUOTE_NOT_AVAILABLE");
    if (quoteRow && !isPlayableSelection({ matchId: prediction.matchId, market: quoteRow.market.marketName, variant: quoteRow.market.variantName, selection: quoteRow.selection.name }, { matchday })) reasons.push("POLICY_NOT_PLAYABLE");
    if (![row.modelProbabilityPct, row.conservativeProbabilityPct, row.fairOdds, row.expectedValuePct, row.conservativeExpectedValuePct].every(finite)) reasons.push("EVALUATION_INCOMPLETE");
    const validation = quoteRow && !reasons.length ? validateCanonicalDnb({ prediction, row, market: quoteRow.market, selection: quoteRow.selection }) : null;
    if (validation && !validation.valid) reasons.push("DNB_PUSH_EVALUATION_MISMATCH");
    if (reasons.length) {
      dnbRejected.push({ matchId: prediction.matchId, providerSelectionId: row.providerSelectionId, reasons, differences: validation?.differences || null });
      continue;
    }
    const leg = canonicalLeg({ prediction, row, quoteRow, odds, dnbValidation: validation });
    leg.lineupEligibility = { eligible: true, status: "not-applicable", source: null, sourceUpdatedAt: null, playerId: null, playerName: null };
    leg.catalogOrigin = "dnb-b1";
    dnb.push(leg);
    retainedIds.add(leg.selectionId);
  }

  const groupB2 = [];
  const groupB2Rejected = [];
  const eventByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
  for (const prediction of predictions) {
    const event = eventByMatch.get(prediction.matchId);
    if (!event) continue;
    for (const market of event.markets || []) for (const selection of market.selections || []) {
      const family = b2FamilyForMarket(market, selection);
      if (!family || !isPrimaryScoreCompatible(prediction, market, selection)) continue;
      if (market.status !== "open" || selection.status !== "open" || !finite(selection.odds) || Number(selection.odds) < 1) continue;
      const selectionId = `bet:${String(odds.provider).toLowerCase()}:${prediction.matchId}:${selection.providerSelectionId}`;
      if (initialIds.has(selectionId) || retainedIds.has(selectionId)) continue;
      const reasons = [];
      if (!market.providerMarketId || !selection.providerSelectionId) reasons.push("PROVIDER_ID_MISSING");
      if (!isPlayableSelection({ matchId: prediction.matchId, market: market.marketName, variant: market.variantName, selection: selection.name }, { matchday })) reasons.push("POLICY_NOT_PLAYABLE");
      let evaluation = null;
      if (!reasons.length) {
        try {
          evaluation = evaluateDerivedScoreMarket({ prediction, market, selection });
        } catch (error) {
          reasons.push(`DERIVATION_FAILED:${error.message}`);
        }
      }
      if (evaluation && (!finite(evaluation.centralProbabilityPct) || !finite(evaluation.prudentProbabilityPct) || !finite(evaluation.fairOdds) || !finite(evaluation.expectedValuePct))) reasons.push("EVALUATION_INCOMPLETE");
      if (evaluation && evaluation.matrixCellSums.some(total => Math.abs(total - 1) > 1e-12)) reasons.push("MATRIX_NOT_NORMALIZED");
      if (reasons.length) {
        groupB2Rejected.push({ matchId: prediction.matchId, providerMarketId: market.providerMarketId, providerSelectionId: selection.providerSelectionId, family, reasons });
        continue;
      }
      const quoteRow = { event, market, selection };
      const leg = derivedB2Leg({ prediction, family, evaluation, quoteRow, odds });
      leg.lineupEligibility = { eligible: true, status: "not-applicable", source: null, sourceUpdatedAt: null, playerId: null, playerName: null };
      leg.catalogOrigin = "gruppo-b2";
      leg.derivedMarketFamily = family;
      groupB2.push(leg);
      retainedIds.add(leg.selectionId);
    }
  }

  const statisticalCoverage = reconstructStatisticalCoverage({ odds, existingSelectionIds: retainedIds });
  for (const leg of statisticalCoverage.addableLegs) retainedIds.add(leg.selectionId);
  const selections = [...retained, ...groupA, ...dnb, ...groupB2, ...statisticalCoverage.addableLegs];
  const duplicates = selections.filter((leg, index) => selections.findIndex(item => item.selectionId === leg.selectionId) !== index);
  if (duplicates.length) throw new Error(`Catalogo MD${code}: selectionId duplicati: ${duplicates.map(leg => leg.selectionId).join(", ")}`);
  const roundMatches = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === matchday)
    .sort((left, right) => `${left.date}T${left.kickoff || "00:00"}`.localeCompare(`${right.date}T${right.kickoff || "00:00"}`));
  const baseCatalogMatches = roundMatches.map(match => {
    const rows = selections.filter(leg => leg.matchId === match.id).sort(stableSort).map((leg, index) => ({ ...leg, catalogOrder: index }));
    return { matchId: match.id, date: match.date, kickoff: match.kickoff, homeTeam: match.homeTeam, awayTeam: match.awayTeam, selections: rows, total: rows.length, evaluated: rows.filter(leg => finite(leg.betSelection?.evaluation?.expectedValuePct)).length, notModelled: rows.filter(leg => !finite(leg.betSelection?.evaluation?.expectedValuePct)).length };
  });
  const scenarioCatalogMatches = annotateCatalogMatches({ catalogMatches: baseCatalogMatches, predictions });
  const suggested = annotateSuggestedForecasts(scenarioCatalogMatches);
  const catalogMatches = suggested.matches;
  const all = catalogMatches.flatMap(match => match.selections);
  const scenarioCounts = all.reduce((counts, leg) => {
    const key = leg.scenarioAnalysis?.classification;
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, Object.fromEntries(Object.values(CLASSIFICATIONS).map(key => [key, 0])));
  return {
    schemaVersion: 3,
    matchday,
    generatedAt: new Date().toISOString(),
    sources: { predictionsGeneratedAt: predictionsData.generatedAt, modelVersion: predictionsData.engine?.version || predictions[0]?.engineVersion || null, oddsRetrievedAt: odds.retrievedAt, oddsSnapshot: "data/normalized/odds/sisal/serie-a.json", probableLineupsImportedAt: probableLineups?.importedAt || null, probableLineupsProvider: probableLineups?.provider || null, officialLineupsRetrievedAt: officialLineups?.retrievedAt || null, officialFixturesAvailable: (officialLineups?.fixtures || []).filter(fixture => fixture.matchday === matchday).length, scenarioCoherenceVersion: 1, scenarioCoherenceBasis: "Frozen Engine V2 probabilities and deterministic event logic; odds and EV excluded" },
    rules: { underAllowed: false, individualPlayerFoulsAllowed: false, cornerPeriodsAllowed: false, doubleChance12Allowed: false, fullMatchCornerOversAllowed: true, fullMatchTeamCornersAllowed: true, fullTimeCorner1X2Allowed: true, negativeExpectedValueAllowed: true, topNLimit: null },
    totals: { initialVisible: initial.length, excludedByPolicy: excluded.filter(item => item.stage === "policy").length, excludedByLineup: excluded.filter(item => item.stage === "lineup").length, retainedInitial: retained.length, groupARequested: 128, groupARecovered: groupA.length, groupARejected: groupARejected.length, dnbRequested: 20, dnbRecovered: dnb.length, dnbRejected: dnbRejected.length, groupB2Requested: 203, groupB2Recovered: groupB2.length, groupB2Rejected: groupB2Rejected.length, statisticalBAdded: statisticalCoverage.addableLegs.length, finalSelections: all.length, evaluated: all.filter(leg => finite(leg.betSelection?.evaluation?.expectedValuePct)).length, notModelled: all.filter(leg => !finite(leg.betSelection?.evaluation?.expectedValuePct)).length, suggestions: suggested.totals.suggestions, suggestionsByFamily: suggested.totals.byFamily, scenarioCounts },
    statisticalCoverage: statisticalCoverage.summary,
    excluded,
    groupARejected,
    dnbRejected,
    groupB2Rejected,
    matches: catalogMatches,
  };
}

module.exports = { buildMd06MarketCatalog, resolveLineupEligibility, playerTokenFromLeg, stableSort, canonicalLeg, derivedB2Leg };
