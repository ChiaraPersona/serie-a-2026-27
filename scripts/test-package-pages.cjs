'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {plan, internalFiles,projectionInternalFiles} = require('./package-pages.cjs');
const {unpack}=require('./reading-archive-codec.cjs');
const {hydrateSync}=require('../js/services/reading-shared.js');
const result = plan(), files = new Set(result.files);
const retired=result.retiredFiles;
assert(files.has('js/services/archive-json.js'),'Missing archived reading decoder');
for(const file of projectionInternalFiles)assert(!files.has(file),'Projection compiler input published: '+file);
for(const day of [2,3,4]){
 const registry=`data/generated/champions-readings/registry-md${day}.json`;
 assert.equal(files.has(registry),!retired.has(registry),'Registry retirement mismatch: '+registry);
 for(let i=1;i<=18;i++){const file=`data/generated/champions-readings/ucl-2026-27-md0${day}-${String(i).padStart(2,'0')}.json`;assert.equal(files.has(file),!retired.has(file),'Fixture reading retirement mismatch: '+file);}
}
for(const row of result.archiveStats){
  assert(row.afterBytes<row.beforeBytes,'Archive grew: '+row.file);
  assert(row.gzipAfter<row.gzipBefore,'Archive transfer grew: '+row.file);
}
assert(result.totalBytes < result.sourceBytes, 'Deploy JSON should be compacted');
assert.equal(result.savedBytes, result.sourceBytes - result.totalBytes);
assert(result.totalBytes < 1_000_000_000, 'Published site must fit the Pages limit');
for (const file of result.files) {
  assert(!file.startsWith('fantachampions-2026-27/'), 'Offline fantasy analysis published: ' + file);
  assert(!/^(output|reports|docs|data\/raw|data\/analysis|data\/technical-archive)\//.test(file), 'Internal artifact published: ' + file);
  assert(!/^data\/predictions\/(?:champions-event-snapshots|exact-score-research|player-spatial-prospective|player-spatial-v2-prospective|spatial-prospective)\//.test(file), 'Research snapshot published: ' + file);
  assert(!file.startsWith('data/normalized/referee-history/'), 'Internal referee archive published: ' + file);
}
for (const file of ['index.html', 'offline.html', 'download.html', 'manifest.webmanifest', 'sw.js',
  'scripts/standings.js', 'scripts/objective-metrics.js', 'js/services/data-service.js',
  'data/normalized/matches.json', 'data/normalized/official-starter-registry.json',
  'data/generated/readings/index.json', 'data/generated/schedina-index-2026-27.json',
  'data/sources/official-lineups-2026-27.json', 'data/sources/team-pages/shirt-numbers-2026-27.json',
  'data/normalized/champions-md02-ui-2026-27.json',
  'data/generated/champions-teams/index.json', 'js/pages/champions-team-data.mjs',
  'data/predictions/snapshots/manifest.json']) {
  assert(files.has(file), 'Missing runtime dependency: ' + file);
}
// These URLs are composed at runtime and cannot be covered by basename scans.
const tracked = require('node:child_process').execFileSync('git', ['ls-files', '-z'], {maxBuffer: 32 * 1024 * 1024})
  .toString().split('\0').filter(Boolean);
for (const file of tracked.filter(file =>
  /^data\/normalized\/(?:predictions-md\d+|schedina-md\d+)\.json$/.test(file) ||
  /^data\/generated\/readings\/(?:matches|catalogs)\/[^/]+\.json$/.test(file) ||
  /^data\/predictions\/snapshots\/\d{4}-\d{2}\/md-\d{2}\.json$/.test(file))) {
  assert.equal(files.has(file),!retired.has(file), 'Dynamic runtime dependency / retirement mismatch: ' + file);
}
const browserCode = result.files.filter(f => /\.(?:m?js|html)$/.test(f))
  .map(file => ({file, source: fs.readFileSync(file, 'utf8')}));
for (const internal of internalFiles) {
  assert(!files.has(internal), 'Build-only artifact published: ' + internal);
  const basename = path.posix.basename(internal);
  for (const consumer of browserCode) assert(!consumer.source.includes(basename),
    `Excluded artifact is referenced by ${consumer.file}: ${internal}`);
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
// Optional full-package audit checks the actual output against every canonical input.
const siteIndex = process.argv.indexOf('--site');
if (siteIndex >= 0) {
  const site = path.resolve(process.argv[siteIndex + 1]);
  let bytes = 0;
  for (const file of result.files) {
    const source = fs.readFileSync(file), published = fs.readFileSync(path.join(site, file));
    bytes += published.length;
    if (file.endsWith('.json')) assert.deepEqual(hydrateSync(unpack(JSON.parse(published)),hash=>{
      const block=JSON.parse(fs.readFileSync(path.join(site,'data/generated/readings/shared/'+hash+'.json')));
      assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(block.value)).digest('hex'),hash);
      return block;
    }), JSON.parse(source), 'JSON data changed: ' + file);
    else assert(source.equals(published), 'Static asset changed: ' + file);
  }
  assert.equal(bytes, result.totalBytes, 'Planned and actual package sizes differ');
}
console.log(`PASS Pages package: ${result.files.length} files, ${result.totalBytes} bytes (${result.savedBytes} saved); runtime dependencies retained, internal archives excluded`);
