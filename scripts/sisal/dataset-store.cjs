'use strict';

// Disk layout only: callers receive the original provider dataset unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const FORMAT = 'sisal-event-shards-v1';
const MAX_BYTES = 8 * 1024 * 1024;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, text);
  fs.renameSync(temporary, file);
}

function readJsonFile(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload?.storageFormat !== FORMAT) return payload;
  const directory = path.dirname(path.resolve(file));
  if (!payload.dataset || !Array.isArray(payload.eventIndex)) throw Error('Invalid Sisal shard index');
  const events = payload.eventIndex.map(entry => {
    const markets = [];
    for (const reference of entry.marketFiles) {
      // Only relative children of the dataset directory may be loaded.
      if (typeof reference.file !== 'string' || path.isAbsolute(reference.file) || reference.file.includes('\\')) throw Error('Invalid Sisal shard path');
      const resolved = path.resolve(directory, reference.file);
      if (!resolved.startsWith(directory + path.sep)) throw Error('Invalid Sisal shard path');
      const text = fs.readFileSync(resolved, 'utf8');
      if (Buffer.byteLength(text) !== reference.bytes || digest(text) !== reference.sha256) throw Error(`Corrupt Sisal shard: ${reference.file}`);
      const rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw Error('Invalid Sisal markets shard');
      for (const market of rows) markets.push(market);
    }
    return { ...entry.event, markets };
  });
  return { ...payload.dataset, events };
}

function writeSisalDataset(file, dataset, { maxBytes = MAX_BYTES } = {}) {
  if (dataset?.provider !== 'sisal' || !Array.isArray(dataset.events)) throw Error('Invalid Sisal dataset');
  if (!Number.isInteger(maxBytes) || maxBytes < 4 || maxBytes > MAX_BYTES) throw Error('Invalid Sisal shard size');
  const directory = path.dirname(path.resolve(file));
  const folder = path.basename(file, '.json') + '-events';
  const { events, ...metadata } = dataset;
  const pending = new Map();
  const eventIndex = events.map((event, index) => {
    const { markets, ...header } = event;
    if (!Array.isArray(markets)) throw Error('Invalid Sisal event markets');
    const marketFiles = [];
    const slug = String(event.canonicalMatchId || event.providerEventId || index).replace(/[^a-zA-Z0-9_-]/g, '_');
    let rows = [], bytes = 3;
    const flush = () => {
      if (!rows.length) return;
      const text = '[' + rows.join(',') + ']\n', sha256 = digest(text);
      const relative = `${folder}/${slug}-${marketFiles.length}-${sha256.slice(0, 16)}.json`;
      pending.set(relative, text);
      marketFiles.push({ file: relative, bytes: Buffer.byteLength(text), sha256 });
      rows = []; bytes = 3;
    };
    for (const market of markets) {
      const text = JSON.stringify(market), size = Buffer.byteLength(text);
      if (size + 3 > maxBytes) throw Error(`Single Sisal market exceeds ${maxBytes} bytes`);
      if (bytes + size + (rows.length ? 1 : 0) > maxBytes) flush();
      bytes += size + (rows.length ? 1 : 0); rows.push(text);
    }
    flush();
    return { event: header, marketFiles };
  });
  const manifest = JSON.stringify({ storageFormat: FORMAT, dataset: metadata, eventIndex }, null, 2) + '\n';
  if (Buffer.byteLength(manifest) > MAX_BYTES) throw Error('Sisal index exceeds size limit');
  // Publish the index only once every referenced file is present. Existing shards
  // are immutable, so concurrent readers of the previous index remain valid.
  for (const [relative, text] of pending) {
    const target = path.join(directory, relative);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== text) atomicWrite(target, text);
  }
  atomicWrite(file, manifest);
  return { events: events.length, shards: pending.size, maxBytes: Math.max(Buffer.byteLength(manifest), ...[...pending.values()].map(text => Buffer.byteLength(text))) };
}

// Generic JSON writer for legacy orchestration helpers that may also save odds.
function writeJsonFile(file, dataset) {
  if (dataset?.provider === 'sisal' && Array.isArray(dataset.events)) return writeSisalDataset(file, dataset);
  atomicWrite(file, JSON.stringify(dataset, null, 2) + '\n');
}

module.exports = { readJsonFile, writeSisalDataset, writeJsonFile, FORMAT, MAX_BYTES };
