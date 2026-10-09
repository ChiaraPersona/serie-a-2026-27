"use strict";

const { playablePolicyFor } = require("./betting-market-policy");

const CONTRACT_VERSION = 1;
const CLASSIFICATIONS = Object.freeze(["PRINCIPALE", "INTERESSANTE", "OUTSIDER", "WATCH", "ESCLUSO"]);
const RELIABILITY_LEVELS = Object.freeze(["Alta", "Media", "Bassa", "Non valutabile"]);

const present = value => value !== null && value !== undefined && value !== "";
const finite = value => present(value) && Number.isFinite(Number(value));
const stringOrNull = value => present(value) ? String(value) : null;
const arrayOfStrings = value => [...new Set((Array.isArray(value) ? value : []).filter(present).map(String))];
const providerKey = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function selectionIdFor({ matchId, provider, providerSelectionId }) {
  if (!present(matchId) || !present(provider) || !present(providerSelectionId)) return null;
  return `bet:${providerKey(provider)}:${String(matchId)}:${String(providerSelectionId)}`;
}

function normalizeClassification(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return CLASSIFICATIONS.includes(normalized) ? normalized : null;
}

function normalizeReliability(value, fallbackReason) {
  const raw = typeof value === "string" ? { level: value } : (value || {});
  const normalized = String(raw.level || "").trim().toUpperCase();
  const level = normalized === "ALTA" ? "Alta"
    : normalized === "MEDIA" ? "Media"
      : normalized === "BASSA" ? "Bassa"
        : normalized === "NON VALUTABILE" || normalized === "N/D" ? "Non valutabile"
          : "Non valutabile";
  const reason = stringOrNull(raw.reason || raw.rationale || fallbackReason)
    || "Nessun criterio di affidabilità verificabile disponibile per questa selezione.";
  return { level, reason };
}

function bookmakerSemantics({ market, selection, subject } = {}) {
  const name = String(market?.marketName || market?.name || "");
  const variant = String(market?.variantName || market?.variant || "");
  const descriptor = `${name} ${variant}`.toUpperCase();
  const duo = /\bDUO\b/.test(descriptor);
  return {
    marketName: name || null,
    variantName: variant || null,
    selectionName: stringOrNull(selection?.name || selection),
    duo,
    substituteIncluded: duo || /SOSTITUT/.test(descriptor),
    postsAndCrossbarIncluded: /PALI|TRAVERS/.test(descriptor),
    extraTimeIncluded: /\bINC\s*T\.?S\.?\b|TEMPI SUPPLEMENTARI/.test(descriptor),
    subjectType: stringOrNull(subject?.type) || (duo ? "player-plus-substitute" : null),
  };
}

function availabilityAtSnapshot(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "open") return "AVAILABLE_AT_SNAPSHOT";
  if (["closed", "suspended", "removed"].includes(normalized)) return "UNAVAILABLE_AT_SNAPSHOT";
  return "UNKNOWN";
}

