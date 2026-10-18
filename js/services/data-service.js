import '../official-starter-policy.js';
export function createDataService(release){
  const DATA="data/normalized/";
  const fetchJson=async(url,label=url)=>{const response=await fetch(`${url}${url.includes("?")?"&":"?"}v=${release}`,{cache:label==='official starters'?'no-store':'default'});if(!response.ok)throw new Error(`${label}: ${response.status}`);return response.json()};
  return {
    load:async name=>{
      const registry=await fetchJson(`${DATA}official-starter-registry.json`,'official starters');
      globalThis.officialStarterPolicy.configure(registry);
      const data=await fetchJson(`${DATA}${name}`,name);
      // MD1 is a read-only historical archive: retain the original settled legs.
      // Operational selections and saved MyCombo entries still use the starter policy.
      // Final match evidence includes substitutes required by DUO settlement.
      if(name==='schedina-champions-md01.json'||name==='matches.json')return data;
      return globalThis.officialStarterPolicy.filter(data);
    },
    loadGenerated:path=>fetchJson(`data/generated/${path}`,path),
    loadTeamDirectory:()=>fetchJson("data/teams/index.json","data/teams/index.json"),
    loadPlayerLeaderboards:()=>fetchJson("data/teams/player-leaderboards.json","data/teams/player-leaderboards.json"),
    loadObjectiveProfiles:()=>fetchJson("data/team-objectives.json","data/team-objectives.json")
  };
}
