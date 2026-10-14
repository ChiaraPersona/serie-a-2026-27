import '../official-starter-policy.js';
export function createDataService(release){
  const DATA="data/normalized/";
  const fetchJson=async(url,label=url)=>{const response=await fetch(`${url}${url.includes("?")?"&":"?"}v=${release}`,{cache:label==='official starters'?'no-store':'default'});if(!response.ok)throw new Error(`${label}: ${response.status}`);return response.json()};
  return {
    load:async name=>{
      const registry=await fetchJson(`${DATA}official-starter-registry.json`,'official starters');
      globalThis.officialStarterPolicy.configure(registry);
      return globalThis.officialStarterPolicy.filter(await fetchJson(`${DATA}${name}`,name));
    },
    loadGenerated:path=>fetchJson(`data/generated/${path}`,path),
    loadTeamDirectory:()=>fetchJson("data/teams/index.json","data/teams/index.json"),
    loadPlayerLeaderboards:()=>fetchJson("data/teams/player-leaderboards.json","data/teams/player-leaderboards.json"),
    loadObjectiveProfiles:()=>fetchJson("data/team-objectives.json","data/team-objectives.json")
  };
}
