'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sizes=new Map();
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.isSymbolicLink()||['.git','node_modules','.codex','.agents'].includes(e.name))continue;
 const f=path.join(dir,e.name),file=path.relative(root,f).replaceAll('\\','/');
 if(file.startsWith('output/obsolete-copy-audit/'))continue;
 if(e.isDirectory())walk(f);else if(e.isFile()){
  const s=fs.statSync(f,{bigint:true}),bytes=Number(s.size);if(!bytes)continue;
  if(!sizes.has(bytes))sizes.set(bytes,[]);
  sizes.get(bytes).push({file,bytes,inode:s.dev+':'+s.ino,links:Number(s.nlink)});
 }
}}
walk(root);const groups=[];
for(const rows of sizes.values()){
 if(rows.length<2)continue;const hashes=new Map();
 for(const r of rows){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,r.file))).digest('hex');if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(r);}
 for(const [sha256,files]of hashes)if(files.length>1)groups.push({sha256,bytes:files[0].bytes,physicalCopies:new Set(files.map(f=>f.inode)).size,files});
}
groups.sort((a,b)=>b.bytes*(b.physicalCopies-1)-a.bytes*(a.physicalCopies-1));
fs.writeFileSync(path.join(root,'output/obsolete-copy-audit/duplicate-content-inventory.json'),JSON.stringify(groups,null,2));
console.log(JSON.stringify({groups:groups.length,redundantBytes:groups.reduce((s,g)=>s+g.bytes*(g.physicalCopies-1),0),top:groups.slice(0,20).map(g=>({bytes:g.bytes,physical:g.physicalCopies,files:g.files.slice(0,4).map(f=>f.file)}))},null,2));
