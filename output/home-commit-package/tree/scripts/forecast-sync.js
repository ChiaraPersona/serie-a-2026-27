"use strict";

const { isDeepStrictEqual } = require("node:util");
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

function assertUniqueSelectionIds(selections, label = "pronostici") {
  const seen = new Set();
  const duplicates = [];
  for (const selection of selections || []) {
    if (!selection?.selectionId) throw new Error(`${label}: selectionId mancante`);
    if (seen.has(selection.selectionId)) duplicates.push(selection.selectionId);
    seen.add(selection.selectionId);
  }
  if (duplicates.length) throw new Error(`${label}: selectionId duplicati: ${[...new Set(duplicates)].join(", ")}`);
}

function mergeDefined(previous, incoming) {
  if (incoming === undefined) return clone(previous);
  if (incoming === null || typeof incoming !== "object" || Array.isArray(incoming)) return clone(incoming);
  const base = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {};
  return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(incoming)])]
    .map(key => [key, mergeDefined(base[key], incoming[key])]));
}

function quoteAvailable(selection) {
  const quote = selection?.betSelection?.quote;
  return finite(quote?.decimal) && Number(quote.decimal) > 0
    && quote.availability === "AVAILABLE_AT_SNAPSHOT";
}

function preserveQuote(previous, next) {
  if (!quoteAvailable(previous) || quoteAvailable(next)) return next;
  const merged = clone(next);
  merged.odds = previous.odds;
  merged.providerMarketId = previous.providerMarketId;
  merged.providerSelectionId = previous.providerSelectionId;
  merged.marketUpdatedAt = previous.marketUpdatedAt;
  merged.compatibility = previous.compatibility;
  merged.betSelection = merged.betSelection || {};
  merged.betSelection.identity = clone(previous.betSelection?.identity);
  merged.betSelection.quote = clone(previous.betSelection?.quote);
  merged.betSelection.compatibility = clone(previous.betSelection?.compatibility);
  return merged;
}

function withoutVolatileGenerationMetadata(selection) {
  const comparable = clone(selection);
  if (comparable && typeof comparable === "object") {
    delete comparable.catalogOrder;
    if (comparable.betSelection?.evaluation?.provenance) delete comparable.betSelection.evaluation.provenance.predictionGeneratedAt;
  }
  return comparable;
}

/**
 * Incremental forecast merge. Missing records are retained, records with the
 * same selectionId are updated, and deletion is possible only through an
 * explicit withdrawnSelectionIds entry (or forecastStatus="withdrawn").
 */
function upsertForecastSelections({
  existing = [],
  incoming = [],
  withdrawnSelectionIds = [],
  allowQuoteUpdates = false,
} = {}) {
  assertUniqueSelectionIds(existing, "catalogo esistente");
  assertUniqueSelectionIds(incoming, "aggiornamento pronostici");
  const withdrawn = new Set((withdrawnSelectionIds || []).map(String));
  for (const selection of incoming) {
    if (selection.forecastStatus === "withdrawn") withdrawn.add(String(selection.selectionId));
  }

  const incomingById = new Map(incoming.map(selection => [selection.selectionId, selection]));
  const result = [];
  const updated = [];
  const preserved = [];
  const added = [];

  for (const previous of existing) {
    const id = previous.selectionId;
    if (withdrawn.has(id)) continue;
    const change = incomingById.get(id);
    if (!change) {
      result.push(clone(previous));
      preserved.push(id);
      continue;
    }
    let merged = mergeDefined(previous, change);
    if (!allowQuoteUpdates) merged = preserveQuote(previous, merged);
    if (isDeepStrictEqual(withoutVolatileGenerationMetadata(previous), withoutVolatileGenerationMetadata(merged))) {
      result.push(clone(previous));
      preserved.push(id);
      incomingById.delete(id);
      continue;
    }
    result.push(merged);
    updated.push(id);
    incomingById.delete(id);
  }

  for (const selection of incoming) {
    if (!incomingById.has(selection.selectionId) || withdrawn.has(selection.selectionId)) continue;
    result.push(clone(selection));
    added.push(selection.selectionId);
    incomingById.delete(selection.selectionId);
  }

  assertUniqueSelectionIds(result, "catalogo risultante");
  return {
    selections: result,
    summary: {
      before: existing.length,
      incoming: incoming.length,
      after: result.length,
      added,
      updated,
      preserved,
      withdrawn: [...withdrawn].filter(id => existing.some(selection => selection.selectionId === id)),
      quoteUpdatesAllowed: allowQuoteUpdates,
    },
  };
}

function marketFamily(selection) {
  return selection?.suggestionAnalysis?.family
    || selection?.betSelection?.market?.family
    || selection?.marketFamily
    || selection?.market
    || "N/D";
}

// The provider adapter must supply the exact reconciled target. A quote for a
// DUO or woodwork-inclusive target cannot be bound to a standard V2 forecast.
function bindVerifiedForecastQuote({ forecast, providerSelection }) {
  const source=forecast?.betSelection,target=source?.forecastIdentity,incoming=providerSelection?.betSelection;
  if(!target||source.identity?.canonicalForecastId!==forecast.selectionId)throw new Error('CANONICAL_FORECAST_REQUIRED');
  for(const key of ['matchId','scope','subjectId','metric','threshold','direction','period','duo','postsAndCrossbarIncluded']) {
    if(target[key]!==incoming?.forecastIdentity?.[key])throw new Error(`FORECAST_CONTRACT_MISMATCH:${key}`);
  }
  if(incoming.identity?.status!=='VERIFIED_PROVIDER_IDS'||!incoming.identity.providerMarketId||!incoming.identity.providerSelectionId
    ||!finite(incoming.quote?.decimal)||Number(incoming.quote.decimal)<=1||!incoming.quote.verifiedAt||!incoming.quote.source?.provider
    ||incoming.quote.availability!=='AVAILABLE_AT_SNAPSHOT')throw new Error('VERIFIED_QUOTE_REQUIRED');
  const result=clone(forecast);
  result.odds=Number(incoming.quote.decimal);
  result.providerMarketId=incoming.identity.providerMarketId;
  result.providerSelectionId=incoming.identity.providerSelectionId;
  result.betSelection.identity={...source.identity,...incoming.identity,canonicalForecastId:forecast.selectionId};
  result.betSelection.quote=clone(incoming.quote);
  result.suggestionAnalysis.quoteAvailability='AVAILABLE_AT_SNAPSHOT';
  return result;
}

function countsByMarket(selections) {
  return Object.fromEntries([...(selections || []).reduce((counts, selection) => {
    const family = marketFamily(selection);
    counts.set(family, (counts.get(family) || 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right, "it")));
}

module.exports = {
  bindVerifiedForecastQuote,
  assertUniqueSelectionIds,
  countsByMarket,
  marketFamily,
  quoteAvailable,
  upsertForecastSelections,
};
