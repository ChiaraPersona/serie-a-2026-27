'use strict';
// Additive MD3 database. Historical snapshots, Serie A and prior selections are never rewritten.
const fs=require('fs'),assert=require('assert/strict');
const {collectEspnRows,aggregateEntries,totals,seasonalHistory}=require('./build-champions-player-stats');
const {rateCandidate}=require('./champions/current-season-offline');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const squads=read('data/sources/champions-md03-squads-2026-27.json');
const history=read('data/normalized/champions-player-stats-2025-26.json');
const seasonal=read('data/sources/champions-player-season-history-2025-26.json');
const current=read('data/normalized/champions-player-stats-2026-27.json');
const previousPath='data/normalized/champions-md03-player-database-2026-27.json';
const previous=process.argv.includes('--reuse-history')?read(previousPath):null;
const historicalRows=previous?{matchesByAthlete:new Map()}:collectEspnRows({season:'2025-26'});
const teams=squads.teams.map(t=>({...t,players:t.players.map(p=>{
 const ct=current.teams.find(x=>x.team===t.team),ht=history.teams.find(x=>x.team===t.team);
 const member=ct.players.find(x=>x.id===p.playerId||(p.providerPlayerId&&String(x.providerPlayerId)===p.providerPlayerId));
 let historical=ht.players.find(x=>x.id===p.playerId||(p.providerPlayerId&&String(x.providerPlayerId)===p.providerPlayerId));
 let origin=historical?.previousSeason?'existing-normalized-history':null;
 const cached=previous?.teams.find(x=>x.teamId===t.teamId)?.players.find(x=>x.id===p.playerId&&x.providerPlayerId===p.providerPlayerId);
 if(!historical?.previousSeason&&cached?.previousSeason){historical=cached;origin=cached.historicalSource;}
 if(!historical?.previousSeason&&p.providerPlayerId){
  const entries=aggregateEntries(p.providerPlayerId,member?.position||p.role,historicalRows.matchesByAthlete.get(p.providerPlayerId)||[]).map(e=>({...e,playerId:p.playerId}));
  if(entries.length){historical={id:p.playerId,name:p.canonicalName,providerPlayerId:p.providerPlayerId,previousSeason:{season:'2025/26',entries,totals:totals(entries),totalsByCompetition:entries},sourceMode:'espn-match-rosters',dataQuality:'available-existing-evidence'};origin='existing-raw-match-history';}
  else{
   const source=seasonal.players.find(x=>String(x.providerPlayerId)===p.providerPlayerId);
   const recovered=seasonalHistory({id:p.playerId,name:p.canonicalName,position:member?.position||p.role},p.providerPlayerId,source);
   if(recovered){historical=recovered;origin='existing-season-history';}
  }
 }
 // Use the canonical Serie A record for Esposito; no separate player/statistical reconstruction.
 if(p.playerId==='pio-esposito'){
  const canonical=read('data/teams/inter.json').squad.find(x=>x.id===p.playerId);
  assert.equal(String(canonical.providerIds.espn),p.providerPlayerId);
  if(canonical.previousSeason){historical=canonical;origin='canonical-serie-a-profile';}
 }
 const position=member?.position||p.role;
 const baseline=rateCandidate({historical,role:position,rows:[],disableCurrent:true});
 return {...p,id:p.playerId,name:p.canonicalName,position,previousSeason:historical?.previousSeason||null,currentSeason:member?.currentSeason||null,historicalSource:origin,primary:baseline,sample:{overlap:0},historicalMinutes:historical?.previousSeason?.totals?.minutes??null,statistics:p.statistics};
})}));
const players=teams.flatMap(t=>t.players);
const out={schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,asOf:squads.asOf,policy:'MD3 additive eligibility and identity overlay; existing histories reused; historical fallback uses existing rateCandidate unchanged. No new statistical priors or estimated observations.',identityResolutions:squads.identityResolutions,summary:{teams:teams.length,players:players.length,withHistoricalStats:players.filter(p=>p.previousSeason).length,resolvedRequestedPlayers:15},teams};
fs.writeFileSync('data/normalized/champions-md03-player-database-2026-27.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.summary));
