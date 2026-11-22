const fs=require('../../scripts/output-snapshot-fs.cjs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:64e6}).trim();
const head=f=>JSON.parse(git(['show','HEAD:'+f])),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const base='data/generated/readings/',id='juventus-venezia-2026-27-md-12',source=base+'matches/'+id+'.json',mp=base+'wire/serie-a-reading-shared-manifest.json';
const m=head(mp),local=read(mp),entry=local.entries[source],wire=read(entry.wirePath),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(cp.execFileSync('git',['show','HEAD:'+source],{maxBuffer:64e6})),entry.sourceSha256);
const hashes=[...new Set(wire.refs.map(r=>r.hash))];
const restored=require(require('path').resolve('js/services/reading-shared.js')).hydrateSync(wire,h=>read(base+'shared/'+h+'.json'));
assert.deepEqual(restored,head(source));
m.entries[source]=entry;
const input=m.inputs.find(r=>r.path===source);input.sha256=entry.sourceSha256;
const index=head(base+'index.json');
for(const h of hashes){
 const file=base+'shared/'+h+'.json';assert.equal(sha(JSON.stringify(read(file).value)),h);
 if(!m.active.includes(h))m.active.push(h);
 if(!m.retained.some(r=>r.hash===h))m.retained.push({hash:h,retiredAt:null});
 if(!index.sharedReadings.blocks.includes(h))index.sharedReadings.blocks.push(h);
 if(!m.hints.blocks.includes(h))m.hints.blocks.push(h);
 if(!m.outputs.some(r=>r.path===file))m.outputs.push({path:file,sha256:sha(fs.readFileSync(file))});
}
m.hints.fixtures[id]=hashes.map(h=>m.hints.blocks.indexOf(h));
index.sharedReadings.fixtures[id]=hashes.map(h=>index.sharedReadings.blocks.indexOf(h));
m.outputs.find(r=>r.path===entry.wirePath).sha256=entry.wireSha256;
function stage(file,data){const target='output/official-juventus-venezia-2026-11-22/fix-'+require('path').basename(file);fs.writeFileSync(target,JSON.stringify(data)+'\n');git(['update-index','--add','--cacheinfo','100644',git(['hash-object','-w',target]),file]);}
stage(mp,m);stage(base+'index.json',index);
git(['add','--',entry.wirePath,...hashes.map(h=>base+'shared/'+h+'.json')]);
for(const file of [source,entry.wirePath]){const e=m.entries[source],expected=file===source?e.sourceSha256:e.wireSha256;assert.equal(sha(cp.execFileSync('git',['show',':'+file],{maxBuffer:64e6})),expected);}
console.log('PASS staged Juventus reading: source, wire, shared blocks and hints synchronized');
