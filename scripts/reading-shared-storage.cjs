'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='data/generated/readings/';
const manifest=base+'wire/serie-a-reading-shared-manifest.json';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
let cached=null,stamp=null;
function storage(){
 const file=path.join(root,manifest);
 if(!fs.existsSync(file))return null;
 const stat=fs.statSync(file),current=stat.mtimeMs+':'+stat.size;
 if(current!==stamp){
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(data.schemaVersion!==1)throw Error('Unknown reading shared manifest');
  for(const row of data.retained){
   if(!/^[a-f0-9]{64}$/.test(row.hash))throw Error('Invalid reading block hash');
   const block=JSON.parse(fs.readFileSync(path.join(root,base+'shared/'+row.hash+'.json'),'utf8'));
   if(block.hash!==row.hash||sha(JSON.stringify(block.value))!==row.hash)throw Error('Reading block integrity: '+row.hash);
  }
  cached=data;stamp=current;
 }
 return cached;
}
function publicWire(file,source){
 const entry=storage()?.entries[file];if(!entry)return null;
 if(sha(source)!==entry.sourceSha256)throw Error('Rebuild reading shared projections: '+file);
 const wire=fs.readFileSync(path.join(root,entry.wirePath));
 if(sha(wire)!==entry.wireSha256)throw Error('Reading wire integrity: '+file);
 return wire;
}
function publicSharedFiles(){return (storage()?.retained||[]).map(row=>base+'shared/'+row.hash+'.json')}
module.exports={publicWire,publicSharedFiles};
