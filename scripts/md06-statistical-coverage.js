"use strict";

const { attachBetSelection } = require("./betting-selection-contract");
const { playablePolicyFor } = require("./betting-market-policy");

const STATES = Object.freeze({
  A: "A_QUOTED_AND_EVALUABLE",
  B: "B_QUOTED_NOT_VALIDATED",
  C: "C_NOT_RECONCILED",
  D: "D_NOT_ELIGIBLE",
});

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const text = value => String(value || "").trim().toUpperCase().replace(/\s+/g, " ");

const ADDABLE = Object.freeze({
  "U/O TIRI TOTALI": { family: "shots", subfamily: "shots-match-over", selection: "OVER", label: "Tiri totali", reason: "TEAM_MATCH_SHOTS_DISTRIBUTION_NOT_VALIDATED" },
  "U/O TIRI TOTALI SQUADRA X": { family: "shots", subfamily: "shots-team-over", selection: "OVER", label: "Tiri totali", reason: "TEAM_MATCH_SHOTS_DISTRIBUTION_NOT_VALIDATED" },
  "1X2 TIRI TOTALI": { family: "shots", subfamily: "shots-1x2", selection: "*", label: "Tiri totali", reason: "JOINT_SHOTS_DIFFERENTIAL_NOT_VALIDATED" },
  "U/O TIRI IN PORTA": { family: "sot", subfamily: "sot-match-over", selection: "OVER", label: "Tiri in porta", reason: "PHASE_5C_INSUFFICIENT_DATA" },
  "U/O TIRI IN PORTA SQUADRA X": { family: "sot", subfamily: "sot-team-over", selection: "OVER", label: "Tiri in porta", reason: "PHASE_5C_INSUFFICIENT_DATA" },
  "ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA": { family: "sot", subfamily: "sot-both-teams", selection: "SI", label: "Tiri in porta", reason: "PHASE_5C_UNVALIDATED_JOINT_DISTRIBUTION" },
  "1X2 TIRI IN PORTA": { family: "sot", subfamily: "sot-1x2", selection: "*", label: "Tiri in porta", reason: "JOINT_SOT_DIFFERENTIAL_NOT_VALIDATED" },
  "U/O CORNER": { family: "corners", subfamily: "corners-match-over", selection: "OVER", label: "Corner", reason: "PHASE_5C_INSUFFICIENT_DATA" },
  "U/O CORNER SQUADRA X": { family: "corners", subfamily: "corners-team-over", selection: "OVER", label: "Corner", reason: "PHASE_5C_INSUFFICIENT_DATA" },
  "1X2 CORNER": { family: "corners", subfamily: "corners-1x2-fulltime", selection: "*", label: "Corner", reason: "PHASE_5C_NO_JOINT_DISCRETE_DISTRIBUTION" },
});

function relevantFamily(market) {
  const descriptor = `${text(market.marketName)} ${text(market.variantName)}`;
  if (descriptor.includes("TIRI IN PORTA")) return "sot";
  if (descriptor.includes("TIRI TOTALI")) return "shots";
  if (descriptor.includes("CORNER") || descriptor.includes("ANGOLO")) return "corners";
  if (descriptor.includes("CARTELL") || descriptor.includes("AMMON") || descriptor.includes("DISCIPLIN")) return "cards";
  return null;
}

function quoteVerified(event, market, selection) {
  return event?.canonicalMatchId && market?.providerMarketId && selection?.providerSelectionId
    && market.status === "open" && selection.status === "open"
    && finite(selection.odds) && Number(selection.odds) >= 1;
}

function isPlayerDuo(market) {
  const descriptor = `${text(market.marketName)} ${text(market.variantName)}`;
  return market.marketScope === "player" && (/\bDUO\b/.test(descriptor) || /SOSTITUT|SOST\./.test(descriptor));
}

function classifyCandidate(event, market, selection) {
  const family = relevantFamily(market);
  if (!family) return null;
  const marketName = text(market.marketName), selectionName = text(selection.name);
  const base = {
    matchId: event.canonicalMatchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    family,
    providerMarketId: String(market.providerMarketId || ""),
    providerSelectionId: String(selection.providerSelectionId || ""),
    marketCode: String(market.marketCode || ""),
    marketName: market.marketName,
    variantName: market.variantName,
    threshold: market.threshold ?? null,
    selection: selection.name,
    odds: finite(selection.odds) ? Number(selection.odds) : null,
    quoteVerified: quoteVerified(event, market, selection),
    snapshotRetrievedAt: event.retrievedAt || null,
  };
  if (!base.quoteVerified) return { ...base, state: STATES.C, reason: "QUOTE_OR_PROVIDER_ID_NOT_VERIFIED" };

  const policy = playablePolicyFor({ matchId: event.canonicalMatchId, market: market.marketName, variant: market.variantName, selection: selection.name }, { matchday: 6 });
  if (policy.status !== "PLAYABLE") return { ...base, state: STATES.D, reason: policy.code };

  if (isPlayerDuo(market) && ["shots", "sot"].includes(family)) {
    return { ...base, state: STATES.C, reason: family === "sot" ? "DUO_SUBSTITUTE_AND_WOODWORK_TARGET_MISMATCH" : "DUO_SUBSTITUTE_TARGET_MISMATCH" };
  }

  if (["31347", "31401"].includes(String(market.marketCode)) && selectionName === "OVER") {
    return { ...base, state: STATES.C, reason: "CARD_POINTS_SETTLEMENT_AND_CALIBRATION_NOT_VERIFIED" };
  }

  const definition = ADDABLE[marketName];
  if (definition && (definition.selection === "*" || definition.selection === selectionName)) {
    return { ...base, family: definition.family, subfamily: definition.subfamily, familyLabel: definition.label, state: STATES.B, reason: definition.reason };
  }

  return { ...base, state: STATES.D, reason: "OUTSIDE_AUTHORIZED_FULLTIME_SCOPE" };
}

