// Original provider values retain their JSON types. Missing values are never inferred
// from DOM IDs, names, normalized aliases or the observed shared-link format.
const FIELDS = {
  event: ['eventId', 'regulatorEventId', 'brandId', 'codicePalinsesto', 'codiceAvvenimento', 'codiceDisciplina', 'codiceManifestazione', 'key', 'keyMultibrand'],
  market: ['marketId', 'eventId', 'brandId', 'codicePalinsesto', 'codiceAvvenimento', 'codiceScommessa', 'codiceClasseEsito', 'idInfoAggiuntiva', 'key', 'keyMultibrand', 'offerId', 'tradingSegmentKey'],
  selection: ['selectionId', 'brandId', 'codiceEsito', 'codiceScommessaAAMS', 'codiceEsitoAAMS'],
};

// Keep only the new scalar metadata objects compact; legacy JSON stays readable.
function stringifySisalDataset(dataset) {
  return JSON.stringify(dataset, null, 2).replace(/"(?:originalIdentifiers|identifierProvenance)": \{[^{}]*\}/g, match => {
    const [key, value] = Object.entries(JSON.parse(`{${match}}`))[0];
    return `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  }) + '\n';
}

function originalIdentifiers(value, level, provenance) {
  return {
    originalIdentifiers: Object.fromEntries(FIELDS[level].map(key => [key, value?.[key] ?? null])),
    identifierProvenance: provenance,
  };
}

function unavailableIdentifiers(value, level, dataset) {
  const id = value[{ event: 'providerEventId', market: 'providerMarketId', selection: 'providerSelectionId' }[level]];
  const synthetic = /^(dom:|esito_)/.test(String(id || ''));
  return originalIdentifiers(null, level, {
    kind: synthetic ? 'synthetic-dom' : 'unverified',
    sourceFile: value.sourceFile || dataset.sourceFile || null,
    rawFile: null,
    responseUrl: null,
    retrievedAt: value.retrievedAt || dataset.retrievedAt || null,
  });
}

function domIdentifiers(value, previous, level, source) {
  return previous?.originalIdentifiers && previous?.identifierProvenance
    ? { originalIdentifiers: previous.originalIdentifiers, identifierProvenance: previous.identifierProvenance }
    : unavailableIdentifiers(value, level, source);
}

// Enrich only by exact provider IDs; retain every existing property and ordering.
function enrichIdentifiers(dataset, normalizedCaptures) {
  const candidates = normalizedCaptures.flatMap(capture => capture.events);
  const metadata = (value, source, level, event) => source
    ? { originalIdentifiers: source.originalIdentifiers, identifierProvenance: source.identifierProvenance }
    : value.originalIdentifiers && value.identifierProvenance
      ? { originalIdentifiers: value.originalIdentifiers, identifierProvenance: value.identifierProvenance.sourceRef === 'event' ? event.identifierProvenance : value.identifierProvenance }
      : unavailableIdentifiers(value, level, dataset);
  return { ...dataset, events: dataset.events.map(event => {
    const source = candidates.find(candidate => candidate.providerEventId === event.providerEventId && candidate.identifierProvenance.rawFile === (event.rawFile || dataset.rawFile))
      || candidates.find(candidate => candidate.providerEventId === event.providerEventId);
    const markets = new Map((source?.markets || []).map(market => [market.providerMarketId, market]));
    return { ...event, ...metadata(event, source, 'event', event), markets: event.markets.map(market => {
      const sourceMarket = markets.get(market.providerMarketId);
      const selections = new Map((sourceMarket?.selections || []).map(selection => [selection.providerSelectionId, selection]));
      return { ...market, ...metadata(market, sourceMarket, 'market', event), selections: market.selections.map(selection => ({
        ...selection, ...metadata(selection, selections.get(selection.providerSelectionId), 'selection', event),
      })) };
    }) };
  }) };
}

module.exports = { FIELDS, originalIdentifiers, unavailableIdentifiers, domIdentifiers, enrichIdentifiers, stringifySisalDataset };
