'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {plan} = require('./package-pages.cjs');
const result = plan(), files = new Set(result.files);
assert(result.totalBytes < 1_000_000_000, 'Published site must fit the Pages limit');
for (const file of result.files) {
  assert(!/^(output|reports|docs|data\/raw|data\/analysis)\//.test(file), 'Internal artifact published: ' + file);
  assert(!/^data\/predictions\/(?:champions-event-snapshots|exact-score-research|player-spatial-prospective|player-spatial-v2-prospective|spatial-prospective)\//.test(file), 'Research snapshot published: ' + file);
  assert(!file.startsWith('data/normalized/referee-history/'), 'Internal referee archive published: ' + file);
}
for (const file of ['index.html', 'offline.html', 'download.html', 'manifest.webmanifest', 'sw.js',
  'scripts/standings.js', 'scripts/objective-metrics.js', 'js/services/data-service.js',
  'data/normalized/matches.json', 'data/normalized/official-starter-registry.json',
  'data/generated/readings/index.json', 'data/generated/schedina-index-2026-27.json',
  'data/sources/official-lineups-2026-27.json', 'data/sources/team-pages/shirt-numbers-2026-27.json',
  'data/derived/champions-md03/upcoming-forecasts.json', 'data/predictions/snapshots/manifest.json']) {
  assert(files.has(file), 'Missing runtime dependency: ' + file);
}
for (const file of result.files.filter(f => f.endsWith('.html'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const value = match[1].split(/[?#]/)[0];
    if (!value || /^(?:[a-z]+:|\/\/|\/)/i.test(value)) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), value));
    if (fs.existsSync(target) && fs.statSync(target).isFile()) assert(files.has(target), 'Missing HTML dependency: ' + target);
  }
}
console.log(`PASS Pages package: ${result.files.length} files, ${result.totalBytes} bytes; runtime dependencies retained, internal archives excluded`);