function displaySelectionLabel(row, event, market) {
  const threshold = row.threshold == null ? "" : String(row.threshold).replace(".", ",");
  const side = /SQUADRA 1\b/i.test(market.variantName || "") ? event.home.name : /SQUADRA 2\b/i.test(market.variantName || "") ? event.away.name : null;
  if (row.subfamily === "shots-match-over") return `Partita Over ${threshold} tiri totali`;
  if (row.subfamily === "shots-team-over") return `${side || "Squadra"} Over ${threshold} tiri totali`;
  if (row.subfamily === "shots-1x2") return row.selection === "1" ? `${event.home.name} più tiri totali` : row.selection === "2" ? `${event.away.name} più tiri totali` : "Parità tiri totali";
  if (row.subfamily === "sot-match-over") return `Partita Over ${threshold} tiri in porta`;
  if (row.subfamily === "sot-team-over") return `${side || "Squadra"} Over ${threshold} tiri in porta`;
  if (row.subfamily === "sot-both-teams") return market.variantName.replace(/^ENTRAMBE LE SQUADRE\s*/i, "Entrambe le squadre ").toLowerCase().replace(/^./, value => value.toUpperCase());
  if (row.subfamily === "sot-1x2") return row.selection === "1" ? `${event.home.name} più tiri in porta` : row.selection === "2" ? `${event.away.name} più tiri in porta` : "Parità tiri in porta";
  if (row.subfamily === "corners-match-over") return `Partita Over ${threshold} corner`;
  if (row.subfamily === "corners-team-over") return `${side || "Squadra"} Over ${threshold} corner`;
  if (row.subfamily === "corners-1x2-fulltime") return row.selection === "1" ? `${event.home.name} più corner T.R.` : row.selection === "2" ? `${event.away.name} più corner T.R.` : "Parità corner T.R.";
  return `${market.variantName || market.marketName} · ${row.selection}`;
}

function statisticalCoverageLeg({ row, event, market, selection, odds }) {
  const label = displaySelectionLabel(row, event, market);
  const legacy = {
    matchId: event.canonicalMatchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: market.marketScope || "match",
    marketFamily: row.familyLabel,
    threshold: market.threshold ?? null,
    selection: selection.name,
    label,
    odds: Number(selection.odds),
    modelProbabilityPct: null,
    fairOdds: null,
    expectedValuePct: null,
    evidenceLabel: `Quota Sisal verificata nello snapshot ${odds.retrievedAt}; probabilità non validata`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "CONTRACT_VERIFIED_PROBABILITY_NOT_VALIDATED",
    evStatus: "NOT_MODELLED",
    overlapKey: `statistical:${row.subfamily}:${market.variantName || market.threshold || "main"}:${selection.name}`,
    semanticKeys: [`statistical-b:${row.subfamily}:${selection.providerSelectionId}`],
  };
  const leg = attachBetSelection(legacy, {
    provider: odds.provider,
    marketObject: market,
    selectionObject: selection,
    quoteSource: { provider: odds.provider, retrievedAt: event.retrievedAt || odds.retrievedAt, sourceUrl: odds.sourceUrl, snapshotPath: "data/normalized/odds/sisal/serie-a.json", rawFile: odds.rawFile, acquisition: odds.acquisition },
    reliability: { level: "Non valutabile", reason: "Contratto quotato ma probabilità e calibrazione non hanno superato il gate statistico." },
    compatibility: { status: "CONTRACT_VERIFIED_PROBABILITY_NOT_VALIDATED", reason: row.reason, modelTarget: null, bookmakerTarget: `${market.marketName} · ${market.variantName || selection.name}` },
    evaluationStatus: "NOT_MODELLED",
    evaluationKind: "NOT_MODELLED",
    warnings: ["STATISTICAL_GATE_NOT_PASSED", "CURRENT_AVAILABILITY_NOT_VERIFIED"],
    risks: [row.reason],
  });
  leg.lineupEligibility = { eligible: true, status: "not-applicable", source: null, sourceUpdatedAt: null, playerId: null, playerName: null };
  leg.catalogOrigin = "statistical-b-not-modelled";
  leg.coverageClassification = "B";
  leg.statisticalFamily = row.family;
  leg.statisticalSubfamily = row.subfamily;
  return leg;
}

