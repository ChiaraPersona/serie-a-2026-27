'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const maximumBytes = 950_000_000;
const directories = ['assets/', 'css/', 'js/', 'statistiche-squadra/', 'fantachampions-2026-27/',
  'data/generated/', 'data/normalized/', 'data/sources/', 'data/teams/', 'data/derived/',
  'data/predictions/', 'data/players/', 'data/champions-2026-27/'];
const rootFiles = new Set(['.nojekyll', 'sw.js', 'manifest.webmanifest', 'CNAME', 'robots.txt', 'sitemap.xml', 'data/team-objectives.json']);
// Research freezes and full referee archives have no browser consumers.
// Public verification snapshots and generated referee projections remain included.
const internalDirectories = ['data/normalized/odds/', 'data/normalized/referee-history/',
  'data/predictions/champions-event-snapshots/', 'data/predictions/exact-score-research/',
  'data/predictions/player-spatial-prospective/', 'data/predictions/player-spatial-v2-prospective/',
  'data/predictions/spatial-prospective/'];

function plan() {
  const tracked = execFileSync('git', ['ls-files', '-z'], {cwd: root, maxBuffer: 32 * 1024 * 1024})
    .toString().split('\0').filter(Boolean);
  const browserScripts = new Set();
  for (const file of tracked.filter(f => f.endsWith('.html') && (!f.includes('/') || f.startsWith('statistiche-squadra/')))) {
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1].split('?')[0]));
      if (target.startsWith('scripts/')) browserScripts.add(target);
    }
  }
  const files = tracked.filter(file => !internalDirectories.some(dir => file.startsWith(dir)) &&
    (rootFiles.has(file) || (!file.includes('/') && file.endsWith('.html')) ||
      browserScripts.has(file) || directories.some(dir => file.startsWith(dir))));
  for (const file of files) {
    if (!fs.lstatSync(path.join(root, file)).isFile()) throw new Error('Unsupported Pages entry: ' + file);
  }
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
  if (totalBytes > maximumBytes) throw new Error(`Pages package is ${totalBytes} bytes; budget is ${maximumBytes}`);
  for (const file of browserScripts) if (!files.includes(file)) throw new Error('Missing browser script: ' + file);
  return {files, totalBytes, maximumBytes};
}

function build(destination = path.join(root, 'output', 'pages-site')) {
  const target = path.resolve(destination);
  // Never overwrite an existing directory or copy into an arbitrary external path.
  const relative = path.relative(path.join(root, 'output'), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Pages destination must be inside output/');
  if (fs.existsSync(target)) throw new Error('Pages destination already exists: ' + target);
  const result = plan();
  for (const file of result.files) {
    const output = path.join(target, file);
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.copyFileSync(path.join(root, file), output);
  }
  return {...result, destination: target};
}

if (require.main === module) {
  const result = process.argv.includes('--check') ? plan() : build(process.argv[2]);
  console.log(JSON.stringify({files: result.files.length, totalBytes: result.totalBytes, maximumBytes, destination: result.destination}, null, 2));
}
module.exports = {plan, build};