function createBetSelection(input = {}) {
  const market = input.marketObject || input.market || {};
  const selection = input.selectionObject || input.selection || {};
  const provider = stringOrNull(input.provider);
  const matchId = stringOrNull(input.matchId);
  const providerMarketId = stringOrNull(input.providerMarketId || market.providerMarketId);
  const providerSelectionId = stringOrNull(input.providerSelectionId || selection.providerSelectionId);
  const selectionId = selectionIdFor({ matchId, provider, providerSelectionId });
  const semantics = bookmakerSemantics({ market, selection, subject: input.subject });
  const incompatible = semantics.duo || /^INCOMPATIBILE/.test(String(input.compatibility?.status || input.compatibility || ""));
  const classification = normalizeClassification(input.classification);
  const reliability = normalizeReliability(input.reliability, input.reliabilityReason);
  const modelProbabilityPct = incompatible ? null : (finite(input.modelProbabilityPct) ? Number(input.modelProbabilityPct) : null);
  const fairOdds = incompatible ? null : (finite(input.fairOdds) ? Number(input.fairOdds) : null);
  const expectedValuePct = incompatible ? null : (finite(input.expectedValuePct) ? Number(input.expectedValuePct) : null);
  const overlapKey = stringOrNull(input.overlapKey);
  const semanticKeys = arrayOfStrings(input.semanticKeys);
  const warnings = arrayOfStrings(input.warnings);
  const playability = playablePolicyFor({
    matchId,
    matchday: input.matchday,
    market: semantics.marketName,
    variant: semantics.variantName,
    selection: semantics.selectionName,
    label: input.label,
  });
  if (!selectionId) warnings.push("UNRESOLVED_PROVIDER_IDENTITY");
  if (!classification) warnings.push("CLASSIFICATION_NOT_AVAILABLE");
  if (reliability.level === "Non valutabile") warnings.push("RELIABILITY_NOT_EVALUABLE");
  if (incompatible) warnings.push("MODEL_BOOKMAKER_TARGET_MISMATCH");

  return {
    schemaVersion: CONTRACT_VERSION,
    selectionId,
    identity: {
      status: selectionId ? "VERIFIED_PROVIDER_IDS" : "UNRESOLVED_PROVIDER_IDS",
      matchId,
      provider,
      providerMarketId,
      providerSelectionId,
    },
    market: {
      name: semantics.marketName,
      variant: semantics.variantName,
      scope: stringOrNull(input.marketScope || market.marketScope),
      family: stringOrNull(input.marketFamily),
      threshold: finite(input.threshold ?? market.threshold) ? Number(input.threshold ?? market.threshold) : null,
      selection: semantics.selectionName,
      subject: {
        type: stringOrNull(input.subject?.type) || (input.playerId || input.player ? "player" : semantics.duo ? "player-plus-substitute" : "match"),
        id: stringOrNull(input.subject?.id || input.playerId),
        name: stringOrNull(input.subject?.name || input.player || (semantics.duo ? semantics.variantName : null)),
        teamId: stringOrNull(input.subject?.teamId || input.teamId),
      },
      bookmakerSemantics: semantics,
    },
    quote: {
      decimal: finite(input.odds ?? selection.odds) ? Number(input.odds ?? selection.odds) : null,
      verifiedAt: stringOrNull(input.verifiedAt || input.quoteSource?.retrievedAt),
      marketUpdatedAt: stringOrNull(input.marketUpdatedAt || market.updatedAt),
      availability: availabilityAtSnapshot(input.providerStatus || selection.status || market.status),
      providerStatus: stringOrNull(input.providerStatus || selection.status || market.status),
      source: {
        provider,
        url: stringOrNull(input.quoteSource?.sourceUrl || input.quoteSource?.url),
        snapshotPath: stringOrNull(input.quoteSource?.snapshotPath),
        rawFile: stringOrNull(input.quoteSource?.rawFile),
        acquisition: stringOrNull(input.quoteSource?.acquisition),
      },
    },
    operational: {
      classification,
      classificationReason: stringOrNull(input.classificationReason),
      reliability,
      playability,
    },
    evaluation: {
      modelProbabilityPct,
      individualModelProbabilityPct: finite(input.individualModelProbabilityPct) ? Number(input.individualModelProbabilityPct) : null,
      fairOdds,
      expectedValuePct,
      status: stringOrNull(input.evaluationStatus),
    },
    compatibility: {
      status: stringOrNull(input.compatibility?.status || input.compatibility) || "NOT_EVALUATED",
      reason: stringOrNull(input.compatibility?.reason || input.compatibilityReason),
      modelTarget: stringOrNull(input.compatibility?.modelTarget || input.modelTarget),
      bookmakerTarget: stringOrNull(input.compatibility?.bookmakerTarget || input.bookmakerTarget),
    },
    overlap: { overlapKey, semanticKeys },
    warnings: [...new Set(warnings)],
    risks: arrayOfStrings(input.risks),
  };
}

function attachBetSelection(legacyLeg, input = {}) {
  const betSelection = createBetSelection({
    matchId: legacyLeg.matchId,
    providerMarketId: legacyLeg.providerMarketId,
    providerSelectionId: legacyLeg.providerSelectionId,
    market: legacyLeg.market,
    marketScope: legacyLeg.marketScope,
    marketFamily: legacyLeg.marketFamily,
    threshold: legacyLeg.threshold,
    selection: legacyLeg.selection,
    odds: legacyLeg.odds,
    marketUpdatedAt: legacyLeg.marketUpdatedAt,
    player: legacyLeg.player,
    playerId: legacyLeg.playerId,
    teamId: legacyLeg.teamId,
    modelProbabilityPct: legacyLeg.modelProbabilityPct,
    individualModelProbabilityPct: legacyLeg.individualV2ProbabilityPct,
    fairOdds: legacyLeg.fairOdds,
    expectedValuePct: legacyLeg.expectedValuePct,
    overlapKey: legacyLeg.overlapKey,
    semanticKeys: legacyLeg.semanticKeys,
    compatibility: legacyLeg.compatibility,
    evaluationStatus: legacyLeg.evStatus,
    ...input,
  });
  return { ...legacyLeg, selectionId: betSelection.selectionId, betSelection };
}

module.exports = {
  CONTRACT_VERSION,
  CLASSIFICATIONS,
  RELIABILITY_LEVELS,
  selectionIdFor,
  normalizeClassification,
  normalizeReliability,
  bookmakerSemantics,
  createBetSelection,
  attachBetSelection,
};
