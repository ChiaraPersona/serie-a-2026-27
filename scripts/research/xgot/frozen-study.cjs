"use strict";
const fs=require('node:fs'),path=require('node:path');
const {ROOT,read}=require('../../xgot-validation.cjs');
const {sha256,canonicalMatchHash}=require('../../predictions/snapshot-core.js');
function frozenProtocol(){
 const base='data/predictions/xgot-prospective',protocol=read(`${base}/protocol.json`);
 if(protocol.integrity.sha256!==canonicalMatchHash(protocol))throw Error('Frozen protocol integrity failed');
 for(const [file,expected]of Object.entries(protocol.methodHashes)){
  const hash=p=>sha256(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/\r\n/g,'\n'));
  if(hash(file)===expected)continue;
  // Only the engine changed for operational activation. Evaluation scores frozen probabilities and never calls it.
  if(file!=='scripts/predictions/engine.js'||hash(`${base}/methods/${file}`)!==expected)throw Error(`Frozen assessment dependency changed: ${file}`);
 }
 return protocol;
}
module.exports={frozenProtocol};
