import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDataService} from '../js/services/data-service.js';
import {createPage} from '../js/pages/betting.js';
import {esc,dateOnly,hero} from '../js/core/utils.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const write=(file,value)=>{
  const target=path.join(root,file),content=JSON.stringify(value)+'\n';
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)fs.writeFileSync(target,content);
  console.log(`${file}: ${Buffer.byteLength(content)} bytes`);
};
// Local verified input only. Reuse exactly the browser's historical/starter policy.
const originalFetch=globalThis.fetch;
const originalDocument=globalThis.document;
globalThis.document={body:{dataset:{page:'betting'}}};
globalThis.fetch=async url=>{
  const target=path.resolve(root,String(url).split('?')[0]);
  if(!target.startsWith(root+path.sep))throw Error('Percorso fuori workspace');
  return {ok:true,json:async()=>JSON.parse(fs.readFileSync(target,'utf8'))};
};
try{
  const service=createDataService('presentation-build',{deduplicate:true});
  const html=await createPage({esc,dateOnly,hero,...service}).buildArchiveMarkup();
  write('data/generated/schedina-index-2026-27.json',{schemaVersion:1,html});
  const {predictions}=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/predictions.json'),'utf8'));
  for(const number of [5,6,7]){
    const code=String(number).padStart(2,'0');
    write(`data/normalized/predictions-md${code}.json`,{predictions:predictions.filter(p=>p.matchId.endsWith(`-md-${code}`)).map(({matchId,combinations})=>({matchId,combinations}))});
  }
}finally{globalThis.fetch=originalFetch;globalThis.document=originalDocument;}
