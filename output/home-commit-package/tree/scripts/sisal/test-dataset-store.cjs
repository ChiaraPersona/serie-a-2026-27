'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { readJsonFile, writeSisalDataset, MAX_BYTES } = require('./dataset-store.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sisal-store-test-'));
try {
  const file = path.join(directory, 'serie-a.json');
  const dataset = { provider: 'sisal', retrievedAt: '2026-10-28T16:22:57.699Z', summary: { events: 2 }, events: [
    { providerEventId: '0001', canonicalMatchId: 'fixture-a', regulatorEventId: 0, rawFile: 'raw.json.gz', markets: Array.from({ length: 12 }, (_, i) => ({ providerMarketId: String(i), threshold: i / 2, marketName: 'TIRI GIOCATORE (DUO)', originalIdentifiers: { offerId: null, brandId: 0 }, selections: [{ providerSelectionId: `000${i}`, odds: 1.85, modelProbability: null }] })) },
    { providerEventId: '0002', markets: [] },
  ] };
  fs.writeFileSync(file, JSON.stringify(dataset));
  assert.deepEqual(readJsonFile(file), dataset, 'Legacy flat files remain readable');
  const report = writeSisalDataset(file, dataset, { maxBytes: 750 });
  assert(report.shards > 1, 'Large events must span multiple shards');
  const index = JSON.parse(fs.readFileSync(file));
  for (const entry of index.eventIndex) for (const ref of entry.marketFiles) assert(ref.bytes <= 750);
  assert.deepEqual(readJsonFile(file), dataset, 'IDs, nulls, zero, thresholds, DUO, quotes and order must survive');
  const first = fs.readFileSync(file, 'utf8');
  writeSisalDataset(file, dataset, { maxBytes: 750 });
  assert.equal(fs.readFileSync(file, 'utf8'), first, 'Deterministic index');
  const reference = index.eventIndex[0].marketFiles[0], shard = path.join(directory, reference.file), text = fs.readFileSync(shard, 'utf8');
  fs.writeFileSync(shard, text.replace('1.85', '1.95'));
  assert.throws(() => readJsonFile(file), /Corrupt Sisal shard/);
  fs.writeFileSync(shard, text);
  fs.unlinkSync(shard);
  assert.throws(() => readJsonFile(file), /ENOENT/);
  fs.writeFileSync(shard, text);
  index.eventIndex[0].marketFiles[0].file = '../outside.json';
  fs.writeFileSync(file, JSON.stringify(index));
  assert.throws(() => readJsonFile(file), /Invalid Sisal shard path/);
  fs.writeFileSync(file, first);
  const tooLarge = structuredClone(dataset); tooLarge.events[0].markets[0].marketName = 'x'.repeat(2000);
  assert.throws(() => writeSisalDataset(file, tooLarge, { maxBytes: 750 }), /Single Sisal market/);
  assert.equal(fs.readFileSync(file, 'utf8'), first, 'A rejected write must preserve the previous index');
  assert.deepEqual(readJsonFile(file), dataset);
  assert(MAX_BYTES < 50 * 1024 * 1024);
  console.log('OK Sisal storage: legacy, split events, exact round trip, deterministic writes, integrity, missing shard, path guard and failed-write preservation');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
