import '../official-starter-policy.js';
import './archive-json.js?v=20261115-archive-v1';
import './reading-shared.js?v=20261115-shared-v1';
const sharedReading=globalThis[Symbol.for('prima-del-fischio.reading-shared')];
const unpackArchive=globalThis[Symbol.for('prima-del-fischio.archive-json')].unpack;
import {requestJson,clearJsonRequests} from './json-requests.mjs?v=20261115-archive-v1';
export function createDataService(release,{deduplicate=false}={}){
  const DATA="data/normalized/";
  const requests=new Map();
  if(deduplicate)clearJsonRequests();
  const fetchJson=(url,label=url)=>{
    if(deduplicate&&requests.has(url))return requests.get(url);
    const immutable=/\/readings\/shared\/[a-f0-9]{64}\.json$/.test(url);
    const live=label==='official starters'||/\/readings\/(?:matches\/|index\.json)/.test(url);
    const versioned=immutable?url:`${url}${url.includes("?")?"&":"?"}v=${release}`,options={cache:immutable?'force-cache':live?'no-store':'default',label};
    const request=deduplicate?requestJson(versioned,options):(async()=>{const response=await fetch(versioned,{cache:options.cache});if(!response.ok)throw new Error(`${label}: ${response.status}`);return unpackArchive(await response.json())})();
    if(deduplicate){requests.set(url,request);request.catch(()=>{if(requests.get(url)===request)requests.delete(url)});}
    return request;
  };
  return {
    // One cache per rendered view. A later render refreshes the official registry.
    beginView:()=>{requests.clear();if(deduplicate)clearJsonRequests();},
    load:async name=>{
      const [registry,data]=await Promise.all([
        fetchJson(`${DATA}official-starter-registry.json`,'official starters'),
        fetchJson(`${DATA}${name}`,name)
      ]);
      globalThis.officialStarterPolicy.configure(registry);
      // Preserve observed match reports, including substitutes. Public contracts
      // use the official-starter filter even after the fixture has finished.
      if(name==='matches.json'||name==='champions-league-2026-27.json')return data;
      // Descriptive lineup projections include official substitutes. Operational
      // contracts are loaded separately and continue through the starter policy.
      if(name==='champions-md04-probable-individuals-2026-27.json')return data;
      if(name==='schedina-champions-md03-ui.json')return {...globalThis.officialStarterPolicy.filter({...data,fixtures:[]}),fixtures:data.fixtures};
      return globalThis.officialStarterPolicy.filter(data);
    },
    loadGenerated:path=>fetchJson(`data/generated/${path}`,path),
    loadChampionsReading:async id=>{
      if(!/^ucl-2026-27-md0[234]-(?:0[1-9]|1[0-8])$/.test(id))throw Error('Fixture Champions non valida');
      const [registry,data]=await Promise.all([
        fetchJson(`${DATA}official-starter-registry.json`,'official starters'),
        fetchJson(`data/generated/champions-readings/${id}.json`)
      ]);
      globalThis.officialStarterPolicy.configure(registry);
      if(data.schemaVersion!==1||data.fixtureId!==id)throw Error('Proiezione Champions non coerente');
      return data;
    },
    loadReading:async (id,sharedIndex)=>{
      const blocks=new Map();
      const loadBlock=hash=>{if(!blocks.has(hash))blocks.set(hash,fetchJson(`data/generated/readings/shared/${hash}.json`));return blocks.get(hash)};
      const preload=Promise.all(sharedReading.hints(sharedIndex,id).map(loadBlock));
      const [registry,wire]=await Promise.all([
        fetchJson(`${DATA}official-starter-registry.json`,'official starters'),
        fetchJson(`data/generated/readings/matches/${encodeURIComponent(id)}.json`),preload
      ]);
      const data=await sharedReading.hydrate(wire,loadBlock);
      globalThis.officialStarterPolicy.configure(registry);
      data.predictionDataset=globalThis.officialStarterPolicy.filter(data.predictionDataset);
      data.forecastDataset=data.forecastDataset?globalThis.officialStarterPolicy.filter(data.forecastDataset):null;
      return data;
    },
    loadReadingCatalog:async id=>{
      const data=await fetchJson(`data/generated/readings/catalogs/${encodeURIComponent(id)}.json`);
      return data.forecastDataset?globalThis.officialStarterPolicy.filter(data.forecastDataset):null;
    },
    loadDerived:path=>{if(!/^champions-md03\/[a-z0-9-]+\.json$/.test(path))throw new Error('Percorso derivato non valido');return fetchJson(`data/derived/${path}`,path)},
    loadTeamDirectory:()=>fetchJson("data/teams/index.json","data/teams/index.json"),
    loadPlayerLeaderboards:()=>fetchJson("data/teams/player-leaderboards.json","data/teams/player-leaderboards.json"),
    loadObjectiveProfiles:()=>fetchJson("data/team-objectives.json","data/team-objectives.json")
  };
}
