'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {gzipSync}=require('node:zlib');
const {pack}=require('./reading-archive-codec.cjs');
const {scope}=require('./reading-archive-scope.cjs');
const root = path.resolve(__dirname, '..');
const maximumBytes = 950_000_000;
const directories = ['assets/', 'css/', 'js/', 'statistiche-squadra/',
  'data/generated/', 'data/normalized/', 'data/sources/', 'data/teams/', 'data/derived/',
  'data/predictions/', 'data/players/', 'data/champions-2026-27/'];
const rootFiles = new Set(['.nojekyll', 'sw.js', 'manifest.webmanifest', 'CNAME', 'robots.txt', 'sitemap.xml', 'data/team-objectives.json']);
const requiredRuntimeProjections = ['data/normalized/champions-player-history-context-2025-26.json','js/services/archive-json.js'];
// Browser MD3 uses the compiled Schedina UI or fixture projections. These
// originals remain compiler inputs; literal names also address embedded datasets.
const projectionInternalFiles=new Set([
 'data/normalized/champions-md03-preliminary-2026-27.json',
 'data/normalized/champions-md03-probable-individuals-2026-27.json',
 'data/normalized/schedina-champions-md03.json',
 ...['probable-individuals-v2-2026-10-20','market-catalog-v2-2026-10-20','market-catalog-official-two-v1-2026-10-20','market-catalog-sabah-dortmund-v1-2026-10-20','market-catalog-official-seven-v2-2026-10-20','market-catalog-official-2026-10-21','official-individuals-two-v1-2026-10-20','official-individuals-seven-v2-2026-10-20','official-individuals-2026-10-21','upcoming-forecasts'].map(name=>'data/derived/champions-md03/'+name+'.json')
]);
// Research freezes and full referee archives have no browser consumers.
// Public verification snapshots and generated referee projections remain included.
const internalDirectories = ['data/normalized/odds/', 'data/normalized/referee-history/',
  'data/predictions/champions-event-snapshots/', 'data/predictions/exact-score-research/',
  'data/predictions/player-spatial-prospective/', 'data/predictions/player-spatial-v2-prospective/',
  'data/predictions/spatial-prospective/', 'data/predictions/xgot-prospective/',
  'data/normalized/xgot-history-seasons/', 'data/normalized/xgot-extended-seasons/', 'data/normalized/xgot-current-seasons/'];
// Build inputs and superseded artifacts: browser consumers use the retained UI/v2 files.
const internalFiles = new Set([
  'data/normalized/champions-md03-settlement.json',
  'data/derived/champions-md03/sabah-dortmund-volumes-v1-2026-10-20.json',
  // Acquisition inputs and technical histories have no public runtime consumers.
  'data/normalized/champions-elo-prior-domestic.json',
  'data/sources/champions-results-md04-2026-27.json',
  'data/sources/champions-md03-squads-2026-27.json',
  'data/sources/fantasy-external-stats-2025-26.json',
  'data/sources/prediction-archive-md04-2026-27.json',
  'data/sources/champions-shirt-numbers-2026-27.json',
  'data/sources/uefa-secondary-history-2023-26.json',
  'data/sources/reading-referee-match-history.json',
  'data/normalized/champions-referee-match-history-md04-2026-27.json',
  'data/normalized/champions-referee-dataset-md03-2026-27.json',
  'data/sources/champions-player-senior-national-observations-2025-26.json',
  'data/sources/champions-senior-national-history-acquisition-2025-26.json',
  'data/sources/champions-senior-national-history-scope-2025-26.json',
  'data/sources/champions-player-club-history-supplement-2025-26.json',
  // Build-only reports: pages consume the generated HTML / summary projections.
  'data/generated/head-to-head/first-leg-2026-27.json',
  'data/generated/fantacalcio-advice.json',
  // Canonical/build datasets: the browser uses match/day projections instead.
  'data/normalized/predictions.json',
  'data/normalized/reading-md08-market-catalog.json',
  'data/normalized/reading-md09-market-catalog.json',
  'data/normalized/reading-md10-market-catalog.json',
  'data/normalized/reading-md11-market-catalog.json',
  'data/normalized/champions-player-stats-2025-26.json',
  'data/normalized/champions-player-stats-2026-27.json',
  'data/normalized/champions-player-shooting-2026-27.json',
  'data/normalized/champions-md04-player-database-2026-27.json',
  'data/normalized/serie-a-shot-events-2026-27.json',
  'data/normalized/understat-serie-a-xg.json',
  'data/sources/prediction-archive-md05-2026-27.json',
  'data/sources/prediction-archive-md06-2026-27.json',
  'data/sources/champions-pilot-match-stats-2025-27.json',
  'data/sources/match-results-2026-27.json',
  'data/sources/champions-observed-performances-2026-27.json',
  'data/sources/champions-results-md01-2026-27.json',
  'data/sources/champions-results-md02-2026-27.json',
  'data/sources/champions-results-md03-2026-27.json',
  'data/sources/champions-package1-performances-2026-10-19.json',
  'data/generated/current-disciplinary-features-2026-27.json',
  'data/normalized/xgot-history.json',
  'data/normalized/xgot-reconciled-history.json',
  'data/normalized/xgot-team-research-v2.json',
  'data/sources/xgot-operational-policy.json',
  'data/normalized/champions-tactical-evidence-2026-27.json',
  'data/normalized/champions-md02-integration-2026-27.json',
  'data/normalized/team-matchup-profiles-2026-27.json',
  'data/sources/champions-player-shooting-evidence-2026-10-20.json',
  'data/derived/champions-md03/probable-individuals-history-v2-2026-10-21.json',
  'data/derived/champions-md03/market-catalog-official-seven-v1-2026-10-20.json',
  'data/derived/champions-md03/official-individuals-seven-v1-2026-10-20.json',
  'data/generated/player-market-backtest-v1-v2-md05.json',
  'data/generated/prediction-preview-md03-2026-27.json',
  'data/generated/prediction-preview-md07-2026-27.json',
  'data/generated/prediction-preview-md08-2026-27.json',
  'data/generated/referee-history-analytics-md07.json',
]);

