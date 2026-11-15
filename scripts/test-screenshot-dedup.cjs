'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {linkGroup,restoreGroup,hash,sameInode}=require('./deduplicate-archived-screenshots.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/screenshot-dedup-2026-11-15');
fs.mkdirSync(out,{recursive:true});
const a=path.join(out,'probe-a.png'),b=path.join(out,'probe-b.png');
if(fs.existsSync(a)||fs.existsSync(b))throw Error('Probe paths already exist');
try{
 fs.copyFileSync(path.join(root,'assets/images/vs-gold.png'),a);fs.copyFileSync(a,b);
 fs.chmodSync(a,0o666);fs.chmodSync(b,0o666);
 const mode=fs.statSync(a).mode&0o777,sha256=hash(a);
 const group={keeper:path.relative(root,a).replaceAll('\\','/'),sha256,files:[a,b].map(file=>({path:path.relative(root,file).replaceAll('\\','/'),mode}))};
 assert(!sameInode(a,b),'Probe copies already share storage');
 linkGroup(group);assert(sameInode(a,b));assert.equal(hash(a),sha256);assert.equal(hash(b),sha256);
 assert.throws(()=>fs.writeFileSync(b,'must not overwrite archived evidence'),'Shared archive must reject ordinary writes');
 restoreGroup(group);assert(!sameInode(a,b));assert.equal(hash(a),sha256);assert.equal(hash(b),sha256);
 fs.writeFileSync(b,'independent write');assert.equal(hash(a),sha256,'Restored copies are still coupled');
 assert.throws(()=>linkGroup({...group,keeper:'data/normalized/matches.json'}),/Outside screenshot scope/);
 console.log('PASS hardlink identity, exact bytes, read-only guard, independent writable restore and scope restriction');
}finally{
 for(const file of [a,b])if(fs.existsSync(file)){fs.chmodSync(file,0o666);fs.unlinkSync(file);}
}
