const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=__dirname,read=f=>JSON.parse(fs.readFileSync(path.join(out,f))),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const a=read('before.json'),b=read('after.json'),sources=read('baseline-sources.json'),hashes=read('baseline-files.json');
assert.equal(a.results.length,60);assert.equal(b.results.length,60);assert.deepEqual(b.errors,[]);
const protectedChecks=[],alignment=[];
for(const x of b.results){const y=a.results.find(y=>x.route===y.route&&x.width===y.width);assert.deepEqual(x.links,y.links);assert.deepEqual(x.counts,y.counts);assert.equal(x.protected.length,y.protected.length);
 for(let i=0;i<x.protected.length;i++){const p=x.protected[i],q=y.protected[i];assert.equal(p.s,q.s);assert.equal(p.text,q.text);assert.deepEqual(p.visual,q.visual);protectedChecks.push({route:x.route,width:x.width,selector:p.s,index:p.i,widthDelta:p.rect.width-q.rect.width,heightDelta:p.rect.height-q.rect.height});}
 const [header,main,footer]=x.outer.map(o=>o.rect);for(const r of [main,footer]){assert(Math.abs(header.x-r.x)<.1);assert(Math.abs(header.width-r.width)<.1);assert(r.width<=1050.1)}alignment.push({route:x.route,width:x.width,x:header.x,contentWidth:main.width});
 if(x.route==='champions-league.html')assert.equal(x.body.backgroundColor,'rgb(7, 21, 44)');
}
const beforeOverflows=a.results.filter(x=>x.overflow).map(x=>[x.route,x.width]);const afterOverflows=b.results.filter(x=>x.overflow).map(x=>[x.route,x.width]);assert.deepEqual(afterOverflows,beforeOverflows);
const html=[];const strip=s=>s.replace(/<link rel="stylesheet" href="[^"]*css\/[^"\n]+"(?: data-reading-detail-css)?>/g,'').replace(/<script src="[^"]*js\/initial-presentation\.js[^"\n]*"><\/script>/g,'');let cssHashes=0;
for(const [f,before]of Object.entries(sources).filter(([f])=>f.endsWith('.html'))){const after=fs.readFileSync(f,'utf8');assert.equal(strip(after),strip(before),'HTML structure '+f);for(const m of after.matchAll(/href="([^"]*css\/[^"?]+)\?v=([a-f0-9]{12})"/g)){assert.equal(hash(fs.readFileSync(path.resolve(path.dirname(f),m[1]))).slice(0,12),m[2]);cssHashes++}html.push(f)}
const changed=[];for(const [f,h]of Object.entries(hashes))if(!fs.existsSync(f)||hash(fs.readFileSync(f))!==h)changed.push(f);
const cssChanges=changed.filter(f=>f.startsWith('css/'));assert.deepEqual(cssChanges.sort(),['css/page-background.css','css/reading-detail.css','css/site-layout.css']);assert(!changed.some(f=>f.startsWith('js/')));
const outsideScope=changed.filter(f=>!f.endsWith('.html')&&!cssChanges.includes(f));
const old=JSON.parse(fs.readFileSync('reports/design-foundations-20261018/after-browser.json'));const oldBaseline=[];for(const x of a.results.filter(x=>[1440,390].includes(x.width))){const y=old.results.find(y=>y.route===x.route&&y.width===x.width);assert(y);assert.deepEqual(x.counts.tables,y.counts.tables);assert.equal(x.counts.sections,y.counts.sections);oldBaseline.push({route:x.route,width:x.width,tableAndSectionCountsPreserved:true})}
const summary={views:60,errors:b.errors,protectedStyleAndTextChecks:protectedChecks.length,protectedChecks,alignment,overflowsBefore:beforeOverflows,overflowsAfter:afterOverflows,htmlStructureUnchanged:html.length,verifiedCssHashes:cssHashes,cssChanges,jsUnchanged:true,outsideScopeConcurrentChanges:outsideScope,phase0BaselineComparison:oldBaseline};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({views:60,protectedChecks:protectedChecks.length,html:html.length,cssHashes,overflows:afterOverflows,outsideScope},null,2));
