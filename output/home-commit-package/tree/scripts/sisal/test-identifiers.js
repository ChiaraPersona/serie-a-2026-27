const { readJsonFile: storageReadJson } = require('./dataset-store.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { normalizeSisalCapture } = require('./normalize');
const { originalIdentifiers, unavailableIdentifiers, domIdentifiers, enrichIdentifiers, stringifySisalDataset, FIELDS } = require('./identifiers');
const { createBetSelection } = require('../betting-selection-contract');
const root = path.resolve(__dirname, '../..');
const config = require('../../data/sources/sisal-odds.json');
const strip = value => JSON.parse(JSON.stringify(value, (key, entry) => ['originalIdentifiers', 'identifierProvenance'].includes(key) ? undefined : entry));
const normalize = (rawFile, competitionKey) => normalizeSisalCapture({
  capture: JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, rawFile)))),
  competitionKey, competition: config.competitions[competitionKey], rawFile, root,
});

for (const competition of ['serie-a', 'champions-league']) {
  const dataset = storageReadJson(path.join(root, 'data/normalized/odds/sisal', `${competition}.json`));
  const files = [...new Set([dataset.rawFile, ...(dataset.rawFiles || []), ...dataset.events.map(event => event.rawFile)].filter(Boolean))];
  const captures = files.map(file => normalize(file, competition));
  const enriched = enrichIdentifiers(dataset, captures);
  assert.deepEqual(strip(enriched), strip(dataset), `${competition}: enrichment must preserve all legacy data`);
  assert.deepEqual(enrichIdentifiers(enriched, captures), enriched, 'enrichment must be idempotent');
  for (const event of enriched.events) {
    for (const [level, values] of [['event', [event]], ['market', event.markets], ['selection', event.markets.flatMap(market => market.selections)]]) {
      for (const value of values) {
        assert.deepEqual(Object.keys(value.originalIdentifiers), FIELDS[level]);
        assert(['provider-response', 'synthetic-dom', 'unverified'].includes(value.identifierProvenance.kind));
      }
    }
  }
}

// Immutable real evidence: do not require current odds to match a shared ticket.
const evidence = normalize('data/raw/odds/sisal/serie-a/2026-10-15T17-42-11-541Z.json.gz', 'serie-a');
const saved = storageReadJson(path.join(root, 'data/normalized/odds/sisal/serie-a.json'));
const examples = [
  ['4902590', 3, 0, 2, 400, 3, '5374643143'],
  ['4902588', 3, 0, 1, 250, 3, '5374622790'],
  ['4902589', 3, 0, 3, 162, 3, '5374652624'],
  ['4902588', 28231, 65557, 1, 1542, 28231, '5379608122'],
  ['4902588', 28231, 65564, 1, 629, 28231, '5379608479'],
  ['4902588', 3, 0, 1, 233, 3, '5374622790'],
];
for (const [eventId, code, info, outcome, ticketOdds, classCode, selectionId] of examples) {
  const event = evidence.events.find(event => event.providerEventId === eventId);
  const markets = event.markets.filter(market => market.originalIdentifiers.codiceScommessa === code && market.originalIdentifiers.idInfoAggiuntiva === info && market.originalIdentifiers.codiceClasseEsito === classCode);
  assert.equal(markets.length, 1);
  const market = markets[0];
  const selection = market.selections.find(selection => selection.originalIdentifiers.codiceEsito === outcome);
  assert.equal(selection.providerSelectionId, selectionId);
  assert.equal(selection.originalIdentifiers.codiceScommessaAAMS, code);
  assert.equal(selection.originalIdentifiers.codiceEsitoAAMS, outcome);
  assert.equal(selection.identifierProvenance.kind, 'provider-response');
  if (saved.rawFile === evidence.rawFile) {
    const savedEvent = saved.events.find(row => row.providerEventId === eventId);
    const savedMarket = savedEvent.markets.find(row => row.originalIdentifiers.idInfoAggiuntiva === info && row.originalIdentifiers.codiceScommessa === code);
    assert.deepEqual(savedMarket.originalIdentifiers, market.originalIdentifiers, 'saved normalized dataset must expose the original market identifiers');
    assert.deepEqual(savedMarket.selections.find(row => row.providerSelectionId === selectionId).originalIdentifiers, selection.originalIdentifiers);
  }
  const input = { provider: 'sisal', matchId: event.canonicalMatchId, marketObject: market, selectionObject: selection, odds: selection.odds };
  assert.deepEqual(createBetSelection(input), createBetSelection({ ...input, marketObject: strip(market), selectionObject: strip(selection) }), 'BetSelection identity, pricing and model semantics must remain identical');
  if (code === 28231) assert.equal(createBetSelection(input).market.bookmakerSemantics.duo, true);
  // Shared-ticket prices can diverge; never overwrite the snapshot with them.
  assert.equal(selection.oddsRaw, code === 28231 ? (info === 65557 ? 2500 : 900) : eventId === '4902588' ? 250 : ticketOdds);
}
assert.equal(originalIdentifiers({ idInfoAggiuntiva: 0 }, 'market', {}).originalIdentifiers.idInfoAggiuntiva, 0);
assert.equal(originalIdentifiers({}, 'market', {}).originalIdentifiers.idInfoAggiuntiva, null);
assert.deepEqual(JSON.parse(stringifySisalDataset(evidence)), evidence, 'compact metadata serialization must be lossless');
assert.deepEqual(JSON.parse(stringifySisalDataset({ originalIdentifiers: { key: 'nested {literal} and "quotes"' } })), { originalIdentifiers: { key: 'nested {literal} and "quotes"' } });
for (const [level, value] of [['market', { providerMarketId: 'dom:1:3:0' }], ['selection', { providerSelectionId: 'esito_1_3_0_1' }]]) {
  const result = unavailableIdentifiers(value, level, { retrievedAt: '2026-10-15', sourceFile: 'dom.json' });
  assert.equal(result.identifierProvenance.kind, 'synthetic-dom');
  assert(Object.values(result.originalIdentifiers).every(value => value === null));
  assert.deepEqual(domIdentifiers(value, undefined, level, { retrievedAt: '2026-10-15', sourceFile: 'dom.json' }), result);
}
const previous = evidence.events[0].markets[0].selections[0];
assert.deepEqual(domIdentifiers({ ...previous, odds: 99 }, previous, 'selection', { retrievedAt: '2030-01-01' }), {
  originalIdentifiers: previous.originalIdentifiers, identifierProvenance: previous.identifierProvenance,
}, 'DOM repricing must preserve original identifier provenance, not claim a new provider observation');
assert.equal(domIdentifiers({ providerSelectionId: '123' }, { providerSelectionId: '123' }, 'selection', {}).identifierProvenance.kind, 'unverified');
console.log('OK Sisal identifiers: additive/idempotent enrichment, null vs zero, DOM distinction, six real selections and unchanged BetSelection/DUO semantics');
