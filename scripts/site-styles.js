const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const {buildStyle}=require('./page-styles.cjs');
// Keep the exact cascade of the modular entry point; expose dependencies to the
// HTML preload scanner and invalidate each stylesheet when its contents change.
function styleLinks(prefix = '', page = 'home') {
  const link=detail=>{const {file,hash}=buildStyle(page,detail);return `<link rel="stylesheet" href="${prefix}css/${file}?v=${hash}"${detail?' data-reading-detail-css':''}>`;};
  const normal=link(false);
  // Parser-blocking route choice in the head: no asynchronous CSS insertion,
  // no hidden page and no legacy layout while the detail sheet is downloading.
  const content=['readings','champions'].includes(page)?`<script data-page-styles>document.write(new URLSearchParams(location.search).has('match')?${JSON.stringify(link(true))}:${JSON.stringify(normal)})</script>`:normal;
  return `<!-- page-styles:start -->${content}<!-- page-styles:end -->`;
}
function applyStyleLinks(html) {
  const prefix=/<body[^>]*data-depth="team"/.test(html)?'../':'';
  const boot=fs.readFileSync(path.join(root,'js/initial-presentation.js'),'utf8');
  const bootVersion=createHash('sha256').update(boot).digest('hex').slice(0,12);
  html=html.replace(/<script src="[^"]*js\/initial-presentation\.js[^"\n]*"><\/script>/g, '');
  const page=/<body[^>]*data-depth="team"/.test(html)?'team-detail':html.match(/<body[^>]*data-page="([^"]+)"/)?.[1]||'home';
  html=html.replace(/(<body[^>]*data-page="(?:readings|champions|betting)"[^>]*>)/, `$1<script src="${prefix}js/initial-presentation.js?v=${bootVersion}"></script>`);
  // Invalidate the application entry and its versioned module graph whenever
  // the shared heading renderer changes; preserve each page's base release.
  const headingHash=createHash('sha256');for(const file of ['js/pages/home.js','js/core/utils.js','js/core/app.js','js/core/router.js','js/services/data-service.js','js/components/match-card.js','js/pages/readings.js','js/pages/champions.js','js/core/image-source.mjs'])headingHash.update(fs.readFileSync(path.join(root,file)));
  const headingVersion=headingHash.digest('hex').slice(0,12);
  html=html.replace(/(src="[^"]*js\/app\.js\?v=)([^"&]+)/g,(_,start,version)=>`${start}${version.replace(/-headings-[a-f0-9]{12}$/, '')}-headings-${headingVersion}`);
  const squadVersion=createHash('sha256').update(fs.readFileSync(path.join(root,'js/team-squads.js'))).digest('hex').slice(0,12);
  html=html.replace(/(src="[^"]*js\/team-squads\.js\?v=)[^"]+/g,`$1${squadVersion}`);
  const styles=styleLinks(prefix,page);
  return html.includes('<!-- page-styles:start -->')?html.replace(/<!-- page-styles:start -->[\s\S]*?<!-- page-styles:end -->/,styles):html.replace(/(?:<link rel="stylesheet" href="[^"]*css\/[^"]+"(?: data-reading-detail-css)?>)+/,styles);
}
module.exports = {styleLinks, applyStyleLinks};
