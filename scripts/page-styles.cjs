const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const entries={home:'js/pages/home.js','team-stats':'js/pages/teams.js','team-detail':'js/team-squads.js','player-stats':'js/pages/teams.js',readings:'js/pages/readings.js',champions:'js/pages/champions.js',betting:'js/pages/betting.js',cup:'js/pages/cup.js'};
// Scan complete renderer modules (including dialogs/templates and their imports),
// never a single DOM snapshot: toggles, responsive rules and future fixtures survive.
function vocabulary(page){
 const seen=new Set(),texts=[];
 function visit(file){if(seen.has(file)||!fs.existsSync(path.join(root,file)))return;seen.add(file);const text=fs.readFileSync(path.join(root,file),'utf8');texts.push(text);
  for(const m of text.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"?]+)(?:\?[^'"]*)?['"]/g))if(m[1].startsWith('.'))visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1])));
 }
 visit(entries[page]||entries.home);for(const file of ['js/core/app.js','js/core/utils.js','js/components/match-card.js','js/public-presentation.js','scripts/build-site.js','scripts/standings.js','scripts/objective-metrics.js'])visit(file);
 if(page==='team-detail')visit('js/components/lineup-field.mjs');
 // Detail modules are dynamically imported and contain all shared interaction states.
 if(['readings','champions'].includes(page))for(const f of fs.readdirSync(path.join(root,'js/pages/reading-detail')).filter(f=>/\.(mjs|js)$/.test(f)))visit('js/pages/reading-detail/'+f);
 const tokens=new Set(texts.join('\n').match(/[A-Za-z_][\w-]*/g)||[]);
 const prefixes=[...tokens].filter(t=>t.endsWith('-'));
 return {tokens,prefixes};
}
// Small lossless CSS block scanner: respect strings, comments and nested braces.
// Declarations are copied byte-for-byte; selector specificity/order never change.
function blocks(css){const result=[];let start=0,quote=null,comment=false,depth=0,open=-1;
 for(let i=0;i<css.length;i++){const c=css[i],next=css[i+1];if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}if(quote){if(c==='\\')i++;else if(c===quote)quote=null;continue;}if(c==='/'&&next==='*'){comment=true;i++;continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='{'){if(depth++===0)open=i;}else if(c==='}'&&--depth===0){result.push({head:css.slice(start,open),body:css.slice(open+1,i)});start=i+1;}else if(c===';'&&depth===0){result.push({statement:css.slice(start,i+1)});start=i+1;}}
 if(css.slice(start).trim())result.push({statement:css.slice(start)});return result;
}
function project(css,page,vocab){
 const bodyPage=page==='team-detail'?'team-stats':page;
 const possible=selector=>{
  // Negative selectors do not require the excluded class/page to exist.
  const positive=selector.replace(/:not\([^)]*\)/g,'');
  const explicit=[...positive.matchAll(/\[data-page\s*=\s*["']([^"']+)["']\]/g)].map(m=>m[1]);
  if(explicit.length&&!explicit.includes(bodyPage))return false;
  // Conservatively retain alternatives/relational selectors rather than risk
  // removing a branch whose state is only reached through interaction.
  if(/:(is|where|has)\(/.test(positive))return true;
  const unquoted=positive.replace(/"[^"]*"|'[^']*'/g,'');
  return [...unquoted.matchAll(/\.([A-Za-z_][\w-]*)/g)].every(([,name])=>vocab.tokens.has(name)||vocab.prefixes.some(p=>name.startsWith(p)));
 };
 return blocks(css).map(block=>{
  if(block.statement)return block.statement.replace(/\/\*[\s\S]*?\*\//g,'').trim();
  const head=block.head.replace(/\/\*[\s\S]*?\*\//g,'').trim();
  if(head.startsWith('@')){if(/^@(media|supports|container|layer)\b/.test(head)){const body=project(block.body,page,vocab);return body?`${head}{${body}}`:'';}return `${head}{${block.body}}`;}
  // Split commas only outside functional selectors and attributes.
  const selectors=[];let from=0,depth=0;for(let i=0;i<=head.length;i++){if('(['.includes(head[i]))depth++;if(')]'.includes(head[i]))depth--;if(i===head.length||head[i]===','&&depth===0){selectors.push(head.slice(from,i));from=i+1;}}
  const kept=selectors.filter(possible);return kept.length?`${kept.join(',')}{${block.body}}`:'';
 }).join('\n');
}
function buildStyle(page,detail=false){
 const actual=entries[page]?page:'home',vocab=vocabulary(actual),entry=fs.readFileSync(path.join(root,'css/styles.css'),'utf8');
 const files=[...entry.matchAll(/@import url\("\.\/([^"?]+)(?:\?[^"\n]*)?"\);/g)].map(m=>m[1]);
 if(detail)files.push('reading-detail.css');else if(actual==='readings')files.push('readings-index.css');
 const css=files.map(file=>`/* ${file}: original cascade position */\n`+project(fs.readFileSync(path.join(root,'css',file),'utf8'),actual,vocab)).join('\n').replaceAll('../assets/','../../assets/');
 const file=`pages/${actual}${detail?'-detail':''}.css`,target=path.join(root,'css',file);fs.mkdirSync(path.dirname(target),{recursive:true});
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==css)fs.writeFileSync(target,css);
 return {file,hash:crypto.createHash('sha256').update(css).digest('hex').slice(0,12)};
}
module.exports={buildStyle,project,blocks,vocabulary};
