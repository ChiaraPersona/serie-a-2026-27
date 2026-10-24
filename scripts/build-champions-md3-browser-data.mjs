import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {createRequire} from 'node:module';
const policy=createRequire(import.meta.url)('../js/official-starter-policy.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Keep nonstarter contracts and quotes exclusively in the technical archives.
const cache=new Map();
const load=async name=>{
  if(!cache.has(name)){
    const file=path.resolve(root,'data/normalized',name);
    if(!file.startsWith(path.join(root,'data')+path.sep))throw Error('Percorso fuori dati');
    cache.set(name,JSON.parse(fs.readFileSync(file,'utf8')));
  }
  return cache.get(name);
};
policy.configure(await load('official-starter-registry.json'));
const original=await loadChampionsWorkspaceMd3Derived(load,3);
const workspace={...original,slips:policy.filter(original.slips),marketCatalog:policy.filter(original.marketCatalog)};
for(const match of workspace.marketCatalog.matches){
  const ids=new Set(match.selections.map(l=>l.selectionId));
  match.suggestions=(match.suggestions||[]).filter(s=>typeof s!=='string'||ids.has(s));
}
const {championsWorkspace,lineupManaged,matchday,season,fixtures,slips,oddsRetrievedAt,derivedVersion}=workspace;
const payload={schemaVersion:1,championsWorkspace,lineupManaged,matchday,season,fixtures,slips,oddsRetrievedAt,derivedVersion,
  marketCatalog:{matches:workspace.marketCatalog.matches}};
const file=path.join(root,'data/normalized/schedina-champions-md03-ui.json'),content=JSON.stringify(payload)+'\n';
if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)fs.writeFileSync(file,content);
console.log(`MD3 browser workspace: ${Buffer.byteLength(content)} bytes`);
