import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Compose unfiltered archives using the existing adapter. The browser applies the
// current official-starter registry when it loads the projection, as before.
const cache=new Map();
const load=async name=>{
  if(!cache.has(name)){
    const file=path.resolve(root,'data/normalized',name);
    if(!file.startsWith(path.join(root,'data')+path.sep))throw Error('Percorso fuori dati');
    cache.set(name,JSON.parse(fs.readFileSync(file,'utf8')));
  }
  return cache.get(name);
};
const workspace=await loadChampionsWorkspaceMd3Derived(load,3);
const {championsWorkspace,lineupManaged,matchday,season,fixtures,slips,oddsRetrievedAt,derivedVersion}=workspace;
const payload={schemaVersion:1,championsWorkspace,lineupManaged,matchday,season,fixtures,slips,oddsRetrievedAt,derivedVersion,
  marketCatalog:{matches:workspace.marketCatalog.matches}};
const file=path.join(root,'data/normalized/schedina-champions-md03-ui.json'),content=JSON.stringify(payload)+'\n';
if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)fs.writeFileSync(file,content);
console.log(`MD3 browser workspace: ${Buffer.byteLength(content)} bytes`);
