"use strict";

const { attachBetSelection } = require("./betting-selection-contract");
const { isPlayableSelection, playablePolicyFor } = require("./betting-market-policy");

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
    : family === "goals" ? "Under/Over"
      : family === "btts" ? "Gol/No Gol"
        : family === "team-goal" ? "Gol squadra"
          : family || "Mercato";
}

function selectionLabel(event, market, selection, row) {
  if (row.family === "1x2") return selection.name === "1" ? `${event.home.name} vincente` : selection.name === "2" ? `${event.away.name} vincente` : "Pareggio";
  if (row.family === "double-chance") return selection.name === "1X" ? `${event.home.name} o pareggio (1X)` : selection.name === "X2" ? `${event.away.name} o pareggio (X2)` : "Nessun pareggio (12)";
  if (row.family === "btts") return selection.name === "GOAL" ? "Entrambe le squadre segnano" : "Almeno una squadra non segna";
  if (row.family === "goals") return `${selection.name === "OVER" ? "Over" : "Under"} ${String(market.threshold).replace(".", ",")} gol`;
  if (row.family === "team-goal") {
    const team = /^CASA:/.test(market.marketName) ? event.home.name : event.away.name;
    return `${team} ${selection.name === "SI" ? "segna" : "non segna"}`;
  }
  return `${market.variantName || market.marketName} · ${selection.name}`;
}

function canonicalLeg({ prediction, row, quoteRow, odds }) {
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
    quoteSource: { provider: odds.provider, retrievedAt: event.retrievedAt || odds.retrievedAt, sourceUrl: odds.sourceUrl, snapshotPath: "data/normalized/odds/sisal/serie-a.json", rawFile: odds.rawFile, acquisition: odds.acquisition },
    classification: null,
    reliability: { level: row.confidence || "Non valutabile", reason: "Valutazione già serializzata nel confronto canonico V2." },
    compatibility: { status: "COMPATIBILE", reason: "Target bookmaker e riga canonica V2 associati tramite providerSelectionId.", modelTarget: row.id, bookmakerTarget: `${market.marketName} · ${market.variantName || selection.name}` },
    modelProbabilityPct: row.modelProbabilityPct,
    fairOdds: row.fairOdds,
    expectedValuePct: row.expectedValuePct,
    evaluationStatus: "EV_CALCOLABILE",
  });
}

function cloneWithPolicyAndLineup(leg, lineupEligibility) {
  const copy = JSON.parse(JSON.stringify(leg));
  copy.lineupEligibility = lineupEligibility;
  copy.betSelection.operational.playability = playablePolicyFor(copy, { matchday: 6 });
  return copy;
}

function applyCanonicalEvaluation(leg, row) {
  if (!row) return leg;
  const copy = JSON.parse(JSON.stringify(leg));
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

  const selections = [...retained, ...groupA];
  const duplicates = selections.filter((leg, index) => selections.findIndex(item => item.selectionId === leg.selectionId) !== index);
  if (duplicates.length) throw new Error(`Catalogo MD${code}: selectionId duplicati: ${duplicates.map(leg => leg.selectionId).join(", ")}`);
  const roundMatches = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === matchday)
    .sort((left, right) => `${left.date}T${left.kickoff || "00:00"}`.localeCompare(`${right.date}T${right.kickoff || "00:00"}`));
  const catalogMatches = roundMatches.map(match => {
    const rows = selections.filter(leg => leg.matchId === match.id).sort(stableSort).map((leg, index) => ({ ...leg, catalogOrder: index }));
    return { matchId: match.id, date: match.date, kickoff: match.kickoff, homeTeam: match.homeTeam, awayTeam: match.awayTeam, selections: rows, total: rows.length, evaluated: rows.filter(leg => finite(leg.betSelection?.evaluation?.expectedValuePct)).length, notModelled: rows.filter(leg => !finite(leg.betSelection?.evaluation?.expectedValuePct)).length };
  });
  const all = catalogMatches.flatMap(match => match.selections);
  return {
    schemaVersion: 1,
    matchday,
    generatedAt: new Date().toISOString(),
    sources: { predictionsGeneratedAt: predictionsData.generatedAt, modelVersion: predictionsData.engine?.version || predictions[0]?.engineVersion || null, oddsRetrievedAt: odds.retrievedAt, oddsSnapshot: "data/normalized/odds/sisal/serie-a.json", probableLineupsImportedAt: probableLineups?.importedAt || null, probableLineupsProvider: probableLineups?.provider || null, officialLineupsRetrievedAt: officialLineups?.retrievedAt || null, officialFixturesAvailable: (officialLineups?.fixtures || []).filter(fixture => fixture.matchday === matchday).length },
    rules: { underAllowed: false, individualPlayerFoulsAllowed: false, cornerPeriodsAllowed: false, doubleChance12Allowed: false, fullMatchCornerOversAllowed: true, fullMatchTeamCornersAllowed: true, fullTimeCorner1X2Allowed: true, negativeExpectedValueAllowed: true, topNLimit: null },
    totals: { initialVisible: initial.length, excludedByPolicy: excluded.filter(item => item.stage === "policy").length, excludedByLineup: excluded.filter(item => item.stage === "lineup").length, retainedInitial: retained.length, groupARequested: 128, groupARecovered: groupA.length, groupARejected: groupARejected.length, finalSelections: all.length, evaluated: all.filter(leg => finite(leg.betSelection?.evaluation?.expectedValuePct)).length, notModelled: all.filter(leg => !finite(leg.betSelection?.evaluation?.expectedValuePct)).length },
    excluded,
    groupARejected,
    matches: catalogMatches,
  };
}

module.exports = { buildMd06MarketCatalog, resolveLineupEligibility, playerTokenFromLeg, stableSort };