// Compact only the deploy copy. Canonical files and parsed JSON values stay intact.
function publicContent(file,archives=null,stats=null) {
  const source = fs.readFileSync(path.join(root, file));
  if(!file.endsWith('.json'))return source;
  const data=JSON.parse(source.toString('utf8'));
  const plain=Buffer.from(JSON.stringify(data)+'\n');
  if(!archives?.has(file))return plain;
  const packed=Buffer.from(JSON.stringify(pack(data))+'\n');
  if(packed.length>=plain.length)return plain;
  const gzipBefore=gzipSync(plain).length,gzipAfter=gzipSync(packed).length;
  // Reject encodings that save disk space at the cost of network transfer.
  if(gzipAfter>=gzipBefore)return plain;
  if(stats)stats.push({file,competition:archives.get(file),beforeBytes:plain.length,afterBytes:packed.length,gzipBefore,gzipAfter});
  return packed;
}

function plan() {
  const tracked = execFileSync('git', ['ls-files', '-z'], {cwd: root, maxBuffer: 32 * 1024 * 1024})
    .toString().split('\0').filter(Boolean);
  // Generated runtime projections must also be testable in a local package before committing.
  for (const file of requiredRuntimeProjections) {
    if (!fs.existsSync(path.join(root,file))) throw new Error('Missing runtime projection: ' + file);
    if (!tracked.includes(file)) tracked.push(file);
  }
  const readingDirectory=path.join(root,'data/generated/champions-readings');
  if(fs.existsSync(readingDirectory))for(const name of fs.readdirSync(readingDirectory).filter(n=>/^(?:ucl-2026-27-md0[234]-\d{2}|registry-md[234])\.json$/.test(n))){
    const file='data/generated/champions-readings/'+name;if(!tracked.includes(file))tracked.push(file);
  }
  const browserScripts = new Set();
  for (const file of tracked.filter(f => f.endsWith('.html') && (!f.includes('/') || f.startsWith('statistiche-squadra/')))) {
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1].split('?')[0]));
      if (target.startsWith('scripts/')) browserScripts.add(target);
    }
  }
  const files = tracked.filter(file => !internalFiles.has(file) && !projectionInternalFiles.has(file) && !internalDirectories.some(dir => file.startsWith(dir)) &&
    (rootFiles.has(file) || (!file.includes('/') && file.endsWith('.html')) ||
      browserScripts.has(file) || directories.some(dir => file.startsWith(dir))));
  for (const file of files) {
    if (!fs.lstatSync(path.join(root, file)).isFile()) throw new Error('Unsupported Pages entry: ' + file);
  }
  const sourceBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
  const archives=scope(root,files),archiveStats=[];
  const totalBytes = files.reduce((sum, file) => sum + (file.endsWith('.json')
    ? publicContent(file,archives,archiveStats).length : fs.statSync(path.join(root, file)).size), 0);
  if (totalBytes > maximumBytes) throw new Error(`Pages package is ${totalBytes} bytes; budget is ${maximumBytes}`);
  for (const file of browserScripts) if (!files.includes(file)) throw new Error('Missing browser script: ' + file);
  return {files, totalBytes, sourceBytes, savedBytes: sourceBytes - totalBytes, maximumBytes,archiveStats};
}

function build(destination = path.join(root, 'output', 'pages-site')) {
  const target = path.resolve(destination);
  // Never overwrite an existing directory or copy into an arbitrary external path.
  const relative = path.relative(path.join(root, 'output'), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Pages destination must be inside output/');
  if (fs.existsSync(target)) throw new Error('Pages destination already exists: ' + target);
  const result = plan();
  const archives=new Map(result.archiveStats.map(row=>[row.file,row.competition]));
  for (const file of result.files) {
    const output = path.join(target, file);
    fs.mkdirSync(path.dirname(output), {recursive: true});
    if (file.endsWith('.json')) fs.writeFileSync(output, publicContent(file,archives));
    else fs.copyFileSync(path.join(root, file), output);
  }
  return {...result, destination: target};
}

if (require.main === module) {
  const result = process.argv.includes('--check') ? plan() : build(process.argv[2]);
  console.log(JSON.stringify({files: result.files.length, totalBytes: result.totalBytes, sourceBytes: result.sourceBytes, savedBytes: result.savedBytes, remainingBytes: maximumBytes - result.totalBytes, maximumBytes, destination: result.destination}, null, 2));
}
module.exports = {plan, build, internalFiles,projectionInternalFiles,publicContent};
