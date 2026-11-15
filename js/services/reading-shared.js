// Immutable presentation blocks. Restore the original payload before any policy.
(function(root){
 const validHash=hash=>typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash);
 const clone=value=>structuredClone(value);
 function references(wire){
  if(wire?.readingSharedVersion!==1)return [];
  if(!wire.data||!Array.isArray(wire.refs))throw Error('Dati della Lettura non coerenti');
  for(const ref of wire.refs){
   if(!validHash(ref.hash)||!Array.isArray(ref.path)||ref.path.length<1||ref.path.length>2||ref.path.some(k=>typeof k!=='string'||['__proto__','prototype','constructor'].includes(k)))throw Error('Riferimento della Lettura non valido');
   if(!['teams','objectiveProfiles','finishedIds','teamDirectory','artifacts'].includes(ref.path[0])||(ref.path.length===2&&ref.path[0]!=='artifacts')||(ref.merge&&ref.path[0]!=='teamDirectory'))throw Error('Riferimento della Lettura non valido');
  }
  return wire.refs;
 }
 function checkBlock(block,hash){
  if(block?.readingSharedBlockVersion!==1||block.hash!==hash||!Object.hasOwn(block,'value'))throw Error('Dati condivisi della Lettura non coerenti');
  return block.value;
 }
 async function verifyBlock(block,hash){
  const value=checkBlock(block,hash);
  if(root.crypto?.subtle){
   const bytes=new TextEncoder().encode(JSON.stringify(value));
   const result=await root.crypto.subtle.digest('SHA-256',bytes);
   if([...new Uint8Array(result)].map(n=>n.toString(16).padStart(2,'0')).join('')!==hash)throw Error('Dati condivisi della Lettura non coerenti');
  }
  return value;
 }
 function restore(wire,values){
  const result=clone(wire.data);
  for(const ref of references(wire)){
   const parent=ref.path.length===1?result:result[ref.path[0]],key=ref.path.at(-1),value=clone(values.get(ref.hash));
   if(!parent||typeof parent!=='object')throw Error('Dati della Lettura non coerenti');
   parent[key]=ref.merge?{...value,...parent[key]}:value;
  }
  return result;
 }
 async function hydrate(wire,load){
  if(wire?.readingSharedVersion!==1)return wire;
  const hashes=[...new Set(references(wire).map(ref=>ref.hash))];
  const values=new Map(await Promise.all(hashes.map(async hash=>[hash,await verifyBlock(await load(hash),hash)])));
  return restore(wire,values);
 }
 function hydrateSync(wire,load){
  if(wire?.readingSharedVersion!==1)return wire;
  const values=new Map([...new Set(references(wire).map(ref=>ref.hash))].map(hash=>[hash,checkBlock(load(hash),hash)]));
  return restore(wire,values);
 }
 function hints(index,id){
  if(!Array.isArray(index?.blocks)||!Array.isArray(index?.fixtures?.[id]))return [];
  return [...new Set(index.fixtures[id].map(n=>Number.isInteger(n)?index.blocks[n]:null).filter(validHash))];
 }
 const api={hydrate,hydrateSync,verifyBlock,checkBlock,references,hints,validHash};
 root[Symbol.for('prima-del-fischio.reading-shared')]=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
