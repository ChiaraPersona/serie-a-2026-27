import '../official-starter-policy.js';
import {requestJson,clearJsonRequests} from './json-requests.mjs?v=20261022-assets-v1';
export function createDataService(release,{deduplicate=false}={}){
  const DATA="data/normalized/";
  const requests=new Map();
  if(deduplicate)clearJsonRequests();
  const fetchJson=(url,label=url)=>{
    if(deduplicate&&requests.has(url))return requests.get(url);
    const versioned=`${url}${url.includes("?")?"&":"?"}v=${release}`,options={cache:label==='official starters'?'no-store':'default',label};
    const request=deduplicate?requestJson(versioned,options):(async()=>{const response=await fetch(versioned,{cache:options.cache});if(!response.ok)throw new Error(`${label}: ${response.status}`);return response.json()})();
    if(deduplicate){requests.set(url,request);request.catch(()=>{if(requests.get(url)===request)requests.delete(url)});}
    return request;
  };
  return {
    // One cache per rendered view. A later render refreshes the official registry.
    beginView:()=>{requests.clear();if(deduplicate)clearJsonRequests();},
    load:async name=>{
      const registry=await fetchJson(`${DATA}official-starter-registry.json`,'official starters');
      globalThis.officialStarterPolicy.configure(registry);
      const data=await fetchJson(`${DATA}${name}`,name);
      // MD1 is a read-only historical archive: retain the original settled legs.
      // Operational selections and saved MyCombo entries still use the starter policy.
      // Final match evidence includes substitutes required by DUO settlement.
      if(name==='schedina-champions-md01.json'||name==='matches.json'||name==='champions-league-2026-27.json')return data;
      // Final evidence includes substitutes for DUO contracts; filter contracts,
      // never the observed match report embedded in the lightweight projection.
      if(name==='schedina-champions-md03-ui.json')return {...globalThis.officialStarterPolicy.filter({...data,fixtures:[]}),fixtures:data.fixtures};
      // Preserve original contracts on completed Serie A fixtures for settlement.
      // eligible() remains strict for operational selections and saved MyCombo.
      if(/^schedina-md\d+\.json$/.test(name)||/^predictions(?:-md\d+)?\.json$/.test(name)){
        const matches=await fetchJson(`${DATA}matches.json`,'archive match status');
        const archived=new Set(matches.filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.score).map(m=>m.id));
        return globalThis.officialStarterPolicy.filter(data,undefined,archived);
      }
      return globalThis.officialStarterPolicy.filter(data);
    },
    loadGenerated:path=>fetchJson(`data/generated/${path}`,path),
    loadReading:async id=>{
      const registry=await fetchJson(`${DATA}official-starter-registry.json`,'official starters');
      globalThis.officialStarterPolicy.configure(registry);
      const data=await fetchJson(`data/generated/readings/matches/${encodeURIComponent(id)}.json`);
      const archived=new Set(data.finishedIds);
      data.predictionDataset=globalThis.officialStarterPolicy.filter(data.predictionDataset,undefined,archived);
      data.forecastDataset=data.forecastDataset?globalThis.officialStarterPolicy.filter(data.forecastDataset,undefined,Number(data.matches.find(m=>m.id===id)?.matchday)===1?undefined:archived):null;
      return data;
    },
    loadReadingCatalog:async id=>{
      const data=await fetchJson(`data/generated/readings/catalogs/${encodeURIComponent(id)}.json`);
      return data.forecastDataset?globalThis.officialStarterPolicy.filter(data.forecastDataset,undefined,Number(data.forecastDataset.matchday)===1?undefined:new Set(data.finishedIds)):null;
    },
    loadDerived:path=>{if(!/^champions-md03\/[a-z0-9-]+\.json$/.test(path))throw new Error('Percorso derivato non valido');return fetchJson(`data/derived/${path}`,path)},
    loadTeamDirectory:()=>fetchJson("data/teams/index.json","data/teams/index.json"),
    loadPlayerLeaderboards:()=>fetchJson("data/teams/player-leaderboards.json","data/teams/player-leaderboards.json"),
    loadObjectiveProfiles:()=>fetchJson("data/team-objectives.json","data/team-objectives.json")
  };
}