function applyValidatedEvaluation(leg, evaluation) {
  if (!evaluation) return leg;
  const copy = JSON.parse(JSON.stringify(leg));
  copy.modelProbabilityPct = evaluation.modelProbabilityPct;
  copy.fairOdds = evaluation.fairOdds;
  copy.expectedValuePct = evaluation.expectedValuePct;
  copy.evStatus = "EV_CALCOLABILE";
  copy.compatibility = "COMPATIBILE";
  copy.evidenceLabel = `${evaluation.distribution} discreta · holdout temporale 190 gare`;
  copy.catalogOrigin = "statistical-model-validated";
  copy.coverageClassification = "A";
  copy.betSelection.operational.reliability = {
    level: evaluation.reliability || "Media",
    reason: evaluation.reliability === "Bassa"
      ? `Distribuzione validata su holdout temporale, ma storico Serie A precedente assente per: ${(evaluation.limitedHistoryTeams || []).join(", ")}; deduzione prudenziale ampliata.`
      : "Distribuzione discreta validata su holdout temporale walk-forward di 190 partite; incertezza applicata alla probabilita prudente.",
  };
  copy.betSelection.evaluation = {
    modelProbabilityPct: evaluation.modelProbabilityPct,
    fairOdds: evaluation.fairOdds,
    expectedValuePct: evaluation.expectedValuePct,
    status: "EV_CALCOLABILE",
    kind: "DISCRETE_COUNT_TEMPORAL_HOLDOUT",
    prudentProbabilityPct: evaluation.prudentProbabilityPct,
    conservativeExpectedValuePct: evaluation.conservativeExpectedValuePct,
    probabilitySemantics: "ABSOLUTE_EVENT",
    fairOddsBasis: "CENTRAL_DISCRETE_PROBABILITY",
    expectedValueBasis: "CENTRAL_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE",
    provenance: {
      source: "data/analysis/serie-a-md06-statistical-models-2026-10-10.json",
      modelTarget: `statistical:${evaluation.subfamily}`,
      distribution: evaluation.distribution,
      mean: evaluation.mean,
      uncertaintyDeductionPp: evaluation.uncertaintyDeductionPp,
      validation: evaluation.validation,
    },
  };
  copy.betSelection.compatibility = { status: "COMPATIBILE", reason: "Contratto Sisal full-time riconciliato con il conteggio storico e distribuzione discreta validata fuori campione.", modelTarget: `statistical:${evaluation.subfamily}`, bookmakerTarget: `${copy.market} · ${copy.variant || copy.selection}` };
  copy.betSelection.warnings = (copy.betSelection.warnings || []).filter(warning => !["STATISTICAL_GATE_NOT_PASSED", "RELIABILITY_NOT_EVALUABLE"].includes(warning));
  copy.betSelection.risks = [
    `UNCERTAINTY_DEDUCTION_${evaluation.uncertaintyDeductionPp}_PP`,
    ...(evaluation.limitedHistoryTeams?.length ? [`LIMITED_PRIOR_SERIE_A_HISTORY_${evaluation.limitedHistoryTeams.join("_").toUpperCase()}`] : []),
    "CURRENT_QUOTE_AVAILABILITY_FROM_2026_10_09_SNAPSHOT",
  ];
  return copy;
}

function reconstructStatisticalCoverage({ odds, existingSelectionIds = new Set(), statisticalModels = null }) {
  const rows = [];
  const addableLegs = [];
  for (const event of odds.events || []) for (const market of event.markets || []) for (const selection of market.selections || []) {
    const row = classifyCandidate(event, market, selection);
    if (!row) continue;
    const selectionId = `bet:${String(odds.provider).toLowerCase()}:${event.canonicalMatchId}:${selection.providerSelectionId}`;
    const enriched = { ...row, selectionId, alreadyPresent: existingSelectionIds.has(selectionId) };
    rows.push(enriched);
    if (row.state === STATES.B && !enriched.alreadyPresent) {
      const base = statisticalCoverageLeg({ row, event, market, selection, odds });
      addableLegs.push(applyValidatedEvaluation(base, statisticalModels?.evaluations?.[String(selection.providerSelectionId)]));
    }
  }
  const countBy = getter => rows.reduce((counts, row) => { const key = getter(row); counts[key] = (counts[key] || 0) + 1; return counts; }, {});
  return {
    rows,
    addableLegs,
    summary: {
      candidates: rows.length,
      states: countBy(row => row.state),
      families: countBy(row => row.family),
      addableNotModelled: addableLegs.length,
      validatedDiscreteModels: addableLegs.filter(leg => leg.coverageClassification === "A").length,
      remainingNotModelled: addableLegs.filter(leg => leg.coverageClassification !== "A").length,
      alreadyPresent: rows.filter(row => row.alreadyPresent).length,
      currentAvailability: "NOT_VERIFIED_AFTER_SNAPSHOT",
    },
  };
}

module.exports = { STATES, ADDABLE, classifyCandidate, reconstructStatisticalCoverage, statisticalCoverageLeg, applyValidatedEvaluation };
