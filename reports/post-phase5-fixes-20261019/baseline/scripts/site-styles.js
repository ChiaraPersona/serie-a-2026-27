const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
// Keep the exact cascade of the modular entry point; expose dependencies to the
// HTML preload scanner and invalidate each stylesheet when its contents change.
function styleLinks(prefix = '', reading = false) {
  const entry = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
  const files = [...entry.matchAll(/@import url\("\.\/([^"?]+)(?:\?[^"\n]*)?"\);/g)].map(m => m[1]);
  if (reading) files.push('reading-detail.css');
  return files.map(file => {
    const version = createHash('sha256').update(fs.readFileSync(path.join(root, 'css', file))).digest('hex').slice(0, 12);
    return `<link rel="stylesheet" href="${prefix}css/${file}?v=${version}"${file === 'reading-detail.css' ? ' data-reading-detail-css' : ''}>`;
  }).join('');
}
function applyStyleLinks(html) {
  const prefix=html.match(/href="([^"]*)css\/(?:styles|base)\.css/)?.[1]||'';
  const boot=fs.readFileSync(path.join(root,'js/initial-presentation.js'),'utf8');
  const bootVersion=createHash('sha256').update(boot).digest('hex').slice(0,12);
  html=html.replace(/<script src="[^"]*js\/initial-presentation\.js[^"\n]*"><\/script>/g, '');
  const reading=/<body[^>]*data-page="(?:readings|champions)"/.test(html);
  html=html.replace(/(<body[^>]*data-page="(?:readings|champions)"[^>]*>)/, `$1<script src="${prefix}js/initial-presentation.js?v=${bootVersion}"></script>`);
  // Invalidate the application entry and its versioned module graph whenever
  // the shared heading renderer changes; preserve each page's base release.
  const headingVersion=createHash('sha256').update(fs.readFileSync(path.join(root,'js/core/utils.js'))).update(fs.readFileSync(path.join(root,'js/pages/readings.js'))).update(fs.readFileSync(path.join(root,'js/pages/champions.js'))).digest('hex').slice(0,12);
  html=html.replace(/(src="[^"]*js\/app\.js\?v=)([^"&]+)/g,(_,start,version)=>`${start}${version.replace(/-headings-[a-f0-9]{12}$/, '')}-headings-${headingVersion}`);
  return html.replace(/(?:<link rel="stylesheet" href="[^"]*css\/[^"]+"(?: data-reading-detail-css)?>)+/, styleLinks(prefix, reading));
}
module.exports = {styleLinks, applyStyleLinks};
